# คำสั่งประจำโปรเจกต์ — KP Course (เว็บคอร์สออนไลน์)

เว็บ: https://kp-science.github.io/kp-course/ · repo: https://github.com/kp-science/kp-course (public · GitHub Pages จาก `main`)
**แยกจากเว็บ simulation** (`~/Documents/GitHub/physics-simulations`) ทั้งตัวเว็บและฐานข้อมูล — ไม่ใช้ `kp-auth.js` และไม่ใช้ Firebase `kp-science-f11ff`

## ⚡ เริ่ม session ใหม่
1. อ่าน `SESSION_LOG.md` (entry ล่าสุดอยู่ท้ายไฟล์) แล้วสรุปสถานะให้ผู้ใช้ 2–3 บรรทัด
2. รายละเอียดการตั้งค่า Firebase / ขั้นตอนที่ครูต้องทำ อยู่ใน `README.md`

## ⚡ จบงาน
ต่อท้าย `SESSION_LOG.md` (ห้ามลบของเก่า): วันที่ · ทำอะไร · ไฟล์ที่แก้ · ค้างอะไร · หมายเหตุ

## 📂 โครงสร้าง
- `index.html` หน้าเรียน (`#/` หน้าแรกตามบทบาท · `#/courses` · `#/c/<รหัสคอร์ส>/<บท>`) · `admin.html` ห้องครู (`#/` ภาพรวม · `#/requests` · `#/teachers` · `#/new` · `#/c/<รหัส>/<แท็บ>`)
- `course-core.js` โมดูลกลาง (parser เนื้อหา + Firebase + ล็อกอิน + บทบาท) · `course-ui.css` สไตล์กลาง (สีประจำบทบาทผ่าน `<body data-role>`)
- `firebase-config.js` ค่า firebaseConfig (โปรเจกต์ `kp-course`) · `firestore.rules` — Publish ใน Console (เครื่องนี้ไม่มี firebase CLI ใน PATH)
- `prototype/` ต้นแบบเดิม + `courses.js` สำหรับนำเข้า — **อยู่ใน .gitignore ไม่ขึ้นเว็บ**
- `tests/` ทดสอบ rules ด้วย Firebase Emulator: `cd tests && npm install && npm run test:rules` (ต้องมี Java: `export PATH=/opt/homebrew/opt/openjdk/bin:$PATH`) · **แก้ rules ทุกครั้งต้องรันให้ผ่านก่อนให้ครู Publish**
- ทดสอบหน้าเว็บกับ emulator (ไม่แตะข้อมูลจริง): `npm run emu` + `npm run seed` แล้วเปิด `http://localhost:8765/index.html?emu` — ล็อกอิน Google ปลอมใน console: `KPC.auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(JSON.stringify({sub:'x',email:'…',email_verified:true})))`

## 👥 บทบาท (rules และ `KPC.role` ตรวจแบบเดียวกัน)
- **แอดมิน** = Google ของ komanepapato@gmail.com (email_verified) — ทุกอย่าง + จัดการครู (`staff/`) + โอนคอร์ส (`A.reassign`)
- **ครู** = มี `staff/{อีเมลตัวเล็ก}` ที่ `active: true` + ล็อกอิน Google — จัดการเฉพาะคอร์สที่ `owner` = อีเมลตัวเอง
- **นักเรียน** = ล็อกอินแล้ว — เรียนคอร์สที่มี `enrollments/{uid}_{cid}` · **ผู้เยี่ยมชม** = เห็นคอร์สที่เผยแพร่ + บทฟรี
- Firestore: `staff/{email}` · `students/{uid}` (`courses[]` = ระบบเดิม rules ยังรองรับ แต่ไม่เขียนใหม่) · `courses/{cid}` (+ `outline`, `owner`) · `courses/{cid}/lessons/{lid}` · `enrollments/{uid}_{cid}` · `course_progress/{uid}_{cid}` · `course_requests/{uid}_{cid}`
- enrollments / progress / requests **เก็บ `owner` ของคอร์ส** — ครูค้นด้วย `where('owner','==',อีเมล)` เท่านั้น (rules ไม่ใช่ filter) · โอนคอร์สต้องย้าย owner ตามทุกเอกสาร
- **คอร์สมีราคา** (แบบโอนแล้วครูอนุมัติ): `courses.price` (บาท, 0 = ฟรี) · ข้อมูลรับเงิน `courses/{cid}/meta/pay` {promptpay, name, note} อ่านได้เฉพาะคนล็อกอิน · นักเรียนสแกน QR พร้อมเพย์ (`KPC.promptpay` สร้าง payload EMVCo ใส่ยอด — ตรวจเทียบไลบรารี promptpay-qr แล้ว) → แจ้งโอนเป็น `course_requests` + `amount`, `payRef` → ครูเช็กยอดแล้วอนุมัติ · **ไม่มีการยืนยันการจ่ายอัตโนมัติ** (ถ้าจะทำต้องใช้ Cloud Functions + payment gateway + Blaze · ห้ามใส่ secret key ใน repo) · QR ใช้ qrcode-generator 1.4.4 จาก cdnjs
- แอดมินเปิดห้องครูครั้งแรก → `A.migrate()` ย้ายข้อมูลระบบเดิมอัตโนมัติ (ปุ่ม “ตรวจและซ่อมข้อมูล” ในหน้าจัดการครู)

## ⚠️ กติกา
- **Firebase แผนฟรี (Spark)** — ครูเลือกเมื่อ 11 ต.ค. 69 · ไม่มี Cloud Functions / Cloud Storage / backup อัตโนมัติ → อย่าออกแบบฟีเจอร์ที่ต้องใช้สิ่งเหล่านี้ (อัปโหลดไฟล์, จ่ายเงินอัตโนมัติ, แจ้งเตือน) โดยไม่ถามครูก่อน · ถ้าจะเปลี่ยนเป็น Blaze ให้ตั้ง budget alert ทันที
- **ห้ามใส่เนื้อหาบท (คลิป/เอกสาร/แบบทดสอบ) ในไฟล์ใน repo** — repo เป็น public · เนื้อหาอยู่ใน Firestore เท่านั้น
- แก้ `course-core.js` · `course-ui.css` · `firebase-config.js` → เพิ่มเลข `?v=` ในแท็ก `<script>` ของ `index.html` + `admin.html` (cache busting)
- ทุกหน้า HTML มี Google Analytics `G-2YTJBNHP6D` ต่อจาก `<head>` และ frame protection
- Design (11 ต.ค. 69 ครูขอ **สไตล์เว็บ Apple เต็มรูปแบบ** ทั้งหน้าเรียนและห้องครู — แทนแนวสมุดจดเดิม): พื้น `#f5f5f7` + การ์ดขาวมุมโค้ง 18–24px ไม่มีขอบ · ตัวหนังสือ `#1d1d1f` / `#6e6e73` · ปุ่มแคปซูล `#0071e3` · ลิงก์ `#0066cc` · หัวข้อเล็กสีส้ม `#bf4800` (`.hand` = eyebrow) · แถบเมนูโปร่งแสง blur · ฟอนต์ระบบ (`-apple-system`… → `IBM Plex Sans Thai` สำรอง) · **ห้าม letter-spacing ติดลบ** (สระ/วรรณยุกต์ไทยเบียด) · หัวข้อใหญ่ line-height ≥ 1.3 · ห้ามใช้ Sarabun · ไอคอนเป็นเส้น ไม่ใช้อีโมจิในเมนู · หน้าเรียนต้องคลีน (ไม่มีภาพปก/คำแนะนำคอร์ส — อยู่ในปุ่มข้อมูลคอร์ส) · หน้าแรกผู้เยี่ยมชม + แดชบอร์ดนักเรียน + **หน้าเรียน (`body.lesson-dark` — ตั้งใน `setNav(k, true)`)** = **แบบเว็บ satriwit-science** (มืด·ภาพยนตร์): hero ดำ + orb เรือง + หัวข้อไล่สี `.grad` + ticker · ประโยคปักหมุดคำสว่างตามการเลื่อน (`#cineStmt`) · โชว์คอร์สปักหมุด (`#cineShow`) · `cineScroll()` คุมทั้งหมด + แถบเมนู `.dark` บนส่วน `.cine-dark` · **ห้ามใส่ overflow-x ที่ body** (html มี clip แล้ว — ใส่ซ้ำ sticky พัง) · โมชัน: `KPC.motion()` (เลื่อนแล้วลอยขึ้น) + `KPC.pageIn()` — วาดหน้าใหม่ด้วย innerHTML แล้วต้องเรียกซ้ำ · หน้าเรียนใช้แค่ pageIn · สีบทบาท: แอดมิน `#bf4800` · ครู `#8944ab` · นักเรียน `#0071e3` · มือถือ 375 px ต้องไม่มี scroll แนวนอน
- ซิมูเลชันฝังจาก `kp-science.github.io/physics-simulations/Demo/…` ได้ · ลิงก์ Virtual Lab (มี frame-busting) แสดงเป็นปุ่มเปิดแท็บใหม่ (`KPC.noEmbed`)
- ทดสอบในเครื่อง: `python3 -m http.server 8765 --directory <โฟลเดอร์นี้>` (รันจาก /tmp — preview_start ของแอปอ่าน Documents ไม่ได้)
