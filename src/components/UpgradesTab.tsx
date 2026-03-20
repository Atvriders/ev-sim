import type { GameState, Action } from '../game/types';
import { UPGRADES } from '../game/upgrades';
import { computeUpgradeStats } from '../game/physics';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
}

function pct(val: number): string {
  return `${(val * 100).toFixed(0)}%`;
}

// ── Category definitions ────────────────────────────────────────────────────

const CATEGORIES: { label: string; ids: string[] }[] = [
  {
    label: 'Efficiency',
    ids: ['aero_kit', 'lightweight_wheels', 'thermal_mgmt', 'eco_chip', 'heat_pump', 'performance_tires', 'smart_glass', 'carbon_fiber'],
  },
  {
    label: 'Regen',
    ids: ['regen_boost', 'sport_tune', 'dual_motor', 'regen_suspension'],
  },
  {
    label: 'Battery',
    ids: ['battery_plus'],
  },
  {
    label: 'Charging',
    ids: ['solar_roof', 'perf_inverter', 'v2g'],
  },
  {
    label: 'Automation',
    ids: ['autopilot', 'adaptive_cruise', 'route_planner'],
  },
  {
    label: 'Protection',
    ids: ['radar_detector'],
  },
];

// ── Bonus tag helpers ────────────────────────────────────────────────────────

function EffectLine({ upg }: { upg: (typeof UPGRADES)[number] }) {
  const lines: string[] = [];

  if (upg.efficiencyBonus > 0)   lines.push(`−${pct(upg.efficiencyBonus)} consumption`);
  if (upg.efficiencyBonus < 0)   lines.push(`+${pct(-upg.efficiencyBonus)} consumption`);
  if (upg.regenBonus > 0)        lines.push(`+${pct(upg.regenBonus)} regen`);
  if (upg.batteryBonus > 0)      lines.push(`+${upg.batteryBonus} kWh capacity`);
  if (upg.freeKw > 0)            lines.push(`+${upg.freeKw} kW free charge`);
  if (upg.chargeRateBonus > 0)   lines.push(`+${upg.chargeRateBonus} kW DCFC rate`);
  if (upg.fineMultiplier < 1)    lines.push(`−${Math.round((1 - upg.fineMultiplier) * 100)}% speeding fines`);
  if (upg.v2gReturn > 0)         lines.push(`${pct(upg.v2gReturn)} charge cost returned`);

  if (lines.length === 0) return null;

  return (
    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
      {lines.map(line => {
        const isNegative = line.startsWith('+') && line.includes('consumption');
        const color = isNegative ? '#f85149' : '#3fb950';
        return (
          <span
            key={line}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color,
              background: isNegative ? 'rgba(248,81,73,0.12)' : 'rgba(63,185,80,0.12)',
              border: `1px solid ${isNegative ? 'rgba(248,81,73,0.3)' : 'rgba(63,185,80,0.3)'}`,
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            {line}
          </span>
        );
      })}
    </div>
  );
}

// ── Category section ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { border: string; header: string }> = {
  Efficiency: { border: '#238636', header: '#3fb950' },
  Regen:      { border: '#1f6feb', header: '#58a6ff' },
  Battery:    { border: '#8957e5', header: '#bc8cff' },
  Charging:   { border: '#db6d28', header: '#f0883e' },
  Automation: { border: '#388bfd', header: '#79c0ff' },
  Protection: { border: '#6e4040', header: '#f85149' },
};

interface CategorySectionProps {
  label: string;
  ids: string[];
  state: GameState;
  dispatch: (a: Action) => void;
}

function CategorySection({ label, ids, state, dispatch }: CategorySectionProps) {
  const upgrades = UPGRADES.filter(u => ids.includes(u.id));
  const colors = CATEGORY_COLORS[label] ?? { border: '#30363d', header: '#8b949e' };
  const ownedInCategory = upgrades.filter(u => state.upgrades.includes(u.id)).length;

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        marginBottom: 16,
        overflow: 'hidden',
      }}
    >
      {/* Category header */}
      <div
        style={{
          background: `${colors.border}22`,
          borderBottom: `1px solid ${colors.border}`,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, color: colors.header }}>{label}</span>
        <span style={{ fontSize: 11, color: '#8b949e' }}>
          {ownedInCategory} / {upgrades.length} installed
        </span>
      </div>

      {/* Upgrade cards in a grid inside the category */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 12,
          padding: 12,
        }}
      >
        {upgrades.map(upg => {
          const owned  = state.upgrades.includes(upg.id);
          const canBuy = !owned && state.credits >= upg.price;

          return (
            <div
              key={upg.id}
              style={{
                background: owned ? 'rgba(63,185,80,0.06)' : '#161b22',
                border: owned ? '1px solid rgba(63,185,80,0.4)' : '1px solid #30363d',
                borderRadius: 6,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {/* Name + price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: owned ? '#3fb950' : '#e6edf3' }}>
                  {owned && '✓ '}{upg.name}
                </span>
                <span style={{ fontSize: 12, color: '#8b949e', whiteSpace: 'nowrap', marginLeft: 8 }}>
                  {upg.price.toLocaleString()} cr
                </span>
              </div>

              {/* Description */}
              <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.4 }}>{upg.desc}</div>

              {/* Bonus tags — always shown so player can see what they bought */}
              <EffectLine upg={upg} />

              {/* Buy button or installed state */}
              {!owned && (
                <div style={{ marginTop: 6 }}>
                  <button
                    className="btn-success"
                    style={{ fontSize: 12, padding: '5px 12px', width: '100%' }}
                    disabled={!canBuy}
                    onClick={() => dispatch({ type: 'BUY_UPGRADE', upgradeId: upg.id })}
                  >
                    {canBuy
                      ? 'Install'
                      : `Need ${(upg.price - state.credits).toLocaleString()} more cr`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UpgradesTab({ state, dispatch }: Props) {
  const { efficiencyMult, regenMult, batteryBonus, freeKw, chargeRateBonus, fineMultiplier, v2gReturn } =
    computeUpgradeStats(state.upgrades);

  const effPct        = Math.round((1 - efficiencyMult) * 100);
  const regenPct      = Math.round((regenMult - 1) * 100);
  const fineReduction = Math.round((1 - fineMultiplier) * 100);

  const totalInvestment = UPGRADES
    .filter(u => state.upgrades.includes(u.id))
    .reduce((sum, u) => sum + u.price, 0);

  const hasAnyEffect =
    effPct !== 0 || regenPct > 0 || batteryBonus > 0 || freeKw > 0 ||
    chargeRateBonus > 0 || fineReduction > 0 || v2gReturn > 0;

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <p className="section-title" style={{ margin: 0 }}>
          Upgrades — {state.upgrades.length} / {UPGRADES.length} installed
        </p>
        {totalInvestment > 0 && (
          <span style={{ fontSize: 12, color: '#8b949e' }}>
            Total invested: <strong style={{ color: '#e6edf3' }}>{totalInvestment.toLocaleString()} cr</strong>
          </span>
        )}
      </div>

      {/* Active effects banner */}
      {hasAnyEffect && (
        <div
          style={{
            background: '#0d1f38',
            border: '1px solid #1f6feb',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#58a6ff', marginBottom: 4 }}>Active Effects</div>
          <div style={{ fontSize: 12, color: '#e6edf3', display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
            {effPct > 0        && <span>⚡ {effPct}% more efficient</span>}
            {effPct < 0        && <span style={{ color: '#f85149' }}>⚠️ {Math.abs(effPct)}% less efficient</span>}
            {regenPct > 0      && <span>🔄 +{regenPct}% regen</span>}
            {batteryBonus > 0  && <span>🔋 +{batteryBonus} kWh battery</span>}
            {freeKw > 0        && <span>☀️ +{freeKw.toFixed(1)} kW free charge</span>}
            {chargeRateBonus > 0 && <span>⚡ +{chargeRateBonus} kW charge rate</span>}
            {fineReduction > 0 && <span>🚔 −{fineReduction}% speeding fines</span>}
            {v2gReturn > 0     && <span>🔌 {Math.round(v2gReturn * 100)}% charge cost returned</span>}
          </div>
        </div>
      )}

      {/* Grouped upgrade categories */}
      {CATEGORIES.map(cat => (
        <CategorySection
          key={cat.label}
          label={cat.label}
          ids={cat.ids}
          state={state}
          dispatch={dispatch}
        />
      ))}
    </div>
  );
}
