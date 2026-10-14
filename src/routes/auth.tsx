import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/br-ui";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Breakout Radar" },
      { name: "description", content: "Sign in to the Breakout Radar internal A&R workspace." },
      { property: "og:title", content: "Sign in — Breakout Radar" },
      { property: "og:description", content: "Sign in to the Breakout Radar internal A&R workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      navigate({ to: "/radar", replace: true });
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/radar` } });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Check your email for a sign-in link.");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={hero} alt="Artist performing on stage" className="absolute inset-0 h-full w-full object-cover object-right" width={1600} height={640} />
        <div className="hero-fade absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo />
          <div>
            <h1 className="text-5xl font-bold leading-tight">Find Tomorrow’s Stars<br /><span className="text-lime">Today.</span></h1>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">Confidential internal A&R intelligence. Authorised team members only.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="panel w-full max-w-sm space-y-5 p-8">
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="text-xs text-muted-foreground">Access is by invitation from an admin.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          {mode === "password" && (
            <div className="space-y-2">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
          )}
          <Button type="submit" className="w-full font-semibold" disabled={busy}>
            {busy ? "Please wait…" : mode === "password" ? "Sign in" : "Email me a link"}
          </Button>
          <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "password" ? "magic" : "password")}>
            {mode === "password" ? "Use a magic link instead" : "Use password instead"}
          </button>
        </form>
      </div>
    </div>
  );
}
