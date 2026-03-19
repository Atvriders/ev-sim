import type { CarModel } from './types';

// efficiencyMiKwh = mi/kWh (higher = more efficient)
// All values derived from EPA range ÷ usable kWh.
// Used/older models use real EPA figures from their model year.
// List is sorted ascending by price.
export const CARS: CarModel[] = [

  // ── Used / Classic EVs ────────────────────────────────────────────────────
  // These are real older models with limited range, slow charging, and low prices.

  { id: 'nissan_leaf_2011',  brand: 'Nissan (Used)',    name: '2011 LEAF 24kWh',        batteryKwh: 21.3, rangeEpa: 73,  efficiencyMiKwh: 3.43, maxChargeKw: 50,  zeroToSixty: 11.5, dragCd: 0.29, weightLbs: 3366, price: 0,     color: '#4a90d9', emoji: '🍃' },
  { id: 'mitsubishi_imiev',  brand: 'Mitsubishi (Used)',name: '2012 i-MiEV',             batteryKwh: 16.0, rangeEpa: 62,  efficiencyMiKwh: 3.88, maxChargeKw: 50,  zeroToSixty: 13.0, dragCd: 0.28, weightLbs: 2579, price: 250,   color: '#e8b4d0', emoji: '🟣' },
  { id: 'smart_ed_2013',     brand: 'Smart (Used)',     name: '2013 ForTwo Electric',   batteryKwh: 17.6, rangeEpa: 68,  efficiencyMiKwh: 3.86, maxChargeKw: 22,  zeroToSixty: 11.5, dragCd: 0.32, weightLbs: 1874, price: 400,   color: '#ff4444', emoji: '🚗' },
  { id: 'fiat_500e_2014',    brand: 'Fiat (Used)',      name: '2014 500e',              batteryKwh: 24.0, rangeEpa: 87,  efficiencyMiKwh: 3.63, maxChargeKw: 50,  zeroToSixty: 8.9,  dragCd: 0.31, weightLbs: 2980, price: 600,   color: '#c0392b', emoji: '🇮🇹' },
  { id: 'bmw_i3_2014',       brand: 'BMW (Used)',       name: '2014 i3',                batteryKwh: 22.0, rangeEpa: 81,  efficiencyMiKwh: 3.68, maxChargeKw: 50,  zeroToSixty: 7.0,  dragCd: 0.29, weightLbs: 2799, price: 800,   color: '#1c3a6e', emoji: '⚪' },
  { id: 'vw_egolf_2015',     brand: 'Volkswagen (Used)',name: '2015 e-Golf',            batteryKwh: 24.2, rangeEpa: 83,  efficiencyMiKwh: 3.43, maxChargeKw: 40,  zeroToSixty: 10.4, dragCd: 0.28, weightLbs: 3455, price: 1000,  color: '#3d7ec8', emoji: '⛳' },
  { id: 'chevy_spark_ev',    brand: 'Chevrolet (Used)', name: '2016 Spark EV',          batteryKwh: 19.0, rangeEpa: 82,  efficiencyMiKwh: 4.32, maxChargeKw: 50,  zeroToSixty: 7.6,  dragCd: 0.31, weightLbs: 2866, price: 1200,  color: '#ffd700', emoji: '⚡' },
  { id: 'chevy_bolt_2017',   brand: 'Chevrolet (Used)', name: '2017 Bolt EV',           batteryKwh: 60.0, rangeEpa: 238, efficiencyMiKwh: 3.97, maxChargeKw: 50,  zeroToSixty: 6.5,  dragCd: 0.32, weightLbs: 3580, price: 1500,  color: '#e8a020', emoji: '🟡' },
  { id: 'nissan_leaf_40',    brand: 'Nissan (Used)',    name: '2018 LEAF 40kWh',        batteryKwh: 40.0, rangeEpa: 151, efficiencyMiKwh: 3.78, maxChargeKw: 100, zeroToSixty: 7.4,  dragCd: 0.28, weightLbs: 3527, price: 1800,  color: '#2980b9', emoji: '🍃' },
  { id: 'kia_soul_ev',       brand: 'Kia (Used)',       name: '2019 Soul EV',           batteryKwh: 64.0, rangeEpa: 243, efficiencyMiKwh: 3.80, maxChargeKw: 100, zeroToSixty: 7.9,  dragCd: 0.29, weightLbs: 3780, price: 2200,  color: '#922b21', emoji: '🟫' },

  // ── Modern Budget ─────────────────────────────────────────────────────────
  { id: 'mini_se',           brand: 'MINI',             name: 'Cooper SE',              batteryKwh: 33.0, rangeEpa: 114, efficiencyMiKwh: 3.46, maxChargeKw: 50,  zeroToSixty: 6.9,  dragCd: 0.30, weightLbs: 3153, price: 2800,  color: '#e8a020', emoji: '🟤' },
  { id: 'nissan_leaf_plus',  brand: 'Nissan',           name: 'LEAF PLUS',              batteryKwh: 62.0, rangeEpa: 212, efficiencyMiKwh: 3.42, maxChargeKw: 100, zeroToSixty: 6.5,  dragCd: 0.29, weightLbs: 3748, price: 3400,  color: '#2980b9', emoji: '🍃' },
  { id: 'mazda_mx30',        brand: 'Mazda',            name: 'MX-30 EV',               batteryKwh: 35.5, rangeEpa: 100, efficiencyMiKwh: 2.82, maxChargeKw: 50,  zeroToSixty: 8.7,  dragCd: 0.31, weightLbs: 3891, price: 3800,  color: '#c0392b', emoji: '🔴' },
  { id: 'byd_atto3',         brand: 'BYD',              name: 'Atto 3',                 batteryKwh: 60.5, rangeEpa: 250, efficiencyMiKwh: 4.13, maxChargeKw: 80,  zeroToSixty: 7.3,  dragCd: 0.29, weightLbs: 4299, price: 4200,  color: '#27ae60', emoji: '🌿' },
  { id: 'jeep_avenger',      brand: 'Jeep',             name: 'Avenger BEV',            batteryKwh: 54.0, rangeEpa: 249, efficiencyMiKwh: 4.61, maxChargeKw: 100, zeroToSixty: 7.0,  dragCd: 0.31, weightLbs: 3472, price: 4800,  color: '#117a65', emoji: '🟢' },
  { id: 'chevy_bolt',        brand: 'Chevrolet',        name: 'Bolt EV',                batteryKwh: 65.0, rangeEpa: 259, efficiencyMiKwh: 3.98, maxChargeKw: 55,  zeroToSixty: 6.5,  dragCd: 0.32, weightLbs: 3589, price: 5500,  color: '#ffd700', emoji: '🟡' },
  { id: 'subaru_solterra',   brand: 'Subaru',           name: 'Solterra AWD',           batteryKwh: 71.4, rangeEpa: 222, efficiencyMiKwh: 3.11, maxChargeKw: 100, zeroToSixty: 6.5,  dragCd: 0.29, weightLbs: 4596, price: 6200,  color: '#2471a3', emoji: '🔷' },
  { id: 'volvo_ex30',        brand: 'Volvo',            name: 'EX30 Single Motor',      batteryKwh: 69.0, rangeEpa: 275, efficiencyMiKwh: 3.98, maxChargeKw: 153, zeroToSixty: 5.1,  dragCd: 0.27, weightLbs: 3946, price: 6800,  color: '#2ecc71', emoji: '🌿' },

  // ── Mid Range ─────────────────────────────────────────────────────────────
  { id: 'hyundai_ioniq5',    brand: 'Hyundai',          name: 'IONIQ 5 Long Range',     batteryKwh: 77.4, rangeEpa: 266, efficiencyMiKwh: 3.44, maxChargeKw: 235, zeroToSixty: 5.1,  dragCd: 0.29, weightLbs: 4564, price: 7500,  color: '#4fa3e0', emoji: '🔷' },
  { id: 'kia_ev6_lr',        brand: 'Kia',              name: 'EV6 Long Range RWD',     batteryKwh: 77.4, rangeEpa: 310, efficiencyMiKwh: 4.00, maxChargeKw: 235, zeroToSixty: 7.4,  dragCd: 0.28, weightLbs: 4585, price: 8200,  color: '#e74c3c', emoji: '🔴' },
  { id: 'vw_id4',            brand: 'Volkswagen',       name: 'ID.4 Pro S',             batteryKwh: 82.0, rangeEpa: 275, efficiencyMiKwh: 3.36, maxChargeKw: 135, zeroToSixty: 5.4,  dragCd: 0.28, weightLbs: 4594, price: 9000,  color: '#3d7ec8', emoji: '🔵' },
  { id: 'ford_mache',        brand: 'Ford',             name: 'Mustang Mach-E GT',      batteryKwh: 91.0, rangeEpa: 270, efficiencyMiKwh: 2.97, maxChargeKw: 150, zeroToSixty: 3.5,  dragCd: 0.30, weightLbs: 5498, price: 10000, color: '#b22222', emoji: '🔵' },
  { id: 'honda_prologue',    brand: 'Honda',            name: 'Prologue AWD',           batteryKwh: 85.0, rangeEpa: 273, efficiencyMiKwh: 3.21, maxChargeKw: 150, zeroToSixty: 5.0,  dragCd: 0.29, weightLbs: 4559, price: 10500, color: '#e74c3c', emoji: '🔴' },
  { id: 'nissan_ariya',      brand: 'Nissan',           name: 'Ariya e-4ORCE',          batteryKwh: 87.0, rangeEpa: 265, efficiencyMiKwh: 3.05, maxChargeKw: 130, zeroToSixty: 5.0,  dragCd: 0.27, weightLbs: 4718, price: 11000, color: '#1a6e9a', emoji: '🍃' },
  { id: 'vw_idbuzz',         brand: 'Volkswagen',       name: 'ID.Buzz',                batteryKwh: 82.0, rangeEpa: 234, efficiencyMiKwh: 2.86, maxChargeKw: 170, zeroToSixty: 7.0,  dragCd: 0.29, weightLbs: 5069, price: 12000, color: '#ff8c00', emoji: '🚌' },
  { id: 'hyundai_ioniq6',    brand: 'Hyundai',          name: 'IONIQ 6 Long Range',     batteryKwh: 77.4, rangeEpa: 361, efficiencyMiKwh: 4.67, maxChargeKw: 235, zeroToSixty: 5.1,  dragCd: 0.21, weightLbs: 4234, price: 13000, color: '#1a5276', emoji: '🔷' },
  { id: 'volvo_ex40',        brand: 'Volvo',            name: 'EX40 Recharge',          batteryKwh: 82.0, rangeEpa: 249, efficiencyMiKwh: 3.04, maxChargeKw: 150, zeroToSixty: 5.3,  dragCd: 0.29, weightLbs: 4585, price: 14000, color: '#27ae60', emoji: '🌿' },
  { id: 'byd_han',           brand: 'BYD',              name: 'Han EV AWD',             batteryKwh: 85.4, rangeEpa: 323, efficiencyMiKwh: 3.78, maxChargeKw: 120, zeroToSixty: 3.9,  dragCd: 0.23, weightLbs: 5026, price: 15000, color: '#1a6e3c', emoji: '🌿' },

  // ── Upper Mid ─────────────────────────────────────────────────────────────
  { id: 'tesla_m3_rwd',      brand: 'Tesla',            name: 'Model 3 RWD',            batteryKwh: 60.0, rangeEpa: 272, efficiencyMiKwh: 4.55, maxChargeKw: 170, zeroToSixty: 5.8,  dragCd: 0.23, weightLbs: 3582, price: 16000, color: '#c8cdd6', emoji: '⚡' },
  { id: 'kia_ev9',           brand: 'Kia',              name: 'EV9 Long Range AWD',     batteryKwh: 99.8, rangeEpa: 280, efficiencyMiKwh: 2.81, maxChargeKw: 240, zeroToSixty: 5.3,  dragCd: 0.28, weightLbs: 6009, price: 17000, color: '#922b21', emoji: '🔴' },
  { id: 'genesis_gv60',      brand: 'Genesis',          name: 'GV60 Performance',       batteryKwh: 77.4, rangeEpa: 235, efficiencyMiKwh: 3.04, maxChargeKw: 235, zeroToSixty: 3.6,  dragCd: 0.27, weightLbs: 4519, price: 18500, color: '#c0392b', emoji: '🌟' },
  { id: 'polestar_2',        brand: 'Polestar',         name: 'Polestar 2 Long Range',  batteryKwh: 82.0, rangeEpa: 270, efficiencyMiKwh: 3.30, maxChargeKw: 205, zeroToSixty: 4.5,  dragCd: 0.27, weightLbs: 4685, price: 20000, color: '#2c3e50', emoji: '⭐' },
  { id: 'tesla_m3_lr',       brand: 'Tesla',            name: 'Model 3 Long Range',     batteryKwh: 82.0, rangeEpa: 358, efficiencyMiKwh: 4.37, maxChargeKw: 250, zeroToSixty: 4.2,  dragCd: 0.23, weightLbs: 3648, price: 22000, color: '#e8e8e8', emoji: '⚡' },
  { id: 'cadillac_lyriq',    brand: 'Cadillac',         name: 'LYRIQ RWD',              batteryKwh: 102.0,rangeEpa: 307, efficiencyMiKwh: 3.01, maxChargeKw: 190, zeroToSixty: 4.9,  dragCd: 0.30, weightLbs: 5733, price: 24000, color: '#d4af37', emoji: '💛' },
  { id: 'merc_eqe',          brand: 'Mercedes',         name: 'EQE 350+',               batteryKwh: 90.6, rangeEpa: 305, efficiencyMiKwh: 3.37, maxChargeKw: 170, zeroToSixty: 5.9,  dragCd: 0.22, weightLbs: 5350, price: 26000, color: '#909090', emoji: '⭐' },
  { id: 'bmw_i4_m50',        brand: 'BMW',              name: 'i4 M50',                 batteryKwh: 83.9, rangeEpa: 227, efficiencyMiKwh: 2.70, maxChargeKw: 205, zeroToSixty: 3.7,  dragCd: 0.24, weightLbs: 5023, price: 28000, color: '#003399', emoji: '⚪' },

  // ── Premium ───────────────────────────────────────────────────────────────
  { id: 'tesla_my',          brand: 'Tesla',            name: 'Model Y Long Range',     batteryKwh: 82.0, rangeEpa: 330, efficiencyMiKwh: 4.03, maxChargeKw: 250, zeroToSixty: 4.8,  dragCd: 0.25, weightLbs: 4416, price: 32000, color: '#b0b8c8', emoji: '⚡' },
  { id: 'ford_lightning',    brand: 'Ford',             name: 'F-150 Lightning ER',     batteryKwh: 131.0,rangeEpa: 320, efficiencyMiKwh: 2.44, maxChargeKw: 150, zeroToSixty: 4.0,  dragCd: 0.40, weightLbs: 6590, price: 35000, color: '#1a3a6e', emoji: '🔵' },
  { id: 'rivian_r1t',        brand: 'Rivian',           name: 'R1T Adventure',          batteryKwh: 135.0,rangeEpa: 314, efficiencyMiKwh: 2.33, maxChargeKw: 220, zeroToSixty: 3.0,  dragCd: 0.32, weightLbs: 7148, price: 38000, color: '#4a8a5c', emoji: '🟢' },
  { id: 'bmw_ix',            brand: 'BMW',              name: 'iX xDrive50',            batteryKwh: 111.0,rangeEpa: 324, efficiencyMiKwh: 2.92, maxChargeKw: 195, zeroToSixty: 4.4,  dragCd: 0.25, weightLbs: 5856, price: 42000, color: '#1a1a2e', emoji: '⚪' },
  { id: 'polestar_3',        brand: 'Polestar',         name: 'Polestar 3',             batteryKwh: 111.0,rangeEpa: 315, efficiencyMiKwh: 2.84, maxChargeKw: 250, zeroToSixty: 4.7,  dragCd: 0.29, weightLbs: 5647, price: 46000, color: '#1c2833', emoji: '⭐' },
  { id: 'chevy_silverado',   brand: 'Chevrolet',        name: 'Silverado EV WT',        batteryKwh: 200.0,rangeEpa: 450, efficiencyMiKwh: 2.25, maxChargeKw: 350, zeroToSixty: 4.5,  dragCd: 0.39, weightLbs: 8532, price: 50000, color: '#8b0000', emoji: '🟡' },
  { id: 'rivian_r1s',        brand: 'Rivian',           name: 'R1S Max Pack',           batteryKwh: 149.0,rangeEpa: 389, efficiencyMiKwh: 2.61, maxChargeKw: 220, zeroToSixty: 3.0,  dragCd: 0.33, weightLbs: 7996, price: 55000, color: '#2d5e3a', emoji: '🟢' },
  { id: 'audi_q8_etron',     brand: 'Audi',             name: 'Q8 e-tron 55',           batteryKwh: 114.0,rangeEpa: 285, efficiencyMiKwh: 2.50, maxChargeKw: 170, zeroToSixty: 5.6,  dragCd: 0.28, weightLbs: 5842, price: 60000, color: '#4a0000', emoji: '🔴' },
  { id: 'tesla_ms',          brand: 'Tesla',            name: 'Model S Plaid',          batteryKwh: 100.0,rangeEpa: 405, efficiencyMiKwh: 4.05, maxChargeKw: 250, zeroToSixty: 1.99, dragCd: 0.208,weightLbs: 4766, price: 68000, color: '#f5f5f0', emoji: '⚡' },
  { id: 'merc_eqs',          brand: 'Mercedes',         name: 'EQS 450+',               batteryKwh: 108.0,rangeEpa: 350, efficiencyMiKwh: 3.25, maxChargeKw: 200, zeroToSixty: 5.5,  dragCd: 0.20, weightLbs: 5783, price: 75000, color: '#c0c0c0', emoji: '⭐' },
  { id: 'audi_etron_gt',     brand: 'Audi',             name: 'e-tron GT quattro',      batteryKwh: 93.4, rangeEpa: 238, efficiencyMiKwh: 2.55, maxChargeKw: 270, zeroToSixty: 3.9,  dragCd: 0.24, weightLbs: 5423, price: 82000, color: '#8b0000', emoji: '🔴' },
  { id: 'tesla_ct',          brand: 'Tesla',            name: 'Cybertruck AWD',         batteryKwh: 123.0,rangeEpa: 340, efficiencyMiKwh: 2.76, maxChargeKw: 250, zeroToSixty: 4.1,  dragCd: 0.39, weightLbs: 6843, price: 90000, color: '#d0d0d0', emoji: '⚡' },
  { id: 'porsche_taycan',    brand: 'Porsche',          name: 'Taycan 4S',              batteryKwh: 93.4, rangeEpa: 225, efficiencyMiKwh: 2.41, maxChargeKw: 270, zeroToSixty: 3.8,  dragCd: 0.22, weightLbs: 5060, price: 100000,color: '#e74c3c', emoji: '🏎️' },

  // ── Ultra Premium ─────────────────────────────────────────────────────────
  { id: 'gmc_hummer',        brand: 'GMC',              name: 'HUMMER EV Edition 1',    batteryKwh: 212.0,rangeEpa: 329, efficiencyMiKwh: 1.55, maxChargeKw: 350, zeroToSixty: 3.0,  dragCd: 0.48, weightLbs: 9063, price: 120000,color: '#808000', emoji: '🪖' },
  { id: 'lucid_air_gt',      brand: 'Lucid',            name: 'Air Grand Touring',      batteryKwh: 118.0,rangeEpa: 516, efficiencyMiKwh: 4.37, maxChargeKw: 300, zeroToSixty: 3.0,  dragCd: 0.21, weightLbs: 5226, price: 150000,color: '#8e44ad', emoji: '💜' },
];

export function getCar(id: string): CarModel {
  return CARS.find(c => c.id === id) ?? CARS[0];
}

export const BRANDS = [...new Set(CARS.map(c => c.brand))].sort();
