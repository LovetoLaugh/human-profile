import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { authenticationConfigured } from './server/auth-configuration';

// Next.js 15 uses middleware.ts. Resource-level checks enforce private access.
const clerk = clerkMiddleware();
export default function middleware(request: NextRequest, event: NextFetchEvent) {
 if (!authenticationConfigured(process.env)) return NextResponse.next();
 return clerk(request, event);
}
export const config = { matcher: ['/me/:path*', '/sign-in/:path*', '/api/me/:path*'] };
