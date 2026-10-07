import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Sage Table" },
      { name: "description", content: "Sign in or create your Sage Table meal subscription account." },
      { property: "og:title", content: "Sign in — Sage Table" },
      { property: "og:description", content: "Sign in or create your Sage Table meal subscription account." },
    ],
  }),
  component: AuthPage,
});

const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().regex(/^\+?[0-9 ]{8,15}$/, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  delivery_address: z.string().trim().min(8, "Enter your full delivery address").max(500),
});
type RegisterForm = z.infer<typeof registerSchema>;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [reg, setReg] = useState<RegisterForm>({ full_name: "", email: "", phone: "", password: "", delivery_address: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});
  const [sent, setSent] = useState(false);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: login.email.trim(), password: login.password });
    setBusy(false);
    if (error) return toast.error(error.message === "Invalid login credentials" ? "Email or password is incorrect" : error.message);
    navigate({ to: "/dashboard" });
  }

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(reg);
    if (!parsed.success) {
      const errs: typeof errors = {};
      parsed.error.issues.forEach((i) => (errs[i.path[0] as keyof RegisterForm] = i.message));
      return setErrors(errs);
    }
    setErrors({});
    setBusy(true);
    const { full_name, phone, delivery_address, email, password } = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name, phone, delivery_address } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.session) navigate({ to: "/dashboard" });
    else setSent(true);
  }

  const set = (k: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setReg({ ...reg, [k]: e.target.value });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src="/images/meals/salmon.jpg" alt="Roasted salmon with greens" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
        <p className="absolute bottom-12 left-12 max-w-md font-display text-4xl leading-tight text-background">Fresh, chef-made meals for the days you choose.</p>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
        <div className="glass w-full max-w-md rounded-3xl p-6 md:p-8">
          <Logo />
          <div className="mt-6 grid grid-cols-2 rounded-full bg-muted p-1">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setSent(false); }} className={cn("rounded-full py-2 text-sm font-semibold", mode === m ? "bg-background shadow-sm" : "text-muted-foreground")}>
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <form onSubmit={onLogin} className="mt-6 space-y-4">
              <Field label="Email"><Input type="email" required value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} /></Field>
              <Field label="Password"><Input type="password" required value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></Field>
              <Button type="submit" className="w-full rounded-full" size="lg" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
            </form>
          ) : sent ? (
            <div className="mt-6 rounded-2xl bg-secondary p-5 text-sm">
              <p className="font-semibold">Check your inbox</p>
              <p className="mt-1 text-muted-foreground">We sent a confirmation link to {reg.email}. Confirm your email, then sign in.</p>
            </div>
          ) : (
            <form onSubmit={onRegister} className="mt-6 space-y-4" noValidate>
              <Field label="Full name" error={errors.full_name}><Input value={reg.full_name} onChange={set("full_name")} /></Field>
              <Field label="Email" error={errors.email}><Input type="email" value={reg.email} onChange={set("email")} /></Field>
              <Field label="Phone number" error={errors.phone}><Input type="tel" placeholder="+966 5x xxx xxxx" value={reg.phone} onChange={set("phone")} /></Field>
              <Field label="Password" error={errors.password}><Input type="password" value={reg.password} onChange={set("password")} /></Field>
              <Field label="Delivery address" error={errors.delivery_address}><Textarea rows={3} value={reg.delivery_address} onChange={set("delivery_address")} /></Field>
              <Button type="submit" className="w-full rounded-full" size="lg" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
