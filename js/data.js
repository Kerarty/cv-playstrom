// Данные отклика: посылки, волны, тюнер
export const C = {
  // дневное небо и остров
  skyTop: 0x8fd3ff, skyBottom: 0xf2f9ff,
  ground: 0xf6ecd4, groundSide: 0xd9c49c, gridLine: 0xd8c8a6,
  cream: 0xf6ecd4, creamDark: 0xe8d9b8,
  // картон и упаковка
  cardboard: 0xc99a5f, cardboardDark: 0xa37945, cardboardTop: 0xe0b57e,
  tape: 0xfff6e0,
  // магазин
  charcoal: 0x4a4258, charcoalDark: 0x3a3448,
  door: 0x6b5136, glass: 0xbfe6ff,
  // бренды
  orange: 0xff9426, orangeDark: 0xe0760f,
  blue: 0x3ab7ff, blueDark: 0x1f86c9, blueLight: 0x8ad4ff,
  red: 0xff5347,
  white: 0xffffff,
  ink: 0x33291c,
};

// типы башен: по посылке игрок ставит башню на площадку у маршрута
// cannon — пушка, sniper — снайпер (дальний бой), minigun — скорострельная,
// mortar — мортира (тяжёлая), slow — дрон-замедлитель, amp — усилитель соседей
export const BOXES = [
  { id: 'about',     type: 'weapon',  kind: 'cannon',  dmg: 1.0, rof: 0.2,  rng: 0.5 },
  { id: 'edu',       type: 'upgrade', kind: 'amp',     dmg: 0,   rof: 0,    rng: 0 },
  { id: 'design',    type: 'weapon',  kind: 'cannon',  dmg: 1.2, rof: 0.2,  rng: 0.5 },
  { id: 'balance',   type: 'weapon',  kind: 'sniper',  dmg: 0.9, rof: 0.15, rng: 2.5 },
  { id: 'code',      type: 'weapon',  kind: 'minigun', dmg: 0.5, rof: 0.8,  rng: 0.3 },
  { id: 'eridor',    type: 'floor',   kind: 'mortar',  dmg: 1.1, rof: 0.05, rng: 0.3 },
  { id: 'gdd',       type: 'floor',   kind: 'mortar',  dmg: 1.0, rof: 0.05, rng: 0.4 },
  { id: 'series',    type: 'helper',  kind: 'slow',    dmg: 0,   rof: 0,    rng: 0 },
  { id: 'playables', type: 'helper',  kind: 'slow',    dmg: 0,   rof: 0,    rng: 0 },
  { id: 'contacts',  type: 'final',   kind: null,      dmg: 0,   rof: 0,    rng: 0 },
];

// после какой посылки (индекс с нуля) открывается тюнер перед волной
export const WAVE_AFTER_BOX = [2, 5, 8];

export const WAVES = [
  { id: 'w1', drones: 6, crawlers: 0, swarm: 0, boss: false, hpMult: 1.0, speed: 1.2, interval: 1.0 },
  { id: 'w2', drones: 4, crawlers: 2, swarm: 6, boss: false, hpMult: 1.6, speed: 1.4, interval: 0.7 },
  { id: 'w3', drones: 6, crawlers: 2, swarm: 8, boss: true,  hpMult: 2.2, speed: 1.5, interval: 0.6 },
];

// маршрут роботов QuickBox — от спавна до двери Rocket Post
export const PATH = [
  [-10.5, -4.2],
  [-6.0, -2.0],
  [-2.0, -4.0],
  [2.0, -3.0],
  [4.5, 0.0],
  [2.5, 2.8],
  [0.0, 2.8],
];

// площадки для башен вдоль маршрута
export const SPOTS = [
  [-8.8, -2.0],
  [-4.0, -0.6],
  [-3.4, -5.2],
  [0.4, -4.6],
  [4.0, -4.2],
  [5.8, -1.6],
  [5.2, 2.2],
  [0.4, 4.4],
  [-2.8, 3.8],
  [-6.2, 1.8],
];

export const CONVEYOR = { from: [11.5, 3.0], to: [4.0, 3.0], speed: 2.4 };

// ---- математика башен и тюнера (слой B) ----

export function towerStats(def, m) {
  if (def.kind === 'slow') return { dmg: 0, interval: 1, range: 3.4, slow: 0.55 };
  if (def.kind === 'amp') return { dmg: 0, interval: 1, range: 3.0, buff: 1.3 };
  const dmg = (2 + def.dmg * 2.2) * (1 + 0.4 * m.dmg);
  const interval = Math.max(0.18, (0.9 / (1 + def.rof)) / (1 + 0.4 * m.rof));
  const range = (4.2 + def.rng * 2) * (1 + 0.25 * m.rng);
  return { dmg, interval, range };
}

// суммарный DPS арсенала — для предпросмотра тюнера
export function arsenalDps(towers, m) {
  let dps = 0, ranges = 0, n = 0;
  for (const t of towers) {
    if (t.def.kind === 'slow' || t.def.kind === 'amp') continue;
    const s = towerStats(t.def, m);
    dps += s.dmg / s.interval;
    ranges += s.range;
    n++;
  }
  return { dps, avgRange: n ? ranges / n : 0, count: towers.length };
}

// длина мирового пути
export function pathLength() {
  let len = 0;
  for (let i = 1; i < PATH.length; i++) {
    len += Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]);
  }
  return len;
}

// прогноз прорывов: сколько роботов дойдёт при текущем DPS
export function forecastBreaks(wave, dps) {
  const pathLen = pathLength();
  const avgSpeed = wave.speed * 1.35;
  const totalTime = pathLen / avgSpeed;
  const inRange = Math.min(1, 0.35 + 0.1 * arsenalCountGuess(wave));
  const totalHp = (wave.drones * 6 + wave.crawlers * 20 + wave.swarm * 4 + (wave.boss ? 60 : 0)) * wave.hpMult;
  const totalRobots = wave.drones + wave.crawlers + wave.swarm + (wave.boss ? 1 : 0);
  const avgHp = totalHp / totalRobots;
  const kills = (dps * totalTime * inRange) / avgHp;
  return Math.max(0, Math.round(totalRobots - kills));
}

// грубая оценка числа башен к моменту волны
function arsenalCountGuess(wave) {
  const id = wave.id;
  return id === 'w1' ? 3 : id === 'w2' ? 6 : 9;
}
