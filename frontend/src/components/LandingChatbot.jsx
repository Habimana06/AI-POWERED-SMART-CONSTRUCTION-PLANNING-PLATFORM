import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  loadLandingChatHistory,
  saveLandingChatHistory,
  clearLandingChatHistory,
  DEFAULT_GREETING,
} from '../utils/landingChatStorage';

const QUICK_PROMPTS = [
  'How does AI building design work?',
  'Can you estimate project costs?',
  'What roles are supported?',
];

const REPLIES = {
  default: 'BuildPlan AI helps you design buildings in 3D, generate floor plans, estimate costs, schedule work, and monitor progress. Sign in to use the full AI assistant.',
  design: 'Draw your footprint in the Building Editor, set floors and rooms, then get AI photorealistic renders locked to your exact 3D design. Sign in to start.',
  cost: 'Our AI cost engine uses Rwanda regional benchmarks for materials, labor, equipment, and contingency. Project managers get full breakdowns in Cost Estimation.',
  roles: 'Three roles: Admin (users & analytics), Project Manager (design, scheduling, contractors), and Contractor (tasks, daily logs, materials).',
};

function pickReply(text = '') {
  const t = text.toLowerCase();
  if (/cost|budget|price|frw|estimate/.test(t)) return REPLIES.cost;
  if (/design|3d|building|floor|blueprint|render/.test(t)) return REPLIES.design;
  if (/role|admin|contractor|manager|pm/.test(t)) return REPLIES.roles;
  return REPLIES.default;
}

export default function LandingChatbot() {
  const { user } = useAuth();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadLandingChatHistory(userId));
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages(loadLandingChatHistory(userId));
  }, [userId]);

  useEffect(() => {
    saveLandingChatHistory(userId, messages);
  }, [messages, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, open]);

  const send = useCallback((text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'assistant', content: pickReply(msg) }]);
      setTyping(false);
    }, 900);
  }, [input]);

  const handleClear = () => {
    setMessages(clearLandingChatHistory(userId));
    saveLandingChatHistory(userId, [DEFAULT_GREETING]);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-6 z-[55] w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-steel-100 bg-white shadow-2xl shadow-steel-900/15"
          >
            <div className="flex items-center justify-between gap-2 border-b border-steel-100 bg-gradient-to-r from-steel-800 to-steel px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">BuildPlan Assistant</p>
                  <p className="text-[10px] text-white/60 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {user ? 'Your chat' : 'Private on this device'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  title="Clear my chat history"
                  onClick={handleClear}
                  className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-72 overflow-y-auto p-4 space-y-3 bg-concrete-50/50">
              {messages.map((msg, i) => (
                <div key={`${i}-${msg.role}-${msg.content.slice(0, 12)}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border border-steel-100 text-steel-700 shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-1 px-2">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-steel-100 p-3 space-y-2 bg-white">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-full border border-steel-100 bg-steel-50 px-2.5 py-1 text-[10px] font-medium text-steel-600 hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Ask anything…"
                  className="input flex-1 !py-2 !text-sm"
                />
                <button type="button" onClick={() => send()} className="btn-primary !px-3 !py-2">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <Link to="/login" className="block text-center text-[10px] text-primary font-medium hover:underline">
                Sign in for full AI features →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open chat assistant"
        className="fixed bottom-6 right-6 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-white shadow-xl shadow-primary/35"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </motion.button>
    </>
  );
}
