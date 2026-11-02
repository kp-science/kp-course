/* KP Course — แจ้งเตือนทางอีเมล (Google Apps Script Web App)
   ติดตั้ง: script.google.com → โปรเจกต์ใหม่ → วางไฟล์นี้ → Deploy → New deployment → Web app
            Execute as: Me · Who has access: Anyone → คัดลอก URL ใส่ KPC_MAIL_URL ใน firebase-config.js
   เมลส่งจากบัญชี Google ที่ติดตั้งสคริปต์

   ความปลอดภัย: เว็บส่งมาแค่ { idToken, type, id } เท่านั้น
   - ไม่รับผู้รับหรือเนื้อหาจากภายนอก: อ่านเอกสารจาก Firestore ด้วย token ของผู้เรียก (ผ่าน security rules) แล้วใช้ข้อความสำเร็จรูป
   - ตรวจว่าผู้เรียกมีสิทธิ์สั่งงานประเภทนั้น · จำกัดความถี่ต่อเอกสาร · ไฟล์นี้ไม่มีความลับ (อยู่ใน repo public ได้) */
var PROJECT = 'kp-course';
var API_KEY = 'AIzaSyA1j8oFaZR33GIxaGccBzd1j65GrhnbrcY';
var ADMIN = 'komanepapato@gmail.com';
var SITE = 'https://course.kpscience.com/';

// actor: owner = ครูเจ้าของคอร์สหรือแอดมิน · admin = แอดมิน · self = เจ้าของเอกสาร (นักเรียน)
var TYPES = {
  'approved':    { path: 'enrollments/',       actor: 'owner', to: 'student', wait: 60,  subject: function (t) { return 'เข้าเรียนได้แล้ว: ' + t; }, body: function (t, d, l) { return 'ยินดีด้วย คุณเข้าเรียนคอร์ส ' + t + ' ได้แล้ว\nครูอนุมัติสิทธิ์ให้เรียบร้อย\n\nเริ่มเรียน: ' + l; } },
  // นักเรียนได้สิทธิ์เองด้วยโค้ดเชิญ: สั่งได้เฉพาะสิทธิ์ของตัวเองที่มาจากโค้ด · เว้นนาน 6 ชม. (สูงสุดของ CacheService) กันการสั่งซ้ำ
  'enrolled':    { path: 'enrollments/',       actor: 'self',  to: 'student', wait: 21600, only: function (d) { return d.by === 'invite' || d.by === 'open'; }, subject: function (t) { return 'เข้าเรียนได้แล้ว: ' + t; }, body: function (t, d, l) { return 'ยินดีด้วย คุณ' + (d.by === 'open' ? 'สมัครเรียนคอร์ส ' : 'ใช้โค้ดเชิญเข้าเรียนคอร์ส ') + t + ' สำเร็จแล้ว\n\nเริ่มเรียน: ' + l; } },
  'rejected':    { path: 'course_rejections/', actor: 'owner', to: 'student', wait: 60,  subject: function (t) { return 'คำขอไม่ผ่าน: ' + t; }, body: function (t, d, l) { return 'คำขอเข้าเรียนคอร์ส ' + t + ' ยังไม่ผ่าน\n' + (d.reason ? 'เหตุผลจากครู: ' + d.reason + '\n' : '') + '\nอ่านรายละเอียด: ' + SITE + '#/inbox'; } },
  'revoked':     { path: 'course_revoked/',    actor: 'owner', to: 'student', wait: 60,  subject: function (t) { return 'ถูกถอนสิทธิ์: ' + t; }, body: function (t, d, l) { return 'ครูถอนสิทธิ์เรียนคอร์ส ' + t + ' แล้ว\n' + (d.reason ? 'เหตุผลจากครู: ' + d.reason + '\n' : '') + '\nอ่านรายละเอียด: ' + SITE + '#/inbox'; } },
  'reply':       { path: 'course_threads/',    actor: 'owner', to: 'student', wait: 60,  subject: function (t) { return 'มีข้อความใหม่: ' + t; }, body: function (t, d, l) { return 'มีข้อความใหม่ถึงคุณในคอร์ส ' + t + '\n\nอ่านข้อความ: ' + SITE + '#/inbox'; } },
  'support-reply': { path: 'support_threads/', actor: 'admin', to: 'student', wait: 60,  subject: function () { return 'แอดมินตอบข้อความของคุณ'; }, body: function () { return 'แอดมินตอบข้อความของคุณแล้ว\n\nอ่านข้อความ: ' + SITE + '#/support'; } },
  'new-request': { path: 'course_requests/',   actor: 'self',  to: 'owner',   wait: 600, subject: function (t) { return 'คำขอเข้าเรียนใหม่: ' + t; }, body: function (t, d) { return (d.name || d.email) + ' ขอเข้าเรียนคอร์ส ' + t + (d.amount ? ' และแจ้งโอนแล้ว' : '') + '\n\nเปิดห้องครู: ' + SITE + 'admin.html#/requests'; } },
  'new-message': { path: 'course_threads/',    actor: 'self',  to: 'owner',   wait: 600, subject: function (t) { return 'มีคำถามใหม่: ' + t; }, body: function (t, d) { return (d.name || d.email) + ' ส่งคำถามในคอร์ส ' + t + '\n\nเปิดห้องครู: ' + SITE + 'admin.html#/messages'; } },
  'new-support': { path: 'support_threads/',   actor: 'self',  to: 'admin',   wait: 600, subject: function () { return 'มีข้อความถึงแอดมิน'; }, body: function (t, d) { return (d.name || d.email) + ' ส่งข้อความถึงแอดมิน\n\nเปิดห้องครู: ' + SITE + 'admin.html#/messages'; } }
};

function doPost(e) {
  var out;
  try { out = handle(JSON.parse(e.postData.contents)); }
  catch (err) { out = { ok: false, error: 'bad-request' }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function handle(q) {
  var type = TYPES[q.type];
  if (!type || !Object.prototype.hasOwnProperty.call(TYPES, q.type)) return { ok: false, error: 'bad-type' };
  if (!/^[\w.-]{1,200}$/.test(String(q.id || ''))) return { ok: false, error: 'bad-id' };
  var me = caller(q.idToken);
  if (!me) return { ok: false, error: 'bad-token' };
  var doc = readDoc(type.path + q.id, q.idToken);
  if (!doc) return { ok: false, error: 'not-found' };

  var isAdmin = me.verified && me.email === ADMIN;
  var allowed = type.actor === 'admin' ? isAdmin
    : type.actor === 'owner' ? isAdmin || (me.verified && me.email === lower(doc.owner))
    : me.uid === doc.uid;
  if (!allowed || (type.only && !type.only(doc))) return { ok: false, error: 'forbidden' };

  var to = type.to === 'admin' ? ADMIN : type.to === 'owner' ? lower(doc.owner) : lower(doc.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: 'no-recipient' };

  var cache = CacheService.getScriptCache(), key = 'sent:' + q.type + ':' + q.id;
  if (cache.get(key)) return { ok: true, skipped: 'cooldown' };
  if (MailApp.getRemainingDailyQuota() < 1) return { ok: false, error: 'quota' };

  var course = doc.courseId ? readDoc('courses/' + doc.courseId, q.idToken) : null;
  var title = (course && course.title) || doc.courseId || '';
  var link = SITE + '#/c/' + encodeURIComponent(doc.courseId || '');
  MailApp.sendEmail({ to: to, name: 'KP Science', subject: type.subject(title), body: type.body(title, doc, link) });
  cache.put(key, '1', type.wait);
  return { ok: true };
}

function caller(idToken) {
  var r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: String(idToken || '') }), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  var u = (JSON.parse(r.getContentText()).users || [])[0];
  return u ? { uid: u.localId, email: lower(u.email), verified: u.emailVerified === true } : null;
}

// อ่านด้วย token ของผู้เรียก: security rules ตรวจสิทธิ์ซ้ำอีกชั้น
function readDoc(path, idToken) {
  var r = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/' + path, {
    headers: { Authorization: 'Bearer ' + idToken }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  var f = JSON.parse(r.getContentText()).fields || {}, out = {};
  Object.keys(f).forEach(function (k) { out[k] = f[k].stringValue !== undefined ? f[k].stringValue : f[k].integerValue !== undefined ? Number(f[k].integerValue) : f[k].booleanValue; });
  return out;
}
function lower(s) { return String(s || '').trim().toLowerCase(); }
