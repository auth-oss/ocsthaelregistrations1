import { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
      });
    } else {
      admin.initializeApp();
    }
  }
} catch (e) {
  console.log('Firebase Admin init error', e);
}

cloudinary.config({ 
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.VITE_CLOUDINARY_API_KEY, 
  api_secret: process.env.VITE_CLOUDINARY_API_SECRET 
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron Authentication (Optional but recommended)
  // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  console.log('Checking for old NID images...');
  const tenDaysAgo = Date.now() - (10 * 24 * 60 * 60 * 1000);
  
  try {
    const snapshot = await admin.firestore().collection('users')
      .where('nid_upload_date', '<=', tenDaysAgo)
      .where('nid_image_deleted', '==', false)
      .get();

    if (snapshot.empty) {
      console.log('No old images to delete.');
      return res.status(200).json({ message: 'No old images to delete.' });
    }

    let deletedCount = 0;
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
      deletedCount++;
    }
    
    return res.status(200).json({ message: `Successfully deleted ${deletedCount} images.` });
  } catch (error: any) {
    console.error('Cleanup Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
