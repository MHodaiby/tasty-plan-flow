import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSubscriptionRequest,
  recordPaymentAndActivate,
} from "@/features/admin-customers/subscription-actions";
import { STATUS_LABEL, VISIBLE_SUB_STATUSES, visibleSubscriptionStatus } from "@/lib/format";
import type { Subscription } from "@/lib/data";

const mocks = vi.hoisted(() => ({
  responses: [] as { data: unknown; error: unknown }[],
  calls: [] as { table: string; operation: string; payload: unknown; filters: unknown[] }[],
  auth: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.auth },
    from: (table: string) => {
      let operation = "read";
      let payload: unknown;
      const filters: unknown[] = [];
      const finish = async () => {
        mocks.calls.push({ table, operation, payload, filters });
        const result = mocks.responses.shift();
        if (!result) throw new Error("Unexpected database call");
        return result;
      };
      const chain = {
        select: () => chain,
        eq: (...args: unknown[]) => {
          filters.push(args);
          return chain;
        },
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        insert: (value: unknown) => {
          operation = "insert";
          payload = value;
          return chain;
        },
        update: (value: unknown) => {
          operation = "update";
          payload = value;
          return chain;
        },
        single: finish,
        maybeSingle: finish,
      };
      return chain;
    },
  },
}));
const sub: Subscription = {
  id: "sub-id",
  user_id: "customer-id",
  billing_period: "weekly",
  days_per_week: 3,
  default_days: [0, 2, 4],
  status: "pending_payment",
  start_date: null,
  end_date: null,
  admin_notes: null,
  payment_received_at: null,
  created_at: "2026-11-01",
};
const form = { start: "2099-11-08", end: "2099-11-14", amount: "400", reference: "external-link" };
const ok = (data: unknown) => ({ data, error: null });
beforeEach(() => {
  mocks.responses.length = 0;
  mocks.calls.length = 0;
  mocks.auth.mockResolvedValue({ data: { user: { id: "admin-id" } }, error: null });
});

describe("Subscription request actions", () => {
  it("creates a pending request with derived days without modifying historical records", async () => {
    mocks.responses.push(ok(null), ok({ id: "new-id" }));
    expect(await createSubscriptionRequest(sub.user_id, "monthly", [4, 0, 2], " renewal ")).toEqual(
      { id: "new-id", created: true },
    );
    expect(mocks.calls[1]).toMatchObject({
      table: "subscriptions",
      operation: "insert",
      payload: {
        user_id: "customer-id",
        status: "pending_payment",
        billing_period: "monthly",
        default_days: [0, 2, 4],
        days_per_week: 3,
        admin_notes: "renewal",
      },
    });
    expect(mocks.calls.some((call) => call.operation === "update")).toBe(false);
  });
  it("reuses an open request rather than creating another", async () => {
    mocks.responses.push(ok({ id: "existing-id" }));
    expect(await createSubscriptionRequest(sub.user_id, "weekly", [0, 2], "")).toEqual({
      id: "existing-id",
      created: false,
    });
    expect(mocks.calls).toHaveLength(1);
  });
  it("rejects invalid inherited days before touching the database", async () => {
    await expect(createSubscriptionRequest(sub.user_id, "weekly", [0, 5], "")).rejects.toThrow();
    expect(mocks.calls).toHaveLength(0);
  });
});

describe("Manual payment activation", () => {
  it("records EGP payment and activates only the pending request", async () => {
    mocks.responses.push(
      ok({ status: "pending_payment" }),
      ok(null),
      ok({ received_at: "2099-11-08T12:00:00Z" }),
      ok({ id: sub.id }),
    );
    await recordPaymentAndActivate(sub, form);
    expect(mocks.calls[2]).toMatchObject({
      table: "payments",
      operation: "insert",
      payload: {
        subscription_id: sub.id,
        user_id: sub.user_id,
        currency: "EGP",
        amount: 400,
        reference: "external-link",
        recorded_by: "admin-id",
      },
    });
    expect(mocks.calls[3]).toMatchObject({
      table: "subscriptions",
      operation: "update",
      payload: { status: "active", start_date: form.start, end_date: form.end },
    });
    expect(mocks.calls[3]?.filters).toContainEqual(["status", "pending_payment"]);
  });
  it("reuses the payment after activation fails, including a later retry", async () => {
    mocks.responses.push(
      ok({ status: "pending_payment" }),
      ok({ id: "payment-id", received_at: "2099-11-08T12:00:00Z" }),
      { data: null, error: { message: "Temporary failure" } },
    );
    await expect(recordPaymentAndActivate(sub, form)).rejects.toThrow("Payment is recorded");
    mocks.responses.push(
      ok({ status: "pending_payment" }),
      ok({ id: "payment-id", received_at: "2099-11-08T12:00:00Z" }),
      ok({ id: sub.id }),
    );
    await recordPaymentAndActivate(sub, form);
    expect(
      mocks.calls.some((call) => call.table === "payments" && call.operation === "insert"),
    ).toBe(false);
  });
  it("does not record a second payment for an already active subscription", async () => {
    mocks.responses.push(ok({ status: "active" }));
    await expect(recordPaymentAndActivate(sub, form)).rejects.toThrow("no longer pending payment");
    expect(mocks.calls).toHaveLength(1);
  });
});

it("presents legacy cancelled records as expired without exposing a Cancelled filter", () => {
  expect(visibleSubscriptionStatus("cancelled")).toBe("expired");
  expect(STATUS_LABEL.cancelled).toBe("Expired");
  expect(VISIBLE_SUB_STATUSES).not.toContain("cancelled");
});
