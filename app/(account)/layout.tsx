import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { authenticationConfigured } from '@/server/auth-configuration';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
 if (!authenticationConfigured(process.env)) return children;
 return <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-in" signInForceRedirectUrl="/me" signUpForceRedirectUrl="/me" afterSignOutUrl="/">{children}</ClerkProvider>;
}
