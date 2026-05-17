import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";

import { signInWithEmail } from "@/app/actions";
import { SetupInstructions } from "@/components/SetupInstructions";
import { getCurrentUserOrNull } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!hasSupabaseConfig()) {
    return <SetupInstructions />;
  }

  const { user } = await getCurrentUserOrNull();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const sent = params?.sent === "1";
  const error = typeof params?.error === "string" ? params.error : null;

  return (
    <main className="centeredShell">
      <section className="authPanel">
        <p className="eyebrow">Book Bob</p>
        <h1>Sign in</h1>
        <form action={signInWithEmail} className="formStack">
          <label>
            <span>Email</span>
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <button className="button primary" type="submit">
            <Mail size={18} aria-hidden />
            Send magic link
          </button>
        </form>
        {sent ? (
          <p className="notice">Check your inbox for the sign-in link.</p>
        ) : null}
        {error ? (
          <p className="notice error">{error}</p>
        ) : null}
        <Link className="textLink" href="/">
          Back to calendar
        </Link>
      </section>
    </main>
  );
}
