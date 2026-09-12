import { assertLocalRequest } from '@/server/request-boundary';
import { profileService } from '@/server/profile-backend';
import { developmentSession } from '@/server/development-session';
import { parseCommand, RequestError } from '@/server/commands';
import { PersistenceError } from '@/persistence/file-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: Request) {
 try { assertLocalRequest(request); return response(await profileService.read(developmentSession().userId)); }
 catch (error) { return response({ error: error instanceof RequestError ? error.message : 'Unable to load local data. Check storage permissions or the storage lock, then retry.' }, error instanceof RequestError ? 400 : 503); }
}
export async function POST(request: Request) {
 try {
  assertLocalRequest(request);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new RequestError('JSON is required.');
  const text = await request.text();
  if (text.length > 64000) throw new RequestError('Request is too large.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new RequestError('Invalid JSON.'); }
  return response(await profileService.execute(developmentSession().userId, parseCommand(value)));
 } catch (error) {
  return response({ error: error instanceof Error ? error.message : 'Unable to save local data.' }, error instanceof PersistenceError ? 503 : 400);
 }
}
