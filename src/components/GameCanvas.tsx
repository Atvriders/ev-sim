import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { getRoute } from '../game/routes';
import { getCar } from '../game/cars';

interface Props { state: GameState; }

const W  = 800;
const H  = 240;
const VIEW_MILES = 5;          // how many miles visible at once
const MI_PER_PX  = VIEW_MILES / W;

// ── Parallax / scenery helpers ─────────────────────────────────────────────
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
  // sedans
  tesla_m3_rwd:'sedan', tesla_m3_lr:'sedan', tesla_ms:'sedan',
  hyundai_ioniq6:'sedan', merc_eqs:'sedan', merc_eqe:'sedan',
  polestar_2:'sedan', byd_han:'sedan', lucid_air_gt:'sedan',
  // sport
  audi_etron_gt:'sport', porsche_taycan:'sport', bmw_i4_m50:'sport',
  // SUVs
  tesla_my:'suv', hyundai_ioniq5:'suv', kia_ev6_lr:'suv', kia_ev9:'suv',
  vw_id4:'suv', ford_mache:'suv', honda_prologue:'suv', nissan_ariya:'suv',
  volvo_ex30:'suv', volvo_ex40:'suv', bmw_ix:'suv', polestar_3:'suv',
  rivian_r1s:'suv', cadillac_lyriq:'suv', genesis_gv60:'suv',
  audi_q8_etron:'suv', subaru_solterra:'suv', jeep_avenger:'suv',
  chevy_silverado:'truck', bmw_i3_2014:'hatchback',
  // trucks
  tesla_ct:'truck', ford_lightning:'truck', rivian_r1t:'truck', gmc_hummer:'truck',
  // van
  vw_idbuzz:'van',
  // hatchbacks
  chevy_bolt:'hatchback', chevy_bolt_2017:'hatchback', nissan_leaf_plus:'hatchback',
  nissan_leaf_2011:'hatchback', nissan_leaf_40:'hatchback', mini_se:'hatchback',
  mazda_mx30:'hatchback', vw_egolf_2015:'hatchback', byd_atto3:'hatchback',
  kia_soul_ev:'hatchback',
  // compacts
  mitsubishi_imiev:'compact', smart_ed_2013:'compact',
  fiat_500e_2014:'compact', chevy_spark_ev:'compact',
};

// ── Car silhouette drawing (local coords: y=0 is road surface) ─────────────
const WR = 7; // wheel radius

function wheels(ctx: CanvasRenderingContext2D, positions: number[], angle: number) {
  for (const wx of positions) {
    // tyre
    ctx.beginPath();
    ctx.arc(wx, -WR, WR, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // hub
    ctx.beginPath();
    ctx.arc(wx, -WR, WR * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#999';
    ctx.fill();
    // spokes
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    for (let s = 0; s < 3; s++) {
      const a = angle + (s * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(wx, -WR);
      ctx.lineTo(wx + Math.cos(a) * WR * 0.82, -WR + Math.sin(a) * WR * 0.82);
      ctx.stroke();
    }
  }
}

function drawSedan(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  // Body silhouette
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-30, -WR - 1);
  ctx.lineTo(-32, -WR - 8);   // rear tail
  ctx.lineTo(-24, -WR - 16);  // C-pillar / trunk
  ctx.lineTo(-14, -WR - 26);  // rear glass top
  ctx.lineTo(-4,  -WR - 28);  // roof rear
  ctx.lineTo(10,  -WR - 28);  // roof front
  ctx.lineTo(20,  -WR - 22);  // windshield top
  ctx.lineTo(28,  -WR - 13);  // hood
  ctx.lineTo(30,  -WR - 8);   // front lamp
  ctx.lineTo(30,  -WR - 1);
  ctx.closePath();
  ctx.fill();
  // glass tint
  ctx.fillStyle = '#7ab8d440';
  ctx.beginPath();
  ctx.moveTo(-13, -WR - 25); ctx.lineTo(-4, -WR - 27); ctx.lineTo(10, -WR - 27);
  ctx.lineTo(19, -WR - 21); ctx.lineTo(27, -WR - 13); ctx.lineTo(16, -WR - 13);
  ctx.lineTo(8,  -WR - 20); ctx.lineTo(-4, -WR - 22); ctx.closePath();
  ctx.fill();
  // lights
  ctx.fillStyle = '#ffe87a'; ctx.beginPath(); ctx.ellipse(29, -WR-6, 3, 2, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.ellipse(-31, -WR-6, 3, 2, 0, 0, Math.PI*2); ctx.fill();
  wheels(ctx, [-17, 17], angle);
}

function drawSport(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-32, -WR - 1);
  ctx.lineTo(-33, -WR - 7);
  ctx.lineTo(-26, -WR - 14);  // rear slope
  ctx.lineTo(-12, -WR - 24);  // rear glass
  ctx.lineTo(-2,  -WR - 26);
  ctx.lineTo(12,  -WR - 26);  // flat roof (very low)
  ctx.lineTo(22,  -WR - 20);  // windshield
  ctx.lineTo(30,  -WR - 11);  // long hood
  ctx.lineTo(33,  -WR - 7);
  ctx.lineTo(33,  -WR - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7ab8d440';
  ctx.beginPath();
  ctx.moveTo(-11, -WR-22); ctx.lineTo(-2, -WR-25); ctx.lineTo(12, -WR-25);
  ctx.lineTo(21, -WR-20); ctx.lineTo(28, -WR-12); ctx.lineTo(18, -WR-12);
  ctx.lineTo(9, -WR-18); ctx.lineTo(-2, -WR-20); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe87a'; ctx.beginPath(); ctx.ellipse(32, -WR-5, 3, 2, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.ellipse(-32, -WR-5, 3, 2, 0, 0, Math.PI*2); ctx.fill();
  wheels(ctx, [-18, 18], angle);
}

function drawSUV(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-29, -WR - 1);
  ctx.lineTo(-30, -WR - 10);
  ctx.lineTo(-24, -WR - 32);  // roofline (tall)
  ctx.lineTo(20,  -WR - 32);
  ctx.lineTo(26,  -WR - 20);  // windshield angle
  ctx.lineTo(30,  -WR - 12);
  ctx.lineTo(30,  -WR - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7ab8d440';
  ctx.beginPath();
  ctx.moveTo(-22, -WR-30); ctx.lineTo(20, -WR-30); ctx.lineTo(25, -WR-20);
  ctx.lineTo(16, -WR-14); ctx.lineTo(-18, -WR-14); ctx.closePath();
  ctx.fill();
  // side window division
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-2, -WR-30); ctx.lineTo(-2, -WR-14); ctx.stroke();
  ctx.fillStyle = '#ffe87a'; ctx.beginPath(); ctx.ellipse(29, -WR-7, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.ellipse(-29, -WR-7, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
  wheels(ctx, [-16, 17], angle);
}

function drawHatchback(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-26, -WR - 1);
  ctx.lineTo(-27, -WR - 9);
  ctx.lineTo(-20, -WR - 26);  // steep rear hatch
  ctx.lineTo(10,  -WR - 26);
  ctx.lineTo(18,  -WR - 20);
  ctx.lineTo(24,  -WR - 12);
  ctx.lineTo(26,  -WR - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7ab8d440';
  ctx.beginPath();
  ctx.moveTo(-18, -WR-24); ctx.lineTo(10, -WR-24); ctx.lineTo(17, -WR-20);
  ctx.lineTo(12, -WR-13); ctx.lineTo(-14, -WR-13); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe87a'; ctx.beginPath(); ctx.ellipse(25, -WR-6, 2.5, 2, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.ellipse(-26, -WR-6, 2.5, 2, 0, 0, Math.PI*2); ctx.fill();
  wheels(ctx, [-13, 14], angle);
}

function drawTruck(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  // Cab
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-10, -WR - 1);
  ctx.lineTo(-10, -WR - 30);
  ctx.lineTo(14,  -WR - 30);
  ctx.lineTo(22,  -WR - 18);
  ctx.lineTo(28,  -WR - 12);
  ctx.lineTo(28,  -WR - 1);
  ctx.closePath();
  ctx.fill();
  // Bed
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-38, -WR - 1);
  ctx.lineTo(-38, -WR - 16);
  ctx.lineTo(-10, -WR - 16);
  ctx.lineTo(-10, -WR - 1);
  ctx.closePath();
  ctx.fill();
  // Bed floor
  ctx.fillStyle = '#00000033';
  ctx.fillRect(-37, -WR - 15, 26, 5);
  // Cab glass
  ctx.fillStyle = '#7ab8d440';
  ctx.beginPath();
  ctx.moveTo(-8, -WR-28); ctx.lineTo(13, -WR-28); ctx.lineTo(20, -WR-18);
  ctx.lineTo(10, -WR-13); ctx.lineTo(-8, -WR-13); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe87a'; ctx.beginPath(); ctx.ellipse(27, -WR-7, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.ellipse(-37, -WR-8, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
  wheels(ctx, [-24, 16], angle);
}

function drawVan(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-28, -WR - 1);
  ctx.lineTo(-30, -WR - 12);
  ctx.lineTo(-28, -WR - 36);
  ctx.lineTo(20,  -WR - 36);
  ctx.lineTo(26,  -WR - 28);
  ctx.lineTo(28,  -WR - 14);
  ctx.lineTo(28,  -WR - 1);
  ctx.closePath();
  ctx.fill();
  // windows
  ctx.fillStyle = '#7ab8d440';
  ctx.fillRect(-26, -WR - 34, 16, 16);
  ctx.fillRect(-6,  -WR - 34, 16, 16);
  ctx.beginPath(); ctx.moveTo(22, -WR-34); ctx.lineTo(26, -WR-27); ctx.lineTo(26, -WR-20); ctx.lineTo(18, -WR-14); ctx.lineTo(18, -WR-34); ctx.closePath(); ctx.fill();
  // sliding door line
  ctx.strokeStyle = '#00000033'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-8, -WR-34); ctx.lineTo(-8, -WR-2); ctx.stroke();
  ctx.fillStyle = '#ffe87a'; ctx.beginPath(); ctx.ellipse(27, -WR-8, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.ellipse(-29, -WR-8, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
  wheels(ctx, [-15, 16], angle);
}

function drawCompact(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, -WR - 1);
  ctx.lineTo(-21, -WR - 8);
  ctx.lineTo(-16, -WR - 20);
  ctx.lineTo(-4,  -WR - 24);
  ctx.lineTo(8,   -WR - 24);
  ctx.lineTo(16,  -WR - 17);
  ctx.lineTo(20,  -WR - 10);
  ctx.lineTo(20,  -WR - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7ab8d440';
  ctx.beginPath();
  ctx.moveTo(-14, -WR-19); ctx.lineTo(-4, -WR-22); ctx.lineTo(8, -WR-22);
  ctx.lineTo(14, -WR-17); ctx.lineTo(8, -WR-12); ctx.lineTo(-10, -WR-12); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe87a'; ctx.beginPath(); ctx.ellipse(19, -WR-5, 2, 1.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.ellipse(-20, -WR-5, 2, 1.5, 0, 0, Math.PI*2); ctx.fill();
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    const route = state.currentRoute ? getRoute(state.currentRoute) : null;
    if (!route || !state.driving) {
      ctx.fillStyle = '#161b22';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#8b949e';
      ctx.font = '15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Select a route to start driving', W / 2, H / 2);
      return;
    }

    const terrain    = route.terrain;
    const distTotal  = route.distanceMi;
    const carScreenX = W * 0.28;
    const offsetMi   = state.positionMi - carScreenX * MI_PER_PX;
    const scrollPx   = state.positionMi / MI_PER_PX;

    function miToX(mi: number) { return (mi - offsetMi) / MI_PER_PX; }

    // Elevation helpers
    const elevs     = terrain.map(p => p.elevationFt);
    const minEl     = Math.min(...elevs);
    const maxEl     = Math.max(...elevs);
    const elRange   = Math.max(maxEl - minEl, 100);
    const skyH      = H * 0.40;
    const groundBot = H * 0.82;

    function elToY(el: number) {
      return skyH + (1 - (el - minEl) / elRange) * (groundBot - skyH);
    }

    // Interpolate elevation at any mile position
    function elevAt(mi: number): number {
      for (let i = 0; i < terrain.length - 1; i++) {
        if (terrain[i].distanceMi <= mi && terrain[i+1].distanceMi >= mi) {
          const t = (mi - terrain[i].distanceMi) / (terrain[i+1].distanceMi - terrain[i].distanceMi);
          return terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        }
      }
      return terrain[terrain.length - 1].elevationFt;
    }

    // ── SKY ──────────────────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0, '#060d1a');
    sky.addColorStop(1, '#1a3a60');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    const rngS = makeRng(strSeed(route.id) + 1);
    for (let i = 0; i < 60; i++) {
      const wx = rngS() * W * 5;
      const sx = ((wx - scrollPx * 0.02) % (W * 5) + W * 5) % (W * 5);
      if (sx > W) continue;
      ctx.globalAlpha = 0.3 + rngS() * 0.7;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, rngS() * skyH * 0.85, 0.5 + rngS(), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Distant mountains
    const rngM = makeRng(strSeed(route.id) + 2);
    for (let i = 0; i < 12; i++) {
      const wx  = rngM() * W * 3.5;
      const sx  = ((wx - scrollPx * 0.06) % (W * 3.5) + W * 3.5) % (W * 3.5);
      if (sx < -120 || sx > W + 120) { rngM(); rngM(); continue; }
      const ph  = 28 + rngM() * 48;
      const bw  = 80 + rngM() * 100;
      ctx.beginPath();
      ctx.moveTo(sx - bw / 2, skyH + 2);
      ctx.lineTo(sx, skyH - ph);
      ctx.lineTo(sx + bw / 2, skyH + 2);
      ctx.closePath();
      ctx.fillStyle = '#0d1e36';
      ctx.fill();
      if (ph > 50) {
        ctx.beginPath();
        ctx.moveTo(sx - bw * 0.12, skyH - ph + ph * 0.35);
        ctx.lineTo(sx, skyH - ph);
        ctx.lineTo(sx + bw * 0.12, skyH - ph + ph * 0.35);
        ctx.closePath();
        ctx.fillStyle = '#c8d8e8aa';
        ctx.fill();
      }
    }

    // Clouds
    const rngC = makeRng(strSeed(route.id) + 3);
    for (let i = 0; i < 10; i++) {
      const wx = rngC() * W * 4;
      const sx = ((wx - scrollPx * 0.18) % (W * 4) + W * 4) % (W * 4);
      if (sx < -120 || sx > W + 120) { rngC(); rngC(); rngC(); continue; }
      const cy = 12 + rngC() * skyH * 0.55;
      const cw = 50 + rngC() * 90;
      const ch = 10 + rngC() * 18;
      ctx.globalAlpha = 0.18 + rngC() * 0.18;
      ctx.fillStyle = '#a8c8e8';
      ctx.beginPath();
      ctx.ellipse(sx, cy, cw * 0.6, ch, 0, 0, Math.PI * 2);
      ctx.ellipse(sx - cw * 0.3, cy + ch * 0.2, cw * 0.4, ch * 0.7, 0, 0, Math.PI * 2);
      ctx.ellipse(sx + cw * 0.3, cy + ch * 0.1, cw * 0.4, ch * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Midground hills
    const rngH = makeRng(strSeed(route.id) + 4);
    for (let i = 0; i < 8; i++) {
      const wx = rngH() * W * 2.5;
      const sx = ((wx - scrollPx * 0.38) % (W * 2.5) + W * 2.5) % (W * 2.5);
      if (sx < -200 || sx > W + 200) { rngH(); continue; }
      ctx.beginPath();
      ctx.ellipse(sx, skyH + 6, 120 + rngH() * 160, 28 + rngH() * 20, 0, Math.PI, 0);
      ctx.fillStyle = '#162a1a';
      ctx.fill();
    }

    // ── TERRAIN ───────────────────────────────────────────────────────────
    // Draw ground fill using finely sampled points within visible range
    const visStart = Math.max(0, offsetMi - 1);
    const visEnd   = Math.min(distTotal, offsetMi + VIEW_MILES + 1);
    const STEPS    = 120;
    const stepMi   = (visEnd - visStart) / STEPS;

    ctx.beginPath();
    let first = true;
    for (let s = 0; s <= STEPS; s++) {
      const mi = visStart + s * stepMi;
      const x  = miToX(mi);
      const y  = elToY(elevAt(mi));
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
    ctx.lineTo(miToX(visEnd), H);
    ctx.lineTo(miToX(visStart), H);
    ctx.closePath();
    const gg = ctx.createLinearGradient(0, skyH, 0, H);
    gg.addColorStop(0, '#2a3a2a');
    gg.addColorStop(1, '#1a251a');
    ctx.fillStyle = gg;
    ctx.fill();

    // Road surface
    ctx.beginPath(); first = true;
    for (let s = 0; s <= STEPS; s++) {
      const mi = visStart + s * stepMi;
      const x  = miToX(mi);
      const y  = elToY(elevAt(mi));
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 8; ctx.stroke();

    // Dashed center line
    ctx.beginPath(); first = true;
    for (let s = 0; s <= STEPS; s++) {
      const mi = visStart + s * stepMi;
      if (first) { ctx.moveTo(miToX(mi), elToY(elevAt(mi)) - 1); first = false; }
      else ctx.lineTo(miToX(mi), elToY(elevAt(mi)) - 1);
    }
    ctx.strokeStyle = '#ffcc0099'; ctx.lineWidth = 2;
    ctx.setLineDash([16, 14]); ctx.stroke(); ctx.setLineDash([]);

    // Roadside trees
    const rngT = makeRng(strSeed(route.id) + 5);
    for (let i = 0; i < 40; i++) {
      const wx   = rngT() * W * 2.2;
      const sx   = ((wx - scrollPx * 0.75) % (W * 2.2) + W * 2.2) % (W * 2.2);
      if (sx < -20 || sx > W + 20) { rngT(); rngT(); continue; }
      const approxMi = offsetMi + sx * MI_PER_PX;
      const gy = elToY(elevAt(approxMi));
      const h  = 16 + rngT() * 22;
      if (rngT() < 0.5) {
        ctx.fillStyle = '#1a3322';
        ctx.beginPath(); ctx.moveTo(sx, gy - h); ctx.lineTo(sx - 7, gy); ctx.lineTo(sx + 7, gy); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = '#1d3a1d';
        ctx.beginPath(); ctx.arc(sx, gy - h * 0.5, h * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#162a14'; ctx.fillRect(sx - 2, gy - h * 0.2, 4, h * 0.2);
      }
    }

    // ── CHARGERS ──────────────────────────────────────────────────────────
    for (const charger of route.chargers) {
      const cx2 = miToX(charger.positionMi);
      if (cx2 < -20 || cx2 > W + 20) continue;
      const cy2 = elToY(elevAt(charger.positionMi)) - 18;
      const isActive = state.chargingAtId === charger.id;
      ctx.strokeStyle = '#666'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(cx2, cy2 + 18); ctx.lineTo(cx2, cy2); ctx.stroke();
      ctx.fillStyle = isActive ? '#3fb950' : '#58a6ff';
      ctx.fillRect(cx2 - 8, cy2 - 13, 16, 13);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('⚡', cx2, cy2 - 2);
    }

    // ── CAR ───────────────────────────────────────────────────────────────
    const car = getCar(state.selectedCar);
    const carEl  = elevAt(state.positionMi);
    const carElF = elevAt(state.positionMi + 0.005); // 26ft ahead for grade
    const grade  = (carElF - carEl) / (0.005 * 5280);
    const tilt   = Math.atan(grade) * 0.55;
    const carY   = elToY(carEl);
    const wheelAngle = (state.positionMi * 5280 / (Math.PI * 2)) % (Math.PI * 2);

    ctx.save();
    ctx.translate(carScreenX, carY);
    ctx.rotate(-tilt);

    if (state.currentKw < -0.5) {
      ctx.shadowColor = '#3fb950'; ctx.shadowBlur = 16;
      ctx.fillStyle = '#3fb95028';
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    drawCarByStyle(ctx, state.selectedCar, car.color, wheelAngle);

    ctx.restore();

    // ── PROGRESS BAR ──────────────────────────────────────────────────────
    const prog = Math.min(1, state.positionMi / distTotal);
    ctx.fillStyle = '#21262d'; ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = '#58a6ff'; ctx.fillRect(0, 0, W * prog, 4);
    ctx.fillStyle = '#e6edf3cc'; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`${state.positionMi.toFixed(1)} / ${distTotal} mi`, 6, 16);

  }, [state]);

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
    </div>
  );
}
