export function SetupInstructions() {
  return (
    <main className="centeredShell">
      <section className="authPanel">
        <p className="eyebrow">Setup</p>
        <h1>Connect Supabase</h1>
        <p className="muted">
          Add your Supabase project URL and publishable key to{" "}
          <code>.env.local</code>, then run the SQL schema in{" "}
          <code>supabase/schema.sql</code>.
        </p>
        <pre className="codeBlock">{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key`}</pre>
      </section>
    </main>
  );
}
