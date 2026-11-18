import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, Subscription } from "@/lib/data";
import {
  DAYS_SHORT,
  STATUS_LABEL,
  errMsg,
  toISODate,
  fmtShort,
  daysList,
  visibleSubscriptionStatus,
} from "@/lib/format";
import { subscriptionDaysSchema, SUBSCRIPTION_DAYS } from "@/lib/subscription-rules";
import { PaymentForm, SubscriptionRequestForm } from "./SubscriptionForms";

export function ProfileEditor({
  customer,
  onSaved,
}: {
  customer: Profile;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    full_name: customer.full_name,
    phone: customer.phone,
    delivery_address: customer.delivery_address,
  });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  function beginEdit() {
    setForm({
      full_name: customer.full_name,
      phone: customer.phone,
      delivery_address: customer.delivery_address,
    });
    setEditing(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.full_name.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          delivery_address: form.delivery_address.trim(),
        })
        .eq("id", customer.id);
      if (error) throw error;
      await onSaved();
      setEditing(false);
      toast.success("Customer details saved");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="aw-profile aw-panel" aria-label="Customer details">
      <div className="aw-panel-heading">
        <h2>Personal Details</h2>
        {!editing && (
          <button
            type="button"
            className="aw-button aw-edit-icon"
            aria-label="Edit personal details"
            onClick={beginEdit}
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
      {editing ? (
        <form onSubmit={save} className="aw-form">
          <label>
            <span className="aw-sr-only">Full name</span>
            <input
              required
              maxLength={100}
              autoComplete="name"
              value={form.full_name}
              placeholder="Full name"
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
            />
          </label>
          <label>
            <span className="aw-sr-only">Phone number</span>
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              placeholder="Phone number"
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </label>
          <label>
            <span className="aw-sr-only">Delivery address</span>
            <input
              autoComplete="street-address"
              value={form.delivery_address}
              placeholder="Delivery address"
              onChange={(event) => setForm({ ...form, delivery_address: event.target.value })}
            />
          </label>
          <div className="aw-form-actions">
            <button
              type="button"
              className="aw-button"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button className="aw-button aw-save-details" disabled={busy || !form.full_name.trim()}>
              {busy ? "Saving…" : "Save details"}
            </button>
          </div>
        </form>
      ) : (
        <dl className="aw-read-details">
          <div>
            <dt>Full name</dt>
            <dd>{customer.full_name || "Not provided"}</dd>
          </div>
          <div>
            <dt>Phone number</dt>
            <dd>{customer.phone || "Not provided"}</dd>
          </div>
          <div>
            <dt>Delivery address</dt>
            <dd>{customer.delivery_address || "Not provided"}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export function SubscriptionEditor({
  subscription: sub,
  customerName,
  onSaved,
  onRequestCreated,
}: {
  subscription: Subscription;
  customerName: string;
  onSaved: () => Promise<void>;
  onRequestCreated?: (id: string) => void;
}) {
  const [days, setDays] = useState([...sub.default_days]);
  const [form, setForm] = useState({
    start: sub.start_date ?? "",
    end: sub.end_date ?? "",
    notes: sub.admin_notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<"renew" | "payment">();
  const status = visibleSubscriptionStatus(sub.status);
  const valid = subscriptionDaysSchema.safeParse(days).success;
  const legacy =
    !subscriptionDaysSchema.safeParse(sub.default_days).success ||
    sub.days_per_week !== sub.default_days.length;
  const changedDays = [...days].sort().join() !== [...sub.default_days].sort().join();
  function reset() {
    setDays([...sub.default_days]);
    setForm({ start: sub.start_date ?? "", end: sub.end_date ?? "", notes: sub.admin_notes ?? "" });
    setEditing(false);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (changedDays && !valid) return;
    // The deployed trigger can reactivate expired records when their end date is
    // in the future. Do not let a metadata save reactivate an invalid legacy plan.
    if (status === "expired" && form.start && form.end >= toISODate(new Date())) {
      toast.error(
        "Use Renew subscription to create a new request instead of extending this expired record.",
      );
      return;
    }
    if (form.end && form.start && form.end < form.start) {
      toast.error("Renewal date must be on or after the start date.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          start_date: form.start || null,
          end_date: form.end || null,
          admin_notes: form.notes.trim() || null,
          ...(changedDays || (valid && sub.days_per_week !== days.length)
            ? { default_days: [...days].sort((a, b) => a - b), days_per_week: days.length }
            : {}),
        })
        .eq("id", sub.id);
      if (error) throw error;
      await onSaved();
      setEditing(false);
      toast.success("Subscription saved");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="aw-subscription aw-panel">
      <div className="aw-panel-heading">
        <h2>Subscription</h2>
        <div className="aw-heading-actions">
          <span className="aw-status">{STATUS_LABEL[status]}</span>
          {!editing && !action && (
            <button
              type="button"
              className="aw-button aw-edit-icon"
              aria-label="Edit subscription"
              onClick={() => {
                setDays([...sub.default_days]);
                setForm({
                  start: sub.start_date ?? "",
                  end: sub.end_date ?? "",
                  notes: sub.admin_notes ?? "",
                });
                setEditing(true);
              }}
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
      </div>
      <p className="aw-subtitle">{customerName}</p>
      {legacy && (
        <p className="aw-review" role="alert">
          Requires review: choose 2–5 days from Sunday to Thursday. Activation and meal selection
          remain blocked until corrected.
        </p>
      )}
      {editing ? (
        <form className="aw-form" onSubmit={save}>
          <div className="aw-plan-days">
            <div className="aw-field">
              <span id="aw-plan-label">Plan</span>
              <p className="aw-plan-value" aria-labelledby="aw-plan-label">
                {sub.billing_period === "monthly" ? "Monthly" : "Weekly"}
              </p>
            </div>
            <fieldset className="aw-days">
              <legend>Delivery days</legend>
              <div>
                {SUBSCRIPTION_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`aw-button ${days.includes(day) ? "aw-button-dark" : ""}`}
                    aria-pressed={days.includes(day)}
                    onClick={() =>
                      setDays(
                        days.includes(day) ? days.filter((value) => value !== day) : [...days, day],
                      )
                    }
                  >
                    {DAYS_SHORT[day]}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <p className="aw-days-help">Friday and Saturday are not available.</p>
          {!valid && (
            <p className="aw-validation">
              Select 2–5 distinct delivery days.
              {legacy && (
                <button
                  type="button"
                  className="aw-text-button"
                  onClick={() => setDays(days.filter((day) => day >= 0 && day <= 4))}
                >
                  Remove legacy weekend days
                </button>
              )}
            </p>
          )}
          <div className="aw-date-fields">
            <label className="aw-field">
              <span>Start date</span>
              <input
                type="date"
                value={form.start}
                required={sub.status === "active"}
                onChange={(event) => setForm({ ...form, start: event.target.value })}
              />
            </label>
            <label className="aw-field">
              <span>Renewal date</span>
              <input
                type="date"
                value={form.end}
                min={form.start || undefined}
                onChange={(event) => setForm({ ...form, end: event.target.value })}
              />
            </label>
          </div>
          <label className="aw-field">
            <span>Admin note</span>
            <textarea
              rows={2}
              placeholder="Optional subscription note..."
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </label>
          <div className="aw-form-actions">
            <button type="button" className="aw-button" disabled={busy} onClick={reset}>
              Cancel
            </button>
            <button className="aw-button aw-button-dark" disabled={busy || (changedDays && !valid)}>
              {busy ? "Saving…" : "Save subscription"}
            </button>
          </div>
        </form>
      ) : (
        <dl className="aw-read-details">
          <div>
            <dt>Plan</dt>
            <dd>
              {sub.billing_period === "monthly" ? "Monthly" : "Weekly"} · {sub.days_per_week} days /
              week
            </dd>
          </div>
          <div>
            <dt>Delivery days</dt>
            <dd>{daysList(sub.default_days)}</dd>
          </div>
          <div className="aw-read-dates">
            <div>
              <dt>Start date</dt>
              <dd>{fmtShort(sub.start_date)}</dd>
            </div>
            <div>
              <dt>Renewal date</dt>
              <dd>{fmtShort(sub.end_date)}</dd>
            </div>
          </div>
          <div>
            <dt>Admin note</dt>
            <dd>{sub.admin_notes || "No note"}</dd>
          </div>
        </dl>
      )}
      {!editing && !action && status === "expired" && (
        <button
          className="aw-button aw-button-dark aw-subscription-action"
          onClick={() => setAction("renew")}
        >
          Renew subscription
        </button>
      )}
      {!editing && !action && status === "pending_payment" && (
        <button
          className="aw-button aw-button-dark aw-subscription-action"
          disabled={legacy}
          onClick={() => setAction("payment")}
        >
          Record payment
        </button>
      )}
      {action === "renew" && (
        <SubscriptionRequestForm
          userId={sub.user_id}
          previous={sub}
          onSaved={onSaved}
          {...(onRequestCreated ? { onCreated: onRequestCreated } : {})}
          onCancel={() => setAction(undefined)}
        />
      )}
      {action === "payment" && (
        <PaymentForm subscription={sub} onSaved={onSaved} onCancel={() => setAction(undefined)} />
      )}
    </section>
  );
}
