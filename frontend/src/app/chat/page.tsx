'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useRef, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Send, Upload, Paperclip, X, FileText, Mic, Square, Volume2, VolumeX, Loader2, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string, path: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorPopup, setErrorPopup] = useState<string | null>(null);
  
  // Audio/Speech State
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Inicializar configurações do localStorage
  useEffect(() => {
    const savedAutoSpeak = localStorage.getItem('finora_auto_speak') === 'true';
    setIsAutoSpeakEnabled(savedAutoSpeak);
  }, []);

  // Persistir mudanças
  useEffect(() => {
    localStorage.setItem('finora_auto_speak', isAutoSpeakEnabled.toString());
  }, [isAutoSpeakEnabled]);
  
  // Progress/Proactive State
  const [lastProgressStatus, setLastProgressStatus] = useState<string>('idle');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    const cleanText = text
      .replace(/\[FILE_PATH: .*?\]/g, '') // Remove tags de arquivo
      .replace(/\*\*/g, '')               // Remove negrito
      .replace(/\*/g, '')                // Remove itálico ou asteriscos soltos
      .replace(/#/g, '')                 // Remove títulos
      .replace(/_/g, '')                 // Remove underscores
      .replace(/^\s*-\s*/gm, '')         // Remove traços de listas no início das linhas
      .trim();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    // 1. Prioridade: Vozes femininas conhecidas por nome (Premium)
    let femaleVoice = voices.find(voice => 
      voice.lang.includes('pt-BR') && 
      ['maria', 'heloisa', 'luciana', 'joana', 'francisca', 'female'].some(name => voice.name.toLowerCase().includes(name))
    );

    // 2. Segunda opção: Qualquer voz que o navegador identifique como feminina (via metadados se houver)
    if (!femaleVoice) {
      femaleVoice = voices.find(v => v.lang.includes('pt-BR') && v.name.toLowerCase().includes('female'));
    }

    // 3. Fallback final: Qualquer voz em Português (sem bloquear homens, apenas priorizando mulheres)
    const finalVoice = femaleVoice || voices.find(v => v.lang.includes('pt-BR')) || voices[0];

    if (finalVoice) utterance.voice = finalVoice;
    utterance.lang = 'pt-BR';
    utterance.rate = 1.3; // Mais rápido e menos pausado
    utterance.pitch = 1.0; 
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const processChatMessage = useCallback(async (userMessage: string, attachmentPath?: string, isHidden: boolean = false) => {
    const messageWithTag = attachmentPath ? `${userMessage} [FILE_PATH: ${attachmentPath}]` : userMessage;
    if (!isHidden) setMessages(prev => [...prev, { role: 'user', content: messageWithTag }]);
    setIsLoading(true);
    try {
      const response = await api.post('/ai/chat', { 
        messages: isHidden ? [{ role: 'user', content: messageWithTag }] : [...messages, { role: 'user', content: messageWithTag }],
        attachment_path: attachmentPath
      });
      const aiResponse = response.data.response;
      if (aiResponse) {
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        if (isAutoSpeakEnabled) speak(aiResponse.replace(/\[FILE_PATH: .*?\]/g, '').trim());
      }
    } catch (err) {
      if (!isHidden) setMessages(prev => [...prev, { role: 'assistant', content: 'Ocorreu um erro técnico.' }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isAutoSpeakEnabled]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get('/ai/history');
        if (res.data && res.data.length > 0) {
          setMessages(res.data);
        } else {
          // Trigger proactive greeting if no history
          await processChatMessage("Olá! Comece a conversa me dando as boas vindas e veja se tenho contas pendentes hoje.", undefined, true);
        }
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      }
    };
    loadHistory();
  }, []);

  // Proactive Polling Logic
  useEffect(() => {
    const checkProgress = async () => {
      try {
        const res = await api.get('/files/import-progress');
        const status = res.data.status;
        if (lastProgressStatus === 'processing' && status === 'completed') {
          await processChatMessage("A importação terminou. Analise o que foi importado e me dê um resumo proativo.", undefined, true);
        }
        setLastProgressStatus(status);
      } catch (err) {}
    };
    pollingRef.current = setInterval(checkProgress, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [lastProgressStatus, processChatMessage]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        setAudioLevel(sum / bufferLength);
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = async () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/m4a' });
        if (audioBlob.size < 1000) {
            setIsRecording(false);
            return;
        } 
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice.m4a');
        setIsLoading(true);
        try {
          const res = await api.post('/ai/transcribe-audio', formData);
          if (res.data.text) await processChatMessage(res.data.text);
        } catch (err) { setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao transcrever voz.' }]); }
        finally { 
            setIsLoading(false); 
            setIsRecording(false);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setRecordTime(prev => prev + 1), 1000);
    } catch (err) { alert('Erro no microfone.'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  const renderMessageContent = (content: string, role: string) => {
    const cleanContent = content.replace(/\[FILE_PATH: .*?\]/g, '').trim();
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = cleanContent.split(urlRegex);
    return (
      <div className="text-sm md:text-base leading-relaxed">
        {parts.map((part, index) => part.match(urlRegex) ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold break-all text-blue-500 hover:text-blue-700">{part}</a>
        ) : part)}
      </div>
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/files/upload-receipt', formData);
      setAttachedFile({ name: file.name, path: res.data.file_path });
      const msg = `Arquivo "${file.name}" pronto. Como posso ajudar?`;
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
      if (isAutoSpeakEnabled) speak(msg);
    } catch (err: any) {
      setErrorPopup(err.response?.data?.detail || 'Erro no upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || isLoading) return;
    let userMessage = input.trim() || `Analise este arquivo: ${attachedFile?.name}`;
    if (attachedFile && input.trim()) userMessage += ` (Anexo: ${attachedFile.name})`;
    const path = attachedFile?.path;
    setInput('');
    setAttachedFile(null);
    await processChatMessage(userMessage, path);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-[2rem] shadow-2xl shadow-blue-50 border border-gray-100 overflow-hidden relative">
        <div className="p-5 md:p-6 border-b bg-gray-50/50 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight">Assistente Finora</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-green-600">Proativo & Online</span>
              </div>
            </div>
          </div>
          <button onClick={() => { setIsAutoSpeakEnabled(!isAutoSpeakEnabled); if (isSpeaking) window.speechSynthesis.cancel(); }} className={`p-2.5 rounded-2xl transition-all ${isAutoSpeakEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-400 border border-gray-200'}`}>
            {isAutoSpeakEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide bg-[#FDFDFD]">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`group relative max-w-[85%] md:max-w-[70%] p-4 rounded-2xl shadow-sm transition-all ${
                m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}>
                {renderMessageContent(m.content, m.role)}
                {m.role === 'assistant' && (
                  <button onClick={() => speak(m.content.replace(/\[FILE_PATH: .*?\]/g, '').trim())} className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                    <Volume2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                <Bot size={16} className="animate-bounce" />
              </div>
              <div className="bg-gray-50 px-4 py-2 rounded-2xl text-xs font-bold text-gray-400 tracking-widest italic animate-pulse">Pensando...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 md:p-6 bg-white border-t border-gray-50 flex flex-col gap-3">
          {attachedFile && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-2xl text-xs font-bold w-fit border border-blue-100 animate-in slide-in-from-bottom-2">
              <FileText size={14} />
              <span className="truncate max-w-[150px]">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="ml-1 text-blue-300 hover:text-blue-600"><X size={16} /></button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <div className="flex-1 relative flex items-center">
              {isRecording ? (
                <div className="w-full h-[52px] bg-red-50 border-2 border-red-100 rounded-2xl px-4 flex items-center justify-between text-red-600 animate-pulse overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex gap-1 items-center justify-center h-8 w-16 flex-shrink-0 bg-red-100/30 rounded-xl">
                        {[...Array(6)].map((_, i) => (
                            <div 
                                key={i} 
                                className="w-1 bg-red-500 rounded-full transition-all duration-75" 
                                style={{ height: `${Math.max(4, Math.min(24, (audioLevel / 60) * 20))}px` }} 
                            />
                        ))}
                    </div>
                    <span className="text-sm font-black font-mono flex-shrink-0">{recordTime}s</span>
                    <span className="text-[10px] font-black uppercase tracking-widest truncate opacity-70">Gravando Áudio...</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 relative">
                  <input type="text" className="w-full bg-gray-50 border-none rounded-2xl pl-5 pr-12 py-3.5 text-sm md:text-base text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner" placeholder={isUploading ? "Subindo..." : "Escreva aqui..."} value={input} onChange={(e) => setInput(e.target.value)} disabled={isUploading || isLoading} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-blue-600 transition-colors"><Paperclip size={20} /></button>
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf,.xlsx,.xls,.csv" />
                </div>
              )}
            </div>
            <button type={(!input.trim() && !attachedFile) ? "button" : "submit"} onClick={(!input.trim() && !attachedFile && !isLoading) ? (isRecording ? stopRecording : startRecording) : undefined} className={`p-3.5 rounded-2xl shadow-xl transition-all active:scale-95 ${isRecording ? 'bg-red-500 text-white shadow-red-200' : 'bg-blue-600 text-white shadow-blue-200'}`}>
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : (!input.trim() && !attachedFile) ? (isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />) : <Send size={24} />}
            </button>
          </form>
        </div>
      </div>
      {errorPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto"><X size={48} /></div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Opa, algo deu errado</h2>
            <p className="text-gray-500 font-medium leading-relaxed">{errorPopup}</p>
            <button onClick={() => setErrorPopup(null)} className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95">Tudo bem</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
