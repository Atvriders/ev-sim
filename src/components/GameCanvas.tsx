import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { getRoute } from '../game/routes';
import { getCar } from '../game/cars';

interface Props {
  state: GameState;
}

const W = 800;
const H = 220;

// Seeded deterministic RNG — same route always gets same scenery
function makeRng(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff;
  };
}

// String → numeric seed
function strSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

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
    const carScreenX = W * 0.25;
    const miPerPx    = distTotal / (W * 2);
    const offsetMi   = state.positionMi - carScreenX * miPerPx;

    // Raw pixel scroll offset for parallax (how far road has scrolled in px)
    const scrollPx = state.positionMi / miPerPx;

    function miToX(mi: number) { return (mi - offsetMi) / miPerPx; }

    // ── Elevation helpers ──────────────────────────────────────────────────
    const elevs    = terrain.map(p => p.elevationFt);
    const minEl    = Math.min(...elevs);
    const maxEl    = Math.max(...elevs);
    const elRange  = Math.max(maxEl - minEl, 100);
    const skyH     = H * 0.42;    // sky takes top 42%
    const groundYBot = H * 0.82;

    function elToY(el: number) {
      const frac = 1 - (el - minEl) / elRange;
      return skyH + frac * (groundYBot - skyH);
    }

    // ── SKY gradient ───────────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0, '#060d1a');
    sky.addColorStop(1, '#1a3a60');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // ── LAYER 1: stars (essentially fixed, tiny drift) ─────────────────────
    const rngStars = makeRng(strSeed(route.id) + 1);
    ctx.fillStyle = '#ffffffcc';
    for (let i = 0; i < 60; i++) {
      const wx  = rngStars() * W * 5;
      const sx  = ((wx - scrollPx * 0.02) % (W * 5) + W * 5) % (W * 5);
      if (sx > W) continue;
      const y   = rngStars() * skyH * 0.85;
      const r   = 0.5 + rngStars() * 1;
      ctx.globalAlpha = 0.3 + rngStars() * 0.7;
      ctx.beginPath();
      ctx.arc(sx, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── LAYER 2: distant mountains (very slow) ─────────────────────────────
    const rngMtn = makeRng(strSeed(route.id) + 2);
    for (let i = 0; i < 12; i++) {
      const wx   = rngMtn() * W * 3.5;
      const sx   = ((wx - scrollPx * 0.06) % (W * 3.5) + W * 3.5) % (W * 3.5);
      if (sx < -120 || sx > W + 120) { rngMtn(); rngMtn(); continue; }
      const peakH = 28 + rngMtn() * 48;
      const baseW = 80 + rngMtn() * 100;
      ctx.beginPath();
      ctx.moveTo(sx - baseW / 2, skyH + 2);
      ctx.lineTo(sx, skyH - peakH);
      ctx.lineTo(sx + baseW / 2, skyH + 2);
      ctx.closePath();
      ctx.fillStyle = '#0d1e36';
      ctx.fill();
      // snow cap
      if (peakH > 50) {
        ctx.beginPath();
        ctx.moveTo(sx - baseW * 0.12, skyH - peakH + peakH * 0.35);
        ctx.lineTo(sx, skyH - peakH);
        ctx.lineTo(sx + baseW * 0.12, skyH - peakH + peakH * 0.35);
        ctx.closePath();
        ctx.fillStyle = '#c8d8e8aa';
        ctx.fill();
      }
    }

    // ── LAYER 3: clouds (slow) ─────────────────────────────────────────────
    const rngCloud = makeRng(strSeed(route.id) + 3);
    for (let i = 0; i < 10; i++) {
      const wx  = rngCloud() * W * 4;
      const sx  = ((wx - scrollPx * 0.18) % (W * 4) + W * 4) % (W * 4);
      if (sx < -120 || sx > W + 120) { rngCloud(); rngCloud(); rngCloud(); continue; }
      const cy  = 12 + rngCloud() * (skyH * 0.55);
      const cw  = 50 + rngCloud() * 90;
      const ch  = 10 + rngCloud() * 18;
      ctx.globalAlpha = 0.18 + rngCloud() * 0.18;
      ctx.fillStyle = '#a8c8e8';
      ctx.beginPath();
      ctx.ellipse(sx,        cy,      cw * 0.6, ch,      0, 0, Math.PI * 2);
      ctx.ellipse(sx - cw * 0.3, cy + ch * 0.2, cw * 0.4, ch * 0.7, 0, 0, Math.PI * 2);
      ctx.ellipse(sx + cw * 0.3, cy + ch * 0.1, cw * 0.4, ch * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── LAYER 4: midground hills (medium speed) ────────────────────────────
    const rngHill = makeRng(strSeed(route.id) + 4);
    for (let i = 0; i < 8; i++) {
      const wx   = rngHill() * W * 2.5;
      const sx   = ((wx - scrollPx * 0.38) % (W * 2.5) + W * 2.5) % (W * 2.5);
      if (sx < -200 || sx > W + 200) { rngHill(); continue; }
      const hw   = 120 + rngHill() * 160;
      ctx.beginPath();
      ctx.ellipse(sx, skyH + 6, hw, 28 + rngHill() * 20, 0, Math.PI, 0);
      ctx.fillStyle = '#162a1a';
      ctx.fill();
    }

    // ── ROAD / TERRAIN (full speed) ────────────────────────────────────────
    ctx.beginPath();
    let firstPt = true;
    for (let i = 0; i < terrain.length - 1; i++) {
      for (let j = 0; j <= 20; j++) {
        const t  = j / 20;
        const mi = terrain[i].distanceMi + t * (terrain[i+1].distanceMi - terrain[i].distanceMi);
        const el = terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        const x  = miToX(mi), y = elToY(el);
        if (firstPt) { ctx.moveTo(x, y); firstPt = false; } else ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(miToX(terrain[terrain.length - 1].distanceMi), H);
    ctx.lineTo(miToX(terrain[0].distanceMi), H);
    ctx.closePath();
    const groundGrad = ctx.createLinearGradient(0, skyH, 0, H);
    groundGrad.addColorStop(0, '#2a3a2a');
    groundGrad.addColorStop(1, '#1a251a');
    ctx.fillStyle = groundGrad;
    ctx.fill();

    // Road surface
    ctx.beginPath(); firstPt = true;
    for (let i = 0; i < terrain.length - 1; i++) {
      for (let j = 0; j <= 20; j++) {
        const t  = j / 20;
        const mi = terrain[i].distanceMi + t * (terrain[i+1].distanceMi - terrain[i].distanceMi);
        const el = terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        if (firstPt) { ctx.moveTo(miToX(mi), elToY(el)); firstPt = false; }
        else ctx.lineTo(miToX(mi), elToY(el));
      }
    }
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 7;
    ctx.stroke();

    // Dashed center line
    ctx.beginPath(); firstPt = true;
    for (let i = 0; i < terrain.length - 1; i++) {
      for (let j = 0; j <= 20; j++) {
        const t  = j / 20;
        const mi = terrain[i].distanceMi + t * (terrain[i+1].distanceMi - terrain[i].distanceMi);
        const el = terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        if (firstPt) { ctx.moveTo(miToX(mi), elToY(el) - 1); firstPt = false; }
        else ctx.lineTo(miToX(mi), elToY(el) - 1);
      }
    }
    ctx.strokeStyle = '#ffcc0099';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── LAYER 5: roadside trees (fast parallax, slightly behind terrain) ───
    const rngTree = makeRng(strSeed(route.id) + 5);
    for (let i = 0; i < 30; i++) {
      const wx   = rngTree() * W * 2.2;
      const sx   = ((wx - scrollPx * 0.75) % (W * 2.2) + W * 2.2) % (W * 2.2);
      if (sx < -20 || sx > W + 20) { rngTree(); rngTree(); continue; }
      // Approximate ground Y at this screen X by lerping nearest terrain segment
      const approxMi  = offsetMi + sx * miPerPx;
      let treeGndY     = groundYBot;
      for (let k = 0; k < terrain.length - 1; k++) {
        if (terrain[k].distanceMi <= approxMi && terrain[k+1].distanceMi >= approxMi) {
          const frac = (approxMi - terrain[k].distanceMi) / (terrain[k+1].distanceMi - terrain[k].distanceMi);
          const el = terrain[k].elevationFt + frac * (terrain[k+1].elevationFt - terrain[k].elevationFt);
          treeGndY = elToY(el);
          break;
        }
      }
      const h   = 14 + rngTree() * 18;
      const type = rngTree();  // 0-0.5 = pine, 0.5-1 = round tree
      if (type < 0.5) {
        // Pine
        ctx.fillStyle = '#1a3322';
        ctx.beginPath();
        ctx.moveTo(sx, treeGndY - h);
        ctx.lineTo(sx - 6, treeGndY);
        ctx.lineTo(sx + 6, treeGndY);
        ctx.closePath();
        ctx.fill();
      } else {
        // Round tree
        ctx.fillStyle = '#1d3a1d';
        ctx.beginPath();
        ctx.arc(sx, treeGndY - h * 0.5, h * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#162a14';
        ctx.fillRect(sx - 2, treeGndY - h * 0.2, 4, h * 0.2);
      }
    }

    // ── CHARGERS ──────────────────────────────────────────────────────────
    for (const charger of route.chargers) {
      const tpt = terrain.reduce((acc, pt) =>
        Math.abs(pt.distanceMi - charger.positionMi) < Math.abs(acc.distanceMi - charger.positionMi) ? pt : acc
      , terrain[0]);
      const cx2 = miToX(charger.positionMi);
      const cy2 = elToY(tpt.elevationFt) - 14;
      const isActive = state.chargingAtId === charger.id;

      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2 + 14);
      ctx.lineTo(cx2, cy2);
      ctx.stroke();

      ctx.fillStyle = isActive ? '#3fb950' : '#58a6ff';
      ctx.fillRect(cx2 - 6, cy2 - 10, 12, 10);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', cx2, cy2 - 2);
    }

    // ── CAR ───────────────────────────────────────────────────────────────
    const car = getCar(state.selectedCar);
    let carEl = terrain[0].elevationFt;
    let grade = 0;
    for (let i = 0; i < terrain.length - 1; i++) {
      if (terrain[i].distanceMi <= state.positionMi && terrain[i+1].distanceMi >= state.positionMi) {
        const t = (state.positionMi - terrain[i].distanceMi) / (terrain[i+1].distanceMi - terrain[i].distanceMi);
        carEl = terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        const dEl = terrain[i+1].elevationFt - terrain[i].elevationFt;
        const dMi = terrain[i+1].distanceMi  - terrain[i].distanceMi;
        grade = dMi > 0 ? dEl / (dMi * 5280) : 0;
        break;
      }
    }

    const carY = elToY(carEl) - 10;
    const tilt = Math.atan(grade) * 0.6;

    ctx.save();
    ctx.translate(carScreenX, carY);
    ctx.rotate(-tilt);

    // Body
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-18, -10, 36, 10, 3);
    ctx.fill();

    // Cabin / roof
    ctx.fillStyle = '#88ccff44';
    ctx.beginPath();
    ctx.roundRect(-10, -18, 20, 8, 2);
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#222';
    for (const wx of [-10, 10]) {
      ctx.beginPath();
      ctx.arc(wx, 1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Regen glow
    if (state.currentKw < -0.5) {
      ctx.shadowColor = '#3fb950';
      ctx.shadowBlur  = 14;
      ctx.fillStyle   = '#3fb95035';
      ctx.beginPath();
      ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // ── Progress bar ──────────────────────────────────────────────────────
    const prog = Math.min(1, state.positionMi / distTotal);
    ctx.fillStyle = '#21262d';
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = '#58a6ff';
    ctx.fillRect(0, 0, W * prog, 4);

    ctx.fillStyle = '#e6edf3cc';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.positionMi.toFixed(1)} / ${distTotal} mi`, 6, 16);

  }, [state]);

  return (
    <div className="canvas-wrap">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="game-canvas"
      />
    </div>
  );
}
