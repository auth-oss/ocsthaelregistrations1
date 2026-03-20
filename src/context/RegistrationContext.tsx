import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface RegistrationData {
  email: string;
  phone: string;
  password?: string;
  name: string;
  idNumber: string;
  nidUrl: string;
  profilePhotoUrl: string;
  signatureUrl: string;
  bio: string;
  username: string;
  ocsthaelId: string;
  walletBalance: number;
  // New fields for LandingAI extraction
  name_bn?: string;
  father_name?: string;
  mother_name?: string;
  dob?: string;
  address?: string;
  blood_group?: string;
  birth_place?: string;
  issue_date?: string;
  barcode?: string;
  nid_cloudinary_id?: string;
  nid_back_url?: string;
  nid_back_cloudinary_id?: string;
  nid_upload_date?: number;
  nid_image_deleted?: boolean;
}

interface RegistrationContextType {
  step: number;
  setStep: (step: number) => void;
  data: RegistrationData;
  updateData: (newData: Partial<RegistrationData>) => void;
}

const defaultData: RegistrationData = {
  email: '',
  phone: '',
  password: '',
  name: '',
  idNumber: '',
  nidUrl: '',
  profilePhotoUrl: '',
  signatureUrl: '',
  bio: '',
  username: '',
  ocsthaelId: '',
  walletBalance: 500, // Initial welcome bonus
};

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export const RegistrationProvider = ({ children }: { children: ReactNode }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>(defaultData);

  const updateData = (newData: Partial<RegistrationData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  return (
    <RegistrationContext.Provider value={{ step, setStep, data, updateData }}>
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  return context;
};
