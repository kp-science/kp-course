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
