import type { GameState, Action } from './types';
import { getCar } from './cars';
import { getUpgrade } from './upgrades';
import { getRoute } from './routes';
import { physicsTick, computeUpgradeStats, computeKw } from './physics';
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
    queuedChargerId: null,
    skippedChargerId: null,

    totalMilesDriven: 0,
    totalKwhUsed: 0,
    totalKwhCharged: 0,
    kwhChargedAtDriveStart: 0,
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
          queuedChargerId: null,
          skippedChargerId: null,
          positionMi: 0,
          speedMph: 0,
          currentKw: 0,
          currentRoute: route.id,
          targetSpeedMph: 65,
          battery: car.batteryKwh + batteryBonus, // full charge at start
          kwhChargedAtDriveStart: state.totalKwhCharged,
        },
        `Starting ${route.name}!`
      );
    }

    case 'ABANDON_DRIVE': {
      return {
        ...state,
        driving: false,
        paused: false,
        batteryDead: false,
        routeComplete: false,
        isCharging: false,
        chargeRateKw: 0,
        chargingAtId: null,
        queuedChargerId: null,
        skippedChargerId: null,
        speedMph: 0,
        currentKw: 0,
        notification: 'Drive abandoned.',
        notifKey: state.notifKey + 1,
      };
    }

    case 'QUEUE_CHARGE': {
      if (!state.driving) return state;
      const route = getRoute(state.currentRoute ?? '');
      const charger = route?.chargers.find(c => c.id === action.chargerId);
      if (!charger) return state;
      return notify(
        { ...state, queuedChargerId: charger.id },
        `Queued charge at ${charger.name}`
      );
    }

    case 'CANCEL_QUEUE_CHARGE':
      return { ...state, queuedChargerId: null, skippedChargerId: state.queuedChargerId };

    case 'START_CHARGE': {
      if (!state.driving) return state;
      const route = getRoute(state.currentRoute ?? '');
      const charger = route?.chargers.find(c => c.id === action.chargerId);
      if (!charger) return state;
      const car = getCar(state.selectedCar);
      const { chargeRateBonus } = computeUpgradeStats(state.upgrades);
      const rateKw = Math.min(charger.maxKw, car.maxChargeKw + chargeRateBonus);
      return {
        ...state,
        isCharging: true,
        chargingAtId: charger.id,
        chargeRateKw: rateKw,
        queuedChargerId: null,   // clear queue so arrival check never re-fires
        paused: false,
        speedMph: 0,
        targetSpeedMph: 0,
      };
    }

    case 'STOP_CHARGE': {
      return {
        ...state,
        isCharging: false,
        chargeRateKw: 0,
        chargingAtId: null,
        // Prevent route planner re-queuing this charger while car is still in its window
        skippedChargerId: state.chargingAtId,
        targetSpeedMph: 65,
      };
    }

    case 'TICK': {
      if (!state.driving || state.paused || state.routeComplete || state.batteryDead) return state;

      const deltaS = (action.delta / 1000) * state.timeScale;
      const route  = getRoute(state.currentRoute ?? '');
      const car    = getCar(state.selectedCar);
      const { batteryBonus, chargeRateBonus, fineMultiplier, v2gReturn, efficiencyMult } = computeUpgradeStats(state.upgrades);
      const maxBat = car.batteryKwh + batteryBonus;

      // ── Charging tick ────────────────────────────────────────────────────────
      if (state.isCharging) {
        const charger = route?.chargers.find(c => c.id === state.chargingAtId);
        const chargedKwh = state.chargeRateKw * (deltaS / 3600);
        const newBat = Math.min(state.battery + chargedKwh, maxBat);
        const rawCost = chargedKwh * (charger?.pricePerKwh ?? 0.27);
        const cost = rawCost * (1 - v2gReturn);   // V2G returns a fraction
        const full = newBat >= maxBat - 0.001;
        if (full) {
          const resumeRoute = getRoute(state.currentRoute ?? '');
          const resumeLimit = resumeRoute?.terrain.reduce((lim, pt) => {
            if (pt.distanceMi <= state.positionMi) return pt.speedLimitMph;
            return lim;
          }, 65) ?? 65;
          return notify(
            {
              ...state,
              battery: maxBat,
              currentKw: 0,
              credits: Math.max(0, state.credits - cost),
              totalKwhCharged: state.totalKwhCharged + chargedKwh,
              isCharging: false,
              chargeRateKw: 0,
              chargingAtId: null,
              queuedChargerId: null,
              // Mark just-used charger as skipped so route planner doesn't
              // immediately re-queue it (car may still be within the arrival window)
              skippedChargerId: state.chargingAtId,
              targetSpeedMph: resumeLimit,
            },
            'Fully charged! Resuming drive.'
          );
        }
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
      const hasAdaptiveCruise = state.upgrades.includes('adaptive_cruise');
      // Adaptive Cruise drives at limit+5 (tolerance zone, no fine); otherwise user sets their own target
      const userTarget = hasAdaptiveCruise ? currentSpeedLimit + 5 : state.targetSpeedMph;
      const updates  = physicsTick(
        { ...state, targetSpeedMph: userTarget },
        car, route?.terrain ?? [], upgrades, deltaS
      );

      const newPos    = updates.positionMi ?? state.positionMi;
      const newBat    = updates.battery ?? state.battery;
      const newSpeed  = updates.speedMph ?? state.speedMph;
      const dead      = newBat <= 0;
      const complete  = newPos >= route.distanceMi;

      // ── Speeding fine: >5 mph over limit costs credits each tick ─────────────
      const speedExcess = Math.max(0, newSpeed - currentSpeedLimit - 5);
      const fine = speedExcess * 0.015 * deltaS * fineMultiplier; // radar detector reduces this

      let next: GameState = {
        ...state,
        ...updates,
        // Keep user's preferred target; adaptive cruise stores limit+5 (actual physics target)
        targetSpeedMph: hasAdaptiveCruise ? currentSpeedLimit + 5 : state.targetSpeedMph,
        batteryDead: dead,
        routeComplete: complete && !dead,
        credits: fine > 0 ? Math.max(0, (updates.credits ?? state.credits) - fine) : (updates.credits ?? state.credits),
      };

      // ── Auto-charge: trigger START_CHARGE when car arrives at queued charger ──
      if (state.queuedChargerId && !dead && !complete) {
        const qc = route?.chargers.find(c => c.id === state.queuedChargerId);
        if (qc && newPos >= qc.positionMi - 0.5 && newPos < qc.positionMi + 1.5 && state.positionMi < qc.positionMi + 1.5) {
          const rateKw = Math.min(qc.maxKw, car.maxChargeKw + chargeRateBonus);
          next = notify(
            {
              ...next,
              isCharging: true,
              chargingAtId: qc.id,
              chargeRateKw: rateKw,
              queuedChargerId: null,
              speedMph: 0,
              targetSpeedMph: 0,
            },
            `Auto-charging at ${qc.name}`
          );
        }
      }

      // ── Route Planner: queue only the DCFC the car actually needs ────────────
      if (state.upgrades.includes('route_planner') && !next.isCharging && !dead && !complete) {
        // Clear skipped charger once the car has passed it
        let skipped = next.skippedChargerId;
        if (skipped) {
          const skippedCharger = route?.chargers.find(c => c.id === skipped);
          if (skippedCharger && newPos > skippedCharger.positionMi + 0.5) {
            skipped = null;
            next = { ...next, skippedChargerId: null };
          }
        }

        // Use actual game-physics efficiency at 65 mph flat (more accurate than EPA rating)
        // computeKw already applies upgrade efficiency multipliers internally
        const cruiseKw  = computeKw(car, 65, 0, 0, state.upgrades);
        const effMiKwh  = cruiseKw > 0 ? 65 / cruiseKw : car.efficiencyMiKwh / efficiencyMult;
        const safetyKwh = maxBat * 0.05;   // 5% buffer

        const dcfcAhead = (route?.chargers ?? [])
          .filter(c => c.maxKw >= 50 && c.positionMi > newPos + 0.1 && c.id !== skipped)
          .sort((a, b) => a.positionMi - b.positionMi);

        // Walk chargers forward; find the first stop we genuinely need
        let targetId: string | null = null;
        let simBat = newBat;
        let simPos = newPos;

        for (let i = 0; i < dcfcAhead.length; i++) {
          const charger = dcfcAhead[i];
          const batHere = simBat - (charger.positionMi - simPos) / effMiKwh;

          if (batHere < safetyKwh) {
            // Would arrive critically low — stop here
            targetId = charger.id;
            break;
          }

          // Check if we can reach the next waypoint (next DCFC or finish) without charging here
          const nextPos = i + 1 < dcfcAhead.length
            ? dcfcAhead[i + 1].positionMi
            : route.distanceMi;
          const batNext = batHere - (nextPos - charger.positionMi) / effMiKwh;

          if (batNext < safetyKwh) {
            // Can't make it to the next waypoint — need to charge here
            targetId = charger.id;
            break;
          }

          // Car can skip this charger — advance simulation past it
          simPos = charger.positionMi;
          simBat = batHere;
        }

        if (next.queuedChargerId !== targetId) {
          next = { ...next, queuedChargerId: targetId };
        }
      }

      if (complete && !dead) {
        const reward = route.reward;
        // Full-charge finish bonus: battery >= 100% at the line (can exceed maxBat via regen)
        const fullChargeBonus = newBat >= maxBat ? Math.round(reward * 0.5) : 0;
        const totalEarned = reward + fullChargeBonus;
        const log = {
          routeName: route.name,
          carName: `${car.brand} ${car.name}`,
          distanceMi: route.distanceMi,
          kwhUsed: (updates.totalKwhUsed ?? state.totalKwhUsed) - state.totalKwhUsed,
          kwhCharged: (updates.totalKwhCharged ?? state.totalKwhCharged) - state.kwhChargedAtDriveStart,
          creditsEarned: totalEarned,
          completed: true,
        };
        const msg = fullChargeBonus > 0
          ? `Route complete! +${reward} credits ⚡ Full-charge bonus +${fullChargeBonus}!`
          : `Route complete! +${reward} credits`;
        next = notify(
          {
            ...next,
            credits: next.credits + totalEarned,
            totalTrips: state.totalTrips + 1,
            driving: false,
            speedMph: 0,
            log: [log, ...state.log].slice(0, 50),
          },
          msg
        );
      } else if (dead) {
        const log = {
          routeName: route.name,
          carName: `${car.brand} ${car.name}`,
          distanceMi: newPos,
          kwhUsed: (updates.totalKwhUsed ?? state.totalKwhUsed) - state.totalKwhUsed,
          kwhCharged: (updates.totalKwhCharged ?? state.totalKwhCharged) - state.kwhChargedAtDriveStart,
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
