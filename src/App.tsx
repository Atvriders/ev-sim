import { useReducer, useEffect, useRef } from 'react';
import { reducer, INITIAL_STATE } from './game/reducer';
import { saveGame } from './game/save';
import { getCar } from './game/cars';
import DriveTab     from './components/DriveTab';
import CarsTab      from './components/CarsTab';
import UpgradesTab  from './components/UpgradesTab';
import RoutesTab    from './components/RoutesTab';
import LogTab       from './components/LogTab';

const TABS = [
  { id: 'drive',    label: '🚗 Drive'    },
  { id: 'cars',     label: '🏎️ Cars'     },
  { id: 'upgrades', label: '🔧 Upgrades' },
  { id: 'routes',   label: '🗺️ Routes'   },
  { id: 'log',      label: '📋 Log'      },
] as const;

export default function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const rafRef  = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  // Game loop
  useEffect(() => {
    function frame(ts: number) {
      const delta = lastRef.current ? ts - lastRef.current : 16;
      lastRef.current = ts;
      dispatch({ type: 'TICK', delta: Math.min(delta, 200) });
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Autosave every 5 seconds
  useEffect(() => {
    const id = setInterval(() => saveGame(state), 5000);
    return () => clearInterval(id);
  }, [state]);

  // Immediate save on any purchase or progression event so a refresh never loses progress
  useEffect(() => {
    saveGame(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTrips, state.batteryDead, state.upgrades, state.ownedCars, state.credits]);

  const car = getCar(state.selectedCar);

  return (
    <div className="app">
      {/* ── Topbar ── */}
      <div className="topbar">
        <span className="topbar-title">⚡ EV Sim</span>
        <div className="topbar-stats">
          <div className="stat-chip">
            <span className="label">Credits</span>
            <span className="value">{state.credits.toLocaleString()}</span>
          </div>
          <div className="stat-chip">
            <span className="label">Car</span>
            <span className="value">{car.emoji} {car.name}</span>
          </div>
          <div className="stat-chip">
            <span className="label">Trips</span>
            <span className="value">{state.totalTrips}</span>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${state.tab === t.id ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', tab: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="main-content">
        {state.tab === 'drive'    && <DriveTab    state={state} dispatch={dispatch} />}
        {state.tab === 'cars'     && <CarsTab     state={state} dispatch={dispatch} />}
        {state.tab === 'upgrades' && <UpgradesTab state={state} dispatch={dispatch} />}
        {state.tab === 'routes'   && <RoutesTab   state={state} dispatch={dispatch} />}
        {state.tab === 'log'      && <LogTab      state={state} />}
      </div>

      {/* ── Toast ── */}
      {state.notification && (
        <div key={state.notifKey} className="toast">
          {state.notification}
        </div>
      )}
    </div>
  );
}
