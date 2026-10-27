/**
 * CornerPanels — decorative HUD panels in the four corners of the orb.
 *
 * All panels are intentionally subtle — they're background ambience, not
 * primary UI. They give the orb the "instrument panel" look from the
 * reference image without competing with the data nodes for attention.
 *
 * Live wiring (event log, real chart data) is deferred to a future phase.
 * For now these are static illustrations.
 */

interface CornerPanelsProps {
  size: number
  activityCount: number
  marketCount: number
  equity: number
}

export default function CornerPanels({
  size,
  activityCount,
  marketCount,
  equity,
}: CornerPanelsProps) {
  const pad = 12
  const cornerSize = size * 0.22
  const panelHeight = cornerSize * 0.7

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top-left: event counter */}
      <PanelShell
        style={{ top: pad, left: pad, width: cornerSize, height: panelHeight }}
        title="EVENTS"
      >
        <div className="text-jarvis-cyan font-mono text-2xl">{activityCount}</div>
        <div className="text-jarvis-textDim font-mono text-[9px]">
          since startup
        </div>
      </PanelShell>

      {/* Top-right: equity chart */}
      <PanelShell
        style={{ top: pad, right: pad, width: cornerSize, height: panelHeight }}
        title="EQUITY"
      >
        <MiniChart />
        <div className="text-jarvis-textDim font-mono text-[9px] mt-1">
          ${equity.toFixed(2)}
        </div>
      </PanelShell>

      {/* Bottom-left: risk dial */}
      <PanelShell
        style={{ bottom: pad, left: pad, width: cornerSize, height: panelHeight }}
        title="RISK"
      >
        <RiskDial />
      </PanelShell>

      {/* Bottom-right: market bar chart */}
      <PanelShell
        style={{ bottom: pad, right: pad, width: cornerSize, height: panelHeight }}
        title="MARKETS"
      >
        <BarChart />
        <div className="text-jarvis-textDim font-mono text-[9px] mt-1">
          {marketCount} active
        </div>
      </PanelShell>
    </div>
  )
}

function PanelShell({
  style,
  title,
  children,
}: {
  style: React.CSSProperties
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="absolute bg-jarvis-panel/60 backdrop-blur-sm border border-jarvis-border/60 rounded p-2 flex flex-col"
      style={style}
    >
      <div className="text-jarvis-cyan font-mono text-[8px] uppercase tracking-widest mb-1">
        {title}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function MiniChart() {
  // Simple SVG sparkline
  const points = [3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10]
  const width = 80
  const height = 24
  const maxY = Math.max(...points)
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width
      const y = height - (p / maxY) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        points={path}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}


function RiskDial() {
  const cx = 18
  const cy = 18
  const r = 13
  const circumference = 2 * Math.PI * r
  const fill = 0.15

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        style={{ overflow: 'visible' }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="3"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="3"
          strokeDasharray={`${circumference * fill} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          fill="#e6edf5"
          fontSize="7"
          fontFamily="monospace"
        >
          {(fill * 100).toFixed(0)}%
        </text>
      </svg>
    </div>
  )
}

function BarChart() {
  const bars = [4, 7, 3, 9, 5, 8, 6]
  const width = 80
  const height = 24
  const barW = width / bars.length - 1
  const maxV = Math.max(...bars)

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {bars.map((v, i) => (
        <rect
          key={i}
          x={i * (barW + 1)}
          y={height - (v / maxV) * height}
          width={barW}
          height={(v / maxV) * height}
          fill="#22d3ee"
          opacity={0.7}
        />
      ))}
    </svg>
  )
}
