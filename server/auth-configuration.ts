interface AuthEnvironment { [key: string]: string | undefined; NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string; CLERK_SECRET_KEY?: string }
/** No keyless/implicit development mode: absent credentials leave the public demo available. */
export function authenticationConfigured(environment: AuthEnvironment): boolean {
 return Boolean(environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && environment.CLERK_SECRET_KEY?.trim());
}
