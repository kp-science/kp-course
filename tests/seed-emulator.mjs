// ใส่ข้อมูลทดสอบลง emulator (demo-kp-course) — ข้อมูลแบบระบบเดิม เพื่อทดสอบการย้ายข้อมูลด้วย
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, writeBatch, collection } from 'firebase/firestore';

const PROJECT = 'demo-kp-course', AUTH = 'http://127.0.0.1:9099';
const PASS = 'emu-test-only-123';
async function signUp(email, name) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: PASS, displayName: name, returnSecureToken: true }) });
  const j = await r.json(); if (!j.localId) throw new Error(JSON.stringify(j)); return j.localId;
}
const s1 = await signUp('legacy.student@mail.com', 'นักเรียนระบบเดิม');
const s2 = await signUp('pending.student@mail.com', 'นักเรียนรออนุมัติ');

const src = readFileSync(process.argv[2] || "../prototype/courses.js", 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const C = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1))[0];

const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: '127.0.0.1', port: 8080 } });
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  const outline = [];
  // คอร์สเดิม (ไม่มี owner) — บท 1 ฟรี
  const b = writeBatch(db);
  C.lessons.forEach((l, i) => {
    const ref = doc(collection(db, 'courses/kp-mechanics-m4/lessons'));
    const free = i === 0;
    b.set(ref, { order: i + 1, unit: l.unit || '', title: l.title, video: i === 0 ? 'https://youtu.be/L8yIX0h0Qi0' : '', dur: '', body: l.body || '', file: '', quiz: '', free });
    outline.push({ id: ref.id, unit: l.unit || '', title: l.title, dur: '', free, video: i === 0 });
  });
  await b.commit();
  await setDoc(doc(db, 'courses/kp-mechanics-m4'), { title: C.title, subject: C.subject, level: C.level, author: C.author, summary: C.summary, body: C.body, cover: '', order: 0, published: true, outline, lessonCount: outline.length });
  await setDoc(doc(db, 'students', s1), { email: 'legacy.student@mail.com', name: 'นักเรียนระบบเดิม', courses: ['kp-mechanics-m4'] });
  await setDoc(doc(db, 'course_progress', s1 + '_kp-mechanics-m4'), { uid: s1, email: 'legacy.student@mail.com', courseId: 'kp-mechanics-m4', done: [outline[0].id], total: 4, last: outline[1].id });

  // ครู + คอร์สของครู (เผยแพร่) + คำขอรออนุมัติ
  await setDoc(doc(db, 'staff', 'teach1@school.ac.th'), { email: 'teach1@school.ac.th', name: 'ครูสมศรี', active: true });
  const tl = [{ t: 'ประจุและแรงไฟฟ้า', free: true }, { t: 'สนามไฟฟ้า', free: false }, { t: 'ศักย์ไฟฟ้า', free: false }];
  const tout = [];
  for (const [i, l] of tl.entries()) {
    const ref = doc(collection(db, 'courses/elec-m5/lessons'));
    await setDoc(ref, { order: i + 1, unit: '01 ไฟฟ้าสถิต', title: l.t, video: '', dur: '10:00', body: '## ' + l.t + '\nเนื้อหาทดสอบ $F = k\\frac{q_1 q_2}{r^2}$', file: '', quiz: '', free: l.free });
    tout.push({ id: ref.id, unit: '01 ไฟฟ้าสถิต', title: l.t, dur: '10:00', free: l.free, video: false });
  }
  await setDoc(doc(db, 'courses/elec-m5'), { title: 'ฟิสิกส์ ม.5 ไฟฟ้าสถิต', subject: 'ฟิสิกส์', level: 'ม.5', author: 'ครูสมศรี', summary: 'ประจุ สนาม และศักย์ไฟฟ้า', body: '', cover: '', order: 1, published: true, owner: 'teach1@school.ac.th', outline: tout, lessonCount: 3 });
  await setDoc(doc(db, 'students', s2), { email: 'pending.student@mail.com', name: 'นักเรียนรออนุมัติ', courses: [] });
  await setDoc(doc(db, 'course_requests', s2 + '_elec-m5'), { uid: s2, email: 'pending.student@mail.com', name: 'นักเรียนรออนุมัติ', courseId: 'elec-m5', owner: 'teach1@school.ac.th', note: 'ม.5/3 เลขที่ 12' });
});
await env.cleanup();
console.log('seeded', { s1, s2 });
