# EV Sim

A browser-based electric vehicle driving simulator. Manage battery, tackle hills, stop at charging stations, and build out your fleet with upgrades.

## Gameplay

- **Drive** routes across varying terrain — uphills drain the battery, downhills regenerate it
- **Charge** at Level 1 outlets, Level 2 stations, or DC fast chargers (speed scales with kW)
- **Buy cars** from 50 real EV models split into Used/Classic (2011–2019) and New/Modern (2025+), each with accurate EPA efficiency (mi/kWh) and real-world pricing
- **Install upgrades** — aerodynamics, regen boost, battery packs, solar roof, and more
- **Plan routes** — 8 routes from a 40-mile city loop to a 600-mile cross-country sprint
- **Route Planner upgrade** — shows estimated battery % at every DC fast charger ahead and warns when a gap is unreachable
- **Autopilot Module upgrade** — unlocks 50× and 100× simulation speed
- **Queue charging** — click Queue on an upcoming charger to auto-stop and charge when you arrive
- **Adaptive Cruise Control upgrade** — automatically matches your speed to the posted limit in every zone

## Canvas View

The driving canvas shows a **5-mile viewport** with:

- Parallax scrolling background (stars, mountains, clouds, hills, trees)
- Smooth terrain elevation drawn in real time
- Car silhouette matched to the model's actual body style (sedan, sport, SUV, hatchback, truck, van, compact)
- Spinning wheels that rotate relative to ground speed

## Cars

**50 models** across Used/Classic and New/Modern groups, sorted by price within each group.

Brands: Tesla, Rivian, Ford, Chevy, BMW, Mercedes, Audi, Volkswagen, Hyundai, Kia, Nissan, Lucid, Polestar, Porsche, Volvo, GMC, Cadillac, Genesis, Honda, Subaru, MINI, BYD, Mazda, Jeep, Mitsubishi, Smart, Fiat

## Upgrades

| Upgrade | Effect |
|---|---|
| Aero Kit | +8% efficiency |
| Lightweight Wheels | +5% efficiency, +5% regen |
| Thermal Management | +6% efficiency, +5 kWh battery |
| Regen Boost | +20% regen |
| Battery Pack+ | +20 kWh capacity |
| Eco Chip | +10% efficiency |
| Solar Roof | +1.5 kW passive charge while driving |
| Heat Pump HVAC | +7% efficiency |
| Low-Roll Tires | +4% efficiency, +3% regen |
| Sport Tune | −5% efficiency, +10% regen |
| Autopilot Module | Unlocks 50× and 100× time scale |
| Adaptive Cruise Control | Auto-matches target speed to posted speed limit |
| DC Fast Charge Planner | Shows DCFC stops ahead with arrival battery % |

## Stack

- React 18 + TypeScript + Vite
- Canvas 2D for the terrain/driving view
- LocalStorage autosave

## Running with Docker

```bash
docker compose pull
docker compose up -d
```

Runs on **port 3003**. The image is built and published to GitHub Container Registry on every push to `master` via GitHub Actions.

## Local Development

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```
