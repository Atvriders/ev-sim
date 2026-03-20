import type { GameState, Action } from '../game/types';
import { ROUTES } from '../game/routes';
import { getCar } from '../game/cars';
import { computeUpgradeStats, computeKw } from '../game/physics';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
}

function formatBestTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

export default function RoutesTab({ state, dispatch }: Props) {
  const car = getCar(state.selectedCar);
  const { batteryBonus, efficiencyMult } = computeUpgradeStats(state.upgrades);
  const maxBat = car.batteryKwh + batteryBonus;
  // Physics-based efficiency at 65 mph
  const cruiseKw = computeKw(car, 65, 0, 0, state.upgrades);
  const effMiKwh = cruiseKw > 0 ? 65 / cruiseKw : car.efficiencyMiKwh / efficiencyMult;
  const estRange = maxBat * effMiKwh;

  return (
    <div>
      <p className="section-title">Routes</p>
      <div className="route-list">
        {ROUTES.map(route => {
          const locked  = route.unlockAfterTrips > state.totalTrips;
          const current = state.currentRoute === route.id && state.driving;

          return (
            <div key={route.id} className="route-card" style={{ opacity: locked ? 0.5 : 1 }}>
              <div className="route-header">
                <span className="route-name">{route.name}</span>
                <span className={`diff-badge diff-${route.difficulty}`}>{route.difficulty}</span>
              </div>

              <p className="route-desc">{route.description}</p>

              <div className="route-meta">
                <span><strong>{route.distanceMi} mi</strong></span>
                <span>Reward: <strong>{route.reward.toLocaleString()} cr</strong></span>
                <span>Chargers: <strong>{route.chargers.length}</strong></span>
              </div>

              {/* Charger table */}
              <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 10 }}>
                {route.chargers.map(c => (
                  <span key={c.id} style={{ marginRight: 12 }}>
                    ⚡ {c.name} ({c.maxKw} kW @ mi {c.positionMi})
                  </span>
                ))}
              </div>

              {/* Range vs distance */}
              <div style={{ margin: '8px 0', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b949e', marginBottom: 3 }}>
                  <span>{car.emoji} Est. range: {estRange.toFixed(0)} mi</span>
                  <span style={{ color: estRange >= route.distanceMi ? '#3fb950' : '#f85149' }}>
                    {estRange >= route.distanceMi ? '✓ Can complete' : '⚠ Needs charging'}
                  </span>
                </div>
                <div style={{ height: 6, background: '#21262d', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (estRange / route.distanceMi) * 100).toFixed(0)}%`,
                    background: estRange >= route.distanceMi ? '#3fb950' : '#d29922',
                    borderRadius: 3,
                  }} />
                </div>
              </div>

              {/* Best time / efficiency for this route */}
              {state.bestTimes?.[route.id] && (
                <div style={{ fontSize: 11, color: '#58a6ff', marginBottom: 4 }}>
                  Best time: {formatBestTime(state.bestTimes[route.id])}
                  {state.bestEfficiency?.[route.id] && ` · Best efficiency: ${state.bestEfficiency[route.id].toFixed(2)} mi/kWh`}
                </div>
              )}

              {locked ? (
                <span style={{ fontSize: 13, color: '#d29922' }}>
                  🔒 Complete {route.unlockAfterTrips} trips to unlock
                  ({state.totalTrips} / {route.unlockAfterTrips})
                </span>
              ) : current ? (
                <span style={{ color: '#58a6ff', fontWeight: 700 }}>▶ In progress</span>
              ) : (
                <button
                  className="btn-primary"
                  style={{ fontSize: 13, padding: '6px 16px' }}
                  disabled={state.driving}
                  onClick={() => {
                    dispatch({ type: 'START_DRIVE', routeId: route.id });
                    dispatch({ type: 'SET_TAB', tab: 'drive' });
                  }}
                >
                  {state.driving ? 'Finish current drive first' : `Start → ${route.distanceMi} mi`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
