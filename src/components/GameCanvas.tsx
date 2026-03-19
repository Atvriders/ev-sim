import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { getRoute } from '../game/routes';
import { getCar } from '../game/cars';

interface Props { state: GameState; }

const W         = 800;
const H         = 240;
const VIEW_MILES = 1;
const MI_PER_PX  = VIEW_MILES / W;

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
    // tyre shadow
    ctx.beginPath();
    ctx.ellipse(wx, 0, WR * 0.9, WR * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    // tyre
    ctx.beginPath();
    ctx.arc(wx, -WR, WR, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = '#2e2e2e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // rim
    ctx.beginPath();
    ctx.arc(wx, -WR, WR * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = '#c0c8d0';
    ctx.fill();
    ctx.strokeStyle = '#9aa0a8';
    ctx.lineWidth = 1;
    ctx.stroke();
    // hub cap
    ctx.beginPath();
    ctx.arc(wx, -WR, WR * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#dde2e8';
    ctx.fill();
    // spokes (5)
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
  // drop shadow
  ctx.save();
  ctx.translate(2, 3);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();
  ctx.restore();
  // body
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  // body edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // glass
  ctx.beginPath();
  ctx.moveTo(glassPts[0][0], glassPts[0][1]);
  for (let i = 1; i < glassPts.length; i++) ctx.lineTo(glassPts[i][0], glassPts[i][1]);
  ctx.closePath();
  ctx.fillStyle = 'rgba(160,210,240,0.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,220,255,0.25)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // glass glare
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(glassPts[0][0], glassPts[0][1]);
  ctx.lineTo(glassPts[0][0] + (glassPts[1][0]-glassPts[0][0])*0.5, glassPts[0][1] + (glassPts[1][1]-glassPts[0][1])*0.5);
  ctx.lineTo(glassPts[3][0] + (glassPts[2][0]-glassPts[3][0])*0.5, glassPts[3][1] + (glassPts[2][1]-glassPts[3][1])*0.5);
  ctx.lineTo(glassPts[3][0], glassPts[3][1]);
  ctx.closePath();
  ctx.fill();
  // headlight
  ctx.beginPath();
  ctx.ellipse(lightF[0], lightF[1], lightF[2], lightF[3], 0, 0, Math.PI * 2);
  const hg = ctx.createRadialGradient(lightF[0], lightF[1], 0, lightF[0], lightF[1], lightF[2]);
  hg.addColorStop(0, '#fffae0');
  hg.addColorStop(0.6, '#ffe080cc');
  hg.addColorStop(1, '#ffe08000');
  ctx.fillStyle = hg;
  ctx.fill();
  // taillight
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
  // rear window
  const bv = WR;
  ctx.beginPath();
  ctx.moveTo(2,-bv-31); ctx.lineTo(20,-bv-31); ctx.lineTo(25,-bv-20); ctx.lineTo(16,-bv-14); ctx.lineTo(2,-bv-14);
  ctx.closePath();
  ctx.fillStyle = 'rgba(160,210,240,0.35)';
  ctx.fill();
  // b-pillar
  ctx.strokeStyle = color; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-2, -b-33); ctx.lineTo(-2, -b-14); ctx.stroke();
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
  // bed
  ctx.beginPath();
  ctx.moveTo(-38,-b-1); ctx.lineTo(-38,-b-18); ctx.lineTo(-10,-b-18); ctx.lineTo(-10,-b-1);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(-37,-b-17,27,7);
  // bed rails
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-37,-b-18); ctx.lineTo(-37,-b-1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-11,-b-18); ctx.lineTo(-11,-b-1); ctx.stroke();
  // cab
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
  // rear windows
  ctx.fillStyle = 'rgba(160,210,240,0.35)';
  ctx.fillRect(-6,-b-35,14,17);
  ctx.beginPath(); ctx.moveTo(22,-b-35); ctx.lineTo(26,-b-27); ctx.lineTo(26,-b-19); ctx.lineTo(18,-b-13); ctx.lineTo(18,-b-35); ctx.closePath(); ctx.fill();
  // sliding door line
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
      sky.addColorStop(0,   '#0d3a7a');
      sky.addColorStop(0.55,'#2d7ab8');
      sky.addColorStop(1,   '#90c8e8');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      const gnd = ctx.createLinearGradient(0, H * 0.58, 0, H);
      gnd.addColorStop(0, '#3a7228'); gnd.addColorStop(1, '#1a3a10');
      ctx.fillStyle = gnd; ctx.fillRect(0, H * 0.58, W, H);
      ctx.fillStyle = '#22222a'; ctx.fillRect(0, H * 0.74, W, 24);
      ctx.strokeStyle = 'rgba(232,200,48,0.85)'; ctx.lineWidth = 1.8;
      ctx.setLineDash([14, 12]);
      ctx.beginPath(); ctx.moveTo(0, H * 0.74 + 12); ctx.lineTo(W, H * 0.74 + 12); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(W/2 - 175, H/2 - 18, 350, 36, 6);
      ctx.fill();
      ctx.fillStyle = '#e6edf3'; ctx.font = '600 14px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('Select a route to start driving', W / 2, H / 2 + 5);
      return;
    }

    const terrain   = route.terrain;
    const distTotal = route.distanceMi;
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
        const x  = miToX(mi);
        const y  = elToY(elevAt(mi)) + yOff;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }

    const seed = strSeed(route.id);

    // ── SKY ───────────────────────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0,    '#0d3070');
    sky.addColorStop(0.42, '#2272b4');
    sky.addColorStop(0.78, '#60aad8');
    sky.addColorStop(1,    '#b0d8f0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Horizon atmospheric haze
    const haze = ctx.createLinearGradient(0, skyH - 30, 0, skyH + 20);
    haze.addColorStop(0,   'rgba(195,225,248,0)');
    haze.addColorStop(0.5, 'rgba(195,225,248,0.38)');
    haze.addColorStop(1,   'rgba(195,225,248,0)');
    ctx.fillStyle = haze; ctx.fillRect(0, skyH - 30, W, 50);

    // Sun
    const sunX = W * 0.76, sunY = skyH * 0.28;
    const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 72);
    sg.addColorStop(0,    'rgba(255,252,220,0.90)');
    sg.addColorStop(0.18, 'rgba(255,225,140,0.55)');
    sg.addColorStop(0.50, 'rgba(255,210,100,0.18)');
    sg.addColorStop(1,    'rgba(255,210,100,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sunX, sunY, 72, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sunX, sunY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff9e8'; ctx.fill();

    // ── FAR MOUNTAINS (atmospheric pale blue-grey) ───────────────────────────
    const rngMf = makeRng(seed + 2);
    ctx.globalAlpha = 0.52;
    for (let i = 0; i < 10; i++) {
      const wx = rngMf() * W * 4.5;                                         // 1
      const sx = ((wx - scrollPx * 0.04) % (W * 4.5) + W * 4.5) % (W * 4.5);
      if (sx < -150 || sx > W + 150) { rngMf(); rngMf(); continue; }        // skip 2
      const ph = 32 + rngMf() * 52;                                          // 1
      const bw = 95 + rngMf() * 140;                                         // 1
      ctx.beginPath();
      ctx.moveTo(sx - bw / 2, skyH + 2);
      ctx.bezierCurveTo(sx - bw*0.28, skyH - ph*0.5, sx - bw*0.08, skyH - ph, sx, skyH - ph);
      ctx.bezierCurveTo(sx + bw*0.08, skyH - ph, sx + bw*0.28, skyH - ph*0.5, sx + bw/2, skyH + 2);
      ctx.closePath();
      const mfg = ctx.createLinearGradient(sx, skyH - ph, sx, skyH + 2);
      mfg.addColorStop(0, '#6090b8'); mfg.addColorStop(1, '#7aaac8');
      ctx.fillStyle = mfg; ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── NEAR MOUNTAINS (dark, some jagged, snow caps) ────────────────────────
    const rngMn = makeRng(seed + 9);
    for (let i = 0; i < 8; i++) {
      const wx = rngMn() * W * 3.2;                                          // 1
      const sx = ((wx - scrollPx * 0.09) % (W * 3.2) + W * 3.2) % (W * 3.2);
      if (sx < -140 || sx > W + 140) { rngMn(); rngMn(); rngMn(); continue; }// skip 3
      const ph     = 48 + rngMn() * 72;                                       // 1
      const bw     = 80 + rngMn() * 130;                                      // 1
      const jagged = rngMn() > 0.42;                                          // 1
      ctx.beginPath();
      ctx.moveTo(sx - bw/2, skyH + 2);
      if (jagged) {
        ctx.lineTo(sx - bw*0.22, skyH - ph*0.65);
        ctx.lineTo(sx - bw*0.07, skyH - ph*0.50);
        ctx.lineTo(sx,           skyH - ph);
        ctx.lineTo(sx + bw*0.08, skyH - ph*0.55);
        ctx.lineTo(sx + bw*0.24, skyH - ph*0.70);
      } else {
        ctx.bezierCurveTo(sx - bw*0.22, skyH - ph*0.48, sx - bw*0.06, skyH - ph, sx, skyH - ph);
        ctx.bezierCurveTo(sx + bw*0.06, skyH - ph, sx + bw*0.22, skyH - ph*0.48, sx + bw/2, skyH + 2);
      }
      ctx.lineTo(sx + bw/2, skyH + 2);
      ctx.closePath();
      const mg = ctx.createLinearGradient(sx, skyH - ph, sx, skyH + 2);
      mg.addColorStop(0, '#1c3050'); mg.addColorStop(1, '#28405e');
      ctx.fillStyle = mg; ctx.fill();
      if (ph > 68) {
        const sw = bw * (jagged ? 0.12 : 0.16);
        ctx.beginPath();
        ctx.moveTo(sx - sw, skyH - ph + ph * 0.30);
        ctx.lineTo(sx, skyH - ph);
        ctx.lineTo(sx + sw, skyH - ph + ph * 0.30);
        ctx.closePath();
        ctx.fillStyle = 'rgba(228,238,248,0.88)'; ctx.fill();
        // snow shimmer
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.moveTo(sx - sw * 0.5, skyH - ph + ph * 0.05);
        ctx.lineTo(sx, skyH - ph);
        ctx.lineTo(sx + sw * 0.2, skyH - ph + ph * 0.12);
        ctx.closePath(); ctx.fill();
      }
    }

    // ── CLOUDS ────────────────────────────────────────────────────────────────
    const rngC = makeRng(seed + 3);
    for (let i = 0; i < 9; i++) {
      const wx   = rngC() * W * 5.0;                                          // 1
      const sx   = ((wx - scrollPx * 0.15) % (W * 5.0) + W * 5.0) % (W * 5.0);
      if (sx < -140 || sx > W + 140) { rngC(); rngC(); rngC(); rngC(); continue; }// skip 4
      const cy2  = 8  + rngC() * skyH * 0.55;                                // 1
      const cw   = 60 + rngC() * 110;                                         // 1
      const ch   = 14 + rngC() * 24;                                          // 1
      const alph = 0.72 + rngC() * 0.25;                                      // 1
      // shadow base
      ctx.globalAlpha = alph * 0.28;
      ctx.fillStyle = '#90b8d0';
      ctx.beginPath();
      ctx.ellipse(sx,          cy2 + ch*0.6, cw*0.50, ch*0.42, 0, 0, Math.PI*2);
      ctx.ellipse(sx - cw*0.3, cy2 + ch*0.7, cw*0.34, ch*0.32, 0, 0, Math.PI*2);
      ctx.ellipse(sx + cw*0.3, cy2 + ch*0.65,cw*0.36, ch*0.34, 0, 0, Math.PI*2);
      ctx.fill();
      // main body
      ctx.globalAlpha = alph;
      ctx.fillStyle = '#eef5fc';
      ctx.beginPath();
      ctx.ellipse(sx,          cy2,          cw*0.50, ch,        0, 0, Math.PI*2);
      ctx.ellipse(sx - cw*0.3, cy2 + ch*0.2, cw*0.38, ch*0.72,  0, 0, Math.PI*2);
      ctx.ellipse(sx + cw*0.3, cy2 + ch*0.1, cw*0.40, ch*0.76,  0, 0, Math.PI*2);
      ctx.fill();
      // highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(sx - cw*0.06, cy2 - ch*0.10, cw*0.28, ch*0.48, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── FAR HILLS ─────────────────────────────────────────────────────────────
    const rngHf = makeRng(seed + 4);
    ctx.globalAlpha = 0.82;
    for (let i = 0; i < 7; i++) {
      const wx  = rngHf() * W * 3.2;                                          // 1
      const sx  = ((wx - scrollPx * 0.28) % (W * 3.2) + W * 3.2) % (W * 3.2);
      if (sx < -230 || sx > W + 230) { rngHf(); rngHf(); continue; }         // skip 2
      const rw  = 110 + rngHf() * 180;                                        // 1
      const rh  =  30 + rngHf() * 24;                                         // 1
      const hg = ctx.createLinearGradient(sx, skyH - rh, sx, skyH + 8);
      hg.addColorStop(0, '#4a8038'); hg.addColorStop(1, '#385e28');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.ellipse(sx, skyH + 8, rw, rh, 0, Math.PI, 0); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── NEAR HILLS ────────────────────────────────────────────────────────────
    const rngHn = makeRng(seed + 6);
    for (let i = 0; i < 6; i++) {
      const wx  = rngHn() * W * 2.4;                                          // 1
      const sx  = ((wx - scrollPx * 0.50) % (W * 2.4) + W * 2.4) % (W * 2.4);
      if (sx < -250 || sx > W + 250) { rngHn(); rngHn(); continue; }         // skip 2
      const rw  = 140 + rngHn() * 200;                                        // 1
      const rh  =  28 + rngHn() * 22;                                         // 1
      const hng = ctx.createLinearGradient(sx, skyH, sx, skyH + 8);
      hng.addColorStop(0, '#2e6020'); hng.addColorStop(1, '#1e4012');
      ctx.fillStyle = hng;
      ctx.beginPath(); ctx.ellipse(sx, skyH + 6, rw, rh, 0, Math.PI, 0); ctx.fill();
    }

    // ── TERRAIN FILL ──────────────────────────────────────────────────────────
    ctx.beginPath();
    terrainPath(0);
    ctx.lineTo(miToX(visEnd), H);
    ctx.lineTo(miToX(visStart), H);
    ctx.closePath();
    const gg = ctx.createLinearGradient(0, skyH, 0, H);
    gg.addColorStop(0,   '#3a7228');
    gg.addColorStop(0.25,'#2d5e1c');
    gg.addColorStop(0.65,'#1e4010');
    gg.addColorStop(1,   '#0e2006');
    ctx.fillStyle = gg; ctx.fill();

    // Grass texture band near road
    for (let s = 0; s <= STEPS; s += 4) {
      const mi = visStart + s * stepMi;
      const x  = miToX(mi);
      const y  = elToY(elevAt(mi));
      ctx.strokeStyle = 'rgba(80,160,50,0.22)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y - 4); ctx.stroke();
    }

    // ── ROAD ──────────────────────────────────────────────────────────────────
    // Shoulder / base
    terrainPath(0); ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 28; ctx.lineCap = 'round'; ctx.stroke();
    // Asphalt surface
    terrainPath(0); ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 22; ctx.stroke();
    // Asphalt centre highlight (worn strip)
    terrainPath(0); ctx.strokeStyle = '#1e1e28'; ctx.lineWidth = 10; ctx.stroke();
    // Top edge line
    terrainPath(-10); ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke();
    // Bottom edge line
    terrainPath(10);  ctx.strokeStyle = 'rgba(255,255,255,0.40)'; ctx.lineWidth = 1.5; ctx.stroke();
    // Centre dashes (yellow)
    terrainPath(-1);  ctx.strokeStyle = '#e8c030'; ctx.lineWidth = 2; ctx.setLineDash([18, 14]); ctx.stroke();
    ctx.setLineDash([]); ctx.lineCap = 'butt';

    // ── TREES ─────────────────────────────────────────────────────────────────
    const rngT = makeRng(seed + 5);
    for (let i = 0; i < 60; i++) {
      const wx = rngT() * W * 3.0;                                             // 1
      const sx = ((wx - scrollPx * 0.82) % (W * 3.0) + W * 3.0) % (W * 3.0);
      if (sx < -30 || sx > W + 30) { rngT(); rngT(); continue; }              // skip 2
      const approxMi = offsetMi + sx * MI_PER_PX;
      const gy = elToY(elevAt(approxMi));
      const h  = 20 + rngT() * 28;                                             // 1
      const isPine = rngT() < 0.55;                                            // 1
      if (isPine) {
        // Pine: 3 layered triangles
        const layers = [[0.55, 0.32, '#1a4a20'], [0.72, 0.10, '#1e5428'], [1.0, 0, '#246030']];
        for (const [topF, botF, col] of layers) {
          ctx.fillStyle = col as string;
          ctx.beginPath();
          ctx.moveTo(sx, gy - h * (topF as number));
          ctx.lineTo(sx - h * 0.36, gy - h * (botF as number));
          ctx.lineTo(sx + h * 0.36, gy - h * (botF as number));
          ctx.closePath(); ctx.fill();
        }
        // trunk
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(sx - 2, gy - h * 0.10, 4, h * 0.10);
      } else {
        // Deciduous: trunk + rounded foliage
        ctx.fillStyle = '#6a4020';
        ctx.fillRect(sx - 2.5, gy - h * 0.38, 5, h * 0.38);
        ctx.fillStyle = '#2a6a18';
        ctx.beginPath(); ctx.arc(sx, gy - h * 0.65, h * 0.44, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#348a20';
        ctx.beginPath(); ctx.arc(sx - h*0.20, gy - h*0.70, h*0.30, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + h*0.18, gy - h*0.72, h*0.28, 0, Math.PI*2); ctx.fill();
        // highlight
        ctx.fillStyle = 'rgba(80,180,40,0.25)';
        ctx.beginPath(); ctx.arc(sx - h*0.08, gy - h*0.82, h*0.22, 0, Math.PI*2); ctx.fill();
      }
    }

    // ── CHARGER STATIONS ──────────────────────────────────────────────────────
    for (const charger of route.chargers) {
      const cx2 = miToX(charger.positionMi);
      if (cx2 < -30 || cx2 > W + 30) continue;
      const roadY = elToY(elevAt(charger.positionMi));
      const isActive = state.chargingAtId === charger.id;
      const stationY = roadY - 36;
      // pole
      ctx.strokeStyle = '#606870'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx2, roadY - 2); ctx.lineTo(cx2, stationY + 20); ctx.stroke();
      // canopy arm
      ctx.strokeStyle = '#708090'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx2, stationY + 6); ctx.lineTo(cx2 + 10, stationY + 6); ctx.stroke();
      // station box
      const bx = cx2 - 11, by = stationY;
      ctx.fillStyle = isActive ? '#0d2d1a' : '#0d1e30';
      ctx.beginPath(); ctx.roundRect(bx, by, 22, 20, 3); ctx.fill();
      ctx.strokeStyle = isActive ? '#3fb950' : '#58a6ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(bx, by, 22, 20, 3); ctx.stroke();
      // screen glow
      const scr = ctx.createLinearGradient(bx+3, by+3, bx+3, by+10);
      scr.addColorStop(0, isActive ? 'rgba(63,185,80,0.8)' : 'rgba(88,166,255,0.8)');
      scr.addColorStop(1, isActive ? 'rgba(63,185,80,0.3)' : 'rgba(88,166,255,0.3)');
      ctx.fillStyle = scr; ctx.fillRect(bx+3, by+3, 16, 8);
      // bolt icon
      ctx.fillStyle = isActive ? '#3fb950' : '#58a6ff';
      ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('⚡', cx2, by + 18);
      // charging glow halo when active
      if (isActive) {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#3fb950';
        ctx.beginPath(); ctx.arc(cx2, roadY - 18, 28, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── CAR ───────────────────────────────────────────────────────────────────
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

    // Ground shadow ellipse
    ctx.beginPath();
    ctx.ellipse(0, 2, 36, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fill();

    // Regen glow
    if (state.currentKw < -0.5) {
      ctx.shadowColor = '#3fb950'; ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(63,185,80,0.15)';
      ctx.beginPath(); ctx.ellipse(0, -2, 38, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Speed motion blur hint
    if (state.speedMph > 40 && !state.isCharging) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.ellipse(-8, -WR - 12, 30, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    drawCarByStyle(ctx, state.selectedCar, car.color, wheelAngle);

    ctx.restore();

    // ── PROGRESS BAR ──────────────────────────────────────────────────────────
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
