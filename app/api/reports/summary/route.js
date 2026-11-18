import { api, json } from '@/lib/server/http';
import { scopeDivisi } from '@/lib/server/auth';
import { buildReport } from '@/lib/server/report';

export const dynamic = 'force-dynamic';

export const GET = api(['admin', 'superadmin'], async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  return json(await buildReport(scopeDivisi(session), sp.get('from'), sp.get('to')));
});
