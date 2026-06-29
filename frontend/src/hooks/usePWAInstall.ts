'use client';

import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if it's already running as a PWA
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      if (isStandalone || isIOSStandalone) {
        setIsPWA(true);
      }
    };
    checkPWA();

    // Listen for the install prompt from the browser
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setIsPWA(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return { isInstallable, isPWA, installPWA };
}
