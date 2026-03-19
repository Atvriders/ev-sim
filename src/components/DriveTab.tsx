import type { GameState, Action } from '../game/types';
import { getRoute } from '../game/routes';
import { getCar } from '../game/cars';
import { computeUpgradeStats } from '../game/physics';
import GameCanvas from './GameCanvas';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
}

function batteryColor(pct: number): string {
  if (pct > 0.50) return '#3fb950';
  if (pct > 0.20) return '#d29922';
  return '#f85149';
}

function kwClass(kw: number): string {
  if (kw > 0.5)  return 'kw-positive';
  if (kw < -0.5) return 'kw-regen';
  return 'kw-zero';
}

function fmtKw(kw: number): string {
  if (kw < -0.5) return `−${Math.abs(kw).toFixed(1)}`;
  return kw.toFixed(1);
}

const DCFC_MIN_KW = 50; // threshold to count as DC fast charger

function chargerTier(maxKw: number): { label: string; color: string } {
  if (maxKw < 3)  return { label: 'Level 1',  color: '#8b949e' };
  if (maxKw < 50) return { label: 'Level 2',  color: '#d29922' };
  return              { label: 'DC Fast',  color: '#58a6ff' };
}

/** Format hours as h m s string */
function fmtTime(hours: number): string {
  if (!isFinite(hours) || hours <= 0) return '—';
  const totalSec = Math.round(hours * 3600);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function DriveTab({ state, dispatch }: Props) {
  const car   = getCar(state.selectedCar);
  const route = state.currentRoute ? getRoute(state.currentRoute) : null;
  const { batteryBonus, chargeRateBonus, v2gReturn } = computeUpgradeStats(state.upgrades);
  const maxBat  = car.batteryKwh + batteryBonus;
  const batPct  = maxBat > 0 ? state.battery / maxBat : 0;
  const hasPlanner       = state.upgrades.includes('route_planner');
  const hasAutopilot     = state.upgrades.includes('autopilot');
  const hasAdaptiveCruise = state.upgrades.includes('adaptive_cruise');

  // Speed limit at current position
  const speedLimit = route
    ? route.terrain.reduce((lim, pt) => {
        if (pt.distanceMi <= state.positionMi) return pt.speedLimitMph;
        return lim;
      }, 65)
    : 65;

  // Estimated range
  const effMiKwh = car.efficiencyMiKwh;
  const estRange = (state.battery * effMiKwh).toFixed(0);

  // Next charger ahead (within 10 mi) for the inline banner.
  // With Route Planner, only show DC fast chargers in the banner (planner manages the route);
  // L1/L2 still appear in the Nearby Chargers list for manual use.
  const nextCharger = route
    ? route.chargers
        .filter(c =>
          c.positionMi > state.positionMi - 0.5 &&
          c.positionMi <= state.positionMi + 10 &&
          (!hasPlanner || c.maxKw >= DCFC_MIN_KW)
        )
        .sort((a, b) => a.positionMi - b.positionMi)[0] ?? null
    : null;

  // Nearby chargers (within 5 mi ahead) for the expanded list below
  const nearbyChargers = route
    ? route.chargers.filter(c =>
        c.positionMi >= state.positionMi - 0.5 &&
        c.positionMi <= state.positionMi + 5
      )
    : [];

  // Route planner: all remaining DC fast chargers ahead, with estimated arrival battery
  const plannerStops = (hasPlanner && route && state.driving)
    ? (() => {
        const dcChargers = route.chargers
          .filter(c => c.maxKw >= DCFC_MIN_KW && c.positionMi > state.positionMi)
          .sort((a, b) => a.positionMi - b.positionMi);

        // Walk through stops, tracking simulated battery level
        let simBat = state.battery;
        return dcChargers.map(c => {
          const dist     = c.positionMi - state.positionMi;
          const kwhNeed  = dist / effMiKwh;
          const arrBat   = simBat - kwhNeed;
          const arrPct   = arrBat / maxBat;
          const reachable = arrBat > maxBat * 0.05; // flag below 5%
          // Assume driver charges to 80% at each stop
          simBat = reachable ? Math.min(maxBat * 0.80, arrBat) : arrBat;
          const rate = Math.min(c.maxKw, car.maxChargeKw + chargeRateBonus);
          return { charger: c, dist, arrBat, arrPct, reachable, rate };
        });
      })()
    : null;

  return (
    <div className="drive-layout">
      {/* ── Canvas ── */}
      <GameCanvas state={state} />

      {/* ── HUD ── */}
      <div className="hud">
        <div className={`gauge ${state.isCharging ? 'kw-regen' : kwClass(state.currentKw)}`}>
          <div className="gauge-label">{state.isCharging ? 'Charging' : state.currentKw < -0.5 ? 'Regen' : 'Draw'}</div>
          <div className="gauge-value">{fmtKw(state.isCharging ? -state.chargeRateKw : state.currentKw)}</div>
          <div className="gauge-unit">kW</div>
        </div>

        <div className="gauge" style={{ position: 'relative' }}>
          <div className="gauge-label">Speed</div>
          <div
            className="gauge-value"
            style={{ color: state.speedMph > speedLimit + 2 ? '#f85149' : undefined }}
          >
            {state.speedMph.toFixed(0)}
          </div>
          <div className="gauge-unit">mph</div>
          {/* Speed limit sign */}
          <div style={{
            position: 'absolute', top: 4, right: 4,
            background: '#fff', border: '3px solid #111',
            borderRadius: 4, padding: '2px 6px', textAlign: 'center',
            lineHeight: 1.1, minWidth: 36,
            boxShadow: state.speedMph > speedLimit + 2
              ? '0 0 8px 2px #f85149' : '0 1px 4px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 7, fontWeight: 800, color: '#111', letterSpacing: '0.04em' }}>SPEED</div>
            <div style={{ fontSize: 7, fontWeight: 800, color: '#111', letterSpacing: '0.04em' }}>LIMIT</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#111', lineHeight: 1.05 }}>{speedLimit}</div>
          </div>
        </div>

        <div className="gauge">
          <div className="gauge-label">Est. Range</div>
          <div className="gauge-value">{estRange}</div>
          <div className="gauge-unit">miles</div>
        </div>

        <div className="gauge">
          <div className="gauge-label">Position</div>
          <div className="gauge-value">{state.positionMi.toFixed(1)}</div>
          <div className="gauge-unit">mi {route ? `/ ${route.distanceMi}` : ''}</div>
        </div>
      </div>

      {/* ── Battery ── */}
      <div className="battery-row">
        <div className="battery-header">
          <span className="battery-pct" style={{ color: batteryColor(batPct) }}>
            {(batPct * 100).toFixed(1)}%
          </span>
          <span className="battery-kwh">
            {state.battery.toFixed(1)} / {maxBat.toFixed(1)} kWh
          </span>
          {state.isCharging && (() => {
            const activeCharger = route?.chargers.find(c => c.id === state.chargingAtId);
            const tier = chargerTier(activeCharger?.maxKw ?? state.chargeRateKw);
            const kwhTo80  = Math.max(0, maxBat * 0.80 - state.battery);
            const kwhToFull = Math.max(0, maxBat - state.battery);
            const hTo80  = kwhTo80  / state.chargeRateKw;
            const hToFull = kwhToFull / state.chargeRateKw;
            return (
              <span style={{ color: '#3fb950', fontWeight: 700, fontSize: 12 }}>
                ⚡ <span style={{ color: tier.color }}>{tier.label}</span>
                {' · '}
                {activeCharger && activeCharger.maxKw !== state.chargeRateKw ? (
                  <span title="Charger max → Car limit (+ inverter) → Actual">
                    <span style={{ color: '#8b949e' }}>{activeCharger.maxKw.toFixed(0)} kW</span>
                    {' → '}
                    <span style={{ color: '#d29922' }}>{(car.maxChargeKw + chargeRateBonus).toFixed(0)} kW</span>
                    {' → '}
                    <span style={{ color: tier.color }}>{state.chargeRateKw.toFixed(1)} kW</span>
                  </span>
                ) : (
                  <span style={{ color: tier.color }}>{state.chargeRateKw.toFixed(1)} kW</span>
                )}
                {v2gReturn > 0 && (
                  <span style={{ color: '#58a6ff', marginLeft: 6, fontSize: 11 }}>
                    V2G {(v2gReturn * 100).toFixed(0)}% back
                  </span>
                )}
                {' · '}+80%: {fmtTime(hTo80)}
                {' · '}Full: {fmtTime(hToFull)}
              </span>
            );
          })()}
        </div>
        <div className="battery-bar-track">
          <div
            className="battery-bar-fill"
            style={{
              width: `${(batPct * 100).toFixed(1)}%`,
              background: batteryColor(batPct),
            }}
          />
        </div>
      </div>

      {/* ── Charger Banner (inline, always visible while driving) ── */}
      {state.driving && !state.isCharging && nextCharger && (() => {
        const dist     = nextCharger.positionMi - state.positionMi;
        const rate     = Math.min(nextCharger.maxKw, car.maxChargeKw + chargeRateBonus);
        const tier     = chargerTier(nextCharger.maxKw);
        const atCharger = Math.abs(dist) < 0.3;
        const isQueued  = state.queuedChargerId === nextCharger.id;
        const kwhTo80   = Math.max(0, maxBat * 0.80 - state.battery);
        const kwhToFull = Math.max(0, maxBat - state.battery);
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: atCharger ? '#0d2a1a' : '#161b22',
            border: `1px solid ${atCharger ? '#3fb950' : tier.color}`,
            borderRadius: 8, padding: '8px 12px',
          }}>
            <div style={{ fontSize: 20 }}>{atCharger ? '⚡' : isQueued ? '📍' : '🔌'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#e6edf3' }}>
                {nextCharger.name}
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: tier.color,
                  background: '#21262d', border: `1px solid ${tier.color}`,
                  borderRadius: 10, padding: '1px 6px' }}>{tier.label}</span>
              </div>
              <div style={{ fontSize: 11, color: '#8b949e' }}>
                <span title="Charger max">{nextCharger.maxKw.toFixed(0)} kW</span>
                {' → '}
                <span title="Car limit">{(car.maxChargeKw + chargeRateBonus).toFixed(0)} kW</span>
                {' = '}
                <strong style={{ color: tier.color }} title="Actual rate">{rate.toFixed(1)} kW</strong>
                {' · '}${nextCharger.pricePerKwh}/kWh
                {' · '}{atCharger ? 'Here now' : `${dist.toFixed(1)} mi ahead`}
                {' · '}+80%: {fmtTime(kwhTo80 / rate)} · Full: {fmtTime(kwhToFull / rate)}
              </div>
              {isQueued && (
                <div style={{ fontSize: 11, color: '#3fb950', fontWeight: 600 }}>
                  Will auto-charge on arrival
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {atCharger && (
                <button className="btn-success" style={{ fontSize: 12, padding: '4px 14px' }}
                  onClick={() => dispatch({ type: 'START_CHARGE', chargerId: nextCharger.id })}>
                  Charge
                </button>
              )}
              {!atCharger && !isQueued && (
                <button className="btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}
                  onClick={() => dispatch({ type: 'QUEUE_CHARGE', chargerId: nextCharger.id })}>
                  Queue
                </button>
              )}
              {isQueued && (
                <button className="btn-warn" style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => dispatch({ type: 'CANCEL_QUEUE_CHARGE' })}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Controls ── */}
      {state.driving && (
        <div className="controls">
          {/* Speed slider */}
          {!state.isCharging && (() => {
            const overLimit = state.targetSpeedMph > speedLimit + 5;
            const inTolerance = state.targetSpeedMph > speedLimit && state.targetSpeedMph <= speedLimit + 5;
            return (
              <div className="speed-control">
                <span className="speed-label" title={hasAdaptiveCruise ? 'Adaptive Cruise active' : undefined}
                  style={{ color: hasAdaptiveCruise ? '#58a6ff' : overLimit ? '#f85149' : inTolerance ? '#d29922' : undefined }}>
                  {hasAdaptiveCruise ? 'ACC' : 'Target'}
                </span>
                <input
                  type="range"
                  min={20}
                  max={speedLimit + 30}
                  step={5}
                  disabled={hasAdaptiveCruise}
                  value={state.targetSpeedMph}
                  onChange={e => dispatch({ type: 'SET_TARGET_SPEED', mph: +e.target.value })}
                />
                <span className="speed-val" style={{ color: overLimit ? '#f85149' : inTolerance ? '#d29922' : undefined }}>
                  {state.targetSpeedMph} mph
                  {overLimit && <span style={{ fontSize: 10, marginLeft: 4 }}>🚨 fine</span>}
                  {inTolerance && <span style={{ fontSize: 10, marginLeft: 4, color: '#d29922' }}>⚠️ +5</span>}
                </span>
              </div>
            );
          })()}

          {/* Time scale */}
          <div className="timescale-btns">
            {([1, 5, 10, 25, 50, 100] as const).map(s => {
              const locked = s > 25 && !hasAutopilot;
              return (
                <button
                  key={s}
                  className={`ts-btn ${state.timeScale === s ? 'active' : ''}`}
                  disabled={locked}
                  title={locked ? 'Requires Autopilot Module upgrade' : undefined}
                  onClick={() => dispatch({ type: 'SET_TIME_SCALE', scale: s })}
                >
                  {locked ? '🔒' : `${s}×`}
                </button>
              );
            })}
          </div>

          {/* Pause / Abandon */}
          <button
            className="btn-warn"
            onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}
          >
            {state.paused ? '▶ Resume' : '⏸ Pause'}
          </button>

          <button
            className="btn-danger"
            onClick={() => dispatch({ type: 'ABANDON_DRIVE' })}
          >
            Abandon
          </button>

          {/* Stop charging */}
          {state.isCharging && (
            <button
              className="btn-primary"
              onClick={() => dispatch({ type: 'STOP_CHARGE' })}
            >
              Stop Charging
            </button>
          )}
        </div>
      )}

      {/* ── Nearby Chargers ── */}
      {state.driving && !state.isCharging && nearbyChargers.length > 0 && (
        <div className="charger-list">
          <h3>Nearby Chargers</h3>
          {nearbyChargers.map(c => {
            const dist      = c.positionMi - state.positionMi;
            const rate      = Math.min(c.maxKw, car.maxChargeKw + chargeRateBonus);
            const atCharger = Math.abs(dist) < 0.3;
            const tier      = chargerTier(c.maxKw);
            const kwhTo80   = Math.max(0, maxBat * 0.80 - state.battery);
            const kwhToFull = Math.max(0, maxBat - state.battery);
            return (
              <div key={c.id} className="charger-item">
                <div className="charger-info">
                  <div className="charger-name">
                    ⚡ {c.name}
                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: tier.color,
                      background: '#21262d', border: `1px solid ${tier.color}`,
                      borderRadius: 10, padding: '1px 7px' }}>
                      {tier.label}
                    </span>
                  </div>
                  <div className="charger-meta">
                    {c.network}
                    {' · '}
                    <span title="Charger max">{c.maxKw.toFixed(0)} kW</span>
                    {' → '}
                    <span title="Car limit">{(car.maxChargeKw + chargeRateBonus).toFixed(0)} kW</span>
                    {' = '}
                    <strong style={{ color: tier.color }} title="Actual rate">{rate.toFixed(1)} kW</strong>
                    {' · '}${c.pricePerKwh}/kWh
                  </div>
                  <div className="charger-meta">
                    +80%: {fmtTime(kwhTo80 / rate)} · Full: {fmtTime(kwhToFull / rate)}
                  </div>
                </div>
                <div className="charger-dist">{dist > 0 ? `+${dist.toFixed(1)} mi` : 'Here'}</div>
                {atCharger && (
                  <button
                    className="btn-success"
                    style={{ fontSize: 12, padding: '4px 12px' }}
                    onClick={() => dispatch({ type: 'START_CHARGE', chargerId: c.id })}
                  >
                    Charge
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Route Planner ── */}
      {plannerStops && plannerStops.length > 0 && (
        <div className="charger-list">
          <h3>DC Fast Charge Plan</h3>
          {plannerStops.map(({ charger, dist, arrBat, arrPct, reachable, rate }) => {
            const pctColor = arrPct > 0.30 ? '#3fb950' : arrPct > 0.10 ? '#d29922' : '#f85149';
            return (
              <div key={charger.id} className="charger-item" style={{ opacity: reachable ? 1 : 0.65 }}>
                <div style={{ fontSize: 18, lineHeight: 1 }}>
                  {reachable ? '⚡' : '⚠️'}
                </div>
                <div className="charger-info">
                  <div className="charger-name">
                    {charger.name}
                    {(() => {
                      const t = chargerTier(charger.maxKw);
                      return (
                        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: t.color,
                          background: '#21262d', border: `1px solid ${t.color}`,
                          borderRadius: 10, padding: '1px 7px' }}>
                          {t.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="charger-meta">
                    {charger.network}
                    {' · '}
                    <span title="Charger max">{charger.maxKw.toFixed(0)} kW</span>
                    {' → '}
                    <span title="Car limit">{(car.maxChargeKw + chargeRateBonus).toFixed(0)} kW</span>
                    {' = '}
                    <strong style={{ color: chargerTier(charger.maxKw).color }} title="Actual rate">{rate.toFixed(1)} kW</strong>
                    {' · '}${charger.pricePerKwh}/kWh
                  </div>
                  {!reachable && (
                    <div style={{ color: '#f85149', fontSize: 12, fontWeight: 600 }}>
                      Won't make it — charge sooner!
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', minWidth: 70 }}>
                  <div style={{ color: pctColor, fontWeight: 700, fontSize: 14 }}>
                    {(arrPct * 100).toFixed(0)}%
                  </div>
                  <div className="charger-meta">{arrBat.toFixed(1)} kWh</div>
                  <div className="charger-meta">in {dist.toFixed(1)} mi</div>
                </div>
              </div>
            );
          })}
          {plannerStops.length === 0 && (
            <p style={{ color: '#8b949e', fontSize: 13 }}>No DC fast chargers remaining on route.</p>
          )}
        </div>
      )}
      {hasPlanner && route && state.driving && plannerStops?.length === 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8b949e' }}>
          📡 Route Planner: No DC fast chargers ahead — finish line in {(route.distanceMi - state.positionMi).toFixed(1)} mi.
        </div>
      )}

      {/* ── Status Messages ── */}
      {state.batteryDead && (
        <div style={{ background: '#3a1010', border: '1px solid #f85149', borderRadius: 8, padding: '12px 14px', color: '#f85149', fontWeight: 700 }}>
          🔋 Battery dead! You didn't make it.
        </div>
      )}
      {state.routeComplete && (
        <div style={{ background: '#0d2a0d', border: '1px solid #3fb950', borderRadius: 8, padding: '12px 14px', color: '#3fb950', fontWeight: 700 }}>
          ✅ Route complete! Check the Routes tab to start another.
        </div>
      )}
      {!state.driving && !state.batteryDead && !state.routeComplete && (
        <div style={{ color: '#8b949e', textAlign: 'center', padding: '12px' }}>
          Go to the <strong>Routes</strong> tab to start a drive.
        </div>
      )}
    </div>
  );
}
