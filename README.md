# EV Sim

A browser-based electric vehicle driving simulator. Manage battery, tackle hills, stop at charging stations, and build out your fleet with upgrades.

## Gameplay

- **Drive** routes across varying terrain — uphills drain the battery, downhills regenerate it
- **Charge** at Level 1 outlets, Level 2 stations, or DC fast chargers (speed scales with kW)
- **Auto-stop charging** — charging stops automatically at 100% and the drive resumes
- **Buy cars** from 50 real EV models split into Used/Classic (2011–2019) and New/Modern (2025+), each with accurate EPA efficiency (mi/kWh) and real-world pricing
- **Install upgrades** — aerodynamics, regen boost, battery packs, solar roof, and more
- **Plan routes** — 8 routes from a 40-mile city loop to a 600-mile cross-country sprint
- **Queue charging** — click Queue on an upcoming charger; car auto-stops and charges on arrival
- **Speeding** — drive as fast as you want; up to 5 mph over the limit is a free tolerance zone, beyond that you rack up fines per mph per second
- **Destination landmark** — each route ends with a checkered-flag finish building on the canvas

## Canvas View

The driving canvas shows a **1-mile viewport** (zooms to 5 miles at 25×+ time scale) with:

- Route-themed parallax backgrounds — city skyline, coastal ocean, mountain peaks, desert mesas, alpine aurora, interstate plains, valley farmland, cross-country countryside
- Smooth terrain elevation drawn in real time with ground fill and shoulder detail
- Guard rails on mountain/alpine routes; concrete curbs on city routes
- Charger stations rendered on the road with glow when active
- Car silhouette matched to the model's body style (sedan, sport, SUV, hatchback, truck, van, compact)
- Spinning 5-spoke wheels that rotate relative to ground speed
- Speed in the HUD turns red when over the speed limit; US-style speed limit sign

## Charging

The inline charger banner (always visible, no scrolling needed) shows:

- **Charger max → Car limit = Actual rate** so you can see the bottleneck at a glance
- Estimated time to 80% and to full
- **Queue** button when approaching; **Charge** button when at the station
- Auto-charges on arrival when queued; auto-stops at 100%

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
| Adaptive Cruise Control | Drives 5 mph over the speed limit — maximum legal speed, zero fines |
| DC Fast Charge Planner | Shows DCFC stops ahead with estimated arrival battery % |

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
