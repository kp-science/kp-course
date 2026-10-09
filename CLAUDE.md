# คำสั่งประจำโปรเจกต์ — KP Course (เว็บคอร์สออนไลน์)

เว็บ: https://kp-science.github.io/kp-course/ · repo: https://github.com/kp-science/kp-course (public · GitHub Pages จาก `main`)
**แยกจากเว็บ simulation** (`~/Documents/GitHub/physics-simulations`) ทั้งตัวเว็บและฐานข้อมูล — ไม่ใช้ `kp-auth.js` และไม่ใช้ Firebase `kp-science-f11ff`

## ⚡ เริ่ม session ใหม่
1. อ่าน `SESSION_LOG.md` (entry ล่าสุดอยู่ท้ายไฟล์) แล้วสรุปสถานะให้ผู้ใช้ 2–3 บรรทัด
2. รายละเอียดการตั้งค่า Firebase / ขั้นตอนที่ครูต้องทำ อยู่ใน `README.md`

## ⚡ จบงาน
ต่อท้าย `SESSION_LOG.md` (ห้ามลบของเก่า): วันที่ · ทำอะไร · ไฟล์ที่แก้ · ค้างอะไร · หมายเหตุ

## 📂 โครงสร้าง
- `index.html` หน้าเรียน (`#/` · `#/c/<รหัสคอร์ส>/<บท>`) · `admin.html` หน้าครู · `course-core.js` โมดูลกลาง (parser เนื้อหา + Firebase + ล็อกอิน)
- `firebase-config.js` ค่า firebaseConfig ของโปรเจกต์คอร์ส · `firestore.rules` + `firebase.json` (deploy: `firebase deploy --only firestore:rules --project <id>`)
- `prototype/` ต้นแบบเดิม + `courses.js` สำหรับนำเข้า — **อยู่ใน .gitignore ไม่ขึ้นเว็บ**
- Firestore: `students/{uid}` (courses[] ครูเติม) · `courses/{cid}` (+ `outline`) · `courses/{cid}/lessons/{lid}` · `course_progress/{uid}_{cid}` · `course_requests/{uid}_{cid}`
- ครู = Google ของ komanepapato@gmail.com (email_verified) — rules และ `KPC.isTeacher()` ตรวจแบบเดียวกัน

## ⚠️ กติกา
- **ห้ามใส่เนื้อหาบท (คลิป/เอกสาร/แบบทดสอบ) ในไฟล์ใน repo** — repo เป็น public · เนื้อหาอยู่ใน Firestore เท่านั้น
- แก้ `course-core.js` หรือ `firebase-config.js` → เพิ่มเลข `?v=` ในแท็ก `<script>` ของ `index.html` + `admin.html` (cache busting)
- ทุกหน้า HTML มี Google Analytics `G-2YTJBNHP6D` ต่อจาก `<head>` และ frame protection
- Design: ธีมมืด bg `#06090f` · accent `#38bdf8` · ฟอนต์ IBM Plex Sans Thai Looped (เนื้อหา) / IBM Plex Sans Thai (หัวเรื่อง) / Share Tech Mono (ตัวเลข) · ห้ามใช้ Sarabun · มือถือ 375 px ต้องไม่มี scroll แนวนอน
- ซิมูเลชันฝังจาก `kp-science.github.io/physics-simulations/Demo/…` ได้ · ลิงก์ Virtual Lab (มี frame-busting) แสดงเป็นปุ่มเปิดแท็บใหม่ (`KPC.noEmbed`)
- ทดสอบในเครื่อง: `python3 -m http.server 8765 --directory <โฟลเดอร์นี้>` (รันจาก /tmp — preview_start ของแอปอ่าน Documents ไม่ได้)
