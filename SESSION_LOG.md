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
