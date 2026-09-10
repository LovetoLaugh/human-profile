import type { EvidenceKind } from '@/types/profile';
const descriptions: Record<EvidenceKind, string> = {
 'Self-reported': 'Entered by the individual; not independently verified.',
 Observed: 'Recorded activity; not independently verified.',
 Verified: 'Confirmed by a source in the mock dataset; no real verification has occurred.',
};

export function EvidenceBadge({ kind }: { kind: EvidenceKind }) {
 return <span className={`evidence-badge evidence-${kind.toLowerCase()}`} title={descriptions[kind]}>{kind}</span>;
}
