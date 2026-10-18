import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Leaf, Truck } from "lucide-react";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, 
      { title: "Oui Chef — Weekly chef-made meal subscriptions" },
      { name: "description", content: "Choose 2 to 5 days from Sunday to Thursday and pick fresh meals from our weekly menu." },
      { property: "og:title", content: "Oui Chef — Weekly chef-made meal subscriptions" },
      { property: "og:description", content: "Choose 2 to 5 days from Sunday to Thursday and pick fresh meals from our weekly menu." },
    ],
  }),
  component: Index,
});

const PHOTOS = ["chicken-rice-bowl", "salmon", "vegetarian-bowl", "lamb-kofta"];

function Index() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8">
      <header className="flex items-center justify-between py-6">
        <Logo />
        <Link to="/auth" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Sign in</Link>
      </header>
      <section className="grid items-center gap-10 py-10 md:grid-cols-2 md:py-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Meal subscriptions</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.05] md:text-6xl">A fresh table, on the days you choose.</h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">Choose 2 to 5 days from Sunday to Thursday, then choose your meals from our weekly chef menu. Change your mind any time before the weekly cut-off.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90">Get started</Link>
            <Link to="/dashboard" className="rounded-full border border-border bg-background/20 px-6 py-3 font-semibold hover:bg-muted/80">My dashboard</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {PHOTOS.map((p, i) => (
            <img key={p} src={`/images/meals/${p}.jpg`} alt={p.replace(/-/g, " ")} className={`aspect-square w-full rounded-3xl object-cover shadow-soft ${i % 2 ? "translate-y-8" : ""}`} />
          ))}
        </div>
      </section>
      <section className="grid gap-4 pb-20 pt-10 md:grid-cols-3">
        {[
          { icon: Leaf, t: "Choose a plan", d: "Weekly or monthly, 2–5 days from Sunday to Thursday." },
          { icon: CalendarCheck, t: "Pick your meals", d: "Select one dish per delivery day from the weekly menu." },
          { icon: Truck, t: "Enjoy", d: "We cook and deliver to your door." },
        ].map((f) => (
          <div key={f.t} className="glass rounded-3xl p-6">
            <f.icon className="size-6 text-primary" />
            <h3 className="mt-4 text-xl font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
