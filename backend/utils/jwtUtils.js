import jwt from "jsonwebtoken";
import config from "../config/config.js";

// ── Token Generation ─────────────────────────────────────────────────────────
// Always uses the RSA private key (RS256). Config validation at startup ensures
// the key is present before any request is handled, so this never receives null.
const generateToken = (payload, expiresIn = null) => {
  return jwt.sign(payload, config.jwt.privateKey, {
    expiresIn: expiresIn || config.jwt.expiresIn || "24h",
    algorithm: config.jwt.algorithm,
    issuer: "villagkart-identity-service",
    audience: "villagkart",
  });
};

export const generateUserToken = (user) => {
  return generateToken({
    id: user.id,
    phone: user.phone,
    role: user.role,
    email: user.email,
    name: user.name,
    permissions: user.permissions || ["*"],
    roles: [user.role],
  });
};

export const generateRefreshToken = (user) => {
  return generateToken(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
      type: "refresh",
    },
    "30d",
  );
};

export const generateAdminToken = (admin) => {
  return generateToken({
    id: admin.id,
    phone: admin.phone,
    role: admin.role,
    type: "admin",
  });
};

// ── Public Key Resolution ─────────────────────────────────────────────────────
// Fetches the public key from the Identity Service dynamically (remote env),
// or falls back to the local keys/public.key file. Cached in config after first fetch.
const resolvePublicKey = async () => {
  if (config.jwt.publicKey) return config.jwt.publicKey;

  const identityUrl = process.env.IDENTITY_SERVICE_URL || "http://localhost:4000";
  const isRemote = !identityUrl.includes("localhost") && !identityUrl.includes("127.0.0.1");

  if (isRemote) {
    try {
      console.log(`[AUTH-PARTNER] Fetching public key from Identity Service: ${identityUrl}`);
      const res = await fetch(`${identityUrl.replace(/\/+$/, "")}/api/v1/auth/public-key`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.publicKey) {
          config.jwt.publicKey = data.data.publicKey;
          console.log("[AUTH-PARTNER] Successfully fetched and cached JWT public key");
          return config.jwt.publicKey;
        }
      }
    } catch (err) {
      console.error("[AUTH-PARTNER] Failed to fetch public key from Identity Service:", err.message);
    }
  }

  // Local key file fallback (for local dev or when Identity Service is co-located)
  try {
    const { readFileSync, existsSync } = await import("fs");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const keyPath = resolve(__dirname, "..", "keys", "public.key");
    if (existsSync(keyPath)) {
      config.jwt.publicKey = readFileSync(keyPath, "utf8").trim();
      console.log("[AUTH-PARTNER] Loaded JWT public key from local keys/public.key");
      return config.jwt.publicKey;
    }
  } catch (err) {
    console.error("[AUTH-PARTNER] Local public key file fallback failed:", err.message);
  }

  return null;
};

// ── Token Verification ────────────────────────────────────────────────────────
export const verifyToken = async (token) => {
  const publicKey = await resolvePublicKey();

  if (!publicKey) {
    throw new Error(
      "[AUTH-PARTNER] Cannot verify token: JWT public key is unavailable. " +
      "Ensure keys/public.key exists on the server or IDENTITY_SERVICE_URL is reachable."
    );
  }

  return jwt.verify(token, publicKey, {
    algorithms: [config.jwt.algorithm || "RS256"],
    issuer: "villagkart-identity-service",
    audience: "villagkart",
  });
};

// ── Password Reset Tokens ─────────────────────────────────────────────────────
/** Short-lived token for password reset flow (Step 2 → Step 3). Valid 15 minutes. */
export const generateResetToken = (userId) => {
  return generateToken({ id: userId, purpose: "password_reset" }, "15m");
};

/** Verify reset token; throws if invalid, expired, or wrong purpose. */
export const verifyResetToken = async (token) => {
  const decoded = await verifyToken(token);
  if (decoded.purpose !== "password_reset") {
    throw new Error("Invalid reset token");
  }
  return decoded;
};
