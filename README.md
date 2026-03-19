# EV Sim

A browser-based electric vehicle driving simulator. Manage battery, tackle hills, stop at charging stations, and build out your fleet with upgrades.

## Gameplay

- **Drive** routes across varying terrain — uphills drain the battery, downhills regenerate it
- **Charge** at Level 1 outlets, Level 2 stations, or DC fast chargers (speed scales with kW)
- **Buy cars** from 40 real EV models across 23 brands, each with accurate EPA efficiency (mi/kWh)
- **Install upgrades** — aerodynamics, regen boost, battery packs, solar roof, and more
- **Plan routes** — 8 routes from a 40-mile city loop to a 600-mile cross-country sprint
- **Route Planner upgrade** — shows estimated battery % at every DC fast charger ahead and warns you when a gap is unreachable

## Cars

Includes models from Tesla, Rivian, Ford, Chevy, BMW, Mercedes, Audi, Volkswagen, Hyundai, Kia, Nissan, Lucid, Polestar, Porsche, Volvo, GMC, Cadillac, Genesis, Honda, Subaru, MINI, BYD, Mazda, and Jeep.

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
