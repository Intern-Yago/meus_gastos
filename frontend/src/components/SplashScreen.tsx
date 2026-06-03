'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsVisibleFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);

  // Função para sintetizar um som de "Chime de Elite" via Web Audio API (Nativo, offline e levíssimo)
  const playEliteChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // 1. SUB-BASS (Estabilidade e Segurança - Nota Lá2 / 110Hz)
      const oscSub = ctx.createOscillator();
      const gainSub = ctx.createGain();
      oscSub.type = 'sine';
      oscSub.frequency.setValueAtTime(110, now);
      
      gainSub.gain.setValueAtTime(0, now);
      gainSub.gain.linearRampToValueAtTime(0.25, now + 0.3); // subida suave
      gainSub.gain.exponentialRampToValueAtTime(0.001, now + 1.4); // queda exponencial
      
      oscSub.connect(gainSub);
      gainSub.connect(ctx.destination);

      // 2. CRISTAL CHIME (Brilho e Clareza - Notas Mi5/659Hz e Lá5/880Hz em Acorde Aberto)
      const freqs = [659.25, 880.00];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle'; // Onda suave e aveludada
        osc.frequency.setValueAtTime(freq, now);
        
        // Pequena variação estéreo artificial para dar sensação de espaço
        osc.frequency.setValueAtTime(freq + (idx * 1.5), now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.1); // ataque rápido
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1); // decaimento longo
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 1.2);
      });

      oscSub.start(now);
      oscSub.stop(now + 1.5);
    } catch (err) {
      // Ignora silenciosamente se o navegador bloquear o autoplay
      console.log('Autoplay do Chime bloqueado pelo navegador.');
    }
  };

  useEffect(() => {
    // Toca o Chime sintetizado logo no mount
    playEliteChime();

    // Simula carregamento progressivo da barra
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 4;
      });
    }, 30);

    // Inicia o fade-out após 1.2s
    const fadeTimeout = setTimeout(() => {
      setIsVisibleFadingOut(true);
    }, 1200);

    // Remove completamente do DOM após o fade-out (1.7s no total)
    const removeTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 1700);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimeout);
      clearTimeout(removeTimeout);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center max-w-xs space-y-6">
        {/* LOGO PULSANTE COM BRILHO METÁLICO */}
        <div className="relative w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 animate-pulse border border-blue-400/20">
          <Image 
            src="/logo_fiora.png" 
            alt="Finora Logo" 
            width={48} 
            height={48} 
            className="rounded-lg invert brightness-200"
            priority
          />
        </div>

        {/* NOME E SLOGAN PREMIUM */}
        <div className="text-center space-y-1.5 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Finora</h1>
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.25em]">Silo de Inteligência</p>
        </div>

        {/* BARRA DE PROGRESSO DELGADA COM BRILHO NEON */}
        <div className="w-40 bg-white/5 h-[3px] rounded-full overflow-hidden relative border border-white/5 shadow-inner">
          <div 
            className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}