import { DOOR_STYLES, WINDOW_STYLES } from '../utils/buildingAssets';

/** Static 2D exterior / elevation preview — no WebGL (for Floor Plans output page) */
export default function ExteriorPreview({
  floors = 2,
  width = 8,
  depth = 6,
  materials = {},
  doorStyle = 'wood',
  windowStyle = 'standard',
  buildingType = 'office',
  view = 'exterior',
}) {
  const wall = materials.wallColor || '#F5F5F5';
  const accent = materials.accentColor || '#8B7355';
  const stone = materials.stoneColor || '#7F8C8D';
  const roof = materials.roofColor || '#2C3E50';
  const door = DOOR_STYLES.find((d) => d.id === doorStyle)?.color || '#5D4037';
  const win = WINDOW_STYLES.find((w) => w.id === windowStyle)?.color || '#87CEEB';
  const isResidential = buildingType === 'residential' || floors <= 3;
  const displayFloors = Math.min(floors, isResidential ? 3 : 12);
  const svgW = 720;
  const svgH = view === 'elevation' ? 480 : 520;
  const groundY = svgH - 60;
  const bW = isResidential ? 280 : 320;
  const floorH = isResidential ? 72 : 38;
  const bH = displayFloors * floorH + (isResidential ? 24 : 16);
  const bX = (svgW - bW) / 2;
  const bY = groundY - bH;

  const windowsPerFloor = isResidential ? 3 : 4;

  return (
    <div className="w-full bg-gradient-to-b from-sky-100 via-sky-50 to-green-50 rounded-xl overflow-hidden border border-steel-100">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ minHeight: 420 }}>
        {/* Sky */}
        <rect x={0} y={0} width={svgW} height={svgH} fill="url(#skyGrad)" />
        {/* Ground & road */}
        <rect x={0} y={groundY} width={svgW} height={60} fill="#58D68D" />
        <rect x={0} y={groundY + 40} width={svgW} height={20} fill="#95A5A6" />
        {/* Trees */}
        {[80, svgW - 80].map((tx) => (
          <g key={tx}>
            <rect x={tx - 6} y={groundY - 50} width={12} height={50} fill="#6D4C41" />
            <ellipse cx={tx} cy={groundY - 65} rx={28} ry={35} fill="#27AE60" />
          </g>
        ))}

        {/* Building shadow */}
        <ellipse cx={svgW / 2} cy={groundY + 5} rx={bW * 0.55} ry={12} fill="#000" opacity={0.12} />

        {/* Main structure */}
        <rect x={bX} y={bY} width={bW} height={bH} fill={wall} stroke="#2C3E50" strokeWidth={2} />

        {/* Stone accent panel (front) */}
        {!isResidential && (
          <rect x={bX + 20} y={bY + bH * 0.35} width={bW * 0.35} height={bH * 0.4} fill={stone} opacity={0.9} />
        )}
        {isResidential && (
          <>
            <rect x={bX + 16} y={bY + floorH * 0.5} width={bW * 0.38} height={floorH * 1.8} fill={stone} opacity={0.85} />
            <rect x={bX + bW - bW * 0.38 - 16} y={bY + floorH * 1.2} width={bW * 0.38} height={floorH * 1.2} fill={accent} opacity={0.75} />
          </>
        )}

        {/* Floor bands & windows */}
        {Array.from({ length: displayFloors }).map((_, f) => {
          const fy = bY + bH - (f + 1) * floorH;
          return (
            <g key={f}>
              <line x1={bX} y1={fy} x2={bX + bW} y2={fy} stroke="#BDC3C7" strokeWidth={1} />
              {Array.from({ length: windowsPerFloor }).map((__, w) => {
                const wx = bX + 24 + w * ((bW - 48) / (windowsPerFloor - 1 || 1));
                const wy = fy + floorH * 0.25;
                const ww = isResidential ? 36 : 28;
                const wh = isResidential ? 32 : 22;
                return (
                  <g key={w}>
                    <rect x={wx - ww / 2} y={wy} width={ww} height={wh} fill="#2C3E50" rx={1} />
                    <rect x={wx - ww / 2 + 3} y={wy + 3} width={ww - 6} height={wh - 6} fill={win} opacity={0.75} />
                    {f < displayFloors - 1 && !isResidential && (
                      <rect x={wx - ww / 2 - 4} y={wy - 8} width={ww + 8} height={4} fill={accent} />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Roof / parapet */}
        <rect x={bX - 8} y={bY - 12} width={bW + 16} height={14} fill={roof} stroke="#2C3E50" strokeWidth={1} />
        {isResidential && (
          <rect x={bX + bW * 0.25} y={bY - 28} width={bW * 0.5} height={16} fill={accent} rx={2} />
        )}

        {/* Main entrance */}
        <rect x={svgW / 2 - 22} y={groundY - floorH + 4} width={44} height={floorH - 4} fill={door} stroke="#2C3E50" strokeWidth={1.5} rx={2} />
        <rect x={svgW / 2 - 16} y={groundY - floorH + 10} width={32} height={floorH - 16} fill={doorStyle === 'glass' ? win : door} opacity={doorStyle === 'glass' ? 0.6 : 1} />

        {/* Balconies (residential) */}
        {isResidential && displayFloors >= 2 && [1].map((f) => {
          const by = bY + bH - f * floorH - floorH * 0.15;
          return (
            <g key={f}>
              <rect x={bX + bW * 0.55} y={by} width={bW * 0.35} height={8} fill={accent} />
              <line x1={bX + bW * 0.55} y1={by - 18} x2={bX + bW * 0.9} y2={by - 18} stroke="#2C3E50" strokeWidth={2} />
            </g>
          );
        })}

        {/* Title block */}
        <rect x={16} y={16} width={280} height={56} fill="#2C3E50" rx={8} opacity={0.92} />
        <text x={28} y={38} fill="#fff" fontSize={14} fontWeight={700}>
          {view === 'elevation' ? 'ELEVATION — Front' : 'EXTERIOR — Full House Preview'}
        </text>
        <text x={28} y={56} fill="#BDC3C7" fontSize={11}>
          {displayFloors} floors · {width}m × {depth}m · Paint applied
        </text>

        {/* Material swatches */}
        <g transform={`translate(${svgW - 200}, 20)`}>
          {[
            { label: 'Wall', color: wall },
            { label: 'Accent', color: accent },
            { label: 'Stone', color: stone },
            { label: 'Roof', color: roof },
          ].map((s, i) => (
            <g key={s.label} transform={`translate(${i * 48}, 0)`}>
              <rect x={0} y={0} width={36} height={36} fill={s.color} stroke="#fff" strokeWidth={2} rx={4} />
              <text x={18} y={50} textAnchor="middle" fontSize={9} fill="#566573">{s.label}</text>
            </g>
          ))}
        </g>

        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="100%" stopColor="#E8F6FF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
