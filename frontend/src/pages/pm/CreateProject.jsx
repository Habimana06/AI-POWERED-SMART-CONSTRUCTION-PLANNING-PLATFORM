import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles, FileText, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, aiAPI } from '../../services/api';
import { useProjectOptional } from '../../contexts/ProjectContext';

const manualSchema = z.object({
  name: z.string().min(3, 'Name required'),
  description: z.string().optional(),
  budget: z.coerce.number().min(0),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  location: z.string().min(2, 'Location required'),
  projectType: z.string(),
  buildingType: z.string(),
  totalAreaSqft: z.coerce.number().min(1, 'Area required'),
  floors: z.coerce.number().min(1, 'Floors required'),
  priority: z.string(),
  requirements: z.string().optional(),
  roofType: z.string(),
  topType: z.string(),
  totalWindows: z.coerce.number().min(0),
  facadeType: z.string(),
  parkingLevels: z.coerce.number().min(0),
  windowStyle: z.string(),
  amenityPool: z.boolean().optional(),
  amenityParking: z.boolean().optional(),
  amenityGarden: z.boolean().optional(),
  amenitySeptic: z.boolean().optional(),
  amenityGate: z.boolean().optional(),
});

const manualDefaults = {
  name: '',
  description: '',
  budget: 250000000,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  location: 'Kigali, Rwanda',
  projectType: 'commercial',
  buildingType: 'office',
  totalAreaSqft: 80000,
  floors: 8,
  priority: 'medium',
  requirements: 'Modern building with glass facade, energy-efficient systems, and flexible floor layouts.',
  roofType: 'flat',
  topType: 'flat',
  totalWindows: 48,
  facadeType: 'glass_curtain',
  parkingLevels: 2,
  windowStyle: 'standard',
  amenityPool: false,
  amenityParking: false,
  amenityGarden: false,
  amenitySeptic: false,
  amenityGate: false,
};

const PROMPT_JSON_INSTRUCTION = `Reply with JSON only (no markdown):
{"name":"","description":"","projectType":"commercial|residential|industrial","buildingType":"office|hotel|retail|warehouse|residential","floors":8,"totalAreaSqft":80000,"budget":250000000,"location":"","priority":"medium|high|low","requirements":"","roofType":"flat|pitched|green","topType":"flat|pitched|green","totalWindows":40,"facadeType":"glass_curtain|brick|stone","parkingLevels":2,"windowStyle":"standard|panoramic","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}`;

async function parseAiProjectJson(data) {
  const text = data.reply || data.message || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return project JSON');
  return JSON.parse(jsonMatch[0]);
}

export default function CreateProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectCtx = useProjectOptional();
  const [promptText, setPromptText] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(manualSchema),
    defaultValues: manualDefaults,
  });

  const projectTypeWatch = watch('projectType');

  const afterCreate = (project) => {
    toast.success(`Project "${project.name}" created`);
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    projectCtx?.setActiveProjectId?.(project.id);
    projectCtx?.refetchProjects?.();
    navigate('/pm/building-editor');
  };

  const manualMutation = useMutation({
    mutationFn: async (formData) => {
      const created = await projectsAPI.create(formData);
      const project = created.project || created;
      await aiAPI.buildingDesign({
        projectId: project.id,
        projectType: formData.projectType,
        buildingType: formData.buildingType,
        floors: formData.floors,
        areaSqft: formData.totalAreaSqft,
        requirements: formData.requirements || formData.description,
      }).catch(() => null);
      return project;
    },
    onSuccess: (data) => afterCreate(data),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create project'),
  });

  const promptMutation = useMutation({
    mutationFn: async () => {
      if (!promptText.trim()) throw new Error('Enter a project prompt first');
      const ai = await aiAPI.chat({
        messages: [{
          role: 'user',
          content: `Create a complete construction project from this description. Match every detail in the prompt for building design later.\n\nPrompt: "${promptText.trim()}"\n\n${PROMPT_JSON_INSTRUCTION}`,
        }],
      });
      const parsed = await parseAiProjectJson(ai);
      const payload = {
        ...manualDefaults,
        ...parsed,
        aiPrompt: promptText.trim(),
        requirements: parsed.requirements || promptText.trim(),
        budget: Number(parsed.budget) || manualDefaults.budget,
        floors: Number(parsed.floors) || 1,
        totalAreaSqft: Number(parsed.totalAreaSqft) || 1000,
        totalWindows: Number(parsed.totalWindows) || 24,
        parkingLevels: Number(parsed.parkingLevels) || 0,
        startDate: parsed.startDate || manualDefaults.startDate,
        endDate: parsed.endDate || manualDefaults.endDate,
      };
      const created = await projectsAPI.create(payload);
      const project = created.project || created;
      await aiAPI.buildingDesign({
        projectId: project.id,
        projectType: payload.projectType,
        buildingType: payload.buildingType,
        floors: payload.floors,
        areaSqft: payload.totalAreaSqft,
        requirements: payload.requirements,
      }).catch(() => null);
      return project;
    },
    onSuccess: (project) => afterCreate(project),
    onError: (err) => toast.error(err.message || err.response?.data?.message || 'Prompt project creation failed'),
  });

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit((d) => manualMutation.mutate({
          ...d,
          roofType: d.topType || d.roofType,
          amenities: {
            pool: !!d.amenityPool,
            parking: d.parkingLevels > 0 || !!d.amenityParking,
            garden: !!d.amenityGarden,
            septic: !!d.amenitySeptic,
            gate: !!d.amenityGate,
          },
        }))} className="card space-y-4">
          <h3 className="font-semibold text-steel border-b border-steel-100 pb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Manual Project Form
          </h3>
          <p className="text-xs text-concrete">Project details are used for cost, risk, and monitoring across the platform.</p>

          <div>
            <label className="label">Project Name *</label>
            <input {...register('name')} className="input" placeholder="Downtown Office Tower" />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} rows={2} className="input resize-none" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Project Type</label>
              <select {...register('projectType')} className="input">
                <option value="commercial">Commercial</option>
                <option value="residential">Residential</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>
            <div>
              <label className="label">Building Type</label>
              <select {...register('buildingType')} className="input">
                <option value="office">Office</option>
                <option value="hotel">Hotel</option>
                <option value="retail">Retail</option>
                <option value="warehouse">Warehouse</option>
                <option value="residential">Residential House</option>
              </select>
            </div>
            <div>
              <label className="label">Roof / Top Type</label>
              <select {...register('topType')} className="input">
                <option value="flat">Flat roof</option>
                <option value="pitched">Pitched roof</option>
                <option value="green">Green roof</option>
                <option value="metal">Metal deck</option>
              </select>
            </div>
            <div>
              <label className="label">Facade Type</label>
              <select {...register('facadeType')} className="input">
                <option value="glass_curtain">Glass curtain wall</option>
                <option value="brick">Brick</option>
                <option value="stone">Stone</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="label">Total Windows</label>
              <input {...register('totalWindows')} type="number" min={0} className="input" />
            </div>
            <div>
              <label className="label">Window Style</label>
              <select {...register('windowStyle')} className="input">
                <option value="standard">Standard</option>
                <option value="panoramic">Panoramic</option>
                <option value="energy">Energy-efficient</option>
              </select>
            </div>
            <div>
              <label className="label">Parking Levels</label>
              <input {...register('parkingLevels')} type="number" min={0} className="input" />
            </div>
            {(projectTypeWatch === 'residential' || watch('buildingType') === 'residential') && (
              <div className="sm:col-span-2 rounded-xl border border-steel-100 p-3 space-y-2">
                <p className="text-xs font-semibold text-steel">Home features (AI & cost will include these)</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ['amenityPool', 'Swimming pool (piscine)'],
                    ['amenityParking', 'Dedicated parking'],
                    ['amenityGarden', 'Garden / landscape'],
                    ['amenitySeptic', 'Septic / igipangu'],
                    ['amenityGate', 'Front gate / collector'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input type="checkbox" {...register(key)} className="rounded text-primary" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="label">Floors *</label>
              <input {...register('floors')} type="number" min={1} className="input" />
            </div>
            <div>
              <label className="label">Total Area (sq ft) *</label>
              <input {...register('totalAreaSqft')} type="number" className="input" />
            </div>
            <div>
              <label className="label">Budget (FRw) *</label>
              <input {...register('budget')} type="number" className="input" />
            </div>
            <div>
              <label className="label">Priority</label>
              <select {...register('priority')} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Start Date *</label>
              <input {...register('startDate')} type="date" className="input" />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input {...register('endDate')} type="date" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Location *</label>
              <input {...register('location')} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Building Requirements</label>
            <textarea {...register('requirements')} rows={3} className="input resize-none" />
          </div>
          <input type="hidden" {...register('roofType')} />
          <button type="submit" disabled={manualMutation.isPending} className="btn-primary w-full">
            {manualMutation.isPending ? 'Creating...' : 'Create Project (Manual)'}
          </button>
        </form>

        <div className="card space-y-4">
          <h3 className="font-semibold text-steel border-b border-steel-100 pb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Prompt — New Project
          </h3>
          <p className="text-sm text-concrete">
            Describe your building in natural language. AI creates a new project and an initial design aligned with your description.
          </p>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={12}
            className="input resize-none"
            placeholder="e.g. 10-floor premium office in Kigali with glass curtain wall, 85,000 sq ft, green roof, 120 windows, 3 parking levels, budget 400M FRw, completion in 24 months..."
          />
          <button
            type="button"
            onClick={() => promptMutation.mutate()}
            disabled={promptMutation.isPending || !promptText.trim()}
            className="btn-primary w-full"
          >
            <Wand2 className="h-4 w-4" />
            {promptMutation.isPending ? 'Creating project from prompt...' : 'Create Project from Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}
