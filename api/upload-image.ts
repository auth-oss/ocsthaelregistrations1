import { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({ 
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxiolmmdv', 
  api_key: process.env.VITE_CLOUDINARY_API_KEY || 'YOUR_API_KEY', 
  api_secret: process.env.VITE_CLOUDINARY_API_SECRET || 'YOUR_API_SECRET' 
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'ocsthael_nid'
    });

    return res.status(200).json(uploadResponse);
  } catch (error: any) {
    console.error('Cloudinary Upload Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload image to Cloudinary' });
  }
}
