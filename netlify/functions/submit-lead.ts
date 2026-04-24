import { createHmac, timingSafeEqual } from "node:crypto";

// Netlify Function: receive a Hot Form submission from crew members, HMAC-verify
// the raw body, adapt the payload into the shared `lead-intake` Trigger.dev
// task's schema (with source_override = "HotForm"), and forward. Notes and
// submitter name are passed as `added_by` + `notes` so the task stores them
// as an audit update on the new Monday Lead.

const TRIGGER_API = "https://api.trigger.dev/api/v1/tasks/lead-intake/trigger";

interface NetlifyEvent {
  httpMethod?: string;
  headers: Record<string, string | undefined>;
  body: string | null;
}

interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
}

function json(statusCode: number, body: unknown): NetlifyResponse {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function hmacHex(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function constantTimeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

interface HotFormInput {
  submitted_by: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_country?: string;
  email?: string;
  notes?: string;
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  const secret = process.env.HOT_FORM_HMAC_SECRET;
  const triggerKey = process.env.TRIGGER_PROD_SECRET_KEY;
  if (!secret || !triggerKey) {
    return json(500, { error: "server not configured" });
  }

  const rawBody = event.body ?? "";
  if (!rawBody) return json(400, { error: "empty body" });

  const providedSig =
    event.headers["x-webhook-signature"] ??
    event.headers["X-Webhook-Signature"] ??
    "";
  if (!providedSig) return json(401, { error: "missing signature" });

  const expectedSig = hmacHex(secret, rawBody);
  if (!constantTimeEquals(providedSig, expectedSig)) {
    return json(401, { error: "invalid signature" });
  }

  let input: HotFormInput;
  try {
    input = JSON.parse(rawBody) as HotFormInput;
  } catch {
    return json(400, { error: "invalid JSON" });
  }

  const fullName = `${(input.first_name ?? "").trim()} ${(input.last_name ?? "").trim()}`.trim();
  if (!fullName || !input.phone || !input.submitted_by) {
    return json(400, { error: "missing required fields (submitted_by, first_name, last_name, phone)" });
  }

  const leadPayload = {
    name: fullName,
    phone: input.phone,
    email: (input.email ?? "").trim() || undefined,
    source_override: "HotForm" as const,
    type_override: "Organic" as const,
    added_by: input.submitted_by,
    notes: (input.notes ?? "").trim() || undefined,
  };

  const res = await fetch(TRIGGER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${triggerKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: leadPayload }),
  });

  if (!res.ok) {
    const text = await res.text();
    return json(502, { error: "trigger.dev rejected", status: res.status, detail: text.slice(0, 500) });
  }

  const data = (await res.json()) as { id?: string };
  return json(200, { ok: true, runId: data.id ?? null });
}
