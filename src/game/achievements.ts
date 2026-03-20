export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_trip',       name: 'First Trip',           desc: 'Complete your first route.',                              icon: '🏁' },
  { id: 'road_warrior',     name: 'Road Warrior',          desc: 'Drive 500+ total miles.',                                 icon: '🛣️' },
  { id: 'marathon',         name: 'Marathon',              desc: 'Drive 1,000+ total miles.',                               icon: '🏃' },
  { id: 'cross_country',    name: 'Cross-Country',         desc: 'Drive 5,000+ total miles.',                               icon: '🗺️' },
  { id: 'speed_demon',      name: 'Speed Demon',           desc: 'Drive more than 15 mph over the speed limit.',            icon: '💨' },
  { id: 'eco_driver',       name: 'Eco Driver',            desc: 'Complete a route without stopping to charge.',            icon: '🌿' },
  { id: 'full_tank',        name: 'Full Tank Finish',      desc: 'Finish a route at 100% battery for the bonus.',           icon: '⚡' },
  { id: 'power_shopper',    name: 'Power Shopper',         desc: 'Own 5 or more cars.',                                     icon: '🏎️' },
  { id: 'gearhead',         name: 'Gearhead',              desc: 'Install your first upgrade.',                             icon: '🔧' },
  { id: 'fully_loaded',     name: 'Fully Loaded',          desc: 'Install 10 or more upgrades.',                            icon: '⚙️' },
  { id: 'long_hauler',      name: 'Long Hauler',           desc: 'Complete a route of 350+ miles.',                         icon: '🚛' },
  { id: 'penny_pincher',    name: 'Penny Pincher',         desc: 'Earn 10,000+ total credits.',                             icon: '💰' },
  { id: 'big_spender',      name: 'Big Spender',           desc: 'Earn 50,000+ total credits.',                             icon: '💎' },
  { id: 'time_traveler',    name: 'Time Traveler',         desc: 'Use 100× time scale during a drive.',                     icon: '⏱️' },
  { id: 'solar_powered',    name: 'Solar Powered',         desc: 'Install the Solar Roof upgrade.',                         icon: '☀️' },
  { id: 'v2g_master',       name: 'Grid Warrior',          desc: 'Install the V2G Module.',                                 icon: '🔋' },
  { id: 'fleet_manager',    name: 'Fleet Manager',         desc: 'Own 10 or more cars.',                                    icon: '🏭' },
  { id: 'efficiency_king',  name: 'Efficiency King',       desc: 'Achieve 5+ mi/kWh on a single trip.',                    icon: '📊' },
  { id: 'ten_trips',        name: 'Frequent Flyer',        desc: 'Complete 10 trips.',                                      icon: '✈️' },
  { id: 'fifty_trips',      name: 'Road Veteran',          desc: 'Complete 50 trips.',                                      icon: '🏆' },
];

export const ACHIEVEMENT_MAP: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map(a => [a.id, a])
);
