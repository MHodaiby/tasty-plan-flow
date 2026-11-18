import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { Subscription } from "@/lib/data";
import { DAYS_SHORT, defaultEndDate, errMsg, toISODate } from "@/lib/format";
import { SUBSCRIPTION_DAYS, subscriptionRequestSchema } from "@/lib/subscription-rules";
import { createSubscriptionRequest, recordPaymentAndActivate } from "./subscription-actions";

export function SubscriptionRequestForm({
  userId,
  previous,
  onSaved,
  onCreated,
  onCancel,
}: {
  userId: string;
  previous?: Subscription;
  onSaved: () => Promise<void>;
  onCreated?: (id: string) => void;
  onCancel: () => void;
}) {
  const [period, setPeriod] = useState<"weekly" | "monthly">(previous?.billing_period ?? "weekly");
  const [days, setDays] = useState(previous?.default_days ?? []);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = subscriptionRequestSchema.safeParse({
    billing_period: period,
    default_days: days,
  }).success;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      const result = await createSubscriptionRequest(userId, period, days, notes);
      await onSaved();
      onCreated?.(result.id);
      toast.success(
        result.created
          ? "Subscription request created — pending payment"
          : "This customer already has an open subscription. Showing the existing record.",
      );
      onCancel();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="aw-form aw-action-form"
      onSubmit={submit}
      aria-label={previous ? "Renew subscription request" : "Add subscription request"}
    >
      <h3>{previous ? "Renew subscription" : "Add subscription"}</h3>
      <label className="aw-field">
        <span>Payment plan</span>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value as "weekly" | "monthly")}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </label>
      <fieldset className="aw-days">
        <legend>Delivery days · {days.length} days / week</legend>
        <div>
          {SUBSCRIPTION_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              className={`aw-button ${days.includes(day) ? "aw-button-dark" : ""}`}
              aria-pressed={days.includes(day)}
              onClick={() =>
                setDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day])
              }
            >
              {DAYS_SHORT[day]}
            </button>
          ))}
        </div>
      </fieldset>
      {!valid && (
        <p className="aw-validation">
          Choose 2–5 distinct days from Sunday to Thursday.
          {days.some((day) => day < 0 || day > 4) && (
            <button
              className="aw-text-button"
              type="button"
              onClick={() => setDays(days.filter((day) => day >= 0 && day <= 4))}
            >
              Remove legacy weekend days
            </button>
          )}
        </p>
      )}
      <label className="aw-field">
        <span>Admin note</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <p className="aw-action-help">
        This creates a new pending-payment request. Record payment separately to activate it.
      </p>
      <div className="aw-form-actions">
        <button type="button" className="aw-button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button className="aw-button aw-button-dark" disabled={busy || !valid}>
          {busy ? "Creating…" : "Create request"}
        </button>
      </div>
    </form>
  );
}

export function PaymentForm({
  subscription,
  onSaved,
  onCancel,
}: {
  subscription: Subscription;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const today = toISODate(new Date());
  const [form, setForm] = useState({
    start: subscription.start_date ?? today,
    end: subscription.end_date ?? defaultEndDate(today, subscription.billing_period),
    amount: "",
    reference: "",
  });
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await recordPaymentAndActivate(subscription, form);
      await onSaved();
      toast.success("Payment recorded and subscription activated");
      onCancel();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="aw-form aw-action-form"
      onSubmit={submit}
      aria-label="Record subscription payment"
    >
      <h3>Record payment</h3>
      <div className="aw-date-fields">
        <label className="aw-field">
          <span>Start date</span>
          <input
            type="date"
            required
            value={form.start}
            onChange={(event) =>
              setForm({
                ...form,
                start: event.target.value,
                end: event.target.value
                  ? defaultEndDate(event.target.value, subscription.billing_period)
                  : "",
              })
            }
          />
        </label>
        <label className="aw-field">
          <span>Renewal date</span>
          <input
            type="date"
            required
            min={form.start}
            value={form.end}
            onChange={(event) => setForm({ ...form, end: event.target.value })}
          />
        </label>
      </div>
      <label className="aw-field">
        <span>Amount paid (EGP)</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
        />
      </label>
      <label className="aw-field">
        <span>Payment reference</span>
        <input
          value={form.reference}
          onChange={(event) => setForm({ ...form, reference: event.target.value })}
        />
      </label>
      <div className="aw-form-actions">
        <button type="button" className="aw-button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button className="aw-button aw-button-dark" disabled={busy}>
          {busy ? "Recording…" : "Mark paid & activate"}
        </button>
      </div>
    </form>
  );
}

export function NewSubscriptionPanel({
  userId,
  onSaved,
  onCreated,
}: {
  userId: string;
  onSaved: () => Promise<void>;
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="aw-panel">
      <h2>Subscription</h2>
      {open ? (
        <SubscriptionRequestForm
          userId={userId}
          onSaved={onSaved}
          onCreated={onCreated}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <>
          <p className="aw-action-help">This customer has no subscription.</p>
          <button className="aw-button aw-button-dark" onClick={() => setOpen(true)}>
            Add subscription
          </button>
        </>
      )}
    </section>
  );
}
