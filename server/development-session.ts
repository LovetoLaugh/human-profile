/** Temporary server-owned identity. Never take ownerId from browser parameters. Not authentication. */
export function developmentSession() { return { userId: 'dev-user-001' }; }
