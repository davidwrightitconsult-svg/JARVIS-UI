/**
 * Shared UI primitives used across all pages.
 * Extracted from App.tsx during Phase 8d (router refactor).
 */

export function StatusDot({ status }: { status: string }) {
  const color =
    status === 'HEALTHY' || status === 'ONLINE'
      ? 'bg-jarvis-green'
      : status === 'DEGRADED'
        ? 'bg-jarvis-amber'
        : 'bg-jarvis-red'

  return (
    <span className="relative flex h-2 w-2">
      <span
        className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75 animate-ping`}
      />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  )
}

export function Panel({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`panel flex flex-col overflow-hidden ${className}`}>
      <div className="panel-header flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-jarvis-cyan" />}
        <span>{title}</span>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}

export function Row({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-jarvis-textMuted">{label}</span>
      <span className={accent ? 'text-jarvis-cyan font-bold' : 'text-jarvis-text'}>
        {value}
      </span>
    </div>
  )
}
