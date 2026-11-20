/**
 * VoiceAssistant.tsx
 * Floating orb voice assistant HUD with:
 *  - Web Audio API waveform visualizer
 *  - MediaRecorder -> Sarvam AI STT (saarika:v2) with Web Speech API fallback
 *  - POST /api/voice/chat for NLU + live telemetry answers
 *  - POST /api/voice/tts (bulbul:v1) with speechSynthesis fallback
 *  - Language selector: English | ಕನ್ನಡ | हिन्दी
 *  - Hands-free actions: appliance toggle, tab switch, zoom to transformer
 */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from 'react';
import {
  Mic,
  MicOff,
  X,
  Loader2,
  Volume2,
  VolumeX,
  ChevronDown,
  Zap,
  CircleHelp,
  Send,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import { useEnergyStore } from '../../stores/energyStore';
import { energyWs } from '../../services/websocket';
import { GridIncident } from '../../types/energy';

const TX_3D_COORDS: Record<string, [number, number, number]> = {
  tx_indiranagar: [-9, 0, 6],
  tx_koramangala: [9, 0, 6],
  tx_yelahanka: [0, 0, -10],
  tx_whitefield: [11, 0, -7],
  tx_jayanagar: [-8, 0, -5],
  tx_hebbal: [-4, 0, -12],
};
type LangCode = 'en-IN' | 'kn-IN' | 'hi-IN';
const LANGS: { code: LangCode; label: string; short: string }[] = [
  { code: 'en-IN', label: 'English', short: 'EN' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ', short: 'ಕ' },
  { code: 'hi-IN', label: 'हिन्दी', short: 'हि' },
];

// ─── Sample queries ───────────────────────────────────────────────────────────
const SAMPLE_QUERIES: Record<LangCode, string[]> = {
  'en-IN': [
    'What is my estimated bill?',
    'Which transformer in Yelahanka is overheating?',
    'Turn off the EV charger',
    'Show BESCOM grid status',
  ],
  'kn-IN': [
    'ನನ್ನ ಈ ತಿಂಗಳ ಬಿಲ್ ಎಷ್ಟು?',
    'ಯಲಹಂಕದಲ್ಲಿ ಯಾವ ಟ್ರಾನ್ಸ್‌ಫಾರ್ಮರ್ ಬಿಸಿಯಾಗಿದೆ?',
    'EV ಚಾರ್ಜರ್ ಆಫ್ ಮಾಡಿ',
  ],
  'hi-IN': [
    'मेरा बिजली बिल कितना है?',
    'कौन सा ट्रांसफार्मर गरम हो रहा है?',
    'EV चार्जर बंद करो',
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  action?: string;
}

// ─── Waveform Visualizer ─────────────────────────────────────────────────────
const WaveformVisualizer: React.FC<{ analyserNode: AnalyserNode | null; isActive: boolean }> = ({
  analyserNode,
  isActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode || !isActive) {
      cancelAnimationFrame(rafRef.current);
      // Clear canvas when inactive
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyserNode.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#10B981';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#10B981';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={48}
      className="rounded-lg opacity-90"
    />
  );
};

// ─── Orb pulse ring ───────────────────────────────────────────────────────────
const OrbRing: React.FC<{ active: boolean }> = ({ active }) => (
  <div className={`absolute inset-0 rounded-full border-2 transition-all duration-700 ${
    active
      ? 'border-emerald-400/70 scale-110 animate-ping'
      : 'border-cyan-500/40 scale-100'
  }`} />
);

// ─── Main component ───────────────────────────────────────────────────────────
export const VoiceAssistant: React.FC = () => {
  const isOpen = useEnergyStore((s) => s.voiceModalOpen);
  const setOpen = useEnergyStore((s) => s.setVoiceModalOpen);
  const setPortalMode = useEnergyStore((s) => s.setPortalMode);
  const setBescomViewMode = useEnergyStore((s) => s.setBescomViewMode);
  const setSelectedTransformerId = useEnergyStore((s) => s.setSelectedTransformerId);
  const flyToAsset = useEnergyStore((s) => s.flyToAsset);
  const authRole = useEnergyStore((s) => s.authRole);
  const user = useEnergyStore((s) => s.user);
  const homeLocality = useEnergyStore((s) => s.telemetry.smart_home.locality);

  const [lang, setLang] = useState<LangCode>('en-IN');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState('Power outage');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentLocality, setIncidentLocality] = useState(user?.locality || homeLocality);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [myIncidents, setMyIncidents] = useState<GridIncident[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      sender: 'ai',
      text: 'Namaste! I am EnergyQ Voice AI. Ask me about your bill, appliances, or BESCOM grid status in English, Kannada, or Hindi.',
    },
  ]);

  // Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const msgIdRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Web Speech fallback
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(
    typeof window !== 'undefined' ? window.speechSynthesis : null
  );

  const nextId = () => ++msgIdRef.current;

  const addMessage = (msg: Omit<Message, 'id'>) => {
    setMessages((prev) => [...prev, { id: nextId(), ...msg }]);
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen || authRole !== 'consumer') return;
    let active = true;
    const refreshIncidents = async () => {
      try {
        const reports = await energyWs.listMyIncidents();
        if (active) setMyIncidents(reports);
      } catch (error) {
        if (active) console.error('Could not refresh service reports:', error);
      }
    };
    void refreshIncidents();
    const intervalId = window.setInterval(() => void refreshIncidents(), 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isOpen, authRole]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      audioCtxRef.current?.close();
    };
  }, []);

  // ── Audio setup ──────────────────────────────────────────────────────────
  const setupAudioContext = async (stream: MediaStream) => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    const analyser = audioCtxRef.current.createAnalyser();
    analyser.fftSize = 512;
    const source = audioCtxRef.current.createMediaStreamSource(stream);
    source.connect(analyser);
    analyserRef.current = analyser;
    sourceRef.current = source;
  };

  // ── TTS playback ─────────────────────────────────────────────────────────
  const playTTS = useCallback(
    async (text: string) => {
      if (isMuted) return;
      try {
        const result = await energyWs.queryVoiceTTS(text, lang);
        if (result.audio_base64) {
          const binary = atob(result.audio_base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.play().catch(() => fallbackTTS(text));
          return;
        }
      } catch {
        // fall through
      }
      fallbackTTS(text);
    },
    [isMuted, lang]
  );

  const fallbackTTS = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    synthRef.current.speak(utter);
  };

  // ── Handle voice action from AI response ─────────────────────────────────
  const handleAction = (action?: string, transformerId?: string) => {
    if (!action) return;
    if (action === 'switch_to_bescom' || action === 'show_grid') {
      setPortalMode('bescom');
    } else if (action === 'switch_to_consumer') {
      setPortalMode('consumer');
    } else if ((action === 'inspect_transformer' || action === 'zoom_transformer') && transformerId) {
      setPortalMode('bescom');
      setBescomViewMode('3d');
      setSelectedTransformerId(transformerId);
      const coords = TX_3D_COORDS[transformerId] || [0, 8, 12];
      flyToAsset(coords);
    }
  };

  // ── Process text query ────────────────────────────────────────────────────
  const processQuery = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      addMessage({ sender: 'user', text });
      setIsProcessing(true);

      try {
        const chatResult = await energyWs.queryVoiceChat(text.trim(), lang);
        const responseText = chatResult.response_text || 'Processing complete.';
        addMessage({
          sender: 'ai',
          text: responseText,
          action: chatResult.action_executed,
        });
        handleAction(chatResult.action_executed, chatResult.transformer_id);
        await playTTS(responseText);
      } catch (err) {
        const fallback = 'I could not connect to EnergyQ right now. Please try again when the service is available.';
        addMessage({ sender: 'ai', text: fallback });
        await playTTS(fallback);
      } finally {
        setIsProcessing(false);
      }
    },
    [lang, playTTS]
  );

  // ── Recording start ───────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      await setupAudioContext(stream);

      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        analyserRef.current = null;
        setIsRecording(false);
        setIsProcessing(true);

        try {
          // Try Sarvam AI STT
          const sttResult = await energyWs.queryVoiceSTT(blob, lang);
          if (sttResult.transcript) {
            await processQuery(sttResult.transcript);
          } else {
            addMessage({ sender: 'ai', text: 'Could not understand audio. Please try again or type your query.' });
            setIsProcessing(false);
          }
        } catch {
          setIsProcessing(false);
          addMessage({ sender: 'ai', text: 'STT service unavailable. Please type your query.' });
        }
      };

      mr.start(100);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (err: any) {
      // Fallback to Web Speech API
      startWebSpeech();
    }
  };

  const startWebSpeech = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addMessage({ sender: 'ai', text: 'Microphone access denied. Please type your query below.' });
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setIsRecording(true);
    rec.onend = () => setIsRecording(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      processQuery(transcript);
    };
    rec.onerror = () => {
      setIsRecording(false);
      addMessage({ sender: 'ai', text: 'Could not capture speech. Please type your query.' });
    };
    rec.start();
    recognitionRef.current = rec;
  };

  // ── Recording stop ────────────────────────────────────────────────────────
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    analyserRef.current = null;
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    processQuery(inputText);
    setInputText('');
  };

  const handleIncidentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIncidentError(null);
    try {
      const incident = await energyWs.submitIncident({
        category: incidentCategory,
        description: incidentDescription,
        locality: incidentLocality,
      });
      setMyIncidents((current) => [incident, ...current]);
      addMessage({
        sender: 'ai',
        text: `Your ${incident.category.toLowerCase()} report was sent to the BESCOM service queue. Reference: ${incident.id.slice(0, 8).toUpperCase()}. You can follow the response here.`,
      });
      setIncidentDescription('');
      setIsReporting(false);
    } catch (error) {
      console.error('Could not submit grid incident:', error);
      setIncidentError('Could not send this report. Please check your connection and try again.');
    }
  };

  const activeLang = LANGS.find((l) => l.code === lang)!;
  const assistantPosition = authRole === 'operator' ? 'operator-assistant-position' : '';

  return (
    <>
      {/* ── Floating orb button ── */}
      {!isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 ${assistantPosition}`}>
          {/* Animated rings */}
          <div className="relative w-16 h-16">
            <OrbRing active={isRecording} />
            <button
              type="button"
              aria-label="Open EnergyQ help and voice assistant"
              className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              onClick={() => setOpen(true)}
            >
              <Mic className="w-6 h-6 text-white" />
            </button>
            {/* AI label */}
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
              <Zap className="w-3 h-3 text-slate-900" />
            </div>
          </div>
        </div>
      )}

      {/* ── Full HUD panel ── */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 w-[340px] sm:w-[380px] max-h-[calc(100vh-3rem)] flex flex-col gap-0 shadow-2xl rounded-2xl overflow-y-auto border border-emerald-500/30 bg-slate-950/95 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 ${assistantPosition}`}>

          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-900/60 to-cyan-900/60 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-slate-900" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-300 leading-none">EnergyQ Voice AI</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">Sarvam AI · Multilingual</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {authRole === 'consumer' && (
                <button
                  type="button"
                  onClick={() => { setIncidentError(null); setIsReporting((value) => !value); }}
                  aria-expanded={isReporting}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition ${
                    isReporting
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                      : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <CircleHelp className="w-3.5 h-3.5" />
                  <span>Help / report</span>
                </button>
              )}
              {/* Language selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLangPicker((v) => !v)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 transition"
                >
                  <span>{activeLang.label}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showLangPicker && (
                  <div className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden z-10">
                    {LANGS.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { setLang(l.code); setShowLangPicker(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition ${
                          l.code === lang ? 'text-emerald-300 font-bold bg-emerald-900/30' : 'text-slate-300'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mute TTS */}
              <button
                onClick={() => setIsMuted((v) => !v)}
                title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
                className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-red-900/40 text-slate-400 hover:text-red-300 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isReporting && authRole === 'consumer' && (
            <form onSubmit={handleIncidentSubmit} className="px-3 py-3 bg-amber-950/30 border-b border-amber-500/20 space-y-2.5">
              <p className="text-[11px] font-semibold text-amber-100">Send a service request to BESCOM</p>
              <label className="block text-[10px] text-slate-300">
                Issue type
                <select
                  value={incidentCategory}
                  onChange={(event) => setIncidentCategory(event.target.value)}
                  className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-xs text-white"
                >
                  <option>Power outage</option>
                  <option>Low or fluctuating voltage</option>
                  <option>Meter or connection issue</option>
                  <option>Unsafe electrical condition</option>
                  <option>Other grid issue</option>
                </select>
              </label>
              <label className="block text-[10px] text-slate-300">
                Where is the issue?
                <div className="relative mt-1">
                  <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-amber-300" />
                  <input
                    value={incidentLocality}
                    onChange={(event) => setIncidentLocality(event.target.value)}
                    required
                    maxLength={128}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-8 pr-2.5 py-2 text-xs text-white"
                  />
                </div>
              </label>
              <label className="block text-[10px] text-slate-300">
                Tell us what happened
                <textarea
                  value={incidentDescription}
                  onChange={(event) => setIncidentDescription(event.target.value)}
                  required
                  minLength={8}
                  maxLength={2000}
                  rows={3}
                  placeholder="Describe the effect on your electricity service..."
                  className="mt-1 w-full resize-y rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-xs text-white placeholder:text-slate-500"
                />
              </label>
              {incidentError && <p role="alert" className="text-[10px] text-red-300">{incidentError}</p>}
              <button
                type="submit"
                disabled={incidentDescription.trim().length < 8 || !incidentLocality.trim()}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Send to BESCOM
              </button>
            </form>
          )}

          {/* Waveform */}
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/60">
            <WaveformVisualizer analyserNode={analyserRef.current} isActive={isRecording} />
            {!isRecording && (
              <div className="text-[10px] text-slate-500 text-center pt-1">
                {isProcessing ? 'Processing...' : `Tap mic to speak · ${activeLang.label}`}
              </div>
            )}
            {isRecording && (
              <div className="text-[10px] text-emerald-400 text-center pt-1 animate-pulse">
                🔴 Listening... Tap again to stop
              </div>
            )}
          </div>

          {/* Message thread */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-2 max-h-64 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-br from-cyan-600/80 to-blue-700/80 text-white rounded-br-sm'
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-sm'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.action && (
                    <p className="mt-1 text-[10px] text-emerald-400 font-mono">
                      ⚡ Action: {msg.action}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {authRole === 'consumer' && myIncidents.slice(0, 3).map((incident) => (
              <div key={incident.id} className="rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200">{incident.category} · {incident.locality}</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold capitalize ${
                    incident.status === 'resolved' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'
                  }`}>{incident.status}</span>
                </div>
                {incident.response && (
                  <p className="mt-1.5 flex gap-1 text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>BESCOM: {incident.response}</span>
                  </p>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                  <span className="text-xs text-slate-400">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick sample queries */}
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
            {SAMPLE_QUERIES[lang].slice(0, 3).map((q, i) => (
              <button
                key={i}
                onClick={() => processQuery(q)}
                disabled={isProcessing}
                className="flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-40 whitespace-nowrap"
              >
                {q.length > 28 ? q.slice(0, 28) + '…' : q}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2 px-3 pb-3">
            {/* Mic button */}
            <button
              onClick={toggleRecording}
              disabled={isProcessing}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isRecording
                  ? 'bg-red-500 shadow-red-500/40 scale-110 animate-pulse'
                  : 'bg-gradient-to-br from-emerald-500 to-cyan-600 hover:scale-105 shadow-emerald-500/30'
              } disabled:opacity-50`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4 text-white" />
              ) : (
                <Mic className="w-4 h-4 text-white" />
              )}
            </button>

            {/* Text input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder={lang === 'kn-IN' ? 'ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ...' : lang === 'hi-IN' ? 'यहाँ टाइप करें...' : 'Type a query...'}
              disabled={isProcessing}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50 transition"
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={isProcessing || !inputText.trim()}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center hover:scale-105 transition disabled:opacity-40 shadow-lg shadow-cyan-500/20"
            >
              <Zap className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
