// Operator-only catalogue refresh. Does not run in the browser and never stores prices.
import fs from 'node:fs/promises';
const families = {
  exchange: [
    'Currency',
    'Fragment',
    'Scarab',
    'Essence',
    'Oil',
    'DeliriumOrb',
    'Omen',
    'Tattoo',
    'Artifact',
    'DivinationCard',
    'DjinnCoin',
    'AllflameEmber',
    'Runegraft',
    'Resonator',
    'Fossil',
    'Astrolabe',
    'Ducat',
    'EnshroudingCrystal',
  ],
  stash: [
    'Map',
    'UniqueWeapon',
    'UniqueArmour',
    'UniqueAccessory',
    'UniqueFlask',
    'UniqueJewel',
    'UniqueMap',
    'BlightedMap',
    'BlightRavagedMap',
    'ValdoMap',
    'SkillGem',
    'ImbuedGem',
    'Beast',
    'ClusterJewel',
    'Invitation',
    'Incubator',
    'Wombgift',
    'Vial',
    'BaseType',
    'IncursionTemple',
    'UniqueRelic',
    'UniqueTincture',
    'Flask',
  ],
};
const catalog = {},
  sources = {};
const cardIcon =
  'https://web.poecdn.com/image/Art/2DItems/Divination/InventoryIcon.png';
const jobs = ['Allflame', 'Standard'].flatMap((league) =>
  Object.entries(families).flatMap(([family, types]) =>
    types.map((type) => ({ league, family, type })),
  ),
);
const results = Array.from({ length: jobs.length });
let next = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const i = next++,
        j = jobs[i];
      const path =
        j.family === 'exchange'
          ? 'exchange/current/overview'
          : 'stash/current/item/overview';
      const url = `https://poe.ninja/poe1/api/economy/${path}?league=${encodeURIComponent(j.league)}&type=${j.type}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(25000),
        headers: { 'User-Agent': 'WraeclastLedger-Artwork-Validation/1.0' },
      });
      if (!response.ok)
        throw Error(`${j.league}/${j.type}: HTTP ${response.status}`);
      const data = await response.json();
      results[i] = (j.family === 'exchange' ? data.items : data.lines).map(
        (item) => ({
          name: item.name,
          icon:
            j.type === 'DivinationCard'
              ? cardIcon
              : item.image?.startsWith('/')
                ? 'https://web.poecdn.com' + item.image
                : item.icon,
          id: item.id,
        }),
      );
    }
  }),
);
for (let i = 0; i < jobs.length; i++) {
  const j = jobs[i];
  for (const item of results[i]) {
    if (typeof item.name !== 'string' || typeof item.icon !== 'string')
      continue;
    const url = new URL(item.icon);
    if (url.protocol !== 'https:' || url.hostname !== 'web.poecdn.com')
      continue;
    const key = item.name.trim().toLowerCase();
    if (!Object.hasOwn(catalog, key)) {
      catalog[key] = url.href;
      sources[key] = { league: j.league, family: j.family, type: j.type };
    }
  }
}
const sorted = Object.fromEntries(
  Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b)),
);
await fs.writeFile(
  new URL('../lib/artwork-catalogue.json', import.meta.url),
  JSON.stringify(sorted, null, 2) + '\n',
);
await fs.writeFile(
  new URL('../lib/artwork-sources.json', import.meta.url),
  JSON.stringify({ updated: new Date().toISOString(), sources }, null, 2) +
    '\n',
);
await fs.writeFile(
  new URL('../lib/artwork-gem-names.json', import.meta.url),
  JSON.stringify(Object.keys(sorted).filter((name) =>
    ['SkillGem', 'ImbuedGem'].includes(sources[name].type)), null, 2) + '\n',
);
await fs.writeFile(
  new URL('../lib/artwork-equipment-names.json', import.meta.url),
  JSON.stringify({
    linkable: Object.keys(sorted).filter((name) =>
      ['UniqueWeapon', 'UniqueArmour', 'BaseType'].includes(sources[name].type)),
    uniques: Object.keys(sorted).filter((name) => sources[name].type.startsWith('Unique')),
  }, null, 2) + '\n',
);
console.log(
  `Verified exact artwork for ${Object.keys(catalog).length} names from ${jobs.length} bounded source catalogues.`,
);
