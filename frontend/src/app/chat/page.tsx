'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useRef, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { 
  Send, Upload, Paperclip, X, FileText, Mic, Square, Loader2, Bot, User, 
  Volume2, VolumeX, ShieldAlert, Settings, Trash2, Download 
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { isInstallable, isPWA, installPWA } = usePWAInstall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorPopup, setErrorPopup] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  
  // Voice states
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Clear chat state
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Load Preferences
  useEffect(() => {
    const savedAutoSpeak = localStorage.getItem('finora_auto_speak');
    if (savedAutoSpeak !== null) setIsAutoSpeakEnabled(savedAutoSpeak === 'true');
  }, []);

  const checkPermission = (type: 'functional' | 'intelligence') => {
    const saved = localStorage.getItem('finora_cookie_consent_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed[type] === true;
    }
    return true; 
  };

  const handleToggleSpeak = () => {
    if (!checkPermission('functional')) {
      setPermissionNotice("Em respeito à sua escolha de privacidade, os recursos de voz estão desabilitados. Você pode alterar isso nas configurações.");
      return;
    }
    const newValue = !isAutoSpeakEnabled;
    setIsAutoSpeakEnabled(newValue);
    localStorage.setItem('finora_auto_speak', String(newValue));
    if (!newValue && isSpeaking) window.speechSynthesis.cancel();
  };

  const handleClearHistory = async () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      // Cancela o modo de confirmação se o usuário não clicar novamente em 4 segundos
      setTimeout(() => {
        setIsConfirmingClear(false);
      }, 4000);
      return;
    }

    setIsConfirmingClear(false);
    try {
      await api.delete('/ai/history');
      // Redefine instantaneamente o chat com a saudação padrão oficial
      setMessages([{ role: 'assistant', content: "Olá! Sou o Finora, seu mentor de inteligência financeira de elite. Como posso ajudar você a dominar seu fluxo de caixa, planejar seus investimentos ou analisar sua saúde financeira hoje?" }]);
    } catch (err) {
      setErrorPopup("Erro ao limpar o histórico do chat.");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window) || !checkPermission('functional')) return;
    window.speechSynthesis.cancel();

    // Remove markdown symbols, emojis and format text for smooth speech synthesis
    const cleanText = text
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '') // remove emojis
      .replace(/\[FILE_PATH: .*?\]/g, '') // remove caminhos de anexo
      .replace(/\*\*(.*?)\*\*/g, '$1')     // remove negritos
      .replace(/\*(.*?)\*/g, '$1')         // remove itálicos
      .replace(/__(.*?)__/g, '$1')         // remove sublinhados
      .replace(/_(.*?)_/g, '$1')           // remove sublinhados
      .replace(/`([^`]+)`/g, '$1')         // remove blocos de código
      .replace(/#+\s+(.*?)\n/g, '$1. ')    // remove cabeçalhos de markdown e adiciona pausa
      .replace(/-\s+/g, '')                // remove marcadores de lista
      .replace(/\n+/g, ' ')                // junta quebras de linha para reduzir as pausas artificiais
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.45; // Acelera a fala para ficar dinâmica, natural e sem lentidão
    
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.lang.includes('pt') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('maria') || v.name.toLowerCase().includes('luciana')));
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const processChatMessage = useCallback(async (userMessage: string, attachmentPath?: string, isHidden: boolean = false, saveHistory: boolean = true) => {
    const messageWithTag = attachmentPath ? `${userMessage} [FILE_PATH: ${attachmentPath}]` : userMessage;
    if (!isHidden) setMessages(prev => [...prev, { role: 'user', content: messageWithTag }]);
    setIsLoading(true);
    try {
      const response = await api.post('/ai/chat', { 
        messages: isHidden ? [{ role: 'user', content: messageWithTag }] : [...messages, { role: 'user', content: messageWithTag }],
        attachment_path: attachmentPath,
        save_history: saveHistory
      });
      const aiResponse = response.data.response;
      if (aiResponse) {
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        if (isAutoSpeakEnabled && checkPermission('functional')) speak(aiResponse.replace(/\[FILE_PATH: .*?\]/g, '').trim());
      }
    } catch (err) {
      if (!isHidden) setMessages(prev => [...prev, { role: 'assistant', content: 'Ocorreu um erro técnico.' }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [messages, isAutoSpeakEnabled]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get('/ai/history');
        const urlParams = new URLSearchParams(window.location.search);
        const initPrompt = urlParams.get('init_prompt');
        
        if (initPrompt) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (res.data && res.data.length > 0) {
          setMessages(res.data);
          if (initPrompt) {
            setTimeout(() => {
              processChatMessage(initPrompt);
            }, 150);
          }
        } else {
          if (initPrompt) {
            setTimeout(() => {
              processChatMessage(initPrompt);
            }, 150);
          } else {
            // Renderiza instantaneamente a saudação oficial sem carregar latências de rede desnecessárias
            setMessages([{ role: 'assistant', content: "Olá! Sou o Finora, seu mentor de inteligência financeira de elite. Como posso ajudar você a dominar seu fluxo de caixa, planejar seus investimentos ou analisar sua saúde financeira hoje?" }]);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      }
    };
    loadHistory();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || isLoading) return;
    
    let filePath = undefined;
    if (attachedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', attachedFile);
        try {
            const res = await api.post('/files/upload-receipt', formData);
            filePath = res.data.file_path;
        } catch (e) { alert('Erro no upload do arquivo'); }
        finally { setIsUploading(false); }
    }

    const currentInput = input;
    setInput('');
    setAttachedFile(null);
    await processChatMessage(currentInput, filePath);
  };

  const handleSuggestClick = async (promptText: string) => {
    if (isLoading) return;
    setInput('');
    setAttachedFile(null);
    await processChatMessage(promptText);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
  };

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

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        setIsRecording(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const renderMessageContent = (content: string, role: string) => {
    const hasFile = content.includes('[FILE_PATH:');
    const cleanContent = content.replace(/\[FILE_PATH: .*?\]/g, '').trim();
    
    return (
      <div className="space-y-2 prose prose-sm max-w-none prose-p:leading-relaxed prose-p:font-medium prose-a:text-blue-600 prose-a:font-black prose-a:no-underline hover:prose-a:underline">
        {hasFile && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${role === 'user' ? 'bg-blue-700 border-blue-500 text-blue-100' : 'bg-gray-200 border-gray-300 text-gray-500'}`}>
            <FileText size={14} /> Arquivo Anexo
          </div>
        )}
        {cleanContent ? (
          role === 'assistant' ? (
              <ReactMarkdown 
                components={{
                    a: ({node, ...props}) => {
                        const isExport = props.href?.includes('/reports/');
                        
                        const handleDownloadClick = async (e: React.MouseEvent) => {
                            if (isExport) {
                                e.preventDefault();
                                try {
                                    // SECURITY: Trocar JWT Local por um Cookie HttpOnly de 24h
                                    await api.post('/auth/set-download-cookie');
                                    // Abrir o link agora que o cookie está plantado
                                    window.open(props.href, '_blank');
                                } catch (err) {
                                    console.error('Erro ao preparar download:', err);
                                    window.location.href = props.href || '#';
                                }
                            }
                        };

                        return (
                            <a 
                                {...props} 
                                onClick={handleDownloadClick}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={isExport ? "inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md mt-2 mb-2 cursor-pointer" : ""}
                            />
                        );
                    }
                }}
              >
                {cleanContent}
              </ReactMarkdown>
          ) : (
            <p className="text-sm leading-relaxed font-medium">{cleanContent}</p>
          )
        ) : hasFile ? (
          <p className="text-xs italic opacity-70">Processando arquivo...</p>
        ) : null}
      </div>
    );
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
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-gray-900 tracking-tight">Assistente Finora</h1>
                {isInstallable && !isPWA && (
                    <button 
                      onClick={installPWA}
                      title="Instalar Finora"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all animate-pulse"
                    >
                        <Download size={16} />
                    </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-green-600">Proativo & Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClearHistory}
              title={isConfirmingClear ? "Clique novamente para confirmar" : "Limpar Histórico"}
              className={`px-3 py-2.5 cursor-pointer bg-white border border-gray-200 rounded-2xl transition-all shadow-sm flex items-center gap-1.5 justify-center text-[10px] font-black uppercase tracking-wider ${
                isConfirmingClear 
                  ? 'bg-red-50 text-red-600 border-red-200 scale-105 shadow-red-50 animate-pulse' 
                  : 'text-red-500 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <Trash2 size={18} />
              {isConfirmingClear && <span>Confirmar?</span>}
            </button>
            <button 
              onClick={handleToggleSpeak} 
              className={`p-2.5 cursor-pointer rounded-2xl transition-all ${isAutoSpeakEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-400 border border-gray-200'}`}
            >
              {isAutoSpeakEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide bg-[#FDFDFD]">
          {messages.length <= 1 && (
            <div className="flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-blue-50/40 to-transparent rounded-[2rem] border border-blue-50/50 max-w-lg mx-auto my-6 animate-in fade-in zoom-in-95 duration-500">
              <span className="text-2xl mb-2">⚡</span>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-1">Perguntas Frequentes</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4">Escolha um atalho para iniciar</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full">
                {[
                  { label: "Onde mais gastei este mês?", query: "Onde mais gastei este mês?" },
                  { label: "O que posso cortar para economizar?", query: "O que posso cortar para economizar?" },
                  { label: "Meu caixa fechará positivo?", query: "Meu caixa vai fechar positivo este mês?" },
                  { label: "Posso comprar item de R$ 4.000?", query: "Posso comprar um notebook de R$ 4.000 à vista ou parcelado? Analise meu caixa." },
                  { label: "Quais contas vencem essa semana?", query: "Quais contas vencem essa semana?" },
                  { label: "Qual meu patrimônio líquido?", query: "Qual é o meu patrimônio líquido atual?" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestClick(item.query)}
                    className="p-3 bg-white border border-gray-100 hover:border-blue-200 rounded-2xl text-left text-xs font-semibold text-gray-600 hover:text-blue-600 hover:shadow-md hover:shadow-blue-50 transition-all active:scale-[0.98]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                  <button onClick={() => speak(m.content.replace(/\[FILE_PATH: .*?\]/g, '').trim())} className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 cursor-pointer text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
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

          {messages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {[
                { label: "📊 Onde mais gastei?", query: "Onde mais gastei este mês?" },
                { label: "💡 O que cortar?", query: "O que posso cortar para economizar?" },
                { label: "📉 Caixa positivo?", query: "Meu caixa vai fechar positivo este mês?" },
                { label: "💻 Simular Compra", query: "Posso comprar um notebook de R$ 4.000 à vista ou parcelado? Analise meu caixa." },
                { label: "📅 Vencimentos", query: "Quais contas vencem essa semana?" },
                { label: "🏦 Patrimônio", query: "Qual é o meu patrimônio líquido atual?" }
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestClick(item.query)}
                  disabled={isLoading}
                  className="flex-shrink-0 px-2.5 py-1 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-100 text-[9px] font-black uppercase tracking-wider text-gray-400 hover:text-blue-600 rounded-full transition-all active:scale-95 disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <div className="flex-1 relative flex items-center">
              {isRecording ? (
                <div className="w-full h-[52px] bg-red-50 border-2 border-red-100 rounded-2xl px-4 flex items-center justify-between text-red-600 animate-pulse overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button type="button" onClick={cancelRecording} className="p-2 cursor-pointer hover:bg-red-100 rounded-xl transition-all">
                        <Trash2 size={18} />
                    </button>
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
                    <span className="text-[10px] font-black uppercase tracking-widest truncate opacity-70">Gravando...</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    ref={chatInputRef}
                    className="w-full bg-gray-50 border-none rounded-2xl pl-5 pr-12 py-3.5 text-sm md:text-base text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner" 
                    placeholder={isUploading ? "Subindo..." : "Escreva aqui..."} 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    disabled={isUploading || isLoading} 
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-blue-600 transition-colors"><Paperclip size={20} /></button>
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf,.xlsx,.xls,.csv" />
                </div>
              )}
            </div>
            <button type={(!input.trim() && !attachedFile) ? "button" : "submit"} onClick={(!input.trim() && !attachedFile && !isLoading) ? (isRecording ? stopRecording : startRecording) : undefined} className={`p-3.5 cursor-pointer rounded-2xl shadow-xl transition-all active:scale-95 ${isRecording ? 'bg-red-500 text-white shadow-red-200' : 'bg-blue-600 text-white shadow-blue-200'}`}>
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : (!input.trim() && !attachedFile) ? (isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />) : <Send size={24} />}
            </button>
          </form>
        </div>
      </div>

      {permissionNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto"><ShieldAlert size={48} /></div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Privacidade Ativa</h2>
            <p className="text-gray-500 font-medium leading-relaxed">{permissionNotice}</p>
            <div className="flex flex-col gap-3">
                <Link href="/settings" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                   <Settings size={18} /> ABRIR CONFIGURAÇÕES
                </Link>
                <button onClick={() => setPermissionNotice(null)} className="w-full py-4 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95">FECHAR</button>
            </div>
          </div>
        </div>
      )}

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
