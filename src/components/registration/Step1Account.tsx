import React, { useState } from 'react';
import { useRegistration } from '@/context/RegistrationContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import emailjs from '@emailjs/browser';

export function Step1Account() {
  const { data, updateData, setStep } = useRegistration();
  const [name, setName] = useState(data.name);
  const [email, setEmail] = useState(data.email);
  const [phone, setPhone] = useState(data.phone);
  const [password, setPassword] = useState(data.password || '');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!name || !email || !phone || !password || password !== confirmPassword) {
      setError('Please fill all fields correctly. Passwords must match.');
      return;
    }
    setError('');
    setIsSending(true);

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: import.meta.env.VITE_EMAILJS_AUTH_SERVICE_ID,
          template_id: import.meta.env.VITE_EMAILJS_AUTH_TEMPLATE_ID,
          user_id: import.meta.env.VITE_EMAILJS_AUTH_PUBLIC_KEY,
          accessToken: import.meta.env.VITE_EMAILJS_AUTH_PRIVATE_KEY,
          template_params: {
            to_email: email,
            email: email, // Fallback in case template uses {{email}}
            user_name: name,
            to_name: name, // Fallback in case template uses {{to_name}}
            otp: newOtp
          }
        })
      });

      if (response.ok) {
        setOtpSent(true);
      } else {
        const text = await response.text();
        throw new Error(text);
      }
    } catch (err: any) {
      console.error('Failed to send OTP:', err);
      setError(`Failed to send OTP: ${err.message || 'Please check your EmailJS configuration.'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = () => {
    if (otp === generatedOtp) {
      updateData({ name, email, phone, password });
      setStep(2);
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Step 1: Account details & verification</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
        
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            type="text" 
            placeholder="John Doe" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            disabled={otpSent}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="john@example.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            disabled={otpSent}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input 
            id="phone" 
            type="tel" 
            placeholder="+1234567890" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)}
            disabled={otpSent}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            disabled={otpSent}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input 
            id="confirmPassword" 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={otpSent}
          />
        </div>

        {otpSent && (
          <div className="space-y-2 pt-4 border-t">
            <p className="text-sm text-emerald-600 font-medium mb-2">Please check your email box</p>
            <Label htmlFor="otp">Enter 6-digit OTP</Label>
            <Input 
              id="otp" 
              type="text" 
              maxLength={6} 
              placeholder="123456" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!otpSent ? (
          <Button className="w-full" onClick={handleSendOtp} disabled={isSending}>
            {isSending ? 'Sending OTP...' : 'Send Verification Code'}
          </Button>
        ) : (
          <Button className="w-full" onClick={handleVerifyOtp}>
            Verify & Continue
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
