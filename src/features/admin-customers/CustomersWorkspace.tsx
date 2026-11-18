import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAllSubs, useMe, useProfiles } from "@/lib/data";
import { STATUS_LABEL, fmtShort } from "@/lib/format";
import { ProfileEditor, SubscriptionEditor } from "./CustomerEditors";
import { MealPlanner } from "./MealPlanner";
import { NewSubscriptionPanel } from "./SubscriptionForms";
import "./customers-workspace.css";

const navigation = [
  { to: "/admin/customers", label: "Customers & Subscriptions" },
  { to: "/admin/meals", label: "Meal Catalogue" },
  { to: "/admin/menus", label: "Upcoming Week’s Menu" },
  { to: "/admin/selections", label: "This Week’s Selections" },
] as const;

export function Notice({ children, retry }: { children: ReactNode; retry?: () => void }) {
  return (
    <div className="aw-notice" role="status">
      {children}
      {retry && (
        <button className="aw-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function CustomersWorkspace() {
  const profiles = useProfiles();
  const subscriptions = useAllSubs();
  const me = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedSubId, setSelectedSubId] = useState<string>();
  const [menuOpen, setMenuOpen] = useState(false);
  const selected =
    profiles.data?.find((profile) => profile.id === selectedId) ?? profiles.data?.[0];
  const customerSubs = subscriptions.data?.filter((sub) => sub.user_id === selected?.id) ?? [];
  const subscription =
    customerSubs.find((sub) => sub.id === selectedSubId) ??
    customerSubs.find((sub) => sub.status === "active") ??
    customerSubs[0];
  const list = (profiles.data ?? []).filter((profile) =>
    `${profile.id} ${profile.full_name} ${profile.email} ${profile.phone}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["profiles"] }),
      queryClient.invalidateQueries({ queryKey: ["all-subs"] }),
      queryClient.invalidateQueries({ queryKey: ["profile", selected?.id] }),
      queryClient.invalidateQueries({ queryKey: ["user-subs", selected?.id] }),
      queryClient.invalidateQueries({ queryKey: ["week"] }),
    ]);
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await navigate({ to: "/auth" });
  }
  return (
    <div className="admin-workspace">
      <header className="aw-header">
        <div className="aw-mobile-brand">
          <span>OUI CHEF</span>
          <button
            className="aw-button"
            aria-expanded={menuOpen}
            aria-controls="aw-mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            Menu
          </button>
        </div>
        <div className="aw-heading-row">
          <div>
            <p className="aw-eyebrow">
              <span className="aw-desktop-brand">OUI CHEF · </span>ADMIN PORTAL
            </p>
            <h1>Customers &amp; Subscriptions</h1>
          </div>
          <details className="aw-account">
            <summary>
              <span className="aw-account-avatar" />
              <span>
                <strong>{me.data?.full_name || "Admin User"}</strong>
                <span>{me.data?.email || "Administrator account"}</span>
              </span>
            </summary>
            <div className="aw-account-actions">
              <Link to="/admin/requests">Payment requests</Link>
              <Link to="/admin/subscriptions">All subscriptions</Link>
              <button onClick={signOut}>Sign out</button>
            </div>
          </details>
        </div>
        <nav className="aw-tabs" aria-label="Admin navigation">
          {navigation.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={item.to === "/admin/customers" ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="aw-mobile-indicators" aria-hidden="true">
          {navigation.map((item, index) => (
            <span key={item.to} className={index === 0 ? "is-current" : ""} />
          ))}
        </div>
        {menuOpen && (
          <nav className="aw-mobile-menu" id="aw-mobile-menu" aria-label="Mobile admin navigation">
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={item.to === "/admin/customers" ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/admin/requests">Payment requests</Link>
            <Link to="/admin/subscriptions">All subscriptions</Link>
            <button onClick={signOut}>Sign out</button>
          </nav>
        )}
      </header>
      <main className="aw-main">
        <label className="aw-search">
          <span className="aw-sr-only">Search customers by ID, name, email or phone</span>
          <input
            type="search"
            placeholder="Search customer ID, name, or email..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {profiles.isPending || subscriptions.isPending ? (
          <Notice>Loading customers and subscriptions…</Notice>
        ) : profiles.isError || subscriptions.isError ? (
          <Notice
            retry={() => {
              void profiles.refetch();
              void subscriptions.refetch();
            }}
          >
            Customers could not be loaded.
          </Notice>
        ) : (
          <div className="aw-layout">
            <section className="aw-customer-list aw-panel" aria-label="Customers">
              {!list.length ? (
                <Notice>{query ? "No customers match your search." : "No customers yet."}</Notice>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Plan</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((profile) => {
                      const latest =
                        subscriptions.data?.find(
                          (sub) => sub.user_id === profile.id && sub.status === "active",
                        ) ?? subscriptions.data?.find((sub) => sub.user_id === profile.id);
                      const status = STATUS_LABEL[latest?.status ?? "not_active"];
                      return (
                        <tr
                          key={profile.id}
                          className={selected?.id === profile.id ? "is-selected" : ""}
                          onClick={() => {
                            setSelectedId(profile.id);
                            setSelectedSubId(undefined);
                          }}
                        >
                          <td>
                            <button
                              className="aw-customer-select"
                              aria-pressed={selected?.id === profile.id}
                              onClick={() => {
                                setSelectedId(profile.id);
                                setSelectedSubId(undefined);
                              }}
                            >
                              <strong>
                                {profile.full_name || profile.id.slice(0, 8)}
                                <span className="aw-mobile-status"> · {status}</span>
                              </strong>
                              <span>{profile.email}</span>
                            </button>
                          </td>
                          <td className="aw-plan-column">
                            {latest
                              ? `${latest.days_per_week} days · ${latest.billing_period === "monthly" ? "Monthly" : "Weekly"}`
                              : "No plan"}
                          </td>
                          <td className="aw-status-column">{status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
            {selected ? (
              <>
                <ProfileEditor key={selected.id} customer={selected} onSaved={refresh} />
                <section className="aw-subscription-area" aria-label="Subscription editor">
                  {subscription ? (
                    <SubscriptionEditor
                      key={subscription.id}
                      subscription={subscription}
                      customerName={selected.full_name}
                      onSaved={refresh}
                      onRequestCreated={setSelectedSubId}
                    />
                  ) : (
                    <NewSubscriptionPanel
                      userId={selected.id}
                      onSaved={refresh}
                      onCreated={setSelectedSubId}
                    />
                  )}
                </section>
                <MealPlanner
                  key={`${selected.id}:${subscription?.id ?? "none"}`}
                  subscription={subscription}
                />
              </>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
