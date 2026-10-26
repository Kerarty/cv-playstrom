// DOM-интерфейс: интро, карточки, тюнер с живой математикой, отчёт, финал
import { Loc } from './loc.js';
import { weaponStats, forecastBreaks } from './data.js';

const $ = id => document.getElementById(id);

export const ui = {
  game: null,

  bind(game) {
    this.game = game;
    game.ui = this;
    $('btnStart').disabled = false;
    $('btnStart').onclick = () => { this.hideIntro(); game.spawnBox(); };
    $('btnSkip').onclick = () => game.skipToFinale();
    $('btnCv').onclick = () => $('cv').scrollIntoView({ behavior: 'smooth' });
    $('btnLang').onclick = () => { Loc.toggle(); this.applyLang(); };
    $('btnOk').onclick = () => { $('card').classList.add('hidden'); game.placeBox(); };
    $('btnGo').onclick = () => {
      const m = this.readTuner();
      game.multipliers = m;
      $('tuner').classList.add('hidden');
      game.startWave();
      $('banner').textContent = game.wave.boss ? Loc.t('boss_name') : Loc.t('wave');
      this.showBanner();
    };
    $('btnAgain').onclick = () => { $('finale').classList.add('hidden'); game.reset(); game.spawnBox(); };
    $('btnToCv').onclick = () => $('cv').scrollIntoView({ behavior: 'smooth' });
    for (const id of ['sDmg', 'sRof', 'sRng']) {
      $(id).addEventListener('input', () => { this.lastSlider = id; this.updateTunerPreview(); });
    }
    this.applyLang();
  },

  applyLang() {
    $('btnLang').textContent = Loc.t('lang_btn');
    document.documentElement.lang = Loc.lang;
    document.title = Loc.t('title') + ' — ' + Loc.lang.toUpperCase();
    for (const el of document.querySelectorAll('[data-i]')) {
      el.textContent = Loc.t(el.dataset.i);
    }
    this.renderCv();
  },

  // ---- интро ----
  hideIntro() { $('intro').classList.add('hidden'); },

  // ---- подсказки ----
  setHint(text) { $('hint').textContent = text; },

  // ---- карточка факта ----
  showCard(def) {
    $('cardTitle').textContent = Loc.t(def.id + '_t');
    $('cardDesc').textContent = Loc.t(def.id + '_d');
    $('cardTags').textContent = Loc.t(def.id + '_g');
    $('btnOk').textContent = Loc.t('ok');
    $('card').classList.remove('hidden');
  },

  // ---- тюнер ----
  showTuner() {
    $('tunerTitle').textContent = Loc.t('tuner_title');
    $('tunerSub').textContent = Loc.t('tuner_sub');
    for (const [id, key] of [['lblDmg', 'stat_dmg'], ['lblRof', 'stat_rof'], ['lblRng', 'stat_rng']]) {
      $(id).textContent = Loc.t(key);
    }
    $('btnGo').textContent = Loc.t('rush');
    for (const id of ['sDmg', 'sRof', 'sRng']) $(id).value = 0;
    this.updateTunerPreview();
    $('tuner').classList.remove('hidden');
  },

  readTuner() {
    return { dmg: +$('sDmg').value, rof: +$('sRof').value, rng: +$('sRng').value };
  },

  updateTunerPreview() {
    const g = this.game;
    const m = this.readTuner();
    // бюджет 3 очка: при перерасходе откатываем последний тронутый слайдер
    if (m.dmg + m.rof + m.rng > 3 && this.lastSlider) {
      $(this.lastSlider).value = $(this.lastSlider).dataset.prev || 0;
    }
    for (const id of ['sDmg', 'sRof', 'sRng']) $(id).dataset.prev = $(id).value;

    const m2 = this.readTuner();
    const stats = weaponStats(g.towerStats.dmg, g.towerStats.rof, g.towerStats.rng,
      1 + 0.4 * m2.dmg, 1 + 0.4 * m2.rof, 1 + 0.4 * m2.rng);
    $('vDps').textContent = stats.dps.toFixed(1);
    $('vCoverage').textContent = Math.round(Math.min(100, stats.range / 17 * 100)) + '%';
    $('vForecast').textContent = '~' + forecastBreaks(g.wave ?? { drones: 6, crawlers: 0, swarm: 0, boss: false, hpMult: 1, speed: 1.2 }, stats);
    $('vPts').textContent = Loc.t('pts_left') + ': ' + (3 - m2.dmg - m2.rof - m2.rng);
  },

  // ---- баннеры и тосты ----
  showBanner() {
    const b = $('banner');
    b.classList.add('show');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.remove('show'), 1600);
  },

  waveDone() {
    const s = this.game.stats.waves.at(-1);
    $('banner').textContent = (s && s.broken === 0 ? Loc.t('wave_clean') : Loc.t('wave_done'))
      + '  ·  ' + Loc.t('delivered') + ' ' + (s ? s.killed : 0) + '/' + (s ? s.total : 0)
      + '  ·  DPS ' + (s ? s.dps : 0);
    this.showBanner();
  },

  toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), 1500);
  },

  // ---- финал и отчёт ----
  showFinale() {
    $('finaleTitle').textContent = Loc.t('finale_title');
    $('finaleSub').textContent = Loc.t('finale_sub');
    $('reportTitle').textContent = Loc.t('shift_report');
    $('timelineTitle').textContent = Loc.t('career_timeline');
    $('btnAgain').textContent = Loc.t('again');
    $('btnToCv').textContent = Loc.t('tocv');

    const rep = $('reportBody');
    rep.innerHTML = '';
    for (const [i, w] of this.game.stats.waves.entries()) {
      const row = document.createElement('div');
      row.className = 'rep-row';
      row.innerHTML = `<span>${Loc.t('wave')} ${i + 1}</span><span>${Loc.t('delivered')}: ${w.killed}/${w.total}</span><span>${w.broken ? '⚠ ' + w.broken : '★'}</span><span>DPS ${w.dps}</span>`;
      rep.appendChild(row);
    }

    const tl = $('timelineBody');
    tl.innerHTML = '';
    for (const def of this.game.scanned) {
      const item = document.createElement('div');
      item.className = 'tl-item';
      item.innerHTML = `<b>${Loc.t(def.id + '_t')}</b><span>${Loc.t(def.id + '_g')}</span>`;
      tl.appendChild(item);
    }

    $('finale').classList.remove('hidden');
  },

  // ---- секция классического CV ----
  renderCv() {
    $('cv').innerHTML = `
      <div class="cv-wrap">
        <h2>${Loc.t('justcv')}</h2>
        <div class="cv-grid">
          <div>
            <h3>Ярослав Кукар</h3>
            <p class="cv-role">Game Designer</p>
            <p>${Loc.t('about_d')}</p>
            <h4>${Loc.t('edu_t')}</h4>
            <p>${Loc.t('edu_d')}</p>
            <h4>${Loc.t('contacts_t')}</h4>
            <p>
              <a href="tel:+375447838489">+375 44 783 84 89</a> ·
              <a href="mailto:kukar.y@gmail.com">kukar.y@gmail.com</a> ·
              <a href="https://github.com/Kerarty" target="_blank" rel="noopener">github.com/Kerarty</a>
            </p>
            <p><a class="btn ghost" href="docs/CV_Yaroslav.pdf" target="_blank" rel="noopener">PDF</a></p>
          </div>
          <div>
            <h4>${Loc.t('design_t')} · ${Loc.t('balance_t')} · ${Loc.t('code_t')}</h4>
            <p>${Loc.t('design_g')} · ${Loc.t('balance_g')} · ${Loc.t('code_g')}</p>
            <h4>${Loc.t('eridor_t')}</h4>
            <p>${Loc.t('eridor_d')}</p>
            <h4>${Loc.t('gdd_t')}</h4>
            <p>${Loc.t('gdd_d')}</p>
            <h4>${Loc.t('series_t')}</h4>
            <p>${Loc.t('series_d')}</p>
            <h4>${Loc.t('playables_t')}</h4>
            <p>${Loc.t('playables_d')}</p>
          </div>
        </div>
      </div>`;
  },
};
