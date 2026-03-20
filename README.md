# EV Sim

A browser-based electric vehicle driving simulator. Manage battery, tackle hills, stop at charging stations, and build out your fleet with upgrades.

## Gameplay

- **Drive** routes across varying terrain — uphills drain the battery, downhills regenerate it
- **Charge** at Level 1 outlets, Level 2 stations, or DC fast chargers (speed scales with kW)
- **Auto-stop charging** — charging stops automatically at 100% and the drive resumes
- **Buy cars** from 50 real EV models split into Used/Classic (2011–2019) and New/Modern (2025+), each with accurate EPA efficiency and real-world pricing
- **Install upgrades** — aerodynamics, regen boost, battery packs, solar roof, and more
- **Plan routes** — 10 routes from a 40-mile city loop to a 600-mile cross-country sprint
- **Queue charging** — click Queue on an upcoming charger; car auto-stops and charges on arrival
- **Out of credits** — charging stops automatically if you run out of credits mid-session
- **Speeding** — drive as fast as you want; up to 5 mph over the limit is a free tolerance zone, beyond that you rack up fines per mph per second
- **Economy mode** — caps speed at 55 mph for maximum efficiency; works alongside ACC
- **Destination landmark** — each route ends with a checkered-flag finish building on the canvas
- **Drive starts at 0 mph** — accelerate to your chosen target speed after hitting Start

## Canvas View

The driving canvas shows a **1-mile viewport** (zooms to 5 miles at 25×+ time scale) with:

- Route-themed parallax backgrounds — city skyline, coastal ocean, mountain peaks, desert mesas, alpine aurora, interstate plains, valley farmland, cross-country countryside
- Smooth terrain elevation drawn in real time with ground fill and shoulder detail
- Guard rails on mountain/alpine routes; concrete curbs on city routes
- Animated **train tracks** with passing locomotives on applicable routes (interstate, country, valley, city)
- **Roadside detail** — grass tufts, scree (alpine), and desert pebbles beside the road
- **Charger buildings** — DCFC stations have a canopy and service building; L1/L2 stations have a gas-station canopy and store
- Charger stations rendered on the road with glow when active
- Car silhouette matched to the model's body style (sedan, sport, SUV, hatchback, truck, van, compact)
- Spinning 5-spoke wheels that rotate relative to ground speed
- Speed in the HUD turns red when over the fine threshold (limit+5); US-style speed limit sign with glow
- **Route complete overlay** — on finish, a panel shows the route name and credits earned on the canvas

### 4-lane road with live traffic

- Two player-direction lanes (right side) and two oncoming lanes (left side) with a double yellow centre line
- **12 traffic cars** (6 same-direction, 6 oncoming) using real EV body styles and seeded random colours
- Oncoming cars approach from the right and pass on the left, correctly z-sorted by lane depth so nearer lanes overlap farther ones
- **Traffic keeps moving during charging** — cars continue scrolling at ~28 mph even while the player is stopped at a charger

### Air traffic

- **4 planes** flying across the sky at varying altitudes, speeds and sizes, each with contrails, engine pods, windows, and tail fins
- **1 helicopter** per route with animated spinning main rotor, tail rotor, and skids; hovers with a gentle sine-wave drift
- **1 UFO** per route with a glowing dome, rotating rim lights that cycle colours, a pulsing underside glow, and an occasional tractor beam

### Per-theme weather

Weather is rendered in front of the cars as a foreground layer:

| Theme | Weather |
|---|---|
| Coastal, Valley, Country | Rain — diagonal streaks + wet-road tint |
| Alpine, Mountain | Snow — drifting flakes with sine drift |
| Desert | Sandstorm — horizontal sweep layers + sky haze |
| City | Drizzle — lighter, shorter streaks |

## Charging UI

The battery bar animates while charging:

- **Shimmer sweep** — a bright highlight moves across the green fill
- **Sparks** — yellow and blue particles fly upward above the bar
- **Lightning bolts** — four SVG bolts flash above the bar at staggered intervals
- The bar track glows green while plugged in

The inline charger banner (always visible, no scrolling needed) shows:

- **Charger max → Car limit = Actual rate** so you can see the bottleneck at a glance
- Estimated time to 80% and to full
- **Queue** button when approaching; **Charge** button when at the station
- Auto-charges on arrival when queued; auto-stops at 100%
- The Draw/Regen gauge shows **Charging** and the live kW rate while plugged in

### Route Planner behavior

With the DC Fast Charge Planner upgrade installed:
- The charger banner tracks **DC fast chargers only** — the planner manages those stops automatically
- **L1/L2 chargers** still appear in the Nearby Chargers list for manual use
- The planner auto-queues the next DCFC each tick so charging is fully hands-free
- Manual queues are protected — the planner never clears a stop you queued yourself

## Routes

10 routes unlocked progressively as you complete trips:

| Route | Distance | Difficulty | Theme |
|---|---|---|---|
| City Loop | 40 mi | Easy | City |
| Coastal Cruise | 80 mi | Easy | Coastal |
| Valley Run | 130 mi | Easy | Valley |
| Mountain Pass | 160 mi | Medium | Mountain |
| Interstate Haul | 220 mi | Medium | Interstate |
| Desert Crossing | 280 mi | Medium | Desert |
| Desert Dash | 280 mi | Hard | Desert |
| Alpine Summit | 180 mi | Hard | Alpine |
| Alpine Circuit | 350 mi | Hard | Alpine |
| Cross-Country Sprint | 600 mi | Expert | Country |

## Cars

**50 models** across Used/Classic and New/Modern groups, sorted by price within each group.

Brands: Tesla, Rivian, Ford, Chevy, BMW, Mercedes, Audi, Volkswagen, Hyundai, Kia, Nissan, Lucid, Polestar, Porsche, Volvo, GMC, Cadillac, Genesis, Honda, Subaru, MINI, BYD, Mazda, Jeep, Mitsubishi, Smart, Fiat

## Upgrades

20 upgrades across efficiency, regen, battery, charging speed, automation, and protection.

| Upgrade | Price | Effect |
|---|---|---|
| Aero Kit | 800 | +8% efficiency |
| Lightweight Wheels | 600 | +5% efficiency, +5% regen |
| Thermal Management | 1,200 | +6% efficiency, +5 kWh battery |
| Regen Boost | 900 | +20% regen |
| Battery Pack+ | 2,500 | +20 kWh capacity |
| Eco Chip | 500 | +10% efficiency |
| Solar Roof | 1,500 | +1.5 kW passive charge while driving and while charging |
| Heat Pump HVAC | 700 | +7% efficiency |
| Low-Roll Tires | 400 | +4% efficiency, +3% regen |
| Sport Tune | 1,000 | −5% efficiency, +10% regen |
| Autopilot Module | 2,200 | Unlocks 50× and 100× time scale |
| Adaptive Cruise Control | 950 | Drives 5 mph over speed limit — maximum legal speed, zero fines |
| DC Fast Charge Planner | 1,100 | Auto-queues next DCFC; shows all stops with estimated arrival battery % |
| Performance Inverter | 2,400 | Car accepts up to 80 kW more at DC fast chargers |
| Radar Detector | 700 | Speeding fines reduced by 60% |
| V2G Module | 1,800 | Vehicle-to-Grid: 30% of charging cost returned as grid credits |
| Dual Motor AWD | 3,500 | Second motor adds AWD; +22% regen, −5% efficiency |
| Carbon Fiber Body | 3,000 | Major weight reduction; +14% efficiency |
| Regenerative Suspension | 1,100 | Piezoelectric dampers add +0.8 kW passive charge while moving |
| Smart Glass | 480 | Electrochromic windows reduce HVAC load; +5% efficiency |

## Stack

- React 18 + TypeScript + Vite
- Canvas 2D for the terrain/driving view
- Cookie-based autosave (every 5 seconds + immediate save on purchases and achievements)

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
