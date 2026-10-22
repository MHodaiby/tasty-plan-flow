import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, Loading, PageHeader, Panel } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { useAllSubs, useProfiles } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin/customers/")({
  component: Customers,
});

function Customers() {
  const profiles = useProfiles();
  const subs = useAllSubs();
  const [q, setQ] = useState("");

  if (profiles.isLoading) return <Loading />;

  const list = (profiles.data ?? []).filter((p) =>
    `${p.full_name} ${p.email} ${p.phone}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Customers"
        action={
          <Input
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="sm:w-64"
          />
        }
      />

      {!list.length ? (
        <Empty>No customers found.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((p) => {
            const latest = subs.data?.find((s) => s.user_id === p.id);

            return (
              <Link
                key={p.id}
                to="/admin/customers/$customerId"
                params={{ customerId: p.id }}
                className="block rounded-lg"
              >
                <Panel className="text-sm transition-shadow hover:shadow-md cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{p.full_name || "—"}</p>
                      <p className="text-muted-foreground">{p.email}</p>
                    </div>
                    {latest && <StatusBadge status={latest.status} />}
                  </div>
                  <p className="mt-2">{p.phone}</p>
                  <p className="text-muted-foreground">{p.delivery_address}</p>
                </Panel>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
