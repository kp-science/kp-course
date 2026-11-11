// Motion Lab — แกนกลาง: เก็บคะแนน เสียง หน้าหลัก เลือกด่าน สรุปผล
(function () {
  // KG_STORE (ตั้งโดยหน้าที่ฝังเกมในคอร์ส): { key, initial, name, note, save(summary) } · ไม่มี = เก็บในเครื่องอย่างเดียว
  const ST = window.KG_STORE || null;
  const KEY = ST ? ST.key : 'kp-motion-lab-1';
  const $ = (s, el = document) => el.querySelector(s);
  const app = () => $('#app');

  // ---------- เก็บข้อมูลในเครื่อง ----------
  let S = { name: '', stars: {}, tries: {}, sound: false };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  // รวมกับคะแนนบนเซิร์ฟเวอร์: เอาค่ามากกว่ารายด่าน (เล่นเครื่องอื่นมา หรือเครื่องนี้ยังไม่ได้ส่ง)
  const maxMerge = (a = {}, b = {}) => { const o = {}; new Set(Object.keys(a).concat(Object.keys(b))).forEach(k => {
    const x = a[k] || [], y = b[k] || []; o[k] = Array.from({ length: Math.max(x.length, y.length) }, (_, i) => Math.max(x[i] || 0, y[i] || 0)); }); return o; };
  if (ST && ST.initial) { S.stars = maxMerge(S.stars, ST.initial.stars); S.tries = maxMerge(S.tries, ST.initial.tries); }
  if (ST && ST.name) S.name = ST.name;
  const save = remote => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    if (remote && ST && ST.save) ST.save({ stars: maxMerge(S.stars), tries: maxMerge(S.tries), xp: xp(), topics: topicPct() });
  };

  // ---------- ไอคอนเส้น ----------
  const ICON = {
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    force: '<rect x="3" y="9" width="8" height="8" rx="1"/><path d="M11 13h10M17 9l4 4-4 4"/>',
    orbit: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.5"/><circle cx="20" cy="12" r="2"/><path d="M20 12v-8"/>',
    graph: '<path d="M3 3v18h18"/><path d="M6 17l4-6 4 3 5-8"/>',
    spot: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6"/>',
    cards: '<rect x="3" y="5" width="11" height="15" rx="2"/><path d="M14 7l5 1.5-3.5 12-4-1.2"/>',
    domino: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 12h16"/><circle cx="9" cy="7.5" r=".8"/><circle cx="15" cy="16.5" r=".8"/>',
    duel: '<path d="M4 20L14 10M14 10l2-6 4 4-6 2M20 20L10 10M10 10L8 4 4 8l6 2"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    on: '<path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/>',
    off: '<path d="M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/>',
    redo: '<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/>'
  };
  const ic = (k, st = '') => `<svg class="i" viewBox="0 0 24 24" style="${st}">${ICON[k]}</svg>`;

  // ---------- เสียงสั้น ๆ (ปิดไว้ก่อน) ----------
  let ac = null;
  function sfx(kind) {
    if (!S.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { good: [660, 880], bad: [220, 160], tap: [520], win: [523, 659, 784, 1047], shot: [300] }[kind] || [440];
      notes.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.09;
        o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.2);
      });
    } catch (e) {}
  }

  // ---------- คะแนน แรงก์ ----------
  const RANKS = [[0, 'Bronze', '#b0743c'], [150, 'Silver', '#9aa3b2'], [350, 'Gold', '#e0b93a'], [600, 'Platinum', '#5ac8c8'], [900, 'Diamond', '#8f7bff']];
  const games = [];
  const starsOf = id => S.stars[id] || [];
  const sum = a => a.reduce((x, y) => x + (y || 0), 0);
  const xp = () => games.reduce((t, g) => t + sum(starsOf(g.id)), 0) * 10;
  const rank = () => { const x = xp(); let r = RANKS[0]; RANKS.forEach(k => { if (x >= k[0]) r = k; }); return r; };
  const nextRank = () => RANKS.find(k => k[0] > xp());
  // ความแม่นรายหัวข้อ (%) = ดาวที่ได้ / ดาวเต็มของทุกด่านในหัวข้อนั้น
  function topicPct() {
    const o = {};
    TOPICS.forEach(t => {
      let got = 0, mx = 0;
      games.forEach(g => g.levels.forEach((l, i) => { if (l.t === t.n) { mx += 3; got += starsOf(g.id)[i] || 0; } }));
      o[t.n] = mx ? Math.round(got / mx * 100) : 0;
    });
    return o;
  }

  function topBar() {
    const r = rank();
    $('#xpChip').innerHTML = `<span style="color:${r[2]}">${r[1]}</span> · ${xp()} XP`;
    $('#sndBtn').innerHTML = ic(S.sound ? 'on' : 'off');
  }
  $('#sndBtn').onclick = () => { S.sound = !S.sound; save(); topBar(); sfx('tap'); };

  // ---------- หน้าหลัก ----------
  const TYPE = { lab: ['ทดลอง', 't-lab', '--lab'], ana: ['วิเคราะห์', 't-ana', '--ana'], rev: ['ทบทวน', 't-rev', '--rev'] };

  function hub() {
    const r = rank(), nx = nextRank(), x = xp();
    const pct = nx ? Math.round((x - r[0]) / (nx[0] - r[0]) * 100) : 100;
    const gcard = g => {
      const st = sum(starsOf(g.id)), mx = g.levels.length * 3, T = TYPE[g.type];
      return `<button class="gcard" data-go="#/g/${g.id}">
        <span class="ic" style="background:color-mix(in srgb, var(${T[2]}) 18%, transparent);color:var(${T[2]})">${ic(g.icon)}</span>
        <span class="tag ${T[1]}">${T[0]} · หัวข้อ ${g.topics}</span>
        <b>${g.name}</b><small>${g.blurb}</small>
        <span class="stars">★ ${st}/${mx}</span></button>`;
    };
    const tp = topicPct();
    const topicRows = TOPICS.map(t => {
      const p = tp[t.n];
      return `<div class="topic"><span class="n">${t.n}</span><div><div style="margin-bottom:4px">${t.name}</div><div class="bar"><i style="width:${p}%"></i></div></div><span class="muted" style="text-align:right">${p}%</span></div>`;
    }).join('');
    const I = window.GAME_INFO || {};
    app().innerHTML = `${ST && ST.note ? `<div class="card note-bar">${ST.note}</div>` : ''}
      <div class="eyebrow">${esc(I.eyebrow || 'วิทยาศาสตร์พื้นฐาน · ว30106 · บทที่ 1')}</div>
      <h1><span class="grad">${esc(I.title || 'การเคลื่อนที่และแรง')}</span></h1>
      <p class="muted" style="margin:0 0 18px">${esc(I.sub || 'ทดลองเอง วิเคราะห์เอง แล้วค่อยทบทวน ทุกด่านใช้ความรู้จากใบความรู้ 1–7')}</p>
      <div class="card player">
        <div class="rank" style="background:color-mix(in srgb, ${r[2]} 22%, transparent);color:${r[2]}">${r[1]}</div>
        <div>
          <div class="row" style="justify-content:space-between"><b id="pname">${S.name ? esc(S.name) : 'ตั้งชื่อผู้เล่น'}</b>${ST && ST.name ? '' : '<button class="back" id="rename">แก้ชื่อ</button>'}</div>
          <div class="muted" style="font-size:14px;margin:2px 0 8px">${x} XP${nx ? ` · อีก ${nx[0] - x} XP ถึง ${nx[1]}` : ' · แรงก์สูงสุดแล้ว'}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
        </div>
      </div>
      <h2>ภารกิจทดลอง</h2><div class="games">${games.filter(g => g.type === 'lab').map(gcard).join('')}</div>
      <h2>ภารกิจวิเคราะห์</h2><div class="games">${games.filter(g => g.type === 'ana').map(gcard).join('')}</div>
      <h2>ทบทวน</h2><div class="games">${games.filter(g => g.type === 'rev').map(gcard).join('')}
        <button class="gcard" data-go="#/duel"><span class="ic" style="background:rgba(255,55,95,.16);color:var(--duel)">${ic('duel')}</span>
        <span class="tag t-duel">2 คน · เครื่องเดียว</span><b>ดวลความไว</b><small>วางเครื่องกลางโต๊ะ หันหน้าเข้าหากัน ใครตอบถูกก่อนได้แต้ม</small></button></div>
      <h2>ความแม่นรายหัวข้อ</h2><div class="card topics">${topicRows}</div>`;
    if ($('#rename')) $('#rename').onclick = () => {
      const n = prompt('ชื่อเล่นหรือชื่อที่ใช้ในห้อง', S.name || '');
      if (n !== null) { S.name = n.trim().slice(0, 24); save(); hub(); }
    };
    bindGo();
  }

  function levelsPage(g) {
    const st = starsOf(g.id);
    app().innerHTML = `<button class="back" data-go="#/">${ic('back')}ภารกิจทั้งหมด</button>
      <div class="eyebrow" style="margin-top:14px">${TYPE[g.type][0]}</div><h1 style="font-size:34px">${g.name}</h1>
      <p class="muted" style="margin:0 0 18px">${g.how}</p>
      <div class="levels">${g.levels.map((l, i) => {
        const open = i === 0 || (st[i - 1] || 0) > 0;
        const s = st[i] || 0;
        return `<button class="lv" ${open ? `data-go="#/g/${g.id}/${i + 1}"` : 'disabled'}>
          <span class="num">ด่าน ${i + 1} · หัวข้อ ${l.t}</span><span class="ttl">${l.title}</span>
          <span class="stars">${'★'.repeat(s)}<span style="color:var(--line)">${'★'.repeat(3 - s)}</span></span></button>`;
      }).join('')}</div>`;
    bindGo();
  }

  let stopFn = null;
  function play(g, n) {
    const lv = g.levels[n - 1];
    if (!lv) return go('#/g/' + g.id);
    app().innerHTML = `<div class="play-head"><button class="back" data-go="#/g/${g.id}">${ic('back')}ด่าน</button>
      <span class="t">ด่าน ${n} · ${lv.title}</span><span class="hud" id="hud"></span>
      <button class="icon-btn" id="restart" aria-label="เริ่มด่านใหม่">${ic('redo')}</button></div><div id="stage"></div>`;
    bindGo();
    const el = $('#stage');
    const api = {
      hud: t => { $('#hud').textContent = t; },
      sfx, toast,
      done: (stars, note) => { sfx('win'); finish(g, n, stars, note); }
    };
    $('#restart').onclick = () => play(g, n);
    const tr = S.tries[g.id] = S.tries[g.id] || [];
    tr[n - 1] = (tr[n - 1] || 0) + 1; save();
    stopFn = g.play(el, lv, n - 1, api) || null;
  }

  function finish(g, n, stars, note) {
    const arr = S.stars[g.id] = S.stars[g.id] || [];
    const before = arr[n - 1] || 0;
    arr[n - 1] = Math.max(before, stars);
    save(true); topBar();
    const gain = Math.max(0, stars - before) * 10;
    const hasNext = n < g.levels.length;
    const ov = document.createElement('div');
    ov.className = 'ov';
    ov.innerHTML = `<div class="box"><div class="eyebrow">ผ่านด่าน ${n}</div>
      <div class="big-stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></div>
      <div class="muted">${gain ? `+${gain} XP` : 'ทำลายสถิติเดิมเพื่อรับ XP เพิ่ม'}</div>
      ${note ? `<div class="note">${note}</div>` : ''}
      <div class="row" style="justify-content:center">
        <button class="btn ghost" data-a="again">เล่นซ้ำ</button>
        ${hasNext ? '<button class="btn" data-a="next">ด่านต่อไป</button>' : '<button class="btn" data-a="list">กลับหน้าภารกิจ</button>'}
      </div></div>`;
    document.body.appendChild(ov);
    ov.onclick = e => {
      const a = e.target.dataset.a; if (!a) return;
      ov.remove();
      if (a === 'again') play(g, n);
      else if (a === 'next') go(`#/g/${g.id}/${n + 1}`);
      else go('#/');
    };
  }

  let toastT = null;
  function toast(msg, kind = '') {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); document.body.appendChild(t); }
    t.className = 'toast ' + kind; t.innerHTML = msg;
    clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
  }

  // ---------- เส้นทาง ----------
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  function bindGo() { app().querySelectorAll('[data-go]').forEach(b => b.onclick = () => { sfx('tap'); go(b.dataset.go); }); }
  function route() {
    if (stopFn) { try { stopFn(); } catch (e) {} stopFn = null; }
    document.querySelectorAll('.ov, .duel, .toast').forEach(e => e.remove());
    topBar(); scrollTo(0, 0);
    const p = location.hash.replace(/^#\/?/, '').split('/');
    if (p[0] === 'g') {
      const g = games.find(x => x.id === p[1]);
      if (!g) return hub();
      if (p[2]) {
        const n = +p[2], st = starsOf(g.id);
        if (n > 1 && !(st[n - 2] > 0)) return go('#/g/' + g.id);
        return play(g, n);
      }
      return levelsPage(g);
    }
    if (p[0] === 'duel' && window.Duel) { stopFn = Duel.open(app(), { sfx, go, ic }); return; }
    hub();
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // แคนวาสคมชัดตามจอ: คืน {c, ctx, w, h} และปรับขนาดเมื่อจอเปลี่ยน
  function stage(el, ratio, draw) {
    const c = document.createElement('canvas'); c.className = 'stage'; el.appendChild(c);
    const ctx = c.getContext('2d'); const o = { c, ctx, w: 0, h: 0 };
    const fit = () => {
      const w = c.clientWidth, h = Math.round(w * ratio), d = window.devicePixelRatio || 1;
      c.style.height = h + 'px'; c.width = w * d; c.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      o.w = w; o.h = h; draw && draw();
    };
    o.fit = fit; queueMicrotask(fit);           // หลังเกมตั้งค่าเสร็จ ก่อนวาดหน้าจอ
    const ro = new ResizeObserver(() => fit()); ro.observe(c); o.stop = () => ro.disconnect();
    return o;
  }

  function arrow(ctx, x1, y1, x2, y2, col, w = 3, head = 10) {
    const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1) return;
    const hh = Math.min(head, L * 0.6);
    ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - hh * 0.7 * Math.cos(a), y2 - hh * 0.7 * Math.sin(a)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hh * Math.cos(a - 0.45), y2 - hh * Math.sin(a - 0.45));
    ctx.lineTo(x2 - hh * Math.cos(a + 0.45), y2 - hh * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
  }

  window.KG = {
    reg: g => games.push(g), start: () => { window.addEventListener('hashchange', route); route(); },
    ic, esc, shuffle, stage, arrow, sfx, toast, go,
    font: '600 13px -apple-system, "IBM Plex Sans Thai", sans-serif'
  };
})();
