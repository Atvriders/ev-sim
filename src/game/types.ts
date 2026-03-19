export interface CarModel {
  id: string;
  brand: string;
  name: string;
  batteryKwh: number;      // usable kWh
  rangeEpa: number;        // EPA miles
  efficiencyMiKwh: number; // mi/kWh baseline (higher = better)
  maxChargeKw: number;     // max AC+DC charge rate accepted
  zeroToSixty: number;     // seconds
  dragCd: number;          // drag coefficient
  weightLbs: number;
  price: number;           // in-game currency (0 = starter)
  color: string;           // primary canvas colour
  emoji: string;           // brand/model emoji for UI
}

export type UpgradeId =
  | 'aero_kit' | 'lightweight_wheels' | 'thermal_mgmt'
  | 'regen_boost' | 'battery_plus' | 'eco_chip'
  | 'solar_roof' | 'heat_pump' | 'performance_tires' | 'sport_tune'
  | 'route_planner';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  desc: string;
  price: number;
  efficiencyBonus: number;  // fraction: 0.08 = 8% less consumption
  regenBonus:      number;  // fraction: 0.10 = 10% more regen
  batteryBonus:    number;  // extra kWh added to battery
  freeKw:          number;  // passive free kW (solar)
}

export interface ChargerStation {
  id: string;
  name: string;
  network: string;
  positionMi: number;       // miles from route start
  maxKw: number;
  pricePerKwh: number;      // $/kWh (in-game credits)
}

export interface TerrainPoint {
  distanceMi: number;
  elevationFt: number;
  speedLimitMph: number;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  distanceMi: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  reward: number;           // credits on completion
  unlockAfterTrips: number; // how many trips needed to unlock
  terrain: TerrainPoint[];
  chargers: ChargerStation[];
}

export interface DriveLog {
  routeName: string;
  carName: string;
  distanceMi: number;
  kwhUsed: number;
  kwhCharged: number;
  creditsEarned: number;
  completed: boolean;
}

export interface GameState {
  // Economy
  credits: number;
  totalTrips: number;

  // Fleet
  selectedCar: string;
  ownedCars: string[];
  upgrades: UpgradeId[];

  // Active drive
  driving: boolean;
  paused: boolean;
  timeScale: number;           // 1 | 5 | 10
  battery: number;             // current kWh
  speedMph: number;            // current speed
  targetSpeedMph: number;      // cruise target
  positionMi: number;          // miles into current route
  currentKw: number;           // +draw / -regen
  currentRoute: string | null;
  routeComplete: boolean;
  batteryDead: boolean;

  // Charging
  isCharging: boolean;
  chargeRateKw: number;
  chargingAtId: string | null;

  // Stats
  totalMilesDriven: number;
  totalKwhUsed: number;
  totalKwhCharged: number;
  log: DriveLog[];

  // UI
  tab: 'drive' | 'cars' | 'upgrades' | 'routes' | 'log';
  notification: string;
  notifKey: number;
}

export type Action =
  | { type: 'TICK'; delta: number }
  | { type: 'START_DRIVE'; routeId: string }
  | { type: 'SET_TARGET_SPEED'; mph: number }
  | { type: 'SET_TIME_SCALE'; scale: number }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'START_CHARGE'; chargerId: string }
  | { type: 'STOP_CHARGE' }
  | { type: 'ABANDON_DRIVE' }
  | { type: 'BUY_CAR'; carId: string }
  | { type: 'SELECT_CAR'; carId: string }
  | { type: 'BUY_UPGRADE'; upgradeId: UpgradeId }
  | { type: 'SET_TAB'; tab: GameState['tab'] };
