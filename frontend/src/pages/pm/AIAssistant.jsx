import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Send, MessageSquare, Sparkles } from 'lucide-react';
import { aiAPI } from '../../services/api';
import { useProject } from '../../contexts/ProjectContext';
import { buildHousePrompt } from '../../utils/pollinations';
import PageHeader from '../../components/PageHeader';
import ProjectSelector from '../../components/ProjectSelector';
import PollinationsImage from '../../components/PollinationsImage';

export default function AIAssistant() {
  const { activeProjectId, activeProject } = useProject();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (activeProject) {
      setConversationId(null);
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm ready to help with "${activeProject.name}" (${activeProject.projectType}, ${activeProject.floors} floors, ${activeProject.location}). Ask about planning, costs, scheduling, or risks.`,
      }]);
    } else {
      setMessages([{ role: 'assistant', content: 'Select a project above to get context-aware AI assistance.' }]);
    }
  }, [activeProject]);

  const { data: conversations } = useQuery({
    queryKey: ['ai-conversations', activeProjectId],
    queryFn: () => aiAPI.getConversations({ projectId: activeProjectId }),
    enabled: !!activeProjectId,
  });

  const loadConversation = async (id) => {
    try {
      const data = await aiAPI.getConversation(id);
      const conv = data.conversation || data;
      let history = conv.messages;
      if (typeof history === 'string') {
        try { history = JSON.parse(history); } catch { history = []; }
      }
      if (Array.isArray(history) && history.length) {
        setMessages(history.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({
          role: m.role,
          content: m.content,
        })));
        setConversationId(conv.id);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Could not load that conversation.' }]);
    }
  };

  const chatMutation = useMutation({
    mutationFn: (msgs) => aiAPI.chat({ messages: msgs, projectId: activeProjectId, conversationId }),
    onSuccess: (data) => {
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || data.message || 'I\'ve analyzed your request.' }]);
      queryClient.invalidateQueries({ queryKey: ['ai-conversations', activeProjectId] });
    },
    onError: (err) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: err.response?.data?.message || 'Unable to connect to AI service.' }]);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;
    if (!activeProjectId) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    chatMutation.mutate(newMessages.map((m) => ({ role: m.role, content: m.content })));
  };

  const convList = (conversations?.conversations || []).filter(
    (c) => !activeProjectId || String(c.project_id) === String(activeProjectId),
  );

  return (
    <div>
      <PageHeader title="AI Assistant" subtitle="Project-aware construction AI companion" />
      <ProjectSelector className="mb-6" required />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="card lg:col-span-1">
          <h3 className="font-semibold text-steel mb-4 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> History</h3>
          <div className="space-y-2">
            {convList.length ? convList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => loadConversation(c.id)}
                className={`w-full text-left rounded-xl px-3 py-2 text-sm truncate transition-colors ${
                  conversationId === c.id ? 'bg-primary/10 text-primary font-semibold' : 'text-steel hover:bg-steel-50'
                }`}
              >
                {c.title || 'Conversation'}
              </button>
            )) : <p className="text-sm text-concrete">Conversations saved per project</p>}
          </div>

          <div className="border-t border-steel-100 pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-steel flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Image Generator</h3>
            <p className="text-xs text-concrete">Turn any idea into a photorealistic image (Pollinations, no API key).</p>
            <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={2} placeholder="e.g. modern villa with pool at sunset" className="input resize-none text-sm" />
            {imagePrompt.trim() && (
              <PollinationsImage
                prompt={imagePrompt.trim()}
                filename={`${activeProject?.name || 'ai'}-image`}
                alt={imagePrompt}
                aspect="aspect-square"
              />
            )}
          </div>
        </div>

        <div className="card lg:col-span-3 !p-0 flex flex-col" style={{ height: 'calc(100vh - 16rem)' }}>
          <div className="flex items-center gap-3 border-b border-steel-100 px-6 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary"><Bot className="h-5 w-5 text-white" /></div>
            <div>
              <p className="font-semibold text-steel">BuildPlan AI</p>
              <p className="text-xs text-success">{activeProject ? `Context: ${activeProject.name}` : 'Select a project'}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-steel-50 text-steel'}`}>{msg.content}</div>
              </div>
            ))}
            {chatMutation.isPending && <div className="text-sm text-concrete animate-pulse">AI is thinking...</div>}
          </div>
          <div className="border-t border-steel-100 p-4 flex gap-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={activeProject ? `Ask about ${activeProject.name}...` : 'Select a project first...'} className="input flex-1" disabled={!activeProjectId} />
            <button type="button" onClick={handleSend} disabled={chatMutation.isPending || !activeProjectId} className="btn-primary !px-4"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
