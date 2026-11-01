// ทดสอบ mail-script/Code.gs แบบจำลอง Google Apps Script (ไม่ส่งเมลจริง): node --test tests/mail-script.test.mjs
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../mail-script/Code.gs', import.meta.url), 'utf8');
const ADMIN = 'komanepapato@gmail.com', T1 = 'teach1@school.ac.th';
let sent, cacheStore, quota, ctx, users, docs;
const fs = o => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v }])) });
const resp = (code, body) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(body) });

beforeEach(() => {
  sent = []; cacheStore = {}; quota = 10;
  users = {
    tok_admin: { localId: 'adm', email: ADMIN, emailVerified: true },
    tok_fakeadmin: { localId: 'fake', email: ADMIN, emailVerified: false },
    tok_t1: { localId: 't1', email: T1, emailVerified: true },
    tok_t2: { localId: 't2', email: 't2@school.ac.th', emailVerified: true },
    tok_s1: { localId: 's1', email: 's1@mail.com', emailVerified: false },
    tok_s2: { localId: 's2', email: 's2@mail.com', emailVerified: false },
  };
  docs = {
    'enrollments/s1_c1': { uid: 's1', email: 's1@mail.com', courseId: 'c1', owner: T1 },
    'course_rejections/s1_c1': { uid: 's1', email: 's1@mail.com', courseId: 'c1', owner: T1, reason: 'ยอดไม่ตรง' },
    'course_revoked/s1_c1': { uid: 's1', email: 's1@mail.com', courseId: 'c1', owner: T1, reason: '' },
    'course_threads/s1_c1': { uid: 's1', email: 's1@mail.com', name: 'S1', courseId: 'c1', owner: T1 },
    'course_requests/s1_c1': { uid: 's1', email: 's1@mail.com', name: 'S1', courseId: 'c1', owner: T1, amount: 500 },
    'support_threads/s1': { uid: 's1', email: 's1@mail.com', name: 'S1' },
    'courses/c1': { title: 'คอร์สหนึ่ง', owner: T1 },
  };
  ctx = {
    MailApp: { sendEmail: m => sent.push(m), getRemainingDailyQuota: () => quota },
    CacheService: { getScriptCache: () => ({ get: k => cacheStore[k] || null, put: (k, v) => { cacheStore[k] = v; } }) },
    ContentService: { MimeType: { JSON: 'j' }, createTextOutput: t => ({ setMimeType: () => t }) },
    UrlFetchApp: { fetch(url, o) {
      if (url.includes('accounts:lookup')) { const u = users[JSON.parse(o.payload).idToken]; return u ? resp(200, { users: [u] }) : resp(400, {}); }
      const path = url.split('/documents/')[1], tok = o.headers.Authorization.replace('Bearer ', '');
      return users[tok] && docs[path] ? resp(200, fs(docs[path])) : resp(403, {});
    } },
    JSON, Object, String, Number, encodeURIComponent,
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
});
const call = (idToken, type, id) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ idToken, type, id }) } }));

test('ครูเจ้าของอนุมัติ → เมลถึงนักเรียนจากฐานข้อมูล', () => {
  assert.equal(call('tok_t1', 'approved', 's1_c1').ok, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 's1@mail.com');
  assert.match(sent[0].subject, /คอร์สหนึ่ง/);
});
test('นักเรียน / ครูอื่น / แอดมินปลอม สั่งเมลอนุมัติไม่ได้ · แอดมินจริงได้', () => {
  for (const t of ['tok_s1', 'tok_s2', 'tok_t2', 'tok_fakeadmin']) assert.equal(call(t, 'approved', 's1_c1').error, 'forbidden', t);
  assert.equal(sent.length, 0);
  assert.equal(call('tok_admin', 'approved', 's1_c1').ok, true);
});
test('token ปลอม / ประเภทแปลก / id แปลก / ไม่มีเอกสาร = ไม่ส่ง', () => {
  assert.equal(call('nope', 'approved', 's1_c1').error, 'bad-token');
  assert.equal(call('tok_t1', 'constructor', 's1_c1').error, 'bad-type');
  assert.equal(call('tok_t1', 'approved', '../staff/x').error, 'bad-id');
  assert.equal(call('tok_t1', 'approved', 'none_c1').error, 'not-found');
  assert.equal(sent.length, 0);
});
test('ค่าที่ส่งมาเกินจาก type+id ไม่มีผลต่อผู้รับ/เนื้อหา', () => {
  const r = JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ idToken: 'tok_t1', type: 'approved', id: 's1_c1', to: 'victim@x.com', subject: 'spam', body: 'spam' }) } }));
  assert.equal(r.ok, true);
  assert.equal(sent[0].to, 's1@mail.com');
  assert.doesNotMatch(sent[0].subject + sent[0].body, /spam/);
});
test('นักเรียนแจ้งครูได้เฉพาะของตัวเอง · ผู้รับคือครูเจ้าของ · จำกัดความถี่', () => {
  assert.equal(call('tok_s2', 'new-request', 's1_c1').error, 'forbidden');
  assert.equal(call('tok_s1', 'new-request', 's1_c1').ok, true);
  assert.equal(sent[0].to, T1);
  assert.equal(call('tok_s1', 'new-request', 's1_c1').skipped, 'cooldown');
  assert.equal(sent.length, 1);
});
test('เข้าด้วยโค้ดเชิญ: เจ้าของสิทธิ์ได้เมลของตัวเอง · สิทธิ์ที่ครูให้หรือของคนอื่นสั่งเองไม่ได้ · ซ้ำไม่ส่ง', () => {
  assert.equal(call('tok_s1', 'enrolled', 's1_c1').error, 'forbidden');          // by ไม่ใช่ invite
  docs['enrollments/s1_c1'].by = 'invite';
  assert.equal(call('tok_s2', 'enrolled', 's1_c1').error, 'forbidden');
  assert.equal(call('tok_t1', 'enrolled', 's1_c1').error, 'forbidden');
  assert.equal(call('tok_s1', 'enrolled', 's1_c1').ok, true);
  assert.equal(sent[0].to, 's1@mail.com');
  assert.match(sent[0].subject, /เข้าเรียนได้แล้ว: คอร์สหนึ่ง/);
  assert.equal(call('tok_s1', 'enrolled', 's1_c1').skipped, 'cooldown');
  assert.equal(sent.length, 1);
});
test('ติดต่อแอดมิน: เจ้าของแจ้งแอดมินได้ · แอดมินตอบได้ · ครูตอบไม่ได้', () => {
  assert.equal(call('tok_s1', 'new-support', 's1').ok, true);
  assert.equal(sent[0].to, ADMIN);
  assert.equal(call('tok_t1', 'support-reply', 's1').error, 'forbidden');
  assert.equal(call('tok_admin', 'support-reply', 's1').ok, true);
  assert.equal(sent[1].to, 's1@mail.com');
});
test('เหตุผลอยู่ในเมลไม่ผ่าน · ข้อความคำถามไม่ถูกส่งในเมล · โควตาหมด = ไม่ส่ง', () => {
  call('tok_t1', 'rejected', 's1_c1');
  assert.match(sent[0].body, /ยอดไม่ตรง/);
  call('tok_t1', 'reply', 's1_c1');
  assert.doesNotMatch(sent[1].body, /เหตุผล/);
  quota = 0;
  assert.equal(call('tok_t1', 'revoked', 's1_c1').error, 'quota');
});
