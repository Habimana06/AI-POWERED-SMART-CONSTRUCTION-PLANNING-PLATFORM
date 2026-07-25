import { useMemo, forwardRef } from 'react';
import { getRoomsForFloor, formatDim, getWallLines, isCommercialBuilding } from '../utils/roomLayouts';

const FT_SCALE = 14;
const ROOM_PALETTE = [
  { fill: '#FFF7ED', stroke: '#FDBA74', accent: '#EA580C' },
  { fill: '#EFF6FF', stroke: '#93C5FD', accent: '#2563EB' },
  { fill: '#F0FDF4', stroke: '#86EFAC', accent: '#16A34A' },
  { fill: '#FAF5FF', stroke: '#D8B4FE', accent: '#9333EA' },
  { fill: '#FDF2F8', stroke: '#F9A8D4', accent: '#DB2777' },
  { fill: '#ECFEFF', stroke: '#67E8F9', accent: '#0891B2' },
];

function roomColor(index) {
  return ROOM_PALETTE[index % ROOM_PALETTE.length];
}

function DoorSymbol({ x, y, w = 2.5 }) {
  const r = w * FT_SCALE;
  return (
    <g>
      <path
        d={`M ${x} ${y} A ${r} ${r} 0 0 1 ${x + r * 0.85} ${y - r * 0.35}`}
        fill="none"
        stroke="#EA580C"
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />
      <line x1={x} y1={y} x2={x + r * 0.85} y2={y} stroke="#5D4037" strokeWidth={2} />
    </g>
  );
}

const FloorPlanViewer = forwardRef(function FloorPlanViewer({
  width = 8, depth = 6, floors = 1, activeFloor = 1,
  buildingType = 'residential', floorRooms = {}, className = '',
  projectName = 'Building',
}, ref) {
  const wFt = width * 3.28084;
  const dFt = depth * 3.28084;
  const margin = { top: 88, right: 100, bottom: 72, left: 88 };
  const planW = wFt * FT_SCALE;
  const planH = dFt * FT_SCALE;
  const svgW = planW + margin.left + margin.right;
  const svgH = planH + margin.top + margin.bottom;
  const ox = margin.left;
  const oy = margin.top;

  const isResidential = !isCommercialBuilding(buildingType, floors);
  const rooms = getRoomsForFloor(width, depth, activeFloor, buildingType, floors, floorRooms);
  const wallLines = getWallLines(width, depth, activeFloor, buildingType, floors, floorRooms);

  const totalArea = useMemo(
    () => rooms.reduce((s, r) => s + (r.w || 0) * (r.h || 0), 0),
    [rooms],
  );

  const gridId = `grid-${activeFloor}`;

  return (
    <div className={`rounded-2xl border border-steel-200 overflow-hidden shadow-lg bg-[#F8FAFC] ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-steel-100 bg-white px-5 py-3">
        <div>
          <p className="text-base font-bold text-steel-800">Professional Floor Plan</p>
          <p className="text-sm text-concrete">Level {activeFloor} · {projectName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {formatDim(wFt)} × {formatDim(dFt)}
          </span>
          <span className="rounded-full bg-steel-100 px-3 py-1 text-sm font-semibold text-steel-700">
            {rooms.length} rooms
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            ~{totalArea.toFixed(0)} m²
          </span>
        </div>
      </div>

      <div className="overflow-auto p-4 bg-[linear-gradient(#E2E8F0_1px,transparent_1px),linear-gradient(90deg,#E2E8F0_1px,transparent_1px)] bg-[size:24px_24px]">
        <svg ref={ref} width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto max-w-full h-auto drop-shadow-md" style={{ minHeight: 420 }}>
          <defs>
            <pattern id={gridId} width={FT_SCALE} height={FT_SCALE} patternUnits="userSpaceOnUse">
              <path d={`M ${FT_SCALE} 0 L 0 0 0 ${FT_SCALE}`} fill="none" stroke="#CBD5E1" strokeWidth={0.5} />
            </pattern>
            <marker id="dim-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#EA580C" />
            </marker>
            <filter id="plan-shadow" x="-2%" y="-2%" width="104%" height="104%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* Sheet frame */}
          <rect x={8} y={8} width={svgW - 16} height={svgH - 16} rx={12} fill="#FFFFFF" stroke="#334155" strokeWidth={2} filter="url(#plan-shadow)" />

          {/* Title block */}
          <rect x={16} y={16} width={svgW - 32} height={52} rx={8} fill="#1E293B" />
          <text x={28} y={40} fill="#F8FAFC" fontSize={16} fontWeight={800}>
            FLOOR PLAN — LEVEL {activeFloor}
          </text>
          <text x={28} y={58} fill="#94A3B8" fontSize={11} fontWeight={600}>
            {isResidential ? 'Residential' : 'Commercial'} · Scale 1:{Math.round(FT_SCALE * 12)}"=1' · {width}m × {depth}m
          </text>
          <text x={svgW - 28} y={48} textAnchor="end" fill="#FB923C" fontSize={13} fontWeight={700}>
            BuildPlan AI
          </text>

          {/* Plan area grid */}
          <rect x={ox} y={oy} width={planW} height={planH} fill={`url(#${gridId})`} />

          {/* Outer walls */}
          <rect
            x={ox} y={oy}
            width={planW} height={planH}
            fill="#FAFAFA"
            stroke="#1E293B"
            strokeWidth={5}
            rx={1}
          />

          {/* Interior walls */}
          {wallLines.map((line, i) => {
            const x1 = ox + (line.x1 / wFt) * planW;
            const y1 = oy + (line.y1 / dFt) * planH;
            const x2 = ox + (line.x2 / wFt) * planW;
            const y2 = oy + (line.y2 / dFt) * planH;
            return (
              <line
                key={`wall-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#334155"
                strokeWidth={5}
                strokeLinecap="square"
              />
            );
          })}

          {/* Rooms */}
          {rooms.map((room, idx) => {
            const rx = ox + (room.x / wFt) * planW;
            const ry = oy + (room.y / dFt) * planH;
            const rw = (room.w / wFt) * planW;
            const rh = (room.h / dFt) * planH;
            const col = roomColor(idx);
            const labelSize = Math.min(14, Math.max(9, Math.min(rw, rh) / 8));
            return (
              <g key={room.id}>
                <rect x={rx} y={ry} width={rw} height={rh} fill={col.fill} stroke={col.stroke} strokeWidth={1.5} />
                <rect x={rx + 3} y={ry + 3} width={4} height={rh - 6} fill={col.accent} opacity={0.35} rx={1} />
                {rw > 36 && rh > 28 && (
                  <>
                    <text x={rx + rw / 2} y={ry + rh / 2 - 4} textAnchor="middle" fontSize={labelSize} fill="#1E293B" fontWeight={800}>
                      {room.label}
                    </text>
                    <text x={rx + rw / 2} y={ry + rh / 2 + labelSize - 2} textAnchor="middle" fontSize={labelSize - 2} fill="#64748B" fontWeight={600}>
                      {formatDim(room.w)} × {formatDim(room.h)}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Width dimension */}
          <line x1={ox} y1={oy - 28} x2={ox + planW} y2={oy - 28} stroke="#EA580C" strokeWidth={1.5} markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
          <text x={ox + planW / 2} y={oy - 34} textAnchor="middle" fontSize={12} fill="#EA580C" fontWeight={700}>{formatDim(wFt)}</text>

          {/* Depth dimension */}
          <line x1={ox - 28} y1={oy} x2={ox - 28} y2={oy + planH} stroke="#EA580C" strokeWidth={1.5} markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
          <text x={ox - 36} y={oy + planH / 2} textAnchor="middle" fontSize={12} fill="#EA580C" fontWeight={700} transform={`rotate(-90, ${ox - 36}, ${oy + planH / 2})`}>{formatDim(dFt)}</text>

          {/* Main entrance */}
          <rect x={ox + planW / 2 - 14} y={oy + planH - 4} width={28} height={5} fill="#78350F" rx={1} />
          <DoorSymbol x={ox + planW / 2 + 14} y={oy + planH} />

          {/* Windows */}
          {[0.12, 0.35, 0.55, 0.78].map((pct, i) => (
            <g key={i}>
              <rect x={ox + planW * pct - 8} y={oy - 2} width={16} height={4} fill="#38BDF8" stroke="#1E293B" strokeWidth={0.75} rx={0.5} />
              <line x1={ox + planW * pct} y1={oy - 2} x2={ox + planW * pct} y2={oy + 2} stroke="#1E293B" strokeWidth={0.5} />
            </g>
          ))}

          {/* Stairs ground floor */}
          {activeFloor === 1 && isResidential && (
            <g>
              <rect x={ox + 10} y={oy + planH - 36} width={32} height={26} fill="#F1F5F9" stroke="#64748B" strokeWidth={1.5} rx={2} />
              {[0, 1, 2, 3, 4].map((s) => (
                <line key={s} x1={ox + 14} y1={oy + planH - 12 - s * 4} x2={ox + 38} y2={oy + planH - 12 - s * 4} stroke="#64748B" strokeWidth={1.2} />
              ))}
              <text x={ox + 26} y={oy + planH - 38} textAnchor="middle" fontSize={9} fill="#64748B" fontWeight={700}>STAIRS</text>
            </g>
          )}

          {/* North arrow + scale */}
          <g transform={`translate(${svgW - 56}, ${svgH - 56})`}>
            <circle cx={0} cy={0} r={22} fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={1} />
            <polygon points="0,-14 5,6 -5,6" fill="#1E293B" />
            <text x={0} y={18} textAnchor="middle" fontSize={10} fill="#1E293B" fontWeight={800}>N</text>
          </g>

          <g transform={`translate(28, ${svgH - 36})`}>
            <line x1={0} y1={0} x2={FT_SCALE * 4} y2={0} stroke="#1E293B" strokeWidth={2} />
            <line x1={0} y1={-4} x2={0} y2={4} stroke="#1E293B" strokeWidth={2} />
            <line x1={FT_SCALE * 4} y1={-4} x2={FT_SCALE * 4} y2={4} stroke="#1E293B" strokeWidth={2} />
            <text x={FT_SCALE * 2} y={16} textAnchor="middle" fontSize={10} fill="#64748B" fontWeight={600}>4 ft</text>
          </g>

          {/* Room legend */}
          {rooms.length > 0 && rooms.length <= 8 && (
            <g transform={`translate(${svgW - margin.right + 8}, ${margin.top})`}>
              <text x={0} y={0} fontSize={10} fill="#64748B" fontWeight={700}>LEGEND</text>
              {rooms.slice(0, 6).map((room, idx) => {
                const col = roomColor(idx);
                return (
                  <g key={room.id} transform={`translate(0, ${14 + idx * 18})`}>
                    <rect x={0} y={-8} width={12} height={12} fill={col.fill} stroke={col.stroke} strokeWidth={1} rx={2} />
                    <text x={16} y={0} fontSize={9} fill="#334155" fontWeight={600}>{room.label}</text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
});

export default FloorPlanViewer;
