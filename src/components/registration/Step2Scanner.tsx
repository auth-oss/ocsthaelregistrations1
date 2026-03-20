import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useRegistration } from '@/context/RegistrationContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Camera, RefreshCw, Loader2, CheckCircle2, Upload } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

export function Step2Scanner() {
  const { data, updateData, setStep } = useRegistration();
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [scanSide, setScanSide] = useState<'front' | 'back'>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Extracted Data State
  const [extractedData, setExtractedData] = useState({
    name_en: data.name || '',
    name_bn: data.name_bn || '',
    father_name: data.father_name || '',
    mother_name: data.mother_name || '',
    dob: data.dob || '',
    nid_no: data.idNumber || '',
    address: data.address || '',
    blood_group: data.blood_group || '',
    birth_place: data.birth_place || '',
    issue_date: data.issue_date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    barcode: '',
    nidUrl: data.nidUrl || '',
    nid_cloudinary_id: data.nid_cloudinary_id || '',
    nid_back_url: data.nid_back_url || '',
    nid_back_cloudinary_id: data.nid_back_cloudinary_id || '',
  });

  const capture = useCallback(() => {
    const image = webcamRef.current?.getScreenshot();
    if (image) {
      if (scanSide === 'front') {
        setFrontImage(image);
        setScanSide('back');
      } else {
        setBackImage(image);
        processImages(frontImage!, image);
      }
    }
  }, [webcamRef, scanSide, frontImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        if (scanSide === 'front') {
          setFrontImage(base64Image);
          setScanSide('back');
        } else {
          setBackImage(base64Image);
          processImages(frontImage!, base64Image);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToCloudinary = async (image: string) => {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Cloudinary upload failed');
    }
    return await res.json();
  };

  const processImages = async (front: string, back: string) => {
    setIsProcessing(true);
    setError('');
    
    try {
      // 1. Upload both images to Cloudinary
      const [frontUpload, backUpload] = await Promise.all([
        uploadToCloudinary(front),
        uploadToCloudinary(back)
      ]);

      // 2. Extract data using Gemini API directly from frontend
      const frontBase64Data = front.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      const frontMimeTypeMatch = front.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/);
      const frontMimeType = frontMimeTypeMatch ? frontMimeTypeMatch[1] : 'image/jpeg';

      const backBase64Data = back.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      const backMimeTypeMatch = back.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/);
      const backMimeType = backMimeTypeMatch ? backMimeTypeMatch[1] : 'image/jpeg';

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: frontBase64Data,
                mimeType: frontMimeType
              }
            },
            {
              inlineData: {
                data: backBase64Data,
                mimeType: backMimeType
              }
            },
            {
              text: `You are an expert OCR and data extraction AI. Extract the following information from these two images of a Bangladesh National ID (NID) card (front and back). The card might be a Smart Card or a regular laminated NID.
              
              Extract exactly these fields and return them in the requested JSON format:
              - name_en: Name in English (usually labeled "Name").
              - name_bn: Name in Bengali (usually labeled "নাম").
              - father_name: Father's Name (usually labeled "পিতা" or "Father Name").
              - mother_name: Mother's Name (usually labeled "মাতা" or "Mother Name").
              - dob: Date of Birth (format: DD MMM YYYY or exactly as it appears).
              - nid_no: NID No / ID NO / NID Number (usually 10, 13, or 17 digits).
              - address: Address / ঠিকানা (from the back of the card, usually starts with "ঠিকানা:").
              - blood_group: Blood Group (if visible, e.g., O+, A+, B+).
              - birth_place: Place of Birth / জন্মস্থান (from the back of the card).
              - barcode: Extract the text/numbers from the barcode/QR code area if readable, or leave empty.
              
              CRITICAL INSTRUCTIONS:
              1. Be extremely accurate. Do not hallucinate data.
              2. If a field is not visible, blurry, or cannot be extracted, leave it as an empty string "".
              3. Ensure Bengali text is extracted perfectly without spelling mistakes.`
            }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name_en: { type: Type.STRING },
              name_bn: { type: Type.STRING },
              father_name: { type: Type.STRING },
              mother_name: { type: Type.STRING },
              dob: { type: Type.STRING },
              nid_no: { type: Type.STRING },
              address: { type: Type.STRING },
              blood_group: { type: Type.STRING },
              birth_place: { type: Type.STRING },
              barcode: { type: Type.STRING }
            }
          }
        }
      });

      const aiData = JSON.parse(response.text || '{}');

      // Always set issue date to today's date as requested
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      setExtractedData(prev => ({
        ...prev,
        ...aiData,
        issue_date: today,
        nidUrl: frontUpload.secure_url,
        nid_cloudinary_id: frontUpload.public_id,
        nid_back_url: backUpload.secure_url,
        nid_back_cloudinary_id: backUpload.public_id,
      }));

    } catch (err: any) {
      console.error("Processing Error:", err);
      setError(err.message || "An error occurred during processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExtractedData(prev => ({ ...prev, [name]: value }));
  };

  const handleContinue = () => {
    updateData({ 
      name: extractedData.name_en || data.name, 
      idNumber: extractedData.nid_no,
      name_bn: extractedData.name_bn,
      father_name: extractedData.father_name,
      mother_name: extractedData.mother_name,
      dob: extractedData.dob,
      address: extractedData.address,
      blood_group: extractedData.blood_group,
      birth_place: extractedData.birth_place,
      issue_date: extractedData.issue_date,
      barcode: extractedData.barcode,
      nidUrl: extractedData.nidUrl,
      nid_cloudinary_id: extractedData.nid_cloudinary_id,
      nid_back_url: extractedData.nid_back_url,
      nid_back_cloudinary_id: extractedData.nid_back_cloudinary_id,
      nid_upload_date: Date.now(),
      nid_image_deleted: false
    });
    setStep(3);
  };

  const retake = () => {
    setFrontImage(null);
    setBackImage(null);
    setScanSide('front');
    setError('');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>ID Scanner</CardTitle>
        <CardDescription>Step 2: Scan your NID (Front and Back)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-red-500 text-sm font-medium p-3 bg-red-50 rounded-md">{error}</div>}
        
        {(!frontImage || !backImage) && !isProcessing ? (
          <div className="space-y-4">
            <div className="text-center font-medium text-slate-700">
              Please scan the <span className="text-emerald-600 font-bold uppercase">{scanSide}</span> side of your NID
            </div>
            <div className="relative rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                className="w-full h-full object-cover"
              />
              {/* Overlay Guide */}
              <div className="absolute inset-0 border-4 border-emerald-500/50 m-8 rounded-xl pointer-events-none"></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={capture} className="flex-1" variant="outline">
                <Camera className="mr-2 h-4 w-4" /> Capture {scanSide === 'front' ? 'Front' : 'Back'}
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} className="flex-1" variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Upload File
              </Button>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
            </div>
          </div>
        ) : isProcessing ? (
          <div className="text-center space-y-4 py-12">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto" />
            <p className="text-lg font-medium text-slate-700">Analyzing ID Card with AI...</p>
            <p className="text-sm text-slate-500">Extracting details and uploading securely.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 text-center">Front</p>
                <img src={frontImage!} alt="Front" className="w-full rounded-lg border" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 text-center">Back</p>
                <img src={backImage!} alt="Back" className="w-full rounded-lg border" />
              </div>
            </div>
            
            <Button onClick={retake} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" /> Retake Photos
            </Button>
            
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-semibold">Verify Extracted Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name (English)</Label>
                  <Input name="name_en" value={extractedData.name_en} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>নাম (বাংলা)</Label>
                  <Input name="name_bn" value={extractedData.name_bn} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>NID Number</Label>
                  <Input name="nid_no" value={extractedData.nid_no} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input name="dob" value={extractedData.dob} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Father's Name</Label>
                  <Input name="father_name" value={extractedData.father_name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Mother's Name</Label>
                  <Input name="mother_name" value={extractedData.mother_name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Input name="blood_group" value={extractedData.blood_group} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Input name="issue_date" value={extractedData.issue_date} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Place of Birth (জন্মস্থান)</Label>
                  <Input name="birth_place" value={extractedData.birth_place} onChange={handleChange} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address (ঠিকানা)</Label>
                  <Input name="address" value={extractedData.address} onChange={handleChange} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Barcode Data</Label>
                  <Input name="barcode" value={extractedData.barcode} onChange={handleChange} placeholder="Extracted from back part" />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
        <Button onClick={handleContinue} disabled={!frontImage || !backImage || isProcessing || !extractedData.nid_no}>
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}
