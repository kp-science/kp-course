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
- แอดมินเปิดห้องครูครั้งแรก → `A.migrate()` ย้ายข้อมูลระบบเดิมอัตโนมัติ (ปุ่ม “ตรวจและซ่อมข้อมูล” ในหน้าจัดการครู)

## ⚠️ กติกา
- **ห้ามใส่เนื้อหาบท (คลิป/เอกสาร/แบบทดสอบ) ในไฟล์ใน repo** — repo เป็น public · เนื้อหาอยู่ใน Firestore เท่านั้น
- แก้ `course-core.js` · `course-ui.css` · `firebase-config.js` → เพิ่มเลข `?v=` ในแท็ก `<script>` ของ `index.html` + `admin.html` (cache busting)
- ทุกหน้า HTML มี Google Analytics `G-2YTJBNHP6D` ต่อจาก `<head>` และ frame protection
- Design (11 ต.ค. 69 ครูขอ: **โทนสว่าง** + **ไม่ดูแข็งแบบงาน AI**): แนว “สมุดจดของครู” — พื้นกระดาษ `#faf7f1` · หมึกน้ำเงิน `#2456c9` · ส้ม `#e8693a` · ปากกาเน้น `#ffe270` (`.mark`) · ลายกระดาษกราฟ (`.paper`) · โน้ตลายมือฟอนต์ **Itim** (`.hand`) · ปกคอร์สวาดเส้นด้วย SVG (`coverArt`) · สติกเกอร์เอียงแทนป้ายเม็ดยา · **ห้าม**: ตัวหนังสือไล่สี, แสงเรือง, ธีมมืด, อีโมจิเป็นไอคอนหลัก · ฟอนต์ IBM Plex Sans Thai Looped (เนื้อหา) / IBM Plex Sans Thai (หัวเรื่อง) / Share Tech Mono (ตัวเลข) · ห้ามใช้ Sarabun · สีบทบาท: แอดมิน `#b7791f` · ครู `#7046d8` · นักเรียน `#2456c9` · มือถือ 375 px ต้องไม่มี scroll แนวนอน
- ซิมูเลชันฝังจาก `kp-science.github.io/physics-simulations/Demo/…` ได้ · ลิงก์ Virtual Lab (มี frame-busting) แสดงเป็นปุ่มเปิดแท็บใหม่ (`KPC.noEmbed`)
- ทดสอบในเครื่อง: `python3 -m http.server 8765 --directory <โฟลเดอร์นี้>` (รันจาก /tmp — preview_start ของแอปอ่าน Documents ไม่ได้)
