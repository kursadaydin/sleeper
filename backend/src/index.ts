import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json"; // Firebase servis hesabı

// Firebase Admin SDK başlatılıyor
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore(); // Firestore referansı
const app = express();

app.use(cors());
app.use(express.json());

// Günlük giriş endpoint'i
app.post("/daily-login", async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: "Wallet address is required." });
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const userRef = db.collection("users").doc(walletAddress);
  const userDoc = await userRef.get();

  // Kullanıcı veri tipini tanımlıyoruz
  interface UserData {
    points: number;
    streak: number;
    lastLogin?: string;
    loginHistory: string[];
  }

  // Kullanıcı verisi varsa al, yoksa varsayılan oluştur
  const userData: UserData = userDoc.exists
    ? (userDoc.data() as UserData)
    : {
        points: 0,
        streak: 0,
        loginHistory: [],
      };

  // Aynı gün içinde tekrar giriş yapılmış mı?
  if (userData.lastLogin === today) {
    return res.json({
      message: "Already logged in today",
      points: userData.points,
      streak: userData.streak,
    });
  }

  // Aralıksız giriş kontrolü
  const isConsecutive = userData.lastLogin === yesterday;
  let newStreak = isConsecutive ? userData.streak + 1 : 1;
  let bonus = 0;

  if (newStreak === 7) {
    bonus = 20;       // 7 gün üst üste girişte bonus
    newStreak = 0;    // Seriyi sıfırla (veya devam ettir)
  }

  const newPoints = userData.points + 5 + bonus;
  const newLoginHistory = [...userData.loginHistory, today].slice(-30);

  // Firestore'da güncelle
  await userRef.set(
    {
      points: newPoints,
      streak: newStreak,
      lastLogin: today,
      loginHistory: newLoginHistory,
    },
    { merge: true }
  );

  return res.json({
    message: `5 points added${bonus ? " + 20 bonus!" : ""}`,
    points: newPoints,
    streak: newStreak,
  });
});

// Express sunucusunu başlat
app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});