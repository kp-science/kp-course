// ภารกิจทดลอง: ยิงให้ถึงเป้า (โพรเจกไทล์) · แล็บแรง (ΣF = ma, กิริยา–ปฏิกิริยา) · ปล่อยเชือก (วงกลม)
(function () {
  const g = 9.8;
  const { stage, arrow } = KG;
  const fmt = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('th-TH', { maximumFractionDigits: d });

  function slider(label, o, unit) {
    return `<label class="slider ${o.lock ? 'locked' : ''}"><span>${label}</span>
      <input type="range" min="${o.min}" max="${o.max}" step="${o.step}" value="${o.val}" ${o.lock ? 'disabled' : ''}>
      <output></output></label>`;
  }
  function bindSlider(lab, unit, d, on) {
    const r = lab.querySelector('input'), out = lab.querySelector('output');
    const upd = () => { out.textContent = fmt(+r.value, d) + ' ' + unit; on && on(+r.value); };
    r.oninput = upd; upd(); return r;
  }
  const starsBy = (n, par) => n <= par ? 3 : n <= par + 2 ? 2 : 1;

  // =====================================================================
  // 1) ยิงให้ถึงเป้า
  // =====================================================================
  const P_LEVELS = [
    { t: 6, title: 'ล็อกอัตราเร็ว หามุม', brief: 'ปืนยิงด้วยอัตราเร็ว <b>10 m/s</b> คงที่ ปรับมุมให้ลูกตกลงถังที่ห่าง <b>10 m</b>',
      v: { min: 5, max: 20, step: .5, val: 10, lock: 1 }, a: { min: 5, max: 85, step: 1, val: 20 }, d: 10, w: .3, xmax: 16,
      note: 'ลองสังเกต: มีมุม <b>2 มุม</b> ที่ลงถังได้ (ราว 39° และ 51°) เพราะมุมที่รวมกันได้ 90° ตกไกลเท่ากัน' },
    { t: 6, title: 'ล็อกมุม 45° หาอัตราเร็ว', brief: 'มุมล็อกไว้ที่ <b>45°</b> ปรับอัตราเร็วให้ตกลงถังที่ห่าง <b>14.4 m</b>',
      v: { min: 5, max: 20, step: .5, val: 8 }, a: { min: 5, max: 85, step: 1, val: 45, lock: 1 }, d: 14.4, w: .6, xmax: 20,
      note: 'ที่มุม 45° ระยะตกขึ้นกับอัตราเร็วยกกำลังสอง: เร็วขึ้น 2 เท่า ไปไกลขึ้น 4 เท่า' },
    { t: 6, title: 'ข้ามกำแพง', brief: 'มีกำแพงสูง <b>5 m</b> ที่ระยะ 9 m เป้าอยู่ที่ <b>18 m</b> ต้องยิงโค้งสูงพอ',
      v: { min: 5, max: 20, step: .5, val: 12 }, a: { min: 5, max: 85, step: 1, val: 30 }, d: 18, w: .7, xmax: 22, wall: { x: 9, h: 5 },
      note: 'มุมสูงลอยนานกว่าและขึ้นสูงกว่า แต่ความเร็วแนวระดับน้อยลง จึงต้องเพิ่มอัตราเร็วเพื่อไปให้ถึงเป้า' },
    { t: 6, title: 'สองมุม หนึ่งเป้า', brief: 'อัตราเร็วล็อกที่ <b>12 m/s</b> ยิงลงถังที่ <b>12.7 m</b> ให้ได้ <b>ด้วย 2 มุมที่ต่างกัน</b>',
      v: { min: 5, max: 20, step: .5, val: 12, lock: 1 }, a: { min: 5, max: 85, step: 1, val: 45 }, d: 12.73, w: .5, xmax: 18, two: 1, par: 3,
      note: '30° กับ 60° รวมกันได้ 90° จึงตกไกลเท่ากัน มุม 60° ลอยสูงและนานกว่า แต่วิ่งแนวระดับช้ากว่า' },
    { t: 6, title: 'ยิงแนวระดับจากหน้าผา', brief: 'ยิงในแนวระดับ (มุม 0°) จากหน้าผาสูง <b>5 m</b> ให้ตกที่ห่างโคนหน้าผา <b>6 m</b>',
      v: { min: 1, max: 15, step: .5, val: 3 }, a: { min: 0, max: 0, step: 1, val: 0, lock: 1 }, d: 6, w: .45, xmax: 12, h0: 5,
      note: 'เวลาตกขึ้นกับความสูงอย่างเดียว (ราว 1 s จากความสูง 5 m) ยิงเร็วแค่ไหนก็ตกถึงพื้นพร้อมลูกที่ปล่อยตกเฉย ๆ' },
    { t: 6, title: 'ใต้เพดานต่ำ', brief: 'เพดานสูงแค่ <b>4 m</b> ต้องส่งลูกไปถึง <b>20 m</b> โดยไม่ชนเพดาน',
      v: { min: 5, max: 20, step: .5, val: 12 }, a: { min: 5, max: 85, step: 1, val: 45 }, d: 20, w: .8, xmax: 24, ceil: 4,
      note: 'มุมต่ำขึ้นไม่สูง แต่ต้องใช้อัตราเร็วมาก จุดสูงสุดขึ้นกับความเร็วแนวดิ่งตอนเริ่มเท่านั้น' }
  ];

  function playProjectile(el, L, idx, api) {
    el.innerHTML = `<div class="brief">${L.brief}</div>`;
    const x0 = L.h0 ? 2 : 1, h0 = L.h0 || 0;
    let ang = L.a.val, spd = L.v.val, shots = 0, paths = [], cur = null, raf = 0, hitAngles = [], showVec = true, last = null;
    const st = stage(el, 0.5, draw);
    const ctrl = document.createElement('div'); ctrl.className = 'ctrl';
    ctrl.innerHTML = slider('มุมยิง', L.a) + slider('อัตราเร็ว', L.v) +
      `<div class="row"><button class="btn big" id="fire">ยิง</button>
       <label class="row muted" style="font-size:14px;gap:6px"><input type="checkbox" id="vec" checked> แสดงความเร็วแนวระดับ/แนวดิ่ง</label></div>
       <div class="readout" id="ro"></div>`;
    el.appendChild(ctrl);
    const [la, lv] = ctrl.querySelectorAll('.slider');
    bindSlider(la, '°', 0, v => { ang = v; draw(); });
    bindSlider(lv, 'm/s', 1, v => { spd = v; draw(); });
    ctrl.querySelector('#vec').onchange = e => { showVec = e.target.checked; draw(); };
    const ro = ctrl.querySelector('#ro');
    const hud = () => api.hud(L.two ? `ลงถัง ${hitAngles.length}/2 มุม · ยิง ${shots} ครั้ง` : `ยิง ${shots} ครั้ง`);
    hud();

    const sc = () => st.w / L.xmax;                    // px ต่อเมตร
    const X = x => x * sc(), Y = y => st.h - 18 - y * sc();

    function simulate() {
      const r = ang * Math.PI / 180, vx = spd * Math.cos(r), vy = spd * Math.sin(r), pts = [];
      let end = 'out', t = 0;
      for (; t < 8; t += 0.005) {
        const x = x0 + vx * t, y = h0 + vy * t - 0.5 * g * t * t;
        pts.push([x, y, t]);
        if (L.wall && Math.abs(x - x0 - L.wall.x) <= .15 && y <= L.wall.h) { end = 'wall'; break; }
        if (L.ceil && y >= L.ceil) { end = 'ceil'; break; }
        if (y <= 0 && t > 0.01) { end = 'ground'; break; }
        if (x > L.xmax + 1) break;
      }
      const lx = pts[pts.length - 1][0] - x0;
      const top = Math.max(...pts.map(p => p[1]));
      return { pts, end, t, vx, vy, land: lx, top, ang, hit: end === 'ground' && Math.abs(lx - L.d) <= L.w };
    }

    function fire() {
      if (cur) return;
      shots++; hud(); api.sfx('shot');
      cur = simulate(); cur.k = 0;
      const t0 = performance.now();
      const step = now => {
        const tt = (now - t0) / 1000 * 1.1;
        cur.k = cur.pts.findIndex(p => p[2] >= tt); if (cur.k < 0) cur.k = cur.pts.length;
        draw();
        if (cur.k < cur.pts.length) raf = requestAnimationFrame(step); else landed();
      };
      raf = requestAnimationFrame(step);
    }

    function landed() {
      const s = cur; last = s; paths.push(s); if (paths.length > 4) paths.shift(); cur = null;
      ro.innerHTML = `<div>ตกที่ระยะ<b>${s.end === 'ground' ? fmt(s.land) + ' m' : s.end === 'wall' ? 'ชนกำแพง' : s.end === 'ceil' ? 'ชนเพดาน' : 'เลยจอ'}</b></div>
        <div>เวลาลอย<b>${fmt(s.t, 2)} s</b></div><div>สูงสุด<b>${fmt(s.top)} m</b></div>
        <div>ความเร็วแนวระดับ<b>${fmt(s.vx)} m/s คงตัว</b></div>`;
      draw();
      if (!s.hit) {
        api.sfx('bad');
        const why = s.end === 'wall' ? 'ชนกำแพง ลองเพิ่มมุม' : s.end === 'ceil' ? 'ชนเพดาน ลองลดมุมแล้วเพิ่มความเร็ว'
          : s.land < L.d ? `ขาดไป ${fmt(L.d - s.land)} m` : `เกินไป ${fmt(s.land - L.d)} m`;
        api.toast(why, 'bad'); return;
      }
      api.sfx('good');
      if (L.two) {
        if (hitAngles.some(a => Math.abs(a - s.ang) < 10)) { api.toast('มุมนี้ลงแล้ว ลองหามุมที่ต่างกันอย่างน้อย 10°'); return; }
        hitAngles.push(s.ang); hud();
        if (hitAngles.length < 2) { api.toast(`ลงถังที่ ${s.ang}° — หาอีกมุมหนึ่ง`, 'good'); return; }
      }
      setTimeout(() => api.done(starsBy(shots, L.par || 2), L.note), 500);
    }

    function draw() {
      const { ctx, w, h } = st; if (!w) return;
      ctx.clearRect(0, 0, w, h);
      const s = sc();
      // ตาราง 1 m
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
      for (let x = 0; x <= L.xmax; x++) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), Y(0)); ctx.stroke(); }
      for (let y = 0; Y(y) > 0; y++) { ctx.beginPath(); ctx.moveTo(0, Y(y)); ctx.lineTo(w, Y(y)); ctx.stroke(); }
      // พื้น + สเกล
      ctx.fillStyle = '#1c1c28'; ctx.fillRect(0, Y(0), w, h - Y(0));
      ctx.fillStyle = '#6e6e7c'; ctx.font = KG.font; ctx.textAlign = 'center';
      for (let d = 0; d <= L.xmax - x0; d += (L.xmax > 18 ? 4 : 2)) ctx.fillText(d, X(x0 + d), h - 3);
      if (L.h0) { ctx.fillStyle = '#2a2a3a'; ctx.fillRect(0, Y(h0), X(x0), Y(0) - Y(h0)); }
      // กำแพง เพดาน
      if (L.wall) { ctx.fillStyle = '#ff9f0a'; ctx.fillRect(X(x0 + L.wall.x) - 4, Y(L.wall.h), 8, Y(0) - Y(L.wall.h)); }
      if (L.ceil) {
        ctx.fillStyle = 'rgba(255,69,58,.18)'; ctx.fillRect(0, 0, w, Y(L.ceil));
        ctx.strokeStyle = '#ff453a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, Y(L.ceil)); ctx.lineTo(w, Y(L.ceil)); ctx.stroke();
        ctx.fillStyle = '#ff8a80'; ctx.textAlign = 'right'; ctx.fillText('เพดาน ' + L.ceil + ' m', w - 8, Y(L.ceil) - 6);
      }
      // ถัง
      const bx = X(x0 + L.d), bw = Math.max(L.w * s, 8);
      ctx.fillStyle = 'rgba(48,209,88,.25)'; ctx.fillRect(bx - bw, Y(0) - 14, bw * 2, 14);
      ctx.strokeStyle = '#30d158'; ctx.lineWidth = 2; ctx.strokeRect(bx - bw, Y(0) - 14, bw * 2, 14);
      ctx.fillStyle = '#9cf0b4'; ctx.textAlign = 'center'; ctx.fillText(fmt(L.d) + ' m', bx, Y(0) - 20);
      // ทางเก่า
      paths.forEach((p, i) => {
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + i * 0.05})`; ctx.lineWidth = 1.5; ctx.beginPath();
        p.pts.forEach((q, j) => j ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1]))); ctx.stroke();
      });
      // ปืน
      const r = ang * Math.PI / 180, cx = X(x0), cy = Y(h0);
      ctx.strokeStyle = '#4f8cff'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 26 * Math.cos(r), cy - 26 * Math.sin(r)); ctx.stroke();
      ctx.fillStyle = '#2b4f8f'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.fill();
      // ทางปัจจุบัน: จุดทุก 0.1 s
      const p = cur || last; if (!p) return;
      const n = cur ? cur.k : p.pts.length;
      ctx.fillStyle = '#ffd60a';
      let nextDot = 0, nextVec = 0;
      for (let j = 0; j < n; j++) {
        const q = p.pts[j];
        if (q[2] >= nextDot - 1e-9) {
          ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), 3, 0, 7); ctx.fill(); nextDot += 0.1;
          if (showVec && q[2] >= nextVec - 1e-9) {
            const vy = p.vy - g * q[2], k = 3;
            arrow(ctx, X(q[0]), Y(q[1]), X(q[0]) + p.vx * k, Y(q[1]), '#ff7a45', 2, 7);
            arrow(ctx, X(q[0]), Y(q[1]), X(q[0]), Y(q[1]) - vy * k, '#5aa2ff', 2, 7);
            ctx.fillStyle = '#ffd60a'; nextVec += 0.4;
          }
        }
      }
      const q = p.pts[Math.max(0, n - 1)];
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), 6, 0, 7); ctx.fill();
      if (showVec) {
        ctx.font = KG.font; ctx.textAlign = 'left';
        ctx.fillStyle = '#ff7a45'; ctx.fillText('แนวระดับ', 10, 18); ctx.fillStyle = '#5aa2ff'; ctx.fillText('แนวดิ่ง', 80, 18);
        ctx.fillStyle = '#ffd60a'; ctx.fillText('จุดทุก 0.1 s', 140, 18);
      }
    }
    ctrl.querySelector('#fire').onclick = fire;
    return () => { cancelAnimationFrame(raf); st.stop(); };
  }

  KG.reg({ id: 'shoot', type: 'lab', icon: 'target', topics: '6', name: 'ยิงให้ถึงเป้า',
    blurb: 'ปรับมุมและอัตราเร็ว ดูความเร็วแนวระดับกับแนวดิ่งแยกกันทุก 0.1 s',
    how: 'ทุกนัดจะทิ้งจุดไว้ทุก 0.1 วินาที สังเกตว่าจุดห่างกันในแนวระดับเท่ากันเสมอ ยิงน้อยครั้งได้ดาวมาก',
    levels: P_LEVELS, play: playProjectile });

  // =====================================================================
  // 2) แล็บแรง
  // =====================================================================
  const F_LEVELS = [
    { t: 4, kind: '1d', title: 'ดันให้ได้ความเร่งที่ต้องการ', m: 2, v0: 0, f: 0, goal: { a: 3 },
      brief: 'กล่อง <b>2 kg</b> บนพื้นลื่น (ไม่มีแรงเสียดทาน) ตั้งแรงดันให้กล่องมีความเร่ง <b>3 m/s²</b>',
      note: 'ΣF = ma → F = 2 × 3 = 6 N ความเร่งมีทิศเดียวกับแรงลัพธ์' },
    { t: 4, kind: '1d', title: 'ความเร็วคงตัวทั้งที่มีแรงเสียดทาน', m: 4, v0: 2, f: 8, goal: { a: 0 },
      brief: 'กล่อง <b>4 kg</b> กำลังไถลไปทางขวา 2 m/s มีแรงเสียดทาน <b>8 N</b> ต้านไว้ ตั้งแรงดันให้กล่อง<b>วิ่งด้วยความเร็วคงตัว</b>',
      note: 'ความเร็วคงตัวแปลว่า ΣF = 0 ไม่ใช่ “ไม่มีแรง” แรงดัน 8 N หักล้างแรงเสียดทาน 8 N พอดี' },
    { t: 4, kind: '1d', title: 'แรงเสียดทานกับความเร่ง', m: 5, v0: 1, f: 5, goal: { a: 2 },
      brief: 'กล่อง <b>5 kg</b> ไถลไปทางขวา มีแรงเสียดทาน <b>5 N</b> ตั้งแรงดันให้ความเร่งเป็น <b>2 m/s²</b>',
      note: 'ΣF = F − 5 = 5 × 2 = 10 N จึงต้องดัน 15 N แรงที่ดันไม่ใช่แรงลัพธ์' },
    { t: 4, kind: '2d', title: 'สามแรงสมดุล', m: 1, forces: [[3, 0], [4, 90]], goal: { sum: [0, 0] },
      brief: 'แผ่นลื่นบนโต๊ะลมถูกดึง <b>3 N ไปทางขวา</b> และ <b>4 N ขึ้นด้านบน</b> เพิ่มแรงที่สามให้<b>แรงลัพธ์เป็นศูนย์</b>',
      note: 'แรง 3 N กับ 4 N ที่ตั้งฉากกันมีลัพธ์ 5 N แรงที่สามจึงต้องมีขนาด 5 N ทิศตรงข้ามกับลัพธ์นั้น ลากเวกเตอร์หัวต่อหางแล้วต้องวนกลับจุดเริ่ม' },
    { t: 4, kind: '2d', title: 'บังคับทิศความเร่ง', m: 2, forces: [[6, 0], [4, 90]], goal: { sum: [6, 0] },
      brief: 'แผ่นมวล <b>2 kg</b> ถูกดึง 6 N ไปทางขวา และ 4 N ขึ้นด้านบน เพิ่มแรงที่สามให้แผ่นเร่ง <b>3 m/s² ไปทางขวาตรง ๆ</b>',
      note: 'ต้องการ ΣF = ma = 6 N ไปทางขวา แรง 6 N ทางขวามีอยู่แล้ว แรงที่สามจึงแค่หักล้าง 4 N ด้านบน คือ 4 N ชี้ลง (270°)' },
    { t: 5, kind: 'pair', title: 'ผลักกันบนลานสเก็ต', mA: 60, mB: 30, goal: { aB: 3 },
      brief: 'A (60 kg) ผลัก B (30 kg) บนลานสเก็ตลื่น ตั้งแรงผลักให้ <b>B มีความเร่ง 3 m/s²</b> แล้วดูว่า A เป็นอย่างไร',
      note: 'แรงที่ A ผลัก B กับแรงที่ B ดัน A เท่ากันเสมอ (90 N) แต่กระทำต่อคนละคน A มวลมากกว่าจึงเร่งน้อยกว่า: 90 ÷ 60 = 1.5 m/s²' }
  ];

  function playForce(el, L, idx, api) {
    el.innerHTML = `<div class="brief">${L.brief}</div>`;
    let tries = 0, raf = 0, run = null, last = null;
    const st = stage(el, L.kind === '1d' ? 0.42 : 0.6, draw);
    const ctrl = document.createElement('div'); ctrl.className = 'ctrl';
    const S = { F: 0, dir: 1, M: 0, A: 0 };
    if (L.kind === '1d') ctrl.innerHTML = slider('แรงดัน', { min: 0, max: 30, step: 1, val: 0 }) +
      `<div class="row"><span class="muted" style="font-size:14px">ทิศแรงดัน</span><div class="seg" id="dir"><button data-d="-1">← ซ้าย</button><button data-d="1" class="on">ขวา →</button></div></div>`;
    if (L.kind === '2d') ctrl.innerHTML = slider('ขนาดแรงที่ 3', { min: 0, max: 15, step: .5, val: 0 }) + slider('ทิศของแรง', { min: 0, max: 355, step: 5, val: 0 });
    if (L.kind === 'pair') ctrl.innerHTML = slider('แรงผลัก', { min: 0, max: 150, step: 10, val: 0 });
    ctrl.innerHTML += `<div class="row"><button class="btn big" id="go">ทดลอง</button></div><div class="readout" id="ro"></div>`;
    el.appendChild(ctrl);
    const sl = ctrl.querySelectorAll('.slider'), ro = ctrl.querySelector('#ro');
    if (L.kind === '1d') {
      bindSlider(sl[0], 'N', 0, v => { S.F = v; live(); });
      ctrl.querySelectorAll('#dir button').forEach(b => b.onclick = () => {
        S.dir = +b.dataset.d; ctrl.querySelectorAll('#dir button').forEach(x => x.classList.toggle('on', x === b)); live();
      });
    } else if (L.kind === '2d') {
      bindSlider(sl[0], 'N', 1, v => { S.M = v; live(); });
      bindSlider(sl[1], '°', 0, v => { S.A = v; live(); });
    } else bindSlider(sl[0], 'N', 0, v => { S.F = v; live(); });
    api.hud('ทดลอง 0 ครั้ง');

    function rad(d) { return d * Math.PI / 180; }
    function sum2() {
      let x = 0, y = 0;
      L.forces.concat([[S.M, S.A]]).forEach(([m, a]) => { x += m * Math.cos(rad(a)); y += m * Math.sin(rad(a)); });
      return [x, y];
    }
    // แรงเสียดทานทิศตรงข้ามการเคลื่อนที่ (กล่องในด่านนี้ไถลไปทางขวาเสมอ)
    function net1(v) { const F = S.F * S.dir; return F - (v > 0 || L.v0 > 0 ? L.f : 0); }

    function live() {
      if (run) return;
      if (L.kind === '1d') ro.innerHTML = `<div>แรงลัพธ์ ΣF<b>${fmt(net1(L.v0))} N</b></div><div>ความเร่ง a = ΣF ÷ m<b>${fmt(net1(L.v0) / L.m, 2)} m/s²</b></div>`;
      if (L.kind === '2d') { const [x, y] = sum2(); ro.innerHTML = `<div>ขนาดแรงลัพธ์<b>${fmt(Math.hypot(x, y), 2)} N</b></div><div>ความเร่ง<b>${fmt(Math.hypot(x, y) / L.m, 2)} m/s²</b></div>`; }
      if (L.kind === 'pair') ro.innerHTML = `<div>แรงที่ A ผลัก B<b>${S.F} N →</b></div><div>แรงที่ B ดัน A<b>← ${S.F} N</b></div>`;
      draw();
    }

    function go() {
      if (run) return;
      tries++; api.hud(`ทดลอง ${tries} ครั้ง`); api.sfx('shot');
      run = { t: 0, x: 0, y: 0, v: L.v0 || 0, vx: 0, vy: 0, xa: 0, xb: 0, va: 0, vb: 0, hist: [] };
      let prev = performance.now();
      const step = now => {
        const dt = Math.min(0.05, (now - prev) / 1000); prev = now; run.t += dt;
        if (L.kind === '1d') {
          let a = net1(run.v) / L.m;
          if (run.v <= 0 && L.f && Math.abs(S.F) <= L.f && L.v0 > 0 && run.t > 0.05) { a = 0; run.v = 0; }
          run.v = Math.max(L.f ? 0 : -99, run.v + a * dt); run.x += run.v * dt; run.a = a;
          run.hist.push([run.t, run.v]);
        } else if (L.kind === '2d') {
          const [fx, fy] = sum2(); run.vx += fx / L.m * dt; run.vy += fy / L.m * dt; run.x += run.vx * dt; run.y += run.vy * dt;
        } else {
          run.va += S.F / L.mA * dt; run.vb += S.F / L.mB * dt; run.xa -= run.va * dt; run.xb += run.vb * dt;
        }
        draw();
        if (run.t < 2.5) raf = requestAnimationFrame(step); else judge();
      };
      raf = requestAnimationFrame(step);
    }

    function judge() {
      let ok = false, msg = '';
      if (L.kind === '1d') {
        const a = net1(L.v0) / L.m; ok = Math.abs(a - L.goal.a) < 0.01;
        msg = `ได้ a = ${fmt(a, 2)} m/s² ` + (ok ? '' : a < L.goal.a ? '(น้อยไป)' : '(มากไป)');
      } else if (L.kind === '2d') {
        const [x, y] = sum2(); const e = Math.hypot(x - L.goal.sum[0], y - L.goal.sum[1]); ok = e < 0.45;
        msg = ok ? 'ได้แล้ว' : `แรงลัพธ์ยังคลาดไป ${fmt(e, 1)} N ดูแผนภาพหัวต่อหางทางขวา`;
      } else { const aB = S.F / L.mB; ok = Math.abs(aB - L.goal.aB) < 0.01; msg = `B เร่ง ${fmt(aB, 2)} m/s² · A เร่ง ${fmt(S.F / L.mA, 2)} m/s²`; }
      const r = run; run = null; live(); run = null;
      if (ok) { api.sfx('good'); setTimeout(() => api.done(starsBy(tries, 1), L.note), 400); }
      else { api.sfx('bad'); api.toast(msg, 'bad'); }
      if (L.kind !== '2d') { last = r; draw(); }
    }

    function draw() {
      const { ctx, w, h } = st; if (!w) return;
      ctx.clearRect(0, 0, w, h); ctx.font = KG.font;
      const r = run || last;
      if (L.kind === '1d') {
        const gy = h * 0.62, off = r ? (r.x * 40) % 40 : 0;
        ctx.fillStyle = '#1c1c28'; ctx.fillRect(0, gy, w, h - gy);
        ctx.strokeStyle = 'rgba(255,255,255,.12)';
        for (let x = -off; x < w * 0.62; x += 40) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x - 10, gy + 12); ctx.stroke(); }
        const bx = w * 0.3, bs = Math.min(70, h * 0.3);
        ctx.fillStyle = '#3a3a52'; ctx.fillRect(bx - bs / 2, gy - bs, bs, bs);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(L.m + ' kg', bx, gy - bs / 2 + 5);
        const k = 5, cy = gy - bs / 2;
        if (S.F) { arrow(ctx, bx + S.dir * bs / 2, cy - 8, bx + S.dir * (bs / 2 + S.F * k), cy - 8, '#ff7a45', 4); ctx.fillStyle = '#ff7a45'; ctx.fillText('F = ' + S.F + ' N', bx + S.dir * (bs / 2 + S.F * k / 2), cy - 18); }
        if (L.f) { arrow(ctx, bx - bs / 2, gy - 6, bx - bs / 2 - L.f * k, gy - 6, '#5aa2ff', 4); ctx.fillStyle = '#5aa2ff'; ctx.fillText('แรงเสียดทาน ' + L.f + ' N', bx - bs / 2 - L.f * k / 2, gy + 16); }
        const net = net1(r ? r.v : L.v0);
        ctx.setLineDash([6, 5]); arrow(ctx, bx, gy - bs - 18, bx + net * k, gy - bs - 18, '#fff', 3); ctx.setLineDash([]);
        ctx.fillStyle = '#fff'; ctx.fillText('ΣF = ' + fmt(net) + ' N', bx, gy - bs - 30);
        // กราฟ v–t เล็ก
        const gx = w * 0.66, gw = w * 0.31, gh = h * 0.7, g0 = h * 0.12;
        ctx.fillStyle = '#15151d'; ctx.fillRect(gx, g0, gw, gh);
        ctx.strokeStyle = '#6e6e7c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx + 20, g0 + 8); ctx.lineTo(gx + 20, g0 + gh - 18); ctx.lineTo(gx + gw - 6, g0 + gh - 18); ctx.stroke();
        ctx.fillStyle = '#a1a1ae'; ctx.textAlign = 'left'; ctx.fillText('v', gx + 6, g0 + 18); ctx.textAlign = 'right'; ctx.fillText('t', gx + gw - 6, g0 + gh - 4);
        if (r && r.hist.length) {
          const vm = 10, tx = t => gx + 20 + t / 2.5 * (gw - 30), vy = v => g0 + gh - 18 - v / vm * (gh - 30);
          ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2; ctx.beginPath();
          r.hist.forEach(([t, v], i) => i ? ctx.lineTo(tx(t), vy(Math.min(v, vm))) : ctx.moveTo(tx(t), vy(Math.min(v, vm)))); ctx.stroke();
        }
      } else if (L.kind === '2d') {
        const cx = w * 0.3 + (r ? r.x * 20 : 0), cy = h * 0.5 - (r ? r.y * 20 : 0), k = Math.min(w, h) * 0.06;
        ctx.strokeStyle = 'rgba(255,255,255,.05)';
        for (let x = 0; x < w * 0.6; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w * 0.6, y); ctx.stroke(); }
        const all = L.forces.concat([[S.M, S.A]]), cols = ['#ff7a45', '#5aa2ff', '#30d158'];
        all.forEach(([m, a], i) => { if (m) arrow(ctx, cx, cy, cx + m * k * Math.cos(rad(a)), cy - m * k * Math.sin(rad(a)), cols[i], 3); });
        ctx.fillStyle = '#e5e5ea'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill();
        // หัวต่อหาง
        const hx = w * 0.62, hw = w * 0.36;
        ctx.fillStyle = '#15151d'; ctx.fillRect(hx, 8, hw, h - 16);
        ctx.fillStyle = '#a1a1ae'; ctx.textAlign = 'left'; ctx.fillText('ต่อหัวต่อหาง', hx + 10, 26);
        const kk = Math.min(hw, h) * 0.09; let px = hx + hw * 0.3, py = h * 0.62; const sx = px, sy = py;
        all.forEach(([m, a], i) => { if (!m) return; const nx = px + m * kk * Math.cos(rad(a)), ny = py - m * kk * Math.sin(rad(a)); arrow(ctx, px, py, nx, ny, cols[i], 3, 8); px = nx; py = ny; });
        ctx.setLineDash([5, 4]); arrow(ctx, sx, sy, px, py, '#fff', 2, 8); ctx.setLineDash([]);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 7); ctx.fill();
        ctx.fillStyle = '#a1a1ae'; ctx.fillText('เส้นประ = แรงลัพธ์', hx + 10, h - 16);
        ctx.fillStyle = '#30d158'; ctx.textAlign = 'left'; ctx.fillText('แรงที่ 3', 10, h - 12);
      } else {
        const gy = h * 0.7, cx = w / 2;
        ctx.fillStyle = '#1a2230'; ctx.fillRect(0, gy, w, h - gy);
        const ax = cx - 26 + (r ? r.xa * 30 : 0), bx = cx + 22 + (r ? r.xb * 30 : 0);
        const person = (x, s, col, lab) => {
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, gy - 64 * s - 10, 10 * s, 0, 7); ctx.fill();
          ctx.fillRect(x - 9 * s, gy - 64 * s, 18 * s, 64 * s);
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(lab, x, gy + 18);
        };
        person(ax, 1.15, '#ff7a45', 'A 60 kg'); person(bx, 0.85, '#5aa2ff', 'B 30 kg');
        const k = 0.9;
        if (S.F) {
          arrow(ctx, bx, gy - 40, bx + S.F * k, gy - 40, '#ffd60a', 3); ctx.fillStyle = '#ffd60a'; ctx.fillText('A ดัน B ' + S.F + ' N', bx + S.F * k / 2, gy - 50);
          arrow(ctx, ax, gy - 40, ax - S.F * k, gy - 40, '#ffd60a', 3); ctx.fillText('B ดัน A ' + S.F + ' N', ax - S.F * k / 2, gy - 50);
        }
      }
    }
    ctrl.querySelector('#go').onclick = go;
    live();
    return () => { cancelAnimationFrame(raf); st.stop(); };
  }

  KG.reg({ id: 'force', type: 'lab', icon: 'force', topics: '4–5', name: 'แล็บแรง',
    blurb: 'ตั้งแรงให้ได้ความเร่งที่ต้องการ ต่อเวกเตอร์หัวต่อหาง และดูคู่แรงกิริยา–ปฏิกิริยา',
    how: 'ปรับแรงแล้วกด “ทดลอง” ระบบจะคำนวณแรงลัพธ์และความเร่งให้ดูทุกครั้ง ทำได้ในครั้งแรกได้ 3 ดาว',
    levels: F_LEVELS, play: playForce });

  // =====================================================================
  // 3) ปล่อยเชือก (วงกลม → เส้นสัมผัส)
  // =====================================================================
  const O_LEVELS = [
    { t: 7, title: 'ปล่อยให้โดนเป้า', w: 1.6, dir: 1, arrow: 1, tg: [[.88, .2]], tr: .07,
      brief: 'ลูกบอลผูกเชือกหมุนตามเข็มนาฬิกา แตะจอ (หรือกด “ปล่อย”) เพื่อตัดเชือก ให้ลูกพุ่งไปโดนเป้า ลูกศรเหลืองคือความเร็ว' },
    { t: 7, title: 'หมุนเร็วขึ้น', w: 2.6, dir: 1, arrow: 1, tg: [[.12, .85]], tr: .06,
      brief: 'หมุนเร็วขึ้น เป้าเล็กลง ต้องเลือกจังหวะให้ดี' },
    { t: 7, title: 'ทวนทิศ', w: 2.4, dir: -1, arrow: 1, tg: [[.86, .84]], tr: .06,
      brief: 'คราวนี้หมุน<b>ทวนเข็มนาฬิกา</b> ทิศความเร็วกลับด้าน จุดปล่อยจึงเปลี่ยน' },
    { t: 7, title: 'สองเป้า', w: 2.6, dir: 1, arrow: 1, tg: [[.1, .15], [.92, .5]], tr: .055,
      brief: 'โดนเป้าให้ครบ 2 ลูก (ปล่อยได้หลายครั้ง ลูกใหม่จะมาเอง)' },
    { t: 7, title: 'ไม่มีลูกศรช่วย', w: 3, dir: 1, arrow: 0, tg: [[.5, .06]], tr: .05,
      brief: 'ลูกศรความเร็วหายไปแล้ว ต้องนึกเองว่าความเร็วชี้ไปทางไหน' },
    { t: 7, title: 'สามเป้า ทวนเข็ม', w: 3.2, dir: -1, arrow: 0, tg: [[.08, .5], [.9, .1], [.75, .94]], tr: .05,
      brief: 'หมุนทวนเข็มนาฬิกา เร็ว และไม่มีลูกศร โดนให้ครบ 3 เป้า' }
  ];
  const O_NOTE = 'เชือกขาดเมื่อไร ลูกพุ่งไปตาม<b>เส้นสัมผัสวงกลม</b> ณ จุดนั้น ไม่ได้พุ่งออกจากศูนย์กลาง เพราะไม่มีแรงสู่ศูนย์กลางดึงให้เลี้ยวอีกแล้ว';

  function playOrbit(el, L, idx, api) {
    el.innerHTML = `<div class="brief">${L.brief}</div>`;
    let th = -Math.PI / 2, free = null, raf = 0, miss = 0, hits = L.tg.map(() => false), ghost = null, prev = performance.now();
    const st = stage(el, 0.72, () => {});
    const ctrl = document.createElement('div'); ctrl.className = 'ctrl';
    ctrl.innerHTML = '<div class="row"><button class="btn big" id="rel">ปล่อย</button><span class="muted" style="font-size:14px">หรือแตะที่ภาพ · ปุ่ม Space</span></div>';
    el.appendChild(ctrl);
    const hud = () => api.hud(`โดน ${hits.filter(Boolean).length}/${hits.length} · พลาด ${miss}`); hud();
    const geo = () => { const { w, h } = st; return { cx: w / 2, cy: h / 2, R: Math.min(w, h) * 0.28, tr: L.tr * w }; };

    function release() {
      if (free || !st.w) return;
      const { cx, cy, R } = geo(), v = L.w * R;
      free = { x: cx + R * Math.cos(th), y: cy + R * Math.sin(th), vx: -L.dir * v * Math.sin(th), vy: L.dir * v * Math.cos(th) };
      ghost = { x: free.x, y: free.y }; api.sfx('shot');
    }
    function frame(now) {
      const dt = Math.min(0.04, (now - prev) / 1000); prev = now;
      const { ctx, w, h } = st;
      if (w) {
        const { cx, cy, R, tr } = geo();
        if (!free) th += L.dir * L.w * dt;
        else {
          free.x += free.vx * dt; free.y += free.vy * dt;
          L.tg.forEach(([tx, ty], i) => {
            if (!hits[i] && Math.hypot(free.x - tx * w, free.y - ty * h) < tr + 7) { hits[i] = true; api.sfx('good'); free = null; hud(); }
          });
          if (free && (free.x < -20 || free.x > w + 20 || free.y < -20 || free.y > h + 20)) {
            miss++; hud(); api.sfx('bad'); free = null;
            if (miss === 2) api.toast('สังเกตเส้นประ: ลูกไม่ได้พุ่งออกจากศูนย์กลาง แต่ไปตามทิศของลูกศรความเร็ว');
          }
          if (!free && hits.every(Boolean)) { setTimeout(() => api.done(miss === 0 ? 3 : miss <= 2 ? 2 : 1, O_NOTE), 300); draw(); return; }
        }
        draw();
      }
      raf = requestAnimationFrame(frame);
    }
    function draw() {
      const { ctx, w, h } = st; const { cx, cy, R, tr } = geo();
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      L.tg.forEach(([tx, ty], i) => {
        ctx.fillStyle = hits[i] ? 'rgba(48,209,88,.35)' : 'rgba(255,55,95,.22)'; ctx.strokeStyle = hits[i] ? '#30d158' : '#ff375f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(tx * w, ty * h, tr, 0, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(tx * w, ty * h, tr * 0.45, 0, 7); ctx.stroke();
      });
      ctx.fillStyle = '#6e6e7c'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
      if (ghost) {
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (ghost.x - cx) * 4, cy + (ghost.y - cy) * 4); ctx.stroke(); ctx.setLineDash([]);
      }
      if (free) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(free.x, free.y, 7, 0, 7); ctx.fill(); return; }
      const bx = cx + R * Math.cos(th), by = cy + R * Math.sin(th);
      ctx.strokeStyle = '#a1a1ae'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();
      if (L.arrow) {
        const k = 0.5 * R; arrow(ctx, bx, by, bx - L.dir * k * Math.sin(th), by + L.dir * k * Math.cos(th), '#ffd60a', 3);
        arrow(ctx, bx, by, bx + (cx - bx) * 0.35, by + (cy - by) * 0.35, '#5aa2ff', 2, 8);
        ctx.font = KG.font; ctx.textAlign = 'left'; ctx.fillStyle = '#ffd60a'; ctx.fillText('ความเร็ว', 10, 18); ctx.fillStyle = '#5aa2ff'; ctx.fillText('แรงสู่ศูนย์กลาง (แรงตึงเชือก)', 76, 18);
      }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 7, 0, 7); ctx.fill();
    }
    st.c.addEventListener('pointerdown', release);
    ctrl.querySelector('#rel').onclick = release;
    const key = e => { if (e.code === 'Space') { e.preventDefault(); release(); } };
    addEventListener('keydown', key);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', key); st.stop(); };
  }

  KG.reg({ id: 'orbit', type: 'lab', icon: 'orbit', topics: '7', name: 'ปล่อยเชือก',
    blurb: 'แกว่งลูกบอลเป็นวงกลมแล้วตัดเชือกให้โดนเป้า ต้องรู้ว่าความเร็วชี้ไปทางไหน',
    how: 'ลูกบอลหมุนเป็นวงกลม แตะเพื่อตัดเชือก ลูกจะพุ่งเป็นเส้นตรง พลาดน้อยได้ดาวมาก',
    levels: O_LEVELS, play: playOrbit });
})();
