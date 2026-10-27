// PixiJS-сцена: изометрический Rocket Post, конвейер, площадки башен, роботы QuickBox
import * as PIXI from './vendor/pixi.min.mjs';
import { C, BOXES, WAVES, WAVE_AFTER_BOX, PATH, SPOTS, CONVEYOR, ROAD_HALF, DECOR_TREES, DECOR_BUSHES, towerStats } from './data.js';
import { Loc } from './loc.js';

// ---- изометрия: мир (x, y, z) → экран ----
const OX = 640, OY = 330, SX = 44, SY = 22, ZS = 38;
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
    this.kind = kind;
    this.hp = hp; this.maxHp = hp;
    this.speed = speed;
    this.boss = boss;
    this.seg = 0;
    this.world = { x: PATH[0][0], y: PATH[0][1] };
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
    // под замедлением — голубой оттенок
    this.body.tint = game.slowAt(this.world.x, this.world.y) < 1 ? 0xbfe6ff : 0xffffff;
  }

  update(dt) {
    const slow = game.slowAt(this.world.x, this.world.y);
    const target = PATH[this.seg + 1];
    if (!target) return true; // дошёл до магазина
    const dx = target[0] - this.world.x, dy = target[1] - this.world.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * slow * dt;
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

// ---- снаряд ----
class Projectile {
  constructor(from, target, dmg) {
    this.target = target;
    this.dmg = dmg;
    this.vx = 0; this.vy = 0;
    this.view = new PIXI.Graphics();
    this.view.circle(0, 0, 8).fill(C.orange);
    this.view.circle(0, 0, 4).fill(C.white);
    this.view.position.set(from.x, from.y);
    game.layers.shots.addChild(this.view);
  }

  update(dt) {
    let tx, ty;
    if (this.target && !this.target.dead) {
      const p = iso(this.target.world.x, this.target.world.y, 0.6);
      tx = p.x; ty = p.y;
    } else {
      tx = this.view.x + this.vx * dt; ty = this.view.y + this.vy * dt;
    }
    const dx = tx - this.view.x, dy = ty - this.view.y;
    const dist = Math.hypot(dx, dy);
    const speed = 560;
    if (this.target && !this.target.dead && dist < 24) {
      this.target.hit(this.dmg);
      if (this.target.dead) game.waveKilled++;
      this.destroy();
      return;
    }
    if (dist > 0.001) {
      this.view.x += dx / dist * speed * dt;
      this.view.y += dy / dist * speed * dt;
      if (!this.target || this.target.dead) { this.vx = dx / dist * speed; this.vy = dy / dist * speed; }
    }
    if (this.view.x < -50 || this.view.x > 1330 || this.view.y < -50 || this.view.y > 770) this.destroy();
  }

  destroy() {
    this.view.destroy({ children: true });
    const i = game.shots.indexOf(this);
    if (i >= 0) game.shots.splice(i, 1);
  }
}

// ---- башня на площадке ----
class Tower {
  constructor(spotIdx, def) {
    this.spotIdx = spotIdx;
    this.def = def;
    this.kind = def.kind;
    this.level = 1;
    this.fireT = Math.random() * 0.4;
    this.target = null;
    this.buildView();
  }

  stats() {
    const s = towerStats(this.def, game.multipliers);
    const lvl = 1 + 0.35 * (this.level - 1);
    const lvlRange = 1 + 0.1 * (this.level - 1);
    return { ...s, dmg: s.dmg * lvl, range: s.range * lvlRange };
  }

  buildView() {
    const p = iso(SPOTS[this.spotIdx][0], SPOTS[this.spotIdx][1], 0);
    this.view = new PIXI.Container();
    this.view.position.set(p.x, p.y);
    const g = new PIXI.Graphics();
    const pedestal = () => {
      g.circle(0, 0, 24).fill(C.charcoal);
      g.circle(0, 0, 18).fill(C.charcoalDark);
    };
    this.turret = new PIXI.Container();
    const tg = new PIXI.Graphics();
    switch (this.kind) {
      case 'sniper':
        pedestal();
        tg.rect(0, -3, 44, 5).fill(C.blue);
        tg.circle(0, 0, 12).fill(C.blueDark);
        tg.circle(0, 0, 7).fill(C.white);
        break;
      case 'minigun':
        pedestal();
        tg.rect(0, -9, 30, 6).fill(C.charcoal);
        tg.rect(0, 3, 30, 6).fill(C.charcoal);
        tg.circle(0, 0, 11).fill(C.orangeDark);
        tg.circle(0, 0, 6).fill(C.orange);
        break;
      case 'mortar':
        g.circle(0, 0, 27).fill(C.charcoal);
        g.circle(0, 0, 21).fill(C.charcoalDark);
        tg.circle(0, 0, 14).fill(C.orangeDark);
        tg.circle(0, 0, 9).fill(C.charcoal);
        break;
      case 'slow':
        g.circle(0, 0, 22).fill(C.blueDark);
        g.circle(0, 0, 15).fill(C.blue);
        g.circle(0, 0, 7).fill(C.white);
        this.ring = new PIXI.Graphics();
        this.ring.ellipse(0, 0, 3.4 * SX, 3.4 * SY).stroke({ width: 2, color: C.blue, alpha: 0.35 });
        this.view.addChildAt(this.ring, 0);
        break;
      case 'amp':
        g.circle(0, 0, 22).fill(C.orangeDark);
        g.circle(0, 0, 15).fill(C.orange);
        g.poly([0, -12, 3.5, -3.5, 12, 0, 3.5, 3.5, 0, 12, -3.5, 3.5, -12, 0, -3.5, -3.5]).fill(C.white);
        this.ring = new PIXI.Graphics();
        this.ring.ellipse(0, 0, 3.0 * SX, 3.0 * SY).stroke({ width: 2, color: C.orange, alpha: 0.4 });
        this.view.addChildAt(this.ring, 0);
        break;
      default: // cannon
        pedestal();
        tg.rect(0, -4, 34, 8).fill(C.charcoal);
        tg.circle(0, 0, 13).fill(C.orange);
        tg.circle(0, 0, 6).fill(C.white);
    }
    this.turret.addChild(tg);
    const flash = new PIXI.Graphics();
    flash.poly([0, -12, 3.5, -3.5, 12, 0, 3.5, 3.5, 0, 12, -3.5, 3.5, -12, 0, -3.5, -3.5]).fill(C.orange);
    flash.position.set(40, 0);
    flash.visible = false;
    this.flash = flash;
    this.turret.addChild(flash);
    this.pips = new PIXI.Graphics();
    this.view.addChild(g, this.turret, this.pips);
    this.drawPips();
    game.layers.towers.addChild(this.view);
  }

  drawPips() {
    this.pips.clear();
    for (let i = 0; i < this.level - 1; i++) {
      this.pips.poly([
        -8 + i * 9, -52, -5 + i * 9, -45, 0 + i * 9, -52, -5 + i * 9, -40,
      ]).fill(C.orange);
    }
  }

  // улучшение: уровень вверх, визуально подрастает
  upgrade() {
    this.level++;
    this.drawPips();
    tween(this.turret, { scaleX: 1 + 0.12 * (this.level - 1), scaleY: 1 + 0.12 * (this.level - 1) }, 0.3);
  }

  update(dt) {
    const st = this.stats();
    if (this.kind === 'slow' || this.kind === 'amp') {
      if (this.ring) this.ring.alpha = 0.6 + 0.4 * Math.sin(performance.now() / 300 + this.spotIdx);
      return;
    }
    this.fireT += dt;
    if (this.fireT < st.interval) return;
    let best = null, bestD = Infinity;
    for (const e of game.enemies) {
      const d = Math.hypot(e.world.x - SPOTS[this.spotIdx][0], e.world.y - SPOTS[this.spotIdx][1]);
      if (d < bestD && d <= st.range) { bestD = d; best = e; }
    }
    if (!best) return;
    this.fireT = 0;
    const muzzle = iso(SPOTS[this.spotIdx][0], SPOTS[this.spotIdx][1], 0.75);
    const aim = iso(best.world.x, best.world.y, 0.6);
    this.turret.rotation = Math.atan2(aim.y - muzzle.y, aim.x - muzzle.x);
    // усилители рядом добавляют урона
    let buff = 1;
    for (const t of game.towers) {
      if (t.kind === 'amp' && Math.hypot(SPOTS[t.spotIdx][0] - SPOTS[this.spotIdx][0], SPOTS[t.spotIdx][1] - SPOTS[this.spotIdx][1]) <= t.stats().range) buff *= 1.3;
    }
    game.shots.push(new Projectile(muzzle, best, st.dmg * buff));
    this.flash.visible = true;
    tween(this.flash, { alpha: 0 }, 0.12, () => { this.flash.visible = false; this.flash.alpha = 1; });
  }

  destroy() {
    this.view.destroy({ children: true });
    const i = game.towers.indexOf(this);
    if (i >= 0) game.towers.splice(i, 1);
  }
}

// ---- состояние игры ----
export const game = {
  state: 'intro', // intro | belt | scan | card | build | fly | tuner | wave | finale_anim | finale
  app: null,
  layers: {},
  enemies: [],
  towers: [],
  shots: [],
  scanned: [],
  boxIndex: 0,
  waveIdx: 0,
  box: null,
  scanT: 0,
  holding: false,
  currentDef: null,
  flight: null,
  points: 0,
  unlocked: new Set(),
  kindDefs: {},
  stats: { waves: [] },
  multipliers: { dmg: 1, rof: 1, rng: 1 },
  spawnLeft: 0,
  spawnT: 0,
  wave: null,
  ui: null,
  rocket: null,
  finaleT: 0,
  confetti: [],
  spotsView: null,

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
    L.spots = new PIXI.Container();
    L.belt = new PIXI.Container();
    L.store = new PIXI.Container();
    L.towers = new PIXI.Container();
    L.boxes = new PIXI.Container();
    L.enemiesLayer = new PIXI.Container();
    L.shots = new PIXI.Container();
    L.fx = new PIXI.Container();
    stage.addChild(L.bg, L.ground, L.marks, L.spots, L.belt, L.store, L.towers, L.boxes, L.enemiesLayer, L.shots, L.fx);

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

    // дорога: широкая песчаная лента со скруглёнными поворотами
    const road = new PIXI.Graphics();
    const w = ROAD_HALF * 48;
    for (let pass = 0; pass < 2; pass++) {
      const color = pass === 0 ? C.roadEdge : C.road;
      const wPass = pass === 0 ? w + 5 : w;
      for (let i = 0; i < PATH.length - 1; i++) {
        const a = iso(...PATH[i]);
        const b = iso(...PATH[i + 1]);
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const px = -dy / d * wPass, py = dx / d * wPass;
        road.poly([a.x + px, a.y + py, b.x + px, b.y + py, b.x - px, b.y - py, a.x - px, a.y - py]).fill(color);
      }
      for (const [x, y] of PATH) {
        const p = iso(x, y);
        road.circle(p.x, p.y, wPass).fill(color);
      }
    }

    L.ground.addChild(g);
    L.ground.addChild(road);

    // стрелки маршрута роботов — цепочка к магазину
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
        ]).fill({ color: C.orange, alpha: 0.55 });
      }
    }
    L.marks.addChild(m);

    // площадки башен — каменные платформы
    this.spotsView = new PIXI.Graphics();
    this.drawSpots(0);
    L.spots.addChild(this.spotsView);

    // декор: деревья и кусты по краям
    const decor = new PIXI.Graphics();
    for (const [x, y] of DECOR_TREES) {
      const p = iso(x, y, 0);
      decor.ellipse(p.x, p.y + 2, 26, 12).fill({ color: 0x000000, alpha: 0.15 });
      decor.circle(p.x, p.y - 26, 24).fill(C.treeDark);
      decor.circle(p.x - 6, p.y - 32, 16).fill(C.tree);
      decor.circle(p.x + 8, p.y - 30, 12).fill(C.treeLight);
    }
    for (const [x, y] of DECOR_BUSHES) {
      const p = iso(x, y, 0);
      decor.ellipse(p.x, p.y + 2, 18, 8).fill({ color: 0x000000, alpha: 0.12 });
      decor.circle(p.x - 8, p.y - 6, 10).fill(C.tree);
      decor.circle(p.x + 4, p.y - 8, 12).fill(C.treeLight);
      decor.circle(p.x + 12, p.y - 4, 8).fill(C.tree);
    }
    // штабели коробок у конвейера
    for (const [x, y] of [[10.6, 2.1], [11.1, 1.3]]) {
      const p = iso(x, y, 0);
      decor.roundRect(p.x - 20, p.y - 34, 40, 34, 5).fill(C.cardboard);
      decor.roundRect(p.x - 20, p.y - 34, 40, 10, 5).fill(C.cardboardTop);
      decor.rect(p.x - 4, p.y - 34, 8, 34).fill(C.tape);
    }
    L.spots.addChild(decor);

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
  },

  // площадки: каменные платформы; в режиме стройки пульсируют
  drawSpots(pulseK) {
    const v = this.spotsView;
    v.clear();
    const occupied = new Set(this.towers.map(t => t.spotIdx));
    for (let i = 0; i < SPOTS.length; i++) {
      if (occupied.has(i)) continue;
      const p = iso(SPOTS[i][0], SPOTS[i][1], 0.02);
      v.ellipse(p.x, p.y + 5, 38, 19).fill({ color: 0x000000, alpha: 0.18 });
      v.ellipse(p.x, p.y, 38, 19).fill(C.charcoal);
      v.ellipse(p.x, p.y - 3, 34, 17).fill(C.charcoalDark);
      v.ellipse(p.x, p.y - 4, 26, 13).fill(C.orangeDark);
      v.ellipse(p.x, p.y - 4, 18, 9).fill(C.orange);
      const a = 0.3 + pulseK * 0.7;
      if (pulseK > 0.02) v.ellipse(p.x, p.y - 4, 30, 15).stroke({ width: 3, color: C.orange, alpha: a });
    }
  },

  // ---- посылки ----

  spawnBox() {
    this.currentDef = BOXES[this.boxIndex];
    const li = (x, y, z = 0) => { const p = iso(x, y, z); return { x: p.x - OX, y: p.y - OY }; };
    const lpoly = (gr, pts, color, alpha = 1) => gr.poly(pts.map(p => [p.x, p.y]).flat()).fill({ color, alpha });
    const libox = (gr, x0, y0, x1, y1, z0, z1, top, left, right) => {
      lpoly(gr, [li(x1, y0, z1), li(x1, y1, z1), li(x1, y1, z0), li(x1, y0, z0)], right);
      lpoly(gr, [li(x0, y1, z1), li(x1, y1, z1), li(x1, y1, z0), li(x0, y1, z0)], left);
      lpoly(gr, [li(x0, y0, z1), li(x1, y0, z1), li(x1, y1, z1), li(x0, y1, z1)], top);
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
      ring.rect(-46, -132, 92, 9).fill({ color: 0x000000, alpha: 0.35 });
      ring.rect(-44, -130, 88 * this.scanT, 5).fill(C.orange);
      const half = 0.42;
      const li = (x, y, z = 0) => { const p = iso(x, y, z); return { x: p.x - OX, y: p.y - OY }; };
      const pts = [li(-half, -half, 0.72), li(half, -half, 0.72), li(half, half, 0.72), li(-half, half, 0.72)]
        .map(q => [q.x, q.y]);
      ring.poly(pts.flat()).stroke({ width: 3, color: C.orange, alpha: 0.4 + 0.6 * this.scanT });
      const tw = performance.now() / 1000;
      for (let i = 0; i < 3; i++) {
        const a = tw * 2 + (i * Math.PI * 2) / 3;
        ring.circle(Math.cos(a) * 55, -34 + Math.sin(a) * 40, 4).fill({ color: C.white, alpha: 0.55 + 0.45 * Math.sin(tw * 12 + i) });
      }
    }
  },

  // ---- очки, башни ----

  placeTower(spotIdx, def) {
    this.towers.push(new Tower(spotIdx, def));
    const p = iso(SPOTS[spotIdx][0], SPOTS[spotIdx][1], 0.3);
    this.spawnPop(p.x, p.y - 10, false);
    this.drawSpots(0);
  },

  slowAt(x, y) {
    for (const t of this.towers) {
      if (t.kind !== 'slow') continue;
      if (Math.hypot(SPOTS[t.spotIdx][0] - x, SPOTS[t.spotIdx][1] - y) <= 3.4) return 0.55;
    }
    return 1;
  },

  arsenalDps() {
    let dps = 0;
    for (const t of this.towers) {
      if (t.kind === 'slow' || t.kind === 'amp') continue;
      const s = t.stats();
      dps += s.dmg / s.interval;
    }
    return dps;
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
    else if (i % 3 === 0 && i / 3 < w.drones) { kind = 'drone'; hp = 6; speed = 1.5; scale = 0.9; }
    else if (i % 3 === 1 && i / 3 < w.crawlers) { kind = 'crawler'; hp = 20; speed = 0.75; scale = 1.35; }
    else { kind = 'swarm'; hp = 4; speed = 1.9; scale = 0.7; }
    hp *= w.hpMult;
    this.enemies.push(new Enemy(this.layers, w, kind, hp, speed * w.speed, scale, boss));
    this.spawnLeft--;
  },

  endWave() {
    this.stats.waves.push({
      killed: this.waveKilled,
      broken: this.waveBroken,
      total: this.waveKilled + this.waveBroken,
      dps: Math.round(this.arsenalDps() * 10) / 10,
    });
    this.waveIdx++;
    this.ui.waveDone();
    this.multipliers = { dmg: 1, rof: 1, rng: 1 };
    this.state = 'belt';
    this.spawnBox();
  },

  updateShots(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) this.shots[i].update(dt);
  },

  // поп-эффект: кольцо + искры
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

  // ---- финал ----

  startFinale() {
    this.state = 'finale_anim';
    this.finaleT = 0;
    this.ui.setHint('');
    if (this.box) { this.box.view.destroy({ children: true }); this.box = null; }
    const p = iso(0, 0, 2.6);
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
        this.scanT = Math.min(1, this.scanT + 0.34);
        this.holding = true;
      }
      else if (this.state === 'build') {
        // трата очка: площадка → меню выбора башни, своя башня → улучшение
        let hitSpot = -1, hitTower = null;
        for (let i = 0; i < SPOTS.length; i++) {
          if (this.towers.some(t => t.spotIdx === i)) continue;
          const sp = iso(SPOTS[i][0], SPOTS[i][1], 0);
          if (Math.hypot(sp.x - p.x, sp.y - p.y) < 42) { hitSpot = i; break; }
        }
        if (hitSpot < 0) {
          for (const t of this.towers) {
            if (Math.hypot(t.view.x - p.x, t.view.y - p.y + 10) < 46) { hitTower = t; break; }
          }
        }
        if (hitSpot >= 0) {
          this.padMenu(hitSpot, e.clientX + window.scrollX, e.clientY + window.scrollY);
        } else if (hitTower) {
          this.towerMenu(hitTower, e.clientX + window.scrollX, e.clientY + window.scrollY);
        } else {
          this.ui.hideBuildMenu();
        }
      }
      else if (this.state === 'wave') {
        for (const en of this.enemies) {
          if (Math.hypot(en.view.x - p.x, en.view.y - p.y + 24) < 46 * (en.boss ? 1.8 : 1)) {
            en.hit(this.nearestTowerDmg(en) * 0.5);
            if (en.dead) this.waveKilled++;
            break;
          }
        }
      }
    });
    cv.addEventListener('pointermove', e => { this.pointer = toCanvas(e); });
    window.addEventListener('pointerup', () => { this.holding = false; });
  },

  nearestTowerDmg(enemy) {
    let best = 2;
    for (const t of this.towers) {
      if (t.kind === 'slow' || t.kind === 'amp') continue;
      const d = Math.hypot(SPOTS[t.spotIdx][0] - enemy.world.x, SPOTS[t.spotIdx][1] - enemy.world.y);
      if (d <= t.stats().range) best = Math.max(best, t.stats().dmg);
    }
    return best;
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
          if (this.scanT >= 1) { this.holding = false; this.scanComplete(); }
        } else {
          this.scanT = Math.max(0, this.scanT - dt * 0.45);
        }
        this.syncScanFx();
        break;
      }
      case 'build': {
        this.drawSpots(0.5 + 0.5 * Math.sin(performance.now() / 240));
        break;
      }
      case 'fly': {
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
        for (const t of this.towers) t.update(dt);
        this.updateShots(dt);
        if (this.spawnLeft === 0 && this.enemies.length === 0) this.endWave();
        break;
      }
      case 'finale_anim':
        this.updateFinale(dt);
        break;
    }
  },

  // скан завершён: факт открыт, очко получено, тип башни разблокирован
  scanComplete() {
    this.scanT = 0;
    this.points++;
    const def = this.currentDef;
    this.scanned.push(def);
    this.boxIndex++;
    let isNew = false;
    if (def.kind && !this.kindDefs[def.kind]) {
      this.kindDefs[def.kind] = def;
      this.unlocked.add(def.kind);
      isNew = true;
    }
    this.state = 'card';
    this.ui.showCard(def, this.points, isNew);
  },

  // карточка прочитана → режим стройки: тратим очки или жмём «дальше»
  onCardOk() {
    if (this.currentDef.type === 'final') { this.startFinale(); return; }
    this.state = 'build';
    this.ui.setHint(Loc.t('hint_build'));
    this.ui.updatePoints(this.points);
    this.ui.setNext(true);
    this.drawSpots(0.5);
  },

  // клик по площадке в режиме стройки → меню выбора башни
  padMenu(spotIdx, pageX, pageY) {
    this.ui.showBuildMenu(pageX, pageY, {
      kinds: [...this.unlocked],
      points: this.points,
      onPick: kind => this.tryBuild(spotIdx, kind),
    });
  },

  // клик по своей башне → меню улучшения
  towerMenu(tower, pageX, pageY) {
    this.ui.showBuildMenu(pageX, pageY, {
      kinds: [],
      points: this.points,
      tower,
      onUpgrade: () => this.tryUpgrade(tower),
    });
  },

  tryBuild(spotIdx, kind) {
    if (this.points <= 0) { this.ui.toast(Loc.t('no_points')); return false; }
    this.spendPoint();
    this.state = 'fly';
    this.drawSpots(0);
    this.ui.hideBuildMenu();
    this.ui.updatePoints(this.points);
    const target = iso(SPOTS[spotIdx][0], SPOTS[spotIdx][1], 0.25);
    const from = { ...this.box.view.position };
    this.box.ring.clear();
    this.flight = { t: 0, from, target, view: this.box.view, spotIdx, kind };
    tween(this.flight, { t: 1 }, 0.7, () => {
      this.flight.view.destroy({ children: true });
      this.box = null;
      this.placeTower(this.flight.spotIdx, this.kindDefs[this.flight.kind]);
      this.spawnPop(iso(SPOTS[this.flight.spotIdx][0], SPOTS[this.flight.spotIdx][1], 0.3).x,
        iso(SPOTS[this.flight.spotIdx][0], SPOTS[this.flight.spotIdx][1], 0.3).y - 10, false);
      this.afterBox();
    }, t => t * t * (3 - 2 * t));
    return true;
  },

  tryUpgrade(tower) {
    if (this.points <= 0) { this.ui.toast(Loc.t('no_points')); return false; }
    this.spendPoint();
    this.state = 'fly';
    this.drawSpots(0);
    this.ui.hideBuildMenu();
    this.ui.updatePoints(this.points);
    const target = { x: tower.view.x, y: tower.view.y - 14 };
    const from = { ...this.box.view.position };
    this.box.ring.clear();
    this.flight = { t: 0, from, target, view: this.box.view, tower };
    tween(this.flight, { t: 1 }, 0.7, () => {
      this.flight.view.destroy({ children: true });
      this.box = null;
      this.flight.tower.upgrade();
      this.spawnPop(this.flight.target.x, this.flight.target.y, false);
      this.afterBox();
    }, t => t * t * (3 - 2 * t));
    return true;
  },

  spendPoint() {
    this.points--;
    this.ui.updatePoints(this.points);
  },

  // посылка потреблена: тюнер по расписанию или следующая коробка
  afterBox() {
    this.ui.setNext(false);
    const idx = this.boxIndex - 1;
    if (WAVE_AFTER_BOX.includes(idx)) {
      this.state = 'tuner';
      this.ui.showTuner();
    } else {
      this.spawnBox();
    }
  },

  // кнопка «следующая посылка»: копим очко дальше
  nextBox() {
    this.ui.hideBuildMenu();
    if (this.box) { this.box.view.destroy({ children: true }); this.box = null; }
    this.afterBox();
  },

  // мгновенное сканирование — для отладочных состояний ?shot=
  scanDirect() {
    this.currentDef = BOXES[this.boxIndex];
    this.scanned.push(this.currentDef);
    this.points++;
    if (this.currentDef.kind && !this.kindDefs[this.currentDef.kind]) {
      this.kindDefs[this.currentDef.kind] = this.currentDef;
      this.unlocked.add(this.currentDef.kind);
    }
    this.boxIndex++;
  },

  skipToFinale() {
    if (this.state === 'finale_anim' || this.state === 'finale') return;
    this.ui.setNext(false);
    this.ui.hideBuildMenu();
    if (this.box) { this.box.view.destroy({ children: true }); this.box = null; }
    for (const e of [...this.enemies]) e.destroy();
    this.startFinale();
  },

  reset() {
    for (const e of [...this.enemies]) e.destroy();
    for (const t of [...this.towers]) t.destroy();
    for (const s of [...this.shots]) s.destroy();
    this.layers.boxes.removeChildren().forEach(c => c.destroy({ children: true }));
    this.layers.fx.removeChildren().forEach(c => c.destroy({ children: true }));
    if (this.box) { this.box.view.destroy({ children: true }); this.box = null; }
    this.scanned = [];
    this.boxIndex = 0;
    this.waveIdx = 0;
    this.points = 0;
    this.unlocked = new Set();
    this.kindDefs = {};
    this.multipliers = { dmg: 1, rof: 1, rng: 1 };
    this.stats = { waves: [] };
    this.finaleShown = false;
    this.rocket = null;
    this.confetti = [];
    this.drawSpots(0);
    this.ui.updatePoints(0);
    this.ui.setNext(false);
    this.ui.setHint(Loc.t('hint_scan'));
  },
};
