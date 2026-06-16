// app/api/admin/backup/route.js
// Full data backup: every brand record + the activity log, as one JSON file.
// Click /api/admin/backup to download. Also callable from the nightly script.

import { listBrands } from '../../../../lib/store';
import { getActivityLog } from '../../../../lib/activity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const [brands, activity] = await Promise.all([listBrands(), getActivityLog()]);
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      brandCount: brands.length,
      brands,
      activity,
    };
    const filename = `marketingos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
