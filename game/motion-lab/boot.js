// เปิดเกมจากบทเรียน: index.html?c=<รหัสคอร์ส>&l=<รหัสบท>
// อ่านคำถามของเกมจาก courses/{cid}/games/{lid} (repo สาธารณะ จึงไม่มีคำถามในไฟล์) → ตั้ง KG_STORE ให้บันทึกคะแนนลง game_scores → โหลดตัวเกม
(function () {
  'use strict';
  const ENGINE = 'motion-lab', V = '9';
  const FILES = ['core.js', 'g-lab.js', 'g-think.js', 'g-duel.js'];
  const q = new URLSearchParams(location.search), cid = q.get('c') || '', lid = q.get('l') || '';
  const app = document.getElementById('app');
  const lessonUrl = '../../index.html#/c/' + encodeURIComponent(cid);
  // ฝังในหน้าบทเรียน = ลิงก์ต้องเปิดที่หน้าหลัก ไม่ใช่ใน iframe
  const target = window.top !== window.self ? ' target="_top"' : '';
  const stop = (t, link) => {
    app.innerHTML = `<div class="card" style="margin-top:24px"><b>${t}</b>${link ? `<p class="muted" style="margin:10px 0 0"><a style="color:var(--acc)" href="${lessonUrl}"${target}>${link}</a></p>` : ''}</div>`;
    document.getElementById('xpChip').textContent = '';
  };
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src + '?v=' + V; s.onload = ok; s.onerror = no; document.body.appendChild(s); });

  if (!cid || !lid || !KPC.configured) return stop('เปิดเกมนี้จากบทเรียนในคอร์ส', '');
  app.innerHTML = '<p class="muted" style="margin-top:24px">กำลังโหลดเกม…</p>';

  let first = true;
  KPC.onUser(async user => {
    if (!first) return location.reload();   // ล็อกอิน/ออกจากระบบในแท็บอื่นระหว่างเล่น → เริ่มใหม่ให้คะแนนเป็นของบัญชีที่ถูก
    first = false;
    let course, pack;
    try {
      const s = await KPC.read(() => KPC.db.collection('courses').doc(cid).get());
      course = s.exists ? Object.assign({ id: s.id }, s.data()) : null;
      pack = course && await KPC.gamePack(cid, lid);
    } catch (e) {
      if (e.code === 'permission-denied') return stop(user ? 'บัญชีนี้ยังไม่มีสิทธิ์เล่นเกมของบทนี้' : 'ล็อกอินก่อนเล่นเกมของบทนี้', 'กลับไปหน้าคอร์ส');
      return stop('โหลดเกมไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้านี้', '');
    }
    if (!course) return stop('ไม่พบคอร์สนี้', '');
    if (!pack || pack.engine !== ENGINE) return stop('ครูยังไม่ได้ใส่ข้อมูลเกมของบทนี้', 'กลับไปหน้าคอร์ส');
    let data;
    try { data = JSON.parse(pack.data); } catch (e) { return stop('ข้อมูลเกมของบทนี้เสีย แจ้งครูผู้สอน', ''); }
    ['TOPICS', 'PAIRS', 'CHAINS', 'SPOTS', 'MCQ', 'GAME_INFO'].forEach(k => { window[k] = data[k]; });

    // คะแนนเดิม: อ่านไม่สำเร็จ (undefined) → เล่นได้แต่ไม่ส่งขึ้นเซิร์ฟเวอร์ ไม่งั้นทับคะแนนที่มีอยู่
    const old = user ? await KPC.getGameScore(cid, lid) : null;
    const canSave = !!user && old !== undefined;
    let timer = null, pending = null, failed = false;
    const flush = () => {
      timer = null; const s = pending; pending = null; if (!s) return;
      KPC.saveGameScore(course, lid, Object.assign({ engine: ENGINE }, s))
        .then(() => { if (failed) { failed = false; KG.toast('บันทึกคะแนนแล้ว'); } })
        .catch(() => { failed = true; pending = pending || s; KG.toast('บันทึกคะแนนไม่สำเร็จ จะลองใหม่เมื่อผ่านด่านถัดไป', 'bad'); });
    };
    addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); flush(); } });
    window.KG_STORE = {
      key: 'kp-game-' + ENGINE + '-' + cid + '-' + lid + '-' + (user ? user.uid : 'guest'),
      initial: old ? { stars: old.stars, tries: old.tries } : null,
      name: user ? KPC.displayName() : '',
      note: !user ? `ยังไม่ได้ล็อกอิน คะแนนเก็บในเครื่องนี้เท่านั้น ครูจะไม่เห็น · <a href="${lessonUrl}"${target}>ล็อกอิน</a>`
        : !canSave ? 'โหลดคะแนนเดิมไม่สำเร็จ รอบนี้คะแนนเก็บในเครื่องนี้ก่อน รีเฟรชหน้าเมื่ออินเทอร์เน็ตกลับมา' : '',
      save: canSave ? s => { pending = s; clearTimeout(timer); timer = setTimeout(flush, 1200); } : null
    };
    try { for (const f of FILES) await load(f); }
    catch (e) { return stop('โหลดเกมไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้านี้', ''); }
    KG.start();
  });
})();
