import type { BehavioralPattern, EvidenceEvent } from '../../types/profile';
import { contributesToPatterns } from '../evidence/services';

/** Qualitative labels remain mock interpretations; only eligible support is presented. */
export function patternWithEvidence(pattern: BehavioralPattern, evidence: readonly EvidenceEvent[]): BehavioralPattern {
 const records = evidence.filter(e => pattern.evidenceIds.includes(e.id) && contributesToPatterns(e));
 return { ...pattern, evidenceIds: records.map(e => e.id), kinds: [...new Set(records.map(e => e.kind))],
  value: records.length ? pattern.value : 'No eligible evidence',
  detail: 'Illustrative interpretation · Mock data', observations: `${records.length} eligible supporting records`,
  confidence: records.length ? pattern.confidence : undefined };
}
