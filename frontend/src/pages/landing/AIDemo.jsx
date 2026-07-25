import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Sparkles, Building2 } from 'lucide-react';

const demoResponses = [
  'Based on your commercial office requirements, I recommend a 15-floor steel-frame structure with a glass curtain wall facade. Estimated cost: $42M.',
  'The optimal construction schedule spans 18 months with foundation work in months 1-3, structural steel in months 4-10, and MEP/finishing in months 11-18.',
  'Key risks identified: supply chain delays for structural steel (medium), weather impact on foundation pour (low), labor shortage in Q3 (high).',
];

export default function AIDemo() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m BuildPlan AI. Ask me about building design, cost estimation, scheduling, or risk analysis.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const response = demoResponses[Math.floor(Math.random() * demoResponses.length)];
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="py-16">
      <div className="page-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <span className="badge-info mb-4"><Sparkles className="h-3 w-3 inline mr-1" /> Interactive Demo</span>
          <h1 className="section-title">Experience BuildPlan AI</h1>
          <p className="section-subtitle mx-auto mt-4">
            Try our AI assistant — ask about building design, costs, schedules, or risks.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="card !p-0 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-steel-100 px-6 py-4 bg-steel-50/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-steel">BuildPlan AI Assistant</p>
                <p className="text-xs text-success">Online</p>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-steel-50 text-steel'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-1 px-4">
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>

            <div className="border-t border-steel-100 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about a 15-floor office building in NYC..."
                  className="input flex-1"
                />
                <button onClick={handleSend} disabled={loading} className="btn-primary !px-4">
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Design a 10-floor hotel', 'Estimate costs for 50K sqft', 'Identify project risks'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-full border border-steel-200 px-3 py-1 text-xs text-concrete hover:border-primary hover:text-primary transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
