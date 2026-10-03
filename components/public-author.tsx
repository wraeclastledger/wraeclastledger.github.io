import type { StrategyRow } from '../lib/model';
import { authorLabel, anonymousAuthor, ANONYMOUS_AUTHOR_TOOLTIP } from '../lib/safe-api';

/** Presentation only; callers must first have a successfully validated record. */
export function PublicAuthor({ row }: { row: Pick<StrategyRow, 'schema_version' | 'attribution'> }) {
  const text = authorLabel(row), anonymous = anonymousAuthor(row);
  if (!text) return null;
  return <span title={anonymous ? ANONYMOUS_AUTHOR_TOOLTIP : text}
    aria-label={anonymous ? `By Anonymous — ${ANONYMOUS_AUTHOR_TOOLTIP}` : text}
    style={{ overflowWrap: 'anywhere', ...(anonymous ? { color: 'var(--muted)', fontStyle: 'italic' } : {}) }}>
    {text}
  </span>;
}
