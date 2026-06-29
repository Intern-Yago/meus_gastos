'use client';

import { useState, useEffect } from 'react';
import { X, Shield, Settings, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  
  const [preferences, setPreferences] = useState({
    essential: true,
    functional: true,
    intelligence: true
  });

  useEffect(() => {
    const consent = localStorage.getItem('finora_cookie_consent_v2');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const saveConsent = (prefs: typeof preferences) => {
    localStorage.setItem('finora_cookie_consent_v2', JSON.stringify(prefs));
    if (!prefs.functional) {
        localStorage.setItem('finora_auto_speak', 'false');
    }
    setIsVisible(false);
    setShowCustomizer(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ essential: true, functional: true, intelligence: true });
  };

  const handleRefuseAll = () => {
    saveConsent({ essential: true, functional: false, intelligence: false });
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Design Minimalista: Privacy Capsule */}
      {!showCustomizer && (
        <div className="fixed bottom-6 left-6 right-6 lg:left-auto lg:right-8 lg:max-w-md z-[1000] animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-white/80 backdrop-blur-2xl border border-gray-100 p-6 rounded-[2.5rem] shadow-2xl flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-blue-200">
                <Shield size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Privacidade Finora</h4>
                <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
                  Usamos cookies para melhorar sua experiência. Personalize ou aceite para continuar. <Link href="/privacy" className="text-blue-600 underline">Detalhes</Link>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowCustomizer(true)}
                className="flex-1 py-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Personalizar
              </button>
              <button 
                onClick={handleAcceptAll}
                className="flex-[1.5] py-3 bg-gray-900 text-white hover:bg-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gray-200 transition-all active:scale-95"
              >
                Aceitar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personalização */}
      {showCustomizer && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Sua Escolha</h2>
              <button onClick={() => setShowCustomizer(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl border border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Funcionalidade</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={preferences.functional} onChange={e => setPreferences({...preferences, functional: e.target.checked})} />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl border border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inteligência</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={preferences.intelligence} onChange={e => setPreferences({...preferences, intelligence: e.target.checked})} />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="p-6">
              <button 
                onClick={() => saveConsent(preferences)}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl"
              >
                Confirmar Seleção
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
