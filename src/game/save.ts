import type { GameState } from './types';

const KEY = 'ev_sim_save_v3';
// Cookies expire in 1 year
const EXPIRES = () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();

// Fields that matter for persistence (excludes runtime drive state and the log,
// which together would blow the 4 KB cookie limit)
type SavedFields = Pick<GameState,
  | 'credits' | 'totalTrips'
  | 'selectedCar' | 'ownedCars' | 'upgrades'
  | 'battery'
  | 'totalMilesDriven' | 'totalKwhUsed' | 'totalKwhCharged'
  | 'tab'
>;

function extractSaved(state: GameState): SavedFields {
  return {
    credits:           state.credits,
    totalTrips:        state.totalTrips,
    selectedCar:       state.selectedCar,
    ownedCars:         state.ownedCars,
    upgrades:          state.upgrades,
    battery:           state.battery,
    totalMilesDriven:  state.totalMilesDriven,
    totalKwhUsed:      state.totalKwhUsed,
    totalKwhCharged:   state.totalKwhCharged,
    tab:               state.tab,
  };
}

export function saveGame(state: GameState): void {
  try {
    const value = encodeURIComponent(JSON.stringify(extractSaved(state)));
    document.cookie = `${KEY}=${value}; expires=${EXPIRES()}; path=/; SameSite=Lax`;
  } catch {
    // Serialisation or cookie error — ignore
  }
}

export function loadGame(): Partial<GameState> | null {
  try {
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${KEY}=`));
    if (!match) return null;
    const raw = decodeURIComponent(match.slice(KEY.length + 1));
    return JSON.parse(raw) as Partial<GameState>;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  document.cookie = `${KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}
