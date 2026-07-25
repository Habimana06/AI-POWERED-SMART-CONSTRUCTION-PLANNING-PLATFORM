import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiAPI } from '../services/api';
import { initFloorRooms } from '../utils/roomLayouts';

/** AI assistant — applies floor plan & building params (construction focus, no furniture) */
export default function EditorAIAssistant({ params, buildingType, projectType, onApply, projectId }) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Describe your building: "3-floor residential 10m×8m with 4 bedrooms", "office tower 12 floors grey facade"... Save to update Floor Plans and Full House.' },
  ]);

  const chatMutation = useMutation({
    mutationFn: (msgs) => aiAPI.chat({
      messages: msgs,
      projectId,
      context: {
        mode: 'plan',
        floor: params.activeFloor,
        width: params.width,
        depth: params.depth,
        floors: params.floors,
        floorRooms: params.floorRooms,
      },
    }),
    onSuccess: (data) => {
      const reply = data.reply || data.message || 'Applied suggestions to your design.';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    },
    onError: () => toast.error('AI assistant unavailable'),
  });

  const designMutation = useMutation({
    mutationFn: () => aiAPI.buildingDesign({
      projectId,
      projectType: projectType || 'commercial',
      buildingType,
      floors: params.floors,
      areaSqft: params.width * params.depth * 10.764 * params.floors,
      requirements: prompt || 'Generate floor plan layout with realistic room names and sizes for this building type. No furniture.',
    }),
    onSuccess: (data) => {
      const d = data.design || data;
      const floorRooms = d.floorRooms || initFloorRooms(
        d.width || params.width,
        d.depth || params.depth,
        d.floors || params.floors,
        buildingType,
      );
      onApply({
        width: d.width || params.width,
        depth: d.depth || params.depth,
        floors: d.floors || params.floors,
        materials: d.materials || params.materials,
        placedItems: [],
        floorRooms,
        doorStyle: d.doorStyle || params.doorStyle,
        windowStyle: d.windowStyle || params.windowStyle,
      });
      toast.success('AI plan applied — save to update Floor Plans & Full House');
      setMessages((m) => [...m, { role: 'assistant', content: 'Floor plan layout applied. Review rooms and save.' }]);
    },
    onError: () => toast.error('AI design generation failed'),
  });

  const handleSend = () => {
    if (!prompt.trim()) return;
    const userMsg = { role: 'user', content: prompt };
    const next = [...messages, userMsg];
    setMessages(next);
    setPrompt('');
    chatMutation.mutate(next.map(({ role, content }) => ({ role, content })));
  };

  return (
    <div className="card space-y-2 !py-3">
      <h3 className="font-semibold text-steel flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-primary" /> Building AI
      </h3>
      <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
        {messages.slice(-4).map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'text-steel' : 'text-concrete'}>
            {m.role === 'user' ? 'You: ' : 'AI: '}{m.content}
          </p>
        ))}
      </div>
      <textarea
        className="input text-xs min-h-[60px] resize-none"
        placeholder="Describe building size, floors, room layout..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="flex gap-2">
        <button type="button" onClick={handleSend} disabled={chatMutation.isPending} className="btn-outline flex-1 !py-1 text-xs">
          <Send className="h-3 w-3" /> Chat
        </button>
        <button type="button" onClick={() => designMutation.mutate()} disabled={designMutation.isPending} className="btn-primary flex-1 !py-1 text-xs">
          Apply Plan
        </button>
      </div>
    </div>
  );
}
