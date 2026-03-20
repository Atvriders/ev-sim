import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { getRoute } from '../game/routes';
import { getCar } from '../game/cars';
import { computeUpgradeStats } from '../game/physics';

interface Props { state: GameState; }

const W = 800;
const H = 240;

// ── RNG helpers ────────────────────────────────────────────────────────────
function makeRng(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff;
  };
}
function strSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// ── Body-style lookup ──────────────────────────────────────────────────────
type BodyStyle = 'sedan' | 'suv' | 'hatchback' | 'truck' | 'van' | 'compact' | 'sport';

const BODY: Record<string, BodyStyle> = {
  tesla_m3_rwd:'sedan', tesla_m3_lr:'sedan', tesla_ms:'sedan',
  hyundai_ioniq6:'sedan', merc_eqs:'sedan', merc_eqe:'sedan',
  polestar_2:'sedan', byd_han:'sedan', lucid_air_gt:'sedan',
  audi_etron_gt:'sport', porsche_taycan:'sport', bmw_i4_m50:'sport',
  tesla_my:'suv', hyundai_ioniq5:'suv', kia_ev6_lr:'suv', kia_ev9:'suv',
  vw_id4:'suv', ford_mache:'suv', honda_prologue:'suv', nissan_ariya:'suv',
  volvo_ex30:'suv', volvo_ex40:'suv', bmw_ix:'suv', polestar_3:'suv',
  rivian_r1s:'suv', cadillac_lyriq:'suv', genesis_gv60:'suv',
  audi_q8_etron:'suv', subaru_solterra:'suv', jeep_avenger:'suv',
  chevy_silverado:'truck', bmw_i3_2014:'hatchback',
  tesla_ct:'truck', ford_lightning:'truck', rivian_r1t:'truck', gmc_hummer:'truck',
  vw_idbuzz:'van',
  chevy_bolt:'hatchback', chevy_bolt_2017:'hatchback', nissan_leaf_plus:'hatchback',
  nissan_leaf_2011:'hatchback', nissan_leaf_40:'hatchback', mini_se:'hatchback',
  mazda_mx30:'hatchback', vw_egolf_2015:'hatchback', byd_atto3:'hatchback',
  kia_soul_ev:'hatchback',
  mitsubishi_imiev:'compact', smart_ed_2013:'compact',
  fiat_500e_2014:'compact', chevy_spark_ev:'compact',
};

// ── Wheel drawing ──────────────────────────────────────────────────────────
const WR = 8;

function wheels(ctx: CanvasRenderingContext2D, positions: number[], angle: number) {
  for (const wx of positions) {
    ctx.beginPath();
    ctx.ellipse(wx, 0, WR * 0.9, WR * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wx, -WR, WR, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = '#2e2e2e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wx, -WR, WR * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = '#c0c8d0';
    ctx.fill();
    ctx.strokeStyle = '#9aa0a8';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wx, -WR, WR * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#dde2e8';
    ctx.fill();
    ctx.strokeStyle = '#7a8090';
    ctx.lineWidth = 1.2;
    for (let s = 0; s < 5; s++) {
      const a = angle + (s * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(a) * WR * 0.22, -WR + Math.sin(a) * WR * 0.22);
      ctx.lineTo(wx + Math.cos(a) * WR * 0.60, -WR + Math.sin(a) * WR * 0.60);
      ctx.stroke();
    }
  }
}

// ── Car silhouettes ────────────────────────────────────────────────────────
function carBody(ctx: CanvasRenderingContext2D, color: string,
  pts: number[][], glassPts: number[][], lightF: number[], lightR: number[]) {
  ctx.save();
  ctx.translate(2, 3);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(glassPts[0][0], glassPts[0][1]);
  for (let i = 1; i < glassPts.length; i++) ctx.lineTo(glassPts[i][0], glassPts[i][1]);
  ctx.closePath();
  ctx.fillStyle = 'rgba(160,210,240,0.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,220,255,0.25)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(glassPts[0][0], glassPts[0][1]);
  ctx.lineTo(glassPts[0][0] + (glassPts[1][0]-glassPts[0][0])*0.5, glassPts[0][1] + (glassPts[1][1]-glassPts[0][1])*0.5);
  ctx.lineTo(glassPts[3][0] + (glassPts[2][0]-glassPts[3][0])*0.5, glassPts[3][1] + (glassPts[2][1]-glassPts[3][1])*0.5);
  ctx.lineTo(glassPts[3][0], glassPts[3][1]);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(lightF[0], lightF[1], lightF[2], lightF[3], 0, 0, Math.PI * 2);
  const hg = ctx.createRadialGradient(lightF[0], lightF[1], 0, lightF[0], lightF[1], lightF[2]);
  hg.addColorStop(0, '#fffae0');
  hg.addColorStop(0.6, '#ffe080cc');
  hg.addColorStop(1, '#ffe08000');
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(lightR[0], lightR[1], lightR[2], lightR[3], 0, 0, Math.PI * 2);
  const tg = ctx.createRadialGradient(lightR[0], lightR[1], 0, lightR[0], lightR[1], lightR[2]);
  tg.addColorStop(0, '#ff8080');
  tg.addColorStop(0.5, '#cc2020bb');
  tg.addColorStop(1, '#cc202000');
  ctx.fillStyle = tg;
  ctx.fill();
}

function drawSedan(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  const b = WR;
  carBody(ctx, color,
    [[-30,-b-1],[-32,-b-8],[-24,-b-16],[-14,-b-27],[-4,-b-29],[10,-b-29],[20,-b-23],[28,-b-13],[30,-b-8],[30,-b-1]],
    [[-13,-b-26],[-4,-b-28],[10,-b-28],[19,-b-22],[27,-b-13],[16,-b-13],[8,-b-20],[-4,-b-22]],
    [30,-b-6,4,2.2], [-31,-b-6,4,2.2]
  );
  wheels(ctx, [-17, 17], angle);
}
function drawSport(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  const b = WR;
  carBody(ctx, color,
    [[-32,-b-1],[-34,-b-7],[-26,-b-14],[-12,-b-24],[-2,-b-27],[12,-b-27],[22,-b-21],[31,-b-11],[33,-b-7],[33,-b-1]],
    [[-11,-b-22],[-2,-b-26],[12,-b-26],[21,-b-20],[29,-b-12],[18,-b-12],[9,-b-18],[-2,-b-20]],
    [33,-b-5,4,2], [-33,-b-5,4,2]
  );
  wheels(ctx, [-18, 18], angle);
}
function drawSUV(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  const b = WR;
  carBody(ctx, color,
    [[-29,-b-1],[-31,-b-10],[-25,-b-33],[20,-b-33],[26,-b-20],[30,-b-12],[30,-b-1]],
    [[-23,-b-31],[-2,-b-31],[-2,-b-14],[-20,-b-14]],
    [29,-b-7,3.5,2.5], [-29,-b-7,3.5,2.5]
  );
  const bv = WR;
  ctx.beginPath();
  ctx.moveTo(2,-bv-31); ctx.lineTo(20,-bv-31); ctx.lineTo(25,-bv-20); ctx.lineTo(16,-bv-14); ctx.lineTo(2,-bv-14);
  ctx.closePath();
  ctx.fillStyle = 'rgba(160,210,240,0.35)'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-2,-b-33); ctx.lineTo(-2,-b-14); ctx.stroke();
  wheels(ctx, [-16, 17], angle);
}
function drawHatchback(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  const b = WR;
  carBody(ctx, color,
    [[-26,-b-1],[-28,-b-9],[-21,-b-27],[10,-b-27],[18,-b-20],[25,-b-12],[26,-b-1]],
    [[-19,-b-25],[10,-b-25],[17,-b-20],[12,-b-13],[-14,-b-13]],
    [25,-b-6,3,2], [-27,-b-6,3,2]
  );
  wheels(ctx, [-13, 13], angle);
}
function drawTruck(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  const b = WR;
  ctx.beginPath();
  ctx.moveTo(-38,-b-1); ctx.lineTo(-38,-b-18); ctx.lineTo(-10,-b-18); ctx.lineTo(-10,-b-1);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(-37,-b-17,27,7);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-37,-b-18); ctx.lineTo(-37,-b-1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-11,-b-18); ctx.lineTo(-11,-b-1); ctx.stroke();
  carBody(ctx, color,
    [[-10,-b-1],[-10,-b-31],[14,-b-31],[22,-b-19],[28,-b-12],[28,-b-1]],
    [[-8,-b-29],[13,-b-29],[20,-b-19],[10,-b-13],[-8,-b-13]],
    [27,-b-7,3.5,2.5], [-37,-b-9,3.5,2.5]
  );
  wheels(ctx, [-24, 16], angle);
}
function drawVan(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  const b = WR;
  carBody(ctx, color,
    [[-29,-b-1],[-30,-b-12],[-28,-b-37],[20,-b-37],[26,-b-28],[28,-b-14],[28,-b-1]],
    [[-26,-b-35],[-10,-b-35],[-10,-b-16],[-24,-b-16]],
    [27,-b-8,3.5,2.5], [-29,-b-9,3.5,2.5]
  );
  ctx.fillStyle = 'rgba(160,210,240,0.35)';
  ctx.fillRect(-6,-b-35,14,17);
  ctx.beginPath(); ctx.moveTo(22,-b-35); ctx.lineTo(26,-b-27); ctx.lineTo(26,-b-19); ctx.lineTo(18,-b-13); ctx.lineTo(18,-b-35); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-8,-b-36); ctx.lineTo(-8,-b-2); ctx.stroke();
  wheels(ctx, [-15, 16], angle);
}
function drawCompact(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  const b = WR;
  carBody(ctx, color,
    [[-20,-b-1],[-22,-b-8],[-16,-b-20],[-4,-b-25],[8,-b-25],[16,-b-17],[20,-b-10],[20,-b-1]],
    [[-14,-b-19],[-4,-b-23],[8,-b-23],[14,-b-17],[8,-b-12],[-10,-b-12]],
    [19,-b-5,2.5,1.8], [-21,-b-5,2.5,1.8]
  );
  wheels(ctx, [-10, 10], angle);
}
function drawCarByStyle(ctx: CanvasRenderingContext2D, carId: string, color: string, angle: number) {
  const style: BodyStyle = BODY[carId] ?? 'sedan';
  switch (style) {
    case 'sedan':    drawSedan(ctx, color, angle);    break;
    case 'sport':    drawSport(ctx, color, angle);    break;
    case 'suv':      drawSUV(ctx, color, angle);      break;
    case 'hatchback':drawHatchback(ctx, color, angle);break;
    case 'truck':    drawTruck(ctx, color, angle);    break;
    case 'van':      drawVan(ctx, color, angle);      break;
    case 'compact':  drawCompact(ctx, color, angle);  break;
  }
}

// ── Scene themes per route ─────────────────────────────────────────────────
type SceneTheme = 'city' | 'coastal' | 'valley' | 'interstate' | 'mountain' | 'desert' | 'alpine' | 'country';

const ROUTE_THEME: Record<string, SceneTheme> = {
  city_loop:       'city',
  coastal_cruise:  'coastal',
  valley_run:      'valley',
  interstate_haul: 'interstate',
  mountain_pass:   'mountain',
  desert_crossing: 'desert',
  alpine_circuit:  'alpine',
  cross_country:   'country',
};

// sky gradient stops [top, midH, midL, horizon]
const SKY: Record<SceneTheme, [string,string,string,string]> = {
  city:       ['#1e2838', '#3a5068', '#6888a0', '#b0c8d8'],
  coastal:    ['#082858', '#0e60a8', '#40a0d8', '#a0d8f0'],
  valley:     ['#0d3070', '#2272b4', '#60aad8', '#b0d8f0'],
  interstate: ['#0a2858', '#1860a8', '#60a8d8', '#c0d8ec'],
  mountain:   ['#060f28', '#0a2868', '#2060b8', '#6090d0'],
  desert:     ['#101e50', '#2860a8', '#70a0c8', '#d0905a'],
  alpine:     ['#040c1e', '#080f38', '#102060', '#4070a8'],
  country:    ['#0d3070', '#2272b4', '#60aad8', '#b0d8f0'],
};

// ground gradient stops [near road, dark]
const GROUND: Record<SceneTheme, [string,string]> = {
  city:       ['#303830', '#1a2018'],
  coastal:    ['#3a7228', '#1a3812'],
  valley:     ['#3a7a28', '#183c10'],
  interstate: ['#6a6028', '#3a3810'],
  mountain:   ['#2a4a20', '#101c08'],
  desert:     ['#8a5828', '#502a10'],
  alpine:     ['#383828', '#1c1c10'],
  country:    ['#3a7228', '#1a3a10'],
};

// ── Component ──────────────────────────────────────────────────────────────
export default function GameCanvas({ state }: Props) {
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const trafficScrollRef  = useRef<number>(0); // oncoming scroll (increases = moves left)
  const sameDirScrollRef  = useRef<number>(0); // same-dir scroll (decreases during charging = moves right)
  const lastScrollPxRef   = useRef<number>(0);
  const lastTimeRef       = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    const route = state.currentRoute ? getRoute(state.currentRoute) : null;

    // ── IDLE STATE ────────────────────────────────────────────────────────────
    // Show route canvas if route just completed (driving=false but routeComplete=true)
    if (!route || (!state.driving && !state.routeComplete)) {
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.58);
      sky.addColorStop(0, '#0d3a7a'); sky.addColorStop(0.6, '#2d7ab8'); sky.addColorStop(1, '#90c8e8');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      const gnd = ctx.createLinearGradient(0, H*0.58, 0, H);
      gnd.addColorStop(0, '#3a7228'); gnd.addColorStop(1, '#1a3a10');
      ctx.fillStyle = gnd; ctx.fillRect(0, H*0.58, W, H);
      ctx.fillStyle = '#22222a'; ctx.fillRect(0, H*0.74, W, 24);
      ctx.strokeStyle = 'rgba(232,200,48,0.85)'; ctx.lineWidth = 1.8; ctx.setLineDash([14,12]);
      ctx.beginPath(); ctx.moveTo(0,H*0.74+12); ctx.lineTo(W,H*0.74+12); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.roundRect(W/2-175, H/2-18, 350, 36, 6); ctx.fill();
      ctx.fillStyle = '#e6edf3'; ctx.font = '600 14px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('Select a route to start driving', W/2, H/2+5);
      return;
    }

    const theme: SceneTheme = ROUTE_THEME[route.id] ?? 'country';
    const VIEW_MILES = state.timeScale >= 25 ? 5 : 1;
    const MI_PER_PX  = VIEW_MILES / W;
    const terrain    = route.terrain;
    const distTotal  = route.distanceMi;
    const carScreenX = W * 0.28;
    const offsetMi   = state.positionMi - carScreenX * MI_PER_PX;
    const scrollPx   = state.positionMi / MI_PER_PX;
    const T          = performance.now();

    // ── Continuous traffic scroll (keeps moving during charging) ─────────────
    {
      const dtMs  = lastTimeRef.current ? T - lastTimeRef.current : 16;
      lastTimeRef.current = T;
      const delta = scrollPx - lastScrollPxRef.current;
      lastScrollPxRef.current = scrollPx;
      if (delta < -100) {
        trafficScrollRef.current  = scrollPx;  // new drive reset
        sameDirScrollRef.current  = scrollPx;
      } else if (state.isCharging) {
        // Oncoming: keep moving left (toward player) — increase scroll
        trafficScrollRef.current += 2.0 * (dtMs / 16);
        // Same-dir: should go forward (rightward) through static background — decrease scroll
        sameDirScrollRef.current -= 2.0 * (dtMs / 16);
      } else {
        trafficScrollRef.current += delta;
        sameDirScrollRef.current += delta;
      }
    }
    const trafficScroll  = trafficScrollRef.current;  // oncoming
    const sameDirScroll  = sameDirScrollRef.current;  // same-direction

    function miToX(mi: number) { return (mi - offsetMi) / MI_PER_PX; }

    const elevs    = terrain.map(p => p.elevationFt);
    const minEl    = Math.min(...elevs);
    const maxEl    = Math.max(...elevs);
    const elRange  = Math.max(maxEl - minEl, 100);
    const skyH     = H * 0.72;
    const groundBot = H * 0.90;

    function elToY(el: number) {
      return skyH + (1 - (el - minEl) / elRange) * (groundBot - skyH);
    }
    function elevAt(mi: number): number {
      if (mi <= terrain[0].distanceMi) return terrain[0].elevationFt;
      if (mi >= terrain[terrain.length - 1].distanceMi) return terrain[terrain.length - 1].elevationFt;
      for (let i = 0; i < terrain.length - 1; i++) {
        if (terrain[i].distanceMi <= mi && terrain[i+1].distanceMi >= mi) {
          const t = (mi - terrain[i].distanceMi) / (terrain[i+1].distanceMi - terrain[i].distanceMi);
          return terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        }
      }
      return terrain[terrain.length - 1].elevationFt;
    }

    // Extend beyond route bounds so road fills full canvas at start/end
    const visStart = offsetMi - 0.5;
    const visEnd   = offsetMi + VIEW_MILES + 0.5;
    const STEPS    = 160;
    const stepMi   = (visEnd - visStart) / STEPS;

    function terrainPath(yOff = 0) {
      ctx.beginPath();
      for (let s = 0; s <= STEPS; s++) {
        const mi = visStart + s * stepMi;
        const x = miToX(mi), y = elToY(elevAt(mi)) + yOff;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }

    const seed = strSeed(route.id);

    // ════════════════════════════════════════════════════════════════════════
    // 1 ── SKY
    // ════════════════════════════════════════════════════════════════════════
    const sc = SKY[theme];
    const skyG = ctx.createLinearGradient(0, 0, 0, skyH);
    skyG.addColorStop(0,    sc[0]);
    skyG.addColorStop(0.38, sc[1]);
    skyG.addColorStop(0.72, sc[2]);
    skyG.addColorStop(1,    sc[3]);
    ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, H);

    // Horizon haze
    const haze = ctx.createLinearGradient(0, skyH-28, 0, skyH+18);
    const hazeCol = theme === 'desert' ? 'rgba(210,160,80,' : 'rgba(195,220,245,';
    haze.addColorStop(0, hazeCol+'0)');
    haze.addColorStop(0.5, hazeCol+'0.32)');
    haze.addColorStop(1, hazeCol+'0)');
    ctx.fillStyle = haze; ctx.fillRect(0, skyH-28, W, 46);

    // ── Stars (all themes; brighter on dark themes) ───────────────────────
    {
      const starBrightness = theme === 'alpine' ? 1.0 : theme === 'mountain' ? 0.55 :
                             theme === 'city' ? 0.12 : theme === 'desert' ? 0.18 : 0.22;
      const rngSt = makeRng(seed + 12);
      for (let i = 0; i < 110; i++) {
        const sx2 = rngSt() * W;
        const sy2 = rngSt() * skyH * 0.92;
        const sr  = 0.4 + rngSt() * 1.1;
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(T * (0.0008 + rngSt() * 0.002) + i * 1.7));
        ctx.globalAlpha = starBrightness * twinkle;
        const warm = rngSt();
        ctx.fillStyle = warm < 0.3 ? '#ffe8c0' : warm < 0.6 ? '#ffffff' : '#c8d8ff';
        ctx.beginPath(); ctx.arc(sx2, sy2, sr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── Moon (always visible, crescent, upper-left sky) ───────────────────
    {
      const moonX = W * 0.14, moonY = skyH * 0.20;
      const moonR = theme === 'alpine' ? 12 : 9;
      // Glow
      const mg = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 3.5);
      mg.addColorStop(0, 'rgba(220,235,255,0.22)');
      mg.addColorStop(1, 'rgba(220,235,255,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 3.5, 0, Math.PI * 2); ctx.fill();
      // Moon disc
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fillStyle = theme === 'alpine' ? '#d8e8f8' : 'rgba(215,228,248,0.80)'; ctx.fill();
      // Crescent shadow cutout
      const skyTop = SKY[theme][0];
      ctx.beginPath(); ctx.arc(moonX + moonR * 0.42, moonY - moonR * 0.25, moonR * 0.82, 0, Math.PI * 2);
      ctx.fillStyle = skyTop; ctx.fill();
      // Subtle craters
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#a0b8d0';
      ctx.beginPath(); ctx.arc(moonX - 2, moonY + 2, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX + 3, moonY - 1, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Sun (not city/alpine) ─────────────────────────────────────────────
    if (theme !== 'city' && theme !== 'alpine') {
      const sunX = W * 0.76, sunY = skyH * 0.28;
      const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 68);
      const sunInner = theme === 'desert' ? 'rgba(255,245,180,0.95)' : 'rgba(255,252,220,0.90)';
      const sunOuter = theme === 'desert' ? 'rgba(255,160,50,0)' : 'rgba(255,210,100,0)';
      sg.addColorStop(0,    sunInner);
      sg.addColorStop(0.18, theme === 'desert' ? 'rgba(255,180,60,0.55)' : 'rgba(255,225,140,0.50)');
      sg.addColorStop(1,    sunOuter);
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, sunY, 68, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sunX, sunY, theme === 'desert' ? 11 : 8, 0, Math.PI*2);
      ctx.fillStyle = theme === 'desert' ? '#ffe098' : '#fff9e8'; ctx.fill();
    }

    // ── Shooting star / meteor (occasional, time-triggered) ───────────────
    {
      const cycle = 9000; // ms per cycle
      const phase = T % cycle;
      if (phase < 700) {
        const prog  = phase / 700;
        const rngM  = makeRng(seed + Math.floor(T / cycle));
        const sx2   = rngM() * W * 0.7 + W * 0.1;
        const sy2   = rngM() * skyH * 0.45 + 4;
        const len   = 60 + rngM() * 80;
        const ang   = Math.PI * 0.22;
        const ex    = sx2 + Math.cos(ang) * len * prog;
        const ey    = sy2 + Math.sin(ang) * len * prog;
        const tail  = Math.max(0, sx2 + Math.cos(ang) * len * (prog - 0.35));
        const taily = sy2 + Math.sin(ang) * len * (prog - 0.35);
        const alpha = prog < 0.5 ? prog * 2 : (1 - prog) * 2;
        const streak = ctx.createLinearGradient(tail, taily, ex, ey);
        streak.addColorStop(0, 'rgba(255,255,255,0)');
        streak.addColorStop(1, `rgba(255,255,220,${alpha * 0.9})`);
        ctx.strokeStyle = streak; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(tail, taily); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── Comet (rare, slow arc across upper sky) ───────────────────────────
    {
      const cometCycle = 25000;
      const cphase = T % cometCycle;
      if (cphase < 12000) {
        const prog = cphase / 12000;
        const cx2  = prog * (W + 120) - 60;
        const cy2  = skyH * 0.12 + Math.sin(prog * Math.PI) * skyH * 0.08;
        const tail = ctx.createLinearGradient(cx2 - 80, cy2, cx2, cy2);
        tail.addColorStop(0, 'rgba(180,220,255,0)');
        tail.addColorStop(1, 'rgba(200,230,255,0.55)');
        ctx.strokeStyle = tail; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx2 - 80, cy2); ctx.lineTo(cx2, cy2); ctx.stroke();
        ctx.fillStyle = '#e8f4ff';
        ctx.beginPath(); ctx.arc(cx2, cy2, 3, 0, Math.PI * 2); ctx.fill();
        // Dust halo
        const halo = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 10);
        halo.addColorStop(0, 'rgba(200,230,255,0.30)');
        halo.addColorStop(1, 'rgba(200,230,255,0)');
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx2, cy2, 10, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 1.5 ── AIR TRAFFIC (planes, helicopters, UFOs)
    // ════════════════════════════════════════════════════════════════════════
    {
      // ── Planes ────────────────────────────────────────────────────────────
      const rngAir = makeRng(seed + 0xcc1133);
      const planeCount = 8;
      for (let i = 0; i < planeCount; i++) {
        const baseX   = rngAir() * W * 9;                       // 1 spawn spread
        const baseY   = 8 + rngAir() * (skyH * 0.72);           // 2 sky height
        const spd     = 0.018 + rngAir() * 0.028;               // 3 px/ms
        const goRight = rngAir() < 0.55;                         // 4 direction
        const sc      = 0.65 + rngAir() * 0.55;                  // 5 size

        const rawX = (baseX + T * spd) % (W * 9);
        const sx   = goRight ? rawX - W * 0.5 : W - rawX + W * 0.5;
        if (sx < -80 || sx > W + 80) continue;

        const sy = baseY;
        ctx.save();
        ctx.translate(sx, sy);
        if (!goRight) ctx.scale(-1, 1);

        // contrail
        ctx.globalAlpha = 0.14;
        const cg = ctx.createLinearGradient(-65 * sc, 0, 0, 0);
        cg.addColorStop(0, 'rgba(255,255,255,0)');
        cg.addColorStop(1, 'rgba(255,255,255,0.75)');
        ctx.fillStyle = cg;
        ctx.fillRect(-65 * sc, -1.2 * sc, 65 * sc, 2.5 * sc);
        ctx.globalAlpha = 1;

        // fuselage
        ctx.fillStyle = '#ccd6e8';
        ctx.beginPath(); ctx.ellipse(0, 0, 19 * sc, 3.5 * sc, 0, 0, Math.PI * 2); ctx.fill();
        // nose taper
        ctx.fillStyle = '#dde4f0';
        ctx.beginPath(); ctx.ellipse(14 * sc, 0, 7 * sc, 2.8 * sc, 0, 0, Math.PI * 2); ctx.fill();
        // wings
        ctx.fillStyle = '#b0bcd0';
        ctx.beginPath();
        ctx.moveTo(-2 * sc, 0); ctx.lineTo(4 * sc, -13 * sc);
        ctx.lineTo(9 * sc, -13 * sc); ctx.lineTo(9 * sc, 0); ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-2 * sc, 0); ctx.lineTo(4 * sc, 13 * sc);
        ctx.lineTo(9 * sc, 13 * sc); ctx.lineTo(9 * sc, 0); ctx.closePath();
        ctx.fill();
        // tail fin
        ctx.beginPath();
        ctx.moveTo(-16 * sc, 0); ctx.lineTo(-13 * sc, -8 * sc);
        ctx.lineTo(-8 * sc, 0); ctx.closePath();
        ctx.fill();
        // tail horizontal stabilizers
        ctx.beginPath();
        ctx.moveTo(-15 * sc, 0); ctx.lineTo(-11 * sc, -5 * sc);
        ctx.lineTo(-7 * sc, -5 * sc); ctx.lineTo(-7 * sc, 0); ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-15 * sc, 0); ctx.lineTo(-11 * sc, 5 * sc);
        ctx.lineTo(-7 * sc, 5 * sc); ctx.lineTo(-7 * sc, 0); ctx.closePath();
        ctx.fill();
        // engine pods
        ctx.fillStyle = '#9aaabb';
        ctx.beginPath(); ctx.ellipse(3 * sc, -11 * sc, 5.5 * sc, 2 * sc, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3 * sc,  11 * sc, 5.5 * sc, 2 * sc, 0, 0, Math.PI * 2); ctx.fill();
        // windows
        ctx.fillStyle = 'rgba(180,220,255,0.80)';
        for (let w = 0; w < 5; w++) {
          ctx.beginPath(); ctx.ellipse((-7 + w * 5) * sc, -1 * sc, 1.6 * sc, 1.3 * sc, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      // ── Helicopter ────────────────────────────────────────────────────────
      const rngHeli = makeRng(seed + 0xdd2244);
      {
        const baseX   = rngHeli() * W * 7;
        const baseY   = 15 + rngHeli() * (skyH * 0.55);
        const spd     = 0.009 + rngHeli() * 0.008;
        const goRight = rngHeli() < 0.5;
        const rawX    = (baseX + T * spd) % (W * 7);
        const sx      = goRight ? rawX - W * 0.4 : W - rawX + W * 0.4;
        if (sx >= -60 && sx <= W + 60) {
          const sy    = baseY + Math.sin(T * 0.0012) * 3;
          const sc    = 0.9;
          const rotorA = (T * 0.012) % (Math.PI * 2); // fast rotor spin
          ctx.save();
          ctx.translate(sx, sy);
          if (!goRight) ctx.scale(-1, 1);
          // body
          ctx.fillStyle = '#8899aa';
          ctx.beginPath();
          ctx.ellipse(0, 0, 14 * sc, 5.5 * sc, 0, 0, Math.PI * 2); ctx.fill();
          // cockpit bubble
          ctx.fillStyle = '#aaddff';
          ctx.beginPath();
          ctx.ellipse(8 * sc, -1 * sc, 7 * sc, 4.5 * sc, -0.15, 0, Math.PI * 2); ctx.fill();
          // tail boom
          ctx.strokeStyle = '#7a8899'; ctx.lineWidth = 2 * sc;
          ctx.beginPath(); ctx.moveTo(-14 * sc, 0); ctx.lineTo(-28 * sc, -2 * sc); ctx.stroke();
          // tail rotor
          ctx.strokeStyle = 'rgba(150,170,190,0.6)'; ctx.lineWidth = 1 * sc;
          ctx.save(); ctx.translate(-27 * sc, -2 * sc); ctx.rotate(rotorA * 3);
          for (let r = 0; r < 3; r++) {
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 5 * sc); ctx.stroke();
            ctx.rotate(Math.PI * 2 / 3);
          }
          ctx.restore();
          // main rotor shaft
          ctx.strokeStyle = '#6a7a88'; ctx.lineWidth = 1.5 * sc;
          ctx.beginPath(); ctx.moveTo(0, -5.5 * sc); ctx.lineTo(0, -9 * sc); ctx.stroke();
          // main rotor blades
          ctx.strokeStyle = 'rgba(120,140,160,0.55)'; ctx.lineWidth = 2.5 * sc;
          ctx.save(); ctx.translate(0, -9 * sc); ctx.rotate(rotorA);
          ctx.beginPath(); ctx.moveTo(-20 * sc, 0); ctx.lineTo(20 * sc, 0); ctx.stroke();
          ctx.rotate(Math.PI / 2);
          ctx.beginPath(); ctx.moveTo(-20 * sc, 0); ctx.lineTo(20 * sc, 0); ctx.stroke();
          ctx.restore();
          // skids
          ctx.strokeStyle = '#6a7a88'; ctx.lineWidth = 1 * sc;
          ctx.beginPath(); ctx.moveTo(-8 * sc, 5.5 * sc); ctx.lineTo(10 * sc, 5.5 * sc); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-8 * sc, 5.5 * sc); ctx.lineTo(-5 * sc, 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(8 * sc, 5.5 * sc); ctx.lineTo(6 * sc, 0); ctx.stroke();
          ctx.restore();
        }
      }

      // ── UFO ───────────────────────────────────────────────────────────────
      const rngUFO = makeRng(seed + 0xee3355);
      {
        const baseX  = rngUFO() * W * 6;
        const baseY  = 12 + rngUFO() * (skyH * 0.45);
        const spd    = 0.003 + rngUFO() * 0.004;    // very slow drift
        const rawX   = (baseX + T * spd) % (W * 6);
        const sx     = rawX - W * 0.3;
        if (sx >= -80 && sx <= W + 80) {
          const sy    = baseY + Math.sin(T * 0.0008) * 5 + Math.sin(T * 0.0015) * 3;
          const pulse = 0.7 + 0.3 * Math.sin(T * 0.002);
          ctx.save();
          ctx.translate(sx, sy);
          // glow under
          const glow = ctx.createRadialGradient(0, 6, 0, 0, 6, 28);
          glow.addColorStop(0, `rgba(100,255,180,${0.22 * pulse})`);
          glow.addColorStop(1, 'rgba(100,255,180,0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.ellipse(0, 6, 28, 14, 0, 0, Math.PI * 2); ctx.fill();
          // lower disc
          const discG = ctx.createLinearGradient(0, -3, 0, 5);
          discG.addColorStop(0, '#7888a8');
          discG.addColorStop(1, '#4a5868');
          ctx.fillStyle = discG;
          ctx.beginPath(); ctx.ellipse(0, 2, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
          // upper dome
          const domeG = ctx.createLinearGradient(0, -12, 0, 0);
          domeG.addColorStop(0, 'rgba(160,200,240,0.85)');
          domeG.addColorStop(1, 'rgba(80,110,140,0.60)');
          ctx.fillStyle = domeG;
          ctx.beginPath(); ctx.ellipse(0, 0, 12, 9, 0, Math.PI, 0); ctx.fill();
          // rim lights (cycle colors)
          const lightColors = ['#ff4444','#44ff88','#4488ff','#ffee44','#ff44ff'];
          for (let l = 0; l < 5; l++) {
            const la = (l / 5) * Math.PI * 2 + T * 0.003;
            const lx = Math.cos(la) * 18; const ly = 2 + Math.sin(la) * 3;
            const ci = Math.floor((l + Math.floor(T * 0.003)) % lightColors.length);
            ctx.globalAlpha = 0.55 + 0.45 * Math.sin(T * 0.005 + l);
            ctx.fillStyle = lightColors[ci];
            ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
          // tractor beam (occasional)
          if (Math.sin(T * 0.0004) > 0.4) {
            const beamAlpha = (Math.sin(T * 0.0004) - 0.4) * 0.4;
            const beam = ctx.createLinearGradient(0, 5, 0, 40);
            beam.addColorStop(0, `rgba(120,255,180,${beamAlpha})`);
            beam.addColorStop(1, 'rgba(120,255,180,0)');
            ctx.fillStyle = beam;
            ctx.beginPath();
            ctx.moveTo(-6, 5); ctx.lineTo(6, 5);
            ctx.lineTo(18, 40); ctx.lineTo(-18, 40);
            ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        }
      }

      // ── Second + Third UFO ────────────────────────────────────────────────
      for (let ufoIdx = 1; ufoIdx <= 2; ufoIdx++) {
        const rngU2 = makeRng(seed + 0xee3355 + ufoIdx * 0x1111);
        const baseX2 = rngU2() * W * 7;
        const baseY2 = 8 + rngU2() * (skyH * 0.55);
        const spd2   = 0.002 + rngU2() * 0.006;
        const rawX2  = (baseX2 + T * spd2 * (ufoIdx === 2 ? -1 : 1)) % (W * 7);
        const sx2    = ((rawX2 % (W * 7)) + W * 7) % (W * 7) - W * 0.5;
        if (sx2 < -70 || sx2 > W + 70) continue;
        const sy2    = baseY2 + Math.sin(T * 0.0007 + ufoIdx) * 6;
        const pulse2 = 0.6 + 0.4 * Math.sin(T * 0.0025 + ufoIdx * 2.1);
        const usc    = 0.7 + rngU2() * 0.5;
        ctx.save();
        ctx.translate(sx2, sy2);
        const g2 = ctx.createRadialGradient(0, 5, 0, 0, 5, 22 * usc);
        g2.addColorStop(0, `rgba(80,200,255,${0.20 * pulse2})`);
        g2.addColorStop(1, 'rgba(80,200,255,0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 5, 22 * usc, 0, Math.PI * 2); ctx.fill();
        const dg2 = ctx.createLinearGradient(0, -3 * usc, 0, 5 * usc);
        dg2.addColorStop(0, '#6878a0'); dg2.addColorStop(1, '#404858');
        ctx.fillStyle = dg2;
        ctx.beginPath(); ctx.ellipse(0, 2 * usc, 18 * usc, 4 * usc, 0, 0, Math.PI * 2); ctx.fill();
        const dmG2 = ctx.createLinearGradient(0, -10 * usc, 0, 0);
        dmG2.addColorStop(0, 'rgba(140,190,230,0.80)'); dmG2.addColorStop(1, 'rgba(70,100,130,0.55)');
        ctx.fillStyle = dmG2;
        ctx.beginPath(); ctx.ellipse(0, 0, 10 * usc, 7 * usc, 0, Math.PI, 0); ctx.fill();
        const lc2 = ['#ff4444','#44ffaa','#44aaff','#ffdd44','#ff44ee'];
        for (let l = 0; l < 5; l++) {
          const la = (l / 5) * Math.PI * 2 + T * 0.004 * (ufoIdx === 2 ? -1 : 1);
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 0.006 + l + ufoIdx);
          ctx.fillStyle = lc2[l];
          ctx.beginPath(); ctx.arc(Math.cos(la) * 14 * usc, 2 * usc + Math.sin(la) * 2 * usc, 1.8 * usc, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // ── Hot air balloon ───────────────────────────────────────────────────
      {
        const rngBal = makeRng(seed + 0xff4466);
        const baseX  = rngBal() * W * 5;
        const baseY  = skyH * 0.25 + rngBal() * skyH * 0.30;
        const spd    = 0.004 + rngBal() * 0.003;
        const sx     = (baseX + T * spd) % (W * 5) - W * 0.3;
        if (sx >= -60 && sx <= W + 60) {
          const sy  = baseY + Math.sin(T * 0.0006) * 4;
          const bsc = 0.9 + rngBal() * 0.3;
          ctx.save();
          ctx.translate(sx, sy);
          // Envelope panels (alternating colours)
          const panelCols = ['#e03030','#f0a020','#2080e0','#30b840','#e02880'];
          for (let p = 0; p < 5; p++) {
            const pa = (p / 5) * Math.PI * 2;
            const pa2 = ((p + 1) / 5) * Math.PI * 2;
            ctx.fillStyle = panelCols[p];
            ctx.beginPath();
            ctx.moveTo(0, -18 * bsc);
            ctx.arc(0, 0, 18 * bsc, pa - Math.PI / 2, pa2 - Math.PI / 2);
            ctx.closePath(); ctx.fill();
          }
          // Envelope shading overlay
          const envG = ctx.createRadialGradient(-5 * bsc, -6 * bsc, 0, 0, 0, 20 * bsc);
          envG.addColorStop(0, 'rgba(255,255,255,0.18)');
          envG.addColorStop(1, 'rgba(0,0,0,0.22)');
          ctx.fillStyle = envG; ctx.beginPath(); ctx.arc(0, 0, 18 * bsc, 0, Math.PI * 2); ctx.fill();
          // Ropes
          ctx.strokeStyle = 'rgba(160,140,100,0.70)'; ctx.lineWidth = 0.9;
          for (const rx of [-8, -3, 3, 8]) {
            ctx.beginPath(); ctx.moveTo(rx * bsc, 17 * bsc); ctx.lineTo(rx * bsc * 0.6, 26 * bsc); ctx.stroke();
          }
          // Basket
          ctx.fillStyle = '#7a5828';
          ctx.fillRect(-8 * bsc, 26 * bsc, 16 * bsc, 9 * bsc);
          ctx.strokeStyle = '#5a3810'; ctx.lineWidth = 0.8;
          ctx.strokeRect(-8 * bsc, 26 * bsc, 16 * bsc, 9 * bsc);
          // Passenger silhouette
          ctx.fillStyle = '#2a1808';
          ctx.beginPath(); ctx.arc(0, 26 * bsc, 3 * bsc, Math.PI, 0); ctx.fill();
          // Flame glow
          ctx.globalAlpha = 0.55 + 0.35 * Math.sin(T * 0.012);
          const flameG = ctx.createRadialGradient(0, 18 * bsc, 0, 0, 18 * bsc, 6 * bsc);
          flameG.addColorStop(0, 'rgba(255,200,50,0.9)');
          flameG.addColorStop(1, 'rgba(255,80,0,0)');
          ctx.fillStyle = flameG; ctx.beginPath(); ctx.arc(0, 18 * bsc, 6 * bsc, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // ── Blimp / zeppelin ─────────────────────────────────────────────────
      {
        const rngBl = makeRng(seed + 0xaa5577);
        const baseX = rngBl() * W * 8;
        const baseY = skyH * 0.18 + rngBl() * skyH * 0.25;
        const spd   = 0.006 + rngBl() * 0.005;
        const goR   = rngBl() < 0.5;
        const rawX  = (baseX + T * spd) % (W * 8);
        const sx    = goR ? rawX - W * 0.5 : W - rawX + W * 0.5;
        if (sx >= -120 && sx <= W + 120) {
          const sy  = baseY + Math.sin(T * 0.0005) * 3;
          const bsc = 1.0;
          ctx.save();
          ctx.translate(sx, sy);
          if (!goR) ctx.scale(-1, 1);
          // Hull gradient
          const hullG = ctx.createLinearGradient(0, -12 * bsc, 0, 12 * bsc);
          hullG.addColorStop(0, '#d0d8e8'); hullG.addColorStop(0.4, '#a0b0c8'); hullG.addColorStop(1, '#606878');
          ctx.fillStyle = hullG;
          ctx.beginPath(); ctx.ellipse(0, 0, 45 * bsc, 12 * bsc, 0, 0, Math.PI * 2); ctx.fill();
          // Tail fins
          ctx.fillStyle = '#8090a8';
          ctx.beginPath(); ctx.moveTo(-40*bsc, 0); ctx.lineTo(-52*bsc, -14*bsc); ctx.lineTo(-38*bsc, -2*bsc); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-40*bsc, 0); ctx.lineTo(-52*bsc, 14*bsc); ctx.lineTo(-38*bsc, 2*bsc); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-40*bsc, 0); ctx.lineTo(-50*bsc, 0); ctx.lineTo(-38*bsc, -10*bsc); ctx.closePath(); ctx.fill();
          // Gondola
          ctx.fillStyle = '#505868';
          ctx.fillRect(-12 * bsc, 12 * bsc, 24 * bsc, 7 * bsc);
          ctx.fillStyle = '#8ab0d0';
          for (let w = -9; w <= 8; w += 6) {
            ctx.fillRect(w * bsc, 13 * bsc, 4 * bsc, 3 * bsc);
          }
          // Rigging lines
          ctx.strokeStyle = 'rgba(120,130,150,0.5)'; ctx.lineWidth = 0.7;
          for (const lx of [-8, 0, 8]) {
            ctx.beginPath(); ctx.moveTo(lx * bsc, 11 * bsc); ctx.lineTo(lx * bsc, 12 * bsc); ctx.stroke();
          }
          // Logo stripe
          ctx.fillStyle = 'rgba(200,60,60,0.55)';
          ctx.fillRect(-30 * bsc, -3 * bsc, 40 * bsc, 3 * bsc);
          ctx.restore();
        }
      }

      // ── Bird flocks ───────────────────────────────────────────────────────
      for (let flock = 0; flock < 3; flock++) {
        const rngBird = makeRng(seed + 0xb11d + flock * 0x100);
        const baseX   = rngBird() * W * 6;
        const baseY   = 10 + rngBird() * skyH * 0.65;
        const spd     = 0.014 + rngBird() * 0.018;
        const goR     = rngBird() < 0.6;
        const rawX    = (baseX + T * spd) % (W * 6);
        const sx      = goR ? rawX - W * 0.3 : W - rawX + W * 0.3;
        if (sx < -80 || sx > W + 80) continue;
        const sy      = baseY + Math.sin(T * 0.0009 + flock) * 5;
        const birdCount = 5 + Math.floor(rngBird() * 5);
        ctx.save();
        ctx.translate(sx, sy);
        if (!goR) ctx.scale(-1, 1);
        ctx.strokeStyle = 'rgba(30,30,30,0.55)'; ctx.lineWidth = 1;
        for (let b = 0; b < birdCount; b++) {
          const bx = (b - birdCount / 2) * 9 + Math.sin(b * 1.3) * 5;
          const by = Math.abs(b - birdCount / 2) * 3 + Math.sin(T * 0.01 + b * 0.7) * 1.5;
          const ws = 4 + Math.sin(T * 0.008 + b * 0.9) * 2.5; // flapping
          ctx.beginPath();
          ctx.moveTo(bx - ws, by - ws * 0.4);
          ctx.quadraticCurveTo(bx, by, bx + ws, by - ws * 0.4);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Satellite ─────────────────────────────────────────────────────────
      {
        const satCycle = 18000;
        const sp = (T % satCycle) / satCycle;
        const satX = sp * (W + 60) - 30;
        const satY = skyH * 0.06 + Math.sin(sp * Math.PI * 0.8) * skyH * 0.04;
        if (satX >= -20 && satX <= W + 20) {
          ctx.save();
          ctx.translate(satX, satY);
          const spinA = T * 0.002;
          // Solar panels
          ctx.fillStyle = '#2050a0';
          ctx.save(); ctx.rotate(spinA);
          ctx.fillRect(-14, -2, 9, 4);
          ctx.fillRect(5, -2, 9, 4);
          ctx.fillStyle = '#4070c0';
          ctx.fillRect(-13, -1.5, 7, 3);
          ctx.fillRect(6, -1.5, 7, 3);
          ctx.restore();
          // Body
          ctx.fillStyle = '#c0c8d0';
          ctx.fillRect(-3, -3, 6, 6);
          ctx.fillStyle = '#e0e8f0';
          ctx.fillRect(-2.5, -2.5, 5, 5);
          // Antenna
          ctx.strokeStyle = '#909090'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, -8); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, -8, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ff4040'; ctx.fill();
          // Solar glint
          ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(T * 0.003));
          ctx.fillStyle = '#80c0ff';
          ctx.beginPath(); ctx.arc(-9, 0, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(9, 0, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // ── Parachutist ───────────────────────────────────────────────────────
      {
        const rngPar = makeRng(seed + 0xd1ce);
        const baseX  = rngPar() * W * 4;
        const descent = (T * 0.008) % (skyH * 0.9);
        const sx     = (baseX + T * 0.003) % (W * 4) - W * 0.2;
        if (sx >= -40 && sx <= W + 40) {
          const sy = 4 + descent;
          if (sy < skyH - 10) {
            ctx.save();
            ctx.translate(sx, sy);
            // Canopy
            const cg = ctx.createLinearGradient(-18, -16, 18, 0);
            cg.addColorStop(0, '#e03030'); cg.addColorStop(0.5, '#f0f0f0'); cg.addColorStop(1, '#3060e0');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.arc(0, 0, 18, Math.PI, 0); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(80,80,80,0.5)'; ctx.lineWidth = 0.7;
            for (let r = -14; r <= 14; r += 7) {
              ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(0, 16); ctx.stroke();
            }
            // Figure
            ctx.fillStyle = '#1a1a2a';
            ctx.beginPath(); ctx.arc(0, 18, 2.5, 0, Math.PI * 2); ctx.fill(); // head
            ctx.fillRect(-1.5, 20, 3, 6); // body
            // legs dangling
            ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(-1, 26); ctx.lineTo(-3, 31); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(1, 26); ctx.lineTo(3, 31); ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2 ── THEME-SPECIFIC FAR BACKGROUND
    // ════════════════════════════════════════════════════════════════════════

    // ── CITY ─────────────────────────────────────────────────────────────
    if (theme === 'city') {
      // Smog/pollution haze
      const smog = ctx.createLinearGradient(0, skyH * 0.5, 0, skyH);
      smog.addColorStop(0, 'rgba(120,140,100,0)');
      smog.addColorStop(1, 'rgba(120,140,100,0.22)');
      ctx.fillStyle = smog; ctx.fillRect(0, skyH * 0.5, W, skyH * 0.5);

      // Far background towers (very distant, darker)
      const rngBg = makeRng(seed + 13);
      for (let i = 0; i < 22; i++) {
        const wx = rngBg() * W * 3.5;                                            // 1
        const sx = ((wx - scrollPx * 0.06) % (W * 3.5) + W * 3.5) % (W * 3.5);
        if (sx < -30 || sx > W + 30) { rngBg(); rngBg(); continue; }            // skip 2
        const bh = 40 + rngBg() * 90;                                            // 1
        const bw = 12 + rngBg() * 28;                                            // 1
        ctx.fillStyle = '#16202e';
        ctx.fillRect(sx - bw/2, skyH - bh, bw, bh + 2);
        if (bh > 95) { // antenna spire
          ctx.strokeStyle = '#283848'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx, skyH-bh); ctx.lineTo(sx, skyH-bh-18); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, skyH-bh-18, 2, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,80,80,0.7)'; ctx.fill();
        }
        const rngWb = makeRng(seed + 200 + i);
        const cols2 = Math.floor(bw / 6); const rows2 = Math.floor(bh / 8);
        for (let r = 0; r < rows2; r++) for (let c = 0; c < cols2; c++) {
          ctx.fillStyle = rngWb() < 0.45 ? 'rgba(255,230,120,0.35)' : 'transparent';
          if (rngWb() < 0.45) ctx.fillRect(sx - bw/2 + 2 + c*6, skyH - bh + 4 + r*8, 3, 4);
        }
      }

      // Mid-ground buildings
      const rngB = makeRng(seed + 7);
      for (let i = 0; i < 20; i++) {
        const wx  = rngB() * W * 2.8;                                            // 1
        const sx  = ((wx - scrollPx * 0.12) % (W * 2.8) + W * 2.8) % (W * 2.8);
        if (sx < -55 || sx > W + 55) { rngB(); rngB(); continue; }              // skip 2
        const bh  = 35 + rngB() * 80;                                            // 1
        const bw  = 20 + rngB() * 40;                                            // 1
        const bg  = ctx.createLinearGradient(sx, skyH - bh, sx + bw*0.5, skyH);
        bg.addColorStop(0, '#1e2c3e'); bg.addColorStop(0.6, '#243444'); bg.addColorStop(1, '#2c3c50');
        ctx.fillStyle = bg;
        ctx.fillRect(sx - bw/2, skyH - bh, bw, bh + 2);
        // rooftop details
        ctx.fillStyle = '#304050'; ctx.fillRect(sx - bw/2, skyH - bh - 3, bw, 4);
        if (bh > 78) {
          ctx.strokeStyle = '#506070'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(sx, skyH-bh-3); ctx.lineTo(sx, skyH-bh-16); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, skyH-bh-16, 2.5, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,60,60,0.8)'; ctx.fill();
        }
        // billboard on some buildings
        if (bh > 55 && bw > 28 && i % 4 === 0) {
          const bbw = bw * 0.85, bbh = 10;
          const bby = skyH - bh * 0.55;
          ctx.fillStyle = 'rgba(0,80,160,0.85)';
          ctx.fillRect(sx - bbw/2, bby, bbw, bbh);
          ctx.strokeStyle = '#80b0e0'; ctx.lineWidth = 0.8;
          ctx.strokeRect(sx - bbw/2, bby, bbw, bbh);
        }
        const rngW = makeRng(seed + 100 + i);
        const cols = Math.floor(bw / 7); const rows = Math.floor(bh / 9);
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          if (rngW() < 0.58) {
            ctx.fillStyle = rngW() < 0.12 ? 'rgba(180,210,255,0.70)' : 'rgba(255,238,145,0.65)';
            ctx.fillRect(sx - bw/2 + 3 + c*7, skyH - bh + 5 + r*9, 4, 5);
          } else { rngW(); }
        }
      }

      // Foreground shorter buildings (near parallax)
      const rngBn = makeRng(seed + 14);
      for (let i = 0; i < 14; i++) {
        const wx = rngBn() * W * 1.8;                                            // 1
        const sx = ((wx - scrollPx * 0.20) % (W * 1.8) + W * 1.8) % (W * 1.8);
        if (sx < -30 || sx > W + 30) { rngBn(); rngBn(); continue; }            // skip 2
        const approxMi2 = offsetMi + sx * MI_PER_PX;
        const py2 = elToY(elevAt(approxMi2));
        const bh = 18 + rngBn() * 28;                                            // 1
        const bw = 22 + rngBn() * 36;                                            // 1
        ctx.fillStyle = '#283444';
        ctx.fillRect(sx - bw/2, py2 - bh, bw, bh);
        ctx.fillStyle = '#1e2838';
        ctx.fillRect(sx - bw/2, py2 - bh - 3, bw, 4);
        const rngW2 = makeRng(seed + 300 + i);
        const cols2 = Math.floor(bw/8); const rows2 = Math.floor(bh/10);
        for (let r = 0; r < rows2; r++) for (let c = 0; c < cols2; c++) {
          if (rngW2() < 0.50) {
            ctx.fillStyle = 'rgba(255,235,140,0.55)';
            ctx.fillRect(sx - bw/2 + 3 + c*8, py2 - bh + 4 + r*10, 4, 5);
          } else { rngW2(); }
        }
      }

      // Street lamps + traffic lights
      const rngL = makeRng(seed + 8);
      for (let i = 0; i < 16; i++) {
        const wx  = rngL() * W * 1.6;                                            // 1
        const sx  = ((wx - scrollPx * 0.78) % (W * 1.6) + W * 1.6) % (W * 1.6);
        if (sx < -10 || sx > W + 10) { rngL(); continue; }                      // skip 1
        const approxMi = offsetMi + sx * MI_PER_PX;
        const py = elToY(elevAt(approxMi));
        const ph  = 26 + rngL() * 16;                                            // 1
        ctx.strokeStyle = '#5a6070'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(sx, py); ctx.lineTo(sx, py - ph); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, py-ph); ctx.lineTo(sx+10, py-ph); ctx.stroke();
        // lamp glow
        const lg = ctx.createRadialGradient(sx+10, py-ph, 0, sx+10, py-ph, 8);
        lg.addColorStop(0, 'rgba(255,230,130,0.9)'); lg.addColorStop(1, 'rgba(255,230,130,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(sx+10, py-ph, 8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx+10, py-ph, 3, 0, Math.PI*2);
        ctx.fillStyle = '#ffe880'; ctx.fill();
      }
    }

    // ── COASTAL ───────────────────────────────────────────────────────────
    if (theme === 'coastal') {
      // Full ocean fill from skyH down
      const og = ctx.createLinearGradient(0, skyH, 0, groundBot);
      og.addColorStop(0, '#1478c8'); og.addColorStop(0.3, '#0e5898');
      og.addColorStop(0.8, '#082848'); og.addColorStop(1, '#041428');
      ctx.fillStyle = og; ctx.fillRect(0, skyH, W, groundBot - skyH);

      // Sun reflection path on water
      const refG = ctx.createLinearGradient(W*0.6, skyH, W*0.8, skyH + 20);
      refG.addColorStop(0, 'rgba(255,230,100,0)');
      refG.addColorStop(0.5, 'rgba(255,230,100,0.22)');
      refG.addColorStop(1, 'rgba(255,230,100,0)');
      ctx.fillStyle = refG; ctx.fillRect(W*0.5, skyH, W*0.5, 30);

      // Wave layers (3 depths)
      for (let layer = 0; layer < 3; layer++) {
        const waveY = skyH + 8 + layer * 14;
        const waveAlpha = 0.15 + layer * 0.12;
        const waveSpeed = 0.3 + layer * 0.25;
        ctx.strokeStyle = `rgba(150,210,255,${waveAlpha})`; ctx.lineWidth = 1.5 - layer * 0.3;
        for (let w = 0; w < 9; w++) {
          const wx2 = ((w * 95 + scrollPx * waveSpeed) % (W * 1.1) + W * 1.1) % (W * 1.1) - 50;
          const wy = waveY + Math.sin(w * 1.3 + scrollPx * 0.008) * 2;
          ctx.beginPath(); ctx.moveTo(wx2, wy);
          ctx.quadraticCurveTo(wx2 + 14, wy - 2, wx2 + 28, wy);
          ctx.stroke();
        }
      }

      // Sailboats
      const rngBt = makeRng(seed + 15);
      for (let i = 0; i < 5; i++) {
        const wx2 = rngBt() * W * 6;                                             // 1
        const sx  = ((wx2 - scrollPx * 0.08) % (W * 6) + W * 6) % (W * 6);
        if (sx < -30 || sx > W + 30) { rngBt(); rngBt(); continue; }            // skip 2
        const by  = skyH + 10 + rngBt() * 20;                                    // 1
        const bs  = 0.5 + rngBt() * 1.0;                                         // 1 scale
        // hull
        ctx.fillStyle = '#f0e8d0';
        ctx.beginPath(); ctx.moveTo(sx-10*bs, by); ctx.lineTo(sx+12*bs, by); ctx.lineTo(sx+8*bs, by+5*bs); ctx.lineTo(sx-8*bs, by+5*bs); ctx.closePath(); ctx.fill();
        // mast
        ctx.strokeStyle = '#c8b890'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx, by); ctx.lineTo(sx, by-22*bs); ctx.stroke();
        // sail
        ctx.fillStyle = 'rgba(255,248,235,0.88)';
        ctx.beginPath(); ctx.moveTo(sx, by-22*bs); ctx.lineTo(sx+14*bs, by-8*bs); ctx.lineTo(sx, by); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(240,235,220,0.70)';
        ctx.beginPath(); ctx.moveTo(sx, by-22*bs); ctx.lineTo(sx-8*bs, by-6*bs); ctx.lineTo(sx, by); ctx.closePath(); ctx.fill();
      }

      // Cliffs / headlands (taller, more prominent)
      const rngCl = makeRng(seed + 2);
      for (let i = 0; i < 10; i++) {
        const wx2 = rngCl() * W * 3.5;                                           // 1
        const sx  = ((wx2 - scrollPx * 0.07) % (W * 3.5) + W * 3.5) % (W * 3.5);
        if (sx < -130 || sx > W + 130) { rngCl(); rngCl(); continue; }          // skip 2
        const ch  = 40 + rngCl() * 58;                                           // 1
        const cw  = 80 + rngCl() * 130;                                          // 1
        const clg = ctx.createLinearGradient(sx, skyH - ch, sx, skyH + 5);
        clg.addColorStop(0, '#2a5038'); clg.addColorStop(0.6, '#1e3a28'); clg.addColorStop(1, '#182e20');
        ctx.fillStyle = clg;
        ctx.beginPath();
        ctx.moveTo(sx - cw/2, skyH + 5);
        ctx.lineTo(sx - cw/2 + 5, skyH - ch + 15);
        ctx.bezierCurveTo(sx - cw*0.15, skyH - ch, sx + cw*0.15, skyH - ch, sx + cw/2 - 5, skyH - ch + 12);
        ctx.lineTo(sx + cw/2, skyH + 5);
        ctx.closePath(); ctx.fill();
        // Cliff face detail
        ctx.strokeStyle = 'rgba(20,50,30,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx - cw*0.25, skyH - ch*0.3); ctx.lineTo(sx - cw*0.15, skyH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + cw*0.10, skyH - ch*0.5); ctx.lineTo(sx + cw*0.20, skyH); ctx.stroke();
      }

      // Seagulls (more of them, clustered near water)
      const rngG = makeRng(seed + 11);
      ctx.strokeStyle = 'rgba(220,235,248,0.75)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 18; i++) {
        const wx2 = rngG() * W * 6;                                              // 1
        const sx  = ((wx2 - scrollPx * 0.20) % (W * 6) + W * 6) % (W * 6);
        if (sx < -12 || sx > W + 12) { rngG(); rngG(); continue; }              // skip 2
        const gy2 = 4 + rngG() * (skyH * 0.65);                                  // 1
        const sz  = 2.5 + rngG() * 4.5;                                          // 1
        ctx.beginPath();
        ctx.moveTo(sx-sz, gy2); ctx.lineTo(sx, gy2-sz*0.45); ctx.lineTo(sx+sz, gy2);
        ctx.stroke();
      }

      // Sandy beach strip
      const sandG = ctx.createLinearGradient(0, groundBot - 14, 0, groundBot);
      sandG.addColorStop(0, 'rgba(210,185,130,0.5)'); sandG.addColorStop(1, 'rgba(180,155,100,0)');
      ctx.fillStyle = sandG;
      ctx.beginPath(); terrainPath(-2); ctx.lineTo(miToX(visEnd), groundBot); ctx.lineTo(miToX(visStart), groundBot); ctx.closePath();
      ctx.fill();
    }

    // ── MOUNTAINS / ALPINE / VALLEY / COUNTRY ─────────────────────────────
    if (['mountain','alpine','valley','country'].includes(theme)) {
      const dramatic = theme === 'mountain' || theme === 'alpine';

      // Ultra-far ghost mountains (barely visible, sky-filling)
      const rngMg = makeRng(seed + 13);
      ctx.globalAlpha = dramatic ? 0.30 : 0.18;
      for (let i = 0; i < 20; i++) {
        const wx  = rngMg() * W * 6;                                             // 1
        const sx  = ((wx - scrollPx * 0.02) % (W * 6) + W * 6) % (W * 6);
        if (sx < -200 || sx > W + 200) { rngMg(); rngMg(); continue; }          // skip 2
        const ph  = (dramatic ? 60 : 30) + rngMg() * (dramatic ? 80 : 40);     // 1
        const bw  = 120 + rngMg() * 200;                                         // 1
        ctx.beginPath();
        ctx.moveTo(sx - bw/2, skyH + 2);
        ctx.bezierCurveTo(sx - bw*0.3, skyH - ph*0.5, sx - bw*0.08, skyH - ph, sx, skyH - ph);
        ctx.bezierCurveTo(sx + bw*0.08, skyH - ph, sx + bw*0.3, skyH - ph*0.5, sx + bw/2, skyH + 2);
        ctx.closePath();
        ctx.fillStyle = theme === 'alpine' ? '#1a2030' : '#7098b8'; ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Far mountains
      const rngMf = makeRng(seed + 2);
      ctx.globalAlpha = dramatic ? 0.72 : 0.52;
      for (let i = 0; i < 14; i++) {
        const wx  = rngMf() * W * 4.0;                                           // 1
        const sx  = ((wx - scrollPx * 0.04) % (W * 4.0) + W * 4.0) % (W * 4.0);
        if (sx < -150 || sx > W + 150) { rngMf(); rngMf(); continue; }          // skip 2
        const ph  = (dramatic ? 55 : 32) + rngMf() * (dramatic ? 70 : 45);     // 1
        const bw  = 85 + rngMf() * 130;                                          // 1
        ctx.beginPath();
        ctx.moveTo(sx - bw/2, skyH + 2);
        ctx.bezierCurveTo(sx - bw*0.28, skyH - ph*0.5, sx - bw*0.08, skyH - ph, sx, skyH - ph);
        ctx.bezierCurveTo(sx + bw*0.08, skyH - ph, sx + bw*0.28, skyH - ph*0.5, sx + bw/2, skyH + 2);
        ctx.closePath();
        const fmc = theme === 'alpine' ? '#1a2840' : theme === 'valley' ? '#4a6888' : '#5070a0';
        ctx.fillStyle = fmc; ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Near mountains
      const rngMn = makeRng(seed + 9);
      for (let i = 0; i < 12; i++) {
        const wx  = rngMn() * W * 3.0;                                           // 1
        const sx  = ((wx - scrollPx * 0.09) % (W * 3.0) + W * 3.0) % (W * 3.0);
        if (sx < -140 || sx > W + 140) { rngMn(); rngMn(); rngMn(); continue; } // skip 3
        const ph     = (dramatic ? 72 : 44) + rngMn() * (dramatic ? 88 : 55);  // 1
        const bw     = 65 + rngMn() * 115;                                       // 1
        const jagged = rngMn() > (dramatic ? 0.25 : 0.5);                        // 1
        ctx.beginPath();
        ctx.moveTo(sx - bw/2, skyH + 2);
        if (jagged) {
          ctx.lineTo(sx - bw*0.22, skyH - ph*0.65);
          ctx.lineTo(sx - bw*0.07, skyH - ph*0.48);
          ctx.lineTo(sx,           skyH - ph);
          ctx.lineTo(sx + bw*0.08, skyH - ph*0.54);
          ctx.lineTo(sx + bw*0.24, skyH - ph*0.70);
        } else {
          ctx.bezierCurveTo(sx - bw*0.22, skyH - ph*0.48, sx - bw*0.06, skyH - ph, sx, skyH - ph);
          ctx.bezierCurveTo(sx + bw*0.06, skyH - ph, sx + bw*0.22, skyH - ph*0.48, sx + bw/2, skyH + 2);
        }
        ctx.lineTo(sx + bw/2, skyH + 2); ctx.closePath();
        const mc  = theme === 'alpine' ? '#0a1828' : theme === 'mountain' ? '#1a3050' : '#243a5a';
        const mc2 = theme === 'alpine' ? '#182038' : '#28405e';
        const mg  = ctx.createLinearGradient(sx, skyH - ph, sx, skyH + 2);
        mg.addColorStop(0, mc); mg.addColorStop(1, mc2);
        ctx.fillStyle = mg; ctx.fill();
        const snowThresh = dramatic ? 55 : 80;
        if (ph > snowThresh) {
          const sw = bw * (jagged ? 0.14 : 0.18);
          ctx.beginPath(); ctx.moveTo(sx-sw, skyH-ph+ph*0.28); ctx.lineTo(sx, skyH-ph); ctx.lineTo(sx+sw, skyH-ph+ph*0.28); ctx.closePath();
          ctx.fillStyle = theme === 'alpine' ? 'rgba(220,235,255,0.95)' : 'rgba(228,238,248,0.90)'; ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.42)';
          ctx.beginPath(); ctx.moveTo(sx-sw*0.4, skyH-ph+ph*0.06); ctx.lineTo(sx, skyH-ph); ctx.lineTo(sx+sw*0.2, skyH-ph+ph*0.10); ctx.closePath(); ctx.fill();
        }
        if (theme === 'alpine' && ph > 50) {
          ctx.strokeStyle = 'rgba(200,220,250,0.40)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx-bw*0.08, skyH-ph+ph*0.40); ctx.lineTo(sx-bw*0.20, skyH-ph+ph*0.72); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx+bw*0.06, skyH-ph+ph*0.35); ctx.lineTo(sx+bw*0.16, skyH-ph+ph*0.66); ctx.stroke();
        }
      }

      // Mid ridgeline (extra layer between near mountains and hills)
      const rngRl = makeRng(seed + 17);
      for (let i = 0; i < 10; i++) {
        const wx = rngRl() * W * 2.5;                                            // 1
        const sx = ((wx - scrollPx * 0.14) % (W * 2.5) + W * 2.5) % (W * 2.5);
        if (sx < -200 || sx > W + 200) { rngRl(); rngRl(); continue; }          // skip 2
        const rh = (dramatic ? 35 : 20) + rngRl() * (dramatic ? 40 : 28);      // 1
        const rw = 130 + rngRl() * 200;                                          // 1
        const rlc = theme === 'alpine' ? '#101a28' : theme === 'mountain' ? '#1e3828' : '#2a5030';
        ctx.fillStyle = rlc;
        ctx.beginPath(); ctx.ellipse(sx, skyH + 6, rw, rh, 0, Math.PI, 0); ctx.fill();
      }

      // Alpine-specific: aurora borealis
      if (theme === 'alpine') {
        for (let band = 0; band < 3; band++) {
          const aY = skyH * (0.18 + band * 0.22);
          const aAlpha = 0.08 + band * 0.04;
          const aG = ctx.createLinearGradient(0, aY - 12, 0, aY + 12);
          const aColors = ['rgba(40,200,120,', 'rgba(40,120,200,', 'rgba(120,40,200,'];
          aG.addColorStop(0, aColors[band]+'0)');
          aG.addColorStop(0.5, aColors[band]+aAlpha+')');
          aG.addColorStop(1, aColors[band]+'0)');
          ctx.fillStyle = aG;
          ctx.beginPath();
          ctx.moveTo(0, aY);
          for (let x = 0; x <= W; x += 40) {
            const y = aY + Math.sin(x * 0.012 + scrollPx * 0.003 + band * 2) * 10;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, aY + 20); ctx.lineTo(0, aY + 20); ctx.closePath();
          ctx.fill();
        }
      }

      // Valley: farmhouse + wildflowers
      if (theme === 'valley') {
        const rngFm = makeRng(seed + 19);
        for (let i = 0; i < 4; i++) {
          const wx = rngFm() * W * 4;                                            // 1
          const sx = ((wx - scrollPx * 0.35) % (W * 4) + W * 4) % (W * 4);
          if (sx < -40 || sx > W + 40) { rngFm(); rngFm(); continue; }          // skip 2
          const approxMi2 = offsetMi + sx * MI_PER_PX;
          const py2 = elToY(elevAt(approxMi2));
          const fs = 0.7 + rngFm() * 0.6;                                        // 1
          const fc = rngFm() * 0;                                                 // 1 dummy
          void fc;
          // barn body
          ctx.fillStyle = '#7a3020'; ctx.fillRect(sx-12*fs, py2-18*fs, 24*fs, 18*fs);
          // roof
          ctx.fillStyle = '#601808';
          ctx.beginPath(); ctx.moveTo(sx-14*fs, py2-18*fs); ctx.lineTo(sx, py2-28*fs); ctx.lineTo(sx+14*fs, py2-18*fs); ctx.closePath(); ctx.fill();
          // door
          ctx.fillStyle = '#3a1808'; ctx.fillRect(sx-4*fs, py2-10*fs, 8*fs, 10*fs);
        }
      }
    }

    // ── DESERT ────────────────────────────────────────────────────────────
    if (theme === 'desert') {
      // Heat shimmer near horizon
      const shimG = ctx.createLinearGradient(0, skyH - 20, 0, skyH + 30);
      shimG.addColorStop(0, 'rgba(210,160,60,0)');
      shimG.addColorStop(0.5, 'rgba(220,170,70,0.20)');
      shimG.addColorStop(1, 'rgba(200,140,50,0)');
      ctx.fillStyle = shimG; ctx.fillRect(0, skyH - 20, W, 50);

      // Far ghost mesas (very distant, pale)
      const rngMsf = makeRng(seed + 22);
      ctx.globalAlpha = 0.40;
      for (let i = 0; i < 10; i++) {
        const wx = rngMsf() * W * 5;                                             // 1
        const sx = ((wx - scrollPx * 0.03) % (W * 5) + W * 5) % (W * 5);
        if (sx < -100 || sx > W + 100) { rngMsf(); rngMsf(); continue; }        // skip 2
        const mh = 20 + rngMsf() * 35;                                           // 1
        const mw = 100 + rngMsf() * 200;                                          // 1
        ctx.fillStyle = '#8a5838';
        ctx.beginPath();
        ctx.moveTo(sx-mw/2, skyH+2); ctx.lineTo(sx-mw/2+8, skyH-mh);
        ctx.lineTo(sx+mw/2-8, skyH-mh); ctx.lineTo(sx+mw/2, skyH+2); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Mid mesas (main layer, fully detailed)
      const rngMs = makeRng(seed + 2);
      for (let i = 0; i < 10; i++) {
        const wx  = rngMs() * W * 3.2;                                           // 1
        const sx  = ((wx - scrollPx * 0.06) % (W * 3.2) + W * 3.2) % (W * 3.2);
        if (sx < -140 || sx > W + 140) { rngMs(); rngMs(); continue; }          // skip 2
        const mh  = 40 + rngMs() * 68;                                           // 1
        const mw  = 75 + rngMs() * 150;                                          // 1
        ctx.beginPath();
        ctx.moveTo(sx-mw/2, skyH+2); ctx.lineTo(sx-mw/2, skyH-mh+14);
        ctx.lineTo(sx-mw/2+12, skyH-mh); ctx.lineTo(sx+mw/2-12, skyH-mh);
        ctx.lineTo(sx+mw/2, skyH-mh+14); ctx.lineTo(sx+mw/2, skyH+2); ctx.closePath();
        const dg = ctx.createLinearGradient(sx, skyH-mh, sx+mw*0.3, skyH+2);
        dg.addColorStop(0, '#6a3018'); dg.addColorStop(0.35, '#9a4828'); dg.addColorStop(1, '#c06038');
        ctx.fillStyle = dg; ctx.fill();
        ctx.strokeStyle = 'rgba(160,70,30,0.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx-mw/2, skyH-mh*0.35); ctx.lineTo(sx+mw/2, skyH-mh*0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx-mw/2, skyH-mh*0.60); ctx.lineTo(sx+mw/2, skyH-mh*0.60); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx-mw/2, skyH-mh*0.82); ctx.lineTo(sx+mw/2, skyH-mh*0.82); ctx.stroke();
        // Mesa shadow side
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(sx-mw/2, skyH-mh+14, 8, mh-14);
      }

      // Near large rock formations
      const rngRk = makeRng(seed + 23);
      for (let i = 0; i < 8; i++) {
        const wx = rngRk() * W * 2;                                              // 1
        const sx = ((wx - scrollPx * 0.18) % (W * 2) + W * 2) % (W * 2);
        if (sx < -50 || sx > W + 50) { rngRk(); rngRk(); continue; }            // skip 2
        const approxMi2 = offsetMi + sx * MI_PER_PX;
        const gy = elToY(elevAt(approxMi2));
        const rh = 18 + rngRk() * 30;                                            // 1
        const rw = 14 + rngRk() * 24;                                            // 1
        const rkg = ctx.createLinearGradient(sx, gy-rh, sx+rw*0.4, gy);
        rkg.addColorStop(0, '#b06030'); rkg.addColorStop(0.5, '#904828'); rkg.addColorStop(1, '#603018');
        ctx.fillStyle = rkg;
        ctx.beginPath();
        ctx.moveTo(sx-rw/2, gy); ctx.lineTo(sx-rw/2+3, gy-rh*0.6);
        ctx.lineTo(sx-rw*0.1, gy-rh); ctx.lineTo(sx+rw*0.3, gy-rh*0.8);
        ctx.lineTo(sx+rw/2, gy-rh*0.3); ctx.lineTo(sx+rw/2, gy); ctx.closePath();
        ctx.fill();
      }

      // Cracked earth texture on ground
      ctx.strokeStyle = 'rgba(100,50,20,0.18)'; ctx.lineWidth = 0.8;
      for (let s = 0; s <= STEPS; s += 8) {
        const mi2 = visStart + s * stepMi;
        const x2 = miToX(mi2), y2 = elToY(elevAt(mi2));
        ctx.beginPath(); ctx.moveTo(x2+4, y2+4); ctx.lineTo(x2+10, y2+10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2+8, y2+3); ctx.lineTo(x2+3, y2+9); ctx.stroke();
      }
    }

    // ── INTERSTATE ────────────────────────────────────────────────────────
    if (theme === 'interstate') {
      // Flat crop fields (horizontal rows filling ground area)
      const fieldColors = ['#5a7030','#4a6028','#6a7838','#7a8040'];
      for (let row = 0; row < 8; row++) {
        const fieldY = skyH + 6 + row * ((groundBot - skyH) / 8);
        const fc2 = fieldColors[row % fieldColors.length];
        ctx.fillStyle = fc2;
        ctx.fillRect(0, fieldY, W, (groundBot - skyH) / 8 + 1);
        // crop rows
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
        const rowSpacing = 6 + row * 1.5;
        for (let rr = 0; rr < W / rowSpacing; rr++) {
          const lx = ((rr * rowSpacing - scrollPx * (0.5 + row * 0.08)) % W + W * 2) % W;
          ctx.beginPath(); ctx.moveTo(lx, fieldY); ctx.lineTo(lx, fieldY + (groundBot - skyH) / 8); ctx.stroke();
        }
      }

      // Water tower
      const rngWt = makeRng(seed + 20);
      for (let i = 0; i < 3; i++) {
        const wx = rngWt() * W * 5;                                              // 1
        const sx = ((wx - scrollPx * 0.55) % (W * 5) + W * 5) % (W * 5);
        if (sx < -20 || sx > W + 20) { rngWt(); rngWt(); continue; }            // skip 2
        const approxMi2 = offsetMi + sx * MI_PER_PX;
        const py2 = elToY(elevAt(approxMi2));
        const wts = 0.8 + rngWt() * 0.6;                                         // 1
        const wtd = rngWt() * 0;                                                  // 1 dummy
        void wtd;
        const wh = 50 * wts;
        // legs
        ctx.strokeStyle = '#708090'; ctx.lineWidth = 2;
        const legPts = [[-12,0],[12,0],[-8,-wh*0.55],[8,-wh*0.55]];
        ctx.beginPath(); ctx.moveTo(sx+legPts[0][0]*wts, py2+legPts[0][1]); ctx.lineTo(sx+legPts[2][0]*wts, py2+legPts[2][1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx+legPts[1][0]*wts, py2+legPts[1][1]); ctx.lineTo(sx+legPts[3][0]*wts, py2+legPts[3][1]); ctx.stroke();
        // cross brace
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx-10*wts, py2-wh*0.28); ctx.lineTo(sx+10*wts, py2-wh*0.42); ctx.stroke();
        // tank
        ctx.fillStyle = '#9ab0b8';
        ctx.beginPath(); ctx.ellipse(sx, py2-wh*0.72, 14*wts, 16*wts, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#7a9098'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#b0c8d0';
        ctx.beginPath(); ctx.ellipse(sx, py2-wh*0.78, 14*wts, 5*wts, 0, 0, Math.PI*2); ctx.fill();
      }

      // Power lines with connecting wires
      const rngPL = makeRng(seed + 7);
      const polePositions: number[] = [];
      for (let i = 0; i < 14; i++) {
        const wx  = rngPL() * W * 2.0;                                           // 1
        const sx  = ((wx - scrollPx * 0.90) % (W * 2.0) + W * 2.0) % (W * 2.0);
        if (sx < -15 || sx > W + 15) { rngPL(); rngPL(); continue; }            // skip 2
        const approxMi = offsetMi + sx * MI_PER_PX;
        const py = elToY(elevAt(approxMi));
        const ph2 = 42 + rngPL() * 16;                                           // 1
        const pw  = 14 + rngPL() * 0;                                            // 1 dummy
        ctx.strokeStyle = '#787888'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, py-2); ctx.lineTo(sx, py-ph2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx-pw, py-ph2+6); ctx.lineTo(sx+pw, py-ph2+6); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx-pw, py-ph2+6); ctx.lineTo(sx-pw*0.5, py-ph2+18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx+pw, py-ph2+6); ctx.lineTo(sx+pw*0.5, py-ph2+18); ctx.stroke();
        ctx.fillStyle = '#909898';
        ctx.beginPath(); ctx.arc(sx-pw, py-ph2+6, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx+pw, py-ph2+6, 2, 0, Math.PI*2); ctx.fill();
        polePositions.push(sx, py - ph2 + 6);
      }
      // Draw wires between consecutive poles
      ctx.strokeStyle = 'rgba(80,85,100,0.55)'; ctx.lineWidth = 0.8;
      for (let p = 0; p < polePositions.length - 2; p += 2) {
        const x1 = polePositions[p], y1 = polePositions[p+1];
        const x2 = polePositions[p+2], y2 = polePositions[p+3];
        if (Math.abs(x2 - x1) < 250) {
          const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + 5;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
        }
      }

      // Grain silos
      const rngSi = makeRng(seed + 21);
      for (let i = 0; i < 4; i++) {
        const wx = rngSi() * W * 6;                                              // 1
        const sx = ((wx - scrollPx * 0.42) % (W * 6) + W * 6) % (W * 6);
        if (sx < -20 || sx > W + 20) { rngSi(); rngSi(); continue; }            // skip 2
        const approxMi2 = offsetMi + sx * MI_PER_PX;
        const py2 = elToY(elevAt(approxMi2));
        const ss = 0.6 + rngSi() * 0.7;                                          // 1
        const nd = rngSi() * 0; void nd;                                          // 1 dummy
        const sw2 = 10 * ss, sh = 35 * ss;
        // two cylinders
        for (let s2 = 0; s2 < 2; s2++) {
          const ox = (s2 - 0.5) * sw2 * 2.2;
          const sg2 = ctx.createLinearGradient(sx+ox-sw2, py2-sh, sx+ox+sw2, py2);
          sg2.addColorStop(0, '#b0b890'); sg2.addColorStop(0.4, '#d0d8b0'); sg2.addColorStop(1, '#909878');
          ctx.fillStyle = sg2;
          ctx.beginPath(); ctx.ellipse(sx+ox, py2-sh/2, sw2, sh/2, 0, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#808870'; ctx.lineWidth = 0.8; ctx.stroke();
          // cone top
          ctx.fillStyle = '#808060';
          ctx.beginPath(); ctx.moveTo(sx+ox-sw2, py2-sh); ctx.lineTo(sx+ox, py2-sh-10*ss); ctx.lineTo(sx+ox+sw2, py2-sh); ctx.closePath(); ctx.fill();
        }
      }

      // Flat horizon line
      const rngHz = makeRng(seed + 2);
      ctx.globalAlpha = 0.28;
      for (let i = 0; i < 6; i++) {
        const wx = rngHz() * W * 5;                                              // 1
        const sx = ((wx - scrollPx * 0.03) % (W * 5) + W * 5) % (W * 5);
        if (sx < -200 || sx > W + 200) { rngHz(); rngHz(); continue; }          // skip 2
        const rw = 180 + rngHz() * 280;                                          // 1
        const rh = 8  + rngHz() * 12;                                            // 1
        ctx.fillStyle = '#5888a8';
        ctx.beginPath(); ctx.ellipse(sx, skyH+3, rw, rh, 0, Math.PI, 0); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2.5 ── TRAIN TRACKS (interstate, country, valley, city)
    // ════════════════════════════════════════════════════════════════════════
    if (theme === 'interstate' || theme === 'country' || theme === 'valley' || theme === 'city') {
      const trackY   = skyH + 16;
      const trackPar = 0.20;

      // Ballast bed
      const ballG = ctx.createLinearGradient(0, trackY - 2, 0, trackY + 9);
      ballG.addColorStop(0, theme === 'city' ? '#484644' : '#7a6e60');
      ballG.addColorStop(1, theme === 'city' ? '#363432' : '#5a5048');
      ctx.fillStyle = ballG; ctx.fillRect(0, trackY - 2, W, 11);

      // Rail ties
      ctx.strokeStyle = theme === 'city' ? '#2e2a28' : '#5a3c20'; ctx.lineWidth = 2;
      const tieSpacing = 11;
      for (let t = -1; t < W / tieSpacing + 2; t++) {
        const tx = ((t * tieSpacing - scrollPx * trackPar) % (W + tieSpacing * 2) + W + tieSpacing * 2) % (W + tieSpacing * 2) - tieSpacing;
        ctx.beginPath(); ctx.moveTo(tx - 5, trackY); ctx.lineTo(tx + 5, trackY + 7); ctx.stroke();
      }

      // Two rails
      ctx.strokeStyle = '#b0b2b8'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(0, trackY + 1); ctx.lineTo(W, trackY + 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, trackY + 6); ctx.lineTo(W, trackY + 6); ctx.stroke();

      // Trains — three definitions: two eastbound (slow/fast), one westbound
      const rngTr = makeRng(seed + 25);
      const trainDefs = [
        { par: 0.07, range: W * 5 },   // slow eastbound freight
        { par: 0.12, range: W * 5 },   // faster eastbound
        { par: 0.36, range: W * 5 },   // westbound
      ];
      for (const { par, range } of trainDefs) {
        const baseX   = rngTr() * range;                                         // 1
        const numCars = 4 + Math.floor(rngTr() * 5);                            // 1
        const ccRoll  = rngTr();                                                 // 1 car colour
        const eastbound = par < trackPar;

        const rawX   = ((baseX - scrollPx * par) % range + range) % range;
        const trainX = rawX - W * 0.6;

        const locoW = 26, carW = 20, gap = 2;
        const totalW = locoW + numCars * (carW + gap);
        if (trainX > W + 40 || trainX + totalW < -40) continue;

        const ty = trackY - 13;
        const locoCol = theme === 'city' ? '#304870' : '#5a3020';
        const carCol  = ccRoll < 0.4
          ? (theme === 'city' ? '#4a6080' : '#8a5838')
          : (theme === 'city' ? '#506070' : '#707060');

        // Locomotive body
        ctx.fillStyle = locoCol;
        ctx.fillRect(trainX, ty, locoW, 13);
        // Cab (on leading end)
        const cabX = eastbound ? trainX + locoW - 9 : trainX;
        ctx.fillStyle = theme === 'city' ? '#2a4060' : '#3a2010';
        ctx.fillRect(cabX, ty - 4, 9, 10);
        // Cab window
        ctx.fillStyle = 'rgba(160,215,245,0.50)';
        ctx.fillRect(cabX + 1, ty - 3, 7, 5);
        // Headlight
        ctx.fillStyle = 'rgba(255,242,175,0.90)';
        const hlX = eastbound ? trainX + locoW : trainX;
        ctx.beginPath(); ctx.arc(hlX, ty + 6, 2.2, 0, Math.PI * 2); ctx.fill();
        // Smokestack
        ctx.strokeStyle = '#606870'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(trainX + 7, ty); ctx.lineTo(trainX + 7, ty - 7); ctx.stroke();
        // Smoke puffs
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = '#c0bfb8';
        for (let sp = 0; sp < 4; sp++) {
          const dir = eastbound ? -1 : 1;
          ctx.beginPath();
          ctx.arc(trainX + 7 + dir * sp * 4, ty - 7 - sp * 3, 2.5 + sp * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Freight / passenger cars
        for (let c = 0; c < numCars; c++) {
          const cx = trainX + locoW + gap + c * (carW + gap);
          ctx.fillStyle = carCol;
          ctx.fillRect(cx, ty + 2, carW, 11);
          ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.8;
          ctx.strokeRect(cx + 1, ty + 3, carW - 2, 9);
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fillRect(cx + 3, ty + 5, carW - 6, 5);
        }

        // Wheels
        ctx.fillStyle = '#282828';
        const wY = trackY + 1;
        ctx.beginPath(); ctx.arc(trainX + 5, wY, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(trainX + locoW - 5, wY, 2, 0, Math.PI * 2); ctx.fill();
        for (let c = 0; c < numCars; c++) {
          const cx = trainX + locoW + gap + c * (carW + gap);
          ctx.beginPath(); ctx.arc(cx + 3, wY, 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + carW - 3, wY, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3 ── CLOUDS  (skip desert; sparse alpine)
    // ════════════════════════════════════════════════════════════════════════
    if (theme !== 'desert' && theme !== 'city') {
      const rngC = makeRng(seed + 3);
      const cloudCount = theme === 'alpine' ? 5 : theme === 'mountain' ? 6 : 9;
      const cloudAlpha = theme === 'alpine' ? 0.45 : 0.78;
      for (let i = 0; i < cloudCount; i++) {
        const wx   = rngC() * W * 5.2;                                           // 1
        const sx   = ((wx - scrollPx * 0.15) % (W * 5.2) + W * 5.2) % (W * 5.2);
        if (sx < -140 || sx > W + 140) { rngC(); rngC(); rngC(); rngC(); continue; }// skip 4
        const cy2  = 8 + rngC() * skyH * 0.52;                                   // 1
        const cw   = 55 + rngC() * 100;                                           // 1
        const ch   = 12 + rngC() * 22;                                            // 1
        const alph = cloudAlpha + rngC() * 0.18;                                  // 1
        ctx.globalAlpha = alph * 0.28;
        ctx.fillStyle = theme === 'alpine' ? '#7090b0' : '#90b8d0';
        ctx.beginPath();
        ctx.ellipse(sx,          cy2+ch*0.6, cw*0.50, ch*0.42, 0, 0, Math.PI*2);
        ctx.ellipse(sx-cw*0.3,   cy2+ch*0.7, cw*0.34, ch*0.32, 0, 0, Math.PI*2);
        ctx.ellipse(sx+cw*0.3,   cy2+ch*0.65,cw*0.36, ch*0.34, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = alph;
        ctx.fillStyle = theme === 'alpine' ? '#c8d8e8' : '#eef5fc';
        ctx.beginPath();
        ctx.ellipse(sx,          cy2,          cw*0.50, ch,       0, 0, Math.PI*2);
        ctx.ellipse(sx-cw*0.3,   cy2+ch*0.2,   cw*0.38, ch*0.72, 0, 0, Math.PI*2);
        ctx.ellipse(sx+cw*0.3,   cy2+ch*0.1,   cw*0.40, ch*0.76, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(sx-cw*0.06, cy2-ch*0.10, cw*0.28, ch*0.48, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4 ── HILLS
    // ════════════════════════════════════════════════════════════════════════
    if (!['city','desert','interstate'].includes(theme)) {
      // Far hills
      const rngHf = makeRng(seed + 4);
      const hillCol = theme === 'alpine' ? '#252828' : theme === 'mountain' ? '#2a4820' : '#4a8038';
      ctx.globalAlpha = 0.80;
      for (let i = 0; i < 7; i++) {
        const wx = rngHf() * W * 3.2;                                            // 1
        const sx = ((wx - scrollPx * 0.28) % (W * 3.2) + W * 3.2) % (W * 3.2);
        if (sx < -230 || sx > W + 230) { rngHf(); rngHf(); continue; }          // skip 2
        const rw = 110 + rngHf() * 180;                                          // 1
        const rh =  28 + rngHf() * 22;                                           // 1
        ctx.fillStyle = hillCol;
        ctx.beginPath(); ctx.ellipse(sx, skyH + 8, rw, rh, 0, Math.PI, 0); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Near hills
      const rngHn = makeRng(seed + 6);
      const nearHillCol = theme === 'alpine' ? '#1a1c18' : theme === 'mountain' ? '#1e3818' : '#2e6020';
      for (let i = 0; i < 6; i++) {
        const wx = rngHn() * W * 2.4;                                            // 1
        const sx = ((wx - scrollPx * 0.50) % (W * 2.4) + W * 2.4) % (W * 2.4);
        if (sx < -250 || sx > W + 250) { rngHn(); rngHn(); continue; }          // skip 2
        const rw = 140 + rngHn() * 200;                                          // 1
        const rh =  26 + rngHn() * 20;                                           // 1
        ctx.fillStyle = nearHillCol;
        ctx.beginPath(); ctx.ellipse(sx, skyH + 6, rw, rh, 0, Math.PI, 0); ctx.fill();
      }
    }
    // Desert: sandy dunes instead of hills
    if (theme === 'desert') {
      const rngDn = makeRng(seed + 4);
      for (let i = 0; i < 6; i++) {
        const wx = rngDn() * W * 2.8;                                            // 1
        const sx = ((wx - scrollPx * 0.40) % (W * 2.8) + W * 2.8) % (W * 2.8);
        if (sx < -250 || sx > W + 250) { rngDn(); rngDn(); continue; }          // skip 2
        const rw = 120 + rngDn() * 180;                                          // 1
        const rh =  18 + rngDn() * 20;                                           // 1
        const dg2 = ctx.createLinearGradient(sx, skyH, sx, skyH + 8);
        dg2.addColorStop(0, '#9a6838'); dg2.addColorStop(1, '#703a18');
        ctx.fillStyle = dg2;
        ctx.beginPath(); ctx.ellipse(sx, skyH + 6, rw, rh, 0, Math.PI, 0); ctx.fill();
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5 ── TERRAIN FILL
    // ════════════════════════════════════════════════════════════════════════
    ctx.beginPath();
    terrainPath(0);
    ctx.lineTo(miToX(visEnd), H); ctx.lineTo(miToX(visStart), H); ctx.closePath();
    const gc = GROUND[theme];
    const gg = ctx.createLinearGradient(0, skyH, 0, H);
    gg.addColorStop(0,   gc[0]);
    gg.addColorStop(0.35, theme === 'desert' ? '#7a4820' : theme === 'alpine' ? '#2a2a20' : '#225018');
    gg.addColorStop(1,   gc[1]);
    ctx.fillStyle = gg; ctx.fill();

    // Ground surface details
    if (theme === 'desert') {
      // Rocky pebble texture
      for (let s = 0; s <= STEPS; s += 6) {
        const mi = visStart + s * stepMi;
        const x = miToX(mi), y = elToY(elevAt(mi));
        ctx.fillStyle = 'rgba(160,80,30,0.20)';
        ctx.beginPath(); ctx.ellipse(x, y + 3, 3, 1.5, 0, 0, Math.PI*2); ctx.fill();
      }
    } else if (theme === 'alpine') {
      // Rocky scree
      for (let s = 0; s <= STEPS; s += 5) {
        const mi = visStart + s * stepMi;
        const x = miToX(mi), y = elToY(elevAt(mi));
        ctx.fillStyle = 'rgba(100,100,80,0.18)';
        ctx.beginPath(); ctx.rect(x, y + 2, 4, 2); ctx.fill();
      }
    } else {
      // Grass blades
      for (let s = 0; s <= STEPS; s += 4) {
        const mi = visStart + s * stepMi;
        const x = miToX(mi), y = elToY(elevAt(mi));
        ctx.strokeStyle = 'rgba(80,160,50,0.20)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+1, y-4); ctx.stroke();
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6 ── VEGETATION  (drawn BEFORE road)
    // ════════════════════════════════════════════════════════════════════════
    const rngT = makeRng(seed + 5);
    const vegCount = theme === 'valley' ? 70 : theme === 'desert' ? 55 : theme === 'alpine' ? 35 : theme === 'city' ? 20 : theme === 'interstate' ? 25 : 60;
    for (let i = 0; i < vegCount; i++) {
      const wx = rngT() * W * 3.0;                                               // 1
      const sx = ((wx - scrollPx * 0.82) % (W * 3.0) + W * 3.0) % (W * 3.0);
      if (sx < -35 || sx > W + 35) { rngT(); rngT(); continue; }                // skip 2
      const approxMi = offsetMi + sx * MI_PER_PX;
      const gy = elToY(elevAt(approxMi));
      // Skip vegetation that would overlap road (within 8px of road surface)
      // Trees sit AT gy (road level) - we draw them slightly offset
      const h  = 20 + rngT() * 28;                                               // 1
      const tp = rngT();                                                          // 1  (type selector)

      if (theme === 'desert') {
        // Saguaro or scrub
        if (tp < 0.50) {
          ctx.strokeStyle = '#3a5e1a'; ctx.lineCap = 'round';
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx, gy - h); ctx.stroke();
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(sx, gy-h*0.52); ctx.lineTo(sx-h*0.28, gy-h*0.52); ctx.lineTo(sx-h*0.28, gy-h*0.75); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, gy-h*0.64); ctx.lineTo(sx+h*0.22, gy-h*0.64); ctx.lineTo(sx+h*0.22, gy-h*0.82); ctx.stroke();
          ctx.lineCap = 'butt';
        } else {
          // Scrub / tumbleweed
          ctx.fillStyle = '#4a5e22';
          ctx.beginPath(); ctx.arc(sx, gy - h*0.30, h*0.30, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#5a7028';
          ctx.beginPath(); ctx.arc(sx, gy - h*0.35, h*0.20, 0, Math.PI*2); ctx.fill();
        }
      } else if (theme === 'alpine') {
        // Sparse stunted pine
        if (tp < 0.70) {
          const sh = h * 0.65;
          ctx.fillStyle = '#1a3820';
          ctx.beginPath(); ctx.moveTo(sx, gy-sh); ctx.lineTo(sx-sh*0.30, gy); ctx.lineTo(sx+sh*0.30, gy); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#1e4224';
          ctx.beginPath(); ctx.moveTo(sx, gy-sh*0.72); ctx.lineTo(sx-sh*0.35, gy-sh*0.08); ctx.lineTo(sx+sh*0.35, gy-sh*0.08); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#5a3a1a'; ctx.fillRect(sx-2, gy-sh*0.10, 4, sh*0.10);
        } else {
          // Rock
          ctx.fillStyle = '#5a5848';
          ctx.beginPath(); ctx.moveTo(sx-h*0.18, gy); ctx.lineTo(sx-h*0.08, gy-h*0.25); ctx.lineTo(sx+h*0.10, gy-h*0.22); ctx.lineTo(sx+h*0.18, gy); ctx.closePath(); ctx.fill();
        }
      } else if (theme === 'city') {
        // Sparse deciduous only
        ctx.fillStyle = '#5a3820'; ctx.fillRect(sx-2, gy-h*0.38, 4, h*0.38);
        ctx.fillStyle = '#2a5a18';
        ctx.beginPath(); ctx.arc(sx, gy-h*0.65, h*0.40, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#348020';
        ctx.beginPath(); ctx.arc(sx-h*0.18, gy-h*0.70, h*0.28, 0, Math.PI*2); ctx.fill();
      } else if (theme === 'mountain') {
        // Dense pines
        const layers: [number, number, string][] = [[0.55, 0.32, '#1a4820'], [0.72, 0.10, '#1e5428'], [1.0, 0, '#246030']];
        for (const [topF, botF, col] of layers) {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.moveTo(sx, gy-h*topF); ctx.lineTo(sx-h*0.34, gy-h*botF); ctx.lineTo(sx+h*0.34, gy-h*botF); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(sx-2, gy-h*0.10, 4, h*0.10);
      } else {
        // Mixed: pine or deciduous
        if (tp < 0.52) {
          const layers: [number, number, string][] = [[0.55, 0.32, '#1a4820'], [0.72, 0.10, '#1e5428'], [1.0, 0, '#246030']];
          for (const [topF, botF, col] of layers) {
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.moveTo(sx, gy-h*topF); ctx.lineTo(sx-h*0.34, gy-h*botF); ctx.lineTo(sx+h*0.34, gy-h*botF); ctx.closePath(); ctx.fill();
          }
          ctx.fillStyle = '#5a3a1a'; ctx.fillRect(sx-2, gy-h*0.10, 4, h*0.10);
        } else {
          ctx.fillStyle = '#6a4020'; ctx.fillRect(sx-2.5, gy-h*0.38, 5, h*0.38);
          ctx.fillStyle = '#2a6a18';
          ctx.beginPath(); ctx.arc(sx, gy-h*0.65, h*0.42, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#348a20';
          ctx.beginPath(); ctx.arc(sx-h*0.18, gy-h*0.70, h*0.28, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(sx+h*0.16, gy-h*0.72, h*0.26, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = 'rgba(80,180,40,0.22)';
          ctx.beginPath(); ctx.arc(sx-h*0.06, gy-h*0.82, h*0.20, 0, Math.PI*2); ctx.fill();
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7 ── ROAD  (drawn AFTER vegetation)
    // ════════════════════════════════════════════════════════════════════════
    ctx.lineCap = 'butt';
    // Ground cross-section strata (topsoil → clay → bedrock), clipped to below-terrain region
    {
      ctx.save();
      ctx.beginPath();
      terrainPath(0);
      ctx.lineTo(miToX(visEnd), H); ctx.lineTo(miToX(visStart), H); ctx.closePath();
      ctx.clip();

      // Theme-tuned stratum colours  [topsoil, clay, bedrock]
      const [topsoilC, clayC, rockC] =
        theme === 'desert'   ? ['#7a4018', '#552a0e', '#3a1c08'] :
        theme === 'city'     ? ['#28281e', '#1e1e16', '#141410'] :
        theme === 'mountain' ? ['#2c2818', '#20180e', '#16140a'] :
        theme === 'alpine'   ? ['#282a18', '#1c200c', '#12160a'] :
        theme === 'coastal'  ? ['#2a3028', '#1e2416', '#12180a'] :
                               ['#323820', '#262010', '#18160a'];

      // Gradient fill (topsoil near surface, bedrock at bottom)
      const gndG = ctx.createLinearGradient(0, groundBot, 0, H);
      gndG.addColorStop(0,    topsoilC);
      gndG.addColorStop(0.45, clayC);
      gndG.addColorStop(1,    rockC);
      ctx.fillStyle = gndG;
      ctx.fillRect(0, 0, W, H);

      // Subtle straight strata bands (no waves)
      const strataFracs = [0.25, 0.52, 0.76];
      for (const frac of strataFracs) {
        const baseY = groundBot + frac * (H - groundBot);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, baseY, W, 3);
      }

      // Embedded rocks / pebbles (world-space so they scroll with the road)
      const rngRock = makeRng(seed + 0xb00b);
      for (let i = 0; i < 110; i++) {
        const rmi   = rngRock() * (distTotal + 4) - 2;
        const depth = 0.04 + rngRock() * 0.90;   // 0 = near surface, 1 = deep
        const rw    = 1.5 + rngRock() * 8.5;
        const rh    = rw * (0.38 + rngRock() * 0.62);
        const br    = Math.floor(10 + rngRock() * 30);
        const angle = rngRock() * Math.PI;
        const rx    = miToX(rmi);
        if (rx < -rw - 2 || rx > W + rw + 2) continue;
        const surfY = elToY(elevAt(rmi));
        const ry    = surfY + depth * (H - surfY);
        // Rock body
        ctx.fillStyle = `rgba(${br},${br},${Math.max(0,br-3)},0.58)`;
        ctx.beginPath();
        ctx.ellipse(rx, ry, rw, rh, angle, 0, Math.PI * 2);
        ctx.fill();
        // Highlight fleck
        ctx.fillStyle = `rgba(${br+18},${br+14},${br+8},0.28)`;
        ctx.beginPath();
        ctx.ellipse(rx - rw * 0.22, ry - rh * 0.28, rw * 0.42, rh * 0.34, angle, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Buried items: bones, cars, trash, fossils, etc. ────────────────────
      const rngBury = makeRng(seed + 0xc0ffee);
      for (let bi = 0; bi < 130; bi++) {
        const bmi   = rngBury() * (distTotal + 4) - 2;
        const depth = 0.10 + rngBury() * 0.78;
        const itype = Math.floor(rngBury() * 30);
        const sc    = 0.65 + rngBury() * 0.85;
        const tilt  = (rngBury() - 0.5) * 1.2;
        const alpha = 0.22 + rngBury() * 0.28;
        const rx    = miToX(bmi);
        if (rx < -60 || rx > W + 60) continue;
        const surfY = elToY(elevAt(bmi));
        const ry    = surfY + depth * (H - surfY);
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(tilt);
        ctx.globalAlpha = alpha;
        switch (itype) {
          case 0: { // Femur bone
            ctx.fillStyle = '#d4c0a0';
            ctx.beginPath(); ctx.arc(-8*sc, 0, 3.5*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(8*sc, 0, 3.5*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(-8*sc, -2.5*sc, 2*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(8*sc, 2.5*sc, 2*sc, 0, Math.PI*2); ctx.fill();
            ctx.fillRect(-7*sc, -1.2*sc, 14*sc, 2.4*sc);
            break;
          }
          case 1: { // Skull
            ctx.fillStyle = '#c8b89a';
            ctx.beginPath(); ctx.ellipse(0, -2*sc, 6*sc, 5*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, 3*sc, 4*sc, 2.5*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.beginPath(); ctx.ellipse(-2.2*sc, -2.5*sc, 1.8*sc, 1.6*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(2.2*sc, -2.5*sc, 1.8*sc, 1.6*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#c8b89a';
            for (let t = -3; t <= 3; t += 2)
              ctx.fillRect(t*sc - 0.7*sc, 1.8*sc, 1.4*sc, 2.2*sc);
            break;
          }
          case 2: { // Buried car (side view)
            ctx.fillStyle = '#2c3a40';
            ctx.fillRect(-14*sc, -4*sc, 28*sc, 8*sc);
            ctx.fillRect(-8*sc, -9*sc, 16*sc, 5.5*sc);
            ctx.fillStyle = '#182028';
            ctx.fillRect(-6.5*sc, -8.5*sc, 5.5*sc, 3.5*sc);
            ctx.fillRect(1*sc, -8.5*sc, 5.5*sc, 3.5*sc);
            ctx.fillStyle = '#101010';
            ctx.beginPath(); ctx.arc(-8*sc, 4.5*sc, 3.5*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(8*sc, 4.5*sc, 3.5*sc, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#282828';
            ctx.beginPath(); ctx.arc(-8*sc, 4.5*sc, 1.8*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(8*sc, 4.5*sc, 1.8*sc, 0, Math.PI*2); ctx.fill();
            break;
          }
          case 3: { // Trash bag
            ctx.fillStyle = '#252218';
            ctx.beginPath(); ctx.ellipse(0, 3*sc, 9*sc, 7*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#181610';
            ctx.beginPath(); ctx.arc(0, -4.5*sc, 2.5*sc, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(-5*sc, -1*sc); ctx.quadraticCurveTo(-2*sc, -3*sc, -5*sc, -5.5*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5*sc, -1*sc); ctx.quadraticCurveTo(2*sc, -3*sc, 4.5*sc, -5.5*sc); ctx.stroke();
            break;
          }
          case 4: { // Beer bottle
            ctx.fillStyle = '#1e3c18';
            ctx.beginPath(); ctx.ellipse(0, 3*sc, 4.5*sc, 6.5*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillRect(-1.8*sc, -8*sc, 3.6*sc, 6*sc);
            ctx.fillStyle = '#a89020';
            ctx.fillRect(-2.2*sc, -9.5*sc, 4.4*sc, 1.8*sc);
            break;
          }
          case 5: { // Treasure chest
            ctx.fillStyle = '#4a3010';
            ctx.fillRect(-9*sc, -1*sc, 18*sc, 8*sc);
            ctx.fillStyle = '#3a2808';
            ctx.beginPath();
            ctx.moveTo(-9*sc, -1*sc); ctx.lineTo(-9*sc, -5*sc);
            ctx.bezierCurveTo(-9*sc, -9*sc, 9*sc, -9*sc, 9*sc, -5*sc);
            ctx.lineTo(9*sc, -1*sc); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#807850'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-9*sc, 2*sc); ctx.lineTo(9*sc, 2*sc); ctx.stroke();
            ctx.fillStyle = '#b09848';
            ctx.fillRect(-1.5*sc, -4*sc, 3*sc, 4*sc);
            ctx.strokeStyle = '#b09848';
            ctx.beginPath(); ctx.arc(0, -4*sc, 1.5*sc, Math.PI, Math.PI*2); ctx.stroke();
            break;
          }
          case 6: { // Dinosaur rib fossil
            ctx.strokeStyle = '#c0aa80'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-11*sc, 0); ctx.lineTo(11*sc, 0); ctx.stroke();
            ctx.lineWidth = 1;
            for (let r = -8; r <= 8; r += 4) {
              ctx.beginPath(); ctx.moveTo(r*sc, 0);
              ctx.quadraticCurveTo((r+2)*sc, 4*sc, r*sc, 7*sc); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(r*sc, 0);
              ctx.quadraticCurveTo((r-2)*sc, -4*sc, r*sc, -7*sc); ctx.stroke();
            }
            break;
          }
          case 7: { // Ancient amphora
            ctx.fillStyle = '#7a4820';
            ctx.beginPath(); ctx.ellipse(0, 2*sc, 6*sc, 8*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillRect(-2.2*sc, -7*sc, 4.4*sc, 4*sc);
            ctx.beginPath(); ctx.ellipse(0, -7*sc, 3.2*sc, 1.4*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#7a4820'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(-8*sc, 0, 3.5*sc, -0.8, 0.8); ctx.stroke();
            ctx.beginPath(); ctx.arc(8*sc, 0, 3.5*sc, Math.PI - 0.8, Math.PI + 0.8); ctx.stroke();
            break;
          }
          case 8: { // Old tire
            ctx.strokeStyle = '#181818'; ctx.lineWidth = 4.5*sc;
            ctx.beginPath(); ctx.arc(0, 0, 7*sc, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = '#1e1e1e';
            ctx.beginPath(); ctx.arc(0, 0, 3.5*sc, 0, Math.PI*2); ctx.fill();
            break;
          }
          case 9: { // Coffin
            ctx.fillStyle = '#2a180a';
            ctx.beginPath();
            ctx.moveTo(0, -9*sc);  ctx.lineTo(5*sc, -6*sc);
            ctx.lineTo(5.5*sc, 5*sc); ctx.lineTo(0, 8*sc);
            ctx.lineTo(-5.5*sc, 5*sc); ctx.lineTo(-5*sc, -6*sc);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#4a2818'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -7*sc); ctx.lineTo(0, 4*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-3*sc, -2*sc); ctx.lineTo(3*sc, -2*sc); ctx.stroke();
            break;
          }
          case 10: { // Shopping cart
            ctx.strokeStyle = '#606060'; ctx.lineWidth = 1.5;
            ctx.strokeRect(-8*sc, -5*sc, 16*sc, 9*sc);
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(-8*sc, -1*sc); ctx.lineTo(8*sc, -1*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-8*sc, 3*sc); ctx.lineTo(8*sc, 3*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-2*sc, -5*sc); ctx.lineTo(-2*sc, 4*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(2*sc, -5*sc); ctx.lineTo(2*sc, 4*sc); ctx.stroke();
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-8*sc, -5*sc); ctx.lineTo(-10*sc, -7*sc); ctx.lineTo(10*sc, -7*sc); ctx.lineTo(8*sc, -5*sc); ctx.stroke();
            ctx.fillStyle = '#505050';
            ctx.beginPath(); ctx.arc(-6*sc, 4.5*sc, 1.5*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(6*sc, 4.5*sc, 1.5*sc, 0, Math.PI*2); ctx.fill();
            break;
          }
          case 11: { // Spine / vertebrae stack
            ctx.fillStyle = '#c8b080';
            ctx.fillRect(-1*sc, -13*sc, 2*sc, 26*sc);
            for (let v = -10; v <= 10; v += 4) {
              ctx.beginPath(); ctx.ellipse(0, v*sc, 3.5*sc, 2*sc, 0, 0, Math.PI*2); ctx.fill();
              ctx.fillRect(-0.8*sc, (v-1)*sc, 5*sc, 1.5*sc);
            }
            break;
          }
          case 12: { // Full rib cage
            ctx.strokeStyle = '#c0aa80'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(0, -11*sc); ctx.lineTo(0, 11*sc); ctx.stroke();
            ctx.lineWidth = 1.1;
            for (let r = -9; r <= 7; r += 4) {
              ctx.beginPath(); ctx.moveTo(0, r*sc);
              ctx.bezierCurveTo(-6*sc, (r+1)*sc, -11*sc, (r+4)*sc, -8*sc, (r+7)*sc); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(0, r*sc);
              ctx.bezierCurveTo(6*sc, (r+1)*sc, 11*sc, (r+4)*sc, 8*sc, (r+7)*sc); ctx.stroke();
            }
            break;
          }
          case 13: { // Buried bus
            ctx.fillStyle = '#263038';
            ctx.fillRect(-22*sc, -5*sc, 44*sc, 10*sc);
            ctx.fillStyle = '#141e24';
            for (let w = -18; w <= 14; w += 8)
              ctx.fillRect(w*sc, -4.5*sc, 6*sc, 5*sc);
            ctx.fillStyle = '#0a1218';
            ctx.beginPath(); ctx.arc(-14*sc, 5.5*sc, 3.5*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(14*sc, 5.5*sc, 3.5*sc, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#1a2830';
            ctx.beginPath(); ctx.arc(-14*sc, 5.5*sc, 1.8*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(14*sc, 5.5*sc, 1.8*sc, 0, Math.PI*2); ctx.fill();
            break;
          }
          case 14: { // Oil drum
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath(); ctx.ellipse(0, 0, 6*sc, 9*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#303030'; ctx.lineWidth = 1;
            for (let b = -6; b <= 6; b += 3) {
              ctx.beginPath(); ctx.ellipse(0, b*sc, 6*sc, 1.5*sc, 0, 0, Math.PI*2); ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(200,140,0,0.45)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-4*sc, -5*sc); ctx.lineTo(4*sc, 5*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(4*sc, -5*sc); ctx.lineTo(-4*sc, 5*sc); ctx.stroke();
            break;
          }
          case 15: { // Washing machine
            ctx.fillStyle = '#262630';
            ctx.beginPath(); ctx.roundRect(-9*sc, -9*sc, 18*sc, 18*sc, 1.5); ctx.fill();
            ctx.fillStyle = '#161620';
            ctx.beginPath(); ctx.arc(0, 1*sc, 6*sc, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#303040'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(0, 1*sc, 7*sc, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = '#303040';
            ctx.beginPath(); ctx.arc(4*sc, -6*sc, 1.2*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(6*sc, -6*sc, 1.2*sc, 0, Math.PI*2); ctx.fill();
            break;
          }
          case 16: { // T-Rex skull
            ctx.fillStyle = '#b8985a';
            ctx.beginPath(); ctx.ellipse(-3*sc, -1*sc, 9*sc, 6*sc, -0.15, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(3*sc, -2*sc); ctx.lineTo(17*sc, -4*sc); ctx.lineTo(17*sc, 2*sc); ctx.lineTo(3*sc, 2*sc); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(-1*sc, -3*sc, 3.2*sc, 2.6*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#c8b070';
            for (let t = 5; t <= 15; t += 2.5) {
              ctx.beginPath(); ctx.moveTo(t*sc, 2*sc); ctx.lineTo((t+0.8)*sc, 5.5*sc); ctx.lineTo((t+1.8)*sc, 2*sc); ctx.closePath(); ctx.fill();
            }
            ctx.fillStyle = '#a87840';
            for (let t = 6; t <= 15; t += 2.5) {
              ctx.beginPath(); ctx.moveTo(t*sc, -2*sc); ctx.lineTo((t+0.8)*sc, -5.5*sc); ctx.lineTo((t+1.8)*sc, -2*sc); ctx.closePath(); ctx.fill();
            }
            break;
          }
          case 17: { // Gold coin pile
            ctx.fillStyle = '#a07808';
            for (let ci = 0; ci < 6; ci++) {
              const cx2 = (ci - 2.5) * 4 * sc;
              const cy2 = (ci % 2) * 2 * sc;
              ctx.beginPath(); ctx.ellipse(cx2, cy2, 3.5*sc, 1.5*sc, 0, 0, Math.PI*2); ctx.fill();
            }
            ctx.fillStyle = '#d4a010';
            for (let ci = 0; ci < 4; ci++) {
              const cx2 = (ci - 1.5) * 4.5 * sc;
              ctx.beginPath(); ctx.ellipse(cx2, -3*sc, 3.5*sc, 1.5*sc, 0, 0, Math.PI*2); ctx.fill();
            }
            ctx.fillStyle = '#f0c030';
            ctx.beginPath(); ctx.ellipse(0, -6*sc, 3.5*sc, 1.5*sc, 0, 0, Math.PI*2); ctx.fill();
            break;
          }
          case 18: { // Diamond / gem
            ctx.fillStyle = '#70d8ff';
            ctx.beginPath();
            ctx.moveTo(0, -8*sc); ctx.lineTo(7*sc, -2*sc); ctx.lineTo(7*sc, 4*sc);
            ctx.lineTo(0, 8*sc); ctx.lineTo(-7*sc, 4*sc); ctx.lineTo(-7*sc, -2*sc); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.30)';
            ctx.beginPath(); ctx.moveTo(0, -8*sc); ctx.lineTo(7*sc, -2*sc); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(0, -8*sc); ctx.lineTo(0, 8*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-7*sc, -2*sc); ctx.lineTo(7*sc, -2*sc); ctx.stroke();
            break;
          }
          case 19: { // Anchor
            ctx.strokeStyle = '#404840'; ctx.lineWidth = 2.2*sc;
            ctx.beginPath(); ctx.moveTo(0, -11*sc); ctx.lineTo(0, 9*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-7*sc, -8*sc); ctx.lineTo(7*sc, -8*sc); ctx.stroke();
            ctx.lineWidth = 1.8*sc;
            ctx.beginPath(); ctx.arc(-7*sc, 5*sc, 4.5*sc, Math.PI*0.5, Math.PI*1.5); ctx.stroke();
            ctx.beginPath(); ctx.arc(7*sc, 5*sc, 4.5*sc, -Math.PI*0.5, Math.PI*0.5); ctx.stroke();
            ctx.lineWidth = 1.5*sc;
            ctx.beginPath(); ctx.arc(0, -11*sc, 2.5*sc, 0, Math.PI*2); ctx.stroke();
            break;
          }
          case 20: { // Bicycle
            ctx.strokeStyle = '#484840'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(-9*sc, 2*sc, 6*sc, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(9*sc, 2*sc, 6*sc, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-9*sc, 2*sc); ctx.lineTo(0, -5*sc); ctx.lineTo(9*sc, 2*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-9*sc, 2*sc); ctx.lineTo(-3*sc, -2*sc); ctx.lineTo(0, -5*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-3*sc, -2*sc); ctx.lineTo(-4*sc, -7*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-6*sc, -7*sc); ctx.lineTo(-2*sc, -7*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(9*sc, -1*sc); ctx.lineTo(9*sc, -6*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(7*sc, -6*sc); ctx.lineTo(11*sc, -6*sc); ctx.stroke();
            break;
          }
          case 21: { // Suitcase
            ctx.fillStyle = '#3c2010';
            ctx.beginPath(); ctx.roundRect(-11*sc, -7*sc, 22*sc, 14*sc, 2); ctx.fill();
            ctx.strokeStyle = '#604030'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(-11*sc, 0); ctx.lineTo(11*sc, 0); ctx.stroke();
            ctx.fillStyle = '#604030';
            for (const [cx2, cy2] of [[-11,-7],[-11,7],[11,-7],[11,7]] as [number,number][])
              ctx.fillRect(cx2*sc - 1.2, cy2*sc - 1.2, 2.4, 2.4);
            ctx.strokeStyle = '#705038'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-3*sc, -7*sc); ctx.lineTo(-3*sc, -11*sc); ctx.lineTo(3*sc, -11*sc); ctx.lineTo(3*sc, -7*sc); ctx.stroke();
            ctx.fillStyle = '#907050';
            ctx.fillRect(-2.5*sc, -2.5*sc, 5*sc, 3*sc);
            break;
          }
          case 22: { // Vault / safe
            ctx.fillStyle = '#18181e';
            ctx.fillRect(-10*sc, -10*sc, 20*sc, 20*sc);
            ctx.strokeStyle = '#383840'; ctx.lineWidth = 1;
            ctx.strokeRect(-10*sc, -10*sc, 20*sc, 20*sc);
            ctx.strokeStyle = '#585860'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(0, 0, 6*sc, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4.5*sc, 0); ctx.stroke();
            ctx.strokeStyle = '#808080'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(8.5*sc, -3*sc); ctx.lineTo(8.5*sc, 3*sc); ctx.stroke();
            ctx.fillStyle = '#484850';
            ctx.fillRect(-10*sc, -9*sc, 2.5*sc, 3.5*sc);
            ctx.fillRect(-10*sc, 5.5*sc, 2.5*sc, 3.5*sc);
            break;
          }
          case 23: { // Buried tank
            ctx.fillStyle = '#2a3020';
            ctx.beginPath(); ctx.ellipse(0, 3*sc, 17*sc, 6*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(-2*sc, -3*sc, 8*sc, 5*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillRect(-2*sc, -4*sc, 22*sc, 2.5*sc);
            ctx.strokeStyle = '#1a2018'; ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.arc(-13*sc, 5*sc, 4*sc, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(13*sc, 5*sc, 4*sc, 0, Math.PI*2); ctx.stroke();
            ctx.strokeStyle = '#1e2820'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-13*sc, 9*sc); ctx.lineTo(13*sc, 9*sc); ctx.stroke();
            break;
          }
          case 24: { // Crashed alien spacecraft
            ctx.fillStyle = '#2a3848';
            ctx.beginPath(); ctx.ellipse(0, 1*sc, 16*sc, 4.5*sc, 0.2, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#3a4a5a';
            ctx.beginPath(); ctx.ellipse(-2*sc, -2*sc, 5.5*sc, 3.5*sc, 0.2, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,100,0,0.55)'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(-2*sc, 0); ctx.lineTo(-13*sc, 7*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-2*sc, 0); ctx.lineTo(10*sc, 8*sc); ctx.stroke();
            ctx.fillStyle = 'rgba(0,255,160,0.45)';
            for (let p = -10; p <= 10; p += 4)
              { ctx.beginPath(); ctx.arc(p*sc, 1.5*sc, 1.5*sc, 0, Math.PI*2); ctx.fill(); }
            ctx.fillStyle = 'rgba(0,200,255,0.30)';
            ctx.beginPath(); ctx.arc(-2*sc, -3*sc, 3*sc, 0, Math.PI*2); ctx.fill();
            break;
          }
          case 25: { // Crown
            ctx.fillStyle = '#b09020';
            ctx.fillRect(-9*sc, 1*sc, 18*sc, 5*sc);
            ctx.beginPath();
            ctx.moveTo(-9*sc, 1*sc); ctx.lineTo(-6*sc, -7*sc); ctx.lineTo(-3*sc, -2*sc);
            ctx.lineTo(0, -9.5*sc); ctx.lineTo(3*sc, -2*sc); ctx.lineTo(6*sc, -7*sc);
            ctx.lineTo(9*sc, 1*sc); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#cc1818'; ctx.beginPath(); ctx.arc(0, -5*sc, 2*sc, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#2060e0'; ctx.beginPath(); ctx.arc(-5.5*sc, -4*sc, 1.4*sc, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#2060e0'; ctx.beginPath(); ctx.arc(5.5*sc, -4*sc, 1.4*sc, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#d0a828';
            ctx.beginPath(); ctx.arc(-1.5*sc, 3.5*sc, 1*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(1.5*sc, 3.5*sc, 1*sc, 0, Math.PI*2); ctx.fill();
            break;
          }
          case 26: { // Underground pipe network
            ctx.strokeStyle = '#505040'; ctx.lineWidth = 3.5*sc;
            ctx.beginPath(); ctx.moveTo(-15*sc, 0); ctx.lineTo(15*sc, 0); ctx.stroke();
            ctx.lineWidth = 2.5*sc;
            ctx.beginPath(); ctx.moveTo(-8*sc, 0); ctx.lineTo(-8*sc, -9*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5*sc, 0); ctx.lineTo(5*sc, 7*sc); ctx.stroke();
            ctx.lineWidth = 2*sc;
            ctx.beginPath(); ctx.moveTo(-8*sc, -9*sc); ctx.lineTo(2*sc, -9*sc); ctx.stroke();
            ctx.fillStyle = '#706050';
            ctx.beginPath(); ctx.arc(-8*sc, 0, 3*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(5*sc, 0, 3*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(-8*sc, -9*sc, 2.5*sc, 0, Math.PI*2); ctx.fill();
            break;
          }
          case 27: { // Old television
            ctx.fillStyle = '#252020';
            ctx.beginPath(); ctx.roundRect(-11*sc, -9*sc, 22*sc, 17*sc, 2); ctx.fill();
            ctx.fillStyle = '#0e1820';
            ctx.fillRect(-8*sc, -7*sc, 13*sc, 11*sc);
            ctx.fillStyle = 'rgba(180,180,200,0.06)';
            ctx.fillRect(-8*sc, -7*sc, 13*sc, 5*sc);
            ctx.fillStyle = '#353030';
            ctx.beginPath(); ctx.arc(7*sc, -3*sc, 1.5*sc, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(7*sc, 2*sc, 1.5*sc, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#484040'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-2*sc, -9*sc); ctx.lineTo(-5*sc, -15*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(2*sc, -9*sc); ctx.lineTo(5*sc, -15*sc); ctx.stroke();
            break;
          }
          case 28: { // Pterodactyl fossil (wings spread)
            ctx.fillStyle = '#b09070';
            ctx.beginPath(); ctx.ellipse(0, 0, 4.5*sc, 2.5*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(4.5*sc, -1*sc); ctx.lineTo(16*sc, -4*sc); ctx.lineTo(16*sc, 1*sc); ctx.lineTo(4.5*sc, 1*sc); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-3*sc, -1*sc); ctx.lineTo(-20*sc, -11*sc); ctx.lineTo(-17*sc, -5*sc); ctx.lineTo(-15*sc, 3*sc); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-3*sc, -1*sc); ctx.lineTo(2*sc, -13*sc); ctx.lineTo(6*sc, -8*sc); ctx.lineTo(4.5*sc, 0); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#c0a880'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(-4*sc, 2*sc); ctx.lineTo(-7*sc, 9*sc); ctx.lineTo(-5*sc, 9.5*sc); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 2.5*sc); ctx.lineTo(0, 9*sc); ctx.lineTo(2*sc, 9.5*sc); ctx.stroke();
            break;
          }
          case 29: { // Buried submarine
            ctx.fillStyle = '#1a2830';
            ctx.beginPath(); ctx.ellipse(0, 5*sc, 15*sc, 5.5*sc, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillRect(-3.5*sc, -6*sc, 7*sc, 11*sc);
            ctx.fillRect(-1.5*sc, -13*sc, 3*sc, 8*sc);
            ctx.fillRect(-1.5*sc, -13*sc, 5*sc, 2*sc);
            ctx.strokeStyle = '#304858'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(-6*sc, 3*sc, 2.8*sc, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(6*sc, 3*sc, 2.8*sc, 0, Math.PI*2); ctx.stroke();
            ctx.strokeStyle = '#283848'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-15*sc, 5*sc); ctx.lineTo(15*sc, 5*sc); ctx.stroke();
            break;
          }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      ctx.restore();
    }
    // Gravel/dirt shoulder (widest layer) — 4-lane road
    terrainPath(0); ctx.strokeStyle = theme === 'desert' ? '#6a4420' : theme === 'city' ? '#383830' : '#3a3828'; ctx.lineWidth = 54; ctx.stroke();
    // White edge rumble strip (each side)
    terrainPath(-25); ctx.strokeStyle = 'rgba(230,225,215,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    terrainPath(25);  ctx.strokeStyle = 'rgba(230,225,215,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    // Asphalt surface
    terrainPath(0); ctx.strokeStyle = '#1e1e28'; ctx.lineWidth = 50; ctx.stroke();
    terrainPath(0); ctx.strokeStyle = '#242430'; ctx.lineWidth = 44; ctx.stroke();
    // Subtle asphalt texture
    terrainPath(0); ctx.strokeStyle = 'rgba(40,40,52,0.50)'; ctx.lineWidth = 8; ctx.stroke();
    // Outer edge lines (solid white)
    terrainPath(-22); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke();
    terrainPath(22);  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    // Inner lane dividers (white dashes) — animate offset with scroll so lines flow as car moves
    ctx.lineDashOffset = -(scrollPx % 32);
    terrainPath(-11); ctx.strokeStyle = 'rgba(255,255,255,0.48)'; ctx.lineWidth = 1.2; ctx.setLineDash([18,14]); ctx.stroke();
    terrainPath(11);  ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 1.2; ctx.setLineDash([18,14]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    // Double center yellow line (divides oncoming traffic directions)
    terrainPath(-2);  ctx.strokeStyle = '#e8c030'; ctx.lineWidth = 1.5; ctx.stroke();
    terrainPath(2);   ctx.strokeStyle = '#e8c030'; ctx.lineWidth = 1.5; ctx.stroke();
    // Mountain/alpine: guard rail on uphill side (outside wider road)
    if (theme === 'mountain' || theme === 'alpine') {
      ctx.strokeStyle = 'rgba(180,185,200,0.55)'; ctx.lineWidth = 2;
      terrainPath(-28); ctx.stroke();
      // Posts
      for (let s = 4; s < STEPS; s += 10) {
        const mi2 = visStart + s * stepMi;
        const gx = miToX(mi2), gy2 = elToY(elevAt(mi2));
        ctx.strokeStyle = 'rgba(160,165,180,0.70)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(gx, gy2 - 21); ctx.lineTo(gx, gy2 - 31); ctx.stroke();
      }
    }
    // City: raised concrete curb lines
    if (theme === 'city') {
      terrainPath(-24); ctx.strokeStyle = 'rgba(200,198,190,0.60)'; ctx.lineWidth = 3; ctx.stroke();
      terrainPath(24);  ctx.strokeStyle = 'rgba(200,198,190,0.50)'; ctx.lineWidth = 3; ctx.stroke();
    }
    // Destination landmark at route END
    {
      const destX = miToX(distTotal);
      if (destX > -60 && destX < W + 60) {
        const destY = elToY(elevAt(distTotal));
        // Flag pole
        ctx.strokeStyle = '#909898'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(destX + 14, destY - 2); ctx.lineTo(destX + 14, destY - 44); ctx.stroke();
        // Checkered flag
        const flagColors = ['#111','#fff'];
        for (let fy = 0; fy < 3; fy++) for (let fx = 0; fx < 4; fx++) {
          ctx.fillStyle = flagColors[(fy + fx) % 2];
          ctx.fillRect(destX + 14 + fx * 6, destY - 44 + fy * 6, 6, 6);
        }
        // Building silhouette (hotel/destination)
        const bldW = 44, bldH = 36;
        ctx.fillStyle = theme === 'city' ? '#2a3040' : theme === 'desert' ? '#8a6040' : '#2a3830';
        ctx.fillRect(destX - bldW/2, destY - bldH, bldW, bldH);
        // Roof line
        ctx.fillStyle = theme === 'desert' ? '#6a4830' : '#1e2830';
        ctx.fillRect(destX - bldW/2 - 2, destY - bldH - 4, bldW + 4, 5);
        // Sign on building
        ctx.fillStyle = '#ffda40';
        ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('FINISH', destX, destY - bldH + 12);
        // Windows
        for (let wr = 0; wr < 3; wr++) for (let wc = 0; wc < 4; wc++) {
          ctx.fillStyle = 'rgba(255,225,120,0.70)';
          ctx.fillRect(destX - bldW/2 + 5 + wc*10, destY - bldH + 16 + wr * 8, 5, 4);
        }
        // Glow at ground level
        const dg = ctx.createRadialGradient(destX, destY, 0, destX, destY, 40);
        dg.addColorStop(0, 'rgba(255,220,60,0.22)'); dg.addColorStop(1, 'rgba(255,220,60,0)');
        ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(destX, destY, 40, 10, 0, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.lineCap = 'butt';

    // ════════════════════════════════════════════════════════════════════════
    // 7.5 ── ROADSIDE GRASS / ROCKS (drawn after road so road covers base)
    // ════════════════════════════════════════════════════════════════════════
    if (theme !== 'coastal') {
      const rsStep = theme === 'desert' ? 5 : 3;
      for (let s = 1; s < STEPS - 1; s += rsStep) {
        const mi = visStart + s * stepMi;
        const x  = miToX(mi);
        if (x < 2 || x > W - 2) continue;
        const y  = elToY(elevAt(mi));
        const v  = Math.abs(Math.sin(s * 1.7 + seed * 0.001));   // deterministic variation
        if (theme === 'desert') {
          ctx.fillStyle = `rgba(145,88,45,${0.28 + v * 0.22})`;
          ctx.beginPath(); ctx.ellipse(x, y + 29, 2.5 + v * 2.5, 1.3, 0, 0, Math.PI * 2); ctx.fill();
        } else if (theme === 'alpine') {
          ctx.fillStyle = `rgba(108,104,88,${0.32 + v * 0.20})`;
          ctx.fillRect(x - 1, y + 27, 3 + Math.floor(v * 4), 2);
        } else {
          const gc = theme === 'city' ? `rgba(52,74,42,0.48)` : `rgba(65,122,46,0.52)`;
          ctx.strokeStyle = gc; ctx.lineWidth = 1.1;
          const h = 4 + v * 5;
          ctx.beginPath(); ctx.moveTo(x - 1, y + 28); ctx.lineTo(x - 2 - v, y + 28 - h); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + 1, y + 28); ctx.lineTo(x + 2 + v * 0.5, y + 28 - h * 0.85); ctx.stroke();
          if (v > 0.62) {
            ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x + v * 3, y + 28 - h * 0.70); ctx.stroke();
          }
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 8 ── CHARGER STATIONS (placed beside the road, not on it)
    // ════════════════════════════════════════════════════════════════════════
    for (const charger of route.chargers) {
      const cx2 = miToX(charger.positionMi);
      if (cx2 < -30 || cx2 > W + 30) continue;
      const roadY    = elToY(elevAt(charger.positionMi));
      const isActive = state.chargingAtId === charger.id;
      const isDCFC   = charger.maxKw >= 50;

      // All charger structures sit to the RIGHT of the road (road shoulder + beyond)
      // poleX = position of the charger unit pole, clear of the road edge (~22 px right)
      const poleX = cx2 + 22;

      if (isDCFC) {
        // ── DC fast charger: large canopy over poleX, service building further right ──
        const bldX  = poleX + 32;   // service building centre
        const canyX = poleX + 10;   // canopy centre

        // Canopy (wide flat roof)
        ctx.fillStyle = '#1e2838';
        ctx.fillRect(canyX - 24, roadY - 44, 48, 6);
        ctx.strokeStyle = '#58a6ff'; ctx.lineWidth = 0.8;
        ctx.strokeRect(canyX - 24, roadY - 44, 48, 6);
        // Canopy support poles
        ctx.strokeStyle = '#607080'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(canyX - 16, roadY - 38); ctx.lineTo(canyX - 16, roadY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(canyX + 16, roadY - 38); ctx.lineTo(canyX + 16, roadY); ctx.stroke();

        // Service building
        ctx.fillStyle = '#222a38';
        ctx.fillRect(bldX - 12, roadY - 34, 24, 34);
        ctx.fillStyle = '#1a2230';
        ctx.fillRect(bldX - 14, roadY - 37, 28, 4);
        // Windows
        ctx.fillStyle = isActive ? 'rgba(63,185,80,0.55)' : 'rgba(88,166,255,0.40)';
        ctx.fillRect(bldX - 9, roadY - 28, 6, 5);
        ctx.fillRect(bldX + 3, roadY - 28, 6, 5);
        ctx.fillRect(bldX - 9, roadY - 18, 6, 5);
        ctx.fillRect(bldX + 3, roadY - 18, 6, 5);
        // Sign
        ctx.fillStyle = isActive ? '#3fb950' : '#58a6ff';
        ctx.font = 'bold 6px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('EV⚡', bldX, roadY - 6);
      } else {
        // ── Level 1/2: gas-station canopy + small store ──
        const canyX = poleX;
        const storeX = poleX + 26;

        // Canopy
        ctx.fillStyle = '#28303a';
        ctx.fillRect(canyX - 16, roadY - 44, 32, 6);
        ctx.strokeStyle = '#d29922'; ctx.lineWidth = 0.8;
        ctx.strokeRect(canyX - 16, roadY - 44, 32, 6);
        // Centre post
        ctx.strokeStyle = '#505868'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(canyX, roadY - 38); ctx.lineTo(canyX, roadY); ctx.stroke();
        // Store
        ctx.fillStyle = '#1e2830';
        ctx.fillRect(storeX - 10, roadY - 32, 20, 32);
        ctx.fillStyle = '#18202a';
        ctx.fillRect(storeX - 12, roadY - 35, 24, 4);
        // Door
        ctx.fillStyle = '#0a1018';
        ctx.fillRect(storeX - 4, roadY - 12, 8, 12);
        // Window
        ctx.fillStyle = 'rgba(160,200,240,0.35)';
        ctx.fillRect(storeX - 9, roadY - 28, 8, 7);
      }

      // ── Charger unit: pole + box beside the road ──────────────────────
      const stationY = roadY - 38;
      // Pole (rises from ground beside road)
      ctx.strokeStyle = '#606870'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(poleX, roadY); ctx.lineTo(poleX, stationY + 20); ctx.stroke();
      // Arm extending toward road (cable tray)
      ctx.strokeStyle = '#708090'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(poleX, stationY + 8); ctx.lineTo(poleX - 10, stationY + 8); ctx.stroke();
      // Charger box
      ctx.fillStyle = isActive ? '#0d2d1a' : '#0d1e30';
      ctx.beginPath(); ctx.roundRect(poleX - 11, stationY, 22, 20, 3); ctx.fill();
      ctx.strokeStyle = isActive ? '#3fb950' : '#58a6ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(poleX - 11, stationY, 22, 20, 3); ctx.stroke();
      // Screen
      const scr = ctx.createLinearGradient(poleX - 8, stationY + 3, poleX - 8, stationY + 11);
      scr.addColorStop(0, isActive ? 'rgba(63,185,80,0.8)' : 'rgba(88,166,255,0.8)');
      scr.addColorStop(1, isActive ? 'rgba(63,185,80,0.3)' : 'rgba(88,166,255,0.3)');
      ctx.fillStyle = scr; ctx.fillRect(poleX - 8, stationY + 3, 16, 8);
      ctx.fillStyle = isActive ? '#3fb950' : '#58a6ff';
      ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('⚡', poleX, stationY + 18);
      // Active glow (beside road, not on it)
      if (isActive) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#3fb950';
        ctx.beginPath(); ctx.arc(poleX, roadY - 18, 26, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 8.5 ── ROAD TRAFFIC (same-direction + oncoming, z-sorted by lane depth)
    // ════════════════════════════════════════════════════════════════════════
    {
      const TC_IDS  = ['tesla_m3_rwd','hyundai_ioniq5','chevy_bolt','kia_soul_ev','ford_mache','tesla_my','vw_id4','audi_etron_gt','chevy_bolt_2017','nissan_ariya'];
      const TC_COLS = ['#c62b2b','#2b7ac6','#e0e0e4','#c6a02b','#2a7a3a','#8b2bc6','#cc6020','#404060','#a0a0c0','#b84040','#3a80a8'];
      const trafficWA = (trafficScroll / (Math.PI * WR * 2 / 12)) % (Math.PI * 2);

      // Collect all traffic cars; draw sorted by lane Y so closer lanes render on top
      type TrafCar = { sx: number; ty: number; laneY: number; carIdx: number; colIdx: number; flip: boolean };
      const cars: TrafCar[] = [];

      // Same-direction (right lanes, player overtakes)
      const rngTraf = makeRng(seed + 0xaa0011);
      for (let i = 0; i < 6; i++) {
        const baseX  = rngTraf() * W * 5;
        const laneR  = rngTraf();
        const carIdx = Math.floor(rngTraf() * TC_IDS.length);
        const colIdx = Math.floor(rngTraf() * TC_COLS.length);
        const laneY  = laneR < 0.5 ? 6 : 17;
        const sx     = ((baseX - sameDirScroll * 0.88) % (W * 5) + W * 5) % (W * 5) - W * 0.15;
        if (sx < -60 || sx > W + 60) continue;
        const approxMi = offsetMi + sx * MI_PER_PX;
        const ty = elToY(elevAt(approxMi)) + laneY;
        cars.push({ sx, ty, laneY, carIdx, colIdx, flip: false });
      }

      // Oncoming (left lanes, approaching from the right, flipped)
      const rngOnc = makeRng(seed + 0xbb0022);
      for (let i = 0; i < 6; i++) {
        const baseX  = rngOnc() * W * 5;
        const laneR  = rngOnc();
        const carIdx = Math.floor(rngOnc() * TC_IDS.length);
        const colIdx = Math.floor(rngOnc() * TC_COLS.length);
        const laneY  = laneR < 0.5 ? -6 : -17;
        const sx     = ((baseX - trafficScroll * 2.0) % (W * 5) + W * 5) % (W * 5) - W * 0.15;
        if (sx < -60 || sx > W + 60) continue;
        const approxMi = offsetMi + sx * MI_PER_PX;
        const ty = elToY(elevAt(approxMi)) + laneY;
        cars.push({ sx, ty, laneY, carIdx, colIdx, flip: true });
      }

      // Sort: lower laneY (further from viewer) drawn first, higher laneY on top
      cars.sort((a, b) => a.laneY - b.laneY);

      for (const c of cars) {
        ctx.save();
        ctx.translate(c.sx, c.ty);
        if (c.flip) ctx.scale(-1, 1);
        ctx.beginPath(); ctx.ellipse(0, 2, 34, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
        drawCarByStyle(ctx, TC_IDS[c.carIdx], TC_COLS[c.colIdx], trafficWA);
        ctx.restore();
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 9 ── CAR
    // ════════════════════════════════════════════════════════════════════════
    const car = getCar(state.selectedCar);
    const carEl  = elevAt(state.positionMi);
    const carElF = elevAt(state.positionMi + 0.001);
    const grade  = (carElF - carEl) / (0.001 * 5280);
    const tilt   = Math.atan(grade) * 0.55;
    const carY   = elToY(carEl);
    const wheelAngle = (state.positionMi * 5280 / (Math.PI * (WR * 2 / 12))) % (Math.PI * 2);

    ctx.save();
    ctx.translate(carScreenX, carY + 17); // right outer lane
    ctx.rotate(-tilt);
    ctx.beginPath();
    ctx.ellipse(0, 2, 36, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fill();
    if (state.currentKw < -0.5) {
      ctx.shadowColor = '#3fb950'; ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(63,185,80,0.15)';
      ctx.beginPath(); ctx.ellipse(0, -2, 38, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (state.speedMph > 40 && !state.isCharging) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = car.color;
      ctx.beginPath(); ctx.ellipse(-8, -WR-12, 30, 9, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawCarByStyle(ctx, state.selectedCar, car.color, wheelAngle);
    ctx.restore();

    // ════════════════════════════════════════════════════════════════════════
    // 9.1 ── REGEN OVERCHARGE SPARKS (regen active + battery >= 100%)
    // ════════════════════════════════════════════════════════════════════════
    {
      const { batteryBonus } = computeUpgradeStats(state.upgrades);
      const maxBat = car.batteryKwh + batteryBonus;
      if (state.currentKw < -0.5 && state.battery >= maxBat - 0.05) {
        // Rear of car is at x ≈ carScreenX - 31 in world space
        const rearX = carScreenX - 31;
        const rearY = carY + 17;
        ctx.save();
        ctx.translate(rearX, rearY);
        ctx.rotate(-tilt);

        // Rear glow burst
        const pulse = 0.55 + 0.45 * Math.sin(T * 0.006);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
        rg.addColorStop(0,   `rgba(255,220,60,${0.75 * pulse})`);
        rg.addColorStop(0.35,`rgba(255,120,0,${0.45 * pulse})`);
        rg.addColorStop(1,    'rgba(255,60,0,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();

        // Spark streaks shooting rearward
        const SPARK_COUNT = 14;
        for (let s = 0; s < SPARK_COUNT; s++) {
          const phase     = T * 0.009 + s * 0.71;
          const intensity = Math.abs(Math.sin(phase));
          if (intensity < 0.18) continue;           // natural flicker

          // Angle spread: centred on leftward (-π), fan ±70°
          const angle = -Math.PI + (s / SPARK_COUNT - 0.5) * 2.4
                        + Math.sin(T * 0.011 + s * 1.4) * 0.25;
          const len   = (10 + 22 * intensity) * (0.7 + 0.3 * Math.sin(T * 0.015 + s));

          const ex = Math.cos(angle) * len;
          const ey = Math.sin(angle) * len;

          ctx.globalAlpha = intensity * 0.90;
          // Alternate colours: white core, orange, yellow
          ctx.strokeStyle = s % 3 === 0 ? '#ffffff' : s % 3 === 1 ? '#ffcc44' : '#ff8822';
          ctx.lineWidth   = 1.0 + intensity * 1.4;
          ctx.lineCap     = 'round';
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();

          // Bright dot at spark tip
          ctx.fillStyle = s % 2 === 0 ? '#ffe060' : '#ffffff';
          ctx.globalAlpha = intensity * 0.70;
          ctx.beginPath(); ctx.arc(ex, ey, 1.4 + intensity, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
        ctx.restore();
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 9.2 ── WEATHER  (drawn in front of cars so precipitation is foreground)
    // ════════════════════════════════════════════════════════════════════════
    {
      const weatherType =
        theme === 'coastal'    ? 'rain'    :
        theme === 'valley'     ? 'rain'    :
        theme === 'alpine'     ? 'snow'    :
        theme === 'mountain'   ? 'snow'    :
        theme === 'desert'     ? 'sand'    :
        theme === 'city'       ? 'drizzle' :
        theme === 'country'    ? 'rain'    :
        'clear';

      // Animate using scrollPx as a time base (increases every frame)
      const T = scrollPx;

      if (weatherType === 'rain' || weatherType === 'drizzle') {
        const count  = weatherType === 'rain' ? 120 : 55;
        const alpha  = weatherType === 'rain' ? 0.55 : 0.28;
        const len    = weatherType === 'rain' ? 14   : 8;
        const speed  = weatherType === 'rain' ? 2.8  : 1.8;
        ctx.strokeStyle = 'rgba(160,200,240,' + alpha + ')';
        ctx.lineWidth = weatherType === 'rain' ? 1 : 0.8;
        const rngR = makeRng(seed + 0xccdd00);
        for (let i = 0; i < count; i++) {
          const bx = rngR() * (W + 60);         // 1  base x
          const by = rngR() * (H + 40);         // 2  base y
          // Animate: each drop falls at its own speed factor
          const spd = 0.7 + rngR() * 0.6;       // 3  speed factor
          const rx  = ((bx - T * speed * spd * 0.18) % (W + 60) + W + 60) % (W + 60) - 20;
          const ry  = ((by + T * speed * spd)         % (H + 40) + H + 40) % (H + 40) - 10;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - len * 0.35, ry + len);  // slight diagonal (wind)
          ctx.stroke();
        }
        // Wet-road shimmer on asphalt
        ctx.fillStyle = 'rgba(120,160,220,0.07)';
        terrainPath(0);
        ctx.lineWidth = 44; ctx.strokeStyle = 'rgba(120,160,220,0.07)'; ctx.stroke();

      } else if (weatherType === 'snow') {
        const rngS = makeRng(seed + 0xeeff11);
        ctx.fillStyle = 'rgba(230,240,255,0.75)';
        for (let i = 0; i < 80; i++) {
          const bx = rngS() * (W + 80);          // 1
          const by = rngS() * (H + 40);          // 2
          const spd = 0.3 + rngS() * 0.5;        // 3  drift speed
          const sz  = 1 + rngS() * 2.2;          // 4  flake size
          const rx  = ((bx + Math.sin(T * 0.002 + i) * 12 - T * spd * 0.05) % (W + 80) + W + 80) % (W + 80) - 20;
          const ry  = ((by + T * spd * 0.8)           % (H + 40) + H + 40) % (H + 40) - 10;
          ctx.globalAlpha = 0.55 + Math.sin(i * 1.7) * 0.25;
          ctx.beginPath(); ctx.arc(rx, ry, sz, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Snow accumulation on road surface tint
        ctx.fillStyle = 'rgba(220,230,245,0.06)';
        terrainPath(0); ctx.lineWidth = 44; ctx.strokeStyle = 'rgba(220,230,245,0.08)'; ctx.stroke();

      } else if (weatherType === 'sand') {
        // Sweeping horizontal sand layers
        for (let layer = 0; layer < 4; layer++) {
          const layerY   = skyH + layer * (H - skyH) * 0.28;
          const layerSpd = 0.8 + layer * 0.5;
          const alpha2   = 0.04 + layer * 0.025;
          const rngSd = makeRng(seed + 0x112233 + layer);
          ctx.fillStyle = `rgba(200,140,60,${alpha2})`;
          ctx.fillRect(0, layerY, W, (H - skyH) * 0.30);
          // Sand streaks
          ctx.strokeStyle = `rgba(220,160,70,${alpha2 * 1.8})`;
          ctx.lineWidth = 0.8;
          for (let j = 0; j < 30; j++) {
            const bx = rngSd() * W * 3;          // 1
            const by = rngSd() * 20 - 10;        // 2
            const streakX = ((bx - T * layerSpd * 1.4) % (W * 3) + W * 3) % (W * 3) - 20;
            const streakY = layerY + (H - skyH) * 0.15 + by;
            const streakLen = 20 + rngSd() * 50; // 3
            if (streakX < -60 || streakX > W + 60) continue;
            ctx.beginPath(); ctx.moveTo(streakX, streakY); ctx.lineTo(streakX + streakLen, streakY); ctx.stroke();
          }
        }
        // Overall orange tint on sky
        ctx.fillStyle = 'rgba(200,130,50,0.10)';
        ctx.fillRect(0, 0, W, skyH);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 9.5 ── ROUTE COMPLETE OVERLAY
    // ════════════════════════════════════════════════════════════════════════
    if (state.routeComplete) {
      // Dark vignette
      ctx.fillStyle = 'rgba(0,0,0,0.52)';
      ctx.fillRect(0, 0, W, H);
      // Panel
      const px = W / 2, py = H / 2;
      ctx.fillStyle = 'rgba(14,22,34,0.92)';
      ctx.beginPath(); ctx.roundRect(px - 155, py - 44, 310, 88, 8); ctx.fill();
      ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(px - 155, py - 44, 310, 88, 8); ctx.stroke();
      // Checkered icon
      const cx3 = px - 128, cy3 = py - 8;
      const sq = 7;
      for (let fy = 0; fy < 3; fy++) for (let fx = 0; fx < 3; fx++) {
        ctx.fillStyle = (fy + fx) % 2 === 0 ? '#fff' : '#222';
        ctx.fillRect(cx3 + fx * sq, cy3 + fy * sq, sq, sq);
      }
      // "ROUTE COMPLETE" heading
      ctx.fillStyle = '#3fb950';
      ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('ROUTE COMPLETE', px + 10, py - 14);
      // Route name
      ctx.fillStyle = 'rgba(180,210,240,0.90)';
      ctx.font = '12px system-ui';
      ctx.fillText(route.name, px + 10, py + 6);
      // Credits earned — large and prominent
      ctx.font = 'bold 22px system-ui';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`+${route.reward.toLocaleString()} credits`, px + 10, py + 32);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 10 ── PROGRESS BAR + DISTANCE
    // ════════════════════════════════════════════════════════════════════════
    const prog = Math.min(1, state.positionMi / distTotal);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, 5);
    const pg = ctx.createLinearGradient(0, 0, W * prog, 0);
    pg.addColorStop(0, '#58a6ff'); pg.addColorStop(1, '#79c0ff');
    ctx.fillStyle = pg; ctx.fillRect(0, 0, W * prog, 5);
    ctx.fillStyle = 'rgba(230,237,243,0.85)'; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`${state.positionMi.toFixed(1)} / ${distTotal} mi`, 6, 17);

  }, [state]);

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
    </div>
  );
}
