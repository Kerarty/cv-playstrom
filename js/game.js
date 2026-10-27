// PixiJS-сцена: изометрический Rocket Post, конвейер, башня, роботы QuickBox
import * as PIXI from './vendor/pixi.min.mjs';
import { C, BOXES, WAVES, WAVE_AFTER_BOX, PATH, CONVEYOR, weaponStats } from './data.js';
import { Loc } from './loc.js';

// ---- изометрия: мир (x, y, z) → экран ----
const OX = 620, OY = 300, SX = 44, SY = 22, ZS = 38;
const iso = (x, y, z = 0) => ({ x: OX + (x - y) * SX, y: OY + (x + y) * SY - z * ZS });

function lerpColor(a, b, k) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bgc = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bgc - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
}

function poly(g, pts, color, alpha = 1) {
  g.poly(pts.map(p => [p.x, p.y]).flat()).fill({ color, alpha });
}

// изометрический параллелепипед: верхняя, левая и правая грани
function isoBox(g, x0, y0, x1, y1, z0, z1, top, left, right, alpha = 1) {
  poly(g, [iso(x1, y0, z1), iso(x1, y1, z1), iso(x1, y1, z0), iso(x1, y0, z0)], right, alpha);
  poly(g, [iso(x0, y1, z1), iso(x1, y1, z1), iso(x1, y1, z0), iso(x0, y1, z0)], left, alpha);
  poly(g, [iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)], top, alpha);
}

// ---- простые твины ----
const tweens = [];
export function tween(obj, to, dur, onDone = null, ease = t => t) {
  const from = {};
  for (const k in to) from[k] = obj[k];
  tweens.push({ obj, from, to, dur, t: 0, onDone, ease });
}
function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    for (const p in tw.to) tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * tw.ease(k);
    if (k >= 1) { tweens.splice(i, 1); tw.onDone?.(); }
  }
}

// ---- враг QuickBox ----
class Enemy {
  constructor(scene, wave, kind, hp, speed, scale, boss) {
    this.wave = wave;
    this.kind = kind; // drone | crawler | swarm | boss
    this.hp = hp; this.maxHp = hp;
    this.speed = speed;
    this.boss = boss;
    this.seg = 0;
    this.world = { x: PATH[0][0], y: PATH[0][1] };
    this.t = 0;
    this.dead = false;
    this.phase = Math.random() * 10;

    const s = scale;
    this.view = new PIXI.Container();
    const g = new PIXI.Graphics();
    // антенна с оранжевым шариком
    g.moveTo(0, -46 * s).lineTo(0, -60 * s).stroke({ width: 3 * s, color: C.blueDark });
    g.circle(0, -64 * s, 5 * s).fill(C.orange);
    // корпус и светлая панелька
    g.roundRect(-22 * s, -44 * s, 44 * s, 42 * s, 13 * s).fill(C.blue);
    g.roundRect(-15 * s, -18 * s, 30 * s, 12 * s, 6 * s).fill(C.blueLight);
    // глаз-пирожочек
    g.circle(0, -32 * s, 11 * s).fill(C.white);
    g.circle(3 * s, -32 * s, 5 * s).fill(C.ink);
    if (boss) {
      g.roundRect(-13 * s, -48 * s, 9 * s, 4 * s, 2 * s).fill(C.red);
      g.roundRect(4 * s, -48 * s, 9 * s, 4 * s, 2 * s).fill(C.red);
    }
    // боковые колёсики
    g.circle(-23 * s, -2 * s, 6 * s).fill(C.blueDark);
    g.circle(23 * s, -2 * s, 6 * s).fill(C.blueDark);
    this.body = g;
    this.shadow = new PIXI.Graphics();
    this.shadow.ellipse(0, 0, 24 * s, 11 * s).fill({ color: 0x000000, alpha: 0.25 });
    this.hpBar = new PIXI.Graphics();
    this.view.addChild(this.shadow, g, this.hpBar);
    scene.enemiesLayer.addChild(this.view);
    this.sync();
  }

  sync() {
    const p = iso(this.world.x, this.world.y, 0);
    const bob = Math.sin(performance.now() / 1000 * 9 + this.phase) * 3;
    this.view.position.set(p.x, p.y + bob);
    this.shadow.alpha = 1 - bob / 12;
    const w = 48 * (this.hp / this.maxHp);
    this.hpBar.clear();
    if (this.hp < this.maxHp) {
      this.hpBar.rect(-24, -80, 48, 5).fill({ color: 0x000000, alpha: 0.35 });
      this.hpBar.rect(-24, -80, w, 5).fill(C.red);
    }
  }

  update(dt) {
    const target = PATH[this.seg + 1];
    if (!target) return true; // дошёл
    const dx = target[0] - this.world.x, dy = target[1] - this.world.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (step >= dist) {
      this.world.x = target[0]; this.world.y = target[1];
      this.seg++;
      return this.update(0);
    }
    this.world.x += dx / dist * step;
    this.world.y += dy / dist * step;
    this.sync();
    return false;
  }

  hit(dmg) {
    this.hp -= dmg;
    this.body.alpha = 0.5;
    tween(this.body, { alpha: 1 }, 0.15);
    if (this.hp <= 0) {
      this.dead = true;
      game.spawnPop(this.view.x, this.view.y - 24, this.boss);
      this.destroy();
      return true;
    }
    return false;
  }

  destroy() {
    this.view.destroy({ children: true });
    const i = game.enemies.indexOf(this);
    if (i >= 0) game.enemies.splice(i, 1);
  }
}

// ---- состояние игры ----
export const game = {
  state: 'intro', // intro | belt | scan | card | fly | tuner | wave | finale_anim | finale
  app: null,
  layers: {},
  enemies: [],
  scanned: [],
  boxIndex: 0,
  waveIdx: 0,
  box: null,
  scanT: 0,
  holding: false,
  currentDef: null,
  stats: { waves: [] },
  towerStats: { dmg: 0, rof: 0, rng: 0 },
  multipliers: { dmg: 1, rof: 1, rng: 1 },
  fireT: 0,
  spawnLeft: 0,
  spawnT: 0,
  wave: null,
  ui: null,
  rocket: null,
  finaleT: 0,
  confetti: [],

  async init(container) {
    this.app = new PIXI.Application();
    await this.app.init({ width: 1280, height: 720, backgroundAlpha: 0, antialias: true });
    container.appendChild(this.app.canvas);
    this.app.ticker.add(t => this.update(t.deltaMS / 1000));
    this.buildScene();
    this.bindInput();
  },

  buildScene() {
    const stage = this.app.stage;
    const L = this.layers;
    L.bg = new PIXI.Container();
    L.ground = new PIXI.Container();
    L.marks = new PIXI.Container();
    L.belt = new PIXI.Container();
    L.store = new PIXI.Container();
    L.boxes = new PIXI.Container();
    L.enemiesLayer = new PIXI.Container();
    L.tower = new PIXI.Container();
    L.shots = new PIXI.Container();
    L.fx = new PIXI.Container();
    stage.addChild(L.bg, L.ground, L.marks, L.belt, L.store, L.tower, L.boxes, L.enemiesLayer, L.shots, L.fx);

    // дневное небо — мягкий градиент
    const bg = new PIXI.Graphics();
    for (let i = 0; i < 36; i++) {
      bg.rect(0, i * 20, 1280, 21).fill(lerpColor(C.skyTop, C.skyBottom, i / 35));
    }
    L.bg.addChild(bg);

    // остров-площадка с толщиной и лёгкой сеткой
    const g = new PIXI.Graphics();
    poly(g, [iso(-11, -6.5), iso(11, -6.5), iso(11, 6.5), iso(-11, 6.5)].map(p => ({ x: p.x, y: p.y + 14 })), C.groundSide);
    poly(g, [iso(-11, -6.5), iso(11, -6.5), iso(11, 6.5), iso(-11, 6.5)], C.ground);
    for (let x = -10; x <= 10; x += 2) g.moveTo(iso(x, -6.5).x, iso(x, -6.5).y).lineTo(iso(x, 6.5).x, iso(x, 6.5).y);
    for (let y = -6; y <= 6; y += 2) g.moveTo(iso(-11, y).x, iso(-11, y).y).lineTo(iso(11, y).x, iso(11, y).y);
    g.stroke({ width: 1, color: C.gridLine, alpha: 0.45 });
    L.ground.addChild(g);

    // стрелки пути роботов — цепочка к магазину
    const m = new PIXI.Graphics();
    for (let i = 0; i < PATH.length - 1; i++) {
      const [ax, ay] = PATH[i];
      const [bx, by] = PATH[i + 1];
      const d = Math.hypot(bx - ax, by - ay);
      const n = Math.max(1, Math.round(d / 1.7));
      const a0 = iso(ax, ay), b0 = iso(bx, by);
      const ang = Math.atan2(b0.y - a0.y, b0.x - a0.x);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const p = iso(ax + (bx - ax) * t, ay + (by - ay) * t, 0.02);
        m.poly([
          p.x + Math.cos(ang) * 15, p.y + Math.sin(ang) * 15,
          p.x + Math.cos(ang + 2.5) * 10, p.y + Math.sin(ang + 2.5) * 10,
          p.x + Math.cos(ang - 2.5) * 10, p.y + Math.sin(ang - 2.5) * 10,
        ]).fill({ color: C.blue, alpha: 0.55 });
      }
    }
    L.marks.addChild(m);

    // конвейер
    const b = new PIXI.Graphics();
    isoBox(b, CONVEYOR.to[0] - 0.45, 2.55, CONVEYOR.from[0] + 0.45, 3.45, 0, 0.25, C.charcoal, C.charcoalDark, C.charcoalDark);
    L.belt.addChild(b);

    // магазин Rocket Post: окна, дверь, полосатый навес, вывеска
    const s = new PIXI.Graphics();
    isoBox(s, -2.8, -1.9, 2.8, 1.9, 0, 1.8, C.cardboardTop, C.cardboardDark, C.cardboard);
    poly(s, [iso(-0.35, 1.901, 1.1), iso(0.35, 1.901, 1.1), iso(0.35, 1.901, 0), iso(-0.35, 1.901, 0)], C.door);
    poly(s, [iso(-2.2, 1.901, 1.35), iso(-1.4, 1.901, 1.35), iso(-1.4, 1.901, 0.75), iso(-2.2, 1.901, 0.75)], C.glass);
    poly(s, [iso(1.4, 1.901, 1.35), iso(2.2, 1.901, 1.35), iso(2.2, 1.901, 0.75), iso(1.4, 1.901, 0.75)], C.glass);
    const stripes = 8;
    for (let i = 0; i < stripes; i++) {
      const x0 = -2.8 + (5.6 / stripes) * i, x1 = x0 + 5.6 / stripes;
      poly(s, [iso(x0, 1.9, 1.8), iso(x1, 1.9, 1.8), iso(x1, 2.35, 1.6), iso(x0, 2.35, 1.6)], i % 2 ? C.tape : C.orange);
      poly(s, [iso(x0, 2.35, 1.6), iso(x1, 2.35, 1.6), iso(x1, 2.35, 1.45), iso(x0, 2.35, 1.45)], i % 2 ? C.tape : C.orangeDark);
    }
    isoBox(s, -1.6, -1.24, 1.6, -0.96, 1.8, 2.55, C.orangeDark, C.orangeDark, C.orange);
    const glow = new PIXI.Graphics();
    glow.ellipse(iso(0, -1.1, 2.5).x, iso(0, -1.1, 2.5).y, 96, 32).fill({ color: C.orange, alpha: 0.18 });
    L.store.addChild(s, glow);
    const signText = new PIXI.Text({
      text: 'ROCKET POST',
      style: { fontFamily: 'Nunito, sans-serif', fontSize: 26, fontWeight: '900', fill: 0xffffff, letterSpacing: 1 },
    });
    signText.anchor.set(0.5);
    const sp = iso(0, -1.1, 2.2);
    signText.position.set(sp.x, sp.y);
    signText.scale.set(0.62);
    L.store.addChild(signText);

    this.rebuildTower();
  },

  rebuildTower() {
    const L = this.layers.tower;
    L.removeChildren().forEach(c => c.destroy({ children: true }));
    const g = new PIXI.Graphics();
    const n = this.scanned.filter(d => d.type !== 'final').length;
    // этажи растут над крышей магазина
    for (let i = 0; i < n; i++) {
      const z0 = 1.8 + i * 0.55, z1 = z0 + 0.5;
      const shrink = 1 - i * 0.06;
      const half = 1.5 * shrink;
      isoBox(g, -half, -half * 0.75, half, half * 0.75, z0, z1,
        i % 2 ? C.cardboard : C.cardboardTop, C.cardboardDark, C.cardboard);
    }
    // орудие на вершине
    const topZ = 1.8 + n * 0.55 + 0.35;
    const muzzle = iso(0, 0, topZ);
    const turret = new PIXI.Container();
    turret.position.set(muzzle.x, muzzle.y);
    const tg = new PIXI.Graphics();
    tg.circle(0, 0, 20).fill(C.charcoal);
    tg.circle(0, 0, 13).fill(C.orange);
    tg.rect(0, -4, 34, 8).fill(C.charcoal);
    turret.addChild(tg);
    const flash = new PIXI.Graphics();
    flash.poly([0, -14, 4, -4, 14, 0, 4, 4, 0, 14, -4, 4, -14, 0, -4, -4]).fill(C.orange);
    flash.position.set(38, 0);
    flash.visible = false;
    turret.addChild(flash);
    this.turret = turret;
    this.muzzleFlash = flash;
    this.muzzlePos = { x: muzzle.x, y: muzzle.y };
    L.addChild(g, turret);
  },

  // ---- посылки ----

  spawnBox() {
    this.currentDef = BOXES[this.boxIndex];
    // геометрия коробки — в локальных координатах контейнера
    const li = (x, y, z = 0) => { const p = iso(x, y, z); return { x: p.x - OX, y: p.y - OY }; };
    const lpoly = (g, pts, color, alpha = 1) => g.poly(pts.map(p => [p.x, p.y]).flat()).fill({ color, alpha });
    const libox = (g, x0, y0, x1, y1, z0, z1, top, left, right) => {
      lpoly(g, [li(x1, y0, z1), li(x1, y1, z1), li(x1, y1, z0), li(x1, y0, z0)], right);
      lpoly(g, [li(x0, y1, z1), li(x1, y1, z1), li(x1, y1, z0), li(x0, y1, z0)], left);
      lpoly(g, [li(x0, y0, z1), li(x1, y0, z1), li(x1, y1, z1), li(x0, y1, z1)], top);
    };
    const g = new PIXI.Graphics();
    const half = 0.42;
    libox(g, -half, -half, half, half, 0, 0.72, C.cardboardTop, C.cardboardDark, C.cardboard);
    lpoly(g, [li(-0.12, half + 0.001, 0.72), li(0.12, half + 0.001, 0.72), li(0.12, half + 0.001, 0), li(-0.12, half + 0.001, 0)], C.tape);
    const view = new PIXI.Container();
    view.addChild(g);
    const ring = new PIXI.Graphics();
    view.addChild(ring);
    this.layers.boxes.addChild(view);
    this.box = { view, ring, def: this.currentDef, x: CONVEYOR.from[0] };
    this.syncBox();
    this.state = 'belt';
    this.ui.setHint(Loc.t('hint_scan'));
  },

  syncBox() {
    if (!this.box) return;
    const p = iso(this.box.x, CONVEYOR.to[1], 0.35);
    this.box.view.position.set(p.x, p.y);
  },

  syncScanFx() {
    const ring = this.box?.ring;
    if (!ring) return;
    ring.clear();
    if (this.scanT > 0.02) {
      // всё в локальных координатах контейнера коробки
      ring.rect(-46, -132, 92, 9).fill({ color: 0x000000, alpha: 0.35 });
      ring.rect(-44, -130, 88 * this.scanT, 5).fill(C.orange);
      const half = 0.42;
      const li = (x, y, z = 0) => { const p = iso(x, y, z); return { x: p.x - OX, y: p.y - OY }; };
      const pts = [li(-half, -half, 0.72), li(half, -half, 0.72), li(half, half, 0.72), li(-half, half, 0.72)]
        .map(q => [q.x, q.y]);
      ring.poly(pts.flat()).stroke({ width: 3, color: C.orange, alpha: 0.4 + 0.6 * this.scanT });
      // искорки сканирования
      const tw = performance.now() / 1000;
      for (let i = 0; i < 3; i++) {
        const a = tw * 2 + (i * Math.PI * 2) / 3;
        ring.circle(Math.cos(a) * 55, -34 + Math.sin(a) * 40, 4).fill({ color: C.white, alpha: 0.55 + 0.45 * Math.sin(tw * 12 + i) });
      }
    }
  },

  // ---- волна ----

  startWave() {
    this.wave = WAVES[this.waveIdx];
    this.spawnLeft = this.wave.drones + this.wave.crawlers + this.wave.swarm + (this.wave.boss ? 1 : 0);
    this.spawnT = 0.5;
    this.waveBroken = 0;
    this.waveKilled = 0;
    this.state = 'wave';
    this.ui.setHint(Loc.t('hint_boost'));
  },

  spawnEnemy() {
    const w = this.wave;
    const i = w.drones + w.crawlers + w.swarm + (w.boss ? 1 : 0) - this.spawnLeft;
    let kind, hp, speed, scale, boss = false;
    if (w.boss && this.spawnLeft === 1) { kind = 'boss'; hp = 60; speed = 0.55; scale = 2.1; boss = true; }
    else if (i % 3 === 0 && i / 3 < w.drones) { kind = 'drone'; hp = 3; speed = 1.5; scale = 0.9; }
    else if (i % 3 === 1 && i / 3 < w.crawlers) { kind = 'crawler'; hp = 12; speed = 0.75; scale = 1.35; }
    else { kind = 'swarm'; hp = 2; speed = 1.9; scale = 0.7; }
    hp *= w.hpMult;
    this.enemies.push(new Enemy(this.layers, w, kind, hp, speed * w.speed, scale, boss));
    this.spawnLeft--;
  },

  weapon() {
    return weaponStats(this.towerStats.dmg, this.towerStats.rof, this.towerStats.rng,
      this.multipliers.dmg, this.multipliers.rof, this.multipliers.rng);
  },

  // поп-эффект: кольцо + искры (уничтожение робота, доставка посылки)
  spawnPop(x, y, big = false) {
    const ring = new PIXI.Graphics();
    ring.circle(0, 0, big ? 22 : 12).stroke({ width: 5, color: C.orange });
    ring.position.set(x, y);
    this.layers.fx.addChild(ring);
    tween(ring, { scaleX: big ? 4 : 2.6, scaleY: big ? 4 : 2.6, alpha: 0 }, 0.4, () => ring.destroy());
    for (let i = 0; i < (big ? 8 : 4); i++) {
      const spark = new PIXI.Graphics();
      spark.circle(0, 0, big ? 6 : 4).fill(i % 2 ? C.orange : C.blue);
      spark.position.set(x, y);
      this.layers.fx.addChild(spark);
      const a = Math.random() * Math.PI * 2;
      const d = big ? 90 : 50;
      tween(spark, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 20, alpha: 0 }, 0.5, () => spark.destroy());
    }
  },

  fire() {
    const st = this.weapon();
    let best = null, bestD = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.world.x, e.world.y);
      if (d < bestD && d <= st.range) { bestD = d; best = e; }
    }
    if (!best) return;
    const shot = new PIXI.Graphics();
    shot.circle(0, 0, 8).fill(C.orange);
    shot.circle(0, 0, 4).fill(C.white);
    shot.position.set(this.muzzlePos.x, this.muzzlePos.y);
    shot.userData = { target: best, dmg: st.damage };
    this.layers.shots.addChild(shot);
    this.muzzleFlash.visible = true;
    tween(this.muzzleFlash, { alpha: 0 }, 0.12, () => { this.muzzleFlash.visible = false; this.muzzleFlash.alpha = 1; });
  },

  updateShots(dt) {
    const layer = this.layers.shots;
    for (let i = layer.children.length - 1; i >= 0; i--) {
      const s = layer.children[i];
      const target = s.userData.target;
      let tx, ty;
      if (target && !target.dead) {
        const p = iso(target.world.x, target.world.y, 0.6);
        tx = p.x; ty = p.y;
      } else {
        tx = s.x + (s.userData.vx || 100) * dt; ty = s.y + (s.userData.vy || 0) * dt;
        s.userData.vx = s.userData.vx || 100;
      }
      const dx = tx - s.x, dy = ty - s.y;
      const dist = Math.hypot(dx, dy);
      const speed = 560;
      if (target && !target.dead && dist < 24) {
        target.hit(s.userData.dmg);
        if (target.dead) this.waveKilled++;
        s.destroy();
        continue;
      }
      s.x += dx / dist * speed * dt;
      s.y += dy / dist * speed * dt;
      if (!target || target.dead) { s.userData.vx = dx / dist * speed; s.userData.vy = dy / dist * speed; }
      if (s.x < -50 || s.x > 1330 || s.y < -50 || s.y > 770) s.destroy();
    }
  },

  endWave() {
    this.stats.waves.push({
      killed: this.waveKilled,
      broken: this.waveBroken,
      total: this.waveKilled + this.waveBroken,
      dps: Math.round(this.weapon().dps * 10) / 10,
    });
    this.waveIdx++;
    this.ui.waveDone();
    this.multipliers = { dmg: 1, rof: 1, rng: 1 };
    this.state = 'belt';
    this.spawnBox();
  },

  // ---- финал ----

  startFinale() {
    this.state = 'finale_anim';
    this.finaleT = 0;
    this.ui.setHint('');
    const topZ = 1.8 + this.scanned.filter(d => d.type !== 'final').length * 0.55 + 0.8;
    const p = iso(0, 0, topZ);
    const r = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.roundRect(-14, -60, 28, 80, 12).fill(C.white);
    g.roundRect(-14, -60, 28, 24, { top: 12, bottom: 0 }).fill(C.red);
    g.poly([[14, 10], [34, 26], [14, 26]]).fill(C.orange);
    g.poly([[-14, 10], [-34, 26], [-14, 26]]).fill(C.orange);
    g.circle(0, -8, 7).fill({ color: C.blue, alpha: 0.9 });
    r.addChild(g);
    r.position.set(p.x, p.y);
    r.alpha = 0;
    this.layers.fx.addChild(r);
    this.rocket = r;
    tween(r, { alpha: 1 }, 0.4);
    // конфетти
    for (let i = 0; i < 40; i++) {
      const c = new PIXI.Graphics();
      c.rect(-5, -3, 10, 6).fill(Math.random() > 0.5 ? C.orange : C.blue);
      c.position.set(p.x + (Math.random() - 0.5) * 120, p.y + (Math.random() - 0.5) * 80);
      c.rotation = Math.random() * 6;
      c.userData = { vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 260 - 60, vr: (Math.random() - 0.5) * 8 };
      this.layers.fx.addChild(c);
      this.confetti.push(c);
    }
  },

  updateFinale(dt) {
    this.finaleT += dt;
    if (this.rocket) {
      this.rocket.y -= (30 + this.finaleT * this.finaleT * 60) * dt;
      this.rocket.rotation = Math.sin(this.finaleT * 5) * 0.06;
    }
    for (const c of this.confetti) {
      c.userData.vy += 340 * dt;
      c.x += c.userData.vx * dt;
      c.y += c.userData.vy * dt;
      c.rotation += c.userData.vr * dt;
    }
    if (this.finaleT > 2.6 && !this.finaleShown) {
      this.finaleShown = true;
      this.ui.showFinale();
    }
  },

  // ---- ввод ----

  bindInput() {
    const cv = this.app.canvas;
    const toCanvas = e => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * 1280 / r.width, y: (e.clientY - r.top) * 720 / r.height };
    };
    cv.addEventListener('pointerdown', e => {
      const p = toCanvas(e);
      if (this.state === 'scan' && this.overBox(p)) {
        // клик даёт сразу chunk прогресса, зажатие — непрерывный скан
        this.scanT = Math.min(1, this.scanT + 0.34);
        this.holding = true;
      }
      else if (this.state === 'wave') {
        // буст-выстрел: клик по роботу
        for (const en of this.enemies) {
          if (Math.hypot(en.view.x - p.x, en.view.y - p.y + 24) < 46 * (en.boss ? 1.8 : 1)) {
            en.hit(this.weapon().damage * 0.5);
            if (en.dead) this.waveKilled++;
            break;
          }
        }
      }
    });
    cv.addEventListener('pointermove', e => { this.pointer = toCanvas(e); });
    window.addEventListener('pointerup', () => { this.holding = false; });
  },

  overBox(p) {
    if (!this.box) return false;
    const b = this.box.view.position;
    return Math.hypot(b.x - p.x, b.y - 40 - p.y) < 70;
  },

  // ---- главный тик ----

  update(dt) {
    updateTweens(dt);
    switch (this.state) {
      case 'belt': {
        this.box.x -= CONVEYOR.speed * dt;
        this.syncBox();
        if (this.box.x <= CONVEYOR.to[0]) { this.box.x = CONVEYOR.to[0]; this.syncBox(); this.state = 'scan'; this.scanT = 0; }
        break;
      }
      case 'scan': {
        if (this.holding && this.overBox(this.pointer)) {
          this.scanT = Math.min(1, this.scanT + dt / 0.6);
          if (this.scanT >= 1) { this.holding = false; this.state = 'card'; this.ui.showCard(this.currentDef); }
        } else {
          this.scanT = Math.max(0, this.scanT - dt * 0.45);
        }
        this.syncScanFx();
        break;
      }
      case 'fly': {
        // полёт коробки в башню по дуге
        const f = this.flight;
        if (f && !f.view.destroyed) {
          const k = f.t;
          f.view.position.set(
            f.from.x + (f.target.x - f.from.x) * k,
            f.from.y + (f.target.y - f.from.y) * k - Math.sin(k * Math.PI) * 130,
          );
          f.view.rotation = Math.sin(k * Math.PI) * 0.35;
        }
        break;
      }
      case 'wave': {
        if (this.spawnLeft > 0) {
          this.spawnT -= dt;
          if (this.spawnT <= 0) { this.spawnT = this.wave.interval; this.spawnEnemy(); }
        }
        for (const e of [...this.enemies]) {
          if (e.update(dt)) {
            this.waveBroken++;
            e.destroy();
            this.ui.toast(Loc.t('crushed'));
          }
        }
        this.fireT += dt;
        const st = this.weapon();
        if (this.fireT >= st.interval) { this.fireT = 0; this.fire(); }
        this.updateShots(dt);
        // прицел орудия
        if (this.enemies.length && this.turret) {
          const e = this.enemies[0];
          const p = iso(e.world.x, e.world.y, 0.6);
          this.turret.rotation = Math.atan2(p.y - this.muzzlePos.y, p.x - this.muzzlePos.x);
        }
        if (this.spawnLeft === 0 && this.enemies.length === 0) this.endWave();
        break;
      }
      case 'finale_anim':
        this.updateFinale(dt);
        break;
    }
  },

  // посылка отсканирована → карточка закрыта → летит в башню
  placeBox() {
    this.state = 'fly';
    const n = this.scanned.length;
    const target = iso(0, 0, 2.1 + n * 0.55);
    const from = { ...this.box.view.position };
    const ring = this.box.ring;
    ring.clear();
    this.flight = { t: 0, from, target, view: this.box.view };
    tween(this.flight, { t: 1 }, 0.75, () => {
      const view = this.flight.view;
      view.destroy({ children: true });
      this.flight = null;
      this.box = null;
      this.scanned.push(this.currentDef);
      this.towerStats.dmg += this.currentDef.dmg;
      this.towerStats.rof += this.currentDef.rof;
      this.towerStats.rng += this.currentDef.rng;
      this.rebuildTower();
      this.spawnPop(target.x, target.y, false);

      const idx = this.boxIndex;
      this.boxIndex++;
      if (this.currentDef.type === 'final') { this.startFinale(); return; }
      if (WAVE_AFTER_BOX.includes(idx)) {
        this.state = 'tuner';
        this.ui.showTuner();
      } else {
        this.spawnBox();
      }
    }, t => t * t * (3 - 2 * t));
  },

  // мгновенная установка посылки в башню — для отладочных состояний ?shot=
  placeDirect() {
    this.currentDef = BOXES[this.boxIndex];
    this.scanned.push(this.currentDef);
    this.towerStats.dmg += this.currentDef.dmg;
    this.towerStats.rof += this.currentDef.rof;
    this.towerStats.rng += this.currentDef.rng;
    this.boxIndex++;
    this.rebuildTower();
  },

  skipToFinale() {
    if (this.state === 'finale_anim' || this.state === 'finale') return;
    if (this.box) { this.box.view.destroy({ children: true }); this.box = null; }
    for (const e of [...this.enemies]) e.destroy();
    this.startFinale();
  },

  reset() {
    for (const e of [...this.enemies]) e.destroy();
    this.layers.boxes.removeChildren().forEach(c => c.destroy({ children: true }));
    this.layers.shots.removeChildren().forEach(c => c.destroy({ children: true }));
    this.layers.fx.removeChildren().forEach(c => c.destroy({ children: true }));
    if (this.box) { this.box.view.destroy({ children: true }); this.box = null; }
    this.scanned = [];
    this.boxIndex = 0;
    this.waveIdx = 0;
    this.towerStats = { dmg: 0, rof: 0, rng: 0 };
    this.multipliers = { dmg: 1, rof: 1, rng: 1 };
    this.stats = { waves: [] };
    this.finaleShown = false;
    this.rocket = null;
    this.confetti = [];
    this.rebuildTower();
  },
};

