import type { GameState, Action } from './types';
import { getCar } from './cars';
import { getUpgrade } from './upgrades';
import { getRoute } from './routes';
import { physicsTick, computeUpgradeStats } from './physics';
import { loadGame } from './save';

export const INITIAL_STATE: GameState = buildInitialState();

function buildInitialState(): GameState {
  const saved = loadGame();
  const defaults: GameState = {
    credits: 1000,
    totalTrips: 0,

    selectedCar: 'nissan_leaf_2011',
    ownedCars: ['nissan_leaf_2011'],
    upgrades: [],

    driving: false,
    paused: false,
    timeScale: 1,
    battery: getCar('nissan_leaf_2011').batteryKwh,
    speedMph: 0,
    targetSpeedMph: 65,
    positionMi: 0,
    currentKw: 0,
    currentRoute: null,
    routeComplete: false,
    batteryDead: false,

    isCharging: false,
    chargeRateKw: 0,
    chargingAtId: null,

    totalMilesDriven: 0,
    totalKwhUsed: 0,
    totalKwhCharged: 0,
    log: [],

    tab: 'drive',
    notification: '',
    notifKey: 0,
  };

  if (!saved) return defaults;
  return { ...defaults, ...saved, driving: false, paused: false, isCharging: false };
}

function notify(state: GameState, msg: string): GameState {
  return { ...state, notification: msg, notifKey: state.notifKey + 1 };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {

    case 'SET_TAB':
      return { ...state, tab: action.tab };

    case 'SET_TARGET_SPEED':
      return { ...state, targetSpeedMph: action.mph };

    case 'SET_TIME_SCALE':
      return { ...state, timeScale: action.scale };

    case 'TOGGLE_PAUSE':
      if (!state.driving) return state;
      return { ...state, paused: !state.paused };

    case 'BUY_CAR': {
      const car = getCar(action.carId);
      if (!car || state.ownedCars.includes(car.id)) return state;
      if (state.credits < car.price) return notify(state, 'Not enough credits!');
      return notify(
        {
          ...state,
          credits: state.credits - car.price,
          ownedCars: [...state.ownedCars, car.id],
          selectedCar: car.id,
          // Reset battery for newly bought car (top it up)
          battery: car.batteryKwh + computeUpgradeStats(state.upgrades).batteryBonus,
        },
        `Purchased ${car.brand} ${car.name}!`
      );
    }

    case 'SELECT_CAR': {
      if (!state.ownedCars.includes(action.carId)) return state;
      if (state.driving) return notify(state, 'Cannot switch car while driving!');
      const car = getCar(action.carId);
      const maxBat = car.batteryKwh + computeUpgradeStats(state.upgrades).batteryBonus;
      return {
        ...state,
        selectedCar: action.carId,
        battery: Math.min(state.battery, maxBat),
      };
    }

    case 'BUY_UPGRADE': {
      const upg = getUpgrade(action.upgradeId);
      if (!upg) return state;
      if (state.upgrades.includes(upg.id)) return notify(state, 'Already installed!');
      if (state.credits < upg.price) return notify(state, 'Not enough credits!');
      const newUpgrades = [...state.upgrades, upg.id];
      const { batteryBonus } = computeUpgradeStats(newUpgrades);
      const car = getCar(state.selectedCar);
      const newMaxBat = car.batteryKwh + batteryBonus;
      return notify(
        {
          ...state,
          credits: state.credits - upg.price,
          upgrades: newUpgrades,
          battery: Math.min(state.battery + upg.batteryBonus, newMaxBat),
        },
        `Installed ${upg.name}!`
      );
    }

    case 'START_DRIVE': {
      const route = getRoute(action.routeId);
      if (!route) return state;
      if (route.unlockAfterTrips > state.totalTrips)
        return notify(state, `Complete ${route.unlockAfterTrips} trips first.`);
      const car = getCar(state.selectedCar);
      const { batteryBonus } = computeUpgradeStats(state.upgrades);
      const startLimit = route.terrain[0]?.speedLimitMph ?? 65;
      return notify(
        {
          ...state,
          driving: true,
          paused: false,
          routeComplete: false,
          batteryDead: false,
          isCharging: false,
          chargingAtId: null,
          chargeRateKw: 0,
          positionMi: 0,
          speedMph: 0,
          currentKw: 0,
          currentRoute: route.id,
          targetSpeedMph: startLimit,
          battery: car.batteryKwh + batteryBonus, // full charge at start
        },
        `Starting ${route.name}!`
      );
    }

    case 'ABANDON_DRIVE': {
      return {
        ...state,
        driving: false,
        paused: false,
        isCharging: false,
        chargeRateKw: 0,
        chargingAtId: null,
        speedMph: 0,
        currentKw: 0,
        notification: 'Drive abandoned.',
        notifKey: state.notifKey + 1,
      };
    }

    case 'START_CHARGE': {
      if (!state.driving) return state;
      const route = getRoute(state.currentRoute ?? '');
      const charger = route?.chargers.find(c => c.id === action.chargerId);
      if (!charger) return state;
      const car = getCar(state.selectedCar);
      const rateKw = Math.min(charger.maxKw, car.maxChargeKw);
      return {
        ...state,
        isCharging: true,
        chargingAtId: charger.id,
        chargeRateKw: rateKw,
        paused: false,
        speedMph: 0,
        targetSpeedMph: 0,
      };
    }

    case 'STOP_CHARGE': {
      const resumeRoute = getRoute(state.currentRoute ?? '');
      const resumeLimit = resumeRoute?.terrain.reduce((lim, pt) => {
        if (pt.distanceMi <= state.positionMi) return pt.speedLimitMph;
        return lim;
      }, 65) ?? 65;
      return {
        ...state,
        isCharging: false,
        chargeRateKw: 0,
        chargingAtId: null,
        targetSpeedMph: resumeLimit,
      };
    }

    case 'TICK': {
      if (!state.driving || state.paused || state.routeComplete || state.batteryDead) return state;

      const deltaS = (action.delta / 1000) * state.timeScale;
      const route  = getRoute(state.currentRoute ?? '');
      const car    = getCar(state.selectedCar);
      const { batteryBonus } = computeUpgradeStats(state.upgrades);
      const maxBat = car.batteryKwh + batteryBonus;

      // ── Charging tick ────────────────────────────────────────────────────────
      if (state.isCharging) {
        const charger = route?.chargers.find(c => c.id === state.chargingAtId);
        const chargedKwh = state.chargeRateKw * (deltaS / 3600);
        const newBat = Math.min(state.battery + chargedKwh, maxBat);
        const cost = chargedKwh * (charger?.pricePerKwh ?? 0.27);
        return {
          ...state,
          battery: newBat,
          currentKw: -state.chargeRateKw,
          credits: Math.max(0, state.credits - cost),
          totalKwhCharged: state.totalKwhCharged + chargedKwh,
        };
      }

      // ── Driving tick ─────────────────────────────────────────────────────────
      const upgrades = state.upgrades.map(id => getUpgrade(id)).filter(Boolean);
      // Compute speed limit at current position so physics obeys it automatically
      const currentSpeedLimit = route.terrain.reduce((lim, pt) => {
        if (pt.distanceMi <= state.positionMi) return pt.speedLimitMph;
        return lim;
      }, 65);
      const effectiveTarget = Math.min(state.targetSpeedMph, currentSpeedLimit);
      const updates  = physicsTick(
        { ...state, targetSpeedMph: effectiveTarget },
        car, route?.terrain ?? [], upgrades, deltaS
      );

      const newPos    = updates.positionMi ?? state.positionMi;
      const newBat    = updates.battery ?? state.battery;
      const dead      = newBat <= 0;
      const complete  = newPos >= route.distanceMi;

      // Enforce speed limit — clamp to limit for physics but preserve the
      // user's preferred speed in state so the car speeds back up automatically
      // when a lower-limit zone ends.
      const speedLimit = route.terrain.reduce((lim, pt) => {
        if (pt.distanceMi <= newPos) return pt.speedLimitMph;
        return lim;
      }, 65);

      let next: GameState = {
        ...state,
        ...updates,
        // Keep user's preferred target; effective limit enforced via physics below
        targetSpeedMph: state.targetSpeedMph,
        batteryDead: dead,
        routeComplete: complete && !dead,
      };

      if (complete && !dead) {
        const reward = route.reward;
        const log = {
          routeName: route.name,
          carName: `${car.brand} ${car.name}`,
          distanceMi: route.distanceMi,
          kwhUsed: (updates.totalKwhUsed ?? state.totalKwhUsed) - state.totalKwhUsed,
          kwhCharged: state.totalKwhCharged,
          creditsEarned: reward,
          completed: true,
        };
        next = notify(
          {
            ...next,
            credits: state.credits + reward,
            totalTrips: state.totalTrips + 1,
            driving: false,
            speedMph: 0,
            log: [log, ...state.log].slice(0, 50),
          },
          `Route complete! +${reward} credits`
        );
      } else if (dead) {
        const log = {
          routeName: route.name,
          carName: `${car.brand} ${car.name}`,
          distanceMi: newPos,
          kwhUsed: (updates.totalKwhUsed ?? state.totalKwhUsed) - state.totalKwhUsed,
          kwhCharged: state.totalKwhCharged,
          creditsEarned: 0,
          completed: false,
        };
        next = notify(
          {
            ...next,
            driving: false,
            speedMph: 0,
            log: [log, ...state.log].slice(0, 50),
          },
          'Battery dead! Drive failed.'
        );
      }

      return next;
    }

    default:
      return state;
  }
}
