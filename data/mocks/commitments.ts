import { createCommitment, completeCommitment, missCommitment, cancelCommitment } from '../../domain/commitments/service';
import type { CommitmentCategory } from '../../domain/commitments/types';
import type { CommitmentState } from '../../domain/commitments/pipeline';
import type { AudienceType } from '../../types/profile';

/** Fixed instants and IDs make the sample history reproducible across renders and tests. */
export function createCommitmentSeed(): CommitmentState {
  const commitments: CommitmentState['commitments'] = [];
  const evidence: CommitmentState['evidence'] = [];
  const categories: CommitmentCategory[] = ['work', 'health', 'community', 'family', 'agreement'];
  const firstTitles = ['Complete dashboard PR', 'Orangetheory class', 'Help a neighbor move furniture', 'Complete family commitment', 'Complete agreed payment'];
  for (let i = 0; i < 56; i++) {
    const category = categories[i % categories.length];
    const visibility: AudienceType[] = category === 'work' ? ['employer'] : category === 'community' ? ['neighbor', 'family'] : category === 'agreement' ? ['landlord'] : ['family'];
    let recordedAt = new Date(Date.UTC(2026, 8, 9 - i * 3, 15)).toISOString();
    if (i === 1) recordedAt = '2026-09-09T16:00:00.000Z';
    if (i === 2) recordedAt = '2026-09-08T14:00:00.000Z';
    if (i === 3) recordedAt = '2026-09-07T17:00:00.000Z';
    if (i === 50) recordedAt = '2026-08-19T12:00:00.000Z';
    const late = i === 50 || i === 51;
    const dueAt = new Date(Date.parse(recordedAt) + (late ? -86400000 : 3600000)).toISOString();
    const active = createCommitment({ title: firstTitles[i] ?? `${category[0].toUpperCase() + category.slice(1)} commitment ${i + 1}`,
      description: 'Deterministic sample commitment. Outcome recorded through the same service used by the app.', category, dueAt, visibility,
    }, `commitment-${i + 1}`, new Date(Date.parse(dueAt) - 7 * 86400000).toISOString());
    const transition = i < 52 ? completeCommitment(active, recordedAt) : i === 52 ? missCommitment(active, recordedAt) : cancelCommitment(active, recordedAt);
    commitments.push(transition.commitment);
    evidence.push(transition.evidence);
  }
  commitments.unshift(
    createCommitment({ title: 'Plan family event', category: 'family', dueAt: '2026-09-13T23:59:59.999Z', visibility: ['family'] }, 'active-family', '2026-09-09T08:00:00.000Z'),
    createCommitment({ title: 'Apply to startups', category: 'work', dueAt: '2026-09-12T23:59:59.999Z', visibility: ['employer'] }, 'active-work', '2026-09-09T09:00:00.000Z'),
  );
  return { commitments, evidence, asOf: '2026-09-10T00:00:00.000Z' };
}
export const commitmentSeed = createCommitmentSeed();
