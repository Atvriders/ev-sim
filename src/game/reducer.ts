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

    economyMode: false,

    totalMilesDriven: 0,
    totalKwhUsed: 0,
    totalKwhCharged: 0,
    totalCreditsEarned: 0,
    kwhChargedAtDriveStart: 0,
    kwhUsedAtDriveStart: 0,
    tripStartTime: null,
    tripChargingCost: 0,
    log: [],

    achievements: [],
    bestTimes: {},
    bestEfficiency: {},

    tab: 'drive',
    notification: '',
    notifKey: 0,
  };

  if (!saved) return defaults;
  const VALID_TABS = new Set<GameState['tab']>(['drive','cars','upgrades','routes','log','stats']);
  return {
    ...defaults,
    ...saved,
    driving:       false,
    paused:        false,
    isCharging:    false,
    // Sanitize record/array fields — old/corrupt saves may have wrong types
    tab:            VALID_TABS.has(saved.tab as GameState['tab']) ? saved.tab as GameState['tab'] : defaults.tab,
    bestTimes:      (saved.bestTimes      && typeof saved.bestTimes      === 'object' && !Array.isArray(saved.bestTimes))      ? saved.bestTimes      : defaults.bestTimes,
    bestEfficiency: (saved.bestEfficiency && typeof saved.bestEfficiency === 'object' && !Array.isArray(saved.bestEfficiency)) ? saved.bestEfficiency : defaults.bestEfficiency,
    achievements:   Array.isArray(saved.achievements) ? saved.achievements : defaults.achievements,
  };
}

function notify(state: GameState, msg: string): GameState {
  return { ...state, notification: msg, notifKey: state.notifKey + 1 };
}

function checkAchievements(state: GameState, next: GameState): string[] {
  const current = new Set(state.achievements);
  const newOnes: string[] = [];

  function check(id: string, condition: boolean) {
    if (condition && !current.has(id)) {
      newOnes.push(id);
      current.add(id); // prevent duplicates within a single check pass
    }
  }

  check('first_trip', next.totalTrips >= 1);
  check('ten_trips', next.totalTrips >= 10);
  check('fifty_trips', next.totalTrips >= 50);
  check('road_warrior', next.totalMilesDriven >= 500);
  check('marathon', next.totalMilesDriven >= 1000);
  check('cross_country', next.totalMilesDriven >= 5000);
  check('power_shopper', next.ownedCars.length >= 5);
  check('fleet_manager', next.ownedCars.length >= 10);
  check('gearhead', next.upgrades.length >= 1);
  check('fully_loaded', next.upgrades.length >= 10);
  check('penny_pincher', next.totalCreditsEarned >= 10000);
  check('big_spender', next.totalCreditsEarned >= 50000);
  check('solar_powered', next.upgrades.includes('solar_roof'));
  check('v2g_master', next.upgrades.includes('v2g'));
  // time_traveler is awarded inline in the TICK handler; skip here to avoid duplication

  return newOnes;
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {

    case 'SET_TAB':
      return { ...state, tab: action.tab };

    case 'SET_TARGET_SPEED':
      return { ...state, targetSpeedMph: action.mph };

    case 'SET_TIME_SCALE': {
      const next = { ...state, timeScale: action.scale };
      if (action.scale >= 100) {
        const newAchievements = checkAchievements(state, next);
        if (newAchievements.length > 0) {
          return { ...next, achievements: [...state.achievements, ...newAchievements] };
        }
      }
      return next;
    }

    case 'TOGGLE_PAUSE':
      if (!state.driving) return state;
      return { ...state, paused: !state.paused };

    case 'BUY_CAR': {
      const car = getCar(action.carId);
      if (!car || state.ownedCars.includes(car.id)) return state;
      if (state.credits < car.price) return notify(state, 'Not enough credits!');
      const next: GameState = {
        ...state,
        credits: state.credits - car.price,
        ownedCars: [...state.ownedCars, car.id],
        selectedCar: car.id,
        // Reset battery for newly bought car (top it up)
        battery: car.batteryKwh + computeUpgradeStats(state.upgrades).batteryBonus,
      };
      const newAchievements = checkAchievements(state, next);
      const finalState = newAchievements.length > 0
        ? { ...next, achievements: [...state.achievements, ...newAchievements] }
        : next;
      return notify(finalState, `Purchased ${car.brand} ${car.name}!`);
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

    case 'SELL_CAR': {
      const car = getCar(action.carId);
      if (!car || !state.ownedCars.includes(car.id)) return state;
      if (state.driving) return notify(state, 'Cannot sell car while driving!');
      if (state.ownedCars.length <= 1) return notify(state, 'Cannot sell your only car!');
      const sellPrice = Math.max(50, Math.round(car.price * 0.4));
      const newOwned = state.ownedCars.filter(id => id !== car.id);
      const newSelected = state.selectedCar === car.id ? newOwned[0] : state.selectedCar;
      const newCar = getCar(newSelected);
      const { batteryBonus } = computeUpgradeStats(state.upgrades);
      const newMaxBat = newCar.batteryKwh + batteryBonus;
      return notify(
        {
          ...state,
          credits: state.credits + sellPrice,
          ownedCars: newOwned,
          selectedCar: newSelected,
          battery: Math.min(state.battery, newMaxBat),
          // Defensive: clear any stale charging state (shouldn't be active, but guard anyway)
          isCharging: false,
          chargeRateKw: 0,
          chargingAtId: null,
        },
        `Sold ${car.brand} ${car.name} for ${sellPrice} credits.`
      );
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
      const next: GameState = {
        ...state,
        credits: state.credits - upg.price,
        upgrades: newUpgrades,
        battery: Math.min(state.battery + upg.batteryBonus, newMaxBat),
      };
      const newAchievements = checkAchievements(state, next);
      const finalState = newAchievements.length > 0
        ? { ...next, achievements: [...state.achievements, ...newAchievements] }
        : next;
      return notify(finalState, `Installed ${upg.name}!`);
    }

    case 'TOGGLE_ECONOMY_MODE':
      return { ...state, economyMode: !state.economyMode };

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
          kwhUsedAtDriveStart: state.totalKwhUsed,
          tripStartTime: Date.now(),
          tripChargingCost: 0,
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
        positionMi: 0,
        targetSpeedMph: 65,
        tripChargingCost: 0,
        tripStartTime: null,
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
      const stopRoute = getRoute(state.currentRoute ?? '');
      const stopLimit = stopRoute?.terrain.reduce((lim, pt) => {
        if (pt.distanceMi <= state.positionMi) return pt.speedLimitMph;
        return lim;
      }, 65) ?? 65;
      return {
        ...state,
        isCharging: false,
        chargeRateKw: 0,
        chargingAtId: null,
        // Prevent route planner re-queuing this charger while car is still in its window
        skippedChargerId: state.chargingAtId,
        targetSpeedMph: stopLimit,
      };
    }

    case 'TICK': {
      if (!state.driving || state.paused || state.routeComplete || state.batteryDead) return state;

      const deltaS = (action.delta / 1000) * state.timeScale;
      const route  = getRoute(state.currentRoute ?? '');
      const car    = getCar(state.selectedCar);
      const { batteryBonus, chargeRateBonus, fineMultiplier, v2gReturn, efficiencyMult, freeKw } = computeUpgradeStats(state.upgrades);
      const maxBat = car.batteryKwh + batteryBonus;

      // ── Charging tick ────────────────────────────────────────────────────────
      if (state.isCharging) {
        const charger = route?.chargers.find(c => c.id === state.chargingAtId);
        const pricePerKwh = (charger?.pricePerKwh ?? 0.27) * (1 - v2gReturn);
        // Cap kWh delivered to what the player can actually afford (prevents free charging at 0 credits)
        const maxAffordableKwh = pricePerKwh > 0 ? state.credits / pricePerKwh : Infinity;
        const rawChargedKwh = state.chargeRateKw * (deltaS / 3600);
        const chargedKwh = Math.min(rawChargedKwh, maxAffordableKwh);
        // Solar roof contributes free kWh while charging (car is stationary so regen contribution is zero)
        const freeKwhWhileCharging = freeKw * (deltaS / 3600);
        const newBat = Math.min(state.battery + chargedKwh + freeKwhWhileCharging, maxBat);
        const cost = chargedKwh * pricePerKwh;
        const full = newBat >= maxBat - 0.001;
        // Stop charging if the player ran out of credits
        const brokeStop = pricePerKwh > 0 && state.credits - cost <= 0 && !full;
        if (brokeStop) {
          const resumeRoute = getRoute(state.currentRoute ?? '');
          const resumeLimit = resumeRoute?.terrain.reduce((lim, pt) => {
            if (pt.distanceMi <= state.positionMi) return pt.speedLimitMph;
            return lim;
          }, 65) ?? 65;
          return notify(
            {
              ...state,
              battery: newBat,
              currentKw: 0,
              credits: 0,
              totalKwhCharged: state.totalKwhCharged + chargedKwh,
              tripChargingCost: state.tripChargingCost + cost,
              isCharging: false,
              chargeRateKw: 0,
              chargingAtId: null,
              skippedChargerId: state.chargingAtId,
              targetSpeedMph: resumeLimit,
            },
            'Out of credits — charging stopped!'
          );
        }
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
              tripChargingCost: state.tripChargingCost + cost,
              isCharging: false,
              chargeRateKw: 0,
              chargingAtId: null,
              queuedChargerId: null,
              // Mark just-used charger as skipped so route planner doesn't
              // immediately re-queue it (car may still be within the arrival window)
              speedMph: 0,
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
          tripChargingCost: state.tripChargingCost + cost,
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
      let userTarget = hasAdaptiveCruise ? currentSpeedLimit + 5 : state.targetSpeedMph;
      if (state.economyMode) userTarget = Math.min(userTarget, 55);

      const updates  = physicsTick(
        { ...state, targetSpeedMph: userTarget },
        car, route?.terrain ?? [], upgrades, deltaS
      );

      const newPos    = updates.positionMi ?? state.positionMi;
      const newBat    = Math.min(updates.battery ?? state.battery, maxBat);  // cap regen at maxBat
      const newSpeed  = updates.speedMph ?? state.speedMph;
      const dead      = newBat <= 0;
      const complete  = newPos >= route.distanceMi;

      // ── Speeding fine: >5 mph over limit costs credits each tick ─────────────
      const speedExcess = Math.max(0, newSpeed - currentSpeedLimit - 5);
      const fine = speedExcess * 0.015 * deltaS * fineMultiplier; // radar detector reduces this

      let next: GameState = {
        ...state,
        ...updates,
        battery: newBat,  // use capped value — physicsTick doesn't know maxBat so regen can overflow
        // Keep user's preferred target; adaptive cruise stores limit+5 (actual physics target)
        // Economy mode clamp applies to both ACC and manual targets for consistent display
        targetSpeedMph: (() => {
          const t = hasAdaptiveCruise ? currentSpeedLimit + 5 : state.targetSpeedMph;
          return state.economyMode ? Math.min(t, 55) : t;
        })(),
        batteryDead: dead,
        routeComplete: complete && !dead,
        credits: fine > 0 ? Math.max(0, (updates.credits ?? state.credits) - fine) : (updates.credits ?? state.credits),
      };

      // ── Speed demon achievement: >15 mph over limit ───────────────────────────
      if (newSpeed > currentSpeedLimit + 15 && !next.achievements.includes('speed_demon')) {
        next = { ...next, achievements: [...next.achievements, 'speed_demon'] };
      }

      // ── Time traveler achievement check each tick ─────────────────────────────
      if (state.timeScale >= 100 && !next.achievements.includes('time_traveler')) {
        next = { ...next, achievements: [...next.achievements, 'time_traveler'] };
      }

      // ── Auto-charge: trigger START_CHARGE when car arrives at queued charger ──
      if (state.queuedChargerId && !dead && !complete && newBat < maxBat - 0.001) {
        const qc = route?.chargers.find(c => c.id === state.queuedChargerId);
        // Use state.positionMi for the upper bound so high-time-scale overshoots still trigger
        if (qc && newPos >= qc.positionMi - 0.5 && state.positionMi < qc.positionMi + 1.5) {
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

        // Only update if planner has a positive recommendation or no user queue is set.
        // Never clear a user-set queue (targetId=null) — user may have manually queued a stop.
        if (targetId !== null && next.queuedChargerId !== targetId) {
          next = { ...next, queuedChargerId: targetId };
        } else if (targetId === null && next.queuedChargerId === null) {
          // nothing to do — already clear
        }
      }

      if (complete && !dead) {
        const reward = route.reward;
        // Full-charge finish bonus: battery >= 100% at the line (can exceed maxBat via regen)
        const fullChargeBonus = newBat >= maxBat ? Math.round(reward * 0.5) : 0;
        const totalEarned = reward + fullChargeBonus;

        // ── Trip time tracking ────────────────────────────────────────────────
        const newBestTimes = { ...state.bestTimes };
        if (state.tripStartTime !== null) {
          const tripSecs = (Date.now() - state.tripStartTime) / 1000;
          if (!(route.id in newBestTimes) || tripSecs < newBestTimes[route.id]) {
            newBestTimes[route.id] = tripSecs;
          }
        }

        // ── Trip efficiency tracking ──────────────────────────────────────────
        const newBestEfficiency = { ...state.bestEfficiency };
        const tripKwh = (updates.totalKwhUsed ?? state.totalKwhUsed) - state.kwhUsedAtDriveStart;
        if (tripKwh > 0) {
          const effMiKwh = route.distanceMi / tripKwh;
          if (!(route.id in newBestEfficiency) || effMiKwh > newBestEfficiency[route.id]) {
            newBestEfficiency[route.id] = effMiKwh;
          }
        }

        const newTotalCreditsEarned = state.totalCreditsEarned + totalEarned;

        const log = {
          routeName: route.name,
          carName: `${car.brand} ${car.name}`,
          distanceMi: route.distanceMi,
          kwhUsed: (updates.totalKwhUsed ?? state.totalKwhUsed) - state.kwhUsedAtDriveStart,
          kwhCharged: (updates.totalKwhCharged ?? state.totalKwhCharged) - state.kwhChargedAtDriveStart,
          creditsEarned: totalEarned,
          completed: true,
        };
        const msg = fullChargeBonus > 0
          ? `Route complete! +${reward} credits ⚡ Full-charge bonus +${fullChargeBonus}!`
          : `Route complete! +${reward} credits`;

        const nextBeforeAch: GameState = {
          ...next,
          credits: next.credits + totalEarned,
          totalTrips: state.totalTrips + 1,
          totalCreditsEarned: newTotalCreditsEarned,
          driving: false,
          speedMph: 0,
          tripChargingCost: 0,
          log: [log, ...state.log].slice(0, 50),
          bestTimes: newBestTimes,
          bestEfficiency: newBestEfficiency,
        };

        // ── Achievement checks on route complete ──────────────────────────────
        const routeAchievements = checkAchievements(state, nextBeforeAch);

        // Additional route-specific achievements
        if (route.distanceMi >= 350 && !nextBeforeAch.achievements.includes('long_hauler')) {
          routeAchievements.push('long_hauler');
        }
        if (tripKwh > 0 && route.distanceMi / tripKwh >= 5 && !nextBeforeAch.achievements.includes('efficiency_king')) {
          routeAchievements.push('efficiency_king');
        }
        if (newBat >= maxBat && !nextBeforeAch.achievements.includes('full_tank')) {
          routeAchievements.push('full_tank');
        }
        if (state.totalKwhCharged === state.kwhChargedAtDriveStart && !nextBeforeAch.achievements.includes('eco_driver')) {
          routeAchievements.push('eco_driver');
        }

        const allCurrentAch = nextBeforeAch.achievements;
        const dedupedNew = routeAchievements.filter(id => !allCurrentAch.includes(id));
        const finalAchievements = dedupedNew.length > 0
          ? [...allCurrentAch, ...dedupedNew]
          : allCurrentAch;

        next = notify(
          { ...nextBeforeAch, achievements: finalAchievements },
          msg
        );
      } else if (dead) {
        const log = {
          routeName: route.name,
          carName: `${car.brand} ${car.name}`,
          distanceMi: newPos,
          kwhUsed: (updates.totalKwhUsed ?? state.totalKwhUsed) - state.kwhUsedAtDriveStart,
          kwhCharged: (updates.totalKwhCharged ?? state.totalKwhCharged) - state.kwhChargedAtDriveStart,
          creditsEarned: 0,
          completed: false,
        };
        const deadState: GameState = {
          ...next,
          driving: false,
          speedMph: 0,
          log: [log, ...state.log].slice(0, 50),
        };
        // Check mileage-based achievements even on a failed drive (totalMilesDriven accumulated)
        const deadAch = checkAchievements(next, deadState);
        next = notify(
          deadAch.length > 0
            ? { ...deadState, achievements: [...deadState.achievements, ...deadAch] }
            : deadState,
          'Battery dead! Drive failed.'
        );
      }

      return next;
    }

    default:
      return state;
  }
}
