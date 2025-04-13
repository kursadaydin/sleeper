import express from 'express';
import cors from 'cors';
import { db } from './services/firebase';
import * as dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Kullanıcı günlük giriş yaparsa
app.post('/daily-login', async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) return res.status(400).json({ error: 'walletAddress gerekli' });

  const userRef = db.collection('users').doc(walletAddress);
  const userDoc = await userRef.get();
  const today = new Date().toISOString().split('T')[0];

  if (userDoc.exists) {
    const data = userDoc.data();
    if (data?.lastLoginDate === today) {
      return res.json({ message: 'Zaten bugün giriş yapıldı', points: data.points });
    }
    await userRef.update({
      lastLoginDate: today,
      points: admin.firestore.FieldValue.increment(5),
    });
  } else {
    await userRef.set({
      walletAddress,
      lastLoginDate: today,
      points: 5,
    });
  }

  return res.json({ message: 'Günlük giriş kaydedildi', points: 5 });
});

app.listen(PORT, () => {
  console.log(`API ${PORT} portunda çalışıyor`);
});
