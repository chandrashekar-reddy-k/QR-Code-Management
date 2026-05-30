import { useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData, { type FetchError } from "../helper";
import { toast } from "react-toastify";

export interface OnboardingStepResponse {
  status: boolean;
  message?: string;
  response?: string;
  nextStep?: number;
  userId?: string;
}

type RawOnboarding = Record<string, unknown> & {
  status?: boolean;
  success?: boolean;
  message?: string;
  response?: string;
  nextStep?: number;
  userId?: string;
  data?: Record<string, unknown>;
};

function asString(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function asNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Backend may return userId/nextStep at root OR nested under `data` (or `result`).
 */
export function normalizeOnboardingResponse(raw: unknown): OnboardingStepResponse {
  if (!raw || typeof raw !== "object") {
    return { status: true };
  }
  const r = raw as RawOnboarding;
  const nested =
    r.data && typeof r.data === "object"
      ? (r.data as Record<string, unknown>)
      : r.result && typeof r.result === "object"
        ? (r.result as Record<string, unknown>)
        : {};

  const userId =
    asString(r.userId) ||
    asString((r as Record<string, unknown>)["user_id"]) ||
    asString(nested.userId) ||
    asString(nested.user_id) ||
    asString(nested.id) ||
    asString(nested.applicationUserId);

  const nextStep =
    asNumber(r.nextStep) ??
    asNumber((r as Record<string, unknown>)["next_step"]) ??
    asNumber(nested.nextStep) ??
    asNumber(nested.next_step) ??
    asNumber(nested.step);

  const status =
    r.status === false || r.success === false
      ? false
      : r.status === true || r.success === true
        ? true
        : true;

  const message = asString(r.message) || asString(r.response);

  return {
    status,
    message: message || undefined,
    response: asString(r.response),
    nextStep,
    userId,
  };
}

/** Postman: /api/v1/partner/deliveryagents/onboarding — also try hyphenated paths used elsewhere in app. */
const DEFAULT_ONBOARDING_PATHS = [
  "partner/deliveryagents/onboarding",
  "partner/delivery-agents/onboarding",
  "delivery-agents/onboarding",
];

function getOnboardingPaths(): string[] {
  const custom = import.meta.env.VITE_DELIVERY_AGENT_ONBOARDING_PATH as string | undefined;
  if (custom?.trim()) {
    return [custom.trim().replace(/^\//, "")];
  }
  return DEFAULT_ONBOARDING_PATHS;
}

async function postOnboardingStep(
  payload: Record<string, unknown>
): Promise<OnboardingStepResponse> {
  const paths = getOnboardingPaths();
  let lastError: unknown = null;

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    try {
      const raw = await fetchData<unknown>(path, "POST", payload);
      const normalized = normalizeOnboardingResponse(raw);

      if (normalized.status === false) {
        const msg =
          normalized.message ||
          normalized.response ||
          "Could not save this step. Please check your data.";
        const err = {
          status: 400,
          message: msg,
          data: raw,
        } as FetchError;
        throw err;
      }

      const stepNum = asNumber(payload.step);
      if (stepNum === 1 && !normalized.userId) {
        const err = {
          status: 500,
          message:
            "Server responded OK but did not return userId. Expected userId (or data.userId) so next steps can save. Raw response logged in devtools.",
          data: raw,
        } as FetchError;
        throw err;
      }

      if (import.meta.env.DEV) {
        console.info("[delivery onboarding]", path, { payload, raw, normalized });
      }

      return normalized;
    } catch (e) {
      lastError = e;
      const fe = e as FetchError;
      const is404 = fe?.status === 404;
      const hasMore = i < paths.length - 1;
      if (is404 && hasMore) {
        continue;
      }
      throw e;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Onboarding request failed");
}

async function putOnboardingStep(
  agentId: string,
  payload: Record<string, unknown>
): Promise<OnboardingStepResponse> {
  const id = agentId.trim();
  if (!id) throw new Error("agentId is required for update");
  const paths = [
    `partner/deliveryagents/update/${id}`,
    `partner/delivery-agents/update/${id}`,
  ];
  let lastError: unknown = null;

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    try {
      const raw = await fetchData<unknown>(path, "PUT", payload);
      const normalized = normalizeOnboardingResponse(raw);
      if (normalized.status === false) {
        const msg =
          normalized.message ||
          normalized.response ||
          "Could not update this step. Please check your data.";
        throw { status: 400, message: msg, data: raw } as FetchError;
      }
      return normalized;
    } catch (e) {
      lastError = e;
      const fe = e as FetchError;
      const is404 = fe?.status === 404;
      const hasMore = i < paths.length - 1;
      if (is404 && hasMore) continue;
      throw e;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Onboarding update failed");
}

/**
 * POST delivery agent onboarding — body varies by `step` (1–5).
 * Handles nested API responses and tries alternate URL paths on 404.
 */
export function useDeliveryAgentOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => postOnboardingStep(payload),

    onSuccess: (data) => {
      const msg = data?.message || data?.response || "Step saved successfully";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["deliveryBoyRequests"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
    },

    onError: (error: unknown) => {
      const err = error as {
        message?: string;
        data?: { message?: string; response?: string };
      };
      const msg =
        err?.message ||
        err?.data?.message ||
        err?.data?.response ||
        "Onboarding step failed";
      toast.error(msg);
    },
  });
}

/** PUT delivery agent update step-by-step by agent id */
export function useDeliveryAgentUpdateStep(agentId: string) {
  const queryClient = useQueryClient();
  const id = agentId?.trim();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (!id) throw new Error("agentId is required");
      return putOnboardingStep(id, payload);
    },
    onSuccess: (data) => {
      const msg = data?.message || data?.response || "Step updated successfully";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["deliveryBoyById", id] });
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryBoyRequests"] });
    },
    onError: (error: unknown) => {
      const err = error as { message?: string; data?: { message?: string; response?: string } };
      const msg =
        err?.message ||
        err?.data?.message ||
        err?.data?.response ||
        "Onboarding update failed";
      toast.error(msg);
    },
  });
}
