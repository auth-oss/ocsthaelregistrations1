import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useRegistration } from '@/context/RegistrationContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Upload, Eraser } from 'lucide-react';

export function Step3Profile() {
  const { data, updateData, setStep } = useRegistration();
  const sigPad = useRef<SignatureCanvas>(null);
  
  const [bio, setBio] = useState(data.bio);
  const [username, setUsername] = useState(data.username);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(data.profilePhotoUrl);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const result = await res.json();
        setProfilePhotoUrl(result.secure_url);
      } else {
        console.warn("Cloudinary upload failed. Using local object URL.");
        setProfilePhotoUrl(URL.createObjectURL(file));
      }
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      alert("Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const clearSignature = () => {
    sigPad.current?.clear();
  };

  const handleContinue = () => {
    const signatureUrl = sigPad.current?.isEmpty() ? '' : sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
    updateData({ bio, username, profilePhotoUrl, signatureUrl: signatureUrl || '' });
    setStep(4);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Profile Details</CardTitle>
        <CardDescription>Step 3: Add your photo, signature, and bio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input 
            id="username" 
            placeholder="johndoe123" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Profile Photo</Label>
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Upload className="text-slate-400 w-6 h-6" />
              )}
            </div>
            <div className="flex-1">
              <Input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                disabled={isUploading}
                className="cursor-pointer"
              />
              {isUploading && <p className="text-xs text-slate-500 mt-1">Uploading...</p>}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Digital Signature</Label>
            <Button variant="ghost" size="sm" onClick={clearSignature} className="h-6 px-2 text-xs">
              <Eraser className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>
          <div className="border rounded-md bg-slate-50 overflow-hidden">
            <SignatureCanvas 
              ref={sigPad}
              penColor="black"
              canvasProps={{ className: 'w-full h-32 cursor-crosshair' }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Biography</Label>
          <textarea 
            id="bio"
            rows={3}
            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
            placeholder="Tell us a bit about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
        <Button onClick={handleContinue} disabled={!username || isUploading}>
          Review & Submit
        </Button>
      </CardFooter>
    </Card>
  );
}
