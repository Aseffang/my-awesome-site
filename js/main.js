/* ============ 苏贤录 · main.js ============ */
(function () {
  'use strict';

  var PEOPLE = window.PEOPLE || [];

  /* ---------- 时期定义 ---------- */
  var PERIODS = [
    { key: '先秦',   range: '约前12世纪 — 前221' },
    { key: '秦汉',   range: '前221 — 220' },
    { key: '六朝',   range: '220 — 589' },
    { key: '隋唐五代', range: '581 — 979' },
    { key: '宋元',   range: '960 — 1368' },
    { key: '明',     range: '1368 — 1644' },
    { key: '清',     range: '1644 — 1912' },
    { key: '近现代', range: '1912 — 今' }
  ];
  var counts = {};
  PEOPLE.forEach(function (p) { counts[p.period] = (counts[p.period] || 0) + 1; });

  var FIELDS = ['书画', '文学', '政治军事', '科技', '艺术', '教育', '思想学术', '实业'];
  var state = { period: '全部', field: '全部', letter: '全部', query: '', expanded: false, list: PEOPLE.slice() };

  /* ==================== 朗读（Web Speech API，本机语音，无外链） ==================== */
  var TTS = (function () {
    var synth = window.speechSynthesis || null;
    var voice = null, currentBtn = null;

    function pickVoice() {
      if (!synth) return;
      var vs = synth.getVoices();
      var zh = vs.filter(function (v) { return /zh([-_]CN|[-_]Hans)/i.test(v.lang); });
      voice = zh[0] || vs.filter(function (v) { return /^zh/i.test(v.lang); })[0] || null;
    }
    if (synth) {
      pickVoice();
      if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', pickVoice);
      } else {
        synth.onvoiceschanged = pickVoice;
      }
    }

    function resetBtn() {
      if (currentBtn) {
        currentBtn.classList.remove('speaking');
        currentBtn.textContent = '诵';
        currentBtn.setAttribute('aria-label', '朗读此段');
        currentBtn = null;
      }
    }
    function stop() {
      if (synth) synth.cancel();
      resetBtn();
    }
    function toggle(text, btn) {
      if (!synth || !text) return;
      if (currentBtn === btn && (synth.speaking || synth.pending)) { stop(); return; }
      stop();
      var u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'zh-CN';
      u.rate = 0.92;
      u.pitch = 1;
      u.onend = u.onerror = function () { if (currentBtn === btn) resetBtn(); };
      currentBtn = btn;
      btn.classList.add('speaking');
      btn.textContent = '止';
      btn.setAttribute('aria-label', '停止朗读');
      synth.speak(u);
    }
    /* 在 container 内生成一枚「诵」按钮，getText 返回待读文本 */
    function attach(container, getText) {
      if (!synth || !container) return null;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tts-btn';
      b.textContent = '诵';
      b.setAttribute('aria-label', '朗读此段');
      b.title = '朗读此段';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        toggle(getText(), b);
      });
      container.appendChild(b);
      return b;
    }
    return { attach: attach, stop: stop };
  })();
  window.addEventListener('pagehide', function () { TTS.stop(); });

  /* ---------- 静态段落：关于 ---------- */
  (function initStaticTTS() {
    function attachSide(el) {
      if (!el) return;
      var t = el.textContent.replace(/\s+/g, ' ').trim();
      if (!t) return;
      el.classList.add('tts-side');
      TTS.attach(el, function () { return t; });
    }
    document.querySelectorAll('.about-body > p').forEach(attachSide);
  })();

  /* ---------- 开卷动画 ---------- */
  var intro = document.getElementById('intro');
  function closeIntro() {
    if (!intro || intro.classList.contains('done')) return;
    intro.classList.add('done');
    setTimeout(function () { intro.remove(); }, 1000);
  }
  setTimeout(closeIntro, 2600);
  intro.addEventListener('click', closeIntro);
  window.addEventListener('wheel', closeIntro, { once: true, passive: true });

  /* ---------- 导航收合 ---------- */
  var nav = document.getElementById('nav');
  function onNavScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onNavScroll, { passive: true });
  onNavScroll();

  /* ---------- 首屏挂画视差 ---------- */
  var painting = document.getElementById('heroPainting');
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (y < window.innerHeight && painting) {
      painting.style.transform = 'translateY(' + (y * 0.12) + 'px)';
    }
  }, { passive: true });

  /* ---------- 章节浮现 ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* ---------- 长廊 ---------- */
  var track = document.getElementById('timelineTrack');
  PERIODS.forEach(function (per, i) {
    var node = document.createElement('div');
    node.className = 'tl-node';
    node.dataset.period = per.key;
    node.innerHTML =
      '<div class="tl-era">' + per.key + '</div>' +
      '<div class="tl-range">' + per.range + '</div>' +
      '<div class="tl-count"><b>' + (counts[per.key] || 0) + '</b><span>人</span></div>';
    node.addEventListener('click', function () {
      setPeriod(per.key);
      document.getElementById('directory').scrollIntoView({ behavior: 'smooth' });
    });
    track.appendChild(node);
    if (i < PERIODS.length - 1) {
      var bridge = document.createElement('div');
      bridge.className = 'tl-bridge';
      track.appendChild(bridge);
    }
  });

  /* 长廊拖拽滚动 */
  var dragging = false, dragX = 0, dragScroll = 0, moved = 0;
  track.addEventListener('pointerdown', function (e) {
    dragging = true; moved = 0; dragX = e.clientX; dragScroll = track.scrollLeft;
    track.classList.add('dragging');
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - dragX;
    moved = Math.max(moved, Math.abs(dx));
    track.scrollLeft = dragScroll - dx;
  });
  window.addEventListener('pointerup', function () {
    dragging = false; track.classList.remove('dragging');
  });
  track.addEventListener('click', function (e) {
    if (moved > 8) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  /* ---------- 筛选 pills（时代 / 领域 / 音序） ---------- */
  function makePills(box, items, key) {
    if (!box) return;
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.className = 'fpill' + (it === '全部' ? ' active' : '');
      b.textContent = it;
      b.dataset.value = it;
      b.addEventListener('click', function () {
        state[key] = it;
        box.querySelectorAll('.fpill').forEach(function (x) {
          x.classList.toggle('active', x.dataset.value === it);
        });
        state.expanded = false;
        applyFilter();
      });
      box.appendChild(b);
    });
  }
  makePills(document.getElementById('filterEra'),
    ['全部'].concat(PERIODS.map(function (p) { return p.key; })), 'period');
  makePills(document.getElementById('filterField'), ['全部'].concat(FIELDS), 'field');
  var letters = {};
  PEOPLE.forEach(function (p) { if (p.initial) letters[p.initial] = true; });
  makePills(document.getElementById('filterLetter'),
    ['全部'].concat(Object.keys(letters).sort()), 'letter');

  function setPeriod(key) {
    state.period = key;
    state.expanded = false;
    var eraBox = document.getElementById('filterEra');
    if (eraBox) eraBox.querySelectorAll('.fpill').forEach(function (x) {
      x.classList.toggle('active', x.dataset.value === key);
    });
    document.querySelectorAll('.tl-node').forEach(function (n) {
      n.classList.toggle('active', n.dataset.period === key);
    });
    applyFilter();
  }

  /* ---------- 搜索 ---------- */
  var searchInput = document.getElementById('searchInput');
  var debounce;
  searchInput.addEventListener('input', function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      state.query = searchInput.value.trim();
      state.expanded = false;
      applyFilter();
    }, 160);
  });

  function match(p, q) {
    var hay = [p.name, p.en, p.zi, p.hao, p.alias, p.pen, p.occupation, p.native, p.dynasty]
      .join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  function applyFilter() {
    state.list = PEOPLE.filter(function (p) {
      if (state.period !== '全部' && p.period !== state.period) return false;
      if (state.field !== '全部' && p.fields.indexOf(state.field) === -1) return false;
      if (state.letter !== '全部' && p.initial !== state.letter) return false;
      if (state.query && !match(p, state.query)) return false;
      return true;
    });
    renderGrid();
  }

  /* ---------- 名录网格（默认折叠三行） ---------- */
  var grid = document.getElementById('dirGrid');
  var dirCount = document.getElementById('dirCount');
  var dirMore = document.getElementById('dirMore');
  var gridToggle = document.getElementById('gridToggle');

  function gridColumns() {
    var cols = window.getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    return Math.max(cols, 1);
  }

  function renderGrid() {
    var cols = gridColumns();
    var limit = cols * 3;
    var collapsed = !state.expanded && state.list.length > limit;
    var shown = collapsed ? state.list.slice(0, limit) : state.list;
    var frag = document.createDocumentFragment();
    if (!shown.length) {
      var empty = document.createElement('div');
      empty.className = 'dir-empty';
      empty.textContent = '未寻得此人 —— 请更换检索条件';
      frag.appendChild(empty);
    }
    shown.forEach(function (p, i) {
      var card = document.createElement('article');
      card.className = 'card';
      card.style.animationDelay = Math.min(i, 24) * 0.03 + 's';
      var meta = p.dynasty || p.period;
      card.innerHTML =
        '<div class="card-arch">' +
          (p.avatar ? '<img src="' + p.avatar + '" alt="' + p.name + '" loading="lazy">' : '') +
        '</div>' +
        '<h3 class="card-name">' + p.name + '</h3>' +
        '<p class="card-meta">' + meta + '</p>' +
        (p.occupation ? '<p class="card-occ">' + p.occupation + '</p>' : '');
      card.addEventListener('click', function () { openModal(p.id); });
      frag.appendChild(card);
    });
    grid.innerHTML = '';
    grid.appendChild(frag);
    grid.classList.toggle('clamped', collapsed);
    dirMore.hidden = state.list.length <= limit;
    gridToggle.innerHTML = state.expanded ? '收 起 名 录 ▴' : '展 开 全 录 ▾';
    var desc = [];
    if (state.period !== '全部') desc.push(state.period);
    if (state.field !== '全部') desc.push(state.field);
    if (state.letter !== '全部') desc.push(state.letter + ' 部');
    dirCount.innerHTML = '共录 <b>' + state.list.length + '</b> 人' +
      (desc.length ? ' · ' + desc.join(' · ') : '') +
      (collapsed ? ' · 先览三行，余者折叠' : '');
  }

  gridToggle.addEventListener('click', function () {
    state.expanded = !state.expanded;
    renderGrid();
    if (!state.expanded) {
      document.getElementById('dirFilter').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  window.addEventListener('resize', function () {
    clearTimeout(debounce);
    debounce = setTimeout(renderGrid, 200);
  });

  /* ---------- 详情卷轴 ---------- */
  var modal = document.getElementById('modal');
  var modalInner = document.getElementById('modalInner');
  var currentId = null;

  function personById(id) {
    for (var i = 0; i < PEOPLE.length; i++) if (PEOPLE[i].id === id) return PEOPLE[i];
    return null;
  }

  function lifespan(p) {
    var b = p.birth && p.birth !== 'None' ? p.birth : '';
    var d = p.death && p.death !== 'None' ? p.death : '';
    if (!b && !d) return '生卒年不详';
    return (b || '不详') + ' — ' + (d || '不详');
  }

  function infoRow(label, val) {
    if (!val) return '';
    return '<div><b>' + label + '</b>' + val + '</div>';
  }

  function renderModal(p) {
    TTS.stop();
    var tags = [];
    if (p.period) tags.push('<span class="m-tag m-tag-red">' + p.period + '</span>');
    if (p.dynasty && p.dynasty !== p.period) tags.push('<span class="m-tag">' + p.dynasty + '</span>');
    if (p.occupation) tags.push('<span class="m-tag">' + p.occupation + '</span>');
    if (p.native) tags.push('<span class="m-tag">' + p.native + '</span>');

    var info =
      infoRow('字', p.zi) + infoRow('号', p.hao) +
      infoRow('别名', p.alias) + infoRow('笔名', p.pen) +
      infoRow('生卒', lifespan(p)) + infoRow('籍贯', p.native) +
      infoRow('出生地', p.birthplace) + infoRow('居住地', p.residence) +
      infoRow('墓葬地', p.tomb);

    modalInner.innerHTML =
      '<div class="m-head">' +
        '<div class="m-arch">' + (p.avatar ? '<img src="' + p.avatar + '" alt="' + p.name + '">' : '') + '</div>' +
        '<div class="m-headtext">' +
          '<h2 class="m-name">' + p.name + '</h2>' +
          (p.en ? '<p class="m-en">' + p.en + '</p>' : '') +
          '<div class="m-tags">' + tags.join('') + '</div>' +
        '</div>' +
      '</div>' +
      (info ? '<div class="m-info">' + info + '</div>' : '') +
      (p.bio ? '<div class="m-bio"><h3>生平</h3><p>' + p.bio + '</p></div>' : '') +
      '<div class="m-nav">' +
        '<button id="mPrev">← 上一位</button>' +
        '<button id="mNext">下一位 →</button>' +
      '</div>';

    document.getElementById('mPrev').addEventListener('click', function () { stepModal(-1); });
    document.getElementById('mNext').addEventListener('click', function () { stepModal(1); });

    var bioHead = modalInner.querySelector('.m-bio h3');
    if (bioHead && p.bio) {
      TTS.attach(bioHead, function () {
        return p.name + '。' + (p.dynasty || p.period || '') + '。' + p.bio;
      });
    }
  }

  function stepModal(dir) {
    var list = state.list.length ? state.list : PEOPLE;
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === currentId) { idx = i; break; }
    if (idx === -1) return;
    var next = list[(idx + dir + list.length) % list.length];
    currentId = next.id;
    renderModal(next);
    document.querySelector('.modal-scroll').scrollTop = 0;
  }

  function openModal(id) {
    var p = personById(id);
    if (!p) return;
    currentId = id;
    renderModal(p);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.querySelector('.modal-scroll').scrollTop = 0;
  }
  function closeModal() {
    TTS.stop();
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', closeModal);
  window.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') stepModal(-1);
    if (e.key === 'ArrowRight') stepModal(1);
  });

  /* ==================== 每日明贤 ==================== */
  var SOLAR_TERMS = [
    ['小寒',1,6],['大寒',1,20],['立春',2,4],['雨水',2,19],['惊蛰',3,6],['春分',3,21],
    ['清明',4,5],['谷雨',4,20],['立夏',5,6],['小满',5,21],['芒种',6,6],['夏至',6,21],
    ['小暑',7,7],['大暑',7,23],['立秋',8,8],['处暑',8,23],['白露',9,8],['秋分',9,23],
    ['寒露',10,8],['霜降',10,23],['立冬',11,8],['小雪',11,22],['大雪',12,7],['冬至',12,22]
  ];
  function currentTerm(now) {
    var m = now.getMonth() + 1, d = now.getDate(), t = SOLAR_TERMS[SOLAR_TERMS.length - 1];
    for (var i = 0; i < SOLAR_TERMS.length; i++) {
      var s = SOLAR_TERMS[i];
      if (m < s[1] || (m === s[1] && d < s[2])) break;
      t = s;
    }
    return t[0];
  }
  var CN_NUM = '〇一二三四五六七八九';
  function cnDate(now) {
    var y = String(now.getFullYear()).split('').map(function (c) { return CN_NUM[+c]; }).join('');
    return y + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
  }
  (function renderDaily() {
    var box = document.getElementById('dailyBody');
    if (!box) return;
    var now = new Date();
    var seed = Math.floor(now.getTime() / 86400000);
    var idx = (seed * 2654435761) % PEOPLE.length;
    idx = ((idx % PEOPLE.length) + PEOPLE.length) % PEOPLE.length;
    var p = PEOPLE[idx];
    box.innerHTML =
      '<div class="daily-arch">' + (p.avatar ? '<img src="' + p.avatar + '" alt="' + p.name + '">' : '') + '</div>' +
      '<div class="daily-info">' +
        '<p class="daily-date">' + cnDate(now) + ' · 节气' + '<span class="daily-term">' + currentTerm(now) + '</span></p>' +
        '<h3 class="daily-name">' + p.name + '</h3>' +
        '<p class="daily-meta">' + [p.dynasty || p.period, p.zi ? '字' + p.zi : '', p.occupation || ''].filter(Boolean).join(' · ') + '</p>' +
        '<p class="daily-bio">' + (p.bio || '生平待考。') + '</p>' +
        '<div class="daily-actions">' +
          '<button class="btn-ink" id="dailyDetail">展卷详览</button>' +
          '<button class="btn-ghost" id="dailyAnother">先睹明日之贤</button>' +
        '</div>' +
      '</div>';
    document.getElementById('dailyDetail').addEventListener('click', function () { openModal(p.id); });
    var dailyName = box.querySelector('.daily-name');
    if (dailyName) {
      TTS.attach(dailyName, function () {
        return p.name + '。' + (p.dynasty || p.period || '') + '。' + (p.bio || '生平待考。');
      });
    }
    document.getElementById('dailyAnother').addEventListener('click', function () {
      var t = PEOPLE[(idx + 1) % PEOPLE.length];
      openModal(t.id);
    });
  })();

  /* ==================== 智能问答 ==================== */
  (function initQA() {
    var log = document.getElementById('qaLog');
    var form = document.getElementById('qaForm');
    var input = document.getElementById('qaInput');
    var chipsBox = document.getElementById('qaChips');
    if (!log) return;

    var CHIPS = ['唐寅是哪个朝代的人', '明代有哪些书画家', '录中共有多少位医学家', '文徵明的字和号', '清代有哪些文学家', '贝聿铭是何许人'];
    CHIPS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'qa-chip'; b.textContent = c;
      b.addEventListener('click', function () { ask(c); });
      chipsBox.appendChild(b);
    });

    function scrollLog() { log.scrollTop = log.scrollHeight; }
    function pushQ(text) {
      var d = document.createElement('div');
      d.className = 'qa-msg qa-q';
      d.innerHTML = '<span class="qa-mark">问</span><div class="qa-text"></div>';
      d.querySelector('.qa-text').textContent = text;
      log.appendChild(d); scrollLog();
    }
    function pushA(html) {
      var d = document.createElement('div');
      d.className = 'qa-msg qa-a';
      d.innerHTML = '<span class="qa-mark">答</span><div class="qa-text">' + html + '</div>';
      log.appendChild(d); scrollLog();
      d.querySelectorAll('.qa-person').forEach(function (b) {
        b.addEventListener('click', function () { openModal(+b.dataset.id); });
      });
    }
    function peopleButtons(list) {
      return '<span class="qa-people">' + list.map(function (p) {
        return '<button class="qa-person" data-id="' + p.id + '">' + p.name + '</button>';
      }).join('') + '</span>';
    }
    function cite(p, text) {
      return '<span class="qa-cite">「' + text + '」—— 据《苏贤录 · ' + p.name + '》小传</span>';
    }
    function findMentioned(q) {
      var found = [];
      PEOPLE.forEach(function (p) {
        var keys = [p.name, p.alias, p.zi, p.hao, p.pen].filter(function (k) { return k && k.length >= 2; });
        for (var i = 0; i < keys.length; i++) {
          if (q.indexOf(keys[i]) !== -1) { found.push(p); return; }
        }
      });
      return found;
    }
    function periodIn(q) {
      var map = { '先秦': ['先秦', '春秋', '战国', '商周'], '秦汉': ['秦汉', '秦代', '秦朝', '西汉', '东汉', '汉代', '汉朝'],
        '六朝': ['六朝', '三国', '晋朝', '晋代', '西晋', '东晋', '南朝'], '隋唐五代': ['隋唐', '隋代', '隋朝', '唐代', '唐朝', '五代'],
        '宋元': ['宋元', '宋代', '宋朝', '北宋', '南宋', '元代', '元朝'], '明': ['明代', '明朝', '明季', '明初', '明末'],
        '清': ['清代', '清朝', '清初', '清末'], '近现代': ['近现代', '近代', '现代', '民国', '当代'] };
      for (var k in map) if (map[k].some(function (w) { return q.indexOf(w) !== -1; })) return k;
      return null;
    }
    function fieldIn(q) {
      var map = { '书画': ['书画', '画家', '书法', '绘事'], '文学': ['文学', '诗人', '词人', '作家', '文人'],
        '政治军事': ['政治', '军事', '名将', '名臣', '官员', '革命'], '科技': ['科学', '科技', '医学', '医学家', '数学家', '建筑', '工程'],
        '艺术': ['艺术', '音乐', '戏曲', '昆曲', '评弹', '演员', '工艺'], '教育': ['教育', '教育家'],
        '思想学术': ['思想', '学术', '哲学', '史学', '学者'], '实业': ['实业', '企业', '商'] };
      var hits = [];
      for (var k in map) if (map[k].some(function (w) { return q.indexOf(w) !== -1; })) hits.push(k);
      return hits;
    }

    function answer(q) {
      var mentioned = findMentioned(q);
      var period = periodIn(q);
      var fields = fieldIn(q);
      var askCount = /多少|几位|几人|共有|有没有|有哪些|都有谁/.test(q);

      /* 1. 点名人物 */
      if (mentioned.length) {
        var p = mentioned[0];
        if (/朝代|时代|什么时候|何时/.test(q)) {
          return p.name + '乃' + (p.dynasty || p.period) + '人氏' +
            (p.birth || p.death ? '，生卒年为 ' + (p.birth || '不详') + ' 至 ' + (p.death || '不详') : '') + '。' +
            cite(p, p.bio.slice(0, 60) + '……');
        }
        if (/字是什么|号是什么|字号|别名|笔名/.test(q)) {
          var parts = [];
          if (p.zi) parts.push('字' + p.zi);
          if (p.hao) parts.push('号' + p.hao);
          if (p.alias) parts.push('别名' + p.alias);
          if (p.pen) parts.push('笔名' + p.pen);
          return (parts.length ? p.name + '，' + parts.join('，') + '。' : p.name + '之字号，录中未载。') +
            cite(p, p.bio.slice(0, 50) + '……');
        }
        if (/哪里人|籍贯|何处|哪儿/.test(q)) {
          return p.name + '，籍贯' + (p.native || '苏州') + (p.birthplace ? '，生于' + p.birthplace : '') + '。' +
            cite(p, p.bio.slice(0, 50) + '……');
        }
        return p.name + '，' + (p.dynasty || p.period) + '人，' + (p.occupation || '吴地名贤') + '。' +
          cite(p, p.bio.slice(0, 110) + (p.bio.length > 110 ? '……' : '')) +
          '<br>欲览全传，可点此:' + peopleButtons([p]);
      }

      /* 2. 计数 / 列表类 */
      if (period || fields.length || askCount) {
        var list = PEOPLE.filter(function (p2) {
          if (period && p2.period !== period) return false;
          if (fields.length && !fields.some(function (f) { return p2.fields.indexOf(f) !== -1; })) return false;
          return true;
        });
        var label = [period, fields.join('、')].filter(Boolean).join('之') || '录中';
        if (!list.length) return '遍检《苏贤录》，' + label + '一类，未有所载。或请换个问法一试。';
        var show = list.slice(0, 10);
        return label + '贤达，录中共载 <b style="color:var(--vermilion)">' + list.length + '</b> 位' +
          (list.length > 10 ? '，兹举十人' : '') + '：' + peopleButtons(show) +
          '<span class="qa-cite">—— 据《苏贤录》' + label + '诸传辑录</span>';
      }

      /* 3. 模糊兜底: 关键词命中简介 */
      var grams = [];
      for (var i = 0; i < q.length - 1; i++) {
        var g2 = q.slice(i, i + 2);
        if (/[一-龥]{2}/.test(g2)) grams.push(g2);
      }
      var scored = PEOPLE.map(function (p3) {
        var s = 0;
        grams.forEach(function (g) { if (p3.bio.indexOf(g) !== -1 || p3.occupation.indexOf(g) !== -1) s++; });
        return { p: p3, s: s };
      }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3);
      if (scored.length) {
        return '此问颇有深意。录中与此相关者，或为此数人：' +
          peopleButtons(scored.map(function (x) { return x.p; })) +
          '<span class="qa-cite">—— 点击姓名，可览其传；若所答非所问，还请明示人物姓名</span>';
      }
      return '惭愧惭愧，此问超出录中所载。《苏贤录》所录皆苏州历代名贤之事，足下若问人物生平、朝代、领域名录，在下知无不言。';
    }

    var asking = false;
    function ask(text) {
      text = (text || '').trim();
      if (!text || asking) return;
      asking = true;
      pushQ(text);
      setTimeout(function () {
        pushA(answer(text));
        asking = false;
      }, 350);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      ask(input.value);
      input.value = '';
    });
  })();

  /* ==================== 一日体验 ==================== */
  (function initLife() {
    var stageBox = document.getElementById('lifeStage');
    if (!stageBox) return;

    var GROUP_OF = { '政治军事': 'civil', '书画': 'arts', '文学': 'arts', '艺术': 'arts',
      '科技': 'scholar', '思想学术': 'scholar', '教育': 'scholar', '实业': 'trade' };

    /* 场景库: 四组 × 四幕 */
    var LIFE = {
      civil: [
        { title: '总角 · 少年立志', text: '你生于{dynasty}之世，{place}人氏。自幼聪颖，乡里皆言此子不凡。及至少年，前路有二。',
          choices: [
            { t: '寒窗苦读，以科举为正途', r: '青灯黄卷，寒暑不辍。你把《四书》读得滚瓜烂熟，胸中渐有经世之志。', d: { cai: 2, xin: -1 } },
            { t: '结交豪杰，游历四方增广见闻', r: '你负笈远行，结识三教九流，见识大涨，亦在江湖上闯下些许名声。', d: { cai: 1, ming: 1 } } ] },
        { title: '弱冠 · 初入世事', text: '年岁渐长，你须择路而立身。',
          choices: [
            { t: '赴试夺魁，博取功名', r: '放榜之日，你名列榜上。自此踏入仕途，前程似锦。', d: { ming: 2, cai: 1 } },
            { t: '先入幕府，历练实务', r: '你不急于求名，先入幕府历练。钱粮刑名，事事经手，练出一身真本领。', d: { gong: 2 } } ] },
        { title: '不惑 · 风波骤起', text: '中年之际，朝中弊政丛生，百姓多艰。同僚或缄默，或逢迎。你当如何？',
          choices: [
            { t: '冒死上疏，直言极谏', r: '一封奏疏震动朝野。虽遭贬谪，然天下士人皆知有你这一号人物。', d: { ming: 2, xin: -2 } },
            { t: '隐忍蓄势，于任内默默行善政', r: '你不发一言，只在治内轻徭薄赋、兴修水利。百姓感念，立生祠以记之。', d: { gong: 2, xin: 1 } } ] },
        { title: '耳顺 · 暮年归处', text: '华发渐生，到了收梢之时。',
          choices: [
            { t: '著书立说，藏之名山', r: '你把一生阅历著述成编，后人读之，如见其人。', d: { cai: 2, gong: 1 } },
            { t: '课徒授业，泽被乡里', r: '你设帐授徒，门生遍及吴中。逢年过节，登门问安者络绎不绝。', d: { ming: 1, xin: 2 } } ] }
      ],
      arts: [
        { title: '总角 · 少年习艺', text: '你生于{dynasty}之世，{place}人氏。自小见笔墨便欢喜，涂涂抹抹，竟有几分灵气。',
          choices: [
            { t: '拜入名师门下，专攻一艺', r: '名师严教，你冬练三九、夏练三伏，技艺日进千里。', d: { cai: 2, xin: -1 } },
            { t: '泛览群艺，博采众长', r: '诗文书画你样样涉猎，眼界既宽，笔下自有一段潇洒气象。', d: { cai: 1, xin: 1 } } ] },
        { title: '弱冠 · 立身之计', text: '艺成之后，何以谋生？',
          choices: [
            { t: '鬻艺自给，不卖人格', r: '你以技艺谋生，润笔随缘，清贫却自在，作品渐渐流传于市。', d: { cai: 2, ming: 1 } },
            { t: '应试入仕，以艺为余事', r: '你且把丹青收起，先去博取功名。仕途浮沉，笔下工夫倒也未搁下。', d: { ming: 2, xin: -1 } } ] },
        { title: '不惑 · 权贵相扰', text: '你的名气越来越大，有权贵遣人重金求作，意在附庸风雅、装点门面。',
          choices: [
            { t: '婉言谢绝，不为权势动笔', r: '来使悻悻而去。此事传开，士林皆敬你有古人风骨。', d: { ming: 2, xin: 1 } },
            { t: '应酬一二，换取安身之资', r: '你提笔应酬了几幅，换得数载安稳。只是夜半自观近作，总觉得少了几分真气。', d: { gong: 1, xin: -1 } } ] },
        { title: '耳顺 · 晚年境界', text: '老来笔砚相伴，你最想做什么？',
          choices: [
            { t: '闭门变法，自成一家', r: '衰年变法，你尽去旧时窠臼，作品别开生面，终开一派风气。', d: { cai: 2, gong: 1 } },
            { t: '开门授徒，传此薪火', r: '你将毕生心得倾囊相授，弟子各得一体，吴地艺坛因你而盛。', d: { ming: 2, xin: 1 } } ] }
      ],
      scholar: [
        { title: '总角 · 格物之始', text: '你生于{dynasty}之世，{place}人氏。自幼对万物之理充满好奇，常问大人答不上的问题。',
          choices: [
            { t: '潜心研习，专攻一门', r: '你把一门学问钻得极深，年纪轻轻已小有心得。', d: { cai: 2, xin: -1 } },
            { t: '遍访名师，广求新知', r: '你负笈四方，转益多师，腹中渐成一家之学。', d: { cai: 1, ming: 1 } } ] },
        { title: '弱冠 · 治学之路', text: '学问初成，下一步往何处去？',
          choices: [
            { t: '闭户著书，系统成一家言', r: '数载寒灯，手稿盈箧。书成之日，学界为之侧目。', d: { cai: 2, gong: 1 } },
            { t: '实地考察，以足丈量真知', r: '你走出书斋，凡耳闻之事皆要亲验。脚底沾泥，胸中却有真学问。', d: { gong: 1, xin: 1 } } ] },
        { title: '不惑 · 学说之争', text: '你的学说渐有影响，却也引来守旧者攻讦，斥为异端。',
          choices: [
            { t: '著文抗辩，寸步不让', r: '笔战数回合，你援引实证，驳得对方哑口无言。年轻学子多心折于你。', d: { ming: 2, xin: -1 } },
            { t: '吸纳诘难，修订完善己说', r: '你从批评中挑出真知灼见，将学说打磨得愈加严密。反对者亦暗暗佩服。', d: { cai: 1, gong: 1 } } ] },
        { title: '耳顺 · 薪火相传', text: '暮年回望，最放心不下的是这门学问的后路。',
          choices: [
            { t: '整理遗稿，刊行传世', r: '你将毕生手稿校订刊行。后世治此学者，案头皆有你的书。', d: { gong: 2, cai: 1 } },
            { t: '奖掖后进，培植学脉', r: '你不藏私，倾力提携青年才俊。数十年后，他们各成栋梁。', d: { ming: 2, xin: 1 } } ] }
      ],
      trade: [
        { title: '总角 · 学徒生涯', text: '你生于{dynasty}之世，{place}人氏。家道平平，年少时须自谋出路。',
          choices: [
            { t: '进店学徒，从洒扫应对学起', r: '三年学徒，你眼勤手快，把生意经默记于心，东家另眼相看。', d: { cai: 1, gong: 1 } },
            { t: '白日帮工，夜读不辍', r: '别人赌钱吃酒，你挑灯夜读。账目之外，你还读史——商道即人道。', d: { cai: 2 } } ] },
        { title: '弱冠 · 自立门户', text: '羽翼渐丰，是时候自立了。',
          choices: [
            { t: '借贷开张，放手一搏', r: '你把全副身家押了上去。头三年惊险万分，总算站稳了脚跟。', d: { gong: 2, xin: -1 } },
            { t: '稳扎稳打，合伙经营', r: '你与信得过的同乡合伙，虽扩张慢些，却步步踏实。', d: { gong: 1, xin: 1 } } ] },
        { title: '不惑 · 时局动荡', text: '中年之时，时局骤变，市面萧条，同业纷纷收缩。',
          choices: [
            { t: '捐资纾难，与乡梓共渡难关', r: '你开仓平粜、捐资赈济。生意亏了一截，名声却立了起来——危难方见人心。', d: { ming: 2, xin: 1 } },
            { t: '收缩避险，保住根本待时', r: '你果断收缩，保住了字号与伙计的饭碗。有人说你精明，你说留得青山在。', d: { gong: 1, xin: -1 } } ] },
        { title: '耳顺 · 富贵还乡', text: '事业已成，垂暮之年，余资何用？',
          choices: [
            { t: '兴学办校，造福一方', r: '你出资兴学，贫寒子弟得以读书。校成之日，你捻须而笑：此桩买卖，最划算。', d: { ming: 2, gong: 1 } },
            { t: '著录商道，传之后人', r: '你将一生经商心得笔录成帙，后人奉为圭臬。', d: { cai: 2 } } ] }
      ]
    };

    var pool = PEOPLE.filter(function (p) { return p.bio && p.bio.length >= 120 && p.avatar; });
    var game = null;

    function esc(s) { return s.replace(/</g, '&lt;'); }
    function fill(t, p) {
      return t.replace(/\{name\}/g, p.name).replace(/\{dynasty\}/g, p.dynasty || p.period)
        .replace(/\{place\}/g, p.native || '苏州').replace(/\{occ\}/g, p.occupation || '名贤');
    }
    function groupOf(p) {
      for (var i = 0; i < p.fields.length; i++) {
        if (GROUP_OF[p.fields[i]]) return GROUP_OF[p.fields[i]];
      }
      return 'scholar';
    }
    function sample3() {
      var arr = pool.slice(), out = [];
      while (out.length < 3 && arr.length) {
        out.push(arr.splice(Math.floor(Math.random() * arr.length), 1)[0]);
      }
      return out;
    }

    function renderIntro() {
      var picks = sample3();
      stageBox.innerHTML =
        '<div class="life-intro">' +
          '<h3>择 一 位 先 贤 · 历 一 世 人 生</h3>' +
          '<p>你将化身为一位苏州名贤，历经总角、弱冠、不惑、耳顺四幕。每一幕皆有抉择——你的选择，未必是他的选择；你的一生，也未必是他的一生。</p>' +
          '<div class="life-pick">' +
            picks.map(function (p, i) {
              return '<div class="life-card" data-i="' + i + '">' +
                '<div class="card-arch"><img src="' + p.avatar + '" alt="' + esc(p.name) + '"></div>' +
                '<div class="life-card-name">' + esc(p.name) + '</div>' +
                '<div class="life-card-meta">' + esc(p.dynasty || p.period) + ' · ' + esc(p.occupation || '名贤') + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<div class="life-reshuffle"><button class="btn-ghost" id="lifeReshuffle">另换三位</button></div>' +
        '</div>';
      stageBox.querySelectorAll('.life-card').forEach(function (c) {
        c.addEventListener('click', function () { startGame(picks[+c.dataset.i]); });
      });
      document.getElementById('lifeReshuffle').addEventListener('click', renderIntro);
    }

    function startGame(p) {
      game = { p: p, group: groupOf(p), scene: 0, stats: { cai: 2, ming: 1, gong: 1, xin: 3 } };
      renderScene();
    }

    function renderScene() {
      var g = game;
      var sc = LIFE[g.group][g.scene];
      stageBox.innerHTML =
        '<div class="life-scene">' +
          '<div class="life-scene-head">' +
            '<span class="life-era-tag">' + esc(g.p.dynasty || g.p.period) + '</span>' +
            '<span class="life-era-tag">第' + '一二三四'[g.scene] + '幕</span>' +
            '<h3 class="life-title">' + sc.title + '</h3>' +
          '</div>' +
          '<p class="life-text">' + esc(fill(sc.text, g.p)) + '</p>' +
          '<div class="life-choices">' +
            sc.choices.map(function (c, i) {
              return '<button class="life-choice" data-i="' + i + '">' + esc(c.t) + '</button>';
            }).join('') +
          '</div>' +
        '</div>';
      stageBox.querySelectorAll('.life-choice').forEach(function (b) {
        b.addEventListener('click', function () { pickChoice(sc.choices[+b.dataset.i]); });
      });
    }

    function pickChoice(c) {
      var g = game;
      for (var k in c.d) g.stats[k] += c.d[k];
      stageBox.querySelector('.life-choices').innerHTML =
        '<div class="life-result-text">' + esc(c.r) + '</div>' +
        '<div class="life-next"><button class="btn-ink" id="lifeNext">' +
          (g.scene < 3 ? '进入下一幕' : '盖棺论定') + '</button></div>';
      document.getElementById('lifeNext').addEventListener('click', function () {
        g.scene++;
        if (g.scene < 4) renderScene(); else renderEnd();
      });
    }

    function renderEnd() {
      var g = game, s = g.stats;
      var total = s.cai + s.ming + s.gong + s.xin;
      var verdict, note;
      if (total >= 17) { verdict = '一世通达 · 青史留名'; note = '才名功业心境四者兼得，这样的一生，足以与' + g.p.name + '比肩。'; }
      else if (total >= 14) { verdict = '有为一生 · 不负平生'; note = '虽有起落，终究有所树立。这样的一生，已胜过世间十之八九。'; }
      else if (total >= 11) { verdict = '平淡是真 · 独善其身'; note = '未必轰轰烈烈，却守住了本心。平安喜乐，亦是圆满。'; }
      else { verdict = '命途多舛 · 犹未言悔'; note = '这一路走得辛苦。但能在抉择处不违本心，坎坷亦是一种完成。'; }
      stageBox.innerHTML =
        '<div class="life-scene">' +
          '<div class="life-scene-head"><span class="life-era-tag">终幕</span><h3 class="life-title">你走过了' + esc(g.p.name) + '的一生</h3></div>' +
          '<div class="life-stats">' +
            '<div class="life-stat"><b>' + s.cai + '</b><span>才学</span></div>' +
            '<div class="life-stat"><b>' + s.ming + '</b><span>名望</span></div>' +
            '<div class="life-stat"><b>' + s.gong + '</b><span>功业</span></div>' +
            '<div class="life-stat"><b>' + s.xin + '</b><span>心境</span></div>' +
          '</div>' +
          '<p class="life-verdict">' + verdict + '</p>' +
          '<p class="life-truth">' + note + '</p>' +
          '<p class="life-truth"><b>正史所载</b> —— ' + esc(g.p.name) + '之真实生平：' + esc(g.p.bio.slice(0, 140)) + (g.p.bio.length > 140 ? '……' : '') + '</p>' +
          '<div class="life-actions">' +
            '<button class="btn-ink" id="lifeTruth">观其正传</button>' +
            '<button class="btn-ghost" id="lifeAgain">再历一世</button>' +
          '</div>' +
        '</div>';
      document.getElementById('lifeTruth').addEventListener('click', function () { openModal(g.p.id); });
      document.getElementById('lifeAgain').addEventListener('click', renderIntro);
    }

    renderIntro();
  })();

  /* ---------- 启动 ---------- */
  var statEl = document.getElementById('statPeople');
  if (statEl) statEl.textContent = PEOPLE.length;
  applyFilter();

  /* 锚点直达: 首次加载若带 #hash，立即定位（跳过平滑滚动） */
  if (location.hash) {
    var anchorTarget = document.querySelector(location.hash);
    if (anchorTarget) {
      setTimeout(function () {
        var root = document.documentElement;
        var old = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        anchorTarget.scrollIntoView();
        root.style.scrollBehavior = old;
      }, 80);
    }
  }
})();
