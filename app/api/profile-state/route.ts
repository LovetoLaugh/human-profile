import { assertLocalRequest, assertDemoRequest } from '@/server/request-boundary';
import { getProfileService, mode } from '@/server/profile-backend';
import { developmentSession } from '@/server/development-session';
import { demoSession } from '@/server/demo-session';
import { parseCommand, RequestError } from '@/server/commands';
import { DemoLimitError } from '@/persistence/demo-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function session(request: Request) {
 if (mode === 'public-demo') { assertDemoRequest(request); return demoSession(request); }
 assertLocalRequest(request); return { ...developmentSession(), cookie: undefined };
}
function response(body: unknown, status = 200, cookie?: string) {
 return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie', ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
}
export async function GET(request: Request) {
 try {
  const identity = session(request);
  const view = await (await getProfileService()).read(identity.userId);
  return response({ ...view, mode }, 200, identity.cookie);
 } catch { return response({ error: 'Unable to load the profile. Please try again.' }, 503); }
}
export async function POST(request: Request) {
 try {
  const identity = session(request);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new RequestError('JSON is required.');
  const text = await request.text();
  if (text.length > 64000) throw new RequestError('Request is too large.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new RequestError('Invalid JSON.'); }
  const view = await (await getProfileService()).execute(identity.userId, parseCommand(value));
  return response({ ...view, mode }, 200, identity.cookie);
 } catch (error) {
  // Never expose filesystem paths, stack traces, or unexpected internal exception messages.
  const message = error instanceof DemoLimitError ? error.message : error instanceof RequestError ? 'That demo action could not be processed. Check your entries and try again.' : 'The change could not be saved. Reload the profile and try again.';
  return response({ error: message }, error instanceof RequestError || error instanceof DemoLimitError ? 400 : 503);
 }
}
