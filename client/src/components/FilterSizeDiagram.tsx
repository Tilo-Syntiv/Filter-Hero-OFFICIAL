/**
 * Static isometric filter for compact finders.
 * Color-coded arrows sit on the actual edges — not floating labels on a photo.
 */
export default function FilterSizeDiagram() {
  const x = 90;
  const y = 70;
  const w = 150;
  const h = 168;
  const dx = 13;
  const dy = -8;

  const tl = { x, y };
  const tr = { x: x + w, y };
  const br = { x: x + w, y: y + h };
  const bl = { x, y: y + h };
  const trb = { x: x + w + dx, y: y + dy };
  const tlb = { x: x + dx, y: y + dy };
  const brb = { x: x + w + dx, y: y + h + dy };

  const p = (pts: { x: number; y: number }[]) => pts.map((n) => `${n.x},${n.y}`).join(" ");

  return (
    <div className="w-full max-w-md mx-auto">
      <svg
        viewBox="0 0 420 320"
        className="w-full h-auto"
        role="img"
        aria-label="Sample air filter showing width across the top, length down the side, and depth as thickness"
      >
        <defs>
          <linearGradient id="fsdFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f4f7fb" />
            <stop offset="100%" stopColor="#d9e4f0" />
          </linearGradient>
          <linearGradient id="fsdPleat" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c5d6e8" />
            <stop offset="100%" stopColor="#8eb0d8" />
          </linearGradient>
          <linearGradient id="fsdSide" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#203868" />
            <stop offset="100%" stopColor="#141e30" />
          </linearGradient>
          <clipPath id="fsdClip">
            <rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} />
          </clipPath>
        </defs>

        <ellipse cx="210" cy="292" rx="110" ry="10" fill="#203868" opacity="0.08" />

        <polygon points={p([tl, tr, trb, tlb])} fill="#e8eef5" stroke="#203868" strokeWidth="1" />
        <polygon points={p([tr, trb, brb, br])} fill="url(#fsdSide)" />
        <rect x={x} y={y} width={w} height={h} fill="url(#fsdFace)" />
        <g clipPath="url(#fsdClip)">
          {Array.from({ length: 10 }, (_, i) => (
            <rect
              key={i}
              x={x + 12 + i * 13}
              y={y + 10}
              width={7}
              height={h - 20}
              fill="url(#fsdPleat)"
              opacity={0.55 + (i % 2) * 0.3}
            />
          ))}
        </g>
        <rect
          x={x + 8}
          y={y + 8}
          width={w - 16}
          height={h - 16}
          fill="none"
          stroke="#c5ced8"
          strokeWidth="5"
        />

        {/* WIDTH — on the top face edge */}
        <line x1={tl.x} y1={tl.y} x2={tr.x} y2={tr.y} stroke="#8eb0d8" strokeWidth="5" />
        <line x1={tl.x} y1={46} x2={tr.x} y2={46} stroke="#8eb0d8" strokeWidth="2" />
        <polygon points={`${tl.x},46 ${tl.x + 7},42 ${tl.x + 7},50`} fill="#8eb0d8" />
        <polygon points={`${tr.x},46 ${tr.x - 7},42 ${tr.x - 7},50`} fill="#8eb0d8" />
        <rect x={x + w / 2 - 28} y={28} width={56} height={18} rx="9" fill="#8eb0d8" />
        <text
          x={x + w / 2}
          y={41}
          textAnchor="middle"
          fill="#141e30"
          fontSize="10"
          fontWeight="800"
          letterSpacing="0.12em"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          WIDTH
        </text>

        {/* LENGTH — on the left face edge */}
        <line x1={tl.x} y1={tl.y} x2={bl.x} y2={bl.y} stroke="#203868" strokeWidth="5" />
        <line x1={58} y1={tl.y} x2={58} y2={bl.y} stroke="#203868" strokeWidth="2" />
        <polygon points={`58,${tl.y} 54,${tl.y + 7} 62,${tl.y + 7}`} fill="#203868" />
        <polygon points={`58,${bl.y} 54,${bl.y - 7} 62,${bl.y - 7}`} fill="#203868" />
        <rect x="16" y={y + h / 2 - 14} width="28" height="52" rx="6" fill="#203868" />
        <text
          x="30"
          y={y + h / 2 + 4}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="9"
          fontWeight="800"
          letterSpacing="0.1em"
          fontFamily="Plus Jakarta Sans, sans-serif"
          transform={`rotate(-90 30 ${y + h / 2})`}
        >
          LENGTH
        </text>

        {/* DEPTH — on the receding thickness edge */}
        <line x1={tr.x} y1={tr.y} x2={trb.x} y2={trb.y} stroke="#7f2328" strokeWidth="5" />
        <line
          x1={tr.x + 18}
          y1={tr.y - 22}
          x2={trb.x + 18}
          y2={trb.y - 22}
          stroke="#7f2328"
          strokeWidth="2"
        />
        <rect x={trb.x + 8} y={trb.y - 8} width="52" height="20" rx="10" fill="#7f2328" />
        <text
          x={trb.x + 34}
          y={trb.y + 6}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="10"
          fontWeight="800"
          letterSpacing="0.12em"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          DEPTH
        </text>

        <text
          x="210"
          y="312"
          textAnchor="middle"
          fill="#4a5f7a"
          fontFamily="Manrope, sans-serif"
          fontSize="11"
        >
          Width × Length × Depth — same order as the frame print
        </text>
      </svg>
    </div>
  );
}
