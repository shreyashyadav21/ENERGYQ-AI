import React, { useState, useEffect } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Send,
  Zap,
  Globe,
  CheckCircle2
} from 'lucide-react';
import { useEnergyStore } from '../../stores/energyStore';
import { energyWs } from '../../services/websocket';

interface VoiceQueryPill {
  text: string;
  lang: 'en' | 'kn' | 'hi';
}

export const VoiceAssistantModal: React.FC = () => {
  const isOpen = useEnergyStore((s) => s.voiceModalOpen);
  const setOpen = useEnergyStore((s) => s.setVoiceModalOpen);

  const [language, setLanguage] = useState<'en' | 'kn' | 'hi'>('en');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Array<{ sender: 'user' | 'ai'; text: string; action?: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am EnergyQ Voice AI. Ask me about your bill, toggle appliances, or check BESCOM grid status in English, Kannada, or Hindi.',
    },
  ]);

  // Web Speech Recognition setup
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendQuery(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Speech Recognition is not supported by your browser. Please type your query.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang =
        language === 'kn' ? 'kn-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Speech start error:', e);
      }
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'kn' ? 'kn-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendQuery = async (queryToSend?: string) => {
    const q = (queryToSend || inputText).trim();
    if (!q) return;

    setConversation((prev) => [...prev, { sender: 'user', text: q }]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await energyWs.queryVoice(q, language);
      const reply = res.response_text || 'Query processed successfully.';

      setConversation((prev) => [
        ...prev,
        { sender: 'ai', text: reply, action: res.action_executed },
      ]);
      speakText(reply);
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Unable to reach Voice Engine. Ensuring continuous local operation.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const samplePills: Record<string, string[]> = {
    en: [
      'Turn off AC',
      'What is my projected bill?',
      'Check BESCOM grid health',
      'Simulate overload',
    ],
    kn: [
      'ಎಸಿ ಆಫ್ ಮಾಡಿ',
      'ನನ್ನ ವಿದ್ಯುತ್ ಬಿಲ್ ಎಷ್ಟು?',
      'ವಿದ್ಯುತ್ ವ್ಯತ್ಯಯದ ಸ್ಥಿತಿ ಏನು?',
      'ಫೀಡರ್ ಪರೀಕ್ಷೆ',
    ],
    hi: [
      'एसी बंद करो',
      'बिजली का बिल कितना है?',
      'ग्रिड का क्या हाल है?',
      'ओवरलोड टेस्ट',
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Multilingual Voice AI Assistant
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Sarvam AI Ready
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Natural speech & appliance voice control in English, Kannada, and Hindi
              </p>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Selector Bar */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Language:</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                language === 'en'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('kn')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                language === 'kn'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              ಕನ್ನಡ (Kannada)
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                language === 'hi'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              हिंदी (Hindi)
            </button>
          </div>
        </div>

        {/* Conversation Message Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {conversation.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-none shadow-sm'
                }`}
              >
                {msg.text}
                {msg.action && (
                  <div className="mt-1 pt-1 border-t border-slate-700/40 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Action Executed: {msg.action}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Analyzing speech intent with EnergyQ AI...</span>
            </div>
          )}
        </div>

        {/* Quick Sample Prompts Pills */}
        <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">
            Try Asking:
          </span>
          {samplePills[language].map((pill, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(pill)}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700/70 whitespace-nowrap transition-colors"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Input Bar & Microphone Control */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={toggleListening}
            className={`p-3 rounded-xl transition-all shadow-md ${
              isListening
                ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700'
            }`}
            title={isListening ? 'Listening... click to stop' : 'Click to speak'}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
            placeholder={
              language === 'kn'
                ? 'ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ (ಉದಾ: ಎಸಿ ಆಫ್ ಮಾಡಿ)...'
                : language === 'hi'
                ? 'अपना सवाल लिखें (उदा: एसी बंद करो)...'
                : 'Ask a question or issue a voice command...'
            }
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 transition-colors"
          />

          <button
            onClick={() => handleSendQuery()}
            disabled={!inputText.trim() || isLoading}
            className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
