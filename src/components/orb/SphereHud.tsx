/**
 * SphereHud — the complete 3D-look sphere backdrop for the J.A.R.V.I.S. orb.
 *
 * Layers (back to front):
 *   1. Wireframe sphere (8 latitudes + 6 longitudes, curved)
 *   2. Three tilted Saturn rings at -15°
 *   3. Central spinning disc (3 concentric arcs, counter-rotating ring)
 *
 * All rendered as SVG. No WebGL, no Three.js, no dependencies.
 * The tilted rings are rendered BOLD and CYAN to match the reference.
 */

interface SphereHudProps {
  size: number
}

// Sphere parameters
const N_LATITUDES = 8
const N_LONGITUDES = 4
const RADIUS_FRACTION = 0.42

// Wireframe appearance
const WIREFRAME_COLOR = '#3b82f6'
const WIREFRAME_WIDTH = 1.0
const WIREFRAME_OPACITY = 0.55

// Tilted rings
const TILT_DEG = -15
const RING_RADII_FRACTION = [0.36, 0.42, 0.48]
const RING_STROKE_WIDTHS = [1.5, 2.5, 1.5]
const RING_OPACITIES = [0.7, 1.0, 0.7]

// Central disc
const DISC_RADIUS_FRACTION = 0.13

export default function SphereHud({ size }: SphereHudProps) {
  const center = size / 2
  const radius = size * RADIUS_FRACTION

  // ---- Latitude ellipses ----
  const latitudes: { y: number; rx: number }[] = []
  for (let i = 0; i < N_LATITUDES; i++) {
    const t = (i + 1) / (N_LATITUDES + 1)
    const y = -radius + 2 * radius * t
    const rx = Math.sqrt(Math.max(0, radius * radius - y * y))
    latitudes.push({ y, rx })
  }

  // ---- Longitude ellipses ----
  const longitudes: { rx: number; ry: number; rotateDeg: number }[] = []
  for (let i = 0; i < N_LONGITUDES; i++) {
    const angle = (i / N_LONGITUDES) * Math.PI * 2
    const rx = radius
    const ry = radius * Math.abs(Math.cos(angle))
    const rotateDeg = (angle * 180) / Math.PI
    longitudes.push({ rx, ry, rotateDeg })
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Cyan glow filter for rings */}
        <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ---- Layer 1: Wireframe sphere ---- */}
      <g opacity={WIREFRAME_OPACITY}>
        {/* Latitudes */}
        {latitudes.map((lat, i) => (
          <ellipse
            key={`lat-${i}`}
            cx={center}
            cy={center + lat.y}
            rx={lat.rx}
            ry={lat.rx * 0.18}
            fill="none"
            stroke={WIREFRAME_COLOR}
            strokeWidth={WIREFRAME_WIDTH}
          />
        ))}
        {/* Longitudes */}
        {longitudes.map((lon, i) => (
          <ellipse
            key={`lon-${i}`}
            cx={center}
            cy={center}
            rx={lon.rx}
            ry={lon.ry}
            fill="none"
            stroke={WIREFRAME_COLOR}
            strokeWidth={WIREFRAME_WIDTH}
            transform={`rotate(${lon.rotateDeg} ${center} ${center})`}
          />
        ))}
      </g>

      {/* ---- Layer 2: Three tilted Saturn rings ---- */}
      <g
        filter="url(#ring-glow)"
        transform={`rotate(${TILT_DEG} ${center} ${center})`}
      >
        {RING_RADII_FRACTION.map((radiusFraction, i) => {
          const ringRadius = size * radiusFraction
          return (
            <ellipse
              key={`ring-${i}`}
              cx={center}
              cy={center}
              rx={ringRadius}
              ry={ringRadius * 0.18}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={RING_STROKE_WIDTHS[i]}
              opacity={RING_OPACITIES[i]}
            />
          )
        })}
      </g>

      {/* ---- Layer 3: Central spinning disc ---- */}
      <g
        filter="url(#ring-glow)"
        style={{
          transformOrigin: `${center}px ${center}px`,
          animation: 'sphere-disc-spin 60s linear infinite',
        }}
      >
        {/* Outer arc ring */}
        <circle
          cx={center}
          cy={center}
          r={size * DISC_RADIUS_FRACTION * 1.6}
          fill="none"
          stroke="#0891b2"
          strokeWidth={1}
          strokeDasharray="8 4"
          opacity={0.6}
        />
        {/* Middle solid ring */}
        <circle
          cx={center}
          cy={center}
          r={size * DISC_RADIUS_FRACTION * 1.3}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={1.5}
          strokeDasharray="20 6"
          opacity={0.85}
        />
        {/* Inner arc ring */}
        <circle
          cx={center}
          cy={center}
          r={size * DISC_RADIUS_FRACTION}
          fill="none"
          stroke="#67e8f9"
          strokeWidth={2}
          strokeDasharray="12 8"
          opacity={0.9}
        />
      </g>

      {/* ---- Counter-rotating thin ring ---- */}
      <g
        style={{
          transformOrigin: `${center}px ${center}px`,
          animation: 'sphere-disc-spin-reverse 90s linear infinite',
        }}
      >
        <circle
          cx={center}
          cy={center}
          r={size * DISC_RADIUS_FRACTION * 1.15}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={1}
          strokeDasharray="4 12"
          opacity={0.7}
        />
      </g>

      {/* ---- Central pulsing core dot ---- */}
      <circle
        cx={center}
        cy={center}
        r={4}
        fill="#67e8f9"
        opacity={0.95}
        style={{
          filter: 'drop-shadow(0 0 6px #22d3ee)',
          animation: 'sphere-core-pulse 3s ease-in-out infinite',
          transformOrigin: `${center}px ${center}px`,
        }}
      />
    </svg>
  )
}
