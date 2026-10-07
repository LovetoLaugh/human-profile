/** Only an exact local invitation path may replace the normal /me destination. */
export function signInReturn(value: unknown) {
 return typeof value === 'string' && /^\/shared\/owner-[a-f0-9]{64}\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value) ? value : '/me';
}
