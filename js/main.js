// Точка входа: PixiJS → сцена → интерфейс
import { game } from './game.js';
import { ui } from './ui.js';

try {
  // игровой шрифт нужен и DOM, и надписи на канвасе (вывеска)
  try { await Promise.all([document.fonts.load('900 26px Nunito'), document.fonts.load('800 16px Nunito')]); } catch {}
  await game.init(document.getElementById('stage'));
  ui.bind(game);
  ui.applyLang();
  document.body.dataset.ready = '1';

  // отладочные состояния для скриншотов: ?shot=tuner | wave | finale
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    document.getElementById('intro').classList.add('hidden');
    document.getElementById('hint').textContent = '';
    if (shot === 'tuner') {
      for (let i = 0; i < 3; i++) game.placeDirect();
      game.ui.showTuner();
    } else if (shot === 'wave') {
      for (let i = 0; i < 3; i++) game.placeDirect();
      game.multipliers = { dmg: 1.4, rof: 1.4, rng: 0.2 };
      game.startWave();
      // прокручиваю игровое время вручную: headless не качает rAF-тикер
      for (let i = 0; i < 18; i++) game.update(0.1);
    } else if (shot === 'finale') {
      for (let i = 0; i < 5; i++) game.placeDirect();
      game.stats.waves.push({ killed: 12, broken: 1, total: 13, dps: 7.7 });
      game.startFinale();
      for (let i = 0; i < 30; i++) game.updateFinale(0.1);
    }
  }
} catch (err) {
  console.error(err);
  // деградация: игра не запустилась — показываем CV
  document.getElementById('stage').innerHTML =
    '<div class="boot-fail">Игровая сцена не загрузилась. Классическое CV — ниже на странице.</div>';
  document.getElementById('cv').scrollIntoView();
}
