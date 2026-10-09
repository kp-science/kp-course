// ============================================================
//  KP Science — คอร์สออนไลน์: โมดูลกลาง (ใช้ทั้งหน้าเรียนและหน้าครู)
//  เว็บนี้แยกจากเว็บ simulation: มี Firebase โปรเจกต์ของตัวเอง (firebase-config.js)
//  ต้องโหลดหลัง firebase-*-compat.js และ firebase-config.js
//
//  Firestore:
//    students/{uid}                { email, name, courses:[cid | '*'], createdAt }  ครูเป็นคนเติม courses
//    courses/{cid}                 ข้อมูลคอร์ส + outline (สารบัญ) · อ่านได้เมื่อ published
//    courses/{cid}/lessons/{lid}   เนื้อหาบท · อ่านได้เมื่อมีสิทธิ์ หรือบท free
//    course_progress/{uid}_{cid}   { uid, email, courseId, done:[lid], total, last, lastAt, updatedAt }
//    course_requests/{uid}_{cid}   { uid, email, name, courseId, note, createdAt }
// ============================================================
(function (W) {
'use strict';

const KPC = W.KPC = {};
KPC.TEACHER_EMAIL = 'komanepapato@gmail.com';
KPC.SIM_SITE = 'https://kp-science.github.io/physics-simulations/';

/* ===================== Firebase ===================== */
const cfg = W.KPC_FIREBASE_CONFIG || {};
KPC.configured = !!(cfg.apiKey && cfg.projectId);
let auth = null, db = null;
if (KPC.configured) {
  firebase.initializeApp(cfg);
  auth = KPC.auth = firebase.auth();
  db = KPC.db = firebase.firestore();
}
const FS = () => firebase.firestore.FieldValue;

/* ===================== เครื่องมือทั่วไป ===================== */
const esc = KPC.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = KPC.safeUrl = u => /^https?:[/][/]/i.test(u || '') ? u : '';
const ytId = KPC.ytId = u => { const m = /(?:youtu\.be[/]|youtube\.com[/](?:watch\?(?:.*&)?v=|embed[/]|shorts[/]|live[/]))([\w-]{11})/.exec(u || ''); return m ? m[1] : ''; };
const driveId = KPC.driveId = u => { const m = /drive\.google\.com[/](?:file[/]d[/]|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})/.exec(u || ''); return m ? m[1] : ''; };

// แลปใน Virtual Physics Lab มี frame-busting (ถ้าฝังใน iframe จะพาทั้งหน้าไปที่แลป)
// → แสดงเป็นปุ่มเปิดแท็บใหม่แทนการฝัง
KPC.noEmbed = u => /Virtual(%20| )Physics(%20| )Lab/i.test(u || '');

function embedSrc(u) {
  u = safeUrl(u); if (!u) return '';
  const y = ytId(u); if (y) return 'https://www.youtube-nocookie.com/embed/' + y + '?rel=0';
  const d = driveId(u); if (d) return 'https://drive.google.com/file/d/' + d + '/preview';
  const g = /docs\.google\.com[/](presentation|document|spreadsheets|forms)[/]d[/](e[/])?([\w-]{20,})/.exec(u);
  if (g) return g[1] === 'presentation' ? u.replace(/[/](edit|pub|view)\b.*$/, '') + '/embed'
    : g[1] === 'forms' ? u.replace(/[/](edit|viewform)\b.*$/, '') + '/viewform?embedded=true'
    : u.replace(/[/](edit|view|pub)\b.*$/, '') + '/preview';
  return u;
}
KPC.embedSrc = embedSrc;

const ICON = KPC.ICON = {
  out: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M8 7h9v9"/></svg>',
};

/* ===================== แปลงเนื้อหาบท =====================
   ## หัวข้อ · ### หัวข้อย่อย · - รายการ · 1. รายการ · > กล่องเน้น · **ตัวหนา** · $สมการ$ · $$สมการ$$
   [รูป: ลิงก์ | คำบรรยาย] · [คลิป: ลิงก์ YouTube] · [PDF: ลิงก์ Drive] · [ฝัง: ลิงก์ | ชื่อ] · [ลิงก์: ข้อความ | ลิงก์]
   บรรทัดที่มีแต่ลิงก์ YouTube จะกลายเป็นคลิปให้เอง */
const imgSrc = s => {
  s = String(s || '').trim();
  const d = driveId(s); if (d) return 'https://drive.google.com/thumbnail?id=' + d + '&sz=w1600';
  return safeUrl(s);
};
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/(^|[\s(])(https?:[/][/][^\s<]+)/g, (m, a, u) => `${a}<a href="${u}" target="_blank" rel="noopener">${u.length > 60 ? u.slice(0, 57) + '…' : u}</a>`);

function block(kind, arg) {
  const [a, b] = String(arg).split('|').map(x => x.trim());
  kind = kind.toLowerCase();
  if (kind === 'รูป') {
    const s = imgSrc(a); if (!s) return '';
    return `<figure><img src="${esc(s)}" alt="${esc(b || '')}" loading="lazy">${b ? `<figcaption>${esc(b)}</figcaption>` : ''}</figure>`;
  }
  if (kind === 'ลิงก์') {
    const url = safeUrl(b || a); if (!url) return '';
    return `<p><a class="lbtn" href="${esc(url)}" target="_blank" rel="noopener">${esc(b ? a : 'เปิดลิงก์')} ${ICON.out}</a></p>`;
  }
  const url = safeUrl(a); if (!url) return '';
  if (KPC.noEmbed(url)) return `<p><a class="lbtn" href="${esc(url)}" target="_blank" rel="noopener">🧪 ${esc(b || 'เปิด Virtual Lab')} ${ICON.out}</a></p>`;
  const src = embedSrc(url);
  const cls = ytId(url) ? 'v' : (driveId(url) || /docs\.google\.com/.test(url)) ? 'doc' : 'web';
  return `<div class="embed ${cls}"><iframe src="${esc(src)}" loading="lazy" allow="fullscreen; encrypted-media; picture-in-picture" allowfullscreen title="${esc(b || kind)}"></iframe></div>`
    + (cls === 'v' ? '' : `<div class="embed-cap"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(b || 'เปิดในแท็บใหม่')} ${ICON.out}</a></div>`);
}

KPC.renderBody = function (src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  let html = '', para = [], list = null, math = null;
  const flushP = () => { if (para.length) { html += '<p>' + para.map(inline).join('<br>') + '</p>'; para = []; } };
  const flushL = () => {
    if (!list) return;
    html += list.tag === 'blockquote' ? `<blockquote>${list.items.map(inline).join('<br>')}</blockquote>`
      : `<${list.tag}>${list.items.map(x => '<li>' + inline(x) + '</li>').join('')}</${list.tag}>`;
    list = null;
  };
  const flush = () => { flushP(); flushL(); };
  const into = (tag, x) => { flushP(); if (!list || list.tag !== tag) { flushL(); list = { tag, items: [] }; } list.items.push(x); };
  for (const raw of lines) {
    const line = raw.trim();
    if (math) { math.push(line); if (line.endsWith('$$')) { html += `<div class="math">${esc(math.join('\n'))}</div>`; math = null; } continue; }
    if (!line) { flush(); continue; }
    if (line.startsWith('$$')) { flush(); if (line.length > 4 && line.endsWith('$$')) html += `<div class="math">${esc(line)}</div>`; else math = [line]; continue; }
    let m;
    if ((m = /^(#{2,3})\s*(.+)$/.exec(line))) { flush(); html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; continue; }
    if ((m = /^>\s?(.*)$/.exec(line))) { into('blockquote', m[1]); continue; }
    if ((m = /^[-•*]\s+(.+)$/.exec(line))) { into('ul', m[1]); continue; }
    if ((m = /^\d+[.)]\s+(.+)$/.exec(line))) { into('ol', m[1]); continue; }
    if ((m = /^\[\s*(รูป|คลิป|PDF|ไฟล์|ฝัง|ลิงก์)\s*:\s*(.+)\]$/i.exec(line))) { flush(); html += block(m[1], m[2]); continue; }
    if (/^https?:\S+$/.test(line) && ytId(line)) { flush(); html += block('คลิป', line); continue; }
    flushL(); para.push(line);
  }
  if (math) html += `<div class="math">${esc(math.join('\n'))}</div>`;
  flush();
  return html;
};

KPC.typeset = function (el) {
  if (!el) return;
  const run = () => W.renderMathInElement && W.renderMathInElement(el, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false
  });
  if (W.renderMathInElement) run(); else W.addEventListener('load', run, { once: true });
};

// แยกซิมูเลชัน ([ฝัง: …]) ออกจากเนื้อหาบท → ไปอยู่ในจอใหญ่/แท็บ Simulation
KPC.splitSims = function (body) {
  const sims = [], rest = [];
  String(body || '').split('\n').forEach(line => {
    const m = /^\s*\[\s*ฝัง\s*:\s*(.+)\]\s*$/.exec(line);
    if (m) { const [u, lab] = m[1].split('|').map(x => x.trim()); if (safeUrl(u)) { sims.push({ url: u, label: lab || '' }); return; } }
    rest.push(line);
  });
  return { sims, text: rest.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
};

/* ===================== บัญชี + สิทธิ์ ===================== */
const col = name => db.collection(name);
const pid = (uid, cid) => uid + '_' + cid;

KPC.me = null;    // students/{uid} ของคนที่ล็อกอิน
KPC.user = () => (auth && auth.currentUser) || null;
KPC.uid = () => (KPC.user() || {}).uid || '';
// ครู = อีเมลเจ้าของ + ยืนยันอีเมลแล้ว (ล็อกอินด้วย Google) — rules ตรวจแบบเดียวกัน
KPC.isTeacher = () => { const u = KPC.user(); return !!(u && u.email === KPC.TEACHER_EMAIL && u.emailVerified); };
KPC.canCourse = cid => KPC.isTeacher() || !!(KPC.me && (KPC.me.courses || []).some(c => c === cid || c === '*'));

// สร้าง students/{uid} ให้ครั้งแรกที่ล็อกอิน (courses ว่าง — ครูเป็นคนให้สิทธิ์)
async function ensureStudent(u) {
  const ref = col('students').doc(u.uid);
  try {
    const s = await ref.get();
    if (s.exists) return s.data();
    const data = { email: u.email || '', name: u.displayName || '', courses: [], createdAt: FS().serverTimestamp() };
    await ref.set(data);
    return data;
  } catch (e) { console.warn('ensureStudent', e); return null; }
}

// เรียก cb(user) ทุกครั้งที่สถานะล็อกอินเปลี่ยน — หลังโหลดข้อมูลนักเรียน (KPC.me) แล้ว
KPC.onUser = function (cb) {
  if (!auth) { cb(null); return; }
  auth.onAuthStateChanged(async u => {
    KPC.me = u ? await ensureStudent(u) : null;
    cb(u || null);
  });
};
KPC.refreshMe = async () => { const u = KPC.user(); KPC.me = u ? await ensureStudent(u) : null; return KPC.me; };

KPC.loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
KPC.loginEmail = (email, pass) => auth.signInWithEmailAndPassword(String(email).trim(), pass);
KPC.register = async (email, pass, name) => {
  const cred = await auth.createUserWithEmailAndPassword(String(email).trim(), pass);
  if (name) { try { await cred.user.updateProfile({ displayName: name }); } catch (e) { /* ข้าม */ } }
  return cred;
};
KPC.resetPassword = email => auth.sendPasswordResetEmail(String(email).trim());
KPC.logout = () => auth.signOut();
KPC.authError = function (code) {
  const map = {
    'auth/user-not-found': 'ไม่พบบัญชีนี้ในระบบ',
    'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
    'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth/invalid-login-credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth/email-already-in-use': 'อีเมลนี้มีบัญชีอยู่แล้ว — เข้าสู่ระบบแทน',
    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'auth/weak-password': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    'auth/too-many-requests': 'ลองใหม่ภายหลัง (เข้าสู่ระบบผิดหลายครั้ง)',
    'auth/network-request-failed': 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต',
    'auth/popup-blocked': 'เบราว์เซอร์บล็อกหน้าต่างล็อกอิน — อนุญาต popup แล้วลองใหม่',
    'auth/unauthorized-domain': 'โดเมนนี้ยังไม่ได้เพิ่มใน Firebase (Authentication → Settings → Authorized domains)',
    'auth/operation-not-allowed': 'ยังไม่ได้เปิดวิธีล็อกอินนี้ใน Firebase (Authentication → Sign-in method)',
  };
  return map[code] || 'เกิดข้อผิดพลาด: ' + code;
};

/* ===================== ข้อมูลคอร์ส ===================== */
// รายการคอร์ส (นักเรียน: เฉพาะที่เผยแพร่ · ครู: all = true)
KPC.listCourses = async function (all) {
  const q = all ? col('courses') : col('courses').where('published', '==', true);
  const snap = await q.get();
  return snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
    .sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.title).localeCompare(String(b.title), 'th'));
};

KPC.getCourse = async function (cid) {
  const s = await col('courses').doc(cid).get();
  return s.exists ? Object.assign({ id: s.id }, s.data()) : null;
};

// เนื้อหาบทเดียว (null ถ้าไม่มีสิทธิ์ / ไม่พบ)
KPC.getLesson = async function (cid, lid) {
  try {
    const s = await col('courses').doc(cid).collection('lessons').doc(lid).get();
    return s.exists ? Object.assign({ id: s.id }, s.data()) : null;
  } catch (e) {
    if (e.code === 'permission-denied') return null;
    throw e;
  }
};

KPC.listLessons = async function (cid) {
  const snap = await col('courses').doc(cid).collection('lessons').get();
  return snap.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (a.order || 0) - (b.order || 0));
};

/* ---------- ความคืบหน้า ---------- */
KPC.getProgress = async function (cid) {
  const uid = KPC.uid(); if (!uid) return null;
  try {
    const s = await col('course_progress').doc(pid(uid, cid)).get();
    return s.exists ? s.data() : null;
  } catch (e) { return null; }
};

KPC.saveProgress = function (cid, patch) {
  const u = KPC.user(); if (!u) return Promise.resolve();
  const data = Object.assign({ uid: u.uid, email: u.email || '', courseId: cid, updatedAt: FS().serverTimestamp() }, patch);
  return col('course_progress').doc(pid(u.uid, cid)).set(data, { merge: true });
};

/* ---------- คำขอสิทธิ์ ---------- */
KPC.getMyRequest = async function (cid) {
  const uid = KPC.uid(); if (!uid) return null;
  try {
    const s = await col('course_requests').doc(pid(uid, cid)).get();
    return s.exists ? s.data() : null;
  } catch (e) { return null; }
};

KPC.requestAccess = function (cid, note) {
  const u = KPC.user(); if (!u) return Promise.reject(new Error('ยังไม่ได้เข้าสู่ระบบ'));
  return col('course_requests').doc(pid(u.uid, cid)).set({
    uid: u.uid, email: u.email || '', name: u.displayName || '', courseId: cid,
    note: String(note || '').slice(0, 300), createdAt: FS().serverTimestamp()
  });
};

/* ===================== ฝั่งครู ===================== */
KPC.admin = {
  saveCourse: (cid, data) => col('courses').doc(cid).set(Object.assign({}, data, { updatedAt: FS().serverTimestamp() }), { merge: true }),
  deleteCourse: async cid => {
    const ls = await col('courses').doc(cid).collection('lessons').get();
    const batch = db.batch();
    ls.docs.forEach(d => batch.delete(d.ref));
    batch.delete(col('courses').doc(cid));
    return batch.commit();
  },
  newLessonId: cid => col('courses').doc(cid).collection('lessons').doc().id,
  lessonRef: (cid, lid) => col('courses').doc(cid).collection('lessons').doc(lid),
  saveLesson: (cid, lid, data) => col('courses').doc(cid).collection('lessons').doc(lid).set(data),
  deleteLesson: (cid, lid) => col('courses').doc(cid).collection('lessons').doc(lid).delete(),

  // เขียนสารบัญ (outline) ลงเอกสารคอร์ส — ให้คนที่ยังไม่มีสิทธิ์เห็นรายชื่อบท (ไม่มีเนื้อหา)
  syncOutline: async cid => {
    const lessons = await KPC.listLessons(cid);
    const outline = lessons.map(l => ({ id: l.id, unit: l.unit || '', title: l.title || '', dur: l.dur || '', free: !!l.free, video: !!l.video }));
    await col('courses').doc(cid).set({ outline, lessonCount: outline.length, updatedAt: FS().serverTimestamp() }, { merge: true });
    return outline;
  },

  allStudents: async () => {
    const s = await col('students').get();
    return s.docs.map(d => Object.assign({ id: d.id }, d.data()));
  },
  studentsOf: async cid => {
    const [one, all] = await Promise.all([
      col('students').where('courses', 'array-contains', cid).get(),
      col('students').where('courses', 'array-contains', '*').get()
    ]);
    const map = {};
    one.docs.forEach(d => { map[d.id] = Object.assign({ id: d.id, via: cid }, d.data()); });
    all.docs.forEach(d => { if (!map[d.id]) map[d.id] = Object.assign({ id: d.id, via: '*' }, d.data()); });
    return Object.values(map);
  },
  findStudentByEmail: async email => {
    const s = await col('students').where('email', '==', String(email).trim()).limit(1).get();
    return s.empty ? null : Object.assign({ id: s.docs[0].id }, s.docs[0].data());
  },
  grant: (uid, cid) => col('students').doc(uid).update({ courses: FS().arrayUnion(cid) }),
  revoke: (uid, cid) => col('students').doc(uid).update({ courses: FS().arrayRemove(cid) }),

  requests: async () => {
    const s = await col('course_requests').get();
    return s.docs.map(d => Object.assign({ id: d.id }, d.data()))
      .sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
  },
  dropRequest: rid => col('course_requests').doc(rid).delete(),

  progressOf: async cid => {
    const s = await col('course_progress').where('courseId', '==', cid).get();
    return s.docs.map(d => Object.assign({ id: d.id }, d.data()));
  },
};

})(window);
