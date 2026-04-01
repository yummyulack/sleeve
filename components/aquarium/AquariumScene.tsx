// @ts-nocheck
'use client'

import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import type { PriceMap } from '@/types'

import type { Asset } from '@/types'

interface Props {
  prices: PriceMap
  assets?: Asset[]
}

export function AquariumScene({ prices, assets }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const pricesRef = useRef<PriceMap>(prices)
  const assetsRef = useRef<Asset[]>(assets ?? [])
  const fishesRef = useRef<unknown[]>([])

  // Sync pricesRef and update fish labels whenever prices change
  useEffect(() => {
    pricesRef.current = prices
    for (const f of fishesRef.current as any[]) {
      f.updatePrice(pricesRef.current, assetsRef.current)
    }
  }, [prices])

  // Sync assetsRef and update fish balance labels whenever assets change
  useEffect(() => {
    assetsRef.current = assets ?? []
    for (const f of fishesRef.current as any[]) {
      f.updatePrice(pricesRef.current, assetsRef.current)
    }
  }, [assets])

  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    // Inject panel CSS
    const style = document.createElement('style');
    style.textContent = `* { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a1a; }
  canvas { display: block; }
  @keyframes cq-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
  @keyframes cq-glow { 0%,100% { box-shadow: 0 0 12px rgba(29,158,117,0.2); } 50% { box-shadow: 0 0 20px rgba(29,158,117,0.45); } }
  .cq-panel { position:fixed; bottom:16px; right:16px; width:340px; z-index:3000; font-family:'IBM Plex Sans',sans-serif; transition: width 0.35s cubic-bezier(0.22,1,0.36,1); }
  .cq-panel.collapsed { width:220px; }
  .cq-header { background:rgba(5,20,30,0.7); border:1px solid rgba(100,200,180,0.15); border-radius:12px 12px 0 0; padding:10px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); user-select:none; transition:all 0.3s; }
  .cq-panel.collapsed .cq-header { border-radius:12px; }
  .cq-body { overflow:hidden; transition: max-height 0.4s cubic-bezier(0.22,1,0.36,1); max-height:420px; }
  .cq-panel.collapsed .cq-body { max-height:0; }
  .cq-body-inner { background:rgba(5,20,30,0.65); border-left:1px solid rgba(100,200,180,0.1); border-right:1px solid rgba(100,200,180,0.1); border-bottom:1px solid rgba(100,200,180,0.15); border-radius:0 0 12px 12px; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); box-shadow:0 8px 40px rgba(0,0,0,0.4); display:flex; flex-direction:column; max-height:380px; }
  .cq-content { flex:1; overflow-y:auto; overscroll-behavior:contain; padding:12px 14px; scrollbar-width:thin; scrollbar-color:rgba(29,158,117,0.3) transparent; -webkit-overflow-scrolling:touch; }
  .cq-tabs { display:flex; border-top:1px solid rgba(100,200,180,0.1); }
  .cq-tab { flex:1; padding:10px 0; background:transparent; border:none; border-top:2px solid transparent; cursor:pointer; font-family:'Share Tech Mono',monospace; font-size:10px; letter-spacing:1.5px; color:rgba(255,248,240,0.3); transition:all 0.2s; }
  .cq-tab:hover { color:rgba(255,248,240,0.55); }
  .cq-tab.active { color:#1d9e75; border-top-color:#1d9e75; }
  .cq-card { background:rgba(8,28,40,0.4); border:1px solid rgba(100,200,180,0.1); border-radius:10px; padding:14px; margin-bottom:10px; }
  .cq-btn { width:100%; padding:10px 0; background:rgba(29,158,117,0.1); border:1px solid rgba(29,158,117,0.35); border-radius:8px; color:#1d9e75; font-family:'Share Tech Mono',monospace; font-size:12px; letter-spacing:1px; cursor:pointer; transition:all 0.2s; animation: cq-glow 2.5s ease infinite; }
  .cq-btn:hover { background:rgba(29,158,117,0.22); }
  .cq-btn.purple { color:#a855f7; border-color:rgba(168,85,247,0.35); background:rgba(168,85,247,0.1); animation:none; box-shadow:0 0 12px rgba(168,85,247,0.15); }
  .cq-btn.purple:hover { background:rgba(168,85,247,0.22); }
  .cq-reel { width:68px; height:76px; display:flex; align-items:center; justify-content:center; background:rgba(5,20,30,0.55); border:1px solid rgba(100,200,180,0.15); border-radius:10px; font-size:32px; transition:all 0.3s; }
  .cq-reel.locked { border-color:#1d9e75; box-shadow:0 0 12px rgba(29,158,117,0.35); }

  /* ââ Top header bar ââ */`;
    document.head.appendChild(style);

    (async () => {
  const app = new PIXI.Application({
    resizeTo: window,
    backgroundColor: 0x0a0a1a,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  containerRef.current!.appendChild(app.view as HTMLCanvasElement);

  const rand  = (a, b) => Math.random() * (b - a) + a;
  const irand = (a, b) => Math.floor(rand(a, b));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick  = arr => arr[irand(0, arr.length)];
  const hexI  = (r, g, b) => (r << 16) | (g << 8) | b;

  const SEABED_FRAC = 0.15;

  function getFloorY(x, h) {
    const base = h * (1 - SEABED_FRAC);
    return base + Math.sin(x * 0.012) * 8 + Math.sin(x * 0.031) * 4 + Math.sin(x * 0.007) * 6;
  }

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  GRADIENT BACKGROUND
  // âââââââââââââââââââââââââââââââââââââââââââ
  function buildGradientTexture(h) {
    const c = document.createElement('canvas');
    c.width = 1; c.height = Math.max(h, 2);
    const ctx = c.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 0, c.height);
    grd.addColorStop(0, '#0a0a1a'); grd.addColorStop(1, '#0d2b3e');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 1, c.height);
    return PIXI.Texture.from(c);
  }

  let bgSprite = new PIXI.Sprite(buildGradientTexture(app.screen.height));
  bgSprite.width = app.screen.width; bgSprite.height = app.screen.height;
  app.stage.addChild(bgSprite);

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  SPOTLIGHT CONES
  // âââââââââââââââââââââââââââââââââââââââââââ
  const spotlightContainer = new PIXI.Container();
  spotlightContainer.blendMode = PIXI.BLEND_MODES.ADD;
  app.stage.addChild(spotlightContainer);

  const spotlightDefs = [
    { xFrac:.12, topWidth:60,  botWidth:280, alpha:.07, swayAmp:25, swaySpeed:.006,  phase:0,   color:0xb0d8ef },
    { xFrac:.42, topWidth:80,  botWidth:350, alpha:.09, swayAmp:18, swaySpeed:.004,  phase:1.8, color:0xd0eaf7 },
    { xFrac:.68, topWidth:50,  botWidth:240, alpha:.06, swayAmp:30, swaySpeed:.0075, phase:3.5, color:0x8ec8e0 },
    { xFrac:.88, topWidth:70,  botWidth:300, alpha:.08, swayAmp:22, swaySpeed:.005,  phase:5.1, color:0xc4e2f2 },
  ];

  function buildSpotlightTexture(topW, botW, height, color, alpha) {
    const c = document.createElement('canvas');
    const w = Math.max(topW, botW) + 60;
    c.width = w; c.height = height;
    const ctx = c.getContext('2d'); const cx = w / 2;
    const rr = (color >> 16) & 0xff, gg = (color >> 8) & 0xff, bb = color & 0xff;
    for (let i = 0; i < 140; i++) {
      const t = i / 140, tN = (i + 1) / 140;
      const y0 = t * height, y1 = tN * height;
      const hW0 = lerp(topW / 2, botW / 2, t), hW1 = lerp(topW / 2, botW / 2, tN);
      const aF = t < .05 ? t / .05 : t < .60 ? 1 : Math.max(0, 1 - (t - .60) / .18);
      const a = alpha * aF;
      const grad = ctx.createLinearGradient(cx - hW0 - 10, 0, cx + hW0 + 10, 0);
      grad.addColorStop(0,`rgba(${rr},${gg},${bb},0)`);
      grad.addColorStop(.12,`rgba(${rr},${gg},${bb},${(a*.35).toFixed(4)})`);
      grad.addColorStop(.3,`rgba(${rr},${gg},${bb},${(a*.8).toFixed(4)})`);
      grad.addColorStop(.5,`rgba(${rr},${gg},${bb},${a.toFixed(4)})`);
      grad.addColorStop(.7,`rgba(${rr},${gg},${bb},${(a*.8).toFixed(4)})`);
      grad.addColorStop(.88,`rgba(${rr},${gg},${bb},${(a*.35).toFixed(4)})`);
      grad.addColorStop(1,`rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = grad; ctx.beginPath();
      ctx.moveTo(cx-hW0,y0); ctx.lineTo(cx+hW0,y0);
      ctx.lineTo(cx+hW1,y1); ctx.lineTo(cx-hW1,y1);
      ctx.closePath(); ctx.fill();
    }
    return PIXI.Texture.from(c);
  }

  const spotlights = [];
  function createSpotlights() {
    spotlightContainer.removeChildren(); spotlights.length = 0;
    const w = app.screen.width, h = app.screen.height, beamH = h * .72;
    for (const def of spotlightDefs) {
      const tex = buildSpotlightTexture(def.topWidth, def.botWidth, beamH, def.color, def.alpha);
      const sp = new PIXI.Sprite(tex); sp.anchor.set(.5, 0);
      sp.x = def.xFrac * w; sp.y = 0;
      spotlightContainer.addChild(sp);
      spotlights.push({ sprite: sp, def, baseX: def.xFrac * w, beamH });
    }
  }
  createSpotlights();

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  SEABED â WARM SAND
  // âââââââââââââââââââââââââââââââââââââââââââ
  const seabedContainer = new PIXI.Container();
  app.stage.addChild(seabedContainer);

  function buildSandTexture(w, h) {
    const floorY = h * (1 - SEABED_FRAC);
    const sandH = h - floorY + 20;
    const c = document.createElement('canvas');
    c.width = w; c.height = sandH;
    const ctx = c.getContext('2d');

    // base gradient: warm beige to tan
    const grd = ctx.createLinearGradient(0, 0, 0, sandH);
    grd.addColorStop(0, '#c2a66b');
    grd.addColorStop(0.3, '#bfa264');
    grd.addColorStop(0.7, '#d4b97a');
    grd.addColorStop(1, '#c8a96e');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, sandH);

    // grain noise
    const imgData = ctx.getImageData(0, 0, w, sandH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 28;
      d[i]     = clamp(d[i] + noise, 0, 255);
      d[i + 1] = clamp(d[i + 1] + noise * 0.9, 0, 255);
      d[i + 2] = clamp(d[i + 2] + noise * 0.7, 0, 255);
    }
    ctx.putImageData(imgData, 0, 0);

    // ripple lines â darker wavy horizontal bands
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#8a7040';
    ctx.lineWidth = 1.5;
    const rippleCount = irand(8, 14);
    for (let r = 0; r < rippleCount; r++) {
      const ry = rand(8, sandH - 5);
      const amp = rand(1.5, 4);
      const freq = rand(0.015, 0.04);
      const ph = rand(0, Math.PI * 2);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = ry + Math.sin(x * freq + ph) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // second pass: subtler lighter ripples
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#e0cfa0';
    ctx.lineWidth = 1;
    for (let r = 0; r < 6; r++) {
      const ry = rand(5, sandH - 5);
      const amp = rand(1, 3);
      const freq = rand(0.02, 0.05);
      const ph = rand(0, Math.PI * 2);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = ry + Math.sin(x * freq + ph) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // soft shadow gradient along top edge â dark ocean fading into sand
    const shadowH = sandH * 0.35;
    const shadowGrd = ctx.createLinearGradient(0, 0, 0, shadowH);
    shadowGrd.addColorStop(0, 'rgba(10,20,30,0.85)');
    shadowGrd.addColorStop(0.25, 'rgba(12,30,45,0.55)');
    shadowGrd.addColorStop(0.55, 'rgba(14,35,50,0.25)');
    shadowGrd.addColorStop(1, 'rgba(16,40,55,0)');
    ctx.fillStyle = shadowGrd;
    ctx.fillRect(0, 0, w, shadowH);

    return { texture: PIXI.Texture.from(c), floorY, sandH };
  }

  function buildSeabedGround(w, h) {
    const g = new PIXI.Graphics();
    const floorY = h * (1 - SEABED_FRAC);

    // dark water cover above the undulating edge
    g.beginFill(0x0d2b3e, 1);
    g.drawRect(0, floorY - 20, w, 40);
    g.endFill();

    // undulating top edge mask â draw dark water over the sand top to create organic line
    g.beginFill(0x0d2b3e, 1);
    g.moveTo(0, floorY - 20);
    g.lineTo(w, floorY - 20);
    g.lineTo(w, floorY + 20);
    for (let x = w; x >= 0; x -= 4) {
      const bump = Math.sin(x * 0.012) * 8 + Math.sin(x * 0.031) * 4 + Math.sin(x * 0.007) * 6;
      g.lineTo(x, floorY + bump);
    }
    g.closePath(); g.endFill();

    return g;
  }

  let sandData = buildSandTexture(app.screen.width, app.screen.height);
  let sandSprite = new PIXI.Sprite(sandData.texture);
  sandSprite.x = 0;
  sandSprite.y = sandData.floorY - 20;
  seabedContainer.addChild(sandSprite);

  let seabedEdge = buildSeabedGround(app.screen.width, app.screen.height);
  seabedContainer.addChild(seabedEdge);

  // ââ ROCKS ââ
  function drawRock(g, cx, baseY, size) {
    const colors = [0x7a7060, 0x6b6355, 0x8a8070, 0x5e5648, 0x6d6558];
    g.beginFill(pick(colors), rand(0.7, 0.9));
    const pts = [], n = irand(6, 10);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const r = size * rand(0.6, 1.0);
      const squish = (Math.sin(ang) < 0) ? 0.7 : 1.0;
      pts.push({ x: cx + Math.cos(ang) * r, y: baseY - Math.abs(Math.sin(ang)) * r * squish });
    }
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i <= pts.length; i++) {
      const p = pts[i % pts.length], pp = pts[(i + 1) % pts.length];
      g.quadraticCurveTo(p.x, p.y, (p.x + pp.x) / 2, (p.y + pp.y) / 2);
    }
    g.endFill();
    g.beginFill(0xffffff, 0.08);
    g.drawEllipse(cx - size * 0.15, baseY - size * 0.5, size * 0.3, size * 0.2);
    g.endFill();
  }

  // ââ CORAL ââ
  function drawCoralBranch(g, x, y, angle, len, thickness, depth, color) {
    if (depth <= 0 || len < 3) return;
    const ex = x + Math.cos(angle) * len, ey = y + Math.sin(angle) * len;
    g.lineStyle(thickness, color, rand(0.6, 0.85));
    g.moveTo(x, y); g.lineTo(ex, ey);
    if (depth <= 1) { g.lineStyle(0); g.beginFill(color, 0.7); g.drawCircle(ex, ey, thickness * rand(0.8, 1.5)); g.endFill(); }
    const spread = rand(0.3, 0.7);
    drawCoralBranch(g, ex, ey, angle - spread, len * rand(0.55, 0.75), thickness * 0.7, depth - 1, color);
    drawCoralBranch(g, ex, ey, angle + spread, len * rand(0.55, 0.75), thickness * 0.7, depth - 1, color);
  }
  function drawCoral(g, cx, baseY) {
    const colors = [0xe8756a, 0xf09070, 0xd45d72, 0xf4a06b, 0xcc5577, 0xff8866];
    const color = pick(colors), branches = irand(2, 4);
    for (let i = 0; i < branches; i++)
      drawCoralBranch(g, cx + rand(-4, 4), baseY, -Math.PI / 2 + rand(-0.5, 0.5), rand(18, 40), rand(2.5, 4.5), irand(3, 5), color);
  }

  // ââ MUSHROOM PLANTS ââ
  function drawMushroom(g, cx, baseY) {
    const col = pick([0xd4a0d4, 0xa0d4c8, 0xd4c8a0, 0xa0bcd4, 0xd4a0b0, 0xb8d4a0]);
    const stemH = rand(10, 22), stemW = rand(2, 4), capR = rand(6, 14), capH = capR * rand(0.5, 0.7);
    g.beginFill(col, 0.5); g.drawRect(cx - stemW / 2, baseY - stemH, stemW, stemH); g.endFill();
    g.beginFill(col, 0.6); g.drawEllipse(cx, baseY - stemH - capH * 0.3, capR, capH); g.endFill();
    g.beginFill(0xffffff, 0.12); g.drawEllipse(cx - capR * 0.2, baseY - stemH - capH * 0.5, capR * 0.35, capH * 0.3); g.endFill();
  }

  // ââ SEAWEED ââ
  const seaweedDefs = [];
  function generateSeaweedDefs(w, h) {
    seaweedDefs.length = 0;
    const count = Math.max(8, Math.floor(w / 80));
    const greens = [0x1a6b3a, 0x22804a, 0x2d9958, 0x188040, 0x2a7048, 0x35a060];
    for (let i = 0; i < count; i++) {
      const x = rand(20, w - 20);
      seaweedDefs.push({ x, baseY: getFloorY(x, h), segments: irand(5, 9), segLen: rand(10, 18),
        width: rand(4, 9), color: pick(greens), alpha: rand(0.5, 0.8),
        swaySpeed: rand(0.008, 0.02), swayAmp: rand(4, 12), phase: rand(0, Math.PI * 2) });
    }
  }

  const seaweedGfx = new PIXI.Graphics();
  seabedContainer.addChild(seaweedGfx);

  function drawSeaweedFrame(elapsed) {
    seaweedGfx.clear();
    for (const sw of seaweedDefs) {
      seaweedGfx.lineStyle(sw.width, sw.color, sw.alpha);
      let px = sw.x, py = sw.baseY;
      seaweedGfx.moveTo(px, py);
      for (let s = 1; s <= sw.segments; s++) {
        const t = s / sw.segments;
        const sway = Math.sin(elapsed * sw.swaySpeed + sw.phase + s * 0.6) * sw.swayAmp * t;
        const nx = sw.x + sway, ny = py - sw.segLen;
        seaweedGfx.quadraticCurveTo((px + nx) / 2 + sway * 0.5, (py + ny) / 2, nx, ny);
        px = nx; py = ny;
      }
      seaweedGfx.lineStyle(0);
      seaweedGfx.beginFill(sw.color, sw.alpha * 0.7);
      seaweedGfx.drawEllipse(px, py - 3, sw.width * 0.6, 4);
      seaweedGfx.endFill();
    }
  }

  // ââ STATIC DECORATIONS ââ
  const staticDecoGfx = new PIXI.Graphics();
  seabedContainer.addChild(staticDecoGfx);

  function generateStaticDecorations(w, h) {
    staticDecoGfx.clear();
    for (let i = 0; i < irand(8, 15); i++) { const x = rand(10, w - 10); drawRock(staticDecoGfx, x, getFloorY(x, h) + rand(-2, 4), rand(8, 24)); }
    for (let i = 0; i < irand(6, 11); i++) { const x = rand(30, w - 30); drawCoral(staticDecoGfx, x, getFloorY(x, h) - rand(0, 4)); }
    for (let i = 0; i < irand(6, 11); i++) { const x = rand(20, w - 20); drawMushroom(staticDecoGfx, x, getFloorY(x, h) - rand(0, 2)); }
    for (let i = 0; i < 40; i++) {
      const x = rand(0, w), fy = getFloorY(x, h);
      staticDecoGfx.beginFill(pick([0x9a8a60, 0xb09870, 0x8a7a55]), rand(0.2, 0.45));
      staticDecoGfx.drawEllipse(x, fy + rand(2, 10), rand(1.5, 4), rand(1, 2.5));
      staticDecoGfx.endFill();
    }
  }

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  CRABS
  // âââââââââââââââââââââââââââââââââââââââââââ
  const crabContainer = new PIXI.Container();
  seabedContainer.addChild(crabContainer);

  const CRAB_COUNT = irand(3, 6);
  const crabs = [];

  function buildCrabTexture(bodyW, bodyH, color, clawColor) {
    // draw to a canvas for the base crab (body + legs + eyes)
    // claws are separate sprites so we can animate them
    const cW = bodyW * 3.2, cH = bodyH * 3;
    const c = document.createElement('canvas');
    c.width = cW; c.height = cH;
    const ctx = c.getContext('2d');
    const cx = cW / 2, cy = cH * 0.65;

    const rr = (color >> 16) & 0xff, gg = (color >> 8) & 0xff, bb = color & 0xff;
    const cRR = (clawColor >> 16) & 0xff, cGG = (clawColor >> 8) & 0xff, cBB = clawColor & 0xff;

    // legs (3 per side)
    ctx.strokeStyle = `rgb(${rr - 20},${gg - 15},${bb - 10})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const lx = cx + side * (bodyW * 0.25 + i * bodyW * 0.15);
        const ly = cy + bodyH * 0.1;
        const ex = lx + side * (bodyW * 0.3 + i * 2);
        const ey = ly + bodyH * 0.5 + i * 2;
        ctx.beginPath(); ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(lx + side * bodyW * 0.2, ly + bodyH * 0.15, ex, ey);
        ctx.stroke();
      }
    }

    // body
    const grad = ctx.createRadialGradient(cx - bodyW * 0.1, cy - bodyH * 0.15, 0, cx, cy, bodyW * 0.6);
    grad.addColorStop(0, `rgb(${Math.min(255, rr + 40)},${Math.min(255, gg + 30)},${Math.min(255, bb + 20)})`);
    grad.addColorStop(1, `rgb(${rr},${gg},${bb})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, bodyW * 0.48, bodyH * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // shell texture dots
    ctx.fillStyle = `rgba(${Math.max(0, rr - 30)},${Math.max(0, gg - 25)},${Math.max(0, bb - 15)},0.25)`;
    for (let i = 0; i < 6; i++) {
      const dx = rand(-bodyW * 0.3, bodyW * 0.3), dy = rand(-bodyH * 0.25, bodyH * 0.15);
      ctx.beginPath(); ctx.arc(cx + dx, cy + dy, rand(1.5, 3), 0, Math.PI * 2); ctx.fill();
    }

    // eye stalks
    const eyeSpread = bodyW * 0.2;
    for (let side = -1; side <= 1; side += 2) {
      const ex = cx + side * eyeSpread;
      const stalkTop = cy - bodyH * 0.5;
      ctx.strokeStyle = `rgb(${rr},${gg},${bb})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ex, cy - bodyH * 0.3); ctx.lineTo(ex, stalkTop); ctx.stroke();
      // eye ball
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(ex, stalkTop, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex + side * 0.8, stalkTop - 0.8, 1.2, 0, Math.PI * 2); ctx.fill();
    }

    return { bodyTex: PIXI.Texture.from(c), cx, cy, cW, cH };
  }

  function buildClawTexture(size, color, mirrored) {
    const c = document.createElement('canvas');
    const cW = size * 2.5, cH = size * 2;
    c.width = cW; c.height = cH;
    const ctx = c.getContext('2d');
    const rr = (color >> 16) & 0xff, gg = (color >> 8) & 0xff, bb = color & 0xff;
    const dir = mirrored ? -1 : 1;
    const cx = mirrored ? cW * 0.3 : cW * 0.7;
    const cy = cH * 0.6;

    // arm
    ctx.strokeStyle = `rgb(${rr},${gg},${bb})`;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dir * size * 0.5, cy - size * 0.3);
    ctx.stroke();

    // claw pincer â two arcs
    const px = cx + dir * size * 0.5, py = cy - size * 0.3;
    // top pincer
    ctx.fillStyle = `rgb(${Math.min(255, rr + 20)},${Math.min(255, gg + 15)},${Math.min(255, bb + 10)})`;
    ctx.beginPath();
    ctx.ellipse(px + dir * size * 0.3, py - size * 0.12, size * 0.35, size * 0.14, dir * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // bottom pincer
    ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
    ctx.beginPath();
    ctx.ellipse(px + dir * size * 0.28, py + size * 0.1, size * 0.3, size * 0.12, dir * -0.15, 0, Math.PI * 2);
    ctx.fill();

    return { tex: PIXI.Texture.from(c), cW, cH, anchorX: mirrored ? 0.3 : 0.7, anchorY: 0.6 };
  }

  function createCrab(screenW, screenH) {
    const bodyW = rand(22, 34), bodyH = bodyW * rand(0.6, 0.75);
    const colors = [0xc04420, 0xd05530, 0xb83818, 0xcc4e28, 0xd4602a];
    const color = pick(colors);
    const clawColor = hexI(
      Math.min(255, ((color >> 16) & 0xff) + 15),
      Math.min(255, ((color >> 8) & 0xff) + 10),
      Math.min(255, (color & 0xff) + 8)
    );

    const { bodyTex, cx: bcx, cy: bcy, cW, cH } = buildCrabTexture(bodyW, bodyH, color, clawColor);
    const leftClaw = buildClawTexture(bodyW * 0.45, clawColor, true);
    const rightClaw = buildClawTexture(bodyW * 0.45, clawColor, false);

    const container = new PIXI.Container();

    const leftClawSprite = new PIXI.Sprite(leftClaw.tex);
    leftClawSprite.anchor.set(leftClaw.anchorX, leftClaw.anchorY);
    leftClawSprite.x = -bodyW * 0.42;
    leftClawSprite.y = -bodyH * 0.1;

    const rightClawSprite = new PIXI.Sprite(rightClaw.tex);
    rightClawSprite.anchor.set(rightClaw.anchorX, rightClaw.anchorY);
    rightClawSprite.x = bodyW * 0.42;
    rightClawSprite.y = -bodyH * 0.1;

    const bodySprite = new PIXI.Sprite(bodyTex);
    bodySprite.anchor.set(bcx / cW, bcy / cH);

    container.addChild(leftClawSprite);
    container.addChild(rightClawSprite);
    container.addChild(bodySprite);

    const posX = rand(60, screenW - 60);
    container.x = posX;
    container.y = getFloorY(posX, screenH) - 2;
    container.scale.set(rand(0.7, 1.1));
    if (Math.random() > 0.5) container.scale.x *= -1;

    crabContainer.addChild(container);

    return {
      container,
      bodySprite,
      leftClaw: leftClawSprite,
      rightClaw: rightClawSprite,
      bodyW, bodyH,
      // behaviour state
      state: 'idle',           // idle | scuttle | snap
      stateTimer: rand(90, 400),  // wide stagger so crabs don't sync
      scuttleDir: 0,
      scuttleSpeed: 0,
      scuttleDist: 0,
      scuttled: 0,
      snapClaw: null,          // 'left' | 'right'
      snapTimer: 0,
      snapPhase: 0,
      walkBob: rand(0, Math.PI * 2),
      legPhase: 0,             // alternating leg cycle
      restY: 0,                // snapped floor Y at rest
    };
  }

  function initCrabs() {
    crabContainer.removeChildren();
    crabs.length = 0;
    for (let i = 0; i < CRAB_COUNT; i++)
      crabs.push(createCrab(app.screen.width, app.screen.height));
  }
  initCrabs();

  function updateCrabs(delta) {
    const w = app.screen.width, h = app.screen.height;
    for (const cr of crabs) {
      cr.stateTimer -= delta;

      if (cr.state === 'idle') {
        // subtle breathing â gentle claw drift and tiny body sway
        const breathe = Math.sin(elapsed * 0.008 + cr.walkBob) * 0.04;
        cr.leftClaw.rotation = breathe;
        cr.rightClaw.rotation = -breathe;
        cr.bodySprite.rotation = Math.sin(elapsed * 0.005 + cr.walkBob) * 0.008;

        // settle onto floor
        const targetY = getFloorY(cr.container.x, h) - 2;
        cr.container.y += (targetY - cr.container.y) * 0.08;

        if (cr.stateTimer <= 0) {
          const roll = Math.random();
          if (roll < 0.30) {
            // snap claw
            cr.state = 'snap';
            cr.snapClaw = Math.random() > 0.5 ? 'left' : 'right';
            cr.snapTimer = rand(30, 55);
            cr.snapPhase = 0;
            cr.stateTimer = cr.snapTimer;
          } else {
            // scuttle
            cr.state = 'scuttle';
            cr.scuttleDir = Math.random() > 0.5 ? 1 : -1;
            cr.scuttleSpeed = rand(1.2, 3.0);
            cr.scuttleDist = rand(30, 120);
            cr.scuttled = 0;
            cr.legPhase = 0;
            cr.stateTimer = cr.scuttleDist / cr.scuttleSpeed + 15;
          }
        }
      } else if (cr.state === 'scuttle') {
        // acceleration / deceleration easing
        const totalDist = cr.scuttleDist;
        const progress = cr.scuttled / totalDist;
        const ease = progress < 0.15 ? progress / 0.15
                   : progress > 0.8  ? (1 - progress) / 0.2
                   : 1;
        const speed = cr.scuttleSpeed * clamp(ease, 0.2, 1);
        const move = speed * delta;
        cr.container.x += cr.scuttleDir * move;
        cr.scuttled += move;

        // leg cycle â drives body bob and claw alternation
        cr.legPhase += speed * 0.25 * delta;

        // body vertical bob â two-step per cycle (each leg pair lands)
        const bobY = Math.abs(Math.sin(cr.legPhase * 2)) * 2.2;
        const floorTarget = getFloorY(cr.container.x, h) - 2;
        cr.container.y = floorTarget - bobY;

        // body lateral tilt â rocks side to side with each step
        cr.bodySprite.rotation = Math.sin(cr.legPhase * 2) * 0.06;

        // alternating claw swing â left and right offset by half cycle
        cr.leftClaw.rotation = Math.sin(cr.legPhase * 2) * 0.18;
        cr.rightClaw.rotation = Math.sin(cr.legPhase * 2 + Math.PI) * 0.18;

        // claw vertical bob mirrors body but opposite phase per side
        cr.leftClaw.y = -cr.bodyH * 0.1 + Math.sin(cr.legPhase * 2) * 1.2;
        cr.rightClaw.y = -cr.bodyH * 0.1 + Math.sin(cr.legPhase * 2 + Math.PI) * 1.2;

        // flip to face direction
        const absS = Math.abs(cr.container.scale.x);
        cr.container.scale.x = cr.scuttleDir > 0 ? absS : -absS;

        // boundary
        cr.container.x = clamp(cr.container.x, 30, w - 30);

        if (cr.scuttled >= cr.scuttleDist || cr.stateTimer <= 0) {
          cr.state = 'idle';
          cr.stateTimer = rand(120, 450);  // wide random wait
          cr.container.y = getFloorY(cr.container.x, h) - 2;
          cr.bodySprite.rotation = 0;
          cr.leftClaw.y = -cr.bodyH * 0.1;
          cr.rightClaw.y = -cr.bodyH * 0.1;
        }
      } else if (cr.state === 'snap') {
        cr.snapPhase += delta;
        const t = clamp(cr.snapPhase / cr.snapTimer, 0, 1);

        // raise phase then rapid snaps
        const lift = Math.sin(t * Math.PI) * 0.55;
        const snaps = t > 0.45 ? Math.sin((t - 0.45) / 0.55 * Math.PI * 6) * 0.25 : 0;

        // subtle body lean toward snapping claw
        const leanDir = cr.snapClaw === 'left' ? -1 : 1;
        cr.bodySprite.rotation = lift * 0.04 * leanDir;

        if (cr.snapClaw === 'left') {
          cr.leftClaw.rotation = -lift + snaps;
          cr.leftClaw.y = -cr.bodyH * 0.1 - lift * 10;
          cr.rightClaw.rotation = Math.sin(elapsed * 0.008) * 0.04;
          cr.rightClaw.y = -cr.bodyH * 0.1;
        } else {
          cr.rightClaw.rotation = lift - snaps;
          cr.rightClaw.y = -cr.bodyH * 0.1 - lift * 10;
          cr.leftClaw.rotation = -Math.sin(elapsed * 0.008) * 0.04;
          cr.leftClaw.y = -cr.bodyH * 0.1;
        }

        if (cr.stateTimer <= 0) {
          cr.state = 'idle';
          cr.stateTimer = rand(100, 380);
          cr.leftClaw.y = -cr.bodyH * 0.1;
          cr.rightClaw.y = -cr.bodyH * 0.1;
          cr.leftClaw.rotation = 0;
          cr.rightClaw.rotation = 0;
          cr.bodySprite.rotation = 0;
        }
      }
    }
  }

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  REBUILD SEABED
  // âââââââââââââââââââââââââââââââââââââââââââ
  function rebuildSeabed() {
    const w = app.screen.width, h = app.screen.height;
    // sand texture
    sandSprite.texture.destroy(true);
    sandData = buildSandTexture(w, h);
    sandSprite.texture = sandData.texture;
    sandSprite.x = 0; sandSprite.y = sandData.floorY - 20;
    // edge
    seabedContainer.removeChild(seabedEdge);
    seabedEdge.destroy();
    seabedEdge = buildSeabedGround(w, h);
    seabedContainer.addChildAt(seabedEdge, 1);
    // decorations
    generateSeaweedDefs(w, h);
    generateStaticDecorations(w, h);
    initCrabs();
  }

  // initial decoration build
  generateSeaweedDefs(app.screen.width, app.screen.height);
  generateStaticDecorations(app.screen.width, app.screen.height);

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  BUBBLE GLOW TEXTURES
  // âââââââââââââââââââââââââââââââââââââââââââ
  function makeBubbleTexture(radius) {
    const pad = radius * 3.5, size = (radius + pad) * 2;
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const ctx = c.getContext('2d'); const cx = size / 2, cy = size / 2;
    const glow = ctx.createRadialGradient(cx, cy, radius * .4, cx, cy, radius + pad * .65);
    glow.addColorStop(0, 'rgba(180,225,255,0.22)'); glow.addColorStop(.35, 'rgba(140,210,255,0.09)'); glow.addColorStop(1, 'rgba(100,180,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, size, size);
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    const inner = ctx.createRadialGradient(cx - radius * .3, cy - radius * .3, 0, cx, cy, radius);
    inner.addColorStop(0, 'rgba(255,255,255,0.25)'); inner.addColorStop(.5, 'rgba(200,235,255,0.1)'); inner.addColorStop(1, 'rgba(150,200,255,0.02)');
    ctx.fillStyle = inner; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - radius * .28, cy - radius * .28, radius * .35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    return PIXI.Texture.from(c);
  }

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  BUBBLE LAYER
  // âââââââââââââââââââââââââââââââââââââââââââ
  const bubbleContainer = new PIXI.Container();
  bubbleContainer.blendMode = PIXI.BLEND_MODES.ADD;
  app.stage.addChild(bubbleContainer);

  const BUBBLE_COUNT = irand(58, 76);
  const bubbleTextures = [makeBubbleTexture(4), makeBubbleTexture(4), makeBubbleTexture(7), makeBubbleTexture(7), makeBubbleTexture(11)];
  const bubbles = [];

  function initBubble(b, resetY) {
    const w = app.screen.width, h = app.screen.height;
    b.x = rand(0, w);
    b.y = resetY ? h * (1 - SEABED_FRAC) + rand(-10, 0) : rand(0, h * (1 - SEABED_FRAC));
    b._speed = rand(.3, 1.4); b._drift = rand(-.15, .15);
    b._wobbleAmp = rand(.3, 1.2); b._wobbleSpd = rand(.008, .025);
    b._phase = rand(0, Math.PI * 2);
    b._baseAlpha = rand(.4, .7); b.alpha = b._baseAlpha;
    if (!b._origScale) b._origScale = b.scale.x;
  }

  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const sp = new PIXI.Sprite(pick(bubbleTextures));
    sp.anchor.set(.5); sp._origScale = rand(.6, 1.6); sp.scale.set(sp._origScale);
    initBubble(sp, false); bubbles.push(sp); bubbleContainer.addChild(sp);
  }

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  SINE-WAVE CURRENTS
  // âââââââââââââââââââââââââââââââââââââââââââ
  const waveContainer = new PIXI.Container();
  app.stage.addChild(waveContainer);
  const waveLines = [];
  for (let i = 0; i < 3; i++) {
    const g = new PIXI.Graphics(); waveContainer.addChild(g);
    waveLines.push({ gfx: g, yBase: rand(.2, .75), amplitude: rand(18, 45),
      frequency: rand(.003, .006), speed: rand(.0004, .0012) * (Math.random() > .5 ? 1 : -1),
      phase: rand(0, Math.PI * 2), color: [0x3a8fb7, 0x2d7a9c, 0x1b5e7d][i],
      alpha: rand(.06, .12), thickness: rand(1, 2.5) });
  }

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  DUST / PLANKTON
  // âââââââââââââââââââââââââââââââââââââââââââ
  const dustContainer = new PIXI.Container();
  app.stage.addChild(dustContainer);
  const dustList = [];
  const dustTex = (() => { const g = new PIXI.Graphics(); g.beginFill(0xffffff, .5); g.drawCircle(0, 0, 1.2); g.endFill(); return app.renderer.generateTexture(g); })();
  for (let i = 0; i < 30; i++) {
    const s = new PIXI.Sprite(dustTex); s.anchor.set(.5); s.alpha = rand(.04, .12);
    s.x = rand(0, app.screen.width); s.y = rand(0, app.screen.height);
    s._vx = rand(-.15, .15); s._vy = rand(-.08, .08);
    dustList.push(s); dustContainer.addChild(s);
  }

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  VIGNETTE
  // âââââââââââââââââââââââââââââââââââââââââââ
  const vignetteCanvas = document.createElement('canvas');
  function buildVignette(w, h) {
    vignetteCanvas.width = w; vignetteCanvas.height = h;
    const ctx = vignetteCanvas.getContext('2d');
    const cx = w / 2, cy = h / 2, r = Math.max(w, h) * .7;
    const grd = ctx.createRadialGradient(cx, cy, r * .3, cx, cy, r);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    return PIXI.Texture.from(vignetteCanvas);
  }
  let vignetteSprite = new PIXI.Sprite(buildVignette(app.screen.width, app.screen.height));
  vignetteSprite.width = app.screen.width; vignetteSprite.height = app.screen.height;
  app.stage.addChild(vignetteSprite);

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  CRYPTO FISH â NEON ORB STYLE
  // âââââââââââââââââââââââââââââââââââââââââââ
  const fishContainer = new PIXI.Container();
  app.stage.addChild(fishContainer);

  // coin logo textures â embedded as base64 data URIs
  const logoDataURIs = {
    BTC: 'data:image/jpeg;base64,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',
    ETH: 'data:image/jpeg;base64,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',
    SOL: 'data:image/png;base64,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',
  };

  const logoTextureCache = {};

  function buildLogoTextureFromImage(img, size, colorHex) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size / 2;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const rr = parseInt(colorHex.slice(1,3),16);
    const gg = parseInt(colorHex.slice(3,5),16);
    const bb = parseInt(colorHex.slice(5,7),16);
    const bg = ctx.createRadialGradient(cx - r*0.2, cy - r*0.2, 0, cx, cy, r);
    bg.addColorStop(0, `rgba(${Math.min(255,rr+40)},${Math.min(255,gg+35)},${Math.min(255,bb+30)},1)`);
    bg.addColorStop(1, `rgba(${Math.max(0,rr-30)},${Math.max(0,gg-25)},${Math.max(0,bb-20)},1)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    const imgAspect = img.width / img.height;
    let dw, dh, dx, dy;
    if (imgAspect > 1) {
      dh = size; dw = size * imgAspect;
      dx = (size - dw) / 2; dy = 0;
    } else {
      dw = size; dh = size / imgAspect;
      dx = 0; dy = (size - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);

    return PIXI.Texture.from(c);
  }

  function buildFallbackLogoTexture(type, size, colorHex) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size / 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    const rr = parseInt(colorHex.slice(1,3),16);
    const gg = parseInt(colorHex.slice(3,5),16);
    const bb = parseInt(colorHex.slice(5,7),16);
    const bg = ctx.createRadialGradient(cx - r*0.2, cy - r*0.2, 0, cx, cy, r);
    bg.addColorStop(0, `rgba(${Math.min(255,rr+60)},${Math.min(255,gg+55)},${Math.min(255,bb+50)},1)`);
    bg.addColorStop(1, `rgba(${Math.max(0,rr-30)},${Math.max(0,gg-25)},${Math.max(0,bb-20)},1)`);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `bold ${Math.round(size * 0.58)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(type.slice(0, 1), cx, cy + size * 0.03);
    return PIXI.Texture.from(c);
  }

  async function loadLogoImages() {
    const entries = Object.entries(logoDataURIs);
    const promises = entries.map(([type, dataUri]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ type, img });
        img.onerror = () => { console.error('Failed to load', type); resolve({ type, img: null }); };
        img.src = dataUri;
      });
    });
    const results = await Promise.all(promises);
    for (const { type, img } of results) {
      if (img) logoTextureCache[type] = img;
    }
  }

  function getLogoTexture(type, size, colorHex) {
    const img = logoTextureCache[type];
    if (img) return buildLogoTextureFromImage(img, size, colorHex);
    return buildFallbackLogoTexture(type, size, colorHex);
  }

  // glossy 3D sphere body texture
  function buildGlossySphereTexture(radius, colorHex) {
    const pad = Math.ceil(radius * 0.15);
    const size = (radius + pad) * 2;
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const rr = parseInt(colorHex.slice(1,3),16);
    const gg = parseInt(colorHex.slice(3,5),16);
    const bb = parseInt(colorHex.slice(5,7),16);

    // base sphere â dark rim, bright centre-left
    const base = ctx.createRadialGradient(
      cx - radius * 0.3, cy - radius * 0.25, 0,
      cx, cy, radius
    );
    base.addColorStop(0,   `rgb(${Math.min(255,rr+90)},${Math.min(255,gg+80)},${Math.min(255,bb+70)})`);
    base.addColorStop(0.35,`rgb(${Math.min(255,rr+40)},${Math.min(255,gg+30)},${Math.min(255,bb+25)})`);
    base.addColorStop(0.7, `rgb(${rr},${gg},${bb})`);
    base.addColorStop(1,   `rgb(${Math.max(0,rr-70)},${Math.max(0,gg-60)},${Math.max(0,bb-55)})`);
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

    // specular highlight â bright white spot upper-left
    const spec = ctx.createRadialGradient(
      cx - radius * 0.35, cy - radius * 0.35, 0,
      cx - radius * 0.25, cy - radius * 0.25, radius * 0.55
    );
    spec.addColorStop(0,  'rgba(255,255,255,0.75)');
    spec.addColorStop(0.3,'rgba(255,255,255,0.30)');
    spec.addColorStop(0.7,'rgba(255,255,255,0.05)');
    spec.addColorStop(1,  'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

    // secondary soft highlight (wider, dimmer)
    const spec2 = ctx.createRadialGradient(
      cx - radius * 0.15, cy - radius * 0.4, 0,
      cx, cy, radius * 0.9
    );
    spec2.addColorStop(0,  'rgba(255,255,255,0.18)');
    spec2.addColorStop(0.5,'rgba(255,255,255,0.03)');
    spec2.addColorStop(1,  'rgba(255,255,255,0)');
    ctx.fillStyle = spec2;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

    // bottom rim reflection
    const rim = ctx.createRadialGradient(
      cx + radius * 0.1, cy + radius * 0.55, 0,
      cx, cy + radius * 0.3, radius * 0.7
    );
    rim.addColorStop(0,  `rgba(${Math.min(255,rr+50)},${Math.min(255,gg+45)},${Math.min(255,bb+40)},0.15)`);
    rim.addColorStop(1,  'rgba(255,255,255,0)');
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

    return { tex: PIXI.Texture.from(c), size, radius };
  }

  // neon ring texture (separate â blurred)
  function buildNeonRingTexture(radius) {
    const pad = 12;
    const size = (radius + pad) * 2;
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const cx = size / 2, cy = size / 2;

    // outer glow pass
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(57,255,20,0.6)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2); ctx.stroke();

    // bright core
    ctx.shadowBlur = 4;
    ctx.strokeStyle = 'rgba(57,255,20,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2); ctx.stroke();

    ctx.shadowBlur = 0;
    return { tex: PIXI.Texture.from(c), size };
  }

  class Fish {
    constructor(type, colorHex, colorInt, screenW, screenH, ticker) {
      this.type = type;
      this.colorHex = colorHex;
      this.colorInt = colorInt;
      this.ticker = ticker || type;

      const bodyRadius = rand(48, 68);
      this.bodyRadius = bodyRadius;
      this.container = new PIXI.Container();

      // ââ outer aura glow (brand color, large, very soft) ââ
      const aura = new PIXI.Graphics();
      aura.beginFill(colorInt, 0.18);
      aura.drawCircle(0, 0, bodyRadius * 2.8);
      aura.endFill();
      aura.filters = [new PIXI.BlurFilter(18, 6)];
      this.container.addChild(aura);
      this.aura = aura;

      // ââ bold chevron tail ââ
      this.tail = new PIXI.Graphics();
      this._drawTail(0);
      this.container.addChild(this.tail);

      // ââ glossy sphere body ââ
      const bd = buildGlossySphereTexture(bodyRadius, colorHex);
      this.bodySprite = new PIXI.Sprite(bd.tex);
      this.bodySprite.anchor.set(0.5);
      this.container.addChild(this.bodySprite);

      // ââ neon green ring ââ
      const ring = buildNeonRingTexture(bodyRadius);
      const ringSprite = new PIXI.Sprite(ring.tex);
      ringSprite.anchor.set(0.5);
      ringSprite.filters = [new PIXI.BlurFilter(3, 2)];
      this.container.addChild(ringSprite);
      this.neonRing = ringSprite;

      // ââ coin logo (image-based, circle-clipped) ââ
      const logoSize = Math.round(bodyRadius * 1.1);
      this.logo = new PIXI.Sprite(getLogoTexture(type, logoSize, colorHex));
      this.logo.anchor.set(0.5);
      this.logo.alpha = 0.92;
      this.container.addChild(this.logo);

      // ââ googly eye (smaller, right side) ââ
      this.eyeContainer = new PIXI.Container();
      const eyeR = bodyRadius * 0.14;
      const sclera = new PIXI.Graphics();
      sclera.beginFill(0xffffff, 0.95);
      sclera.drawCircle(0, 0, eyeR);
      sclera.endFill();
      this.eyeContainer.addChild(sclera);

      this.pupil = new PIXI.Graphics();
      this.pupil.beginFill(0x0a0a0a, 1);
      this.pupil.drawCircle(0, 0, eyeR * 0.55);
      this.pupil.endFill();
      this.eyeContainer.addChild(this.pupil);

      // position at right side of body
      this.eyeContainer.x = bodyRadius * 0.55;
      this.eyeContainer.y = -bodyRadius * 0.25;
      this.container.addChild(this.eyeContainer);

      // ââ price label (3 lines: ticker, change%, price) ââ
      this.labelContainer = new PIXI.Container();
      const fontSize = Math.max(11, Math.round(bodyRadius * 0.22));

      this.tickerText = new PIXI.Text(this.ticker, {
        fontFamily: 'Arial, sans-serif', fontSize: fontSize + 2,
        fontWeight: 'bold', fill: '#ffffff', align: 'center',
        dropShadow: true, dropShadowColor: '#000000',
        dropShadowDistance: 1, dropShadowBlur: 3,
      });
      this.tickerText.anchor.set(0.5, 0);
      this.labelContainer.addChild(this.tickerText);

      this.changeText = new PIXI.Text('--', {
        fontFamily: 'Arial, sans-serif', fontSize: fontSize,
        fontWeight: 'bold', fill: '#888888', align: 'center',
        dropShadow: true, dropShadowColor: '#000000',
        dropShadowDistance: 1, dropShadowBlur: 3,
      });
      this.changeText.anchor.set(0.5, 0);
      this.changeText.y = fontSize + 4;
      this.labelContainer.addChild(this.changeText);

      this.priceText = new PIXI.Text('--', {
        fontFamily: 'Arial, sans-serif', fontSize: fontSize,
        fill: '#ffffff', align: 'center',
        dropShadow: true, dropShadowColor: '#000000',
        dropShadowDistance: 1, dropShadowBlur: 3,
      });
      this.priceText.anchor.set(0.5, 0);
      this.priceText.y = (fontSize + 4) * 2;
      this.labelContainer.addChild(this.priceText);

      this.balanceText = new PIXI.Text('', {
        fontFamily: 'Arial, sans-serif', fontSize: Math.max(9, fontSize - 1),
        fill: '#aaccaa', align: 'center',
        dropShadow: true, dropShadowColor: '#000000',
        dropShadowDistance: 1, dropShadowBlur: 3,
      });
      this.balanceText.anchor.set(0.5, 0);
      this.balanceText.y = (fontSize + 4) * 3;
      this.labelContainer.addChild(this.balanceText);

      this.labelContainer.y = bodyRadius + 8;
      this.container.addChild(this.labelContainer);

      // ââ dual-axis sine wave movement (gentle drift) ââ
      this.xAmp = rand(20, 60);
      this.xFreq = rand(0.002, 0.005);
      this.xPhase = rand(0, Math.PI * 2);
      this.yAmp = rand(10, 22);
      this.yFreq = rand(0.005, 0.011);
      this.yPhase = rand(0, Math.PI * 2);
      this.xSpeed = rand(0.15, 0.45) * (Math.random() > 0.5 ? 1 : -1);
      this.facingRight = this.xSpeed > 0;
      this.baseX = rand(80, screenW - 80);
      this.baseY = rand(80, screenH * (1 - SEABED_FRAC) - 80);

      this.container.x = this.baseX;
      this.container.y = this.baseY;
      if (this.xSpeed < 0) this.container.scale.x = -1;

      this.tailPhase = rand(0, Math.PI * 2);
      this.tailSpeed = rand(0.04, 0.08);
      this.neonPulse = rand(0, Math.PI * 2);

      // interactivity
      this.hovered = false;
      this.targetScale = 1;
      this.currentScale = 1;
      this.container.eventMode = 'static';
      this.container.cursor = 'pointer';
      this.container.hitArea = new PIXI.Circle(0, 0, bodyRadius * 1.2);

      this.container.on('pointerover', () => {
        this.hovered = true;
        this.targetScale = 1.2;
      });
      this.container.on('pointerout', () => {
        this.hovered = false;
        this.targetScale = 1;
      });
      this.container.on('pointertap', (e) => {
        e.stopPropagation();
        showDetailPanel(this);
      });

      // separation force accumulator
      this.sepX = 0;
      this.sepY = 0;

      fishContainer.addChild(this.container);
    }

    _drawTail(flapAngle) {
      const t = this.tail;
      const r = this.bodyRadius;
      t.clear();

      const rr = parseInt(this.colorHex.slice(1,3),16);
      const gg = parseInt(this.colorHex.slice(3,5),16);
      const bb = parseInt(this.colorHex.slice(5,7),16);
      const darkCol = hexI(Math.max(0,rr-50), Math.max(0,gg-45), Math.max(0,bb-40));

      const baseX = -r * 0.75;
      const tipX = baseX - r * 1.1;
      const spread = r * 0.75 + Math.sin(flapAngle) * r * 0.3;
      const notchX = tipX + r * 0.25;

      t.beginFill(darkCol, 0.85);
      t.moveTo(baseX, -r * 0.2);
      t.lineTo(tipX, -spread);
      t.lineTo(notchX, -spread * 0.15);
      t.lineTo(tipX, spread);
      t.lineTo(baseX, r * 0.2);
      t.closePath();
      t.endFill();

      t.lineStyle(1.5, this.colorInt, 0.35);
      t.moveTo(baseX, 0);
      t.lineTo(notchX, 0);
    }

    update(delta, elapsed, screenW, screenH, halos) {
      const waterMaxY = screenH * (1 - SEABED_FRAC) - 50;

      if (!this.hovered) {
        // sine wave path on both axes
        let sineX = this.xSpeed * delta;
        let sineY = Math.cos(elapsed * this.yFreq + this.yPhase) * this.yAmp * 0.02 * delta;
        this.baseX += sineX;
        const xWobble = Math.sin(elapsed * this.xFreq + this.xPhase) * this.xAmp;
        const yWobble = Math.sin(elapsed * this.yFreq + this.yPhase) * this.yAmp;

        let targetX = this.baseX + xWobble;
        let targetY = this.baseY + yWobble;

        // halo attraction
        let haloForceX = 0, haloForceY = 0, haloActive = false;
        if (halos && halos.length > 0) {
          for (const halo of halos) {
            const hdx = halo.x - this.container.x;
            const hdy = halo.y - this.container.y;
            const dist = Math.sqrt(hdx * hdx + hdy * hdy);
            const orbitR = this.bodyRadius * 2.5;
            if (dist > 1) {
              const strength = clamp(halo.strength * (300 / (dist + 50)), 0, 2.5);
              if (dist > orbitR) {
                haloForceX += (hdx / dist) * strength;
                haloForceY += (hdy / dist) * strength;
              } else {
                // orbit: perpendicular force
                const perpX = -hdy / dist;
                const perpY = hdx / dist;
                haloForceX += perpX * strength * 0.8;
                haloForceY += perpY * strength * 0.8;
              }
              haloActive = true;
            }
          }
        }

        // blend: sine path vs halo attraction â speed boost when halo active
        const haloSpeedMul = haloActive ? 1.4 : 1;
        const blend = haloActive ? 0.55 : 0;
        const moveX = (lerp(sineX, haloForceX, blend) + this.sepX * 0.5) * haloSpeedMul;
        const moveY = (lerp(sineY, haloForceY, blend) + this.sepY * 0.5) * haloSpeedMul;

        this.container.x += (haloActive ? moveX : 0);
        this.container.y += (haloActive ? moveY : 0);

        if (!haloActive) {
          this.container.x = targetX + this.sepX * 2;
          this.container.y = clamp(targetY + this.sepY * 2, 55, waterMaxY);
        }

        this.baseY = clamp(this.baseY + sineY, 70, waterMaxY - 50);

        // Update facing direction based on actual movement this frame
        if (haloActive && Math.abs(moveX) > 0.05) {
          this.facingRight = moveX > 0;
        } else if (!haloActive) {
          this.facingRight = this.xSpeed > 0;
        }

        // Sync baseX/baseY to actual position while halo is active so the fish
        // doesn't snap back to its old path when the halo disappears
        if (haloActive) {
          this.baseX = this.container.x - xWobble;
          this.baseY = this.container.y - yWobble;
        }
      }

      // wrap edges
      const margin = this.bodyRadius * 2.5;
      if (this.container.x < -margin) { this.baseX += screenW + margin * 2; this.container.x += screenW + margin * 2; }
      if (this.container.x > screenW + margin) { this.baseX -= screenW + margin * 2; this.container.x -= screenW + margin * 2; }
      this.container.y = clamp(this.container.y, 40, waterMaxY);

      // face direction — driven by this.facingRight which tracks actual movement
      const facingRight = this.facingRight;
      this.container.scale.x = (facingRight ? 1 : -1) * this.currentScale;
      this.container.scale.y = this.currentScale;

      // smooth scale tween (slow grow on hover)
      this.currentScale += (this.targetScale - this.currentScale) * 0.015;

      // rotation tilt
      const tiltTarget = Math.cos(elapsed * this.yFreq + this.yPhase) * 0.06;
      this.container.rotation += (tiltTarget - this.container.rotation) * 0.06;

      // tail flap
      this.tailPhase += this.tailSpeed * delta;
      this._drawTail(this.tailPhase);

      // neon ring pulse
      this.neonPulse += 0.02 * delta;
      this.neonRing.alpha = 0.7 + Math.sin(this.neonPulse) * 0.2;
      this.aura.alpha = 0.14 + Math.sin(this.neonPulse * 0.7) * 0.06;

      // pupil
      const dir = facingRight ? 1 : -1;
      this.pupil.x = dir * this.bodyRadius * 0.04;
      this.pupil.y = Math.sin(elapsed * 0.013 + this.yPhase) * this.bodyRadius * 0.025;

      // counter-flip logo and label
      const flipX = this.container.scale.x < 0 ? -1 : 1;
      this.logo.scale.x = flipX;
      this.labelContainer.scale.x = flipX;

      // reset separation
      this.sepX = 0;
      this.sepY = 0;
    }

    updatePrice(data, assets) {
      if (!data) return;
      const info = data[this.ticker];
      if (!info) return;

      const price = info.price;
      const change = info.change24h;

      // format price
      let priceStr;
      if (price >= 1000) priceStr = '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      else if (price >= 1) priceStr = '$' + price.toFixed(2);
      else priceStr = '$' + price.toFixed(4);
      this.priceText.text = priceStr;

      // format change (change24h is already a string e.g. "+1.24%")
      this.changeText.text = change || '--';
      this.changeText.style.fill = change && change.startsWith('-') ? '#ff3333' : '#00ff41';

      // wallet balance — show USD value if wallet is connected and holding this token
      if (this.balanceText) {
        const asset = assets && assets.find(a => a.symbol === this.ticker);
        if (asset && asset.usdValue > 0) {
          const usd = asset.usdValue;
          let balStr;
          if (usd >= 1000) balStr = '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          else balStr = '$' + usd.toFixed(2);
          this.balanceText.text = '💼 ' + balStr;
        } else {
          this.balanceText.text = '';
        }
      }
    }
  }

  // spawn fish after logo images load â mapped to API tickers
  const fishDefs = [
    { type: 'BTC',   hex: '#f7931a', int: 0xf7931a, ticker: 'cbBTC' },
    { type: 'ETH',   hex: '#627eea', int: 0x627eea, ticker: 'ETH'   },
    { type: 'SOL',   hex: '#9945ff', int: 0x9945ff, ticker: 'USDC'  },
    { type: 'DEGEN', hex: '#c026d3', int: 0xc026d3, ticker: 'DEGEN' },
    { type: 'BRETT', hex: '#3b82f6', int: 0x3b82f6, ticker: 'BRETT' },
  ];

  const fishes = [];

  await loadLogoImages();
  for (const fd of fishDefs)
    fishes.push(new Fish(fd.type, fd.hex, fd.int, app.screen.width, app.screen.height, fd.ticker));
  fishesRef.current = fishes;

  // Initial price update from prop
  for (const f of fishes) f.updatePrice(pricesRef.current, assetsRef.current);


  // âââââââââââââââââââââââââââââââââââââââââââ
  //  LIGHT HALOS
  // âââââââââââââââââââââââââââââââââââââââââââ
  const haloContainer = new PIXI.Container();
  app.stage.addChildAt(haloContainer, app.stage.children.indexOf(fishContainer));
  const halos = [];

  function spawnHalo(x, y) {
    const g = new PIXI.Graphics();
    const layers = [
      { r: 48, a: 0.05 }, { r: 32, a: 0.08 },
      { r: 18, a: 0.12 }, { r: 8, a: 0.20 },
    ];
    for (const l of layers) {
      g.beginFill(0x66eeff, l.a);
      g.drawCircle(0, 0, l.r);
      g.endFill();
    }
    g.filters = [new PIXI.BlurFilter(18, 6)];
    g.x = x; g.y = y;
    haloContainer.addChild(g);
    halos.push({ gfx: g, x, y, life: 0, maxLife: 160, strength: 1.5, phase: rand(0, Math.PI * 2) });
  }

  // click on background â spawn halo
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('pointertap', (e) => {
    const pos = e.global;
    spawnHalo(pos.x, pos.y);
    panel.style.display = 'none';
  });

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  DETAIL PANEL (HTML overlay)
  // âââââââââââââââââââââââââââââââââââââââââââ
  const panel = document.createElement('div');
  panel.id = 'detail-panel';
  panel.style.cssText = `
    position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    background:rgba(8,16,28,0.92); border:1px solid rgba(57,255,20,0.4);
    border-radius:16px; padding:28px 36px; color:#fff; font-family:Arial,sans-serif;
    display:none; z-index:1000; min-width:260px; text-align:center;
    box-shadow:0 0 40px rgba(57,255,20,0.15); backdrop-filter:blur(8px);
  `;
  document.body.appendChild(panel);

  panel.addEventListener('click', () => { panel.style.display = 'none'; });

  function showDetailPanel(fish) {
    const info = pricesRef.current ? pricesRef.current[fish.ticker] : null;
    const price = info ? info.price : null;
    const change = info ? info.change24h : null;
    const changeColor = change != null ? (change.startsWith('-') ? '#ff3333' : '#00ff41') : '#888';
    const changeStr = change != null ? change : '--';
    let priceStr = '--';
    if (price != null) {
      if (price >= 1000) priceStr = '$' + price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      else if (price >= 1) priceStr = '$' + price.toFixed(2);
      else priceStr = '$' + price.toFixed(4);
    }
    panel.innerHTML = `
      <div style="font-size:13px;color:#39ff14;margin-bottom:6px;letter-spacing:2px">â LIVE</div>
      <div style="font-size:28px;font-weight:bold;margin-bottom:4px">${fish.ticker}</div>
      <div style="font-size:36px;font-weight:bold;margin:8px 0">${priceStr}</div>
      <div style="font-size:20px;color:${changeColor};font-weight:bold;margin-bottom:10px">${changeStr}</div>
      <div style="font-size:12px;color:#556;margin-top:12px">tap to close</div>
    `;
    panel.style.display = 'block';
  }

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  COLLISION AVOIDANCE
  // âââââââââââââââââââââââââââââââââââââââââââ
  function applySeparation() {
    const sepRadius = 160;
    for (let i = 0; i < fishes.length; i++) {
      const a = fishes[i];
      for (let j = i + 1; j < fishes.length; j++) {
        const b = fishes[j];
        const dx = a.container.x - b.container.x;
        const dy = a.container.y - b.container.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < sepRadius && dist > 1) {
          const force = (sepRadius - dist) / sepRadius * 1.6;
          const nx = dx / dist, ny = dy / dist;
          a.sepX += nx * force;
          a.sepY += ny * force;
          b.sepX -= nx * force;
          b.sepY -= ny * force;
        }
      }
    }
  }


  // âââââââââââââââââââââââââââââââââââââââââââ
  //  SPOTLIGHT HIT-TEST
  // âââââââââââââââââââââââââââââââââââââââââââ
  function getSpotlightBoost(bx, by) {
    let boost = 0;
    for (const sl of spotlights) {
      const sx = sl.sprite.x, t = by / sl.beamH;
      if (t < 0 || t > 1) continue;
      const halfW = lerp(sl.def.topWidth / 2, sl.def.botWidth / 2, t);
      const dx = Math.abs(bx - sx);
      if (dx < halfW) {
        const vF = t < .05 ? t / .05 : t < .60 ? 1 : Math.max(0, 1 - (t - .60) / .18);
        boost = Math.max(boost, vF * (1 - dx / halfW) * .5);
      }
    }
    return boost;
  }

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  ANIMATION LOOP
  // âââââââââââââââââââââââââââââââââââââââââââ
  let elapsed = 0;
  let priceRefreshCounter = 119; // fire immediately on first tick, then every 120 frames

  app.ticker.add((delta) => {
    elapsed += delta;

    // Refresh fish labels every 120 frames (~2s) — guards against React effect timing races
    priceRefreshCounter++;
    if (priceRefreshCounter >= 120) {
      priceRefreshCounter = 0;
      for (const f of fishes) f.updatePrice(pricesRef.current, assetsRef.current);
    }
    const w = app.screen.width, h = app.screen.height;

    for (const sl of spotlights)
      sl.sprite.x = sl.baseX + Math.sin(elapsed * sl.def.swaySpeed + sl.def.phase) * sl.def.swayAmp;

    for (const b of bubbles) {
      b.y -= b._speed * delta;
      b.x += b._drift * delta + Math.sin(elapsed * b._wobbleSpd + b._phase) * b._wobbleAmp * .3;
      const boost = getSpotlightBoost(b.x, b.y);
      b.alpha = clamp(b._baseAlpha + boost + Math.sin(elapsed * .012 + b._phase) * .04, .25, 1);
      b.scale.set(b._origScale * (1 + boost * .35));
      if (b.y < -30) initBubble(b, true);
      if (b.x < -30) b.x = w + 30; if (b.x > w + 30) b.x = -30;
    }

    for (const wv of waveLines) {
      wv.phase += wv.speed * delta;
      const g = wv.gfx; g.clear(); g.lineStyle(wv.thickness, wv.color, wv.alpha);
      const yC = wv.yBase * h;
      g.moveTo(0, yC + Math.sin(wv.phase) * wv.amplitude);
      for (let x = 4; x <= w; x += 4) g.lineTo(x, yC + Math.sin(x * wv.frequency + wv.phase) * wv.amplitude);
    }

    drawSeaweedFrame(elapsed);
    updateCrabs(delta);

    // collision avoidance
    applySeparation();

    // update halos
    for (let i = halos.length - 1; i >= 0; i--) {
      const halo = halos[i];
      halo.life += delta;
      const t = halo.life / halo.maxLife;
      // pulse: breathe in/out
      const pulse = 1 + Math.sin(halo.life * 0.08 + halo.phase) * 0.15;
      halo.gfx.scale.set(pulse);
      // fade out in last 30%
      halo.gfx.alpha = t > 0.7 ? (1 - t) / 0.3 : 1;
      halo.strength = t > 0.7 ? (1 - t) / 0.3 * 1.5 : 1.5;
      if (halo.life >= halo.maxLife) {
        haloContainer.removeChild(halo.gfx);
        halo.gfx.destroy();
        halos.splice(i, 1);
      }
    }

    // fish
    for (const f of fishes) f.update(delta, elapsed, w, h, halos);

    for (const d of dustList) {
      d.x += d._vx * delta; d.y += d._vy * delta;
      if (d.x < 0) d.x = w; if (d.x > w) d.x = 0;
      if (d.y < 0) d.y = h; if (d.y > h) d.y = 0;
    }
  });

  // âââââââââââââââââââââââââââââââââââââââââââ
  //  RESIZE
  // âââââââââââââââââââââââââââââââââââââââââââ
  window.addEventListener('resize', () => {
    const w = app.screen.width, h = app.screen.height;
    bgSprite.texture.destroy(true); bgSprite.texture = buildGradientTexture(h);
    bgSprite.width = w; bgSprite.height = h;
    vignetteSprite.texture.destroy(true); vignetteSprite.texture = buildVignette(w, h);
    vignetteSprite.width = w; vignetteSprite.height = h;
    createSpotlights();
    rebuildSeabed();
  });
  appRef.current = app;
})();

    return () => {
      appRef.current?.destroy(true)
      appRef.current = null
      style.remove()
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
