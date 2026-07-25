import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiAPI, projectsAPI } from '../../services/api';
import { useProject } from '../../contexts/ProjectContext';
import { projectToDesignParams, parseDesignSpecifications, resolveBuildingStyle } from '../../utils/buildingAssets';
import { getLockedProjectFields } from '../../utils/projectMetadata';
import { initFloorRooms } from '../../utils/roomLayouts';
import ExpandableBuildingViewer from '../../components/ExpandableBuildingViewer';
import ProjectSelector from '../../components/ProjectSelector';

function applyDesignPatch(prev, d, buildingType) {
  const specs = d.specifications || d;
  const floorRooms = specs.floorRooms || d.floorRooms || prev.floorRooms || initFloorRooms(
    d.width || prev.width,
    d.depth || prev.depth,
    d.floors || prev.floors,
    buildingType,
  );
  return {
    ...prev,
    width: d.width ?? prev.width,
    depth: d.depth ?? prev.depth,
    floors: d.floors ?? prev.floors,
    materials: d.materials || prev.materials,
    doorStyle: d.doorStyle || prev.doorStyle,
    windowStyle: d.windowStyle || prev.windowStyle,
    buildingStyle: d.buildingStyle || prev.buildingStyle,
    floorRooms,
    placedItems: [],
  };
}

export default function AIBuildingGenerator() {
  const { activeProjectId, activeProject } = useProject();
  const queryClient = useQueryClient();
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [liveParams, setLiveParams] = useState(null);
  const [cutawayFloor, setCutawayFloor] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const locked = useMemo(() => getLockedProjectFields(activeProject), [activeProject]);

  const { data: designsData } = useQuery({
    queryKey: ['designs', activeProjectId],
    queryFn: () => projectsAPI.getDesigns(activeProjectId),
    enabled: !!activeProjectId,
  });

  const savedSpecs = parseDesignSpecifications(designsData?.designs?.[0]?.specifications);
  const buildingType = activeProject?.buildingType || activeProject?.projectType || 'office';
  const buildingStyle = resolveBuildingStyle(savedSpecs, activeProject);

  const baseParams = useMemo(() => {
    if (!activeProject) return null;
    const fromProject = projectToDesignParams(activeProject);
    if (savedSpecs?.floorRooms && Object.keys(savedSpecs.floorRooms).length) {
      return { ...fromProject, ...savedSpecs, placedItems: [] };
    }
    return { ...fromProject, placedItems: [], floorRooms: initFloorRooms(fromProject.width, fromProject.depth, fromProject.floors, buildingType) };
  }, [activeProject, savedSpecs, buildingType]);

  useEffect(() => {
    if (!baseParams) {
      setLiveParams(null);
      return;
    }
    setLiveParams(baseParams);
    setCutawayFloor(Math.min(baseParams.floors || 1, Math.max(1, savedSpecs?.activeFloor || baseParams.floors || 1)));
    setSelectedRoom(null);
    setConversationId(null);
    setChatMessages([{
      role: 'assistant',
      content: `3D model for "${activeProject?.name}". Describe changes (rooms, floors, facade, size) and the house updates here. Drag to orbit, scroll to zoom, click a room to inspect.`,
    }]);
  }, [activeProjectId, baseParams, activeProject?.name, savedSpecs?.activeFloor]);

  const saveDesignMutation = useMutation({
    mutationFn: (params) => projectsAPI.saveDesign(activeProjectId, {
      name: `${activeProject?.name || 'Project'} — AI Building`,
      designType: buildingType || 'custom',
      description: `${params.floors} floors, ${params.width}m × ${params.depth}m (AI)`,
      specifications: { ...params, placedItems: [], source: 'ai-building', savedAt: new Date().toISOString(), activeFloor: cutawayFloor },
      floorPlan: {
        width: params.width,
        depth: params.depth,
        placedItems: [],
        floors: params.floors,
        floorRooms: params.floorRooms,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs', activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ['floor-plans', activeProjectId] });
    },
  });

  const designMutation = useMutation({
    mutationFn: (userText) => aiAPI.buildingDesign({
      projectId: activeProjectId,
      projectType: locked.projectType,
      buildingType,
      floors: liveParams?.floors || locked.floors,
      areaSqft: locked.totalAreaSqft,
      requirements: userText,
    }),
    onSuccess: (data, userText) => {
      const d = data.design || data;
      setLiveParams((prev) => {
        const next = applyDesignPatch(prev || baseParams, d, buildingType);
        saveDesignMutation.mutate(next);
        return next;
      });
      const reply = d.description || d.name || 'Building updated from your request.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setCutawayFloor((f) => Math.min(d.floors || liveParams?.floors || f, Math.max(f, 1)));
      toast.success('House model updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not update building');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Update failed — try rephrasing your change.' }]);
    },
  });

  const chatMutation = useMutation({
    mutationFn: (messages) => aiAPI.chat({ messages, projectId: activeProjectId, conversationId }),
    onSuccess: (data) => {
      if (data.conversationId) setConversationId(data.conversationId);
      queryClient.invalidateQueries({ queryKey: ['ai-conversations', activeProjectId] });
    },
  });

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
        setChatMessages(history.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({
          role: m.role,
          content: m.content,
        })));
        setConversationId(conv.id);
      }
    } catch {
      toast.error('Could not load conversation');
    }
  };

  const handleChat = () => {
    if (!chatInput.trim() || !activeProjectId || !liveParams) return;
    const text = chatInput.trim();
    const newMessages = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(newMessages);
    setChatInput('');
    chatMutation.mutate(newMessages.map((m) => ({ role: m.role, content: m.content })));
    designMutation.mutate(text);
  };

  const onRoomSelect = useCallback((room) => {
    setSelectedRoom(room);
    if (room.floor) setCutawayFloor((f) => Math.max(f, room.floor));
    toast.success(room.label || room.id, { id: 'room-select', duration: 2000 });
  }, []);

  const convList = (conversations?.conversations || []).filter(
    (c) => !activeProjectId || String(c.project_id) === String(activeProjectId),
  );

  const params = liveParams || baseParams;
  const maxFloors = params?.floors || 1;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] w-full space-y-4">
      <ProjectSelector className="shrink-0" required />

      {!activeProjectId ? (
        <div className="card flex-1 flex items-center justify-center text-concrete">Select a project</div>
      ) : !params ? (
        <div className="card flex-1 flex items-center justify-center text-concrete">Loading design…</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-concrete">Cutaway through floor:</span>
            {Array.from({ length: maxFloors }, (_, i) => i + 1).map((f) => (
              <button
                key={f}
                type="button"
                className={`text-xs px-2.5 py-1 rounded-lg border ${cutawayFloor === f ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-steel-100 text-concrete hover:border-primary/30'}`}
                onClick={() => { setCutawayFloor(f); setSelectedRoom(null); }}
              >
                {f}
              </button>
            ))}
            {selectedRoom && (
              <span className="text-xs text-steel ml-auto">Room: {selectedRoom.label}</span>
            )}
          </div>

          <ExpandableBuildingViewer
            title={`3D building — floors 1–${cutawayFloor}`}
            defaultExpanded={false}
            viewerClassName="h-[min(58vh,620px)]"
            showControlsHint
            floors={params.floors}
            width={params.width}
            depth={params.depth}
            materials={params.materials}
            doorStyle={params.doorStyle || locked.doorStyle}
            windowStyle={params.windowStyle || locked.windowStyle}
            buildingType={buildingType}
            buildingStyle={buildingStyle}
            floorRooms={params.floorRooms || {}}
            viewMode="dollhouse"
            activeFloor={cutawayFloor}
            stackedCutaway
            placedItems={[]}
            showRoof={false}
            selectedRoom={selectedRoom}
            onRoomSelect={onRoomSelect}
          />

          <div className="card !p-0 flex flex-col min-h-[280px] max-h-[42vh]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-semibold text-steel">Building AI — chat to update the model</span>
              </div>
              {convList.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <MessageSquare className="h-3.5 w-3.5 text-concrete" />
                  <select
                    className="input !py-1 !text-xs max-w-[200px]"
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) loadConversation(Number(e.target.value)); e.target.value = ''; }}
                  >
                    <option value="">Past chats…</option>
                    {convList.map((c) => (
                      <option key={c.id} value={c.id}>{c.title || 'Conversation'}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`text-sm rounded-xl px-3 py-2 ${msg.role === 'user' ? 'bg-primary/10 text-steel ml-8' : 'bg-steel-50 text-steel mr-8'}`}>
                  {msg.content}
                </div>
              ))}
              {(chatMutation.isPending || designMutation.isPending) && (
                <p className="text-xs text-concrete animate-pulse">Updating building from your message…</p>
              )}
            </div>
            <div className="border-t border-steel-100 p-3 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                placeholder='e.g. "Add a larger lobby", "3 more floors", "glass facade"...'
                className="input flex-1 !py-2 text-sm"
                disabled={designMutation.isPending}
              />
              <button type="button" onClick={handleChat} disabled={designMutation.isPending || chatMutation.isPending} className="btn-primary !px-3">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
