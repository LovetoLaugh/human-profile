import type { RecipientIdentity } from '../domain/sharing/share';
/** Only call with the authenticated subject and server-fetched Clerk user data. */
export function verifiedRecipient(subject: string, user: { id: string; emailAddresses: { emailAddress: string; verification: { status: string } | null }[] } | null): RecipientIdentity {
 if (!user || user.id !== subject) throw new Error('Recipient identity is unavailable.');
 return { subject, verifiedEmails: user.emailAddresses.filter(email => email.verification?.status === 'verified').map(email => email.emailAddress) };
}
