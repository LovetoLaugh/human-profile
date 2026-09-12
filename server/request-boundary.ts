import { RequestError } from './commands';
/** Next may normalize request.url to localhost; use the validated browser Host for same-origin checks. */
export function assertLocalRequest(request: Request) {
 const url = new URL(request.url);
 const host = request.headers.get('host') ?? url.host;
 if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) throw new RequestError('This backend is for localhost development only.');
 const expectedOrigin = new URL(`${url.protocol}//${host}`).origin;
 const origin = request.headers.get('origin');
 if (origin && origin !== expectedOrigin) throw new RequestError('Cross-origin requests are not allowed.');
}
