export interface Navigation {
  marker: 'wl-c1';
  depth: number;
  backLabel: string;
  scroll: number;
  focus: string;
  tableScroll: number;
  disclosures: Record<string, boolean>;
}
export const navigationDefault: Navigation = {
  marker: 'wl-c1',
  depth: 0,
  backLabel: '',
  scroll: 0,
  focus: '',
  tableScroll: 0,
  disclosures: {},
};
export function readNavigation(value: unknown): Navigation {
  if (
    !value ||
    typeof value !== 'object' ||
    !('marker' in value) ||
    value.marker !== 'wl-c1'
  )
    return { ...navigationDefault };
  const v = value as Record<string, unknown>;
  const bounded = (name: string, max: number) =>
    typeof v[name] === 'number' && Number.isFinite(v[name])
      ? Math.max(0, Math.min(max, Math.floor(v[name])))
      : 0;
  return {
    marker: 'wl-c1',
    depth: bounded('depth', 10000),
    backLabel: typeof v.backLabel === 'string' ? v.backLabel.slice(0, 80) : '',
    scroll: bounded('scroll', 1000000),
    tableScroll: bounded('tableScroll', 100000),
    disclosures: Object.fromEntries(
      v.disclosures &&
        typeof v.disclosures === 'object' &&
        !Array.isArray(v.disclosures)
        ? Object.entries(v.disclosures)
            .filter(
              ([key, value]) =>
                /^(pooled|title|run-\d+|loot-\d+)$/.test(key) &&
                typeof value === 'boolean',
            )
            .slice(0, 64)
        : [],
    ),
    focus: typeof v.focus === 'string' ? v.focus.slice(0, 100) : '',
  };
}
