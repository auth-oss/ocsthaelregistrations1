import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import emailjs from '@emailjs/browser';
import { useRegistration } from '@/context/RegistrationContext';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { auth, db } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function Step4Success() {
  const { data, updateData } = useRegistration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const profileUrl = `https://ocsthael.com/profile/${data.username}`;

  const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
    return JSON.stringify(errInfo);
  };

  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isSuccess && countdown === 0) {
      window.location.href = 'https://ocsthael.com';
    }
  }, [isSuccess, countdown]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Generate OC-XXXX ID
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const ocId = `OC-${randomDigits}`;
      updateData({ ocsthaelId: ocId });

      // 2. Create Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password!);
      const user = userCredential.user;
      const authToken = await user.getIdToken();

      // 3. Save to Firestore
      const userDocPath = `users/${user.uid}`;
      try {
        await setDoc(doc(db, 'users', user.uid), {
          ocId,
          key: ocId, // As requested: key must be identical to ocId
          role: 'user', // As requested: sets role: 'user' for every new user
          email: data.email,
          phone: data.phone,
          name: data.name,
          idNumber: data.idNumber,
          nidUrl: data.nidUrl,
          nid_cloudinary_id: data.nid_cloudinary_id || '',
          nid_back_url: data.nid_back_url || '',
          nid_back_cloudinary_id: data.nid_back_cloudinary_id || '',
          nid_upload_date: data.nid_upload_date || Date.now(),
          nid_image_deleted: data.nid_image_deleted || false,
          nameBengali: data.name_bn || '',
          fatherName: data.father_name || '',
          motherName: data.mother_name || '',
          dob: data.dob || '',
          address: data.address || '',
          bloodGroup: data.blood_group || '',
          birth_place: data.birth_place || '',
          issue_date: data.issue_date || '',
          barcode: data.barcode || '',
          photoURL: data.profilePhotoUrl,
          signatureURL: data.signatureUrl,
          bio: data.bio,
          username: data.username,
          walletBalance: data.walletBalance,
          createdAt: serverTimestamp(),
        });
      } catch (fsError: any) {
        const detailedError = handleFirestoreError(fsError, OperationType.WRITE, userDocPath);
        throw new Error(`Database Error: ${detailedError}`);
      }

      // 4. Send Welcome Email via EmailJS
      const welcomeEmailPromise = emailjs.send(
        import.meta.env.VITE_EMAILJS_AUTH_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID,
        {
          user_name: data.name,
          service_link: "https://ocsthael.com/services",
          email: data.email
        },
        import.meta.env.VITE_EMAILJS_AUTH_PUBLIC_KEY
      ).then(
        (res) => console.log("Welcome Email Sent!", res.status, res.text),
        (err) => console.error("Welcome Email Error!", err)
      );

      // 5. Send Bonus Email via EmailJS
      const bonusEmailPromise = fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
          template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
          accessToken: import.meta.env.VITE_EMAILJS_PRIVATE_KEY,
          template_params: {
            to_email: data.email,
            email: data.email,
            member_name: data.name,
            user_name: data.name,
            bonus_amount: data.walletBalance
          }
        })
      });

      Promise.all([welcomeEmailPromise, bonusEmailPromise]).catch(err => console.error("Email sending failed:", err));

      setIsSuccess(true);
      
      // Setup redirect URL
      const redirectUrl = `https://ocsthael.com/oc-id/${ocId}/key/${authToken}/autologin/dashboard`;
      
      // Redirect after 5 seconds
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 5000);

    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto text-center border-emerald-200">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <CardTitle className="text-emerald-700">Registration Successful!</CardTitle>
          <CardDescription>Welcome to Ocsthael, {data.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border">
            <p className="text-sm text-slate-500 mb-1">Your Unique ID</p>
            <p className="text-2xl font-mono font-bold text-slate-900">{data.ocsthaelId}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center space-y-4">
            <p className="text-sm font-medium">Your Profile QR Code</p>
            <div className="p-4 bg-white rounded-xl shadow-sm border">
              <QRCodeSVG value={profileUrl} size={150} />
            </div>
            <a href={profileUrl} className="text-sm text-blue-600 hover:underline break-all">
              {profileUrl}
            </a>
          </div>

          <div className="text-sm text-slate-500 pt-4">
            Redirecting to your dashboard in <span className="font-bold text-slate-900">{countdown}</span> seconds...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Review & Register</CardTitle>
        <CardDescription>Step 4: Finalize your registration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 break-words">
              {error.startsWith('Database Error:') ? (
                <div>
                  <p className="font-bold">Database Connection Error</p>
                  <p className="text-xs opacity-80 mt-1">Please try again or contact support if the issue persists.</p>
                </div>
              ) : error}
            </div>
          </div>
        )}
        
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-slate-500">Name:</span>
            <span className="col-span-2 font-medium">{data.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-slate-500">Email:</span>
            <span className="col-span-2 font-medium">{data.email}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-slate-500">Phone:</span>
            <span className="col-span-2 font-medium">{data.phone}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-slate-500">ID Number:</span>
            <span className="col-span-2 font-medium">{data.idNumber}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-slate-500">Username:</span>
            <span className="col-span-2 font-medium">{data.username}</span>
          </div>
        </div>
        
        <p className="text-xs text-slate-500 text-center pt-4">
          By clicking register, you agree to our Terms of Service and Privacy Policy.
        </p>
        
        <div className="flex items-center space-x-2 pt-2">
          <input 
            type="checkbox" 
            id="privacy" 
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
          />
          <Label htmlFor="privacy" className="text-sm font-normal text-slate-600 cursor-pointer">
            I agree to the <a href="https://ocsthael.com/privacy-Policy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">Privacy Policy</a>
          </Label>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
          onClick={handleSubmit} 
          disabled={isSubmitting || !acceptedPrivacy}
        >
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...</>
          ) : (
            'Complete Registration'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
