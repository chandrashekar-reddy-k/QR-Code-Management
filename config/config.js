// config/config.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseDuration } from "../utils/timeParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// ── RSA Key Loading ─────────────────────────────────────────────────────────
// Priority: ENV vars > PEM file paths > local key files under keys/
const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH
  ? path.resolve(projectRoot, process.env.JWT_PRIVATE_KEY_PATH)
  : path.join(projectRoot, "keys", "private.key");

const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH
  ? path.resolve(projectRoot, process.env.JWT_PUBLIC_KEY_PATH)
  : path.join(projectRoot, "keys", "public.key");

let privateKey = process.env.JWT_PRIVATE_KEY || null;
let publicKey = process.env.JWT_PUBLIC_KEY || null;

if (!privateKey || !publicKey) {
  try {
    if (!privateKey && fs.existsSync(privateKeyPath)) {
      privateKey = fs.readFileSync(privateKeyPath, "utf8").trim();
    }
    if (!publicKey && fs.existsSync(publicKeyPath)) {
      publicKey = fs.readFileSync(publicKeyPath, "utf8").trim();
    }
  } catch (error) {
    console.warn("⚠️  RSA key files could not be read:", error.message);
  }
}

// ── Startup Validation ───────────────────────────────────────────────────────
// Called once from server.js before the server starts listening.
// Throws a clear, actionable error so PM2 / deployment pipelines catch it
// instead of getting a cryptic 500 at request time.
export const validateJwtConfig = () => {
  if (!privateKey) {
    throw new Error(
      "[FATAL] JWT private key is missing. " +
      "Set JWT_PRIVATE_KEY env var OR run `node generateKeys.js` to create keys/private.key on the server. " +
      `Expected key file at: ${privateKeyPath}`
    );
  }
  if (!publicKey) {
    throw new Error(
      "[FATAL] JWT public key is missing. " +
      "Set JWT_PUBLIC_KEY env var OR run `node generateKeys.js` to create keys/public.key on the server. " +
      `Expected key file at: ${publicKeyPath}`
    );
  }
  if (!privateKey.includes("BEGIN")) {
    throw new Error(
      "[FATAL] JWT_PRIVATE_KEY does not look like a valid PEM key. " +
      "Ensure the env var contains a valid RSA private key including the -----BEGIN PRIVATE KEY----- header."
    );
  }
};

export default {
  app: {
    name: "VillagKart Partner API",
    port: process.env.PORT || 3004,
    environment: process.env.NODE_ENV || "development",
  },
  api: {
    version: "v1",
    baseUrl: "/api",
    fullPrefix: "/api/v1",
  },
  jwt: {
    privateKey,
    publicKey,
    algorithm: "RS256",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
    cooldownMinutes: parseInt(process.env.OTP_COOLDOWN_MINUTES) || 2,
    maxResends: parseInt(process.env.OTP_MAX_RESENDS) || 3,
    resendCooldownMinutes: parseInt(process.env.OTP_RESEND_COOLDOWN_MINUTES) || 1,
  },
  rateLimit: {
    windowMs: parseDuration(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
};

