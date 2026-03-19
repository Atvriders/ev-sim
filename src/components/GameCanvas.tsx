import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { getRoute } from '../game/routes';
import { getCar } from '../game/cars';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    const route = state.currentRoute ? getRoute(state.currentRoute) : null;

    // ── IDLE STATE ────────────────────────────────────────────────────────────
    if (!route || !state.driving) {
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

    function miToX(mi: number) { return (mi - offsetMi) / MI_PER_PX; }

    const elevs    = terrain.map(p => p.elevationFt);
    const minEl    = Math.min(...elevs);
    const maxEl    = Math.max(...elevs);
    const elRange  = Math.max(maxEl - minEl, 100);
    const skyH     = H * 0.42;
    const groundBot = H * 0.80;

    function elToY(el: number) {
      return skyH + (1 - (el - minEl) / elRange) * (groundBot - skyH);
    }
    function elevAt(mi: number): number {
      for (let i = 0; i < terrain.length - 1; i++) {
        if (terrain[i].distanceMi <= mi && terrain[i+1].distanceMi >= mi) {
          const t = (mi - terrain[i].distanceMi) / (terrain[i+1].distanceMi - terrain[i].distanceMi);
          return terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        }
      }
      return terrain[terrain.length - 1].elevationFt;
    }

    const visStart = Math.max(0, offsetMi - 0.5);
    const visEnd   = Math.min(distTotal, offsetMi + VIEW_MILES + 0.5);
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

    // Sun / moon — not for city (smoggy) or alpine (too dark)
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
    // Alpine: moon + stars
    if (theme === 'alpine') {
      const moonX = W * 0.72, moonY = skyH * 0.22;
      ctx.beginPath(); ctx.arc(moonX, moonY, 10, 0, Math.PI*2);
      ctx.fillStyle = '#d8e8f8'; ctx.fill();
      ctx.beginPath(); ctx.arc(moonX+4, moonY-3, 8, 0, Math.PI*2);
      ctx.fillStyle = SKY.alpine[0]; ctx.fill(); // crescent cutout
      const rngSt = makeRng(seed + 12);
      for (let i = 0; i < 55; i++) {
        const sx2 = rngSt() * W, sy2 = rngSt() * skyH * 0.9;
        ctx.globalAlpha = 0.3 + rngSt() * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(sx2, sy2, 0.5 + rngSt() * 0.8, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2 ── THEME-SPECIFIC FAR BACKGROUND
    // ════════════════════════════════════════════════════════════════════════

    // ── CITY: building skyline ────────────────────────────────────────────
    if (theme === 'city') {
      const rngB = makeRng(seed + 7);
      for (let i = 0; i < 16; i++) {
        const wx  = rngB() * W * 2.8;                                           // 1
        const sx  = ((wx - scrollPx * 0.10) % (W * 2.8) + W * 2.8) % (W * 2.8);
        if (sx < -55 || sx > W + 55) { rngB(); rngB(); continue; }              // skip 2
        const bh  = 32 + rngB() * 75;                                            // 1
        const bw  = 18 + rngB() * 38;                                            // 1
        const bg  = ctx.createLinearGradient(sx, skyH - bh, sx, skyH + 2);
        bg.addColorStop(0, '#1c2838'); bg.addColorStop(1, '#283040');
        ctx.fillStyle = bg;
        ctx.fillRect(sx - bw/2, skyH - bh, bw, bh + 3);
        // antenna on tall buildings
        if (bh > 80) {
          ctx.strokeStyle = '#405060'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(sx, skyH - bh); ctx.lineTo(sx, skyH - bh - 14); ctx.stroke();
        }
        // lit windows (seeded per-building so deterministic regardless of visibility)
        const rngW = makeRng(seed + 100 + i);
        const cols = Math.floor(bw / 7);
        const rows = Math.floor(bh / 9);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (rngW() < 0.55) {
              ctx.fillStyle = rngW() < 0.15 ? 'rgba(200,220,255,0.65)' : 'rgba(255,235,140,0.60)';
              ctx.fillRect(sx - bw/2 + 3 + c * 7, skyH - bh + 5 + r * 9, 4, 5);
            } else { rngW(); }
          }
        }
      }
      // Street lights (midground, fast parallax)
      const rngL = makeRng(seed + 8);
      for (let i = 0; i < 12; i++) {
        const wx  = rngL() * W * 1.8;                                            // 1
        const sx  = ((wx - scrollPx * 0.72) % (W * 1.8) + W * 1.8) % (W * 1.8);
        if (sx < -10 || sx > W + 10) { rngL(); continue; }                      // skip 1
        const approxMi = offsetMi + sx * MI_PER_PX;
        const py = elToY(elevAt(approxMi));
        const ph  = 28 + rngL() * 14;                                            // 1
        ctx.strokeStyle = '#5a6070'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(sx, py); ctx.lineTo(sx, py - ph); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, py - ph); ctx.lineTo(sx + 10, py - ph); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx + 10, py - ph, 3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,230,150,0.85)'; ctx.fill();
      }
    }

    // ── COASTAL: ocean band + cliffs ──────────────────────────────────────
    if (theme === 'coastal') {
      // Ocean fill behind terrain
      const oceanY = skyH + 4;
      const og = ctx.createLinearGradient(0, oceanY, 0, oceanY + 30);
      og.addColorStop(0, '#1868b8'); og.addColorStop(1, '#0a3860');
      ctx.fillStyle = og; ctx.fillRect(0, oceanY, W, 30);
      // Shimmer lines
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#80d0f8'; ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const wx2 = ((i * 120 + scrollPx * 0.4) % (W * 1.2) + W * 1.2) % (W * 1.2) - 60;
        ctx.beginPath(); ctx.moveTo(wx2, oceanY + 6 + i % 3 * 4); ctx.lineTo(wx2 + 22, oceanY + 6 + i % 3 * 4); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Seagulls
      const rngG = makeRng(seed + 11);
      ctx.strokeStyle = 'rgba(200,220,240,0.7)'; ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const wx2 = rngG() * W * 7;                                              // 1
        const sx  = ((wx2 - scrollPx * 0.22) % (W * 7) + W * 7) % (W * 7);
        if (sx < -12 || sx > W + 12) { rngG(); rngG(); continue; }              // skip 2
        const gy2 = 6 + rngG() * (skyH * 0.55);                                  // 1
        const sz  = 3 + rngG() * 4;                                              // 1
        ctx.beginPath();
        ctx.moveTo(sx - sz, gy2); ctx.lineTo(sx, gy2 - sz*0.5); ctx.lineTo(sx + sz, gy2);
        ctx.stroke();
      }
      // Coastal cliff shapes
      const rngCl = makeRng(seed + 2);
      for (let i = 0; i < 8; i++) {
        const wx2 = rngCl() * W * 4;                                             // 1
        const sx  = ((wx2 - scrollPx * 0.06) % (W * 4) + W * 4) % (W * 4);
        if (sx < -120 || sx > W + 120) { rngCl(); rngCl(); continue; }          // skip 2
        const ch  = 25 + rngCl() * 40;                                           // 1
        const cw  = 70 + rngCl() * 100;                                          // 1
        ctx.beginPath();
        ctx.moveTo(sx - cw/2, skyH + 3);
        ctx.lineTo(sx - cw/2, skyH - ch + 8);
        ctx.bezierCurveTo(sx - cw*0.2, skyH - ch, sx + cw*0.2, skyH - ch, sx + cw/2, skyH - ch + 8);
        ctx.lineTo(sx + cw/2, skyH + 3);
        ctx.closePath();
        ctx.fillStyle = '#2a4a30'; ctx.fill();
      }
    }

    // ── MOUNTAINS / ALPINE / VALLEY / COUNTRY: mountain layers ───────────
    if (['mountain','alpine','valley','country'].includes(theme)) {
      const dramatic = theme === 'mountain' || theme === 'alpine';
      // Far mountains
      const rngMf = makeRng(seed + 2);
      ctx.globalAlpha = dramatic ? 0.65 : 0.45;
      for (let i = 0; i < 10; i++) {
        const wx  = rngMf() * W * 4.5;                                           // 1
        const sx  = ((wx - scrollPx * 0.04) % (W * 4.5) + W * 4.5) % (W * 4.5);
        if (sx < -150 || sx > W + 150) { rngMf(); rngMf(); continue; }          // skip 2
        const ph  = (dramatic ? 48 : 28) + rngMf() * (dramatic ? 60 : 40);      // 1
        const bw  = 90 + rngMf() * 130;                                          // 1
        ctx.beginPath();
        ctx.moveTo(sx - bw/2, skyH + 2);
        ctx.bezierCurveTo(sx - bw*0.28, skyH - ph*0.5, sx - bw*0.08, skyH - ph, sx, skyH - ph);
        ctx.bezierCurveTo(sx + bw*0.08, skyH - ph, sx + bw*0.28, skyH - ph*0.5, sx + bw/2, skyH + 2);
        ctx.closePath();
        ctx.fillStyle = theme === 'alpine' ? '#1a2840' : '#5880a8';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Near mountains
      const rngMn = makeRng(seed + 9);
      for (let i = 0; i < 8; i++) {
        const wx  = rngMn() * W * 3.2;                                           // 1
        const sx  = ((wx - scrollPx * 0.09) % (W * 3.2) + W * 3.2) % (W * 3.2);
        if (sx < -140 || sx > W + 140) { rngMn(); rngMn(); rngMn(); continue; } // skip 3
        const ph     = (dramatic ? 65 : 40) + rngMn() * (dramatic ? 80 : 50);   // 1
        const bw     = 70 + rngMn() * 110;                                       // 1
        const jagged = rngMn() > (dramatic ? 0.3 : 0.5);                         // 1
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
        const mc = theme === 'alpine' ? '#0a1828' : theme === 'mountain' ? '#1a3050' : '#243a5a';
        const mg = ctx.createLinearGradient(sx, skyH - ph, sx, skyH + 2);
        mg.addColorStop(0, mc); mg.addColorStop(1, theme === 'alpine' ? '#182038' : '#28405e');
        ctx.fillStyle = mg; ctx.fill();
        // Snow caps
        const snowThresh = dramatic ? 60 : 80;
        if (ph > snowThresh) {
          const sw = bw * (jagged ? 0.13 : 0.17);
          ctx.beginPath();
          ctx.moveTo(sx - sw, skyH - ph + ph * 0.28);
          ctx.lineTo(sx, skyH - ph);
          ctx.lineTo(sx + sw, skyH - ph + ph * 0.28);
          ctx.closePath();
          ctx.fillStyle = theme === 'alpine' ? 'rgba(220,235,255,0.95)' : 'rgba(228,238,248,0.88)';
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.40)';
          ctx.beginPath(); ctx.moveTo(sx - sw*0.4, skyH - ph + ph*0.06); ctx.lineTo(sx, skyH - ph); ctx.lineTo(sx + sw*0.2, skyH - ph + ph*0.10); ctx.closePath(); ctx.fill();
        }
        // Alpine: ice/glacier streaks
        if (theme === 'alpine' && ph > 50) {
          ctx.strokeStyle = 'rgba(200,220,248,0.35)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx - bw*0.08, skyH - ph + ph*0.42); ctx.lineTo(sx - bw*0.18, skyH - ph + ph*0.72); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx + bw*0.06, skyH - ph + ph*0.36); ctx.lineTo(sx + bw*0.14, skyH - ph + ph*0.65); ctx.stroke();
        }
      }
    }

    // ── DESERT: mesa / butte silhouettes ─────────────────────────────────
    if (theme === 'desert') {
      const rngMs = makeRng(seed + 2);
      for (let i = 0; i < 7; i++) {
        const wx  = rngMs() * W * 3.5;                                           // 1
        const sx  = ((wx - scrollPx * 0.05) % (W * 3.5) + W * 3.5) % (W * 3.5);
        if (sx < -120 || sx > W + 120) { rngMs(); rngMs(); continue; }          // skip 2
        const mh  = 35 + rngMs() * 58;                                           // 1
        const mw  = 70 + rngMs() * 130;                                          // 1
        // Layered rock strata fill
        ctx.beginPath();
        ctx.moveTo(sx - mw/2, skyH + 2);
        ctx.lineTo(sx - mw/2, skyH - mh + 12);
        ctx.lineTo(sx - mw/2 + 10, skyH - mh);
        ctx.lineTo(sx + mw/2 - 10, skyH - mh);
        ctx.lineTo(sx + mw/2, skyH - mh + 12);
        ctx.lineTo(sx + mw/2, skyH + 2);
        ctx.closePath();
        const dg = ctx.createLinearGradient(sx, skyH - mh, sx, skyH + 2);
        dg.addColorStop(0, '#703820'); dg.addColorStop(0.4, '#9a4a28'); dg.addColorStop(1, '#b85a30');
        ctx.fillStyle = dg; ctx.fill();
        // Rock strata lines
        ctx.strokeStyle = 'rgba(180,80,30,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx - mw/2, skyH - mh*0.38); ctx.lineTo(sx + mw/2, skyH - mh*0.38); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx - mw/2, skyH - mh*0.62); ctx.lineTo(sx + mw/2, skyH - mh*0.62); ctx.stroke();
      }
    }

    // ── INTERSTATE: power line towers ────────────────────────────────────
    if (theme === 'interstate') {
      const rngPL = makeRng(seed + 7);
      for (let i = 0; i < 10; i++) {
        const wx  = rngPL() * W * 2.2;                                           // 1
        const sx  = ((wx - scrollPx * 0.88) % (W * 2.2) + W * 2.2) % (W * 2.2);
        if (sx < -15 || sx > W + 15) { rngPL(); rngPL(); continue; }            // skip 2
        const approxMi = offsetMi + sx * MI_PER_PX;
        const py = elToY(elevAt(approxMi));
        const ph2 = 38 + rngPL() * 18;                                           // 1
        const pw  = rngPL() * 0 + 14; // fixed width, use rng to consume call    // 1 (dummy)
        ctx.strokeStyle = '#6a7080'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, py - 2); ctx.lineTo(sx, py - ph2); ctx.stroke();
        // crossbar
        ctx.beginPath(); ctx.moveTo(sx - pw, py - ph2 + 6); ctx.lineTo(sx + pw, py - ph2 + 6); ctx.stroke();
        // diagonal supports
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx - pw, py - ph2 + 6); ctx.lineTo(sx - pw/2, py - ph2 + 16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + pw, py - ph2 + 6); ctx.lineTo(sx + pw/2, py - ph2 + 16); ctx.stroke();
        // insulators
        ctx.fillStyle = '#909898';
        ctx.beginPath(); ctx.arc(sx - pw, py - ph2 + 6, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + pw, py - ph2 + 6, 2, 0, Math.PI*2); ctx.fill();
      }
      // Interstate: far flat horizon (gentle hills instead of mountains)
      const rngH2 = makeRng(seed + 2);
      ctx.globalAlpha = 0.30;
      for (let i = 0; i < 5; i++) {
        const wx = rngH2() * W * 5;                                              // 1
        const sx = ((wx - scrollPx * 0.03) % (W * 5) + W * 5) % (W * 5);
        if (sx < -200 || sx > W + 200) { rngH2(); rngH2(); continue; }          // skip 2
        const rw = 200 + rngH2() * 250;                                          // 1
        const rh = 10 + rngH2() * 15;                                            // 1
        ctx.fillStyle = '#4878a0';
        ctx.beginPath(); ctx.ellipse(sx, skyH + 4, rw, rh, 0, Math.PI, 0); ctx.fill();
      }
      ctx.globalAlpha = 1;
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
      } else if (theme === 'mountain' || (theme === 'alpine' && tp < 0.5)) {
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
    terrainPath(0); ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 28; ctx.lineCap = 'round'; ctx.stroke();
    terrainPath(0); ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 22; ctx.stroke();
    terrainPath(0); ctx.strokeStyle = '#1e1e28'; ctx.lineWidth = 10; ctx.stroke();
    terrainPath(-10); ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke();
    terrainPath(10);  ctx.strokeStyle = 'rgba(255,255,255,0.40)'; ctx.lineWidth = 1.5; ctx.stroke();
    terrainPath(-1);  ctx.strokeStyle = '#e8c030'; ctx.lineWidth = 2; ctx.setLineDash([18,14]); ctx.stroke();
    ctx.setLineDash([]); ctx.lineCap = 'butt';

    // ════════════════════════════════════════════════════════════════════════
    // 8 ── CHARGER STATIONS
    // ════════════════════════════════════════════════════════════════════════
    for (const charger of route.chargers) {
      const cx2 = miToX(charger.positionMi);
      if (cx2 < -30 || cx2 > W + 30) continue;
      const roadY = elToY(elevAt(charger.positionMi));
      const isActive = state.chargingAtId === charger.id;
      const stationY = roadY - 36;
      ctx.strokeStyle = '#606870'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx2, roadY - 2); ctx.lineTo(cx2, stationY + 20); ctx.stroke();
      ctx.strokeStyle = '#708090'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx2, stationY + 6); ctx.lineTo(cx2 + 10, stationY + 6); ctx.stroke();
      ctx.fillStyle = isActive ? '#0d2d1a' : '#0d1e30';
      ctx.beginPath(); ctx.roundRect(cx2 - 11, stationY, 22, 20, 3); ctx.fill();
      ctx.strokeStyle = isActive ? '#3fb950' : '#58a6ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(cx2 - 11, stationY, 22, 20, 3); ctx.stroke();
      const scr = ctx.createLinearGradient(cx2-8, stationY+3, cx2-8, stationY+11);
      scr.addColorStop(0, isActive ? 'rgba(63,185,80,0.8)' : 'rgba(88,166,255,0.8)');
      scr.addColorStop(1, isActive ? 'rgba(63,185,80,0.3)' : 'rgba(88,166,255,0.3)');
      ctx.fillStyle = scr; ctx.fillRect(cx2-8, stationY+3, 16, 8);
      ctx.fillStyle = isActive ? '#3fb950' : '#58a6ff';
      ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('⚡', cx2, stationY + 18);
      if (isActive) {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#3fb950';
        ctx.beginPath(); ctx.arc(cx2, roadY - 18, 28, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
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
    ctx.translate(carScreenX, carY);
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
