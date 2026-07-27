import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, AlertCircle, Download, CheckCircle2, Lock, RefreshCw } from 'lucide-react';
import { projectsAPI } from '../services/api';
import {
  buildDesignGeometrySpec,
  computeRenderAspectRatio,
  aspectClass,
} from '../utils/designSpec';
import { getDesignRenderKey, getSavedExteriorRender } from '../utils/designRenderKey';

export default function AIHouseRender({
  specs = {},
  projectName = 'Building',
  buildingType,
  projectType,
  buildingStyle,
  mode = 'exterior',
  savedAt,
  projectId,
  designId,
  autoGenerate = true,
}) {
  const queryClient = useQueryClient();
  const renderKey = useMemo(() => getDesignRenderKey(specs, savedAt), [specs, savedAt]);
  const savedRender = useMemo(
    () => (mode === 'exterior' ? getSavedExteriorRender(specs, savedAt) : null),
    [specs, savedAt, mode],
  );

  const [savedImageUrl, setSavedImageUrl] = useState(savedRender?.url || null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const autoStartedRef = useRef(false);

  const geo = useMemo(
    () => buildDesignGeometrySpec(specs, buildingStyle, buildingType || projectType),
    [specs, buildingStyle, buildingType, projectType],
  );

  const renderAspect = useMemo(
    () => (mode === 'exterior' ? computeRenderAspectRatio(specs) : '4:3'),
    [specs, mode],
  );

  const aspectCls = aspectClass(renderAspect);

  useEffect(() => {
    setSavedImageUrl(savedRender?.url || null);
    autoStartedRef.current = false;
    setGenError('');
  }, [renderKey, savedRender?.url]);

  const { data: designsPoll } = useQuery({
    queryKey: ['designs', projectId],
    queryFn: () => projectsAPI.getDesigns(projectId),
    enabled: !!projectId && mode === 'exterior' && !savedImageUrl && generating,
    refetchInterval: generating ? 8000 : false,
  });

  useEffect(() => {
    const latest = designsPoll?.designs?.[0];
    if (!latest || mode !== 'exterior') return;
    let s = latest.specifications;
    if (typeof s === 'string') {
      try { s = JSON.parse(s); } catch { s = {}; }
    }
    const url = s?.aiRenders?.exterior?.url;
    if (url) {
      setSavedImageUrl(url);
      setGenerating(false);
      setGenError('');
    }
  }, [designsPoll, mode]);

  const generateMutation = useMutation({
    mutationFn: () => projectsAPI.generateDesignExterior(projectId, designId),
    onMutate: () => {
      setGenerating(true);
      setGenError('');
    },
    onSuccess: (data) => {
      if (data?.render?.url) {
        setSavedImageUrl(data.render.url);
        setGenerating(false);
        setGenError('');
      } else if (data?.skipped && data?.render?.url) {
        setSavedImageUrl(data.render.url);
        setGenerating(false);
      } else {
        setGenerating(true);
      }
      queryClient.invalidateQueries({ queryKey: ['designs', projectId] });
    },
    onError: (err) => {
      setGenerating(false);
      setGenError(err.response?.data?.message || 'House image generation failed');
    },
  });

  const runGenerate = () => {
    if (!projectId || !designId || generateMutation.isPending) return;
    generateMutation.mutate();
  };

  useEffect(() => {
    if (!autoGenerate || mode !== 'exterior' || !projectId || !designId || savedImageUrl || autoStartedRef.current) {
      return;
    }
    autoStartedRef.current = true;
    runGenerate();
  }, [autoGenerate, mode, projectId, designId, savedImageUrl, renderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const imageSrc = savedImageUrl;
  const isLoading = generating && !imageSrc;
  const roomCount = Object.values(specs.floorRooms || {}).flat().length;
  const isRateLimited = /429|rate limit/i.test(genError);

  const handleDownload = () => {
    if (!imageSrc) return;
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = `${(projectName || 'house').replace(/\s+/g, '-').toLowerCase()}-exterior.jpg`;
    if (imageSrc.startsWith('/')) a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-steel-200 bg-steel-50 px-3 py-2 text-xs text-steel">
        <Lock className="h-4 w-4 shrink-0 text-primary" />
        <span>
          Full house image is generated on the server from your saved floor plan and materials.
          If generation fails (e.g. rate limit), use <strong>Retry build image</strong> below.
        </span>
      </div>

      {savedImageUrl && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1 min-w-0">
            Permanent project image saved for this design.
            {savedRender?.generatedAt ? ` ${new Date(savedRender.generatedAt).toLocaleString()}.` : ''}
          </span>
          {projectId && designId && (
            <button
              type="button"
              onClick={runGenerate}
              disabled={generateMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              Build again
            </button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-steel-100 bg-steel-50/60 px-3 py-2 text-[10px] text-concrete leading-relaxed">
        <strong className="text-steel">Locked geometry:</strong>{' '}
        {geo.floors} floors · {geo.totalHeightM}m height · {geo.width}m × {geo.depth}m · {renderAspect}
        {roomCount ? ` · ${roomCount} rooms` : ''}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-concrete">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>
          {isLoading ? 'Server is building your house image from the saved design…' : 'Saved exterior render'}
        </span>
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
      </div>

      <div className={`relative rounded-xl overflow-hidden border border-steel-100 bg-steel-50 min-h-[280px] max-h-[640px] ${aspectCls}`}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-concrete z-10 p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs">This may take 30–90 seconds. The image is stored on the project when ready.</span>
          </div>
        )}
        {!isLoading && imageSrc && (
          <>
            <img data-house-render src={imageSrc} alt="Full house render" className="w-full h-full object-cover" />
            <div className="absolute bottom-2 right-2">
              <button type="button" onClick={handleDownload} className="rounded-lg bg-black/55 p-1.5 text-white hover:bg-black/75" title="Download">
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
        {!isLoading && !imageSrc && genError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <AlertCircle className="h-8 w-8 text-safety" />
            <p className="text-xs text-steel max-w-md">{genError}</p>
            {isRateLimited && (
              <p className="text-[10px] text-concrete">Wait about 15 seconds before retrying.</p>
            )}
            {projectId && designId && (
              <button
                type="button"
                onClick={runGenerate}
                disabled={generateMutation.isPending}
                className="btn-primary !py-2 !px-4 text-sm inline-flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
                Retry build image
              </button>
            )}
          </div>
        )}
        {!isLoading && !imageSrc && !genError && !autoGenerate && projectId && designId && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
            <p className="text-xs text-concrete">No exterior render yet.</p>
            <button type="button" onClick={runGenerate} className="btn-primary !py-2 text-sm inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Build full house image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
