import { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import BuildingViewer from './BuildingViewer';

export default function ExpandableBuildingViewer({
  title = '3D preview',
  defaultExpanded = false,
  staticView = false,
  showControlsHint = false,
  className = '',
  viewerClassName = 'h-[min(52vh,520px)]',
  ...viewerProps
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const shell = expanded
    ? 'fixed inset-0 z-[100] flex flex-col bg-steel-900/95 p-3 lg:p-6'
    : 'relative w-full';

  const viewerHeight = expanded ? 'flex-1 min-h-0' : viewerClassName;

  return (
    <div className={shell}>
      <div className={`flex items-center justify-between gap-2 mb-2 ${expanded ? 'text-white' : ''}`}>
        <p className={`text-xs ${expanded ? 'text-white/80' : 'text-concrete'}`}>{title}</p>
        <button
          type="button"
          className={expanded ? 'btn-outline !border-white/30 !text-white hover:!bg-white/10' : 'btn-outline !py-1.5 !px-2 text-xs inline-flex items-center gap-1'}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <><Minimize2 className="h-4 w-4" /> Exit full width</> : <><Maximize2 className="h-4 w-4" /> Expand</>}
        </button>
      </div>
      <div className={`rounded-xl overflow-hidden ${expanded ? 'flex-1 min-h-0 bg-gradient-to-b from-sky-200 to-green-100' : 'w-full'} ${className}`}>
        <BuildingViewer
          {...viewerProps}
          freeLook={!staticView}
          controlsEnabled={!staticView}
          fitFraming
          showControlsHint={showControlsHint && !staticView}
          className={viewerHeight}
        />
      </div>
    </div>
  );
}
