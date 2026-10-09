# คอร์สออนไลน์ (ระบบติว) — แยกออกจากเว็บกลุ่มสาระ 10 ต.ค. 2569

ระบบนี้แยกออกมาจากเว็บกลุ่มสาระ "สตรีวิทยาศาสตร์" (`งาน รร/งานกลุ่มสาระ/เว็บกลุ่มสาระ`) เพราะคอร์สจะต้องมี**ระบบล็อกอินของนักเรียน** ส่วนเว็บโรงเรียนเปิดให้ทุกคนดูได้ฟรี และไม่มีบัญชีนักเรียน

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | หน้าที่ |
|---|---|
| `course.html` | หน้าคอร์สต้นแบบ ดับเบิลคลิกเปิดได้เลย ไม่ต้องมีเซิร์ฟเวอร์ |
| `courses.js` | ข้อมูลคอร์ส (`window.COURSES`) ตอนนี้มีคอร์ส "ฟิสิกส์ ม.4 กลศาสตร์: การเคลื่อนที่" 4 บท |

หน้าตาใช้โครงจาก `physics-simulations/course.html` (หน้าขายคอร์ส KP Science):
- แถบเลือกคอร์สอยู่ด้านบน
- จอใหญ่: คลิป YouTube (ถ้าไม่มีคลิปจะแสดงซิมูเลชันตัวแรก)
- แท็บ เนื้อหา · Simulation · เอกสาร · แบบทดสอบ
- รายการบทแบ่งเป็นหน่วย พับได้ มีเวลาคลิป
- ติ๊ก "เรียนแล้ว" แล้วมีแถบความคืบหน้า (ตอนนี้เก็บในเครื่องผู้เรียนเท่านั้น)

## รูปแบบข้อมูลบทเรียน (`courses.js`)
```
{ id, title, subject, level, author, summary, body,
  lessons: [ { unit: "01 การเคลื่อนที่", title, video: "https://youtu.be/…", dur: "12:30",
               body: "ข้อความ…\n[ฝัง: ลิงก์ซิมูเลชัน | ชื่อซิม]", file: "ลิงก์เอกสาร", quiz: "ลิงก์แบบทดสอบ" } ] }
```
`body` ใช้รูปแบบเดียวกับคลังความรู้ ได้แก่ `## หัวข้อ` · `- รายการ` · `> กล่องเน้น` · `**หนา**` · `$สมการ$` · `[ฝัง: …]` · `[รูป: …]` · `[ลิงก์: ข้อความ | …]`

## งานต่อไป: ระบบล็อกอินนักเรียน — ตัดสินใจแล้ว 10 ต.ค. 2569
1. **บัญชี:** Firebase (ใช้โปรเจกต์เดิมของ KP Science `kp-science-f11ff`)
2. **สิทธิ์:** ครูผู้สอนเป็นคนให้/ถอนสิทธิ์เข้าคอร์สของนักเรียนแต่ละคน
3. **ความคืบหน้า:** เก็บบน Firestore ครูดูได้ว่าใครเรียนถึงไหน
4. **ที่วางเว็บ (Claude แนะนำ):** รวมเข้าเว็บ KP Science (`physics-simulations` → kp-science.github.io/physics-simulations/course.html)
   - มีล็อกอิน Firebase (`kp-auth.js`) ระบบสิทธิ์ `access` และหน้าแอดมิน (`_admin/admin.html`) อยู่แล้ว
   - ใน `ACCESS_SCHEMA` มีช่อง `course` "คอสออนไลน์" (phase 3) เตรียมไว้แล้ว → ใช้สิทธิ์แบบ `course:<รหัสคอร์ส>` และ `course:*`
   - อยู่โดเมนเดียวกับซิมูเลชัน ฝังในบทเรียนได้ไม่ติดปัญหา

### แผนการทำ
1. **ตรวจ/แก้ Firestore Rules ของ `kp-science-f11ff` ก่อน (สำคัญ):** หน้าเว็บสร้าง/แก้เอกสาร `users/{uid}` จากฝั่งนักเรียนเอง (สมัคร · ดาวน์โหลด) ถ้า rules ปล่อยให้แก้เอกสารตัวเองได้ทั้งก้อน นักเรียนจะแก้ `access` ให้ตัวเองเป็น `['*']` ได้ → ต้องกันฟิลด์ `role` `access` `topics` `labs` `downloadQuota` ให้แก้ได้เฉพาะแอดมิน
   - ไฟล์ `firestore.rules` ใน repo ตอนนี้เป็นของโปรเจกต์ physics-quest ไม่ใช่ kp-science ต้องดูใน Firebase Console
2. **เก็บเนื้อหาคอร์สใน Firestore:** `courses/{id}` (ข้อมูลทั่วไป ทุกคนอ่านได้) + `courses/{id}/lessons/{n}` (อ่านได้เฉพาะคนที่มีสิทธิ์ `course:{id}` — rules ตรวจจาก `users/{uid}.access`) ห้ามใส่เนื้อหาในไฟล์ .js สาธารณะ
3. **หน้าคอร์ส:** ย้าย `course.html` (ต้นแบบนี้) เข้า physics-simulations ใช้ `kp-auth.js` แสดงบทที่ล็อกพร้อมปุ่ม "ขอสิทธิ์จากครู"
4. **แอดมิน:** เปิดหมวด `course` ใน ACCESS_SCHEMA (รายชื่อคอร์สจาก Firestore) + หน้าแก้คอร์ส/บทเรียน + ตารางความคืบหน้านักเรียน
5. **ความคืบหน้า:** `progress/{uid}/courses/{id}` = บทที่เรียนแล้ว + เวลา (นักเรียนเขียนของตัวเองได้ ครูอ่านได้ทั้งหมด)

**เครื่องมือที่ต้องมี:** Firebase CLI (`npm i -g firebase-tools` แล้วครู `firebase login` ด้วยบัญชีเจ้าของโปรเจกต์) เพื่อ deploy rules
**ทำงานนี้ในแชทที่เปิดในโฟลเดอร์ `GitHub/physics-simulations`** (มี CLAUDE.md + SESSION_LOG.md ของโปรเจกต์นั้น)

## ที่มาของคอร์สกลศาสตร์
- โครงบทเรียนมาจาก `physics-simulations/course.html` (คอร์ส physics4)
- ซิมูเลชันใช้ `kp-science.github.io/physics-simulations/Demo/mechanics/…` ซึ่งเปิดฟรีทั้ง 6 ตัว
- ยังไม่มีคลิป: คลิปเดิมใน course.html (th3RJfw-BS0 "ฟิสิกส์อะตอม timeline") เป็นคลิปตัวแทน ไม่ตรงเรื่อง

## อัปเดต 10 ต.ค. 2569 (บ่าย) — ตัดสินใจใหม่: แยกฐานข้อมูล + แยกเว็บ
แทนข้อ 1 และข้อ 4 ด้านบน: เว็บคอร์สเป็น**เว็บของตัวเอง** ไม่อยู่ใน physics-simulations และใช้ **Firebase โปรเจกต์ใหม่** (ไม่ใช่ kp-science-f11ff)
ซิมูเลชันยังฝังจาก `kp-science.github.io/physics-simulations/Demo/…` ได้เหมือนเดิม (ซิมใน Virtual Lab กันการฝังไว้ → เป็นปุ่มเปิดแท็บใหม่)

### ไฟล์ของเว็บ (โฟลเดอร์นี้ = ตัวเว็บ)
| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเรียน: รายการคอร์ส · `#/c/<รหัสคอร์ส>/<บท>` · ล็อกอิน Google/อีเมล · ขอสิทธิ์จากครู · ติ๊กเรียนแล้ว |
| `admin.html` | หน้าครู (Google ของ komanepapato@gmail.com เท่านั้น): สร้าง/แก้คอร์สและบท · อนุมัติคำขอ · ให้/ถอนสิทธิ์ด้วยอีเมล · ความคืบหน้า + CSV · นำเข้า courses.js |
| `course-core.js` | โมดูลกลาง: แปลงเนื้อหา + Firebase + ล็อกอิน |
| `firebase-config.js` | **ต้องใส่ค่า** firebaseConfig ของโปรเจกต์ใหม่ |
| `firestore.rules` · `firebase.json` | กติกาความปลอดภัย (deploy ด้วย Firebase CLI) |
| `prototype/` | ต้นแบบเดิม (`course.html` + `courses.js`) — `courses.js` ใช้ตอนนำเข้าคอร์สแรก |

ฐานข้อมูล: `students/{uid}` (courses[] ครูเติม) · `courses/{cid}` + `lessons/{lid}` · `course_progress/{uid}_{cid}` · `course_requests/{uid}_{cid}`
เนื้อหาบท (คลิป/เอกสาร/แบบทดสอบ) อยู่ใน Firestore เท่านั้น อ่านได้เฉพาะนักเรียนที่ได้สิทธิ์ หรือบทที่ติ๊ก “ทดลองเรียนฟรี”

### ขั้นตอนตั้งค่า (ครูทำ)
1. console.firebase.google.com → Add project (เช่น `kp-course`)
2. Build → Firestore Database → Create database (production mode · region asia-southeast1)
3. Build → Authentication → Sign-in method → เปิด **Google** และ **Email/Password**
4. Authentication → Settings → Authorized domains → เพิ่มโดเมนที่จะวางเว็บ (เช่น `kp-science.github.io`)
5. Project settings → Your apps → `</>` Web → คัดลอก firebaseConfig มาวางใน `firebase-config.js`
6. deploy rules: `npm i -g firebase-tools` → `firebase login` → ในโฟลเดอร์นี้ `firebase deploy --only firestore:rules --project <รหัสโปรเจกต์>` (หรือคัดลอก `firestore.rules` ไปวางใน Console → Firestore → Rules → Publish)
7. เปิด `admin.html` → ล็อกอิน Google → 📥 นำเข้า `prototype/courses.js` → ใส่คลิป → ติ๊กเผยแพร่
8. วางเว็บ: repo GitHub ใหม่ + GitHub Pages (ยังไม่ได้สร้าง)

### ทดสอบแล้ว (ด้วยข้อมูลจำลอง เพราะยังไม่มีโปรเจกต์ Firebase)
หน้าเรียน: ผู้เข้าชม / ล็อกอินไม่มีสิทธิ์ → ส่งคำขอ / มีสิทธิ์ → คลิป แท็บ ติ๊กเรียนแล้ว · หน้าต่างล็อกอิน (ตรวจช่องว่าง รหัสไม่ตรง ลืมรหัสผ่าน) · หน้าครู: สร้างคอร์ส เพิ่ม/เรียงบท อนุมัติคำขอ ให้สิทธิ์ด้วยอีเมล ความคืบหน้า · ยังไม่ได้ใส่ค่า config → ขึ้นข้อความให้ตั้งค่า ไม่มี error
