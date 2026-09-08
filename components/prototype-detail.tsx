import {
  recordedDivinePrice,
  displayedMod,
  displayedSetup,
  mapRequirementTiles,
  historicalCostRows,
  displayedCosts,
  relativeActivity,
} from '../lib/presentation';
import type { ReactNode } from 'react';
import { Copy, ExternalLink, Globe, History } from 'lucide-react';
import { AtlasTreeIcon } from './atlas-tree-icon';
import { Tags, ItemName, LootEvidence } from './strategy-detail';
import { useDisclosure } from '../lib/disclosures';
import { isSafeStrategyAtlasUrl } from '../lib/vendor/setup-code.js';
import {
  money,
  number,
  label,
  signedClass,
  type StrategyDetail,
  type EvidencePage,
} from '../lib/model';
import { setupItemName } from '../lib/artwork';
import { ObservedDelirium } from './observed-delirium';
import { SemanticIcon } from './semantic-icon';

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="wl-section">
      <div className="wl-section-head">
        <h2 className="wl-section-title">{title}</h2>
        {meta && <span className="wl-section-meta">{meta}</span>}
      </div>
      <div className="wl-section-body">{children}</div>
    </section>
  );
}
function Metric({
  title,
  value,
  sign,
}: {
  title: string;
  value: string;
  sign?: number | null;
}) {
  return (
    <div className="wl-metric">
      <span className="wl-metric-label">{title}</span>
      <strong className={`wl-metric-value wl-${signedClass(sign ?? null)}`}>
        {value}
      </strong>
    </div>
  );
}
export default function PrototypeDetail({
  strategy: s,
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
  const setup = displayedSetup(s, evidence);
  const e = s.economics,
    o = s.observed,
    a = setup.atlas;
  const totalReturn =
    e.historical_net_divines != null && e.historical_invest_divines != null
      ? e.historical_net_divines + e.historical_invest_divines
      : null;
  const date = s.updated_at || s.published_at;
  const price = recordedDivinePrice(s, evidence);
  const costs = displayedCosts(s, evidence);
  const costRows = historicalCostRows(s, evidence);
  const chisel = setupItemName('chisel', setup.chisel),
    astro = setupItemName('astrolabe', setup.astrolabe);
  const deli = setupItemName('delirium', setup.delirium?.type ?? null);
  return (
    <>
      <p className="wl-breadcrumb">
        <SemanticIcon name="public" size={24} fallback={<Globe size={14} />} /> Public strategy ·{' '}
        {s.league || 'League not recorded'} · Revision {number(s.revision, 0)}
      </p>
      <header className="wl-hero">
        <div>
          <Tags tags={s.tags} />
          <h1
            id="detail-title"
            tabIndex={-1}
            className={!fullTitle ? 'clamped-title' : undefined}
          >
            {s.title || 'Untitled strategy'}
          </h1>
          {(s.title?.length || 0) > 100 && (
            <button
              className="text-button"
              aria-expanded={fullTitle}
              onClick={() => setFullTitle(!fullTitle)}
            >
              {fullTitle ? 'Show shorter title' : 'Show full title'}
            </button>
          )}
          <p className="wl-byline">
            {number(s.coverage.run_count, 0)} contributed{' '}
            {s.coverage.run_count === 1 ? 'run' : 'runs'} ·{' '}
            {label(setup.map_type)} ·{' '}
            {setup.group_play === false
              ? 'Solo'
              : setup.group_play === true
                ? `Group (${number(setup.party_size, 0)} players)`
                : 'Party not recorded'}
          </p>
          <p className="wl-expiryline">
            <History size={16} aria-hidden="true" />
            <time
              dateTime={date || undefined}
              title={date || 'Date not recorded'}
            >
              {s.updated_at ? 'Updated' : 'Published'} {relativeActivity(date)}
            </time>{' '}
            · {number(o.map_count, 0)} maps
          </p>
        </div>
        <div className="wl-run-summary">
          <div className="wl-run-summary-line">
            <strong>
              {number(o.map_count, 0)} maps ·{' '}
              <span title={displayedMod(o.mod_average, setup.map_type).title}>
                {displayedMod(o.mod_average, setup.map_type).value} mod
              </span>
            </strong>
          </div>
          <div className="wl-run-summary-line">
            Recorded time{' '}
            <strong>
              {number(
                s.coverage.timed_minutes == null
                  ? null
                  : s.coverage.timed_minutes / 60,
              )}
              h
            </strong>{' '}
            · Div/hr{' '}
            <strong className="wl-run-accent">
              {number(s.coverage.net_divines_per_hour)}
            </strong>
          </div>
          <div className="wl-run-summary-line">
            Timed sample{' '}
            <strong>
              {number(s.coverage.timed_run_count, 0)}{' '}
              {s.coverage.timed_run_count === 1 ? 'run' : 'runs'} /{' '}
              {number(s.coverage.timed_map_count, 0)} maps
            </strong>
          </div>
          <div className="wl-run-summary-line">
            Game data{' '}
            <strong>
              R{number(setup.game_data.revision, 0)} ·{' '}
              {setup.game_data.patch_version || 'Unrecorded'}
            </strong>{' '}
            · Atlas{' '}
            <strong>
              {number(a?.points, 0)} / {number(a?.points_max, 0)}
            </strong>
          </div>
          <div className="wl-run-summary-line">
            Author mult.{' '}
            <strong className="wl-run-accent">
              {o.multiplier_average == null
                ? 'Unrecorded'
                : `${number(o.multiplier_average, 3)}×`}
            </strong>
            {price != null && (
              <>
                {' '}
                · Divine <strong>{number(price)}c</strong>
              </>
            )}
          </div>
          <div className="wl-run-summary-line">
            Read-only score <strong>{number(s.score, 0)}</strong>
          </div>
        </div>
      </header>
      <div className="wl-metrics">
        <Metric
          title="Net profit"
          value={money(e.historical_net_divines, 'd')}
          sign={e.historical_net_divines}
        />
        <Metric
          title="Total investment"
          value={money(e.historical_invest_divines, 'd')}
        />
        <Metric
          title="Profit / map"
          value={money(e.net_per_map_divines, 'd')}
          sign={e.net_per_map_divines}
        />
        <Metric title="Cost / map" value={money(e.all_in_cost_per_map_chaos)} />
      </div>
      <Section title="Loot breakdown" meta={price != null ? `Authored Divine price: ${number(price)}c` : 'Authored historical values'}>
        <LootEvidence
          loot={s.loot}
          divinePrice={price}
          priceInHeader
          returnValue={
            totalReturn == null ? undefined : money(totalReturn, 'd')
          }
        />
      </Section>
      <Section title="Strategy setup" meta="Authored values">
        <div className="wl-setup-columns">
          <div className="wl-setup-pane">
            <span className="wl-field-label">Scarabs and map setup</span>
            {setup.scarabs.map((item, i) => (
              <div className={`wl-setup-line${i === setup.scarabs.length - 1 && (chisel || deli || astro) ? ' setup-scarabs-end' : ''}`} key={i}>
                <ItemName name={typeof item === 'string' ? item : item.name} />
                {typeof item !== 'string' && (
                  <strong>{money(item.price_each_chaos)}</strong>
                )}
              </div>
            ))}
            {(chisel || deli || astro) && <div className="setup-additional-items">
            {chisel && (
              <div className="wl-setup-line">
                <ItemName name={chisel} />
                {costs?.chisel && (
                  <strong>{money(costs.chisel.price_each_chaos)}</strong>
                )}
              </div>
            )}
            {deli && (
              <div className="wl-setup-line">
                <ItemName name={deli} />
                <strong>{number(setup.delirium?.count_per_map)} / map
                  {costs?.delirium && <> · {money(costs.delirium.price_each_chaos)} each</>}
                </strong>
              </div>
            )}
            {astro && (
              <div className="wl-setup-line">
                <ItemName name={astro} />
                {costs?.astrolabe && (
                  <strong>
                    {number(costs.astrolabe.count)} ×{' '}
                    {money(costs.astrolabe.price_each_chaos)} each
                  </strong>
                )}
              </div>
            )}
            </div>}
            {!setup.scarabs.length && !chisel && !astro && !deli && (
              <p className="wl-note">No item setup recorded.</p>
            )}
            {setup.chisel?.toLowerCase() === 'none' && (
              <p className="wl-item-metadata">No chisel</p>
            )}
          </div>
          <div className="wl-setup-pane">
            <span className="wl-field-label">Cost breakdown / map</span>
            {costRows.length ? (
              costRows.map((row) => (
                <div className="wl-setup-line" key={row.name}>
                  <span>{row.name}</span>
                  <strong>{money(row.value)}</strong>
                </div>
              ))
            ) : (
              <div className="wl-setup-line">
                <span>Recorded recurring costs</span>
                <strong>{money(e.recurring_cost_per_map_chaos)}</strong>
              </div>
            )}
            <div className="wl-setup-line">
              <span>All-in</span>
              <strong>{money(e.all_in_cost_per_map_chaos)}</strong>
            </div>
            <p className="footnote">
              Historical prices. Base map and rolling costs remain combined.
            </p>
          </div>
          <div className="wl-setup-pane">
            <span className="wl-field-label">Map requirements</span>
            <ObservedDelirium strategy={s} evidence={evidence} />
            <div className="wl-requirements">
              {mapRequirementTiles(o).map(([title, value]) => (
                <div className="wl-requirement" key={String(title)}>
                  <span>{title}</span>
                  <strong>
                    {value == null ? '—' : `${number(value as number)}%`}
                  </strong>
                </div>
              ))}
            </div>
            <div className="wl-atlas-row">
              <span className="wl-atlas-summary">
                <AtlasTreeIcon className="wl-atlas-icon" />
                <span className="wl-atlas-copy">
                  <span className="wl-atlas-label">Atlas tree</span>
                  <span className="wl-atlas-points">
                    {number(a?.points, 0)} / {number(a?.points_max, 0)} points
                  </span>
                </span>
              </span>
              {a?.url && isSafeStrategyAtlasUrl(a.url) && (
                <a
                  className="wl-action wl-atlas-button"
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Atlas Tree <ExternalLink size={13} />
                </a>
              )}
            </div>
            {!(a?.url && isSafeStrategyAtlasUrl(a.url)) && (
              <p className="footnote">No supported Atlas Tree link recorded.</p>
            )}
          </div>
        </div>
      </Section>
      <Section title="Map regex">
        {[
          ['Run', setup.run_regex],
          ['Slam', setup.slam_regex],
        ]
          .filter(([name, text]) => name === 'Run' || !!text)
          .map(([name, text]) => (
            <div className="wl-regex" key={name}>
              <span className="wl-regex-label">{name}</span>
              <code>{text || 'Not recorded'}</code>
              {text && (
                <button
                  className="wl-icon-action"
                  aria-label={`Copy ${name} regex`}
                  disabled={copyBusy}
                  onClick={() => onCopy(text)}
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
          ))}
      </Section>
      <Section title="Author notes">
        <p className="wl-note">{s.notes || 'No notes were recorded.'}</p>
      </Section>
    </>
  );
}
