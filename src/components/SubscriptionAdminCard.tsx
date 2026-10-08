import { useState } from "react";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useRefresh, type Profile, type Subscription } from "@/lib/data";
import { daysList, defaultEndDate, errMsg, fmtDateTime, fmtShort, toISODate, type SubStatus } from "@/lib/format";

export function SubscriptionAdminCard({ sub }: { sub: Subscription & { profiles: Profile | null } }) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const today = toISODate(new Date());
  const [f, setF] = useState({
    start: sub.start_date ?? today, end: sub.end_date ?? defaultEndDate(sub.start_date ?? today, sub.billing_period),
    amount: "", reference: "", notes: sub.admin_notes ?? "",
  });

  async function update(patch: Parameters<ReturnType<typeof supabase.from<"subscriptions">>["update"]>[0], msg: string) {
    const { error } = await supabase.from("subscriptions").update(patch).eq("id", sub.id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(msg); setOpen(false); refresh();
  }
  async function activate() {
    if (!f.start || !f.end || f.end < f.start) { toast.error("Choose a valid start and end date"); return; }
    const { data } = await supabase.auth.getUser();
    const pay = await supabase.from("payments").insert({ subscription_id: sub.id, user_id: sub.user_id, amount: f.amount ? Number(f.amount) : null, reference: f.reference || null, recorded_by: data.user!.id });
    if (pay.error) { toast.error(errMsg(pay.error)); return; }
    await update({ status: "active", start_date: f.start, end_date: f.end, payment_received_at: new Date().toISOString(), admin_notes: f.notes || null }, "Payment recorded and subscription activated");
  }
  const setStatus = (status: SubStatus) => update({ status }, "Status updated");

  return (
    <Panel className="text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-semibold">{sub.profiles?.full_name}</p><p className="text-muted-foreground">{sub.profiles?.email} · {sub.profiles?.phone}</p></div>
        <StatusBadge status={sub.status} />
      </div>
      <p className="mt-3 capitalize">{sub.billing_period} · {sub.days_per_week} days · {daysList(sub.default_days)}</p>
      <p className="text-muted-foreground">{fmtShort(sub.start_date)} – {fmtShort(sub.end_date)} · requested {fmtDateTime(sub.created_at)}</p>
      {sub.admin_notes && <p className="mt-1 italic text-muted-foreground">{sub.admin_notes}</p>}

      {open ? (
        <div className="mt-4 grid gap-3 rounded-2xl bg-secondary/60 p-4 sm:grid-cols-2">
          <div className="space-y-1"><Label>Start date</Label><Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value, end: defaultEndDate(e.target.value, sub.billing_period) })} /></div>
          <div className="space-y-1"><Label>End date</Label><Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
          {sub.status === "pending_payment" && <>
            <div className="space-y-1"><Label>Amount paid (SAR)</Label><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Payment reference</Label><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
          </>}
          <div className="space-y-1 sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div className="flex gap-2 sm:col-span-2">
            {sub.status === "pending_payment"
              ? <Button className="rounded-full" onClick={activate}>Mark paid &amp; activate</Button>
              : <Button className="rounded-full" onClick={() => update({ start_date: f.start, end_date: f.end, admin_notes: f.notes || null }, "Saved")}>Save</Button>}
            <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="rounded-full" onClick={() => setOpen(true)}>{sub.status === "pending_payment" ? "Record payment" : "Edit dates"}</Button>
          {sub.status === "active" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStatus("paused")}>Pause</Button>}
          {sub.status === "paused" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStatus("active")}>Resume</Button>}
          {["active", "paused"].includes(sub.status) && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStatus("expired")}>Expire</Button>}
          {sub.status !== "cancelled" && <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => confirm("Cancel this subscription?") && setStatus("cancelled")}>Cancel</Button>}
        </div>
      )}
    </Panel>
  );
}
