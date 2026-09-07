import {
  recordedDivinePrice,
  displayedSetup,
  displayedCosts,
  historicalCostRows,
  mapRequirementTiles,
} from '../lib/presentation';
import {
  artwork,
  lootArtwork,
  JANUS_PORTRAIT,
  setupItemName,
  categoryRepresentatives,
} from '../lib/artwork';

import { Table } from './ui/table';
import { ObservedDelirium } from './observed-delirium';
import { SemanticIcon } from './semantic-icon';

import { useState } from 'react';

import { useDisclosure } from '../lib/disclosures';

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

import {
  ExternalLink,
  Copy,
  PackageOpen,
  Coins,
  Ticket,
  Shapes,
  Bug,
  Puzzle,
  Boxes,
  Shield,
  Swords,
  FlaskConical,
  Gem,
  Diamond,
  ChevronRight,
} from 'lucide-react';

import { isSafeStrategyAtlasUrl } from '../lib/vendor/setup-code.js';

import {
  label,
  money,
  number,
  signedClass,
  type StrategyDetail,
  type EvidencePage,
  type EvidenceRun,
  type Loot,
  type Setup,
} from '../lib/model';

export function Tags({
  tags,

  compact = false,

  title = 'Strategy',
}: {
  tags: string[];

  compact?: boolean;

  title?: string;
}) {
  const visible = compact ? tags.slice(0, 5) : tags;

  return (
    <span className={`tags${compact ? ' tags-compact' : ''}`}>
      {visible.map((tag) => (
        <span key={tag} className="tag" title={label(tag)}>
          {label(tag)}
        </span>
      ))}

      {compact && tags.length > 5 && (
        <Dialog>
          <DialogTrigger
            className="tags-more"

            aria-label={`Show all ${tags.length} tags for ${title}`}
          >
            +{tags.length - 5} more
          </DialogTrigger>

          <DialogContent className="manual-dialog tag-dialog">
            <DialogTitle>All strategy tags</DialogTitle>

            <DialogDescription>{title}</DialogDescription>

            <Tags tags={tags} />
          </DialogContent>
        </Dialog>
      )}
    </span>
  );
}

export function Stat({
  title,

  value,

  className = '',

  note,
}: {
  title: string;

  value: string;

  className?: string;

  note?: string;
}) {
  return (
    <div className="stat">
      <span>{title}</span>

      <strong className={className}>{value}</strong>

      {note && <small>{note}</small>}
    </div>
  );
}

export function ItemName({
  name,
  identity,
}: {
  name: string;
  identity?: { kind: string; base?: string | null; chart?: string | null; member?: string } | null;
}) {
  const url = lootArtwork(name, identity);

  const [failed, setFailed] = useState<string | null>(null);

  return (
    <span className="item-name">
      {url && failed !== url ? (
        <img
          src={url}

          width="28"

          height="28"

          loading="lazy"

          referrerPolicy="no-referrer"

          alt=""
          title={url === JANUS_PORTRAIT ? 'Janus Perandus — Syndicate reward source' : undefined}

          onError={() => setFailed(url)}
        />
      ) : (
        <span className="item-artwork-fallback" title="No verified artwork for this item identity">
          <PackageOpen size={18} aria-label="No verified item artwork" />
        </span>
      )}

      <span>{name}</span>
    </span>
  );
}

function SetupItems({
  setup,
  costs,
}: {
  setup: Setup;
  costs?: EvidenceRun['cost_breakdown'];
}) {
  return (
    <>
      <div className="setup-line">
        <span>Map setup</span>

        <strong>{setup.map_type || 'Not recorded'}</strong>
      </div>

      <div className="setup-line">
        <span>Party</span>

        <strong>
          {setup.group_play === false
            ? 'Solo'
            : setup.group_play === true
              ? `Group · ${number(setup.party_size, 0)} players`
              : 'Not recorded'}
        </strong>
      </div>

      {setup.scarabs.map((s, i) => {
        const name = typeof s === 'string' ? s : s.name;

        return (
          <div className={`setup-line${i === setup.scarabs.length - 1 ? ' setup-scarabs-end' : ''}`} key={i}>
            <ItemName name={name} />

            {typeof s !== 'string' && (
              <strong>{money(s.price_each_chaos)}</strong>
            )}
          </div>
        );
      })}

      {!setup.scarabs.length && (
        <p className="muted">No scarab setup recorded.</p>
      )}
      <div className="setup-additional-items">
      <div className="setup-line">
        <span>Chisel</span>

        <strong>
          {setupItemName('chisel', setup.chisel) ? (
            <ItemName name={setupItemName('chisel', setup.chisel)!} />
          ) : (
            label(setup.chisel)
          )}
        </strong>
        {costs?.chisel && <span>{money(costs.chisel.price_each_chaos)}</span>}
      </div>

      {setup.delirium && (
        <div className="setup-line">
          <span>Configured Delirium Orbs</span>

          <strong>
            <ItemName
              name={
                setupItemName('delirium', setup.delirium.type) || 'Not recorded'
              }
            />{' '}
            · {number(setup.delirium.count_per_map)} / map
            {costs?.delirium && (
              <> · {money(costs.delirium.price_each_chaos)} each</>
            )}
          </strong>
        </div>
      )}

      {setup.astrolabe && (
        <div className="setup-line">
          <span>Astrolabe</span>

          <strong>
            <ItemName name={setupItemName('astrolabe', setup.astrolabe)!} />
            {costs?.astrolabe && (
              <>
                {' '}
                · {number(costs.astrolabe.count)} ×{' '}
                {money(costs.astrolabe.price_each_chaos)} each
              </>
            )}
          </strong>
        </div>
      )}
      </div>
    </>
  );
}

function CategoryArtwork({
  category,
  fallback,
}: {
  category: string;
  fallback: React.ReactNode;
}) {
  const url = artwork(categoryRepresentatives[category] || '');
  const [failed, setFailed] = useState<string | null>(null);
  if (category === 'League' || category === 'Other') {
    return <SemanticIcon name={category === 'League' ? 'loot_league' : 'loot_other'} size={32} fallback={fallback} />;
  }
  return url && failed !== url ? (
    <img
      src={url}
      alt=""
      width="25"
      height="25"
      loading="lazy"
      referrerPolicy="no-referrer"
      style={{ objectFit: 'contain' }}
      onError={() => setFailed(url)}
    />
  ) : (
    fallback
  );
}

export function LootEvidence({
  loot,

  disclosureKey = 'pooled',

  returnValue,
  divinePrice = null,
  priceInHeader = false,
}: {
  loot: Loot | null;

  disclosureKey?: string;

  returnValue?: string;
  divinePrice?: number | null;
  priceInHeader?: boolean;
}) {
  const [expanded, setExpanded] = useDisclosure(disclosureKey);
  const [divines, setDivines] = useDisclosure(disclosureKey + '-divines');
  const rate =
    typeof divinePrice === 'number' &&
    Number.isFinite(divinePrice) &&
    divinePrice > 0
      ? divinePrice
      : null;
  const lootMoney = (value: number | null | undefined) =>
    divines && rate
      ? money(value == null ? value : value / rate, 'd')
      : money(value);

  const categoryTotal =
    loot?.categories.reduce((sum, c) => sum + c.value_chaos, 0) || 0;

  const proportions =
    Number.isFinite(categoryTotal) &&
    categoryTotal > 0 &&
    !!loot?.categories.every((c) => c.value_chaos >= 0);

  const categoryIcons = {
    Currency: Coins,
    'Divination Cards': Ticket,
    'Divination cards': Ticket,
    League: Shapes,
    Scarabs: Bug,
    Fragments: Puzzle,
    Other: Boxes,
    'Unique Armour': Shield,
    'Unique Armours': Shield,
    Beasts: Bug,
    Deliriums: Shapes,
    'Unique Weapons': Swords,
    'Unique Flasks': FlaskConical,
    'Unique Accessories': Gem,
    'Unique Jewels': Diamond,
  };

  if (!loot)
    return (
      <p className="muted">
        No complete structured loot evidence is available.
      </p>
    );

  return (
    <div className="loot">
      <div className="loot-overview">
        <div>
          {returnValue && <small className="loot-return-label">Return</small>}
          <strong className="loot-total">
            {returnValue || 'Recorded loot'}
          </strong>
          <small>
            Historical authored values ·{' '}
            {loot.has_baseline
              ? 'Baseline and Return recorded'
              : 'No baseline recorded'}
          </small>
        </div>

        <div className="loot-tools">
          <div className="loot-units">
            <fieldset aria-label="Loot value unit">
              <button
                aria-pressed={!divines || !rate}
                onClick={() => setDivines(false)}
              >
                Chaos
              </button>
              <button
                aria-pressed={divines && !!rate}
                disabled={!rate}
                title={
                  rate
                    ? `Recorded Divine price: ${rate}c`
                    : 'A common recorded Divine price is unavailable. Individual runs use their own recorded price.'
                }
                onClick={() => setDivines(true)}
              >
                Divines
              </button>
            </fieldset>
            {(!priceInHeader || !rate) && <small>
              {rate
                ? `Authored Divine price: ${number(rate)}c`
                : 'No common recorded Divine price; inspect individual runs for their rates.'}
            </small>}
          </div>
          <div className="loot-badges">
            <span>{loot.rows.length} item rows</span>
            <span>Manual additions {lootMoney(loot.manual_total_chaos)}</span>
          </div>
        </div>
      </div>

      {proportions && (
        <div className="loot-bar" aria-hidden="true">
          {loot.categories.map((c, i) => (
            <span
              key={c.category}
              style={{
                width: `${(c.value_chaos / categoryTotal) * 100}%`,
                background: [
                  '#dc921f',
                  '#727b86',
                  '#279a77',
                  '#2693a0',
                  '#4e82cb',
                  '#8a5fba',
                ][i % 6],
              }}
            />
          ))}
        </div>
      )}

      <div className="category-grid">
        {loot.categories.map((c) => {
          const Icon =
            categoryIcons[c.category as keyof typeof categoryIcons] ||
            PackageOpen;

          return (
            <div key={c.category} className="loot-category">
              <span className="category-name" title={c.category}>
                {c.category === 'Unique Accessories'
                  ? 'Unique Jewellery'
                  : c.category}
              </span>
              <div className="category-core">
                <span className={`category-icon${c.category === 'League' || c.category === 'Other' ? ' semantic-category-icon' : ''}`}>
                  <CategoryArtwork
                    category={c.category}
                    fallback={<Icon size={17} />}
                  />
                </span>
                <div>
                  <strong className={signedClass(c.value_chaos)}>
                    {lootMoney(c.value_chaos)}
                  </strong>
                  <strong className="category-value-width" aria-hidden="true">
                    {money(c.value_chaos)}
                  </strong>
                  {rate && (
                    <strong className="category-value-width" aria-hidden="true">
                      {money(c.value_chaos / rate, 'd')}
                    </strong>
                  )}
                  {proportions && (
                    <small>
                      {number((c.value_chaos / categoryTotal) * 100)}%
                    </small>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="summary-line">
        <span>Recorded category total {lootMoney(categoryTotal)}</span>
        <span>Inventory flow {lootMoney(loot.inventory_flow_chaos)}</span>

        <span>
          Market revaluation {lootMoney(loot.market_revaluation_chaos)}
        </span>

        <span>Manual additions {lootMoney(loot.manual_total_chaos)}</span>
      </div>

      <button
        className="text-button"

        aria-expanded={expanded}

        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight
          size={14}
          style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
        />
        {expanded ? 'Hide' : 'Show'} item breakdown ({loot.rows.length} rows)
      </button>

      {expanded && (
        <div className="table-scroll">
          <Table className="loot-table">
            <caption className="sr-only">
              Contributed loot items and authored values
            </caption>

            <colgroup>
              <col style={{ width: '52%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Item</th>

                <th scope="col">Source</th>

                <th scope="col">Quantity</th>

                <th scope="col">Value</th>
              </tr>
            </thead>

            <tbody>
              {loot.rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <ItemName name={r.name} identity={r.identity} />

                    {r.identity?.memory_strands != null && (
                      <small>{r.identity.memory_strands} Memory Strands</small>
                    )}

                    {r.note && <small>{r.note}</small>}

                    {r.valuation && (
                      <small>
                        Revaluation proof:{' '}
                        {number(r.valuation.baseline_quantity)} →{' '}
                        {number(r.valuation.current_quantity)} items;{' '}
                        {lootMoney(r.valuation.baseline_value_chaos)} →{' '}
                        {lootMoney(r.valuation.current_value_chaos)}
                      </small>
                    )}
                  </td>

                  <td>{r.source === 'manual' ? 'Manual addition' : 'CSV'}</td>

                  <td>{number(r.quantity)}</td>

                  <td className={signedClass(r.value_chaos)}>
                    {lootMoney(r.value_chaos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <p className="footnote">
        Omitted CSV rows: {number(loot.omitted_csv_rows, 0)} (
        {lootMoney(loot.omitted_csv_value_chaos)}). Omitted manual rows:{' '}
        {number(loot.omitted_manual_rows, 0)} (
        {lootMoney(loot.omitted_manual_value_chaos)}).
      </p>
    </div>
  );
}

export function RunEvidence({ run }: { run: EvidenceRun }) {
  const e = run.economics;

  const [expanded, setExpanded] = useDisclosure(`run-${run.ordinal}`);

  return (
    <details
      className="run"

      open={expanded}

      onToggle={(event) => {
        if (event.currentTarget.open !== expanded)
          setExpanded(event.currentTarget.open);
      }}
    >
      <summary>
        Run {run.ordinal}
        <span>Contributed {run.contributed_on || 'date unavailable'}</span>
        <strong className={signedClass(e.net_profit_chaos)}>
          {money(e.net_profit_chaos)}
        </strong>
      </summary>

      <div className="run-body">
        <p className="footnote">
          Contribution date is the server acceptance date in UTC, not the date
          this run was played.
        </p>

        <div className="stats">
          <Stat title="Maps" value={number(run.observed.map_count, 0)} />

          <Stat title="Investment" value={money(e.total_invest_chaos)} />

          <Stat
            title="Net profit"

            value={money(e.net_profit_chaos)}

            className={signedClass(e.net_profit_chaos)}
          />

          <Stat title="Divine snapshot" value={money(e.divine_price_chaos)} />
        </div>

        <div className="detail-grid">
          <section className="section">
            <h3>Contributed setup</h3>

            <SetupItems setup={run.setup} />

            <p className="footnote">
              Game data {number(run.setup.game_data.revision, 0)} ·{' '}
              {run.setup.game_data.patch_version || 'patch not recorded'}
            </p>
          </section>

          <section className="section">
            <h3>Authored prices</h3>

            {run.cost_breakdown ? (
              <>
                {run.cost_breakdown.chisel && (
                  <div className="setup-line">
                    <span>{run.cost_breakdown.chisel.name}</span>

                    <strong>
                      {money(run.cost_breakdown.chisel.price_each_chaos)} each
                    </strong>
                  </div>
                )}

                {run.cost_breakdown.scarabs.map((s, i) => (
                  <div className="setup-line" key={i}>
                    <span>{s.name}</span>

                    <strong>{money(s.price_each_chaos)} each</strong>
                  </div>
                ))}

                {run.cost_breakdown.delirium && (
                  <p>
                    {run.cost_breakdown.delirium.type} Orb:{' '}
                    {money(run.cost_breakdown.delirium.price_each_chaos)} each ·{' '}
                    {run.cost_breakdown.delirium.count_per_map} / map
                  </p>
                )}

                {run.cost_breakdown.astrolabe && (
                  <p>
                    {run.cost_breakdown.astrolabe.type}:{' '}
                    {money(run.cost_breakdown.astrolabe.price_each_chaos)} each
                    · {run.cost_breakdown.astrolabe.count} used
                  </p>
                )}
              </>
            ) : (
              <p className="muted">
                Exact component prices were not recorded. They cannot be
                reconstructed from the total.
              </p>
            )}

            <p>Recurring cost / map: {money(e.recurring_cost_per_map_chaos)}</p>

            <p>Reported time: {number(run.timing.reported_minutes)} minutes</p>
          </section>
        </div>

        <LootEvidence
          divinePrice={run.economics.divine_price_chaos}
          loot={run.loot}
          disclosureKey={`loot-${run.ordinal}`}
        />
      </div>
    </details>
  );
}

export default function Detail({
  strategy,

  onCopy,

  copyBusy,
  evidence,
}: {
  strategy: StrategyDetail;

  onCopy: (text: string) => void;

  copyBusy: boolean;
  evidence?: EvidencePage | null;
}) {
  const [fullTitle, setFullTitle] = useDisclosure('title');

  const s = strategy;
  const setup = displayedSetup(s, evidence);

  const e = s.economics;

  const totalReturn =
    e.historical_net_divines != null && e.historical_invest_divines != null
      ? e.historical_net_divines + e.historical_invest_divines
      : null;

  const atlas = setup.atlas;

  const safeAtlas = atlas?.url && isSafeStrategyAtlasUrl(atlas.url);

  return (
    <>
      <p className="detail-breadcrumb">
        Public strategy · {s.league || 'League not recorded'} · Revision{' '}
        {number(s.revision, 0)}
      </p>

      <header className="detail-heading">
        <div>
          <Tags tags={s.tags} />

          <p className="eyebrow" hidden>
            {s.league || 'League not recorded'} · Revision{' '}
            {number(s.revision, 0)}
          </p>

          <h1
            id="detail-title"

            tabIndex={-1}

            className={!fullTitle ? 'clamped-title' : undefined}
          >
            {s.title || 'Untitled strategy'}
          </h1>

          {(s.title?.length || 0) > 100 && (
            <button
              className="text-button title-toggle"

              aria-expanded={fullTitle}

              onClick={() => setFullTitle(!fullTitle)}
            >
              {fullTitle ? 'Show shorter title' : 'Show full title'}
            </button>
          )}

          <p className="detail-byline">
            {number(s.coverage.run_count, 0)} contributed{' '}
            {s.coverage.run_count === 1 ? 'run' : 'runs'} ·{' '}
            {number(s.observed.map_count, 0)} maps
          </p>
        </div>

        <div className="detail-context">
          <span>
            Read-only Score <strong>{number(s.score, 0)}</strong>
          </span>

          <span>
            {number(s.coverage.run_count, 0)} contributed{' '}
            {s.coverage.run_count === 1 ? 'run' : 'runs'} ·{' '}
            {number(s.observed.map_count, 0)} maps
          </span>

          <time dateTime={s.updated_at || undefined}>
            Updated{' '}
            {s.updated_at
              ? new Date(s.updated_at).toLocaleDateString('en-GB', {
                  timeZone: 'UTC',
                })
              : 'date not recorded'}
          </time>
        </div>
      </header>

      <div className="stats">
        <Stat
          title="Net profit"

          value={money(e.historical_net_divines, 'd')}

          className={signedClass(e.historical_net_divines)}
        />

        <Stat
          title="Total investment"

          value={money(e.historical_invest_divines, 'd')}
        />

        <Stat
          title="Profit / map"

          value={money(e.net_per_map_divines, 'd')}

          className={signedClass(e.net_per_map_divines)}
        />

        <Stat title="Cost / map" value={money(e.all_in_cost_per_map_chaos)} />
      </div>

      <p className="footnote">
        Historical return {money(totalReturn, 'd')} (complete totals only).
        Authored prices are never replaced with current quotes. Timed coverage:{' '}
        {number(s.coverage.timed_run_count, 0)}{' '}
        {s.coverage.timed_run_count === 1 ? 'run' : 'runs'} /{' '}
        {number(s.coverage.timed_map_count, 0)} maps;{' '}
        {money(s.coverage.net_divines_per_hour, 'd')} / hour, author-reported.
      </p>

      <section className="section">
        <h2 className="loot-section-title">
          <span>Loot breakdown</span>
          {recordedDivinePrice(s, evidence) != null && (
            <small>Authored Divine price: {number(recordedDivinePrice(s, evidence))}c</small>
          )}
        </h2>

        <LootEvidence
          loot={s.loot}
          divinePrice={recordedDivinePrice(s, evidence)}
          priceInHeader
          returnValue={
            totalReturn == null ? undefined : money(totalReturn, 'd')
          }
        />
      </section>

      <section className="section">
        <h2>Strategy setup</h2>

        <div className="setup-grid">
          <section className="setup-pane">
            <h3>Scarabs and map setup</h3>

            <SetupItems setup={setup} costs={displayedCosts(s, evidence)} />
          </section>

          <section className="setup-pane">
            <h3>Cost / map</h3>

            {!historicalCostRows(s, evidence).length && (
              <div className="setup-line">
                <span>Recorded costs</span>
                <strong>{money(e.recurring_cost_per_map_chaos)}</strong>
              </div>
            )}
            {historicalCostRows(s, evidence).map((row) => (
              <div className="setup-line" key={row.name}>
                <span>{row.name}</span>
                <strong>{money(row.value)}</strong>
              </div>
            ))}

            <div className="setup-line">
              <span>All-in</span>

              <strong>{money(e.all_in_cost_per_map_chaos)}</strong>
            </div>

            <p className="footnote">
              Historical prices. Base map and rolling costs remain combined.
            </p>
          </section>

          <section className="setup-pane">
            <h3>Map requirements</h3>
            <ObservedDelirium strategy={s} evidence={evidence} />

            <div className="sample-grid">
              {mapRequirementTiles(s.observed).map(([name, value]) => (
                <Stat
                  key={String(name)}

                  title={String(name)}

                  value={
                    value == null
                      ? '—'
                      : `${number(value as number)}${name === 'Author multiplier' ? '×' : name === 'Mod' ? '' : '%'}`
                  }
                />
              ))}
            </div>

            <h3 className="atlas-heading">Atlas Tree</h3>

            <p>
              {number(atlas?.points, 0)} / {number(atlas?.points_max, 0)} points
              recorded
            </p>

            {safeAtlas ? (
              <a
                className="button"

                href={atlas!.url!}

                target="_blank"

                rel="noopener noreferrer"
              >
                Open Atlas Tree <ExternalLink size={15} />
              </a>
            ) : (
              <p className="muted">
                No supported Atlas Tree link was recorded.
              </p>
            )}
          </section>
        </div>
      </section>

      <section className="section">
        <h2>Map regex</h2>

        {[
          ['Run', setup.run_regex],

          ['Slam', setup.slam_regex],
        ]
          .filter(([name, text]) => name === 'Run' || !!text)
          .map(([name, text]) => (
            <div className="regex" key={name}>
              <span>{name}</span>

              {text ? (
                <>
                  <code>{text}</code>

                  <button
                    disabled={copyBusy}

                    onClick={() => onCopy(text)}

                    aria-label={`Copy ${name} regex`}
                  >
                    <Copy size={16} />
                  </button>
                </>
              ) : (
                <span className="muted">Not recorded</span>
              )}
            </div>
          ))}
      </section>

      <section className="section notes">
        <h2>Strategy notes</h2>

        <p>{s.notes || 'No notes were recorded.'}</p>
      </section>
    </>
  );
}
