# SESSION LOG — KP Course

## [2026-10-10] — [เครื่อง: ไม่ระบุ] — สร้างเว็บคอร์สออนไลน์ (แยกจากเว็บ simulation)

### ทำอะไรไปบ้าง
- ทำระบบคอร์สตามแผนใน README: หน้าเรียน `index.html` · หน้าครู `admin.html` · `course-core.js` · `firestore.rules`
- รอบแรกทำไว้ใน physics-simulations (ใช้ Firebase kp-science-f11ff ร่วมกัน) → ครูเลือกแยกทั้งฐานข้อมูลและเว็บ → ย้ายมาโฟลเดอร์นี้ และคืนค่า physics-simulations เป็นเหมือนเดิมแล้ว
- ล็อกอินของตัวเอง (Google + อีเมล/รหัสผ่าน + ลืมรหัสผ่าน · สมัครพร้อมชื่อ) · นักเรียนขอสิทธิ์ → ครูอนุมัติ / ให้สิทธิ์ด้วยอีเมล · ความคืบหน้า + CSV · นำเข้า courses.js
- rules: นักเรียนสร้าง `students/{uid}` ได้แค่ courses ว่าง แก้ได้แค่ชื่อ · ครูต้อง email_verified
- ทดสอบด้วยข้อมูลจำลองครบทุกขั้นทั้งสองหน้า · ยังไม่ใส่ config → ขึ้นข้อความให้ตั้งค่า ไม่มี error
- สร้าง repo `kp-science/kp-course` (public) + GitHub Pages → https://kp-science.github.io/kp-course/ (ตรวจแล้วโหลดได้)
- ต้นแบบเดิมย้ายไป `prototype/` (อยู่ใน .gitignore)

### ไฟล์ที่แก้
- ใหม่ทั้งหมด: `index.html` · `admin.html` · `course-core.js` · `firebase-config.js` (ค่าว่าง) · `firestore.rules` · `firebase.json` · `.gitignore` · `CLAUDE.md` · `SESSION_LOG.md`
- `README.md` — ต่อท้ายส่วน “อัปเดต 10 ต.ค. — แยกฐานข้อมูล + แยกเว็บ” พร้อมขั้นตอนตั้งค่า

### ค้างไว้ที่ไหน / ต้องทำต่อ
1. ครูสร้าง Firebase โปรเจกต์ใหม่ → เปิด Firestore + Auth (Google, Email/Password) → Authorized domains เพิ่ม `kp-science.github.io`
2. ใส่ firebaseConfig ใน `firebase-config.js` (เพิ่ม `?v=` ใน index/admin) → commit + push
3. deploy `firestore.rules`
4. หน้าครู → นำเข้า `prototype/courses.js` → ใส่คลิป → เผยแพร่ → ทดสอบกับบัญชีนักเรียนจริง (ยังไม่เคยทดสอบกับ Firestore จริง)

### หมายเหตุ
- ยังไม่มีลิงก์จากเว็บ KP Science / เว็บโรงเรียน มาที่เว็บคอร์ส

## [2026-10-10] — [เครื่อง: ไม่ระบุ] — เชื่อม Firebase `kp-course` + ทดสอบกับ Firestore จริงครบทุกขั้น

### ทำอะไรไปบ้าง
- ครูสร้าง Firebase โปรเจกต์ `kp-course` (Spark plan ฟรี · ปิด Analytics) — Firestore Standard · `(default)` · **asia-southeast3 (Bangkok)** · production mode · ไม่มี scheduled backup (ต้อง Blaze)
- วาง `firestore.rules` ผ่าน Console (ไม่ใช้ CLI — เครื่องนี้ไม่มี `firebase`)
- Authentication: Google + Email/Password (Email/Password ตกหล่นรอบแรก → เว็บขึ้น `auth/operation-not-allowed` → เปิดเพิ่มแล้ว) · Authorized domains เพิ่ม `kp-science.github.io`
- ใส่ config ใน `firebase-config.js` · bump `?v=2` · push (0196855) · GitHub Pages อัปเดตแล้ว
- หน้าครู: นำเข้า `prototype/courses.js` → คอร์ส `kp-mechanics-m4` (4 บท) · บท 1 ใส่คลิป + ทดลองเรียนฟรี · เผยแพร่แล้ว
- ทดสอบจริง: คนไม่ล็อกอินเปิดได้แค่บท 1 (บท 2–4 DENIED) · นักเรียนทดสอบ `komane@satriwit.ac.th` สมัครอีเมล/รหัสผ่าน → ขอสิทธิ์ → ครูอนุมัติ → เปิดบทได้ · ติ๊กเรียนแล้ว → ครูเห็นความคืบหน้า + CSV

### ไฟล์ที่แก้
- `firebase-config.js` (ค่า kp-course) · `index.html` + `admin.html` (`firebase-config.js?v=2`) · `SESSION_LOG.md`

### ค้างไว้ที่ไหน / ต้องทำต่อ
- ใส่คลิป/ความยาวคลิปบท 2–4
- บัญชีทดสอบ `komane@satriwit.ac.th` ยังมีสิทธิ์คอร์สอยู่ — ถอนสิทธิ์/ลบในหน้าครูถ้าไม่ใช้
- ยังไม่มีลิงก์จากเว็บ KP Science / เว็บโรงเรียน มาที่เว็บคอร์ส

### หมายเหตุ
- Console: ถ้าเผลอกดไอคอน `>_` แถบขวา Cloud Shell จะบังเนื้อหา (ขึ้น "could not be loaded") → กด `>_` อีกครั้ง หรือเปิด URL หน้าที่ต้องการตรงๆ
- `pbcopy` ภาษาไทยต้องใช้ `LANG=en_US.UTF-8 pbcopy` ไม่งั้นตัวอักษรเพี้ยน

## [2026-10-11] — [เครื่อง: ไม่ระบุ] — 4 บทบาท (แอดมิน/ครู/นักเรียน/ผู้เยี่ยมชม) + UI ใหม่

### ทำอะไรไปบ้าง
- ครูเลือก: ครูดูแลเฉพาะคอร์สตัวเอง · ธีมมืดเดิมแต่ปรับให้ดีขึ้น · หน้าแรกผู้เยี่ยมชมเน้นแนะนำคอร์ส + ลองบทฟรี
- Firestore ใหม่: `staff/{email}` (ครู) · `courses.owner` · `enrollments/{uid}_{cid}` แทน `students.courses` · progress/requests/enrollments เก็บ `owner`
- `firestore.rules` เขียนใหม่ — ทดสอบด้วย Firebase Emulator 13 ชุด ผ่านทั้งหมด (`tests/rules.test.mjs`)
- `course-core.js`: `KPC.role` · `ownsCourse` · `canCourse(cid, c)` · `saveProgress(c, …)` / `requestAccess(c, …)` รับเอกสารคอร์ส · admin API ใหม่ (staff, reassign, migrate) · โหมด emulator (`?emu` บน localhost)
- `course-ui.css` ใหม่ (สไตล์กลาง + สีประจำบทบาท) · `index.html` เขียนใหม่ (หน้าแรกผู้เยี่ยมชม / แดชบอร์ดนักเรียน “เรียนต่อ” / แถบครู · เมนูผู้ใช้ · ปุ่มเรียนแล้ว · ยกเลิกคำขอ) · `admin.html` → “ห้องครู” (ภาพรวม · คำขอ · จัดการครู · โอนคอร์ส · ย้ายข้อมูลอัตโนมัติ)
- ทดสอบ end-to-end กับ emulator ครบ 4 บทบาท + ย้ายข้อมูลระบบเดิม + โอนคอร์ส · จอ 1280 และ 375 px ไม่มี scroll แนวนอน
- ติดตั้ง openjdk (Homebrew) สำหรับ emulator

### ไฟล์ที่แก้
- `firestore.rules` · `course-core.js` · `index.html` · `admin.html` · `course-ui.css` (ใหม่) · `firebase.json` (+emulators) · `tests/` (ใหม่) · `.gitignore` · `CLAUDE.md`

### ค้างไว้ที่ไหน / ต้องทำต่อ
- **ลำดับขึ้นเว็บ (สำคัญ)**: 1) ครู Publish `firestore.rules` ใหม่ใน Console → 2) push โค้ด → 3) แอดมินเปิดห้องครู 1 ครั้ง (ย้ายข้อมูลอัตโนมัติ)
  - โค้ดใหม่ + rules เก่า = นักเรียนบันทึกความคืบหน้า/ขอสิทธิ์ไม่ได้ · rules ใหม่ + โค้ดเก่า ใช้ได้ชั่วคราว
- ยังไม่ได้ทดสอบกับ Firestore จริงหลังขึ้นเว็บ

## [2026-10-11] — [เครื่อง: ไม่ระบุ] — ดีไซน์ใหม่: โทนสว่าง “สมุดจดของครู” + องค์ประกอบสร้างแรงจูงใจ

### ทำอะไรไปบ้าง
- ครูขอ: หน้าเว็บน่าเรียนขึ้น · โทนสว่าง · ไม่ดูแข็งแบบงาน AI → เปลี่ยนทั้งระบบเป็นพื้นกระดาษ หมึกน้ำเงิน ปากกาเน้นสีเหลือง ลายมือ Itim
- `course-ui.css` เขียนใหม่ (โทนสว่าง ใช้ร่วมกับห้องครู) · `index.html` เขียนใหม่:
  - หน้าแรกผู้เยี่ยมชม: ซิมจิ๋ว “ทายก่อน” เตะบอลมุม 30/45/60° (v=20 m/s) → เฉลย + ปมสงสัย “30° กับ 60° ตกจุดเดียวกัน ทำไม?” ลิงก์ไปบทโพรเจกไทล์ · ลองมุมอื่นด้วยสไลเดอร์ · วิธีเรียน 3 ขั้น (ไอคอนเส้น) · เริ่มเรียน 3 ขั้น
  - ปกคอร์สวาดเอง (`coverArt`): ฟิสิกส์ = โพรเจกไทล์ / ไฟฟ้า = ประจุ+เส้นสนาม / คลื่น = sine · ดาราศาสตร์/เคมี/ชีวะ มีแบบของตัวเอง
  - แดชบอร์ดนักเรียน: การ์ดเรียนต่อ (บทถัดไปที่ยังไม่ได้ติ๊ก `nextIndex`) + วงแหวน % · ข้อความให้กำลังใจตาม % · ป้ายลายมือ 25/50/75/100%
  - หน้าบท: หัวคอร์สมีวงแหวน · ปุ่ม “ติ๊กว่าเรียนบทนี้แล้ว” + confetti (ครบคอร์ส = ใหญ่ขึ้น) · การ์ด “บทต่อไป” · เปิดคอร์สโดยไม่ระบุบท → ไปบทที่ควรเรียนต่อ
- `admin.html`: ปรับเข้ากับโทนสว่าง · ตัวจำการย้ายข้อมูลผูกกับ projectId (`kpc-migrated-v2:<projectId>`) — เดิมจำข้ามโปรเจกต์ทำให้ไม่ย้าย
- ทดสอบกับ emulator: ผู้เยี่ยมชม (quiz + ปก) · นักเรียน (เรียนต่อ, ติ๊ก, confetti, วงแหวน) · แอดมิน (ย้ายข้อมูล, สถิติ) · 1280 / 375 px ไม่มี scroll แนวนอน

### ไฟล์ที่แก้
- `course-ui.css` · `index.html` · `admin.html` · `CLAUDE.md` (กติกาดีไซน์ใหม่)

### ค้างไว้ที่ไหน / ต้องทำต่อ
- แอดมินยังไม่ได้เปิดห้องครูบนเว็บจริง (ย้ายข้อมูลระบบเดิม) — ทำตอนเปิดครั้งแรก
