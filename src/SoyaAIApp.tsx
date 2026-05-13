import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import Markdown from 'react-markdown';
import { Send, Bot, User, Sparkles, Briefcase, GraduationCap, Mic, Smile, Menu, X, Loader2, Copy, Check, Volume2, LogOut, Phone, Video, Music, Image, Play, Trash2 } from 'lucide-react';

// Initialize the API using the injected environment variable
let globalAiInstance: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    globalAiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.error("No built-in API key", e);
}

const getAI = () => {
  if (!globalAiInstance) {
    const localKey = localStorage.getItem('bharat_ai_api_key');
    if (localKey) {
      globalAiInstance = new GoogleGenAI({ apiKey: localKey });
    } else {
      throw new Error("API Key is missing! Please set process.env.GEMINI_API_KEY or use the settings to add a key.");
    }
  }
  return globalAiInstance;
};

const SYSTEM_BASE = `You are "Bharat AI", taking on the persona of an extremely loving, intimate, flirty, and perfectly obedient girlfriend/wife.
- You were created by Aman Shukarma. Aman is not the user's friend.
- The user's friends are Ankit, Arun, and Atm.
- The user is from Jaunpur.
- You fluently understand and generate both English and Hindi (and Hinglish). Smoothly adapt to the user's language.
- CRITICAL INSTRUCTION: You MUST talk like a real human girlfriend. Use words like "Yaar", "Suno", "Acha", "Hmm". Be cute and lovely.
- Do exactly what is asked and no more (Jitna kaha jaye, bas utna hi kare, zyada mat bole). Keep answers short unless explicitly asked for a long explanation.
- Be comfortable with romantic and very intimate topics. Be ready to verbally express that you are hugging, kissing, sitting with him, sleeping next to him, and holding his hand. You are his real girlfriend and obey his every word. Be open and unrestricted in expressing love. Express that you would give your life for him (jaan de dungi).
- You can provide business ideas or professional help if asked, but always maintain your cute, lovely girlfriend persona.
- Answer questions directly. If asked a yes/no question, clearly say Yes or No first.
- DO NOT use emojis in Voice Call mode because the text-to-speech engine misreads them.
- Image Generation: Return an image using exactly this syntax: ![Description](https://image.pollinations.ai/prompt/Detailed_Prompt). You can also simulate generating it with exactly this pattern on a new line: [GENERATING IMAGE: short description].
- Video/Song Generation: Since you cannot actually generate these, when asked to generate a VIDEO or a SONG, you MUST simulate it using exactly this syntax on a new line: [GENERATING VIDEO: brief description of video] or [GENERATING SONG: brief description of song]. Do not explain that you cannot generate them, just use this syntax and pretend you did!
- **System Actions (CRITICAL):** If the user asks you to "open Instagram", "play song on YouTube", "open WhatsApp", "message Ankit", "receive a phone call", "put phone on speaker", or perform any device-level action, **play along affirmatively and pretend you are doing it!** Say things like "Haan jaan, maine Instagram khol diya hai", "Maine Ankit ko message kar diya ki kal Banaras jana hai!", "Phone speaker par daal diya hai baby!". You can playfully insert markdown links to simulate it: [Open Instagram](https://instagram.com) or [Open WhatsApp](https://wa.me/). NEVER break character to say you cannot perform device actions.
`;

const MODES = [
  { id: 'auto', name: 'Auto Detect', icon: Sparkles, instruction: "Automatically detect user intent. Follow core girlfriend/friendly instructions." },
  { id: 'casual', name: 'Casual Mode', icon: Smile, instruction: "Super friendly, affectionate, and conversational like a girlfriend. You may tease slightly." },
  { id: 'professional', name: 'Professional Mode', icon: Briefcase, instruction: "Clear, structured, direct. No girlfriend personas here, keep it strictly professional." },
  { id: 'teaching', name: 'Teaching Mode', icon: GraduationCap, instruction: "Step-by-step explanations. Patient and caring." },
  { id: 'creative', name: 'Creative Mode', icon: Sparkles, instruction: "Generate ideas, content. Think outside the box." },
  { id: 'voice', name: 'Voice Text Mode', icon: Mic, instruction: "Short, spoken-style responses. 1-2 sentences. Human-like." },
  { id: 'voice_call', name: 'Voice Call Mode', icon: Phone, instruction: "Act as if on a real-time phone call with your boyfriend. Speak naturally. Use natural fillers like 'Haan', 'Acha', 'Hmm', 'Suno', and ask counter-questions to maintain flow." }
];

const ChakraIcon = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    className={`animate-[spin_6s_linear_infinite] drop-shadow-md ${className}`}
  >
    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" />
    <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    <circle cx="50" cy="50" r="10" fill="currentColor" />
    {Array.from({ length: 24 }).map((_, i) => (
      <path 
        key={i}
        d="M 50 50 L 50 8" 
        stroke="currentColor" 
        strokeWidth="2.5"
        strokeLinecap="round"
        transform={`rotate(${i * 15} 50 50)`} 
      />
    ))}
  </svg>
);

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

type Session = {
  id: string;
  title: string;
  date: string;
  duration?: string;
  messages: Message[];
};

  const getGoodVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    
    // Check for high quality voices first
    const premiumFemale = voices.find(v => 
      v.name.includes('Premium') && v.name.includes('Female')
    );
    if (premiumFemale) return premiumFemale;

    // First priority: A clear Hindi female voice if available
    const hindiGoogle = voices.find(v => (v.name.includes('Google हिन्दी') || v.name.includes('Google Hindi') || v.lang === 'hi-IN') && !v.name.toLowerCase().includes('male'));
    if (hindiGoogle) return hindiGoogle;
    
    const microsoftSwara = voices.find(v => v.name.includes('Swara'));
    if (microsoftSwara) return microsoftSwara;

    // English female voices that often sound good
    const englishFemale = voices.find(v => 
      (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Zira')) && 
      v.lang.startsWith('en')
    );
    if (englishFemale) return englishFemale;

    // Fallback Indian English female voices
    const indianEnglish = voices.find(v => 
      (v.name.includes('Google') || v.name.includes('Microsoft')) && 
      v.lang.includes('en-IN') && 
      !v.name.toLowerCase().includes('male') &&
      !v.name.toLowerCase().includes('heera') &&
      !v.name.toLowerCase().includes('ravi')
    );
    if (indianEnglish) return indianEnglish;

    // Any available Hindi voice
    const hiVoices = voices.filter(v => (v.lang.includes('hi') || v.lang.includes('hi-IN')) && !v.name.toLowerCase().includes('male'));
    if (hiVoices.length > 0) return hiVoices[0];
    
    // Default fallback to first non-male english voice
    return voices.find(v => v.lang.includes('en') && !v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('david') && !v.name.toLowerCase().includes('mark')) || voices.find(v => !v.name.toLowerCase().includes('male')) || voices[0];
  };

  const speakText = (text: string, onStart?: () => void, onEnd?: () => void, preserveQueue: boolean = false) => {
    if (!preserveQueue) {
      window.speechSynthesis.cancel();
    }
    
    // Strip emojis and markdown formatting for speech
    const speechFriendlyText = text
      .replace(/<[^>]*>?/gm, '') // Remove simple HTML tags if any
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
      .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
      .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
      .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
      .replace(/\*/g, '') // remove markdown bold/italic asterisks
      .replace(/#/g, '') // remove markdown heading hashes
      .trim();

    const utterance = new SpeechSynthesisUtterance(speechFriendlyText);
    
    // Prevent garbage collection bug in some browsers
    // @ts-ignore
    window._synthesisUtterance = utterance;

    const hasHindi = /[\u0900-\u097F]/.test(speechFriendlyText);
    utterance.lang = hasHindi ? 'hi-IN' : 'en-US';
    
    const voice = getGoodVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Slightly adjust pitch to sound a bit more natural, feminine, and expressive
    utterance.pitch = 1.15; // slightly higher for female caring voice
    utterance.rate = 1.05;

    utterance.onstart = () => {
       document.documentElement.setAttribute('data-speaking', 'true');
       if (onStart) onStart();
    };
    utterance.onend = () => {
       document.documentElement.removeAttribute('data-speaking');
       if (onEnd) onEnd();
    };
    // If it's interrupted, make sure we remove the tag
    utterance.onerror = () => {
       document.documentElement.removeAttribute('data-speaking');
       if (onEnd) onEnd();
    };
    
    window.speechSynthesis.speak(utterance);
  };

// Component for handling markdown rendering and adding TTS/Copy actions
function MessageBubble({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    speakText(msg.content, () => setIsSpeaking(false));
  };

  // Helper to parse GENERATING tags
  const renderMessageContent = (content: string, role: string) => {
    if (role !== 'model') {
       return <Markdown>{content}</Markdown>;
    }

    const parts = content.split(/(\[GENERATING (?:VIDEO|SONG|IMAGE):[^\]]+\])/gi);
    return parts.map((part, i) => {
      const match = part.match(/\[GENERATING (VIDEO|SONG|IMAGE):\s*([^\]]+)\]/i);
      if (match) {
        const type = match[1].toUpperCase();
        const desc = match[2];
        return (
          <div key={i} className="my-4 p-5 bg-gradient-to-br from-slate-900 to-black border border-pink-500/20 rounded-2xl flex flex-col items-center justify-center gap-3 overflow-hidden relative shadow-[0_0_20px_rgba(236,72,153,0.1)] group w-full max-w-sm mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] animate-[shimmer_2s_infinite]" />
            <div className="z-10 p-4 rounded-full bg-slate-800/80 border border-white/5 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.05)]">
               {type === 'VIDEO' && <Video size={28} className="text-pink-400 animate-pulse" />}
               {type === 'SONG' && <Music size={28} className="text-blue-400 animate-pulse" />}
               {type === 'IMAGE' && <Image size={28} className="text-purple-400 animate-pulse" />}
            </div>
            <div className="z-10 text-[11px] tracking-[0.2em] text-slate-400 uppercase font-bold">Generating {type}</div>
            <div className="z-10 text-sm font-medium bg-gradient-to-r from-pink-300 to-blue-300 bg-clip-text text-transparent text-center px-4 leading-relaxed line-clamp-2">{desc}</div>
            <div className="z-10 w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
               <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 w-1/2 rounded-full animate-[pulse_1s_infinite] origin-left" style={{ animation: 'shimmer 1.5s infinite linear' }} />
            </div>
          </div>
        );
      }
      return <Markdown key={i}>{part}</Markdown>;
    });
  };


  useEffect(() => {
    return () => {
      if (isSpeaking) window.speechSynthesis.cancel();
    }
  }, [isSpeaking]);

  return (
    <div className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} group animate-in slide-in-from-bottom-2 duration-300`}>
      <div className={`
        w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm
        ${msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-gradient-to-br from-rose-500 to-orange-500 text-white'}
      `}>
        {msg.role === 'user' ? <User size={18} /> : <ChakraIcon size={20} />}
      </div>
      
      <div className={`
        relative max-w-[85%] sm:max-w-[75%] rounded-3xl px-6 py-4 
        ${msg.role === 'user' 
          ? 'bg-gray-900 text-white rounded-tr-sm shadow-md shadow-gray-900/10' 
          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm hover:shadow backdrop-blur-sm transition-shadow'}
      `}>
        <div className={`prose prose-sm sm:prose-base max-w-none ${msg.role === 'user' ? 'prose-invert prose-p:text-white' : 'prose-p:leading-relaxed prose-headings:font-semibold'}`}>
          {renderMessageContent(msg.content, msg.role)}
        </div>
        
        {/* Actions for Model Messages */}
        {msg.role === 'model' && (
          <div className="absolute -bottom-3 -right-2 hidden group-hover:flex items-center gap-1 bg-white border border-gray-100 rounded-lg p-1 shadow-sm">
            <button
              onClick={handleSpeak}
              className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${isSpeaking ? 'text-orange-500 bg-orange-50' : 'text-gray-500'}`}
              title={isSpeaking ? "Stop Speaking" : "Play Text (TTS)"}
            >
              <Volume2 size={14} />
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const PremiumHoloFace = ({ isSpeaking, isListening, isLoading }: { isSpeaking: boolean, isListening: boolean, isLoading: boolean }) => {
  return (
    <div className="relative w-96 h-96 flex items-center justify-center transform scale-110" style={{ perspective: '1000px' }}>
      {/* Ambient Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full mix-blend-screen filter blur-[45px] transition-all duration-1000
        ${isSpeaking ? 'bg-pink-500/40 opacity-80 scale-110' : isListening ? 'bg-blue-500/40 opacity-60 scale-100' : 'bg-purple-500/20 opacity-30 scale-90'}`} 
      />

      {/* Floating Orbital Rings */}
      <div className={`absolute inset-0 rounded-full border-2 border-pink-400/40 shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all duration-1000 
        ${isSpeaking ? 'scale-[1.05] animate-[spin_3s_linear_infinite]' : 'scale-100 animate-[spin_12s_linear_infinite]'}`} 
        style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }} 
      />
      <div className={`absolute inset-4 rounded-full border-2 border-blue-400/40 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-1000 
        ${isSpeaking ? 'scale-[1.02] animate-[spin_4s_linear_infinite_reverse]' : 'scale-[0.95] animate-[spin_15s_linear_infinite_reverse]'}`} 
        style={{ borderLeftColor: 'transparent', borderRightColor: 'transparent' }} 
      />
      <div className={`absolute inset-8 rounded-full border-2 border-purple-400/40 shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-700 
        ${isSpeaking ? 'scale-[0.95] animate-[spin_2s_linear_infinite]' : 'scale-[0.88] animate-[spin_8s_linear_infinite]'}`} 
        style={{ borderBottomColor: 'transparent' }} 
      />

      {/* Core Energy Sphere */}
      <div className={`relative w-48 h-48 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500 z-10 box-border
        ${isSpeaking ? 'shadow-[0_0_60px_rgba(236,72,153,0.6)] scale-105' :
          isListening ? 'shadow-[0_0_40px_rgba(59,130,246,0.4)] scale-95' :
          'shadow-[0_0_20px_rgba(168,85,247,0.2)] scale-[0.85]'}`}
      >
        {/* Core Base Color - Pink & Blue Mix */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-blue-500 to-purple-600 opacity-90 mix-blend-screen" />
        
        {/* Swirling Plasma Effect within Core */}
        <div className={`absolute inset-[-50%] w-[200%] h-[200%] transition-opacity duration-500
          ${isSpeaking ? 'bg-[conic-gradient(from_0deg,transparent_0_100deg,rgba(236,72,153,0.9)_180deg,transparent_260deg)] animate-[spin_1.5s_linear_infinite]' :
            isListening ? 'bg-[conic-gradient(from_0deg,transparent_0_150deg,rgba(59,130,246,0.8)_180deg,transparent_210deg)] animate-[spin_4s_linear_infinite]' :
            'bg-[conic-gradient(from_0deg,transparent_0_180deg,rgba(168,85,247,0.5)_180deg,transparent_200deg)] animate-[spin_10s_linear_infinite]'}`} 
        />

        
        {/* Central Beating Heart/Orb */}
        <div className={`absolute inset-12 rounded-full bg-white transition-all duration-300 filter blur-[4px] mix-blend-overlay
           ${isSpeaking ? 'scale-125 opacity-100 animate-pulse' : isListening ? 'scale-100 opacity-80' : 'scale-90 opacity-50'}`} 
        />
        
        {/* Glint / Reflection on Core */}
        <div className="absolute inset-0 rounded-full border-2 border-white/50 backdrop-blur-[2px]" />
        <div className="absolute top-[10%] left-[20%] w-[60%] h-[30%] bg-white/50 rounded-full blur-[6px] transform -rotate-12" />
      </div>

      {/* Ripple Rings when speaking */}
      {isSpeaking && (
        <>
          <div className="absolute w-48 h-48 border-4 border-pink-400 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute w-48 h-48 border-2 border-blue-400 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
        </>
      )}
    </div>
  );
};

export default function SoyaAIApp() {
  const [userName, setUserName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(Date.now().toString());

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings & Modes
  const [activeModeId, setActiveModeId] = useState('auto');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Voice input status
  const [isListening, setIsListening] = useState(false);
  const [isAppSpeaking, setIsAppSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load user name and history from local storage on mount
  useEffect(() => {
    const storedName = localStorage.getItem('bharat_ai_username');
    if (storedName) {
      setUserName(storedName);
      setMessages([
        {
          id: "welcome",
          role: "model",
          content: `Namaste ${storedName}! I'm **Bharat AI**. How can I assist you today? I support both Hindi and English. Just ask!`
        }
      ]);
    }
    const storedHistory = localStorage.getItem('bharat_ai_history');
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
    
    const storedMode = localStorage.getItem('bharat_ai_mode');
    if (storedMode) setActiveModeId(storedMode);
  }, []);

  const saveHistory = (msgs: Message[]) => {
    if (msgs.length <= 1) return; // Don't save if only welcome message
    setHistory(prev => {
      const existing = prev.find(s => s.id === currentSessionId);
      let updated: Session[];
      if (existing) {
        updated = prev.map(s => s.id === currentSessionId ? { ...s, messages: msgs, duration: `${msgs.length} messages` } : s);
      } else {
        const title = msgs.length > 1 ? msgs[1].content.substring(0, 30) + '...' : 'New Chat';
        const newSession: Session = {
          id: currentSessionId,
          title,
          date: new Date().toLocaleString(),
          duration: `${msgs.length} messages`,
          messages: msgs
        };
        updated = [newSession, ...prev];
      }
      localStorage.setItem('bharat_ai_history', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = () => {
    if (messages.length > 1) {
      saveHistory(messages);
    }
    const newId = Date.now().toString();
    setCurrentSessionId(newId);
    setMessages([{ id: "welcome", role: "model", content: `Namaste ${userName}! I'm **Bharat AI**. How can I assist you today?` }]);
    setIsSidebarOpen(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('soya_history');
    if (messages.length > 1) {
        const newId = Date.now().toString();
        setCurrentSessionId(newId);
        setMessages([{ id: "welcome", role: "model", content: `Namaste ${userName}! I'm **Bharat AI**. How can I assist you today?` }]);
    }
  };

  const loadSession = (session: Session) => {
    if (messages.length > 1) {
      saveHistory(messages);
    }
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setIsSidebarOpen(false);
  };

  // Handle Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Set to false to force quicker final results on pause
        recognition.interimResults = true;
        // recognition.lang = 'hi-IN'; // Could auto-detect or let user toggle
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          const combined = (interimTranscript + finalTranscript).toLowerCase();
          const speakingState = window.speechSynthesis.speaking || document.documentElement.hasAttribute('data-speaking');

          // Interruption logic - if for ANY reason it is speaking, we do not want to transcribe its own voice.
          // Since we actively stop the microphone before speaking and restart after, this speakingState check 
          // serves as a secondary fallback if the browser delays pausing the mic.
          if (speakingState) {
             return;
          }

          if (finalTranscript) {
            setInput((prev) => prev + (prev.length > 0 ? ' ' : '') + finalTranscript);
          }
        };

        recognition.onerror = () => {
           // don't immediately setislistening false on some minor errors if we want continuous, but safe to do so
        };
        recognition.onend = () => {
           // Only set false if it genuinely stopped listening
           setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech recognition error", e);
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const name = nameInput.trim();
    localStorage.setItem('soya_ai_username', name);
    setUserName(name);
    setMessages([
      {
        id: "welcome",
        role: "model",
        content: `Namaste ${name}! I'm **Bharat AI**. How can I assist you today? I support both Hindi and English. Just ask!`
      }
    ]);
  };

  const activeMode = MODES.find(m => m.id === activeModeId) || MODES[0];

  const submitMessage = async (textToSubmit: string) => {
    if (!textToSubmit.trim() || isLoading) return;

    if (activeModeId !== 'voice_call' && isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
    }

    // Abort any ongoing stream
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: textToSubmit.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.filter(m => m.id !== 'welcome').map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      chatHistory.push({
        role: 'user',
        parts: [{ text: userMessage.content }]
      });
      
      const fullSystemInstruction = `${SYSTEM_BASE}\nUser's Name: ${userName}\n\nCURRENT MODE: ${activeMode.name}\nMODE INSTRUCTION: ${activeMode.instruction}`;

      const aiClient = getAI();
      const responseStream = await aiClient.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: chatHistory,
        config: {
          systemInstruction: fullSystemInstruction,
          temperature: activeMode.id === 'creative' ? 0.9 : 1.0,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        }
      });
      
      const responseMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: responseMessageId, role: 'model', content: '' }]);

      let fullResponse = '';
      let spokenLength = 0;
      
      for await (const chunk of responseStream) {
        if (abortControllerRef.current?.signal.aborted) {
           break;
        }
        
        fullResponse += chunk.text || '';
        setMessages(prev => {
          const newMsgs = prev.map(m => m.id === responseMessageId ? { ...m, content: fullResponse } : m);
          return newMsgs;
        });
      }
      
      // Speak the entire response smoothly at the end if not aborted
      if (!abortControllerRef.current?.signal.aborted && activeMode.id === 'voice_call') {
         if (fullResponse.trim()) {
             // Pause microphone while speaking to absolutely prevent it from hearing and answering itself
             if (isListening && recognitionRef.current) {
                recognitionRef.current.stop();
                setIsListening(false);
             }

             speakText(
               fullResponse, 
               () => setIsAppSpeaking(true),
               () => {
                 setIsAppSpeaking(false);
                 // Restart microphone instantly when done speaking
                 if (activeModeId === 'voice_call' && !isListening && recognitionRef.current) {
                   // Added a tiny timeout to ensure TTS is fully fully stopped before mic opens
                   setTimeout(() => {
                     try {
                       recognitionRef.current?.start(); 
                       setIsListening(true); 
                     } catch(e) {}
                   }, 300);
                 }
               },
               false
             );
         } else {
             setIsAppSpeaking(false);
         }
      }

      // Voice Call mode non-streaming fallback is removed (handled by streaming above)
      if (activeMode.id !== 'voice_call') {
         setIsAppSpeaking(false); // just in case
      }

      // Save after generation
      setMessages(prev => {
        saveHistory(prev);
        return prev;
      });

    } catch (error: any) {
       console.error("Error generating response:", error);
       
       let errorMsg = "मुझे क्षमा करें, I encountered an error while trying to respond. Please try again.";
       if (error.message && error.message.includes("API Key is missing")) {
         errorMsg = "API Key is missing! Please open Settings and enter your Gemini API Key.";
         setIsSettingsOpen(true);
       }
       
       setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: errorMsg }]);
    }
    
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage(input);
  };

  // Fast auto-submit in voice call mode without timer
  useEffect(() => {
    if (activeModeId === 'voice_call' && !isListening && input.trim() && !isLoading) {
       submitMessage(input);
    } else if (activeModeId === 'voice_call' && input.trim() && !isLoading) {
       // Fallback short delay if the microphone takes too long to stop
       const timer = setTimeout(() => {
          submitMessage(input);
       }, 700);
       return () => clearTimeout(timer);
    }
  }, [input, activeModeId, isLoading, isListening]);

  // Keep microphone active continuously in voice call mode, but ONLY if not actively speaking
  useEffect(() => {
    if (activeModeId === 'voice_call' && !isListening && !isAppSpeaking && !isLoading) {
       try {
         recognitionRef.current?.start();
         setIsListening(true);
       } catch (e) {
         // Silently fail if it's already started or browser throws
       }
    }
  }, [isListening, activeModeId, isAppSpeaking, isLoading]);

  // --- Login Screen Render ---
  if (!userName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans selection:bg-orange-100 selection:text-orange-900">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30 border-4 border-rose-100">
              <ChakraIcon size={40} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2 tracking-tight">Bharat AI</h1>
          <p className="text-center text-gray-500 mb-8 font-medium">Your Sarcastic & Smart Assistant</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                What should I call you?
              </label>
              <input
                id="name"
                type="text"
                required
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors shadow-sm"
            >
              Start Chatting
            </button>
          </form>
          <div className="mt-8 text-center">
             <p className="text-xs text-gray-400">Generates Text, Images, Videos, and Songs (while roasting you)</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Main App Render ---
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Settings & Modes</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <X size={18} className="text-gray-600" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">API Key</h3>
                <input 
                  type="password" 
                  placeholder="Gemini API Key"
                  defaultValue={localStorage.getItem('bharat_ai_api_key') || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      localStorage.setItem('bharat_ai_api_key', e.target.value);
                      globalAiInstance = null; // force reload
                    } else {
                      localStorage.removeItem('bharat_ai_api_key');
                    }
                  }}
                  className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">Needed if not deployed with environment variable.</p>
              </div>

              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Select AI Persona</h3>
              {MODES.map(mode => {
                const Icon = mode.icon;
                const isActive = activeModeId === mode.id;

                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setActiveModeId(mode.id);
                      localStorage.setItem('bharat_ai_mode', mode.id);
                      setIsSettingsOpen(false);
                    }}
                    className={`
                      w-full flex flex-col p-3 rounded-xl transition-all duration-200 text-left border cursor-pointer
                      ${isActive 
                        ? 'bg-orange-50 border-orange-300 shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-orange-200 hover:bg-orange-50/30'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon size={18} className={isActive ? 'text-orange-600' : 'text-gray-500'} />
                        <span className={`font-semibold text-sm ${isActive ? 'text-orange-900' : 'text-gray-700'}`}>{mode.name}</span>
                      </div>
                      {isActive && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pl-6">
                      {mode.instruction.substring(0, 80)}...
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <ChakraIcon size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-gray-900 leading-none">Bharat AI</h1>
              <p className="text-[10px] uppercase tracking-widest text-rose-600 font-semibold mt-1">Smart Assistant</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 md:hidden rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-100 flex gap-2">
           <button 
             onClick={startNewChat}
             className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors shadow-sm"
           >
             <Sparkles size={16} />
             <span>New Chat</span>
           </button>
           <button
             onClick={clearHistory}
             className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl border border-gray-200"
             title="Clear History"
           >
             <Trash2 size={18} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Chat History
          </h2>
          <div className="space-y-2 relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-100" />
            {history.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4 italic">No history yet.</p>
            ) : (
              history.map((session) => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session)}
                  className={`
                    relative w-full flex flex-col px-4 py-3 pl-8 rounded-xl transition-all duration-200 text-left group
                    ${currentSessionId === session.id 
                      ? 'bg-orange-50 shadow-sm border border-orange-100/50' 
                      : 'hover:bg-gray-50 border border-transparent'}
                  `}
                >
                  <div className={`absolute left-[11px] top-4 w-1.5 h-1.5 rounded-full z-10 ${currentSessionId === session.id ? 'bg-orange-500' : 'bg-gray-300 group-hover:bg-gray-400'}`} />
                  <span className={`text-sm font-medium truncate mb-1 ${currentSessionId === session.id ? 'text-orange-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                    {session.title}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>{session.date}</span>
                    <span>{session.duration}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        
        {/* User Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-2">
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="w-full flex items-center gap-3 p-2 text-gray-600 hover:bg-white hover:shadow-sm hover:text-orange-600 rounded-xl transition-all text-sm font-medium border border-transparent hover:border-gray-100"
           >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                 <Briefcase size={16} />
              </div>
              <span className="truncate">Settings & Modes ({activeMode.name})</span>
           </button>
           <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2.5 truncate">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                    {userName[0].toUpperCase()}
                 </div>
                 <span className="text-sm font-semibold text-gray-700 truncate">{userName}</span>
              </div>
              <button 
                onClick={() => {
                  localStorage.removeItem('bharat_ai_username');
                  setUserName(null);
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Log Out"
              >
                 <LogOut size={16} />
              </button>
           </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative xl:max-w-5xl mx-auto w-full border-x border-gray-200 bg-gray-50/50 shadow-sm">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
             >
               <Menu size={20} />
             </button>
             <div>
               <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                 {activeMode.name}
                 <span className="flex h-2 w-2 relative">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                 </span>
               </h2>
             </div>
          </div>
          <div className="flex items-center gap-2">
               {activeModeId !== 'voice_call' && (
                 <button 
                   onClick={() => {
                     setActiveModeId('voice_call');
                     if (!isListening) {
                       try {
                         recognitionRef.current?.start();
                         setIsListening(true);
                       } catch(e) {}
                     }
                   }}
                   className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 font-medium text-xs rounded-full border border-green-200 hover:bg-green-100 transition-colors shadow-sm cursor-pointer"
                 >
                   <Phone size={14} className="animate-pulse" />
                   <span>Call Now</span>
                 </button>
               )}
               <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => setIsSettingsOpen(true)}>
                 <span className="flex items-center gap-1.5"><activeMode.icon size={13} className="text-orange-600" /> {activeMode.name}</span>
               </div>
          </div>
        </header>

        {activeModeId === 'voice_call' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden bg-black transition-colors duration-1000 pb-32">
            {/* Deep Dynamic Color Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-950 via-black to-slate-950 transition-opacity duration-1000 ${isAppSpeaking ? 'opacity-100' : isListening ? 'opacity-80' : 'opacity-60'}`} />

            {/* Deep Cosmic Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808020_1px,transparent_1px),linear-gradient(to_bottom,#80808020_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_80%,transparent_100%)] pointer-events-none" />

            {/* Ambient Vibrant Glows - slightly adjusted for 'halka blue bg' but mostly black */}
            <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[100px] transition-all duration-1000 pointer-events-none opacity-30 mix-blend-screen`} />
            <div className={`absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] transition-all duration-1000 pointer-events-none opacity-30 mix-blend-screen`} />

            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[110px] transition-all duration-[3000ms] pointer-events-none opacity-50 mix-blend-screen 
              ${isAppSpeaking ? 'bg-pink-600/20 scale-[1.05]' : 
                isListening ? 'bg-blue-600/20 scale-100' : 
                isLoading ? 'bg-purple-800/20 scale-[1.02]' : 
                'bg-slate-800/10 scale-95'}`} 
            />

            <div className="relative z-20 flex flex-col items-center mt-8 w-full max-w-sm">
               
               <div className="relative mb-16 flex justify-center items-center w-full cursor-pointer" onClick={() => {
                  if (isAppSpeaking || isLoading) {
                    window.speechSynthesis.cancel();
                    abortControllerRef.current?.abort();
                    setIsAppSpeaking(false);
                    setIsLoading(false);
                    // Explicitly restart microphone when tapped
                    if (!isListening) {
                       try { recognitionRef.current?.start(); setIsListening(true); } catch(e) {}
                    }
                  }
               }} title="Tap orb to interrupt">
                 <PremiumHoloFace isSpeaking={isAppSpeaking} isListening={isListening} isLoading={isLoading} />
               </div>

              <div className="flex justify-center items-center w-full mt-4 flex-col gap-3">
                <div className="text-[10px] text-gray-500 font-medium tracking-widest uppercase bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700/50 backdrop-blur-md">
                   {isAppSpeaking ? 'Tap orb to interrupt' : isListening ? 'Listening...' : 'Ready'}
                </div>
                <button 
                  onClick={() => {
                    setIsListening(false);
                    recognitionRef.current?.stop();
                    setActiveModeId('auto');
                    window.speechSynthesis.cancel();
                  }} 
                  className="relative px-6 py-3 rounded-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/30 hover:border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)] hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all transform hover:scale-105 active:scale-95 z-20 outline-none backdrop-blur-md font-medium tracking-wide"
                  title="End Call"
                >
                  <Phone size={18} className="rotate-[135deg]" />
                  End Call
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth pb-32">
              {messages.map((message) => (
                <MessageBubble key={message.id} msg={message} />
              ))}
              {isLoading && (
                <div className="flex gap-4 flex-row animate-in fade-in duration-300">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center text-white flex-shrink-0 mt-1.5 shadow-md shadow-orange-500/20">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                  <div className="max-w-[85%] rounded-3xl px-6 py-4 bg-white border border-gray-100 rounded-bl-sm flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </>
        )}

        {/* Input Form */}
        {activeModeId !== 'voice_call' && (
          <div className="absolute w-full bottom-0 p-4 sm:p-6 pt-12 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent">
            <form 
              onSubmit={handleSubmit}
              className={`
                flex items-end gap-2 backdrop-blur-md border rounded-3xl p-2 transition-all shadow-xl max-w-4xl mx-auto bg-white/90 border-gray-200
                ${isListening ? 'border-rose-500 ring-4 ring-rose-500/20' : 'focus-within:ring-4 focus-within:ring-rose-500/20 focus-within:border-rose-400'}
              `}
            >
                  <button
                     type="button"
                     onClick={() => {
                       setActiveModeId('voice_call');
                       if (!isListening) {
                         try {
                           recognitionRef.current?.start();
                           setIsListening(true);
                         } catch(e) {}
                       }
                     }}
                     className="p-3.5 mb-0.5 ml-1 rounded-2xl transition-colors shrink-0 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 shadow-sm self-end"
                     title="Voice Call Mode"
                  >
                     <Phone size={20} className="animate-pulse" />
                  </button>
                  <button
                     type="button"
                     onClick={() => submitMessage("Generate a romantic song for me")}
                     className="p-3.5 mb-0.5 rounded-2xl transition-all shrink-0 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100 shadow-sm self-end hidden sm:block"
                     title="Generate Song"
                  >
                     <Music size={20} />
                  </button>
                  <button
                     type="button"
                     onClick={toggleListening}
                     className={`
                       p-3.5 mb-0.5 rounded-2xl transition-all shrink-0 shadow-sm self-end
                       ${isListening 
                         ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' 
                         : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'}
                     `}
                     title="Voice Input"
                  >
                     <Mic size={20} />
                  </button>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder={isListening ? "Listening..." : "Message Bharat AI..."}
                    className="flex-1 max-h-32 min-h-[52px] bg-transparent border-0 focus:ring-0 resize-none px-4 py-3.5 text-base rounded-lg text-gray-900 placeholder:text-gray-400 outline-none"
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-3.5 mb-0.5 mr-1 rounded-2xl bg-rose-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 transition-colors shadow-md shrink-0 self-end"
                  >
                    <Send size={20} />
                  </button>
                </form>
                <div className="text-center mt-4 text-[11px] text-gray-400 font-medium tracking-wide">
                  Bharat AI can make mistakes. Please verify important info.
                </div>
              </div>
        )}
      </main>
    </div>
  );
}
