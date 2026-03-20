import express from 'express';
// Version 1.0.1 - Trigger Sync
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import cron from 'node-cron';
import { v2 as cloudinary } from 'cloudinary';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Initialize Firebase Admin (Optional if you just want to run the cron job locally, 
// but required for the cron job to actually delete from Firestore)
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
    });
  } else {
    admin.initializeApp(); // Uses default credentials if available in GCP
  }
} catch (e) {
  console.log('Firebase Admin not initialized. Cron job will skip Firestore updates if credentials are missing.');
}

cloudinary.config({ 
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxiolmmdv', 
  api_key: process.env.VITE_CLOUDINARY_API_KEY || '842696479721211', 
  api_secret: process.env.VITE_CLOUDINARY_API_SECRET || 'oWiNS3JZJio5VmsVD6w4tiD1qzM' 
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Cloudinary Upload Endpoint
app.post('/api/upload-image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Upload to Cloudinary using the Node SDK (which uses the API key/secret)
    // We don't need upload_preset for authenticated backend uploads
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'ocsthael_nid'
    });

    res.json(uploadResponse);
  } catch (error: any) {
    console.error('Cloudinary Upload Error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image to Cloudinary' });
  }
});

// Cron Job for deleting old NID images
cron.schedule('0 0 * * *', async () => {
  console.log('Checking for old NID images...');
  const tenDaysAgo = Date.now() - (10 * 24 * 60 * 60 * 1000);
  
  try {
    const snapshot = await admin.firestore().collection('users')
      .where('nid_upload_date', '<=', tenDaysAgo)
      .where('nid_image_deleted', '==', false)
      .get();

    if (snapshot.empty) {
      console.log('No old images to delete.');
      return;
    }

    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const publicId = userData.nid_cloudinary_id;
      const backPublicId = userData.nid_back_cloudinary_id;

      if (publicId) await cloudinary.uploader.destroy(publicId);
      if (backPublicId) await cloudinary.uploader.destroy(backPublicId);

      await doc.ref.update({
        nidUrl: "deleted",
        nid_back_url: "deleted",
        nid_image_deleted: true
      });
      console.log(`Deleted NID image for user: ${doc.id}`);
    }
  } catch (error) {
    console.error('Cleanup Error:', error);
  }
});

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
