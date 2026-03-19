import type { CarModel, GameState, Upgrade } from './types';
import { UPGRADE_MAP } from './upgrades';

/** Gravity constant for grade power calculation */
const G = 9.81;         // m/s²
const LBS_TO_KG = 0.4536;
const MI_TO_M   = 1609.34;

/**
 * Compute effective efficiency and regen multipliers from owned upgrades.
 */
export function computeUpgradeStats(upgrades: string[]): {
  efficiencyMult: number;
  regenMult: number;
  batteryBonus: number;
  freeKw: number;
  chargeRateBonus: number;
  fineMultiplier: number;
  v2gReturn: number;
} {
  let efficiencyMult = 1;
  let regenMult = 1;
  let batteryBonus = 0;
  let freeKw = 0;
  let chargeRateBonus = 0;
  let fineMultiplier = 1;
  let v2gReturn = 0;

  for (const id of upgrades) {
    const upg = UPGRADE_MAP[id as keyof typeof UPGRADE_MAP];
    if (!upg) continue;
    efficiencyMult  *= (1 - upg.efficiencyBonus);
    regenMult       *= (1 + upg.regenBonus);
    batteryBonus    += upg.batteryBonus;
    freeKw          += upg.freeKw;
    chargeRateBonus += upg.chargeRateBonus;
    fineMultiplier  *= upg.fineMultiplier;
    v2gReturn       += upg.v2gReturn;
  }

  return { efficiencyMult, regenMult, batteryBonus, freeKw, chargeRateBonus, fineMultiplier, v2gReturn };
}

/**
 * Grade fraction from terrain elevation change over a distance.
 * grade = rise / run  (e.g. 0.06 = 6% grade uphill)
 */
export function gradeAt(
  positionMi: number,
  terrain: { distanceMi: number; elevationFt: number }[]
): number {
  if (terrain.length < 2) return 0;

  // Find surrounding terrain points
  let lo = terrain[0], hi = terrain[terrain.length - 1];
  for (let i = 0; i < terrain.length - 1; i++) {
    if (terrain[i].distanceMi <= positionMi && terrain[i + 1].distanceMi >= positionMi) {
      lo = terrain[i];
      hi = terrain[i + 1];
      break;
    }
  }

  const dMi  = hi.distanceMi  - lo.distanceMi;
  const dFt  = hi.elevationFt - lo.elevationFt;
  if (dMi === 0) return 0;

  const dM   = dMi * MI_TO_M;
  const dM2  = dFt * 0.3048;          // feet → meters
  return dM2 / dM;                    // grade fraction
}

/**
 * Speed limit at a position.
 */
export function speedLimitAt(
  positionMi: number,
  terrain: { distanceMi: number; speedLimitMph: number }[]
): number {
  if (terrain.length === 0) return 65;
  let last = terrain[0];
  for (const pt of terrain) {
    if (pt.distanceMi <= positionMi) last = pt;
    else break;
  }
  return last.speedLimitMph;
}

/**
 * Net power draw (kW) at a given instant.
 *
 * Positive = drawing from battery.
 * Negative = regenerating to battery (never exceeds regenCapKw).
 *
 * Physics model:
 *   P_rolling  = Crr * m * g * v
 *   P_aero     = 0.5 * rho * Cd * A * v³  (A ≈ 2.3 m² for cars)
 *   P_grade    = m * g * grade * v
 *   P_accel    = m * a * v  (simplified, averaged over tick)
 *
 * Then scale by upgrade efficiency multiplier and subtract free kW.
 */
export function computeKw(
  car: CarModel,
  speedMph: number,
  grade: number,
  accelMphS: number,        // mph/s acceleration this tick
  upgrades: string[],
): number {
  const { efficiencyMult, regenMult, freeKw } = computeUpgradeStats(upgrades);

  const massKg    = car.weightLbs * LBS_TO_KG;
  const speedMs   = speedMph * 0.44704;
  const accelMs2  = accelMphS * 0.44704;

  const Crr  = 0.012;    // rolling resistance coefficient (low-roll tires ~0.010)
  const rho  = 1.225;    // air density kg/m³
  const A    = 2.3;      // frontal area m²

  const pRolling = Crr * massKg * G * speedMs;
  const pAero    = 0.5 * rho * car.dragCd * A * Math.pow(speedMs, 3);
  const pGrade   = massKg * G * grade * speedMs;
  const pAccel   = massKg * accelMs2 * speedMs;

  const pTotal   = pRolling + pAero + pGrade + pAccel; // watts
  const kw       = pTotal / 1000;

  if (kw < 0) {
    // Regen: cap at maxChargeKw for regen and scale by regen multiplier
    // freeKw (solar/suspension) also contributes to charging during regen — add, not subtract
    const regenKw = Math.min(Math.abs(kw) * regenMult, car.maxChargeKw * 0.3);
    return -(regenKw + freeKw);
  }

  return Math.max(0, kw * efficiencyMult - freeKw);
}

/**
 * Apply a physics tick to produce next battery/speed/position values.
 * delta is seconds of real simulation time (already scaled by timeScale).
 *
 * Returns updated partial state.
 */
export function physicsTick(
  state: GameState,
  car: CarModel,
  terrain: { distanceMi: number; elevationFt: number; speedLimitMph: number }[],
  upgrades: Upgrade[],
  deltaS: number,
): Partial<GameState> {
  const { speedMph, targetSpeedMph, battery, positionMi } = state;

  // Speed adjustment — 0-60 in car.zeroToSixty seconds → ~60/z mph/s
  const maxAccelMphS  = (60 / car.zeroToSixty) * 3; // 3× game-feel multiplier
  const maxBrakeMphS  = 18;   // comfortable decel
  const diff          = targetSpeedMph - speedMph;
  const accelMphS     = diff > 0
    ? Math.min(diff / deltaS, maxAccelMphS)
    : Math.max(diff / deltaS, -maxBrakeMphS);

  const newSpeedMph = Math.max(0, Math.min(speedMph + accelMphS * deltaS, targetSpeedMph));

  // Grade at current position
  const grade = gradeAt(positionMi, terrain);

  // kW this tick (average of start/end speed for energy)
  const avgSpeed = (speedMph + newSpeedMph) / 2;
  const upgradeIds = upgrades.map(u => u.id);
  const kw = computeKw(car, avgSpeed, grade, accelMphS, upgradeIds);

  // Energy consumed this tick (kWh)
  const deltaKwh = kw * (deltaS / 3600);

  // Distance covered this tick (miles)
  const deltaMi  = avgSpeed * (deltaS / 3600);

  const newBattery = Math.max(0, battery - deltaKwh);
  const newPos     = positionMi + deltaMi;

  return {
    speedMph:     newSpeedMph,
    currentKw:    kw,
    battery:      newBattery,
    positionMi:   newPos,
    totalMilesDriven: state.totalMilesDriven + deltaMi,
    totalKwhUsed:     state.totalKwhUsed + Math.max(0, deltaKwh),
  };
}
