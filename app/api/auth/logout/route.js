import { api, json } from '@/lib/server/http';
import { destroySession } from '@/lib/server/auth';

export const POST = api(null, async () => {
  await destroySession();
  return json({ ok: true });
});
