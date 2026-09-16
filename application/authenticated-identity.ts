/** Stable authenticated subject, supplied by a trusted server adapter, never request input. */
export interface AuthenticatedIdentity {
 readonly subject: string;
}
