// ทดสอบ firestore.rules ของ kp-course ด้วย emulator — cd tests && npm install && npm run test:rules (ต้องมี Java)
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, limit, arrayRemove, writeBatch } from 'firebase/firestore';

const RULES = process.env.RULES_FILE;
let env;
const ADMIN = 'komanepapato@gmail.com', T1 = 'teach1@school.ac.th', T2 = 'teach2@school.ac.th', T_OFF = 'off@school.ac.th';

const as = (uid, email, verified = true) => env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const admin = () => as('admin', ADMIN);
const t1 = () => as('t1', T1);
const t2 = () => as('t2', T2);
const tOff = () => as('toff', T_OFF);
const t1Unverified = () => as('t1x', T1, false);
const stu = () => as('s1', 's1@mail.com', false);
const stu2 = () => as('s2', 's2@mail.com', false);
const guest = () => env.unauthenticatedContext().firestore();
const adminImpostor = () => as('fake', ADMIN, false);

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'kp-course-test', firestore: { rules: readFileSync(RULES, 'utf8'), host: '127.0.0.1', port: 8080 } });
});
after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'staff', T1), { email: T1, name: 'ครูหนึ่ง', active: true });
    await setDoc(doc(db, 'staff', T2), { email: T2, name: 'ครูสอง', active: true });
    await setDoc(doc(db, 'staff', T_OFF), { email: T_OFF, name: 'ครูพัก', active: false });
    await setDoc(doc(db, 'courses', 'c1'), { title: 'C1', owner: T1, published: true });
    await setDoc(doc(db, 'courses', 'c1draft'), { title: 'C1 draft', owner: T1, published: false });
    await setDoc(doc(db, 'courses', 'c2'), { title: 'C2', owner: T2, published: true });
    await setDoc(doc(db, 'courses', 'legacy'), { title: 'old', published: true }); // ไม่มี owner
    await setDoc(doc(db, 'courses/c1/lessons/free'), { title: 'free', free: true });
    await setDoc(doc(db, 'courses/c1/lessons/paid'), { title: 'paid', free: false });
    await setDoc(doc(db, 'courses/c1draft/lessons/free'), { title: 'free', free: true });
    await setDoc(doc(db, 'courses/c2/lessons/paid'), { title: 'paid', free: false });
    await setDoc(doc(db, 'courses/legacy/lessons/paid'), { title: 'paid', free: false });
    await setDoc(doc(db, 'students/s1'), { email: 's1@mail.com', name: 'S1', courses: [] });
    await setDoc(doc(db, 'students/s2'), { email: 's2@mail.com', name: 'S2', courses: ['legacy'] });
    await setDoc(doc(db, 'enrollments/s1_c1'), { uid: 's1', email: 's1@mail.com', name: 'S1', courseId: 'c1', owner: T1 });
    await setDoc(doc(db, 'enrollments/s2_c2'), { uid: 's2', email: 's2@mail.com', name: 'S2', courseId: 'c2', owner: T2 });
    await setDoc(doc(db, 'course_progress/s1_c1'), { uid: 's1', courseId: 'c1', owner: T1, done: [] });
    await setDoc(doc(db, 'course_progress/s2_c2'), { uid: 's2', courseId: 'c2', owner: T2, done: [] });
    await setDoc(doc(db, 'course_requests/s2_c1'), { uid: 's2', courseId: 'c1', owner: T1, note: '' });
  });
});

// ── ผู้เยี่ยมชม ──
test('guest: เห็นคอร์สเผยแพร่ + บทฟรี เท่านั้น', async () => {
  const db = guest();
  await assertSucceeds(getDocs(query(collection(db, 'courses'), where('published', '==', true))));
  await assertSucceeds(getDoc(doc(db, 'courses/c1/lessons/free')));
  await assertFails(getDoc(doc(db, 'courses/c1/lessons/paid')));
  await assertFails(getDoc(doc(db, 'courses/c1draft')));
  await assertFails(getDoc(doc(db, 'courses/c1draft/lessons/free'))); // บทฟรีของคอร์สร่าง
  await assertFails(getDocs(collection(db, 'courses')));
  await assertFails(getDocs(collection(db, 'enrollments')));
  await assertFails(getDocs(collection(db, 'staff')));
});

// ── นักเรียน ──
test('student: เรียนคอร์สที่ได้สิทธิ์ (enrollment) เท่านั้น', async () => {
  const db = stu();
  await assertSucceeds(getDoc(doc(db, 'courses/c1/lessons/paid')));
  await assertFails(getDoc(doc(db, 'courses/c2/lessons/paid')));
  await assertSucceeds(getDocs(query(collection(db, 'enrollments'), where('uid', '==', 's1'))));
  await assertFails(getDocs(query(collection(db, 'enrollments'), where('courseId', '==', 'c1'))));
  await assertFails(getDoc(doc(db, 'enrollments/s2_c2')));
});
test('student: ระบบเดิม students.courses ยังใช้ได้', async () => {
  await assertSucceeds(getDoc(doc(stu2(), 'courses/legacy/lessons/paid')));
  await assertFails(getDoc(doc(stu(), 'courses/legacy/lessons/paid')));
});
test('student: ให้สิทธิ์ตัวเองไม่ได้', async () => {
  const db = stu();
  await assertFails(setDoc(doc(db, 'enrollments/s1_c2'), { uid: 's1', email: 's1@mail.com', name: '', courseId: 'c2', owner: T2 }));
  await assertFails(updateDoc(doc(db, 'students/s1'), { courses: ['c2'] }));
  await assertSucceeds(updateDoc(doc(db, 'students/s1'), { name: 'ชื่อใหม่' }));
  await assertFails(setDoc(doc(db, 'staff', 's1@mail.com'), { email: 's1@mail.com', active: true }));
});
test('student: สมัครใหม่ สร้าง students ได้แค่ courses ว่าง', async () => {
  const db = as('s9', 's9@mail.com', false);
  await assertFails(setDoc(doc(db, 'students/s9'), { email: 's9@mail.com', name: '', courses: ['c1'] }));
  await assertSucceeds(setDoc(doc(db, 'students/s9'), { email: 's9@mail.com', name: '', courses: [] }));
  await assertFails(setDoc(doc(db, 'students/other'), { email: 's9@mail.com', name: '', courses: [] }));
});
test('student: บันทึกความคืบหน้า (ต้องมีสิทธิ์ + owner ถูก)', async () => {
  const db = stu();
  const base = { uid: 's1', email: 's1@mail.com', courseId: 'c1', done: ['paid'], total: 2 };
  await assertSucceeds(setDoc(doc(db, 'course_progress/s1_c1'), { ...base, owner: T1 }));
  await assertFails(setDoc(doc(db, 'course_progress/s1_c1'), { ...base, owner: T2 }));
  await assertFails(setDoc(doc(db, 'course_progress/s1_c2'), { ...base, courseId: 'c2', owner: T2 }));
  await assertFails(getDoc(doc(db, 'course_progress/s2_c2')));
});
test('student: ส่งคำขอ (owner ต้องตรงคอร์ส · คอร์สต้องเผยแพร่)', async () => {
  const db = stu();
  const r = { uid: 's1', email: 's1@mail.com', name: '', courseId: 'c2', note: 'hi' };
  await assertFails(setDoc(doc(db, 'course_requests/s1_c2'), { ...r, owner: T1 }));
  await assertSucceeds(setDoc(doc(db, 'course_requests/s1_c2'), { ...r, owner: T2 }));
  await assertFails(setDoc(doc(db, 'course_requests/s1_c1draft'), { ...r, courseId: 'c1draft', owner: T1 }));
  await assertFails(setDoc(doc(db, 'course_requests/s2_c2'), { ...r, uid: 's2', owner: T2 }));
  await assertSucceeds(deleteDoc(doc(db, 'course_requests/s1_c2')));
});

// ── ครู ──
test('teacher: เห็น/แก้เฉพาะคอร์สตัวเอง', async () => {
  const db = t1();
  await assertSucceeds(getDocs(query(collection(db, 'courses'), where('owner', '==', T1))));
  await assertSucceeds(getDoc(doc(db, 'courses/c1draft')));
  await assertSucceeds(updateDoc(doc(db, 'courses/c1'), { title: 'x' }));
  await assertFails(updateDoc(doc(db, 'courses/c2'), { title: 'x' }));
  await assertFails(updateDoc(doc(db, 'courses/legacy'), { title: 'x' }));
  await assertFails(updateDoc(doc(db, 'courses/c1'), { owner: T2 })); // โอนเองไม่ได้
  await assertSucceeds(setDoc(doc(db, 'courses/c1new'), { title: 'n', owner: T1, published: false }));
  await assertFails(setDoc(doc(db, 'courses/c1bad'), { title: 'n', owner: T2, published: false }));
  await assertSucceeds(setDoc(doc(db, 'courses/c1/lessons/x'), { title: 'x', free: false }));
  await assertFails(setDoc(doc(db, 'courses/c2/lessons/x'), { title: 'x', free: false }));
  await assertSucceeds(getDoc(doc(db, 'courses/c1/lessons/paid')));
  await assertFails(getDoc(doc(db, 'courses/c2/lessons/paid')));
  await assertFails(deleteDoc(doc(db, 'courses/c2')));
  await assertFails(getDocs(collection(db, 'courses'))); // ทั้งหมดไม่ได้ (มีร่างของคนอื่น)
});
test('teacher: อนุมัติ/ถอนสิทธิ์ได้เฉพาะคอร์สตัวเอง', async () => {
  const db = t1();
  const e = { uid: 's2', email: 's2@mail.com', name: 'S2', courseId: 'c1', owner: T1, by: T1 };
  await assertSucceeds(setDoc(doc(db, 'enrollments/s2_c1'), e));
  await assertFails(setDoc(doc(db, 'enrollments/s1_c2'), { ...e, uid: 's1', courseId: 'c2', owner: T2 }));
  await assertFails(setDoc(doc(db, 'enrollments/s1_c2'), { ...e, uid: 's1', courseId: 'c2', owner: T1 }));
  await assertFails(setDoc(doc(db, 'enrollments/wrongid'), e));
  await assertSucceeds(deleteDoc(doc(db, 'enrollments/s1_c1')));
  await assertFails(deleteDoc(doc(db, 'enrollments/s2_c2')));
  await assertSucceeds(deleteDoc(doc(db, 'course_requests/s2_c1')));
});
test('teacher: อ่านนักเรียน/ความคืบหน้า/คำขอ เฉพาะคอร์สตัวเอง', async () => {
  const db = t1();
  await assertSucceeds(getDocs(query(collection(db, 'enrollments'), where('owner', '==', T1))));
  await assertSucceeds(getDocs(query(collection(db, 'enrollments'), where('owner', '==', T1), where('courseId', '==', 'c1'))));
  await assertFails(getDocs(query(collection(db, 'enrollments'), where('courseId', '==', 'c2'))));
  await assertFails(getDocs(collection(db, 'enrollments')));
  await assertSucceeds(getDocs(query(collection(db, 'course_progress'), where('owner', '==', T1))));
  await assertFails(getDoc(doc(db, 'course_progress/s2_c2')));
  await assertSucceeds(getDocs(query(collection(db, 'course_requests'), where('owner', '==', T1))));
  await assertFails(getDocs(query(collection(db, 'course_requests'), where('owner', '==', T2))));
  // ค้นนักเรียนด้วยอีเมลทีละคน
  await assertSucceeds(getDocs(query(collection(db, 'students'), where('email', '==', 's2@mail.com'), limit(1))));
  await assertFails(getDocs(collection(db, 'students')));
  await assertFails(getDocs(collection(db, 'staff')));
  await assertSucceeds(getDoc(doc(db, 'staff', T1)));
  await assertFails(getDoc(doc(db, 'staff', T2)));
});
test('teacher ที่ถูกพัก / ยังไม่ยืนยันอีเมล = ไม่มีสิทธิ์ครู', async () => {
  await assertFails(updateDoc(doc(tOff(), 'courses/c1'), { title: 'x' }));
  await assertFails(setDoc(doc(tOff(), 'courses/n'), { title: 'n', owner: T_OFF }));
  await assertFails(updateDoc(doc(t1Unverified(), 'courses/c1'), { title: 'x' }));
  await assertFails(getDocs(query(collection(t1Unverified(), 'enrollments'), where('owner', '==', T1))));
});

// ── คอร์สมีราคา ──
test('ข้อมูลรับเงิน: ล็อกอินแล้วอ่านได้ · ผู้เยี่ยมชมอ่านไม่ได้ · เฉพาะเจ้าของคอร์สแก้ได้', async () => {
  await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'courses/c1/meta/pay'), { promptpay: '0812345678', name: 'ครูหนึ่ง' }); await setDoc(doc(ctx.firestore(), 'courses/c1draft/meta/pay'), { promptpay: '0812345678' }); });
  await assertFails(getDoc(doc(guest(), 'courses/c1/meta/pay')));
  await assertSucceeds(getDoc(doc(stu2(), 'courses/c1/meta/pay')));
  await assertFails(getDoc(doc(stu2(), 'courses/c1draft/meta/pay')));
  await assertSucceeds(getDoc(doc(t1(), 'courses/c1draft/meta/pay')));
  await assertFails(setDoc(doc(stu(), 'courses/c1/meta/pay'), { promptpay: '0899999999' }));
  await assertFails(setDoc(doc(t2(), 'courses/c1/meta/pay'), { promptpay: '0899999999' }));
  await assertSucceeds(setDoc(doc(t1(), 'courses/c1/meta/pay'), { promptpay: '0899999999', name: 'x' }));
});
test('แจ้งชำระเงิน: ส่ง amount + payRef ได้ · ยาวเกิน/ผิดชนิดไม่ได้ · ยังเปิดบทไม่ได้จนครูอนุมัติ', async () => {
  const db = stu2();
  const r = { uid: 's2', email: 's2@mail.com', name: '', courseId: 'c1', owner: T1, note: '' };
  await env.withSecurityRulesDisabled(async ctx => { await deleteDoc(doc(ctx.firestore(), 'course_requests/s2_c1')); });
  await assertFails(setDoc(doc(db, 'course_requests/s2_c1'), { ...r, amount: '500', payRef: 'x' }));
  await assertFails(setDoc(doc(db, 'course_requests/s2_c1'), { ...r, amount: 500, payRef: 'x'.repeat(101) }));
  await assertFails(setDoc(doc(db, 'course_requests/s2_c1'), { ...r, amount: 500, payRef: 'ok', paid: true }));
  await assertSucceeds(setDoc(doc(db, 'course_requests/s2_c1'), { ...r, amount: 500, payRef: '10:42 · 1234' }));
  await assertFails(getDoc(doc(db, 'courses/c1/lessons/paid')));
});

test('ช่องทางติดต่อ: ส่งกับคำขอได้ · ยาว/ผิดชนิดไม่ได้ · คนอื่นอ่านไม่ได้ · ครูคัดลอกลงสิทธิ์ได้', async () => {
  const s2 = stu2();
  const r = { uid: 's2', email: 's2@mail.com', name: '', courseId: 'c1', owner: T1, note: '' };
  await env.withSecurityRulesDisabled(async ctx => { await deleteDoc(doc(ctx.firestore(), 'course_requests/s2_c1')); });
  await assertFails(setDoc(doc(s2, 'course_requests/s2_c1'), { ...r, contact: 'x'.repeat(101) }));
  await assertFails(setDoc(doc(s2, 'course_requests/s2_c1'), { ...r, contact: 812345678 }));
  await assertSucceeds(setDoc(doc(s2, 'course_requests/s2_c1'), { ...r, contact: '081-234-5678' }));
  await assertSucceeds(getDoc(doc(t1(), 'course_requests/s2_c1')));
  await assertFails(getDoc(doc(t2(), 'course_requests/s2_c1')));
  await assertFails(getDoc(doc(stu(), 'course_requests/s2_c1')));
  const e = { uid: 's2', email: 's2@mail.com', name: '', courseId: 'c1', owner: T1, by: T1 };
  await assertFails(setDoc(doc(t1(), 'enrollments/s2_c1'), { ...e, contact: 'x'.repeat(101) }));
  await assertSucceeds(setDoc(doc(t1(), 'enrollments/s2_c1'), { ...e, contact: '081-234-5678' }));
  await assertFails(getDoc(doc(t2(), 'enrollments/s2_c1')));
});

test('เหตุผลที่ไม่อนุมัติ: ครูเจ้าของเขียนได้ · นักเรียนเจ้าของอ่าน/ลบได้ · คนอื่นไม่ได้', async () => {
  const r = { uid: 's2', courseId: 'c1', owner: T1, reason: 'ยอดไม่ตรง', by: T1 };
  await assertFails(setDoc(doc(stu2(), 'course_rejections/s2_c1'), r));           // นักเรียนเขียนเองไม่ได้
  await assertFails(setDoc(doc(t2(), 'course_rejections/s2_c1'), r));             // ครูคอร์สอื่น
  await assertFails(setDoc(doc(t1(), 'course_rejections/s2_c1'), { ...r, reason: 'x'.repeat(201) }));
  await assertFails(setDoc(doc(t1(), 'course_rejections/s2_c1'), { ...r, owner: T2 }));
  await assertFails(setDoc(doc(t1(), 'course_rejections/s9_c1'), r));             // id ไม่ตรง
  await assertSucceeds(setDoc(doc(t1(), 'course_rejections/s2_c1'), r));
  await assertSucceeds(getDoc(doc(stu2(), 'course_rejections/s2_c1')));
  await assertSucceeds(getDoc(doc(t1(), 'course_rejections/s2_c1')));
  await assertFails(getDoc(doc(stu(), 'course_rejections/s2_c1')));
  await assertFails(getDoc(doc(t2(), 'course_rejections/s2_c1')));
  await assertFails(getDoc(doc(guest(), 'course_rejections/s2_c1')));
  await assertFails(deleteDoc(doc(stu(), 'course_rejections/s2_c1')));
  await assertSucceeds(deleteDoc(doc(stu2(), 'course_rejections/s2_c1')));
});

test('รายชื่อที่ถอนสิทธิ์: ครูเจ้าของจัดการได้ · นักเรียนอ่านของตัวเองได้แต่แก้ไม่ได้ · ไม่ให้สิทธิ์เรียน · ครูลบความคืบหน้าของคอร์สตัวเองได้', async () => {
  const r = { uid: 's2', email: 's2@mail.com', name: 'S2', contact: '081', courseId: 'c1', owner: T1, reason: 'หมดเวลาเรียน', by: T1 };
  await assertFails(setDoc(doc(stu2(), 'course_revoked/s2_c1'), r));
  await assertFails(setDoc(doc(t2(), 'course_revoked/s2_c1'), r));
  await assertFails(setDoc(doc(t1(), 'course_revoked/s2_c1'), { ...r, reason: 'x'.repeat(201) }));
  await assertFails(setDoc(doc(t1(), 'course_revoked/s2_c1'), { ...r, owner: T2 }));
  await assertFails(setDoc(doc(t1(), 'course_revoked/s9_c1'), r));
  await assertSucceeds(setDoc(doc(t1(), 'course_revoked/s2_c1'), r));
  await assertSucceeds(getDoc(doc(stu2(), 'course_revoked/s2_c1')));
  await assertSucceeds(getDoc(doc(t1(), 'course_revoked/s2_c1')));
  await assertFails(getDoc(doc(t2(), 'course_revoked/s2_c1')));
  await assertFails(getDoc(doc(stu(), 'course_revoked/s2_c1')));
  await assertFails(deleteDoc(doc(stu2(), 'course_revoked/s2_c1')));
  await assertFails(getDoc(doc(stu2(), 'courses/c1/lessons/paid')));              // อยู่ในรายชื่อนี้ไม่ได้เปิดบทเรียน
  await assertFails(deleteDoc(doc(t2(), 'course_revoked/s2_c1')));
  await assertSucceeds(deleteDoc(doc(t1(), 'course_revoked/s2_c1')));
  // ความคืบหน้า: ครูเจ้าของลบได้ · ครูอื่น/นักเรียนลบไม่ได้
  await assertFails(deleteDoc(doc(t2(), 'course_progress/s1_c1')));
  await assertFails(deleteDoc(doc(stu(), 'course_progress/s1_c1')));
  await assertSucceeds(deleteDoc(doc(t1(), 'course_progress/s1_c1')));
});

test('โค้ดเชิญ: ใช้ได้ครั้งเดียวต่อบัญชี · ผูกอีเมลได้ · ใช้ซ้ำหลังถูกถอนไม่ได้ · ค้นรายการไม่ได้', async () => {
  const CODE = 'ABCDE23456', ZONE = 'ZZZZZ23456', MAIL = 'MAILX23456';
  const inv = { courseId: 'c1', owner: T1, email: '', usedBy: '', usedEmail: '', by: T1 };
  // ใครสร้างได้
  await assertFails(setDoc(doc(stu2(), 'course_invites', CODE), inv));
  await assertFails(setDoc(doc(t2(), 'course_invites', CODE), inv));
  await assertFails(setDoc(doc(t1(), 'course_invites', CODE), { ...inv, usedBy: 's2' }));
  await assertFails(setDoc(doc(t1(), 'course_invites', 'SHORT'), inv));
  await assertSucceeds(setDoc(doc(t1(), 'course_invites', CODE), inv));
  await assertSucceeds(setDoc(doc(t1(), 'course_invites', ZONE), { ...inv, courseId: 'c1' }));
  await assertSucceeds(setDoc(doc(t1(), 'course_invites', MAIL), { ...inv, email: 's1@mail.com' }));
  // อ่านได้เมื่อรู้โค้ด แต่ค้นรายการไม่ได้
  await assertSucceeds(getDoc(doc(stu2(), 'course_invites', CODE)));
  await assertFails(getDoc(doc(guest(), 'course_invites', CODE)));
  await assertFails(getDocs(collection(stu2(), 'course_invites')));
  await assertFails(getDocs(query(collection(stu2(), 'course_invites'), where('courseId', '==', 'c1'))));
  await assertFails(getDocs(query(collection(t2(), 'course_invites'), where('owner', '==', T1))));
  await assertSucceeds(getDocs(query(collection(t1(), 'course_invites'), where('owner', '==', T1))));
  const en = (uid, email, code, courseId = 'c1') => ({ uid, email, name: 'N', courseId, owner: courseId === 'c1' ? T1 : T2, by: 'invite', code });
  const redeem = (db, uid, email, code, courseId = 'c1') => {
    const b = writeBatch(db);
    b.set(doc(db, 'enrollments', uid + '_' + courseId), en(uid, email, code, courseId));
    b.update(doc(db, 'course_invites', code), { usedBy: uid, usedEmail: email });
    return b.commit();
  };
  await env.withSecurityRulesDisabled(async ctx => { await deleteDoc(doc(ctx.firestore(), 'enrollments/s1_c1')); });
  // สร้างสิทธิ์เองโดยไม่ผูกโค้ด / แก้โค้ดโดยไม่สร้างสิทธิ์ / คอร์สอื่น = ไม่ได้
  await assertFails(setDoc(doc(stu2(), 'enrollments/s2_c1'), en('s2', 's2@mail.com', CODE)));
  await assertFails(updateDoc(doc(stu2(), 'course_invites', CODE), { usedBy: 's2', usedEmail: 's2@mail.com' }));
  await assertFails(setDoc(doc(stu2(), 'enrollments/s2_c1'), { uid: 's2', email: 's2@mail.com', name: 'N', courseId: 'c1', owner: T1, by: T1 }));
  await assertFails(redeem(stu2(), 's2', 's2@mail.com', CODE, 'c2'));
  // โค้ดผูกอีเมลอื่น = ไม่ได้
  await assertFails(redeem(stu2(), 's2', 's2@mail.com', MAIL));
  // ใช้สำเร็จ แล้วเปิดบทเรียนได้
  await assertSucceeds(redeem(stu2(), 's2', 's2@mail.com', CODE));
  await assertSucceeds(getDoc(doc(stu2(), 'courses/c1/lessons/paid')));
  // คนอื่นใช้โค้ดเดิมไม่ได้
  await assertFails(redeem(stu(), 's1', 's1@mail.com', CODE));
  // โค้ดผูกอีเมลตรง = ได้
  await assertSucceeds(redeem(stu(), 's1', 's1@mail.com', MAIL));
  // ถูกถอนแล้วใช้โค้ดเดิมซ้ำไม่ได้
  await assertSucceeds(deleteDoc(doc(t1(), 'enrollments/s2_c1')));
  await assertFails(redeem(stu2(), 's2', 's2@mail.com', CODE));
  await assertFails(setDoc(doc(stu2(), 'enrollments/s2_c1'), en('s2', 's2@mail.com', CODE)));
  await assertFails(getDoc(doc(stu2(), 'courses/c1/lessons/paid')));
  // โค้ดใหม่ใช้ได้ + ลบรายการถอนสิทธิ์ของตัวเองได้เมื่อมีสิทธิ์แล้ว
  await assertSucceeds(setDoc(doc(t1(), 'course_revoked/s2_c1'), { uid: 's2', email: 's2@mail.com', name: '', courseId: 'c1', owner: T1, reason: '', by: T1 }));
  await assertFails(deleteDoc(doc(stu2(), 'course_revoked/s2_c1')));
  await assertSucceeds(redeem(stu2(), 's2', 's2@mail.com', ZONE));
  await assertSucceeds(deleteDoc(doc(stu2(), 'course_revoked/s2_c1')));
  // ลบโค้ด: เฉพาะครูเจ้าของ
  await assertFails(deleteDoc(doc(stu2(), 'course_invites', CODE)));
  await assertFails(deleteDoc(doc(t2(), 'course_invites', CODE)));
  await assertSucceeds(deleteDoc(doc(t1(), 'course_invites', CODE)));
});

test('ข้อความ: นักเรียนถามครูเจ้าของคอร์สได้ · คนอื่นอ่าน/ปลอมไม่ได้ · ครูตอบได้เฉพาะคอร์สตัวเอง', async () => {
  const th = { uid: 's2', email: 's2@mail.com', name: 'S2', courseId: 'c1', owner: T1, lastBy: 'student', lastText: 'สวัสดี', unreadTeacher: true, unreadStudent: false };
  const send = (db, thread, id, msg, merge = true) => {
    const b = writeBatch(db);
    if (thread) b.set(doc(db, 'course_threads/s2_c1'), thread, { merge });
    b.set(doc(db, 'course_threads/s2_c1/messages', id), msg);
    return b.commit();
  };
  const m = { from: 'student', by: 's2', text: 'สวัสดี' };
  await assertFails(send(guest(), th, 'g', m));
  await assertFails(send(stu2(), { ...th, owner: T2 }, 'a', m));
  await assertFails(send(stu2(), { ...th, email: 'x@mail.com' }, 'a', m));
  await assertFails(send(stu2(), th, 'a', { ...m, from: 'teacher' }));          // ปลอมเป็นครู
  await assertFails(send(stu2(), th, 'a', { ...m, by: 's1' }));
  await assertFails(send(stu2(), th, 'a', { ...m, text: 'x'.repeat(1001) }));
  await assertFails(send(stu2(), th, 'a', { ...m, text: '' }));
  await assertFails(send(stu2(), th, 'a', { ...m, extra: 1 }));
  await assertFails(send(stu(), { ...th, uid: 's1', email: 's1@mail.com' }, 'a', { ...m, by: 's1' }));   // ห้องของคนอื่น
  await assertSucceeds(send(stu2(), th, 'a', m));
  // คอร์สร่าง + ไม่มีสิทธิ์ = เริ่มถามไม่ได้
  const d = stu2(), bd = writeBatch(d);
  bd.set(doc(d, 'course_threads/s2_c1draft'), { ...th, courseId: 'c1draft' });
  await assertFails(bd.commit());
  // อ่าน
  await assertSucceeds(getDoc(doc(stu2(), 'course_threads/s2_c1')));
  await assertSucceeds(getDocs(collection(stu2(), 'course_threads/s2_c1/messages')));
  await assertSucceeds(getDoc(doc(t1(), 'course_threads/s2_c1')));
  await assertSucceeds(getDocs(collection(t1(), 'course_threads/s2_c1/messages')));
  await assertSucceeds(getDocs(collection(admin(), 'course_threads/s2_c1/messages')));
  await assertFails(getDoc(doc(t2(), 'course_threads/s2_c1')));
  await assertFails(getDocs(collection(t2(), 'course_threads/s2_c1/messages')));
  await assertFails(getDoc(doc(stu(), 'course_threads/s2_c1')));
  await assertFails(getDocs(collection(stu(), 'course_threads/s2_c1/messages')));
  await assertFails(getDocs(collection(stu(), 'course_threads')));
  await assertSucceeds(getDocs(query(collection(stu2(), 'course_threads'), where('uid', '==', 's2'))));
  await assertSucceeds(getDocs(query(collection(t1(), 'course_threads'), where('owner', '==', T1))));
  await assertFails(getDocs(query(collection(t2(), 'course_threads'), where('owner', '==', T1))));
  // ตอบ
  const up = { lastBy: 'teacher', lastText: 'ตอบ', unreadStudent: true, unreadTeacher: false };
  const rm = { from: 'teacher', by: 't1', text: 'ตอบ' };
  await assertFails(send(t2(), up, 'r', { ...rm, by: 't2' }));
  await assertSucceeds(send(t1(), up, 'r', rm));
  // แก้/ลบข้อความเดิม และย้ายห้องไม่ได้
  await assertFails(updateDoc(doc(stu2(), 'course_threads/s2_c1/messages/a'), { text: 'แก้' }));
  await assertFails(deleteDoc(doc(stu2(), 'course_threads/s2_c1/messages/a')));
  await assertFails(updateDoc(doc(stu2(), 'course_threads/s2_c1'), { owner: T2 }));
  await assertFails(updateDoc(doc(stu2(), 'course_threads/s2_c1'), { uid: 's1' }));
  await assertSucceeds(updateDoc(doc(stu2(), 'course_threads/s2_c1'), { unreadStudent: false }));
  await assertFails(deleteDoc(doc(stu2(), 'course_threads/s2_c1')));
  await assertSucceeds(deleteDoc(doc(t1(), 'course_threads/s2_c1/messages/a')));
  await assertSucceeds(deleteDoc(doc(t1(), 'course_threads/s2_c1')));
});

test('ติดต่อแอดมิน: เจ้าของกับแอดมินเท่านั้น · ครูไม่เห็น · ปลอมเป็นแอดมินไม่ได้', async () => {
  const th = { uid: 's2', email: 's2@mail.com', name: 'S2', lastBy: 'student', lastText: 'สอบถาม', unreadAdmin: true, unreadStudent: false };
  const send = (db, thread, id, msg) => { const b = writeBatch(db); if (thread) b.set(doc(db, 'support_threads/s2'), thread, { merge: true }); b.set(doc(db, 'support_threads/s2/messages', id), msg); return b.commit(); };
  const m = { from: 'student', by: 's2', text: 'สอบถาม' };
  await assertFails(send(guest(), th, 'a', m));
  await assertFails(send(stu(), { ...th, uid: 's1' }, 'a', { ...m, by: 's1' }));
  await assertFails(send(stu2(), th, 'a', { ...m, from: 'admin' }));
  await assertFails(send(stu2(), th, 'a', { ...m, text: 'x'.repeat(1001) }));
  await assertSucceeds(send(stu2(), th, 'a', m));
  await assertSucceeds(getDoc(doc(stu2(), 'support_threads/s2')));
  await assertSucceeds(getDocs(collection(stu2(), 'support_threads/s2/messages')));
  await assertSucceeds(getDocs(collection(admin(), 'support_threads')));
  await assertSucceeds(getDocs(collection(admin(), 'support_threads/s2/messages')));
  for (const db of [t1(), stu(), guest()]) {
    await assertFails(getDoc(doc(db, 'support_threads/s2')));
    await assertFails(getDocs(collection(db, 'support_threads/s2/messages')));
  }
  await assertFails(send(t1(), { lastBy: 'admin', lastText: 'x', unreadStudent: true, unreadAdmin: false }, 'r', { from: 'admin', by: 't1', text: 'x' }));
  await assertFails(updateDoc(doc(stu2(), 'support_threads/s2'), { email: 'x@mail.com' }));
  await assertFails(deleteDoc(doc(stu2(), 'support_threads/s2')));
  await assertSucceeds(send(as('admin', ADMIN), { lastBy: 'admin', lastText: 'ตอบ', unreadStudent: true, unreadAdmin: false }, 'r', { from: 'admin', by: 'admin', text: 'ตอบ' }));
});
test('ข้อความคอร์ส: แอดมินตอบติดป้ายแอดมินได้ · ครูปลอมเป็นแอดมินไม่ได้', async () => {
  const th = { uid: 's2', email: 's2@mail.com', name: 'S2', courseId: 'c1', owner: T1, lastBy: 'student', lastText: 'x', unreadTeacher: true, unreadStudent: false };
  await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'course_threads/s2_c1'), th); });
  await assertFails(setDoc(doc(t1(), 'course_threads/s2_c1/messages/a'), { from: 'admin', by: 't1', text: 'x' }));
  await assertSucceeds(setDoc(doc(admin(), 'course_threads/s2_c1/messages/b'), { from: 'admin', by: 'admin', text: 'x' }));
});

test('สลิป: เจ้าของ/ครูเจ้าของคอร์ส/แอดมินอ่านได้ · คนอื่นไม่ได้ · แก้หลังอนุมัติไม่ได้', async () => {
  const IMG = 'data:image/jpeg;base64,AAAA';
  const slip = { uid: 's2', courseId: 'c1', owner: T1, image: IMG };
  const s2 = stu2();
  // รูปแบบต้องถูก
  await assertFails(setDoc(doc(s2, 'course_slips/s2_c1'), { ...slip, image: 'data:text/html;base64,AAAA' }));
  await assertFails(setDoc(doc(s2, 'course_slips/s2_c1'), { ...slip, image: 'data:image/jpeg;base64,' + 'A'.repeat(500000) }));
  await assertFails(setDoc(doc(s2, 'course_slips/s2_c1'), { ...slip, owner: T2 }));
  await assertFails(setDoc(doc(s2, 'course_slips/s2_c1'), { ...slip, extra: 1 }));
  await assertFails(setDoc(doc(s2, 'course_slips/s1_c1'), slip));          // id คนอื่น
  await assertFails(setDoc(doc(guest(), 'course_slips/s2_c1'), slip));
  await assertSucceeds(setDoc(doc(s2, 'course_slips/s2_c1'), slip));
  // อ่าน
  await assertSucceeds(getDoc(doc(s2, 'course_slips/s2_c1')));
  await assertSucceeds(getDoc(doc(t1(), 'course_slips/s2_c1')));
  await assertSucceeds(getDoc(doc(admin(), 'course_slips/s2_c1')));
  await assertFails(getDoc(doc(t2(), 'course_slips/s2_c1')));
  await assertFails(getDoc(doc(stu(), 'course_slips/s2_c1')));
  await assertFails(getDoc(doc(guest(), 'course_slips/s2_c1')));
  await assertFails(getDocs(query(collection(t2(), 'course_slips'))));
  // ระหว่างรออนุมัติ แก้/ลบได้ (มีคำขอ s2_c1 จาก beforeEach)
  await assertSucceeds(setDoc(doc(s2, 'course_slips/s2_c1'), { ...slip, image: IMG + 'BB' }));
  // อนุมัติแล้ว (มีสิทธิ์ + คำขอถูกลบ): นักเรียนแก้/ลบไม่ได้
  await env.withSecurityRulesDisabled(async ctx => {
    await deleteDoc(doc(ctx.firestore(), 'course_requests/s2_c1'));
    await setDoc(doc(ctx.firestore(), 'enrollments/s2_c1'), { uid: 's2', courseId: 'c1', owner: T1 });
  });
  await assertFails(setDoc(doc(s2, 'course_slips/s2_c1'), { ...slip, image: IMG + 'CC' }));
  await assertFails(deleteDoc(doc(s2, 'course_slips/s2_c1')));
  await assertFails(deleteDoc(doc(t2(), 'course_slips/s2_c1')));
  await assertSucceeds(deleteDoc(doc(t1(), 'course_slips/s2_c1')));
});

// ── แอดมิน ──
test('admin: ทำได้ทุกอย่าง + จัดการครู', async () => {
  const db = admin();
  await assertSucceeds(getDocs(collection(db, 'courses')));
  await assertSucceeds(getDocs(collection(db, 'staff')));
  await assertSucceeds(setDoc(doc(db, 'staff', 'new@school.ac.th'), { email: 'new@school.ac.th', name: 'ใหม่', active: true }));
  await assertSucceeds(updateDoc(doc(db, 'courses/c1'), { owner: T2 }));
  await assertSucceeds(updateDoc(doc(db, 'courses/legacy'), { owner: ADMIN }));
  await assertSucceeds(setDoc(doc(db, 'enrollments/s1_c2'), { uid: 's1', email: 's1@mail.com', name: '', courseId: 'c2', owner: T2, by: ADMIN }));
  await assertFails(setDoc(doc(db, 'enrollments/s1_c1draft'), { uid: 's1', email: 's1@mail.com', name: '', courseId: 'c1draft', owner: T2, by: ADMIN })); // owner ไม่ตรง
  await assertSucceeds(updateDoc(doc(db, 'course_progress/s1_c1'), { owner: T2 }));
  await assertSucceeds(updateDoc(doc(db, 'students/s2'), { courses: arrayRemove('legacy') }));
  await assertSucceeds(getDocs(collection(db, 'students')));
  await assertSucceeds(getDoc(doc(db, 'courses/c2/lessons/paid')));
});
test('admin ปลอม (อีเมลเดียวกันแต่ไม่ยืนยัน) ไม่มีสิทธิ์', async () => {
  const db = adminImpostor();
  await assertFails(getDocs(collection(db, 'courses')));
  await assertFails(setDoc(doc(db, 'staff', 'x@x.com'), { email: 'x@x.com', active: true }));
  await assertFails(updateDoc(doc(db, 'courses/c1'), { title: 'x' }));
});
