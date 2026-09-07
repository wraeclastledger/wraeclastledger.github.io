import type { EvidencePage, StrategyDetail } from '../lib/model';
import { displayedDelirium } from '../lib/presentation';

export function ObservedDelirium({
  strategy,
  evidence,
}: {
  strategy: StrategyDetail;
  evidence?: EvidencePage | null;
}) {
  const observed = displayedDelirium(strategy, evidence);
  if (!observed) return null;
  const levels = observed.levels
    .map((level) => `${level.percentage}%: ${level.count} maps`)
    .join(' · ');
  const rewards = observed.rewards
    .map((reward) => `${reward.name} ×${reward.count}`)
    .join(' · ');
  return (
    <details className="observed-delirium">
      <summary>
        Observed{' '}
        {observed.levels.length === 1
          ? `${observed.levels[0].percentage}%`
          : 'mixed'}{' '}
        Delirium · {observed.sample_size}/{strategy.coverage.map_count} maps
      </summary>
      <p>{levels}</p>
      {rewards && <p>Reward tracks: {rewards}</p>}
      <p>
        Recorded on the maps. Purchased Delirium Orbs, when used, are listed
        separately in the setup.
      </p>
    </details>
  );
}
