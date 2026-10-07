import { signInReturn } from '@/server/sign-in-return';
import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { authenticationConfigured } from '@/server/auth-configuration';
import { resolveAuthenticatedIdentity } from '@/server/clerk-identity';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in — Human Profile' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
 const destination = signInReturn((await searchParams).next);
 const configured = authenticationConfigured(process.env);
 if (configured && await resolveAuthenticatedIdentity()) redirect(destination);
 return <main className="account-shell"><section className="card demo-introduction">
  <h1>Human Profile</h1><p className="demo-tagline">People. Context. Trust.</p>
  <h2>Continue with Google</h2><p>Your private profile starts empty, separate from the fictional demo.</p>
  <p>Your profile shows the active storage mode after sign-in. Local development uses files; production requires durable private storage.</p>
  <div className="profile-actions"><Link className="profile-button" href="/">Explore the public demo</Link></div>
 </section>{configured ? <SignIn routing="path" path="/sign-in" forceRedirectUrl={destination} signUpForceRedirectUrl={destination} /> : <section className="card demo-introduction"><h2>Sign-in is not configured yet</h2><p>The public demo remains available. The site owner needs to configure Clerk and enable Google sign-in.</p></section>}</main>;
}
