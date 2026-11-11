// ดวลความไว 2 คน เครื่องเดียว — ใช้แบบฝึกเลือกตอบท้ายหัวข้อ (mcq-1.json)
window.Duel = {
  open(root, K) {
    const { esc, shuffle } = KG;
    root.innerHTML = `<button class="back" data-go="#/">${K.ic('back')}ภารกิจทั้งหมด</button>
      <div class="eyebrow" style="margin-top:14px">2 คน · เครื่องเดียว</div><h1 style="font-size:34px">ดวลความไว</h1>
      <p class="muted">วางเครื่องกลางโต๊ะ ผู้เล่นแดงนั่งฝั่งบน ผู้เล่นน้ำเงินนั่งฝั่งล่าง ทั้งสองเห็นโจทย์เดียวกัน ใครตอบถูกก่อนได้แต้ม ตอบผิดโดนหยุด 2 วินาที 8 ข้อจบเกม</p>
      <div class="card"><div class="muted" style="margin-bottom:10px">เลือกหัวข้อ</div><div class="row" id="tp">
        <button class="btn" data-t="0">ทุกหัวข้อ</button>${TOPICS.map(t => `<button class="btn ghost" data-t="${t.n}">${t.n} · ${t.name}</button>`).join('')}</div></div>`;
    root.querySelector('[data-go]').onclick = () => K.go('#/');
    root.querySelector('#tp').onclick = e => { const b = e.target.closest('[data-t]'); if (b) start(+b.dataset.t); };

    let ov = null, timers = [];
    const later = (f, ms) => timers.push(setTimeout(f, ms));
    function start(topic) {
      const pool = [];
      Object.keys(MCQ).forEach(k => { if (!topic || +k === topic) MCQ[k].items.forEach(q => { if (!/^จากข้อที่แล้ว/.test(q.q)) pool.push(q); });  // ข้อที่อ้างข้อก่อนหน้าใช้แยกเดี่ยวไม่ได้ });
      const qs = shuffle(pool).slice(0, 8);
      let qi = 0, sc = [0, 0], lockUntil = [0, 0], closed = false;
      ov = document.createElement('div'); ov.className = 'duel';
      ov.innerHTML = `<div class="half p1" data-p="0"></div><div class="mid"><span class="s1">แดง 0</span><span id="qn" class="muted"></span><span class="s2">น้ำเงิน 0</span><button class="icon-btn" id="x" aria-label="ออก">✕</button></div><div class="half p2" data-p="1"></div>`;
      document.body.appendChild(ov);
      ov.querySelector('#x').onclick = close;
      const halves = [...ov.querySelectorAll('.half')];
      function show() {
        if (qi >= qs.length) return end();
        const q = qs[qi]; closed = false;
        ov.querySelector('#qn').textContent = `ข้อ ${qi + 1}/${qs.length}`;
        halves.forEach(h => {
          h.classList.remove('locked');
          h.innerHTML = `<div class="q">${esc(q.q)}</div><div class="opts">${q.o.map((o, i) => `<button data-i="${i}">${'กขคง'[i]}. ${esc(o)}</button>`).join('')}</div>`;
        });
      }
      ov.addEventListener('pointerdown', e => {
        const b = e.target.closest('.opts button'); if (!b || closed) return;
        const p = +b.closest('.half').dataset.p, q = qs[qi], now = Date.now();
        if (now < lockUntil[p]) return;
        if (+b.dataset.i === q.a) {
          closed = true; sc[p]++; K.sfx('good'); b.classList.add('ok');
          halves[1 - p].querySelector(`[data-i="${q.a}"]`).classList.add('ok');
          ov.querySelector('.s1').textContent = 'แดง ' + sc[0]; ov.querySelector('.s2').textContent = 'น้ำเงิน ' + sc[1];
          halves.forEach(h => h.insertAdjacentHTML('beforeend', `<div class="muted" style="font-size:13px">${esc(q.w)}</div>`));
          later(() => { qi++; show(); }, 2600);
        } else {
          K.sfx('bad'); b.classList.add('no'); lockUntil[p] = now + 2000; halves[p].classList.add('locked');
          later(() => halves[p].classList.remove('locked'), 2000);
        }
      });
      function end() {
        const msg = sc[0] === sc[1] ? 'เสมอ!' : sc[0] > sc[1] ? 'แดงชนะ' : 'น้ำเงินชนะ';
        K.sfx('win');
        halves.forEach(h => { h.innerHTML = `<div style="text-align:center"><div style="font-size:30px;font-weight:700">${msg}</div><div class="muted">${sc[0]} : ${sc[1]}</div>
          <div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-again>อีกรอบ</button><button class="btn ghost" data-out>ออก</button></div></div>`; });
        ov.querySelectorAll('[data-again]').forEach(b => b.onclick = () => { close(); start(topic); });
        ov.querySelectorAll('[data-out]').forEach(b => b.onclick = close);
      }
      show();
    }
    function close() { timers.forEach(clearTimeout); timers = []; if (ov) ov.remove(); ov = null; }
    return close;
  }
};
