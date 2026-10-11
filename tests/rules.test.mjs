// ทดสอบ firestore.rules ของ kp-course ด้วย emulator — cd tests && npm install && npm run test:rules (ต้องมี Java)
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, limit, arrayRemove } from 'firebase/firestore';

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
