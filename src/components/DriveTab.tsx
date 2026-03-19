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

export default function DriveTab({ state, dispatch }: Props) {
  const car   = getCar(state.selectedCar);
  const route = state.currentRoute ? getRoute(state.currentRoute) : null;
  const { batteryBonus } = computeUpgradeStats(state.upgrades);
  const maxBat  = car.batteryKwh + batteryBonus;
  const batPct  = maxBat > 0 ? state.battery / maxBat : 0;

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

  // Nearby chargers (within 5 mi ahead)
  const nearbyChargers = route
    ? route.chargers.filter(c =>
        c.positionMi >= state.positionMi - 0.5 &&
        c.positionMi <= state.positionMi + 5
      )
    : [];

  return (
    <div className="drive-layout">
      {/* ── Canvas ── */}
      <GameCanvas state={state} />

      {/* ── HUD ── */}
      <div className="hud">
        <div className={`gauge ${kwClass(state.currentKw)}`}>
          <div className="gauge-label">{state.currentKw < -0.5 ? 'Regen' : 'Draw'}</div>
          <div className="gauge-value">{fmtKw(state.currentKw)}</div>
          <div className="gauge-unit">kW</div>
        </div>

        <div className="gauge">
          <div className="gauge-label">Speed</div>
          <div className="gauge-value">{state.speedMph.toFixed(0)}</div>
          <div className="gauge-unit">mph  · limit {speedLimit}</div>
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
          {state.isCharging && (
            <span style={{ color: '#3fb950', fontWeight: 700 }}>
              ⚡ Charging {state.chargeRateKw.toFixed(0)} kW
            </span>
          )}
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

      {/* ── Controls ── */}
      {state.driving && (
        <div className="controls">
          {/* Speed slider */}
          {!state.isCharging && (
            <div className="speed-control">
              <span className="speed-label">Target</span>
              <input
                type="range"
                min={20}
                max={speedLimit}
                step={5}
                value={Math.min(state.targetSpeedMph, speedLimit)}
                onChange={e => dispatch({ type: 'SET_TARGET_SPEED', mph: +e.target.value })}
              />
              <span className="speed-val">{Math.min(state.targetSpeedMph, speedLimit)} mph</span>
            </div>
          )}

          {/* Time scale */}
          <div className="timescale-btns">
            {([1, 5, 10] as const).map(s => (
              <button
                key={s}
                className={`ts-btn ${state.timeScale === s ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_TIME_SCALE', scale: s })}
              >
                {s}×
              </button>
            ))}
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
            const dist  = c.positionMi - state.positionMi;
            const rate  = Math.min(c.maxKw, car.maxChargeKw);
            const atCharger = Math.abs(dist) < 0.3;
            return (
              <div key={c.id} className="charger-item">
                <div className="charger-info">
                  <div className="charger-name">⚡ {c.name}</div>
                  <div className="charger-meta">
                    {c.network} · {rate.toFixed(0)} kW · ${c.pricePerKwh}/kWh
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
