import { prisma } from "@/lib/db";
import { SCENARIO_ENV, type ScenarioKey } from "./scenarios";

export class MakeError extends Error {
  constructor(
    message: string,
    public readonly code: string = "MAKE_ERROR",
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface MakeResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface CallOptions {
  tenantId: string;
  scenario: ScenarioKey;
  payload: Record<string, unknown>;
  timeoutMs?: number;
}

function getWebhookUrl(scenario: ScenarioKey): string {
  const envKey = SCENARIO_ENV[scenario];
  const url = process.env[envKey];
  if (!url) {
    throw new MakeError(
      `Webhook URL not configured for scenario "${scenario}" (env ${envKey})`,
      "MAKE_WEBHOOK_MISSING",
    );
  }
  return url;
}

/**
 * Call a Make.com scenario via its webhook.
 * Every request carries the shared secret so scenarios can reject unauthorized callers.
 * Every call is logged to MakeJob for audit.
 */
export async function callMake<T = unknown>({
  tenantId,
  scenario,
  payload,
  timeoutMs = 60_000,
}: CallOptions): Promise<T> {
  const url = getWebhookUrl(scenario);
  const secret = process.env.MAKE_SHARED_SECRET!;
  const started = Date.now();

  const job = await prisma.makeJob.create({
    data: {
      tenantId,
      scenario,
      status: "pending",
      request: payload as object,
    },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Make-Secret": secret,
      },
      body: JSON.stringify({ tenant_id: tenantId, ...payload }),
      signal: controller.signal,
    });

    const text = await res.text();
    let parsed: MakeResponse<T> | T;
    try {
      parsed = text ? JSON.parse(text) : ({ ok: true } as MakeResponse<T>);
    } catch {
      throw new MakeError(`Non-JSON response from Make: ${text.slice(0, 200)}`);
    }

    // Accept either our envelope shape or raw data
    if (typeof parsed === "object" && parsed !== null && "ok" in parsed) {
      const env = parsed as MakeResponse<T>;
      if (!env.ok) {
        throw new MakeError(
          env.error?.message ?? "Make scenario returned ok=false",
          env.error?.code ?? "MAKE_SCENARIO_ERROR",
          env.error,
        );
      }
      await prisma.makeJob.update({
        where: { id: job.id },
        data: {
          status: "success",
          response: env.data as object | undefined,
          durationMs: Date.now() - started,
        },
      });
      return env.data as T;
    }

    await prisma.makeJob.update({
      where: { id: job.id },
      data: {
        status: "success",
        response: parsed as object,
        durationMs: Date.now() - started,
      },
    });
    return parsed as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.makeJob.update({
      where: { id: job.id },
      data: {
        status: "error",
        error: msg,
        durationMs: Date.now() - started,
      },
    });
    if (err instanceof MakeError) throw err;
    throw new MakeError(msg);
  } finally {
    clearTimeout(timer);
  }
}
