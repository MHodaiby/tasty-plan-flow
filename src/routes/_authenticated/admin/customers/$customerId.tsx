import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, Empty } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRefresh, useUserSubs, type Profile, type Subscription } from "@/lib/data";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { SubscriptionAdminCard } from "@/components/SubscriptionAdminCard";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/customers/$customerId")({
  component: CustomerDetails,
});

function ProfilePage({ customer: me }: { customer: Profile | undefined }) {
  const refresh = useRefresh();
  const [f, setF] = useState({ full_name: "", phone: "", delivery_address: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (me)
      setF({
        full_name: me.full_name,
        phone: me.phone,
        delivery_address: me.delivery_address,
      });
  }, [me]);

  async function save() {
    if (f.full_name.trim().length < 2 || f.delivery_address.trim().length < 8) {
      toast.error("Please fill in your name and full address");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update(f).eq("id", me!.id);
    setBusy(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success("Profile saved");
    refresh();
  }
  return (
    <>
      <div className="space-y-1.5">
        <Label>Full name</Label>
        <Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Phone number</Label>
        <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Delivery address</Label>
        <Textarea
          rows={3}
          value={f.delivery_address}
          onChange={(e) => setF({ ...f, delivery_address: e.target.value })}
        />
      </div>
      <Button onClick={save} disabled={busy} className="rounded-full">
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </>
  );
}

function Subs({
  customerSubs,
}: {
  customerSubs: (Subscription & {
    profiles: Profile | null;
  })[];
}) {
  return (
    <>
      {!customerSubs.length ? (
        <Empty>No subscriptions here.</Empty>
      ) : (
        <div>
          {customerSubs.map((s) => (
            <SubscriptionAdminCard key={s.id} sub={s} />
          ))}
        </div>
      )}
    </>
  );
}

function CustomerDetails() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const customer = useProfile(customerId);
  const customerSubs = useUserSubs(customerId);

  if (customer.isPending || customerSubs.isPending) {
    return <p>Loading customer details...</p>;
  }

  if (!customer) {
    return <p>Customer not found.</p>;
  }

  return (
    <>
      <PageHeader
        title={customer.data?.full_name || "Customer Details"}
        action={
          <Button onClick={() => navigate({ to: "/admin/customers" })}>Back to Customers</Button>
        }
        subtitle={customer?.data?.email}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel className="space-y-4">
          <ProfilePage customer={customer.data} />
        </Panel>
        <Panel className="space-y-4">
          <Subs customerSubs={customerSubs.data ?? []} />
        </Panel>
      </div>
    </>
  );
}
