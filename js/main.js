// Точка входа: PixiJS → сцена → интерфейс
import { game } from './game.js';
import { ui } from './ui.js';
import { BOXES } from './data.js';
import { Loc } from './loc.js';

try {
  // игровой шрифт нужен и DOM, и надписи на канвасе (вывеска)
  try { await Promise.all([document.fonts.load('900 26px Nunito'), document.fonts.load('800 16px Nunito')]); } catch {}
  await game.init(document.getElementById('stage'));
  ui.bind(game);
  ui.applyLang();
  document.body.dataset.ready = '1';

  // отладочные состояния для скриншотов: ?shot=tuner | wave | build | finale | cv
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    document.getElementById('intro').classList.add('hidden');
    document.getElementById('hint').textContent = '';
    const stage3 = () => {
      for (let i = 0; i < 3; i++) game.scanDirect();
      // дальние от спавна площадки — роботы дойдут до кадра живыми
      game.placeTower(9, game.scanned[0]);
      game.placeTower(7, game.scanned[1]);
      game.placeTower(6, game.scanned[2]);
      game.towers[1].upgrade(); // показываем уровень на башне
    };
    if (shot === 'tuner') {
      stage3();
      game.ui.showTuner();
    } else if (shot === 'wave') {
      stage3();
      game.multipliers = { dmg: 1.4, rof: 1.4, rng: 0.2 };
      game.startWave();
      // прокручиваю игровое время вручную: headless не качает rAF-тикер
      for (let i = 0; i < 34; i++) game.update(0.1);
    } else if (shot === 'build') {
      stage3();
      game.scanDirect();
      game.currentDef = BOXES[game.boxIndex - 1];
      game.points = 1;
      game.state = 'build';
      game.ui.updatePoints(1);
      game.ui.setNext(true);
      game.ui.setHint(Loc.t('hint_build'));
      game.drawSpots(0.5);
      game.ui.showBuildMenu(430, 300, { kinds: [...game.unlocked], points: 1, onPick: () => {} });
    } else if (shot === 'finale') {
      for (let i = 0; i < 5; i++) { game.scanDirect(); game.placeTower(i, game.scanned[i]); }
      game.stats.waves.push({ killed: 12, broken: 1, total: 13, dps: 7.7 });
      game.startFinale();
      for (let i = 0; i < 30; i++) game.updateFinale(0.1);
    } else if (shot === 'cv') {
      document.getElementById('game').style.display = 'none';
    }
  }
} catch (err) {
  console.error(err);
  // деградация: игра не запустилась — показываем CV
  document.getElementById('stage').innerHTML =
    '<div class="boot-fail">Игровая сцена не загрузилась. Классическое CV — ниже на странице.</div>';
  document.getElementById('cv').scrollIntoView();
}
