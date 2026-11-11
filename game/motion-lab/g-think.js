// ภารกิจวิเคราะห์: สร้างกราฟ v–t · จับผิดคำ  —  ทบทวน: จับคู่การ์ด · โดมิโน
(function () {
  const { esc, shuffle, stage } = KG;
  const fmt = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('th-TH', { maximumFractionDigits: d });
  const byPenalty = p => p === 0 ? 3 : p <= 2 ? 2 : 1;

  // =====================================================================
  // 1) สร้างกราฟ v–t
  // =====================================================================
  const tape = cms => `<svg viewBox="0 0 ${cms.reduce((a, b) => a + b, 0) * 16 + 20} 46" style="width:100%;max-width:520px;display:block;margin-top:8px">
    <rect x="0" y="6" width="100%" height="24" rx="3" fill="#f5f0e1"/>${(() => {
      let x = 10, s = '';
      cms.forEach((c, i) => {
        s += `<circle cx="${x}" cy="18" r="3" fill="#15171c"/><line x1="${x}" y1="6" x2="${x}" y2="30" stroke="#c0392b" stroke-width="1" stroke-dasharray="2 2"/>
              <text x="${x + c * 8}" y="44" fill="#a1a1ae" font-size="10" text-anchor="middle">${c} cm</text>`;
        x += c * 16;
      });
      return s + `<circle cx="${x}" cy="18" r="3" fill="#15171c"/><line x1="${x}" y1="6" x2="${x}" y2="30" stroke="#c0392b" stroke-width="1" stroke-dasharray="2 2"/>`;
    })()}</svg>`;

  const G_LEVELS = [
    { t: 3, title: 'ความเร็วคงตัว', ts: [0, 1, 2, 3, 4], vmin: 0, vmax: 10, step: 1, target: [6, 6, 6, 6, 6],
      brief: 'รถวิ่งด้วย<b>ความเร็วคงตัว 6 m/s</b> นาน 4 s ลากจุดให้เป็นกราฟ v–t ของรถคันนี้',
      note: 'ความเร็วคงตัว → เส้นราบขนานแกนเวลา ความชันเป็นศูนย์ จึงไม่มีความเร่ง' },
    { t: 3, title: 'ออกตัวจากหยุดนิ่ง', ts: [0, 1, 2, 3, 4], vmin: 0, vmax: 10, step: 1, target: [0, 2, 4, 6, 8],
      brief: 'รถออกตัวจาก<b>หยุดนิ่ง</b> ด้วยความเร่ง <b>2 m/s²</b> นาน 4 s',
      note: 'ความเร็วเพิ่ม 2 m/s ทุกวินาที → เส้นตรงชันขึ้น ความชัน = 8 ÷ 4 = 2 m/s²' },
    { t: 3, title: 'เบรกจนหยุด', ts: [0, 1, 2, 3, 4], vmin: 0, vmax: 15, step: 1, target: [12, 9, 6, 3, 0],
      brief: 'รถวิ่ง <b>12 m/s</b> แล้วเบรกด้วยความเร่ง <b>−3 m/s²</b> จนหยุด',
      note: 'เส้นตรงชันลงจนแตะแกนเวลา ความชันติดลบ แปลว่าความเร่งสวนทางกับความเร็ว รถจึงช้าลง' },
    { t: 2, title: 'จากแถบกระดาษสู่กราฟ', ts: [1, 2, 3, 4, 5], xl: 'ช่วงที่', vmin: 0, vmax: 1, step: .1, target: [.3, .3, .3, .5, .7],
      brief: 'แถบกระดาษจากเครื่องเคาะสัญญาณเวลา แบ่งเป็นช่วงละ <b>0.1 s</b> หาความเร็วเฉลี่ยของแต่ละช่วง (ระยะ ÷ 0.1 s) แล้วลงกราฟ',
      tape: [3, 3, 3, 5, 7],
      note: 'ช่วงแรกจุดห่างเท่ากัน (0.3 m/s คงตัว) ช่วงหลังห่างขึ้นเรื่อย ๆ จึงเร็วขึ้น: 5 cm ÷ 0.1 s = 50 cm/s = 0.5 m/s' },
    { t: 2, title: 'ตกแบบเสรี', ts: [0, 1, 2, 3], vmin: 0, vmax: 30, step: .2, tol: .3, target: [0, 9.8, 19.6, 29.4],
      brief: 'ปล่อยลูกเหล็กจาก<b>หยุดนิ่ง</b> ไม่คิดแรงต้านอากาศ ใช้ g = <b>9.8 m/s²</b> (ให้ทิศลงเป็นบวก) แตะจุดแล้วใช้ปุ่ม − / + ปรับละเอียดได้',
      note: 'ตกแบบเสรีความเร็วเพิ่ม 9.8 m/s ทุกวินาที ความชันของกราฟเท่ากับ g ไม่ว่าวัตถุหนักเท่าไร' },
    { t: 3, title: 'เร่ง วิ่ง เบรก', ts: [0, 1, 2, 3, 4, 5, 6], vmin: 0, vmax: 10, step: 1, target: [0, 4, 8, 8, 8, 4, 0],
      brief: 'ออกตัวจากหยุดนิ่ง เร่ง <b>4 m/s²</b> นาน 2 s → วิ่งคงที่ 2 s → เบรกจน<b>หยุดใน 2 s</b>',
      note: 'สามช่วง สามความชัน: +4, 0, −4 m/s² อ่านความเร่งได้จากความชันของแต่ละช่วง' },
    { t: 2, title: 'โยนขึ้นแล้วตกลง', ts: [0, 1, 2, 3, 4], vmin: -20, vmax: 20, step: .2, tol: .3, target: [19.6, 9.8, 0, -9.8, -19.6],
      brief: 'โยนลูกบอลขึ้นตรง ๆ ด้วยความเร็ว <b>19.6 m/s</b> ให้<b>ทิศขึ้นเป็นบวก</b> วาดความเร็วตั้งแต่โยนจนกลับมาที่เดิม',
      note: 'ที่จุดสูงสุด (t = 2 s) ความเร็วเป็นศูนย์ แต่เส้นยังชันเท่าเดิม แปลว่าความเร่งยังเป็น −9.8 m/s² ตลอด ไม่ได้เป็นศูนย์' }
  ];

  function playGraph(el, L, idx, api) {
    el.innerHTML = `<div class="brief">${L.brief}${L.tape ? tape(L.tape) : ''}</div>`;
    const n = L.ts.length, v = L.ts.map(() => Math.max(L.vmin, 0)), bad = new Set();
    let sel = -1, drag = -1, tries = 0;
    const st = stage(el, 0.6, draw);
    const ctrl = document.createElement('div'); ctrl.className = 'ctrl';
    ctrl.innerHTML = `<div class="row"><button class="btn ghost" id="dn">−</button><span class="muted" id="sv" style="min-width:150px;text-align:center;font-size:14px">แตะจุดเพื่อเลือก</span><button class="btn ghost" id="up">+</button>
      <span class="sp" style="flex:1"></span><button class="btn big" id="chk">ตรวจกราฟ</button></div>`;
    el.appendChild(ctrl);
    api.hud('ตรวจ 0 ครั้ง');
    const pad = { l: 46, r: 18, t: 16, b: 46 };
    const px = i => pad.l + i / (n - 1) * (st.w - pad.l - pad.r);
    const py = val => pad.t + (L.vmax - val) / (L.vmax - L.vmin) * (st.h - pad.t - pad.b);
    const snap = val => Math.min(L.vmax, Math.max(L.vmin, Math.round(val / L.step) * L.step));

    function draw() {
      const { ctx, w, h } = st; if (!w) return;
      ctx.clearRect(0, 0, w, h); ctx.font = KG.font;
      const R = L.vmax - L.vmin, gridStep = R <= 1 ? 0.1 : R <= 15 ? 1 : 5;
      ctx.textAlign = 'right';
      for (let k = 0, y = L.vmin; y <= L.vmax + 1e-9; k++, y = L.vmin + k * gridStep) {
        ctx.strokeStyle = Math.abs(y) < 1e-9 ? '#6e6e7c' : 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, py(y)); ctx.lineTo(w - pad.r, py(y)); ctx.stroke();
        if (R <= 10 || R > 15 || k % 2 === 0) { ctx.fillStyle = '#6e6e7c'; ctx.fillText(fmt(y), pad.l - 6, py(y) + 4); }
      }
      ctx.textAlign = 'center';
      L.ts.forEach((t, i) => {
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(px(i), pad.t); ctx.lineTo(px(i), h - pad.b); ctx.stroke();
        ctx.fillStyle = '#6e6e7c'; ctx.fillText(t, px(i), h - 26);
      });
      ctx.textAlign = 'right'; ctx.fillStyle = '#a1a1ae'; ctx.fillText(L.xl ? L.xl + ' (ช่วงละ 0.1 s)' : 't (s)', w - pad.r, h - 6);
      ctx.save(); ctx.translate(12, h / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#a1a1ae'; ctx.fillText('v (m/s)', 0, 0); ctx.restore();
      // เส้นและความชัน
      ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 3; ctx.beginPath();
      v.forEach((y, i) => i ? ctx.lineTo(px(i), py(y)) : ctx.moveTo(px(i), py(y))); ctx.stroke();
      if (!L.xl) {
        ctx.fillStyle = '#bf5af2';
        for (let i = 1; i < n; i++) {
          const a = (v[i] - v[i - 1]) / (L.ts[i] - L.ts[i - 1]);
          ctx.fillText('a=' + fmt(a), (px(i) + px(i - 1)) / 2, Math.min(py(v[i]), py(v[i - 1])) - 10);
        }
      }
      v.forEach((y, i) => {
        ctx.fillStyle = bad.has(i) ? '#ff453a' : i === sel ? '#4f8cff' : '#fff';
        ctx.beginPath(); ctx.arc(px(i), py(y), i === sel ? 10 : 8, 0, 7); ctx.fill();
      });
    }
    const showSel = () => {
      ctrl.querySelector('#sv').textContent = sel < 0 ? 'แตะจุดเพื่อเลือก' : `${L.xl ? L.xl + ' ' + L.ts[sel] : 't = ' + L.ts[sel] + ' s'} · v = ${fmt(v[sel])} m/s`;
    };
    const setV = (i, val) => { v[i] = +snap(val).toFixed(3); bad.delete(i); showSel(); draw(); };
    const near = e => {
      const r = st.c.getBoundingClientRect(), x = e.clientX - r.left;
      let best = -1, d = 1e9; for (let i = 0; i < n; i++) { const dd = Math.abs(px(i) - x); if (dd < d) { d = dd; best = i; } }
      return d < 40 ? best : -1;
    };
    const yval = e => { const r = st.c.getBoundingClientRect(), y = e.clientY - r.top; return L.vmax - (y - pad.t) / (st.h - pad.t - pad.b) * (L.vmax - L.vmin); };
    st.c.addEventListener('pointerdown', e => { const i = near(e); if (i < 0) return; sel = drag = i; st.c.setPointerCapture(e.pointerId); setV(i, yval(e)); });
    st.c.addEventListener('pointermove', e => { if (drag >= 0) setV(drag, yval(e)); });
    st.c.addEventListener('pointerup', () => { drag = -1; });
    ctrl.querySelector('#up').onclick = () => sel >= 0 && setV(sel, v[sel] + L.step);
    ctrl.querySelector('#dn').onclick = () => sel >= 0 && setV(sel, v[sel] - L.step);
    ctrl.querySelector('#chk').onclick = () => {
      tries++; api.hud(`ตรวจ ${tries} ครั้ง`); bad.clear();
      const tol = L.tol || L.step / 2;
      v.forEach((y, i) => { if (Math.abs(y - L.target[i]) > tol) bad.add(i); });
      draw();
      if (!bad.size) { api.sfx('good'); setTimeout(() => api.done(tries === 1 ? 3 : tries <= 3 ? 2 : 1, L.note), 300); }
      else { api.sfx('bad'); api.toast(`ยังไม่ตรง ${bad.size} จุด (จุดสีแดง) อ่านโจทย์อีกครั้ง`, 'bad'); }
    };
    return () => st.stop();
  }

  KG.reg({ id: 'graph', type: 'ana', icon: 'graph', topics: '2–3', name: 'สร้างกราฟ v–t',
    blurb: 'อ่านเรื่องราว แถบกระดาษ หรือการตก แล้วลากจุดสร้างกราฟความเร็วกับเวลาเอง',
    how: 'ลากจุดขึ้นลงให้กราฟตรงกับเรื่อง ระหว่างจุดจะแสดงความชัน (= ความเร่ง) ให้ดู ตรวจผ่านในครั้งแรกได้ 3 ดาว',
    levels: G_LEVELS, play: playGraph });

  // =====================================================================
  // 2) จับผิดคำ
  // =====================================================================
  function playSpot(el, L, idx, api) {
    const S = SPOTS[L.t], toks = [];
    const re = /(\s*)(\[[^\]]+\]|[^\s\[]+)/g; let m;
    while ((m = re.exec(S.text))) {
      const sp = !!m[1] && toks.length > 0, t = m[2];
      if (t[0] === '[') { const p = t.slice(1, -1).split('|'); toks.push({ sp, err: true, wrong: p[0], right: p[1], opts: shuffle(p.slice(1)), done: false }); }
      else toks.push({ sp, text: t });
    }
    const errs = toks.filter(t => t.err);
    let miss = 0, wrongFix = 0, open = null;
    el.innerHTML = `<div class="brief"><b>${esc(S.who)}</b> · แตะคำหรือตัวเลขที่<b>ผิด</b> จากนั้นเลือกคำที่ถูกมาแทน · มีที่ผิด ${errs.length} จุด แตะคำที่ถูกอยู่แล้วจะเสียคะแนน</div>
      <div class="para" id="para"></div><div class="picker" id="pick"></div>`;
    const para = el.querySelector('#para'), pick = el.querySelector('#pick');
    const hud = () => api.hud(`พบ ${errs.filter(e => e.done).length}/${errs.length} · พลาด ${miss + wrongFix}`);
    function render() {
      para.innerHTML = toks.map((t, i) => (t.sp ? ' ' : '') +
        `<button class="w ${t.err && t.done ? 'fixed' : ''}" data-i="${i}">${esc(t.err ? (t.done ? t.right : t.wrong) : t.text)}</button>`).join('');
      hud();
    }
    para.onclick = e => {
      const b = e.target.closest('.w'); if (!b) return;
      const t = toks[+b.dataset.i];
      if (t.err && t.done) return;
      if (!t.err) {
        miss++; api.sfx('bad'); b.classList.add('miss'); setTimeout(() => b.classList.remove('miss'), 600); hud();
        pick.innerHTML = ''; open = null; return;
      }
      open = t; api.sfx('tap');
      pick.innerHTML = `<span class="muted" style="width:100%;font-size:14px">แก้ “${esc(t.wrong)}” เป็น</span>` +
        t.opts.map(o => `<button class="btn ghost" data-o="${esc(o)}">${esc(o)}</button>`).join('');
    };
    pick.onclick = e => {
      const b = e.target.closest('[data-o]'); if (!b || !open) return;
      if (b.dataset.o === open.right) {
        open.done = true; open = null; pick.innerHTML = ''; api.sfx('good'); render();
        if (errs.every(x => x.done)) {
          const list = errs.map(x => `<div>• <s style="color:var(--dim)">${esc(x.wrong)}</s> → <b style="color:#9cf0b4">${esc(x.right)}</b></div>`).join('');
          setTimeout(() => api.done(byPenalty(miss + wrongFix), list), 400);
        }
      } else { wrongFix++; api.sfx('bad'); b.disabled = true; hud(); }
    };
    render();
  }
  const T7 = TOPICS.map(t => ({ t: t.n, title: t.name }));
  KG.reg({ id: 'spot', type: 'ana', icon: 'spot', topics: '1–7', name: 'จับผิดคำ',
    blurb: 'รายงาน โพสต์ และบันทึกแล็บของเพื่อนมีคำหรือตัวเลขผิดซ่อนอยู่ หาให้เจอแล้วแก้',
    how: 'แตะเฉพาะคำที่ผิด แล้วเลือกคำที่ถูก แตะคำที่ถูกอยู่แล้วหรือเลือกคำแก้ผิดจะเสียคะแนน',
    levels: T7, play: playSpot });

  // =====================================================================
  // 3) จับคู่การ์ด
  // =====================================================================
  function playCards(el, L, idx, api) {
    const pairs = PAIRS[L.t];
    const cards = shuffle(pairs.flatMap((p, i) => [{ id: i, text: p[0] }, { id: i, text: p[1] }]));
    let up = [], moves = 0, found = 0, lock = false;
    el.innerHTML = `<div class="brief">พลิกการ์ดทีละ 2 ใบ หาคู่ที่ความหมายตรงกัน · ${pairs.length} คู่ ใช้น้อยรอบได้ดาวมาก</div><div class="mem" id="mem"></div>`;
    const box = el.querySelector('#mem');
    box.innerHTML = cards.map((c, i) => `<button class="mc back" data-i="${i}">${esc(c.text)}</button>`).join('');
    const hud = () => api.hud(`จับคู่ ${found}/${pairs.length} · ${moves} รอบ`); hud();
    box.onclick = e => {
      const b = e.target.closest('.mc'); if (!b || lock || !b.classList.contains('back')) return;
      b.classList.remove('back'); b.classList.add('up'); up.push(b); api.sfx('tap');
      if (up.length < 2) return;
      moves++; const [a, c] = up, ca = cards[+a.dataset.i], cc = cards[+c.dataset.i];
      if (ca.id === cc.id) {
        [a, c].forEach(x => { x.classList.remove('up'); x.classList.add('done'); }); up = []; found++; api.sfx('good'); hud();
        if (found === pairs.length) setTimeout(() => api.done(moves <= 9 ? 3 : moves <= 13 ? 2 : 1,
          pairs.map(p => `<div>• ${esc(p[0])} — <b>${esc(p[1])}</b></div>`).join('')), 400);
      } else {
        lock = true; [a, c].forEach(x => x.classList.add('nope')); hud();
        setTimeout(() => { [a, c].forEach(x => { x.classList.remove('up', 'nope'); x.classList.add('back'); }); up = []; lock = false; }, 900);
      }
    };
  }
  KG.reg({ id: 'cards', type: 'rev', icon: 'cards', topics: '1–7', name: 'จับคู่การ์ด',
    blurb: 'พลิกหาคู่ คำศัพท์กับความหมาย สถานการณ์กับผลลัพธ์ ปริมาณกับหน่วย',
    how: 'พลิกการ์ดทีละ 2 ใบ ถ้าเป็นคู่กันจะเปิดค้างไว้ จำตำแหน่งให้ดี ใช้ไม่เกิน 9 รอบได้ 3 ดาว',
    levels: T7, play: playCards });

  // =====================================================================
  // 4) โดมิโน
  // =====================================================================
  function playDomino(el, L, idx, api) {
    const C = CHAINS[L.t], N = C.links.length;
    const tiles = C.links.map((l, i) => ({ k: i, left: l[1], right: i + 1 < N ? C.links[i + 1][0] : 'จบ' }));
    C.fake.forEach((f, j) => tiles.push({ k: -1, left: f, right: C.links[(j * 3 + 1) % N][0] }));
    const tray = shuffle(tiles);
    let at = 0, err = 0;
    el.innerHTML = `<div class="brief">ต่อโดมิโนให้ครบสาย: เลือกตัวที่<b>ครึ่งซ้าย</b>ตอบคำถามของตัวล่าสุด · มีตัวหลอก ${C.fake.length} ตัวที่ไม่ได้อยู่ในสาย</div>
      <div class="chainbox" id="chain"></div><div class="tray" id="tray"></div>`;
    const chain = el.querySelector('#chain'), trayEl = el.querySelector('#tray');
    const hud = () => api.hud(`ต่อแล้ว ${at}/${N} · ผิด ${err}`);
    function render() {
      chain.innerHTML = `<div class="dom placed"><span>เริ่ม</span><span>${esc(C.links[0][0])}</span></div>` +
        tiles.filter(t => t.k >= 0 && t.k < at).sort((a, b) => a.k - b.k)
          .map(t => `<div class="dom placed"><span>${esc(t.left)}</span><span>${esc(t.right)}</span></div>`).join('') +
        (at < N ? `<div class="dom open"><span class="muted">?</span><span class="muted">ตัวถัดไป</span></div>` : '');
      trayEl.innerHTML = tray.map((t, i) => t.k >= 0 && t.k < at ? '' :
        `<button class="dom" data-i="${i}"><span>${esc(t.left)}</span><span>${esc(t.right)}</span></button>`).join('');
      hud();
    }
    trayEl.onclick = e => {
      const b = e.target.closest('.dom'); if (!b) return;
      const t = tray[+b.dataset.i];
      if (t.k === at) {
        at++; api.sfx('good'); render();
        if (at === N) setTimeout(() => api.done(byPenalty(err), C.links.map(l => `<div>• ${esc(l[0])} <b>${esc(l[1])}</b></div>`).join('')), 400);
      } else {
        err++; api.sfx('bad'); hud(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        api.toast(t.k < 0 ? 'ตัวนี้เป็นตัวหลอก ไม่ได้อยู่ในสาย' : 'ยังไม่ใช่คำตอบของคำถามล่าสุด', 'bad');
      }
    };
    render();
  }
  KG.reg({ id: 'domino', type: 'rev', icon: 'domino', topics: '1–7', name: 'โดมิโนคำถาม',
    blurb: 'ครึ่งซ้ายตอบ ครึ่งขวาถาม ต่อให้ครบสายโดยไม่หลงตัวหลอก',
    how: 'ดูคำถามที่ปลายสาย แล้วหาโดมิโนที่ครึ่งซ้ายเป็นคำตอบ ไม่ผิดเลยได้ 3 ดาว',
    levels: T7, play: playDomino });
})();
