import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Loading, PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useRefresh } from "@/lib/data";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Sage Table" }, { name: "description", content: "Update your contact and delivery details." }, { property: "og:title", content: "Profile — Sage Table" }, { property: "og:description", content: "Update your contact and delivery details." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const me = useMe();
  const refresh = useRefresh();
  const [f, setF] = useState({ full_name: "", phone: "", delivery_address: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (me.data) setF({ full_name: me.data.full_name, phone: me.data.phone, delivery_address: me.data.delivery_address }); }, [me.data]);

  async function save() {
    if (f.full_name.trim().length < 2 || f.delivery_address.trim().length < 8) { toast.error("Please fill in your name and full address"); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update(f).eq("id", me.data!.id);
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Profile saved"); refresh();
  }

  if (me.isLoading) return <AppShell variant="customer"><Loading /></AppShell>;
  return (
    <AppShell variant="customer">
      <PageHeader title="Profile" subtitle={me.data?.email} />
      <Panel className="max-w-xl space-y-4">
        <div className="space-y-1.5"><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Phone number</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Delivery address</Label><Textarea rows={3} value={f.delivery_address} onChange={(e) => setF({ ...f, delivery_address: e.target.value })} /></div>
        <Button onClick={save} disabled={busy} className="rounded-full">{busy ? "Saving…" : "Save changes"}</Button>
      </Panel>
    </AppShell>
  );
}
