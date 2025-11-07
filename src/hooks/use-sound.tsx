'use client';

import { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';

interface SoundContextType {
  isSoundEnabled: boolean;
  toggleSound: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    // This effect runs only once on the client to initialize state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soundEnabled');
      // Set the state based on what's in localStorage, defaulting to true if nothing is found
      setIsSoundEnabled(saved !== null ? JSON.parse(saved) : true);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    // This effect runs only when isSoundEnabled changes *and* state has been initialized
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem('soundEnabled', JSON.stringify(isSoundEnabled));
    }
  }, [isSoundEnabled, isInitialized]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);

  // To prevent UI flicker or hydration mismatch, we can optionally not render children
  // until the state is initialized from localStorage.
  if (!isInitialized) {
    return null; // or a loading spinner
  }

  return (
    <SoundContext.Provider value={{ isSoundEnabled, toggleSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}
