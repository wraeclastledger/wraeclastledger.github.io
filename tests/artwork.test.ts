import { describe, expect, it } from 'vitest';
import {
  artwork,
  lootArtwork,
  setupItemName,
  categoryRepresentatives,
} from '../lib/artwork';
import catalogue from '../lib/artwork-catalogue.json';
import provenance from '../lib/artwork-sources.json';
import gemNames from '../lib/artwork-gem-names.json';
import equipmentNames from '../lib/artwork-equipment-names.json';

describe('verified public artwork', () => {
  it('honors structured Syndicate and quality bases over the free-text label', () => {
    expect(lootArtwork('janus', { kind: 'syndicate-reward', base: 'Giantslayer Helmet' }))
      .toBe(artwork('Giantslayer Helmet'));
    expect(lootArtwork('Goldrim', { kind: 'quality-base', base: 'Divine Crown' }))
      .toBe(artwork('Divine Crown'));
    expect(lootArtwork('Goldrim', { kind: 'syndicate-reward' })).toBeNull();
    expect(lootArtwork('Janus', { kind: 'syndicate-reward', base: 'Invented Helmet' })).toBeNull();
    expect(lootArtwork('Custom chart', { kind: 'chart', chart: 'Coral Reef Chart' }))
      .toBe(artwork('Coral Reef Chart'));
    expect(lootArtwork('janus')).toBe('/icons/portraits/janus.webp');
    expect(lootArtwork('Custom reward', { kind: 'syndicate-reward', member: 'Janus Perandus' }))
      .toBe('/icons/portraits/janus.webp');
    expect(lootArtwork('janus mystery')).toBeNull();
    expect(artwork('janus')).toBeNull(); // Not an item catalogue entry.
  });
  it('keeps ambiguous category-like names as neutral fallbacks', () => {
    for (const name of ['ES Helmet (Quality Base)', 'Quality items', 'Talismans', 'Chimeric Croaker Talisman']) {
      expect(lootArtwork(name)).toBeNull();
    }
  });
  it('uses exact base artwork for explicitly influenced bases without guessing equipment identities', () => {
    expect(artwork('Elder Giantslayer Helmet')).toBe(artwork('Giantslayer Helmet'));
    expect(artwork('Shaper Divine Crown')).toBe(artwork('Divine Crown'));
    expect(artwork('Elder Chaos Orb')).toBeNull();
    expect(artwork('Elder Goldrim')).toBeNull();
    expect(artwork('Elder ES Helmet')).toBeNull();
    expect(artwork('Elder Giantslayer Helmet mystery')).toBeNull();
    expect(artwork('Chimeric Croaker Talisman')).toBeNull();
  });
  it('shares desktop exact punctuation, link and variant-name handling without prefix guessing', () => {
    expect(artwork('kaoms heart')).toBe(artwork("Kaom's Heart"));
    expect(artwork('Blunderbore 6L')).toBe(artwork('Blunderbore'));
    expect(artwork('Focal Point, Forbidden Flame')).toBe(artwork('Forbidden Flame'));
    expect(artwork('Doryani, Forbidden Flesh')).toBe(artwork('Forbidden Flesh'));
    expect(artwork('Chaos Orb 6L')).toBeNull();
    expect(artwork('Mystery, Chaos Orb')).toBeNull();
    expect(artwork('Forbidden Flame unknown')).toBeNull();
    expect(artwork('Blunderbore 7L')).toBeNull();
    for (const name of equipmentNames.linkable) {
      expect(['UniqueWeapon', 'UniqueArmour', 'BaseType']).toContain(provenance.sources[name as keyof typeof provenance.sources].type);
    }
    for (const name of equipmentNames.uniques) {
      expect(provenance.sources[name as keyof typeof provenance.sources].type).toMatch(/^Unique/);
    }
  });
  it('resolves decorated gems only against exact source-verified gem identities', () => {
    expect(artwork('Hextouch Support - 1/23 corrupted')).toBe(artwork('Hextouch Support'));
    expect(artwork('Hextouch Support - 20/20')).toBe(artwork('Hextouch Support'));
    expect(artwork('Awakened Hextouch Support - 1/23 corrupted')).toBe(artwork('Awakened Hextouch Support'));
    expect(artwork('Hextouch Support - 1/23 mystery')).toBeNull();
    expect(artwork('Invented Support - 1/23 corrupted')).toBeNull();
    expect(artwork('Goldrim - 1/23 corrupted')).toBeNull();
    expect(gemNames.slice().sort()).toEqual(Object.entries(provenance.sources)
      .filter(([, source]) => ['SkillGem', 'ImbuedGem'].includes(source.type))
      .map(([name]) => name).sort());
  });
  it('covers the missing live item families without using prices or fuzzy matches', () => {
    for (const name of [
      'Trarthan Scarab of Infamy',
      'Empower Support',
      'The Fortunate',
      'Craicic Croaker',
      'Divine Crown',
      'Paladin Gloves',
      'Sacred Chainmail',
      'Goldrim',
      'Templar Astrolabe',
    ])
      expect(artwork(name), name).toMatch(/^https:\/\/web\.poecdn\.com\//);
    expect(artwork("Malachi's Mark gloves")).toBe(artwork("Malachai's Mark"));
    expect(artwork('Malachai gloves')).toBe(artwork("Malachai's Mark"));
    expect(artwork('Malachi gloves')).toBeNull();
    expect(artwork('Quality items')).toBeNull();
    expect(artwork('Not a real Trarthan Scarab')).toBeNull();
    expect(artwork('https://example.com/image.png')).toBeNull();
  });
  it('retains only official HTTPS image URLs in the exported catalogue', () => {
    for (const url of Object.values(catalogue)) {
      const parsed = new URL(url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname).toBe('web.poecdn.com');
    }
  });
  it('uses each representative only from its verified source family', () => {
    const families: Record<string, string> = {
      Currency: 'Currency',
      Scarabs: 'Scarab',
      Fragments: 'Fragment',
      'Divination Cards': 'DivinationCard',
      'Divination cards': 'DivinationCard',
      Essences: 'Essence',
      Oils: 'Oil',
      Fossils: 'Fossil',
      Resonators: 'Resonator',
      Gems: 'SkillGem',
      Maps: 'Map',
      Beasts: 'Beast',
      Deliriums: 'DeliriumOrb',
      'Unique Armour': 'UniqueArmour',
      'Unique Armours': 'UniqueArmour',
      'Unique Weapons': 'UniqueWeapon',
      'Unique Flasks': 'UniqueFlask',
      'Unique Accessories': 'UniqueAccessory',
      'Unique Jewels': 'UniqueJewel',
    };
    for (const [category, name] of Object.entries(categoryRepresentatives)) {
      const source =
        provenance.sources[
          name.toLowerCase() as keyof typeof provenance.sources
        ];
      expect(source?.type, category).toBe(families[category]);
      expect(artwork(name), category).not.toBeNull();
    }
    expect(categoryRepresentatives.Other).toBeUndefined();
    expect(categoryRepresentatives.League).toBeUndefined();
  });
  it('uses the established generic Blueprint and exact Chart rules', () => {
    expect(artwork('Blueprint (Currency)')).toContain(
      '/BlueprintNotApproved7.png',
    );
    expect(artwork('Blueprint 4/4')).toBe(artwork('Blueprints'));
    expect(artwork('blueprintish item')).toBeNull();
    expect(artwork("Chart (Kishara's Rest)")).toContain(
      '/DeepwaterTornMap1.png',
    );
    expect(artwork('Coral Forest Chart')).toContain('/DeepwaterTornMap2.png');
    expect(artwork('Coral Reef Chart')).toContain('/DeepwaterTornMap3.png');
    expect(artwork('Chart (Invented place)')).toBeNull();
  });
  it('translates only known setup enums and preserves unknown authored names', () => {
    expect(setupItemName('chisel', 'Avarice')).toBe(
      "Maven's Chisel of Avarice",
    );
    expect(setupItemName('delirium', 'fine')).toBe('Fine Delirium Orb');
    expect(setupItemName('chisel', 'None')).toBeNull();
    expect(setupItemName('chisel', 'Avarice mystery')).toBe('Avarice mystery');
  });
});
