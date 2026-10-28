// DOM-интерфейс: интро, карточки, тюнер с живой математикой, отчёт, финал, CV
import { Loc } from './loc.js';
import { arsenalDps, forecastBreaks, towerStats, BOXES } from './data.js';

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
    $('btnOk').onclick = () => { $('card').classList.add('hidden'); game.onCardOk(); };
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
    $('btnNext').onclick = () => game.nextBox();
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

  // ---- подсказки и HUD очков ----
  setHint(text) { $('hint').textContent = text; },

  updatePoints(n) {
    const chip = $('pointsChip');
    chip.textContent = '★ ' + n;
    chip.classList.toggle('dim', n <= 0);
  },

  setNext(visible) {
    $('btnNext').classList.toggle('hidden', !visible);
  },

  // ---- меню башни у площадки (в духе kingdom rush) ----
  showBuildMenu(pageX, pageY, opts) {
    const menu = $('buildMenu');
    menu.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'bm-title';
    const info = document.createElement('div');
    info.className = 'bm-info';
    info.textContent = Loc.t('points') + ': ' + opts.points;

    if (opts.tower) {
      // улучшение: показываем прирост характеристик уровень в уровень
      const t = opts.tower;
      title.textContent = Loc.t('tw_' + t.kind) + ' · ' + Loc.t('twr_' + t.kind);
      const now = t.stats();
      const dps = s => (s.dmg / s.interval).toFixed(1);
      info.textContent = t.kind === 'slow' || t.kind === 'amp'
        ? Loc.t('twd_' + t.kind)
        : `${Loc.t('next_dps')} ${dps(now)} → ${dps(t.nextStats())} · ${Loc.t('points')}: ${opts.points}`;
      menu.appendChild(title);
      menu.appendChild(info);
      const btn = document.createElement('button');
      btn.className = 'bm-item';
      btn.disabled = opts.points <= 0;
      btn.innerHTML = `<span class="bm-name">${Loc.t('menu_upgrade')} ${t.level + 1}<small>+35% ${Loc.t('stat_dmg_s').toLowerCase()} · +10% ${Loc.t('stat_rng_s').toLowerCase()}</small></span><span class="bm-cost">★1</span>`;
      btn.onclick = () => { this.hideBuildMenu(); opts.onUpgrade(); };
      menu.appendChild(btn);
    } else {
      title.textContent = Loc.t('menu_build');
      menu.appendChild(title);
      menu.appendChild(info);
      if (!opts.kinds.length) {
        const empty = document.createElement('div');
        empty.className = 'bm-info';
        empty.textContent = Loc.t('no_points');
        menu.appendChild(empty);
      }
      const dotColor = { cannon: '#ff9426', sniper: '#3ab7ff', minigun: '#8a7a5f', mortar: '#d96f14', slow: '#38b6ff', amp: '#ffb14e' };
      for (const kind of opts.kinds) {
        // читаемые характеристики: роль, цифры, контр-плей
        const base = towerStats(BOXES.find(b => b.kind === kind), { dmg: 0, rof: 0, rng: 0 });
        const stats = kind === 'slow'
          ? `${Loc.t('stat_rng_s')} ${base.range.toFixed(1)} · −45% ${Loc.t('stat_dps_s').toLowerCase()} врагам`
          : kind === 'amp'
            ? `${Loc.t('stat_rng_s')} ${base.range.toFixed(1)} · +30% ${Loc.t('stat_dmg_s').toLowerCase()} соседям`
            : `${Loc.t('stat_dmg_s')} ${base.dmg.toFixed(1)} · ${Loc.t('stat_dps_s')} ${(base.dmg / base.interval).toFixed(1)} · ${Loc.t('stat_rng_s')} ${base.range.toFixed(1)}`;
        const btn = document.createElement('button');
        btn.className = 'bm-item';
        btn.disabled = opts.points <= 0;
        btn.innerHTML = `<span class="bm-dot" style="background:${dotColor[kind] || '#ff9426'}"></span>`
          + `<span class="bm-name">${Loc.t('tw_' + kind)}<small>${Loc.t('twr_' + kind)} · ${Loc.t('twa_' + kind)}</small></span>`
          + `<span class="bm-stats">${stats}</span>`
          + `<span class="bm-cost">★1</span>`;
        btn.onclick = () => { this.hideBuildMenu(); opts.onPick(kind); };
        menu.appendChild(btn);
      }
    }

    menu.classList.remove('hidden');
    const w = 250;
    menu.style.left = Math.min(Math.max(8, pageX - w / 2), window.innerWidth - w - 10) + 'px';
    menu.style.top = Math.min(Math.max(70, pageY - 24), window.innerHeight - menu.offsetHeight - 14) + 'px';
  },

  hideBuildMenu() { $('buildMenu').classList.add('hidden'); },

  // ---- карточка факта ----
  showCard(def, points, isNew) {
    $('cardTitle').textContent = Loc.t(def.id + '_t');
    $('cardDesc').textContent = Loc.t(def.id + '_d');
    $('cardTags').textContent = Loc.t(def.id + '_g');
    $('cardPoints').textContent = '★ +' + Loc.t('toast_point');
    $('btnOk').textContent = Loc.t('ok');
    $('card').classList.remove('hidden');
    if (isNew && def.kind) this.toast(Loc.t('unlocked_toast') + Loc.t('tw_' + def.kind));
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
    const ars = arsenalDps(g.towers, m2);
    $('vDps').textContent = ars.dps.toFixed(1);
    $('vCoverage').textContent = ars.count;
    $('vForecast').textContent = '~' + forecastBreaks(g.wave ?? { drones: 6, crawlers: 0, swarm: 0, boss: false, hpMult: 1, speed: 1.2, id: 'w1' }, ars.dps);
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
      row.innerHTML = `<span>${Loc.t('wave')} ${i + 1}</span><span>${Loc.t('delivered')}: ${w.killed}/${w.total}</span><span>${Loc.t('rep_express')}: ${w.express ? w.express.done + '/' + w.express.total : '—'}</span><span>${w.broken ? '⚠ ' + w.broken : '★'}</span><span>DPS ${w.dps}</span>`;
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

  // ---- блок CV: лист персонажа + квесты ----
  renderCv() {
    const skills = ['stat_balance', 'stat_gd', 'stat_docs', 'stat_math', 'stat_code'];
    const quests = [
      { t: 'eridor_t', d: 'eridor_d', g: 'eridor_g', reward: '★ ×15 плейтестов' },
      { t: 'gdd_t', d: 'gdd_d', g: 'gdd_g', reward: '★ GDD → в разработку' },
      { t: 'series_t', d: 'series_cv', g: 'series_g', reward: '★ 5 прототипов · 4 дисциплины' },
      { t: 'playables_t', d: 'playables_d', g: 'playables_g', reward: '★ 2 играбельных демо' },
    ];
    const questRewardEn = ['★ 15+ playtests', '★ GDD → production', '★ 5 prototypes · 4 disciplines', '★ 2 playable demos'];

    $('cv').innerHTML = `
      <div class="cv-wrap">
        <h2>${Loc.t('justcv')}</h2>
        <div class="cv-grid">
          <div class="cv-sheet">
            <p class="cv-panel-label">${Loc.t('cv_sheet')}</p>
            <h3>Ярослав Кукар</h3>
            <p class="cv-role">${Loc.t('cv_class')} ${Loc.t('cv_class_name')}</p>
            <p class="cv-line"><b>${Loc.t('cv_guild')}</b> ${Loc.t('cv_guild_name')}</p>
            <p class="cv-line"><b>${Loc.t('cv_level')}</b> ${Loc.t('cv_level_name')}</p>
            <p>${Loc.t('about_d')}</p>
            <div class="cv-skills">
              ${skills.map(k => `
                <div class="cv-skill">
                  <b>${Loc.t(k)}</b>
                  <span>${Loc.t(k + '_ev')}</span>
                </div>`).join('')}
            </div>
            <p class="tiny">${Loc.t('about_g')}</p>
          </div>
          <div class="cv-quests">
            <h3>${Loc.t('cv_quests')}</h3>
            ${quests.map((q, i) => `
              <div class="quest">
                <b>${Loc.t(q.t)}</b>
                <p>${Loc.t(q.d)}</p>
                <div class="quest-foot">
                  <span class="tags">${Loc.t(q.g)}</span>
                  <span class="reward">${Loc.lang === 'ru' ? q.reward : questRewardEn[i]}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>
        <div class="cv-join">
          <h3>${Loc.t('cv_contacts_t')}</h3>
          <p>
            <a href="tel:+375447838489">+375 44 783 84 89</a> ·
            <a href="mailto:kukar.y@gmail.com">kukar.y@gmail.com</a> ·
            <a href="https://github.com/Kerarty" target="_blank" rel="noopener">github.com/Kerarty</a>
          </p>
          <a class="btn accent" href="docs/CV_Yaroslav.pdf" target="_blank" rel="noopener">PDF</a>
        </div>
      </div>`;
  },
};
