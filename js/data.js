// Данные отклика: посылки, волны, тюнер
export const C = {
  bg1: 0x14101f, bg2: 0x241b38,
  cream: 0xede1cc, creamDark: 0xd8c8a8, creamShadow: 0xc4b294,
  cardboard: 0xc29e6f, cardboardDark: 0x96754d, cardboardTop: 0xd3b285,
  tape: 0xefe9d8,
  charcoal: 0x3a3442, charcoalDark: 0x2b2634,
  orange: 0xff8c26, orangeDark: 0xd96f14,
  blue: 0x38b6ff, blueDark: 0x1f86c9,
  red: 0xf2473f,
  white: 0xf4f1ea,
  ink: 0x2b2634,
};

// типы модулей: weapon — орудие, floor — этаж, helper — робот, upgrade — апгрейд, final — финал
export const BOXES = [
  { id: 'about',     type: 'weapon',  dmg: 1.0, rof: 0.2, rng: 0.5 },
  { id: 'edu',       type: 'upgrade', dmg: 0.2, rof: 0.2, rng: 0.5 },
  { id: 'design',    type: 'weapon',  dmg: 1.2, rof: 0.2, rng: 0.5 },
  { id: 'balance',   type: 'weapon',  dmg: 0.8, rof: 0.3, rng: 2.5 },
  { id: 'code',      type: 'weapon',  dmg: 0.5, rof: 0.8, rng: 0.3 },
  { id: 'eridor',    type: 'floor',   dmg: 0.4, rof: 0.1, rng: 0.3 },
  { id: 'gdd',       type: 'floor',   dmg: 0.3, rof: 0.1, rng: 0.3 },
  { id: 'series',    type: 'helper',  dmg: 0.2, rof: 0.5, rng: 0.3 },
  { id: 'playables', type: 'helper',  dmg: 0.3, rof: 0.4, rng: 0.4 },
  { id: 'contacts',  type: 'final',   dmg: 0,   rof: 0,   rng: 0 },
];

// после какой посылки (индекс с нуля) открывается тюнер перед волной
export const WAVE_AFTER_BOX = [2, 5, 8];

export const WAVES = [
  { id: 'w1', drones: 6, crawlers: 0, swarm: 0, boss: false, hpMult: 1.0, speed: 1.2, interval: 1.0 },
  { id: 'w2', drones: 4, crawlers: 2, swarm: 6, boss: false, hpMult: 1.6, speed: 1.4, interval: 0.7 },
  { id: 'w3', drones: 6, crawlers: 2, swarm: 8, boss: true,  hpMult: 2.2, speed: 1.5, interval: 0.6 },
];

// путь роботов в мировых координатах (iso: x вправо-вниз, y влево-вниз)
export const PATH = [
  [-9.5, -2.5],
  [-6.0, 0.5],
  [-3.0, 2.2],
  [0.8, 1.2],
  [0.0, -0.5],
];

export const CONVEYOR = { from: [11.5, 3.0], to: [4.0, 3.0], speed: 2.4 };

// ---- математика тюнера (слой B) ----

export function weaponStats(sumDmg, sumRof, sumRng, mD, mR, mG) {
  const damage = 2 + sumDmg * mD;
  const interval = Math.max(0.16, 0.9 / (1 + 0.35 * sumRof * mR));
  const range = 5 + sumRng * mG;
  return { damage, interval, range, dps: damage / interval };
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
export function forecastBreaks(wave, stats) {
  const pathLen = pathLength();
  const avgSpeed = wave.speed * 1.35;
  const totalTime = pathLen / avgSpeed;
  // доля пути в радиусе (грубая оценка по хорде)
  const inRange = Math.min(1, (stats.range * 2.2) / pathLen + 0.25);
  const totalHp = (wave.drones * 3 + wave.crawlers * 12 + wave.swarm * 2 + (wave.boss ? 60 : 0)) * wave.hpMult;
  const totalRobots = wave.drones + wave.crawlers + wave.swarm + (wave.boss ? 1 : 0);
  const avgHp = totalHp / totalRobots;
  const kills = (stats.dps * totalTime * inRange) / avgHp;
  return Math.max(0, Math.round(totalRobots - kills));
}
