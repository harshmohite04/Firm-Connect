import React, { createContext, useContext, useState, useEffect } from 'react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingContextType {
  isOnboarding: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  startOnboarding: () => void;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to LawfirmAI!',
    description: 'This is your legal portal dashboard. Let us show you around.',
    targetSelector: '[data-onboarding="dashboard"]',
    position: 'bottom',
  },
  {
    id: 'create-case',
    title: 'Create Your First Case',
    description: 'Click here to start a new legal case and track its progress.',
    targetSelector: '[data-onboarding="create-case"]',
    position: 'bottom',
  },
  {
    id: 'search',
    title: 'Search Everything',
    description: 'Quickly find cases, messages, documents, and events. Press Ctrl+K anytime.',
    targetSelector: '[data-onboarding="search"]',
    position: 'bottom',
  },
  {
    id: 'messages',
    title: 'Messages',
    description: 'Communicate with your legal team in real-time.',
    targetSelector: '[data-onboarding="messages"]',
    position: 'right',
  },
  {
    id: 'notifications',
    title: 'Stay Updated',
    description: 'Get notified about case updates, messages, and upcoming events.',
    targetSelector: '[data-onboarding="notifications"]',
    position: 'bottom',
  },
];

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem('onboardingComplete');
    if (!completed) {
      // Delay to let the page render first
      const timer = setTimeout(() => setIsOnboarding(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      skipOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const skipOnboarding = () => {
    setIsOnboarding(false);
    setCurrentStep(0);
    localStorage.setItem('onboardingComplete', 'true');
  };

  const startOnboarding = () => {
    setCurrentStep(0);
    setIsOnboarding(true);
  };

  return (
    <OnboardingContext.Provider value={{ isOnboarding, currentStep, steps: ONBOARDING_STEPS, nextStep, prevStep, skipOnboarding, startOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
}
