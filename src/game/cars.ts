import type { CarModel } from './types';

// efficiencyMiKwh = mi/kWh (higher = more efficient)
// Derived from EPA Wh/mi: efficiencyMiKwh = 1000 / Wh_per_mi
export const CARS: CarModel[] = [
  // ── Tesla ──────────────────────────────────────────────────────────────────
  { id: 'tesla_m3_rwd',     brand: 'Tesla',      name: 'Model 3 RWD',           batteryKwh: 60,   rangeEpa: 272, efficiencyMiKwh: 4.55, maxChargeKw: 170, zeroToSixty: 5.8, dragCd: 0.23, weightLbs: 3582, price: 0,     color: '#c8cdd6', emoji: '⚡' },
  { id: 'tesla_m3_lr',      brand: 'Tesla',      name: 'Model 3 Long Range',    batteryKwh: 82,   rangeEpa: 358, efficiencyMiKwh: 4.37, maxChargeKw: 250, zeroToSixty: 4.2, dragCd: 0.23, weightLbs: 3648, price: 2800,  color: '#e8e8e8', emoji: '⚡' },
  { id: 'tesla_my',         brand: 'Tesla',      name: 'Model Y Long Range',    batteryKwh: 82,   rangeEpa: 330, efficiencyMiKwh: 4.03, maxChargeKw: 250, zeroToSixty: 4.8, dragCd: 0.25, weightLbs: 4416, price: 3200,  color: '#b0b8c8', emoji: '⚡' },
  { id: 'tesla_ms',         brand: 'Tesla',      name: 'Model S Plaid',         batteryKwh: 100,  rangeEpa: 405, efficiencyMiKwh: 4.05, maxChargeKw: 250, zeroToSixty: 1.99,dragCd: 0.208,weightLbs: 4766, price: 8500,  color: '#f5f5f0', emoji: '⚡' },
  { id: 'tesla_ct',         brand: 'Tesla',      name: 'Cybertruck AWD',        batteryKwh: 123,  rangeEpa: 340, efficiencyMiKwh: 2.76, maxChargeKw: 250, zeroToSixty: 4.1, dragCd: 0.39, weightLbs: 6843, price: 7000,  color: '#d0d0d0', emoji: '⚡' },

  // ── Rivian ─────────────────────────────────────────────────────────────────
  { id: 'rivian_r1t',       brand: 'Rivian',     name: 'R1T Adventure',         batteryKwh: 135,  rangeEpa: 314, efficiencyMiKwh: 2.33, maxChargeKw: 220, zeroToSixty: 3.0, dragCd: 0.32, weightLbs: 7148, price: 5500,  color: '#4a8a5c', emoji: '🟢' },
  { id: 'rivian_r1s',       brand: 'Rivian',     name: 'R1S Max Pack',          batteryKwh: 149,  rangeEpa: 389, efficiencyMiKwh: 2.61, maxChargeKw: 220, zeroToSixty: 3.0, dragCd: 0.33, weightLbs: 7996, price: 6500,  color: '#2d5e3a', emoji: '🟢' },

  // ── Ford ───────────────────────────────────────────────────────────────────
  { id: 'ford_mache',       brand: 'Ford',       name: 'Mustang Mach-E GT',     batteryKwh: 91,   rangeEpa: 270, efficiencyMiKwh: 2.97, maxChargeKw: 150, zeroToSixty: 3.5, dragCd: 0.30, weightLbs: 5498, price: 4000,  color: '#b22222', emoji: '🔵' },
  { id: 'ford_lightning',   brand: 'Ford',       name: 'F-150 Lightning ER',    batteryKwh: 131,  rangeEpa: 320, efficiencyMiKwh: 2.44, maxChargeKw: 150, zeroToSixty: 4.0, dragCd: 0.40, weightLbs: 6590, price: 5000,  color: '#1a3a6e', emoji: '🔵' },

  // ── Chevrolet ──────────────────────────────────────────────────────────────
  { id: 'chevy_bolt',       brand: 'Chevrolet',  name: 'Bolt EV',               batteryKwh: 65,   rangeEpa: 259, efficiencyMiKwh: 3.98, maxChargeKw: 55,  zeroToSixty: 6.5, dragCd: 0.32, weightLbs: 3589, price: 1200,  color: '#ffd700', emoji: '🟡' },
  { id: 'chevy_silverado',  brand: 'Chevrolet',  name: 'Silverado EV WT',       batteryKwh: 200,  rangeEpa: 450, efficiencyMiKwh: 2.25, maxChargeKw: 350, zeroToSixty: 4.5, dragCd: 0.39, weightLbs: 8532, price: 9000,  color: '#8b0000', emoji: '🟡' },

  // ── BMW ────────────────────────────────────────────────────────────────────
  { id: 'bmw_i4_m50',       brand: 'BMW',        name: 'i4 M50',                batteryKwh: 83.9, rangeEpa: 227, efficiencyMiKwh: 2.70, maxChargeKw: 205, zeroToSixty: 3.7, dragCd: 0.24, weightLbs: 5023, price: 5200,  color: '#003399', emoji: '⚪' },
  { id: 'bmw_ix',           brand: 'BMW',        name: 'iX xDrive50',           batteryKwh: 111,  rangeEpa: 324, efficiencyMiKwh: 2.92, maxChargeKw: 195, zeroToSixty: 4.4, dragCd: 0.25, weightLbs: 5856, price: 7200,  color: '#1a1a2e', emoji: '⚪' },

  // ── Mercedes ───────────────────────────────────────────────────────────────
  { id: 'merc_eqs',         brand: 'Mercedes',   name: 'EQS 450+',              batteryKwh: 108,  rangeEpa: 350, efficiencyMiKwh: 3.25, maxChargeKw: 200, zeroToSixty: 5.5, dragCd: 0.20, weightLbs: 5783, price: 8000,  color: '#c0c0c0', emoji: '⭐' },
  { id: 'merc_eqe',         brand: 'Mercedes',   name: 'EQE 350+',              batteryKwh: 90.6, rangeEpa: 305, efficiencyMiKwh: 3.37, maxChargeKw: 170, zeroToSixty: 5.9, dragCd: 0.22, weightLbs: 5350, price: 5800,  color: '#909090', emoji: '⭐' },

  // ── Audi ───────────────────────────────────────────────────────────────────
  { id: 'audi_etron_gt',    brand: 'Audi',       name: 'e-tron GT quattro',     batteryKwh: 93.4, rangeEpa: 238, efficiencyMiKwh: 2.55, maxChargeKw: 270, zeroToSixty: 3.9, dragCd: 0.24, weightLbs: 5423, price: 7600,  color: '#8b0000', emoji: '🔴' },
  { id: 'audi_q8_etron',    brand: 'Audi',       name: 'Q8 e-tron 55',          batteryKwh: 114,  rangeEpa: 285, efficiencyMiKwh: 2.50, maxChargeKw: 170, zeroToSixty: 5.6, dragCd: 0.28, weightLbs: 5842, price: 6400,  color: '#4a0000', emoji: '🔴' },

  // ── Volkswagen ─────────────────────────────────────────────────────────────
  { id: 'vw_id4',           brand: 'Volkswagen', name: 'ID.4 Pro S',            batteryKwh: 82,   rangeEpa: 275, efficiencyMiKwh: 3.36, maxChargeKw: 135, zeroToSixty: 5.4, dragCd: 0.28, weightLbs: 4594, price: 2600,  color: '#3d7ec8', emoji: '🔵' },
  { id: 'vw_idbuzz',        brand: 'Volkswagen', name: 'ID.Buzz',               batteryKwh: 82,   rangeEpa: 234, efficiencyMiKwh: 2.86, maxChargeKw: 170, zeroToSixty: 7.0, dragCd: 0.29, weightLbs: 5069, price: 3000,  color: '#ff8c00', emoji: '🚌' },

  // ── Hyundai ────────────────────────────────────────────────────────────────
  { id: 'hyundai_ioniq5',   brand: 'Hyundai',    name: 'IONIQ 5 Long Range',    batteryKwh: 77.4, rangeEpa: 266, efficiencyMiKwh: 3.44, maxChargeKw: 235, zeroToSixty: 5.1, dragCd: 0.29, weightLbs: 4564, price: 2800,  color: '#4fa3e0', emoji: '🔷' },
  { id: 'hyundai_ioniq6',   brand: 'Hyundai',    name: 'IONIQ 6 Long Range',    batteryKwh: 77.4, rangeEpa: 361, efficiencyMiKwh: 4.67, maxChargeKw: 235, zeroToSixty: 5.1, dragCd: 0.21, weightLbs: 4234, price: 3200,  color: '#1a5276', emoji: '🔷' },

  // ── Kia ────────────────────────────────────────────────────────────────────
  { id: 'kia_ev6_lr',       brand: 'Kia',        name: 'EV6 Long Range RWD',    batteryKwh: 77.4, rangeEpa: 310, efficiencyMiKwh: 4.00, maxChargeKw: 235, zeroToSixty: 7.4, dragCd: 0.28, weightLbs: 4585, price: 2400,  color: '#e74c3c', emoji: '🔴' },
  { id: 'kia_ev9',          brand: 'Kia',        name: 'EV9 Long Range AWD',    batteryKwh: 99.8, rangeEpa: 280, efficiencyMiKwh: 2.81, maxChargeKw: 240, zeroToSixty: 5.3, dragCd: 0.28, weightLbs: 6009, price: 5400,  color: '#922b21', emoji: '🔴' },

  // ── Nissan ─────────────────────────────────────────────────────────────────
  { id: 'nissan_leaf_plus', brand: 'Nissan',     name: 'LEAF PLUS',             batteryKwh: 62,   rangeEpa: 212, efficiencyMiKwh: 3.42, maxChargeKw: 100, zeroToSixty: 6.5, dragCd: 0.29, weightLbs: 3748, price: 800,   color: '#2980b9', emoji: '🍃' },
  { id: 'nissan_ariya',     brand: 'Nissan',     name: 'Ariya e-4ORCE',         batteryKwh: 87,   rangeEpa: 265, efficiencyMiKwh: 3.05, maxChargeKw: 130, zeroToSixty: 5.0, dragCd: 0.27, weightLbs: 4718, price: 3800,  color: '#1a6e9a', emoji: '🍃' },

  // ── Lucid ──────────────────────────────────────────────────────────────────
  { id: 'lucid_air_gt',     brand: 'Lucid',      name: 'Air Grand Touring',     batteryKwh: 118,  rangeEpa: 516, efficiencyMiKwh: 4.37, maxChargeKw: 300, zeroToSixty: 3.0, dragCd: 0.21, weightLbs: 5226, price: 12000, color: '#8e44ad', emoji: '💜' },

  // ── Polestar ───────────────────────────────────────────────────────────────
  { id: 'polestar_2',       brand: 'Polestar',   name: 'Polestar 2 Long Range', batteryKwh: 82,   rangeEpa: 270, efficiencyMiKwh: 3.30, maxChargeKw: 205, zeroToSixty: 4.5, dragCd: 0.27, weightLbs: 4685, price: 3500,  color: '#2c3e50', emoji: '⭐' },
  { id: 'polestar_3',       brand: 'Polestar',   name: 'Polestar 3',            batteryKwh: 111,  rangeEpa: 315, efficiencyMiKwh: 2.84, maxChargeKw: 250, zeroToSixty: 4.7, dragCd: 0.29, weightLbs: 5647, price: 6000,  color: '#1c2833', emoji: '⭐' },

  // ── Porsche ────────────────────────────────────────────────────────────────
  { id: 'porsche_taycan',   brand: 'Porsche',    name: 'Taycan 4S',             batteryKwh: 93.4, rangeEpa: 225, efficiencyMiKwh: 2.41, maxChargeKw: 270, zeroToSixty: 3.8, dragCd: 0.22, weightLbs: 5060, price: 9000,  color: '#e74c3c', emoji: '🏎️' },

  // ── Volvo ──────────────────────────────────────────────────────────────────
  { id: 'volvo_ex30',       brand: 'Volvo',      name: 'EX30 Single Motor',     batteryKwh: 69,   rangeEpa: 275, efficiencyMiKwh: 3.98, maxChargeKw: 153, zeroToSixty: 5.1, dragCd: 0.27, weightLbs: 3946, price: 2000,  color: '#2ecc71', emoji: '🌿' },
  { id: 'volvo_ex40',       brand: 'Volvo',      name: 'EX40 Recharge',         batteryKwh: 82,   rangeEpa: 249, efficiencyMiKwh: 3.04, maxChargeKw: 150, zeroToSixty: 5.3, dragCd: 0.29, weightLbs: 4585, price: 3000,  color: '#27ae60', emoji: '🌿' },

  // ── GMC ────────────────────────────────────────────────────────────────────
  { id: 'gmc_hummer',       brand: 'GMC',        name: 'HUMMER EV Edition 1',   batteryKwh: 212,  rangeEpa: 329, efficiencyMiKwh: 1.55, maxChargeKw: 350, zeroToSixty: 3.0, dragCd: 0.48, weightLbs: 9063, price: 11000, color: '#808000', emoji: '🪖' },

  // ── Cadillac ───────────────────────────────────────────────────────────────
  { id: 'cadillac_lyriq',   brand: 'Cadillac',   name: 'LYRIQ RWD',             batteryKwh: 102,  rangeEpa: 307, efficiencyMiKwh: 3.01, maxChargeKw: 190, zeroToSixty: 4.9, dragCd: 0.30, weightLbs: 5733, price: 5000,  color: '#d4af37', emoji: '💛' },

  // ── Genesis ────────────────────────────────────────────────────────────────
  { id: 'genesis_gv60',     brand: 'Genesis',    name: 'GV60 Performance',      batteryKwh: 77.4, rangeEpa: 235, efficiencyMiKwh: 3.04, maxChargeKw: 235, zeroToSixty: 3.6, dragCd: 0.27, weightLbs: 4519, price: 4200,  color: '#c0392b', emoji: '🌟' },

  // ── Honda ──────────────────────────────────────────────────────────────────
  { id: 'honda_prologue',   brand: 'Honda',      name: 'Prologue AWD',          batteryKwh: 85,   rangeEpa: 273, efficiencyMiKwh: 3.21, maxChargeKw: 150, zeroToSixty: 5.0, dragCd: 0.29, weightLbs: 4559, price: 3400,  color: '#e74c3c', emoji: '🔴' },

  // ── Subaru ─────────────────────────────────────────────────────────────────
  { id: 'subaru_solterra',  brand: 'Subaru',     name: 'Solterra AWD',          batteryKwh: 71.4, rangeEpa: 222, efficiencyMiKwh: 3.11, maxChargeKw: 100, zeroToSixty: 6.5, dragCd: 0.29, weightLbs: 4596, price: 2500,  color: '#2471a3', emoji: '🔷' },

  // ── MINI ───────────────────────────────────────────────────────────────────
  { id: 'mini_se',          brand: 'MINI',       name: 'Cooper SE',             batteryKwh: 33,   rangeEpa: 114, efficiencyMiKwh: 3.46, maxChargeKw: 50,  zeroToSixty: 6.9, dragCd: 0.30, weightLbs: 3153, price: 1500,  color: '#e8a020', emoji: '🟤' },

  // ── BYD ────────────────────────────────────────────────────────────────────
  { id: 'byd_atto3',        brand: 'BYD',        name: 'Atto 3',                batteryKwh: 60.5, rangeEpa: 250, efficiencyMiKwh: 4.13, maxChargeKw: 80,  zeroToSixty: 7.3, dragCd: 0.29, weightLbs: 4299, price: 1800,  color: '#27ae60', emoji: '🌿' },
  { id: 'byd_han',          brand: 'BYD',        name: 'Han EV AWD',            batteryKwh: 85.4, rangeEpa: 323, efficiencyMiKwh: 3.78, maxChargeKw: 120, zeroToSixty: 3.9, dragCd: 0.23, weightLbs: 5026, price: 4600,  color: '#1a6e3c', emoji: '🌿' },

  // ── Mazda ──────────────────────────────────────────────────────────────────
  { id: 'mazda_mx30',       brand: 'Mazda',      name: 'MX-30 EV',              batteryKwh: 35.5, rangeEpa: 100, efficiencyMiKwh: 2.82, maxChargeKw: 50,  zeroToSixty: 8.7, dragCd: 0.31, weightLbs: 3891, price: 1000,  color: '#c0392b', emoji: '🔴' },

  // ── Jeep ───────────────────────────────────────────────────────────────────
  { id: 'jeep_avenger',     brand: 'Jeep',       name: 'Avenger BEV',           batteryKwh: 54,   rangeEpa: 249, efficiencyMiKwh: 4.61, maxChargeKw: 100, zeroToSixty: 7.0, dragCd: 0.31, weightLbs: 3989, price: 1600,  color: '#117a65', emoji: '🟢' },
];

export function getCar(id: string): CarModel {
  return CARS.find(c => c.id === id) ?? CARS[0];
}

export const BRANDS = [...new Set(CARS.map(c => c.brand))].sort();
