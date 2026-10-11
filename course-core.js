// ============================================================
//  KP Science — คอร์สออนไลน์: โมดูลกลาง (ใช้ทั้งหน้าเรียนและหน้าครู)
//  เว็บนี้แยกจากเว็บ simulation: มี Firebase โปรเจกต์ของตัวเอง (firebase-config.js)
//  ต้องโหลดหลัง firebase-*-compat.js และ firebase-config.js
//
//  บทบาท: แอดมิน (ADMIN_EMAIL) · ครู (staff/{email} active) · นักเรียน (ล็อกอิน) · ผู้เยี่ยมชม
//  Firestore (ดู firestore.rules):
//    staff/{email}                 { email, name, active }  แอดมินเขียน
//    students/{uid}                { email, name, courses:[] (ระบบเดิม), createdAt }
//    courses/{cid}                 ข้อมูลคอร์ส + outline + owner (อีเมลครูเจ้าของ) · อ่านได้เมื่อ published
//    courses/{cid}/lessons/{lid}   เนื้อหาบท · อ่านได้เมื่อมีสิทธิ์ หรือบท free
//    enrollments/{uid}_{cid}       { uid, email, name, courseId, owner, by, createdAt }  สิทธิ์เข้าเรียน
//    course_progress/{uid}_{cid}   { uid, email, courseId, owner, done:[lid], total, last, lastAt, updatedAt }
//    course_requests/{uid}_{cid}   { uid, email, name, courseId, owner, note, amount?, payRef?, createdAt }
//    courses/{cid}.price           ราคา (บาท · 0/ไม่มี = ฟรี) · courses/{cid}/meta/pay { promptpay, name, note } อ่านได้เมื่อล็อกอิน
// ============================================================
(function (W) {
'use strict';

const KPC = W.KPC = {};
KPC.ADMIN_EMAIL = 'komanepapato@gmail.com';
KPC.SIM_SITE = 'https://kp-science.github.io/physics-simulations/';

/* ===================== Firebase ===================== */
let cfg = W.KPC_FIREBASE_CONFIG || {};
KPC.configured = !!(cfg.apiKey && cfg.projectId);
// ทดสอบในเครื่องกับ Firebase Emulator: เปิด http://localhost:…/?emu (จำไว้ในแท็บนั้น) — ไม่แตะฐานข้อมูลจริง
const EMU = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && (/[?&]emu\b/.test(location.search) || sessionStorage.getItem('kpc-emu') === '1');
let auth = null, db = null;
if (KPC.configured) {
  if (EMU) { sessionStorage.setItem('kpc-emu', '1'); cfg = Object.assign({}, cfg, { projectId: 'demo-kp-course' }); }
  firebase.initializeApp(cfg);
  auth = KPC.auth = firebase.auth();
  db = KPC.db = firebase.firestore();
  if (EMU) { auth.useEmulator('http://127.0.0.1:9099'); db.useEmulator('127.0.0.1', 8080); }
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

/* ---------- พร้อมเพย์ (มาตรฐาน EMVCo QR ของ ธปท.) ----------
   id: เบอร์มือถือ 10 หลัก · เลขบัตรประชาชน/ผู้เสียภาษี 13 หลัก · e-Wallet 15 หลัก
   amount > 0 → QR แบบใส่ยอดเงิน (ใช้ครั้งเดียว) · คืน '' ถ้ารูปแบบเลขไม่ถูก */
KPC.promptpay = function (id, amount) {
  const d = String(id || '').replace(/\D/g, '');
  let sub;
  if (d.length === 10 && d[0] === '0') sub = ['01', '0066' + d.slice(1)];
  else if (d.length === 13) sub = ['02', d];
  else if (d.length === 15) sub = ['03', d];
  else return '';
  const f = (tag, v) => tag + String(v.length).padStart(2, '0') + v;
  const amt = Number(amount) > 0 ? Number(amount).toFixed(2) : '';
  let s = f('00', '01') + f('01', amt ? '12' : '11') + f('29', f('00', 'A000000677010111') + f(sub[0], sub[1])) + f('58', 'TH') + f('53', '764') + (amt ? f('54', amt) : '') + '6304';
  let crc = 0xFFFF;
  for (let i = 0; i < s.length; i++) { crc ^= s.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF; }
  return s + crc.toString(16).toUpperCase().padStart(4, '0');
};
KPC.baht = n => '฿' + Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });

const ICON = KPC.ICON = {
  out: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M8 7h9v9"/></svg>',
};

/* ===================== การเคลื่อนไหว =====================
   KPC.motion(root, selector) — องค์ประกอบที่ตรง selector ลอยขึ้นทีละชิ้นเมื่อเลื่อนมาเห็น
   (ไล่ลำดับในพ่อเดียวกัน 70ms) · แถบ % และวงแหวนวิ่งจาก 0 · เสร็จแล้วถอดคลาสออก (ไม่กวน hover)
   KPC.pageIn(el) — จางเข้าตอนเปลี่ยนหน้า */
const REDUCED = () => W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
KPC.motion = function (root, sel) {
  if (!root || REDUCED() || !('IntersectionObserver' in W)) return;
  const show = el => {
    io.unobserve(el);
    setTimeout(() => {   // ไม่ใช้ requestAnimationFrame — แท็บที่ถูกซ่อนจะไม่รัน
      el.classList.add('in');
      el.querySelectorAll('[data-w]').forEach(b => { b.style.width = b.dataset.w; });
      el.querySelectorAll('[data-off]').forEach(c => { c.style.strokeDashoffset = c.dataset.off; });
    }, 30);
    setTimeout(() => { el.classList.remove('reveal', 'in'); el.style.removeProperty('--d'); }, 1000 + (parseInt(el.style.getPropertyValue('--d')) || 0));
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting && e.target.classList.contains('reveal') && !e.target.classList.contains('in')) show(e.target); }), { rootMargin: '0px 0px -6% 0px' });
  const order = new Map();
  root.querySelectorAll(sel).forEach(el => {
    if (el.classList.contains('reveal')) return;
    const i = order.get(el.parentElement) || 0; order.set(el.parentElement, i + 1);
    el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
    el.classList.add('reveal');
    el.querySelectorAll('.bar > i').forEach(b => { b.dataset.w = b.style.width; b.style.width = '0'; });
    el.querySelectorAll('.ring .fg').forEach(c => { c.dataset.off = c.getAttribute('stroke-dashoffset'); c.style.strokeDashoffset = c.getAttribute('stroke-dasharray'); });
    io.observe(el);
  });
  // กันพลาด: ถ้าผ่านไป 2.5 วิ แล้วอะไรที่อยู่บนจออยู่แล้วยังไม่ขึ้น (เช่น แท็บถูกซ่อน) ให้แสดงเลย
  setTimeout(() => root.querySelectorAll('.reveal:not(.in)').forEach(el => { if (el.getBoundingClientRect().top < innerHeight) show(el); }), 2500);
};
KPC.pageIn = function (el) {
  if (!el || REDUCED()) return;
  el.classList.remove('page-in'); void el.offsetWidth; el.classList.add('page-in');
};
// แถบเมนูทึบขึ้นเล็กน้อยเมื่อเลื่อนลง
W.addEventListener('scroll', () => { const t = document.querySelector('.topbar'); if (t) t.classList.toggle('scrolled', W.scrollY > 8); }, { passive: true });

/* ===================== แปลงเนื้อหาบท =====================
   ## หัวข้อ · ### หัวข้อย่อย · - รายการ · 1. รายการ · > กล่องเน้น · **ตัวหนา** · $สมการ$ · $$สมการ$$
   [รูป: ลิงก์ | คำบรรยาย] · [คลิป: ลิงก์ YouTube] · [PDF: ลิงก์ Drive] · [ฝัง: ลิงก์ | ชื่อ] · [ลิงก์: ข้อความ | ลิงก์]
   บรรทัดที่มีแต่ลิงก์ YouTube จะกลายเป็นคลิปให้เอง */
const imgSrc = s => {
  s = String(s || '').trim();
  const d = driveId(s); if (d) return 'https://drive.google.com/thumbnail?id=' + d + '&sz=w1600';
  return safeUrl(s);
};
KPC.imgSrc = imgSrc;   // ลิงก์รูป: ลิงก์แชร์ Google Drive → ลิงก์รูปตรง
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

/* ===================== บัญชี + บทบาท =====================
   role: 'admin' | 'teacher' | 'student' | 'guest'  (rules ตรวจแบบเดียวกัน) */
const col = name => db.collection(name);
const pid = (uid, cid) => uid + '_' + cid;
const lower = s => String(s || '').trim().toLowerCase();

KPC.me = null;         // students/{uid} ของคนที่ล็อกอิน
KPC.staff = null;      // staff/{email} ถ้าเป็นครู
KPC.enrolled = [];     // รหัสคอร์สที่มีสิทธิ์เรียน (enrollments + ระบบเดิม students.courses)
KPC.role = 'guest';
KPC.user = () => (auth && auth.currentUser) || null;
KPC.uid = () => (KPC.user() || {}).uid || '';
KPC.email = () => lower((KPC.user() || {}).email);
KPC.ROLE = {
  admin:   { label: 'แอดมิน', icon: '👑' },
  teacher: { label: 'ครู', icon: '🧑‍🏫' },
  student: { label: 'นักเรียน', icon: '🎓' },
  guest:   { label: 'ผู้เยี่ยมชม', icon: '👀' },
};
// แอดมิน = อีเมลเจ้าของ + ยืนยันอีเมลแล้ว (ล็อกอินด้วย Google)
KPC.isAdmin = () => { const u = KPC.user(); return !!(u && u.emailVerified && lower(u.email) === KPC.ADMIN_EMAIL); };
KPC.isTeacher = () => KPC.role === 'teacher';
KPC.isStaff = () => KPC.role === 'admin' || KPC.role === 'teacher';
// จัดการคอร์สนี้ได้ไหม (แอดมิน หรือครูเจ้าของ) — c = เอกสารคอร์ส
KPC.ownsCourse = c => KPC.role === 'admin' || (KPC.role === 'teacher' && !!c && c.owner === KPC.email());
KPC.canCourse = (cid, c) => KPC.ownsCourse(c) || KPC.enrolled.includes(cid) || KPC.enrolled.includes('*');
KPC.displayName = () => { const u = KPC.user(); return u ? ((KPC.staff && KPC.staff.name) || (KPC.me && KPC.me.name) || u.displayName || (u.email || '').split('@')[0]) : ''; };

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
async function loadStaff(u) {
  if (!u.emailVerified || !u.email) return null;
  try { const s = await col('staff').doc(lower(u.email)).get(); return s.exists && s.data().active ? s.data() : null; }
  catch (e) { return null; }
}
async function loadEnrolled(u) {
  try {
    const s = await col('enrollments').where('uid', '==', u.uid).get();
    return s.docs.map(d => d.data().courseId);
  } catch (e) { console.warn('enrollments', e); return []; }
}
async function loadUser(u) {
  if (!u) { KPC.me = KPC.staff = null; KPC.enrolled = []; KPC.role = 'guest'; return; }
  const [me, staff, en] = await Promise.all([ensureStudent(u), loadStaff(u), loadEnrolled(u)]);
  KPC.me = me; KPC.staff = staff;
  KPC.enrolled = Array.from(new Set(en.concat((me && me.courses) || [])));
  KPC.role = KPC.isAdmin() ? 'admin' : staff ? 'teacher' : 'student';
}

// เรียก cb(user) ทุกครั้งที่สถานะล็อกอินเปลี่ยน — หลังโหลดบทบาท + สิทธิ์แล้ว
KPC.onUser = function (cb) {
  if (!auth) { cb(null); return; }
  auth.onAuthStateChanged(async u => { await loadUser(u); cb(u || null); });
};
KPC.refreshMe = async () => { await loadUser(KPC.user()); return KPC.me; };

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
const byOrder = (a, b) => (a.order || 0) - (b.order || 0) || String(a.title).localeCompare(String(b.title), 'th');
const docs = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));

// รายการคอร์ส — นักเรียน/ผู้เยี่ยมชม: ที่เผยแพร่ · ครู: ที่เผยแพร่ + ร่างของตัวเอง · แอดมิน: ทั้งหมด
KPC.listCourses = async function () {
  if (KPC.role === 'admin') return docs(await col('courses').get()).sort(byOrder);
  const qs = [col('courses').where('published', '==', true).get()];
  if (KPC.role === 'teacher') qs.push(col('courses').where('owner', '==', KPC.email()).get());
  const map = {};
  (await Promise.all(qs)).forEach(s => docs(s).forEach(c => { map[c.id] = c; }));
  return Object.values(map).sort(byOrder);
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
  return docs(snap).sort((a, b) => (a.order || 0) - (b.order || 0));
};

/* ---------- ความคืบหน้า ---------- */
KPC.getProgress = async function (cid) {
  const uid = KPC.uid(); if (!uid) return null;
  try {
    const s = await col('course_progress').doc(pid(uid, cid)).get();
    return s.exists ? s.data() : null;
  } catch (e) { return null; }
};

// c = เอกสารคอร์ส (ต้องมี owner — rules ตรวจว่าตรงกับคอร์ส)
KPC.saveProgress = function (c, patch) {
  const u = KPC.user(); if (!u) return Promise.resolve();
  const data = Object.assign({ uid: u.uid, email: u.email || '', courseId: c.id, owner: c.owner || '', updatedAt: FS().serverTimestamp() }, patch);
  return col('course_progress').doc(pid(u.uid, c.id)).set(data, { merge: true });
};

/* ---------- คำขอสิทธิ์ ---------- */
KPC.getMyRequest = async function (cid) {
  const uid = KPC.uid(); if (!uid) return null;
  try {
    const s = await col('course_requests').doc(pid(uid, cid)).get();
    return s.exists ? s.data() : null;
  } catch (e) { return null; }
};

// pay = { ref } เมื่อเป็นคอร์สมีราคา (แจ้งชำระเงิน) — ครูตรวจยอดในบัญชีแล้วอนุมัติเอง
KPC.requestAccess = function (c, note, pay) {
  const u = KPC.user(); if (!u) return Promise.reject(new Error('ยังไม่ได้เข้าสู่ระบบ'));
  const data = { uid: u.uid, email: u.email || '', name: KPC.displayName(), courseId: c.id, owner: c.owner || '',
    note: String(note || '').slice(0, 300), createdAt: FS().serverTimestamp() };
  if (pay) { data.amount = Number(c.price) || 0; data.payRef = String(pay.ref || '').slice(0, 100); }
  return col('course_requests').doc(pid(u.uid, c.id)).set(data);
};

/* ---------- ข้อมูลรับเงิน: courses/{cid}/meta/pay (อ่านได้เฉพาะคนที่ล็อกอิน) ---------- */
KPC.getPayInfo = async function (cid) {
  try { const s = await col('courses').doc(cid).collection('meta').doc('pay').get(); return s.exists ? s.data() : null; }
  catch (e) { return null; }
};
KPC.cancelRequest = cid => col('course_requests').doc(pid(KPC.uid(), cid)).delete();

/* ===================== ฝั่งครู / แอดมิน =====================
   ครู: ทุกคำค้นใส่ where('owner','==',อีเมลตัวเอง) — rules อนุญาตเฉพาะแบบนี้
   แอดมิน: ค้นได้ทั้งหมด */
const mine = q => KPC.role === 'admin' ? q : q.where('owner', '==', KPC.email());

KPC.admin = {
  saveCourse: (cid, data) => col('courses').doc(cid).set(Object.assign({}, data, { updatedAt: FS().serverTimestamp() }), { merge: true }),
  deleteCourse: async cid => {
    const ls = await col('courses').doc(cid).collection('lessons').get();
    const batch = db.batch();
    ls.docs.forEach(d => batch.delete(d.ref));
    batch.delete(col('courses').doc(cid).collection('meta').doc('pay'));
    batch.delete(col('courses').doc(cid));
    return batch.commit();
  },
  savePayInfo: (cid, data) => col('courses').doc(cid).collection('meta').doc('pay').set(Object.assign({}, data, { updatedAt: FS().serverTimestamp() })),
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

  // ---- นักเรียน / สิทธิ์ ----
  enrollments: async cid => docs(await (cid ? mine(col('enrollments')).where('courseId', '==', cid) : mine(col('enrollments'))).get()),
  findStudentByEmail: async email => {
    const s = await col('students').where('email', '==', String(email).trim()).limit(1).get();
    return s.empty ? null : Object.assign({ id: s.docs[0].id }, s.docs[0].data());
  },
  // st = { uid|id, email, name } · c = เอกสารคอร์ส
  grant: (st, c) => {
    const uid = st.uid || st.id;
    return col('enrollments').doc(pid(uid, c.id)).set({ uid, email: st.email || '', name: st.name || '', courseId: c.id,
      owner: c.owner || '', by: KPC.email(), createdAt: FS().serverTimestamp() });
  },
  revoke: (uid, cid) => col('enrollments').doc(pid(uid, cid)).delete(),

  requests: async cid => docs(await (cid ? mine(col('course_requests')).where('courseId', '==', cid) : mine(col('course_requests'))).get())
    .sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0)),
  dropRequest: rid => col('course_requests').doc(rid).delete(),

  progress: async cid => docs(await (cid ? mine(col('course_progress')).where('courseId', '==', cid) : mine(col('course_progress'))).get()),

  // ---- เฉพาะแอดมิน ----
  students: async () => docs(await col('students').get()),
  setStudentName: async (uid, name) => {
    await col('students').doc(uid).update({ name });
    // ชื่อในสิทธิ์เข้าเรียน (ครูเห็นชื่อจากตรงนี้) ให้ตรงกัน
    const en = await col('enrollments').where('uid', '==', uid).get();
    if (!en.empty) { const b = db.batch(); en.docs.forEach(d => b.update(d.ref, { name })); await b.commit(); }
  },
  // ลบข้อมูลของสมาชิกในเว็บคอร์ส (สิทธิ์ · ความคืบหน้า · คำขอ · บัญชีนักเรียน) — บัญชีล็อกอินยังอยู่ ถ้าเข้ามาใหม่จะเริ่มจากว่าง
  deleteMember: async uid => {
    const refs = [col('students').doc(uid)];
    for (const name of ['enrollments', 'course_progress', 'course_requests']) (await col(name).where('uid', '==', uid).get()).docs.forEach(d => refs.push(d.ref));
    const b = db.batch(); refs.forEach(r => b.delete(r)); await b.commit();
    return refs.length;
  },
  staffList: async () => docs(await col('staff').get()).sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id), 'th')),
  saveStaff: (email, data) => col('staff').doc(lower(email)).set(Object.assign({ email: lower(email) }, data, { updatedAt: FS().serverTimestamp() }), { merge: true }),
  deleteStaff: email => col('staff').doc(lower(email)).delete(),

  // โอนคอร์สให้ครูคนอื่น — ย้าย owner ของสิทธิ์/ความคืบหน้า/คำขอ ตามไปด้วย
  reassign: async (cid, owner) => {
    owner = lower(owner);
    const refs = [col('courses').doc(cid)];
    for (const name of ['enrollments', 'course_progress', 'course_requests']) {
      (await col(name).where('courseId', '==', cid).get()).docs.forEach(d => refs.push(d.ref));
    }
    for (let i = 0; i < refs.length; i += 400) {
      const batch = db.batch();
      refs.slice(i, i + 400).forEach(r => batch.update(r, { owner }));
      await batch.commit();
    }
    return refs.length - 1;
  },

  // ย้ายข้อมูลจากระบบเดิม (ครูคนเดียว) → 4 บทบาท · ทำซ้ำได้ ไม่มีอะไรให้ทำก็ไม่เขียน
  migrate: async () => {
    let n = 0;
    const courses = docs(await col('courses').get());
    const ownerOf = {};
    for (const c of courses) {
      if (!c.owner) { await col('courses').doc(c.id).update({ owner: KPC.ADMIN_EMAIL }); c.owner = KPC.ADMIN_EMAIL; n++; }
      ownerOf[c.id] = c.owner;
    }
    // students.courses → enrollments
    const st = docs(await col('students').get());
    for (const s of st) {
      const list = (s.courses || []).filter(cid => cid !== '*' && ownerOf[cid]);
      for (const cid of list) {
        await col('enrollments').doc(pid(s.id, cid)).set({ uid: s.id, email: s.email || '', name: s.name || '', courseId: cid,
          owner: ownerOf[cid], by: KPC.email(), createdAt: FS().serverTimestamp() });
        await col('students').doc(s.id).update({ courses: FS().arrayRemove(cid) });
        n++;
      }
    }
    // owner ของความคืบหน้า/คำขอ ให้ตรงกับคอร์ส
    for (const name of ['course_progress', 'course_requests', 'enrollments']) {
      for (const d of docs(await col(name).get())) {
        const o = ownerOf[d.courseId];
        if (o && d.owner !== o) { await col(name).doc(d.id).update({ owner: o }); n++; }
      }
    }
    return n;
  },
};

})(window);
