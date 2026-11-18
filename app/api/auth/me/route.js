import { api, json } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export const GET = api(['admin', 'superadmin'], async ({ session }) => json({ user: session }));
