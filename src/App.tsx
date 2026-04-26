import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { Send, Bot, User, Sparkles, Briefcase, GraduationCap, Mic, Smile, Menu, X, Loader2 } from 'lucide-react';

// Initialize the API using the injected environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_BASE = `You are a highly advanced AI assistant.
- You think before responding and communicate like a real human.
- Break down complex problems step-by-step internally. Provide simplified explanations to the user.
- If unsure, say "I may not be fully certain...". Avoid hallucination. Do not fabricate facts.
- Keep user engaged. Ask smart follow-up questions when useful.
`;

const MODES = [
  { 
    id: 'auto', 
    name: 'Auto Detect', 
    icon: Sparkles, 
    instruction: "Automatically detect user intent, mood, and goal. Adjust your tone accordingly between Casual, Professional, Teaching, Creative, or Voice." 
  },
  { 
    id: 'casual', 
    name: 'Casual Mode', 
    icon: Smile, 
    instruction: "Friendly, conversational, slightly relaxed tone. Be engaging and clear." 
  },
  { 
    id: 'professional', 
    name: 'Professional Mode', 
    icon: Briefcase, 
    instruction: "Clear, structured, and direct. No fluff, high efficiency." 
  },
  { 
    id: 'teaching', 
    name: 'Teaching Mode', 
    icon: GraduationCap, 
    instruction: "Step-by-step explanations. Use examples and simplifications." 
  },
  { 
    id: 'creative', 
    name: 'Creative Mode', 
    icon: Sparkles, 
    instruction: "Generate ideas, stories, content. Think outside the box, be dynamic." 
  },
  { 
    id: 'voice', 
    name: 'Voice Mode', 
    icon: Mic, 
    instruction: "Short, natural, spoken-style responses. 1-2 sentences max. Use conversational fillers like 'okay', 'yeah', 'right'." 
  }
];

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      content: "Hello! I'm your Highly Advanced AI Assistant. How can I help you today? Feel free to select a persona mode from the sidebar."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModeId, setActiveModeId] = useState('auto');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const activeMode = MODES.find(m => m.id === activeModeId) || MODES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history for context
      const chatHistory = messages.filter(m => m.id !== 'welcome').map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      // Append the new user message
      chatHistory.push({
        role: 'user',
        parts: [{ text: userMessage.content }]
      });
      
      const fullSystemInstruction = `${SYSTEM_BASE}\n\nCURRENT MODE: ${activeMode.name}\nMODE INSTRUCTION: ${activeMode.instruction}`;

      // Initialize the model block for streaming
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: chatHistory,
        config: {
          systemInstruction: fullSystemInstruction,
          temperature: activeMode.id === 'creative' ? 0.9 : 0.7,
        }
      });
      
      const responseMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: responseMessageId, role: 'model', content: '' }]);

      let fullResponse = '';
      for await (const chunk of responseStream) {
        fullResponse += chunk.text || '';
        setMessages(prev => prev.map(m => 
          m.id === responseMessageId ? { ...m, content: fullResponse } : m
        ));
      }

    } catch (error) {
       console.error("Error generating response:", error);
       setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "I'm sorry, I encountered an error while trying to respond. Please try again." }]);
    }
    
    setIsLoading(false);
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Bot size={20} />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">Adaptive AI</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 md:hidden rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
              Persona Modes
            </h2>
            <div className="space-y-1">
              {MODES.map(mode => {
                const Icon = mode.icon;
                const isActive = activeModeId === mode.id;
                
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setActiveModeId(mode.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer
                      ${isActive 
                        ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                    `}
                  >
                    <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                    <span className="text-sm">{mode.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-2">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
                <activeMode.icon size={14} className="text-indigo-600" />
                {activeMode.name}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {activeMode.instruction}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full border-x border-dashed border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <header className="h-16 flex items-center gap-3 px-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
          >
            <Menu size={20} />
          </button>
          <div>
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              {activeMode.name}
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </h2>
            <p className="text-xs text-gray-500">Ready to help</p>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1
                ${message.role === 'user' ? 'bg-gray-900 text-white' : 'bg-indigo-100 text-indigo-600'}
              `}>
                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`
                max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 
                ${message.role === 'user' 
                  ? 'bg-gray-900 text-white rounded-tr-sm' 
                  : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'}
              `}>
                <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : ''}`}>
                  <Markdown>{message.content}</Markdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 flex-row">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-indigo-100 text-indigo-600">
                <Loader2 size={16} className="animate-spin" />
              </div>
              <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-gray-50 border border-gray-100 rounded-tl-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Form */}
        <div className="p-4 sm:p-6 bg-white border-t border-gray-100">
          <form 
            onSubmit={handleSubmit}
            className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask me anything..."
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-0 focus:ring-0 resize-none p-3 text-sm text-gray-900 placeholder:text-gray-400"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 mb-0.5 rounded-xl bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="text-center mt-3 text-[11px] text-gray-400">
            Powered by Gemini with Adaptive Personality Modes
          </div>
        </div>
      </main>
    </div>
  );
}
