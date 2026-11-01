// ค่าเชื่อมต่อ Firebase ของเว็บคอร์ส (โปรเจกต์ใหม่ แยกจาก KP Science)
// วิธีได้ค่า: Firebase Console → โปรเจกต์ของคอร์ส → ⚙️ Project settings → Your apps → </> Web app → คัดลอก firebaseConfig มาวางแทนด้านล่าง
// ค่าเหล่านี้ไม่ใช่ความลับ (อยู่ในหน้าเว็บอยู่แล้ว) ความปลอดภัยอยู่ที่ firestore.rules
window.KPC_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA1j8oFaZR33GIxaGccBzd1j65GrhnbrcY",
  authDomain: "kp-course.firebaseapp.com",
  projectId: "kp-course",
  storageBucket: "kp-course.firebasestorage.app",
  messagingSenderId: "744510272844",
  appId: "1:744510272844:web:89bdf91d7c97fa59048be9"
};

// แจ้งเตือนทางอีเมล: URL ของ Google Apps Script (mail-script/Code.gs) · ไม่ใช่ความลับ สคริปต์ตรวจล็อกอินและสิทธิ์เอง · ลบบรรทัดนี้ = ปิดการส่งเมล
window.KPC_MAIL_URL = 'https://script.google.com/macros/s/AKfycbxaITkqkyN9mbFjmkq-u16UvyRMQDzEH38eiK0kE5dzqOl-H1mtn0O80uTVrHOXqd4t6w/exec';
