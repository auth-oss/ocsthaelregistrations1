import React from 'react';
// Version 1.0.2 - Force Sync for Vercel
import { RegistrationProvider, useRegistration } from './context/RegistrationContext';
import { Step1Account } from './components/registration/Step1Account';
import { Step2Scanner } from './components/registration/Step2Scanner';
import { Step3Profile } from './components/registration/Step3Profile';
import { Step4Success } from './components/registration/Step4Success';

function RegistrationSteps() {
  const { step } = useRegistration();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 relative z-10">
      <div className="flex flex-col items-center justify-center mb-8 space-y-4">
        <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-2xl p-2 border-4 border-white/20">
          <img 
            src="https://i.postimg.cc/KckKbk9Y/1000000232_removebg_preview.png" 
            alt="Ocsthael Logo" 
            className="w-full h-full object-contain" 
            referrerPolicy="no-referrer" 
          />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-lg text-center">
          OCSTHAEL REGISTRATION
        </h1>
        <p className="text-sm md:text-base text-blue-100 font-medium tracking-wide">
          Secure Unified Registration
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4].map((i) => (
            <React.Fragment key={i}>
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all duration-300 shadow-lg ${
                  step === i 
                    ? 'bg-white text-blue-900 ring-4 ring-white/30 scale-110' 
                    : step > i 
                      ? 'bg-emerald-400 text-white' 
                      : 'bg-white/20 text-white/60'
                }`}
              >
                {i}
              </div>
              {i < 4 && (
                <div className={`w-8 md:w-16 h-1.5 rounded-full transition-colors duration-300 ${step > i ? 'bg-emerald-400' : 'bg-white/20'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="transition-all duration-500 ease-in-out">
        {step === 1 && <Step1Account />}
        {step === 2 && <Step2Scanner />}
        {step === 3 && <Step3Profile />}
        {step === 4 && <Step4Success />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RegistrationProvider>
      {/* Background with Navy Blue, Blue, Green, and White combination */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-800 to-emerald-700 font-sans text-slate-900 selection:bg-blue-200 relative overflow-hidden">
        {/* Decorative background elements for the "white" and "green/blue" mix */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-40 -left-20 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-20 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <RegistrationSteps />
      </div>
    </RegistrationProvider>
  );
}
