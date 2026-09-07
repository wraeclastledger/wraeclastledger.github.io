import catalogue from './artwork-catalogue.json';
import gemNames from './artwork-gem-names.json';
import equipmentNames from './artwork-equipment-names.json';
import provenance from './artwork-sources.json';
const verifiedGems = new Set(gemNames);
const verifiedEquipment = new Set(equipmentNames.linkable);
const verifiedUniques = new Set(equipmentNames.uniques);
const verifiedBases = new Set(Object.entries(provenance.sources)
  .filter(([, source]) => source.type === 'BaseType').map(([name]) => name));
// Author-confirmed historical labels; artwork only. Never rewrite loot names,
// categories, quantities or prices, and do not expand this into typo guessing.
const reviewedAliases: Record<string, string> = {
  'malachai gloves': "malachai's mark",
  "malachi's mark gloves": "malachai's mark",
};
const normalizeName = (name: string) => name.toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/['’`]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const normalized = new Map<string, string | null>();
for (const [name, url] of Object.entries(catalogue)) {
  const key = normalizeName(name);
  normalized.set(key, normalized.has(key) && normalized.get(key) !== url ? null : url);
}
const exactArtwork = (key: string) => Object.hasOwn(catalogue, key)
  ? catalogue[key as keyof typeof catalogue] : normalized.get(normalizeName(key)) ?? null;
// Exact item identity only; refreshed by scripts/refresh-artwork.mjs. No prices.
const BLUEPRINT =
  'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvSGVpc3QvQmx1ZXByaW50Tm90QXBwcm92ZWQ3IiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/bafd718e24/BlueprintNotApproved7.png';
const CHART =
  'https://web.poecdn.com/image/Art/2DItems/Currency/Deepwater/DeepwaterTornMap1.png';
const chartNames = new Set([
  'coral forest chart',
  'coral reef chart',
  'sandy seabed chart',
  'chart (abyssal plain)',
  'chart (anchorfield)',
  "chart (brine king's domain)",
  'chart (clam-infested shelf)',
  'chart (diving shoals)',
  'chart (eldritch depths)',
  'chart (hazardous depths)',
  'chart (infested bathyspheres)',
  "chart (kishara's rest)",
  'chart (lost ruins)',
  'chart (pelagic abyss)',
  'chart (seafloor ridges)',
  'chart (sea pillars)',
  'chart (sunken totems)',
  'chart (undersea groves)',
  'chart (unremarkable seabed)',
  'chart',
  'charts',
]);
export function artwork(name: string): string | null {
  const key = name.trim().toLowerCase();
  const exact = exactArtwork(key);
  if (exact) return exact;
  if (Object.hasOwn(reviewedAliases, key)) return exactArtwork(reviewedAliases[key]);
  // An explicitly named influence leaves the base artwork unchanged. Require
  // the whole remaining name to be an exact BaseType, never a unique or a
  // progressive substring. This is presentation only, not identity metadata.
  const influenced = /^(?:elder|shaper|crusader|redeemer|hunter|warlord) (.+)$/.exec(key);
  if (influenced && verifiedBases.has(influenced[1]))
    return exactArtwork(influenced[1]);
  // WealthyExile gem decorations affect display text, not the gem's artwork.
  // Require a complete suffix and a verified gem identity; never guess a base.
  const gem = /^(.+) - \d+\/\d+(?: corrupted)?$/.exec(key);
  if (gem && verifiedGems.has(gem[1]) && Object.hasOwn(catalogue, gem[1]))
    return catalogue[gem[1] as keyof typeof catalogue];
  const linked = /^(.+) [1-6]l$/.exec(key);
  if (linked && verifiedEquipment.has(linked[1])) return exactArtwork(linked[1]);
  const variant = key.lastIndexOf(',');
  if (variant > 0) {
    const base = key.slice(variant + 1).trim();
    if (verifiedUniques.has(base)) return exactArtwork(base);
  }
  if (/^blueprints?\b/.test(key)) return BLUEPRINT;
  if (key === 'coral forest chart')
    return CHART.replace('TornMap1', 'TornMap2');
  if (key === 'coral reef chart') return CHART.replace('TornMap1', 'TornMap3');
  if (chartNames.has(key)) return CHART;
  return null;
}
export const JANUS_PORTRAIT = '/icons/portraits/janus.webp';
const isJanus = (name: string) => ['janus', 'janus perandus'].includes(name.trim().toLowerCase());
export function lootArtwork(name: string, identity?: {
  kind: string; base?: string | null; chart?: string | null; member?: string;
} | null): string | null {
  // Structured identity is authoritative over an arbitrary display label.
  if (identity?.kind === 'quality-base' || identity?.kind === 'syndicate-reward') {
    if (typeof identity.base === 'string' && verifiedBases.has(identity.base.toLowerCase()))
      return exactArtwork(identity.base.toLowerCase());
    return identity.kind === 'syndicate-reward' && isJanus(identity.member || '')
      ? JANUS_PORTRAIT : null;
  }
  if (identity?.kind === 'chart') return artwork(identity.chart || 'Chart');
  // Confirmed legacy custom-loot label. A member portrait represents the
  // reward source, never a particular dropped base, mod or market price.
  if (!identity && isJanus(name)) return JANUS_PORTRAIT;
  return artwork(name);
}
// These are bounded setup enum translations, not fuzzy item matching.
const chisels: Record<string, string> = {
  cartographer: "Cartographer's Chisel",
  avarice: "Maven's Chisel of Avarice",
  procurement: "Maven's Chisel of Procurement",
  proliferation: "Maven's Chisel of Proliferation",
  scarabs: "Maven's Chisel of Scarabs",
  divination: "Maven's Chisel of Divination",
};
const delirium: Record<string, string> = Object.fromEntries(
  [
    'Fine',
    'Skittering',
    "Diviner's",
    "Armoursmith's",
    "Blacksmith's",
    'Blighted',
    "Cartographer's",
    'Fragmented',
    "Jeweller's",
    'Singular',
    "Thaumaturge's",
    'Whispering',
  ].map((name) => [name.toLowerCase(), `${name} Delirium Orb`]),
);
export function setupItemName(
  kind: 'chisel' | 'delirium' | 'astrolabe',
  value: string | null,
): string | null {
  if (!value || value.toLowerCase() === 'none') return null;
  const key = value.trim().toLowerCase();
  if (kind === 'chisel' && chisels[key]) return chisels[key];
  if (kind === 'delirium' && delirium[key]) return delirium[key];
  if (kind === 'astrolabe') {
    // Exact manifest identities, including the historical renamed identity.
    const names = [
      'Templar',
      'Chaotic',
      'Enshrouded',
      'Deceptive',
      'Fruiting',
      'Fungal',
      'Grasping',
      'Lightless',
      'Nameless',
      'Runic',
      'Timeless',
    ];
    const exact = names.find(
      (name) => `${name.toLowerCase()} astrolabe` === key,
    );
    if (exact) return `${exact} Astrolabe`;
  }
  // Complete authored names stay unchanged. Unknown enum values remain visible.
  return value;
}
// Stable representatives verified against their exact source family (see tests).
// League/Other intentionally remain distinct non-item glyphs.
export const categoryRepresentatives: Record<string, string> = {
  Beasts: 'Craicic Croaker',
  Deliriums: 'Fine Delirium Orb',
  Currency: 'Divine Orb',
  Scarabs: 'Scarab of Adversaries',
  Fragments: 'Sacrifice at Dusk',
  'Divination Cards': 'The Fortunate',
  'Divination cards': 'The Fortunate',
  Essences: 'Deafening Essence of Greed',
  Oils: 'Golden Oil',
  Fossils: 'Jagged Fossil',
  Resonators: 'Primitive Chaotic Resonator',
  Gems: 'Empower Support',
  Maps: 'Map (Tier 16)',
  'Unique Armour': 'Goldrim',
  'Unique Armours': 'Goldrim',
  'Unique Weapons': 'Last Resort',
  'Unique Flasks': "Atziri's Promise",
  'Unique Accessories': 'Blackheart',
  'Unique Jewels': 'Spreading Rot',
};
