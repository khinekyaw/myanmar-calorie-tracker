// Delete the caller's account and everything stored for it (Google Play's
// account-deletion requirement). POST with the user's JWT.
//
// Meal photos are removed first, then the auth user; every table row goes
// with it (foreign keys cascade). Safe to retry.

import { withSupabase } from 'npm:@supabase/server@1.9.2';

const PAGE = 1000;

export default {
  fetch: withSupabase({ auth: 'user', cors: 'disabled' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
    const userId = ctx.userClaims!.id;
    const photos = ctx.supabaseAdmin.storage.from('meal-photos');

    try {
      for (;;) {
        const { data, error } = await photos.list(userId, { limit: PAGE });
        if (error) throw new Error(`list photos: ${error.message}`);
        if (!data.length) break;
        const removed = await photos.remove(data.map((f) => `${userId}/${f.name}`));
        if (removed.error) throw new Error(`remove photos: ${removed.error.message}`);
        if (data.length < PAGE) break;
      }

      const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw new Error(`delete user: ${error.message}`);
    } catch (e) {
      console.error(JSON.stringify({ event: 'delete-account', error: e instanceof Error ? e.message : String(e) }));
      return Response.json({ error: 'server_error' }, { status: 500 });
    }

    console.log(JSON.stringify({ event: 'delete-account', outcome: 'ok' }));
    return Response.json({ deleted: true });
  }),
};
