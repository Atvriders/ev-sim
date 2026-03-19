import type { GameState, Action } from '../game/types';
import { ROUTES } from '../game/routes';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
}

export default function RoutesTab({ state, dispatch }: Props) {
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
