import { redirect } from 'next/navigation';

import { createSeedTrip, seedSampleTrips } from '@/app/actions';
import { requireUser } from '@/lib/auth';
import { getCampers } from '@/lib/data';
import { hasSupabaseConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

const SEED_EMAIL = 's.bosma1991@gmail.com';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SeedPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  if (!hasSupabaseConfig()) return <p>No Supabase config.</p>;

  const { supabase, user } = await requireUser();
  if (user.email !== SEED_EMAIL) redirect('/');

  const params = await searchParams;
  const created = params?.created === '1';
  const seeded = params?.seeded === '1';

  const campers = await getCampers(supabase);
  if (!campers.length) return <p>No campers found.</p>;

  const camper = campers[0];

  return (
    <main
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: 24,
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ marginBottom: 4 }}>Seed trips</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Camper: <strong>{camper.name}</strong> — hidden dev page
      </p>

      {created ? <p style={banner}>✓ Trip created.</p> : null}
      {seeded ? <p style={banner}>✓ Sample trips inserted.</p> : null}

      {/* Quick seed */}
      <section style={card}>
        <h2 style={h2}>Quick seed (8 past trips)</h2>
        <p style={{ color: '#666', fontSize: 13, margin: '0 0 12px' }}>
          Inserts 8 completed trips spread across 2024–2025.
        </p>
        <form action={seedSampleTrips}>
          <input type='hidden' name='camper_id' value={camper.id} />
          <button style={btnPrimary} type='submit'>
            Insert sample trips
          </button>
        </form>
      </section>

      {/* Manual trip */}
      <section style={card}>
        <h2 style={h2}>Add one trip</h2>
        <form action={createSeedTrip} style={{ display: 'grid', gap: 12 }}>
          <input type='hidden' name='camper_id' value={camper.id} />

          <Field label='Destination'>
            <input
              style={input}
              required
              name='destination'
              placeholder='Provence, France'
            />
          </Field>

          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <Field label='Start date'>
              <input style={input} required type='date' name='start_date' />
            </Field>
            <Field label='End date'>
              <input style={input} required type='date' name='end_date' />
            </Field>
          </div>

          <Field label='Status'>
            <select style={input} name='status' defaultValue='completed'>
              <option value='completed'>Completed</option>
              <option value='approved'>Approved</option>
              <option value='pending_approval'>Pending approval</option>
              <option value='cancelled'>Cancelled</option>
              <option value='rejected'>Rejected</option>
            </select>
          </Field>

          <Field label='With (optional)'>
            <input
              style={input}
              name='companions'
              placeholder='Family, friends…'
            />
          </Field>

          <Field label='Notes (optional)'>
            <textarea
              style={{ ...input, resize: 'vertical' }}
              name='notes'
              rows={3}
            />
          </Field>

          <button style={btnPrimary} type='submit'>
            Create trip
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: 'grid',
        gap: 4,
        fontSize: 13,
        fontWeight: 700,
        color: '#555',
      }}
    >
      {label}
      {children}
    </label>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
  fontFamily: 'sans-serif',
};

const btnPrimary: React.CSSProperties = {
  padding: '10px 16px',
  background: '#123d36',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 20,
  marginBottom: 16,
};

const h2: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 16,
};

const banner: React.CSSProperties = {
  background: '#dcece7',
  color: '#123d36',
  padding: '10px 14px',
  borderRadius: 6,
  fontWeight: 700,
  marginBottom: 16,
};
