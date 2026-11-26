import { createClient } from '@supabase/supabase-js';

// Daily ping so the Supabase project never sits idle long enough to be paused.
// Called by Vercel Cron (see vercel.json). Reads one user row from auth.users,
// which counts as real database activity.

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Only allow Vercel Cron (it sends this header when CRON_SECRET is set)
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Initialize inside the handler (module-level init broke Vercel builds before)
  const supabaseAdmin = createClient(
    'https://vckmiesiybrtgfphprqh.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (error) {
    console.error('keepalive failed:', error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, at: new Date().toISOString() });
}
