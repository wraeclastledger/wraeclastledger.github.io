import { useState, type ReactNode } from 'react';

export type SemanticIconName = 'updated' | 'atlas' | 'public' | 'home' | 'loot_league' | 'loot_other';

/** Decorative artwork: the adjacent text supplies the accessible label. */
export function SemanticIcon({ name, size = 20, fallback, className }: {
  name: SemanticIconName;
  size?: number;
  fallback: ReactNode;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === name) return fallback;
  return <img src={`/icons/semantic/wl_${name}.png`} alt="" aria-hidden="true"
    width={size} height={size} className={className}
    style={{ objectFit: 'contain', flexShrink: 0, verticalAlign: 'middle' }}
    onError={() => setFailed(name)} />;
}
