import { describe, expect, it } from "vitest";
import { needsSubscriptionReview, subscriptionDaysSchema, subscriptionRequestSchema, SUBSCRIPTION_DAYS } from "@/lib/subscription-rules";

describe("Oui Chef subscription rules", () => {
  for (const days of [[0, 2], [0, 1, 3], [0, 1, 2, 4], [0, 1, 2, 3, 4]]) {
    it(`accepts ${days.length} selected days and derives the stored count`, () => {
      const request = subscriptionRequestSchema.parse({ billing_period: "monthly", default_days: days, days_per_week: 99 });
      expect(request.days_per_week).toBe(days.length);
      expect(request.billing_period).toBe("monthly");
    });
  }
  it("rejects one day", () => { expect(subscriptionDaysSchema.safeParse([0]).success).toBe(false); });
  it("rejects zero days", () => { expect(subscriptionDaysSchema.safeParse([]).success).toBe(false); });
  it("excludes Friday and Saturday", () => {
    expect(SUBSCRIPTION_DAYS).toEqual([0, 1, 2, 3, 4]);
    expect(subscriptionDaysSchema.safeParse([0, 5]).success).toBe(false);
    expect(subscriptionDaysSchema.safeParse([0, 6]).success).toBe(false);
  });
  it("rejects a sixth day", () => { expect(subscriptionDaysSchema.safeParse([0, 1, 2, 3, 4, 5]).success).toBe(false); });
  it("rejects duplicate days", () => { expect(subscriptionDaysSchema.safeParse([0, 0]).success).toBe(false); });
  it("rejects fractional and null days", () => {
    expect(subscriptionDaysSchema.safeParse([0, 1.5]).success).toBe(false);
    expect(subscriptionDaysSchema.safeParse([0, null]).success).toBe(false);
  });
  it("recalculates on deselection", () => {
    const selected = [0, 1, 2, 4];
    expect(subscriptionRequestSchema.parse({ billing_period: "weekly", default_days: selected.filter((d) => d !== 2) }).days_per_week).toBe(3);
  });
  it("flags legacy weekend or mismatched plans without mutating them", () => {
    const legacy = { default_days: [0, 5, 6], days_per_week: 3 };
    expect(needsSubscriptionReview(legacy)).toBe(true);
    expect(legacy.default_days).toEqual([0, 5, 6]);
    expect(needsSubscriptionReview({ default_days: [0, 2], days_per_week: 5 })).toBe(true);
    expect(needsSubscriptionReview({ default_days: [0, 2], days_per_week: 2 })).toBe(false);
  });
});