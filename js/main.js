// Точка входа: PixiJS → сцена → интерфейс
import { game } from './game.js';
import { ui } from './ui.js';

try {
  await game.init(document.getElementById('stage'));
  ui.bind(game);
  ui.applyLang();
  document.body.dataset.ready = '1';
} catch (err) {
  console.error(err);
  // деградация: игра не запустилась — показываем CV
  document.getElementById('stage').innerHTML =
    '<div class="boot-fail">Игровая сцена не загрузилась. Классическое CV — ниже на странице.</div>';
  document.getElementById('cv').scrollIntoView();
}
