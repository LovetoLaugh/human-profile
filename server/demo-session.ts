import { randomUUID } from 'node:crypto';
export const demoCookie = 'human-profile-demo';
export function demoSession(request: Request) {
 const candidate = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${demoCookie}=`))?.slice(demoCookie.length + 1);
 const valid = candidate && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(candidate);
 const id = valid ? candidate : randomUUID();
 return { userId: `demo-${id}`, cookie: `${demoCookie}=${id}; Path=/; HttpOnly; SameSite=Lax${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` };
}
