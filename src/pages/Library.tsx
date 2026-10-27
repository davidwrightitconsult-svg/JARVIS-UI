/**
 * Library — knowledge vault status (Obsidian-compatible Markdown).
 *
 * Data source: /api/knowledge/status
 * If uninitialised, shows the exact command to initialise it.
 */

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Panel, Row } from '../components/ui/shared'
import { api } from '../api/client'

interface KnowledgeStatus {
  enabled: boolean
  vault: string
  reason?: string
  recall?: {
    enabled: boolean
    reason?: string
    recall_version?: string
    max_passages?: number
    max_chars?: number
    calls?: number
  }
  sync?: {
    enabled: boolean
    reason?: string
  }
}

export default function Library() {
  const [status, setStatus] = useState<KnowledgeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<KnowledgeStatus>('/knowledge/status')
      .then((resp) => {
        if (!cancelled) {
          setStatus(resp.data)
          setLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-jarvis-cyan font-mono text-sm animate-pulse">
        Loading knowledge vault…
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel max-w-lg mx-auto mt-12">
        <div className="panel-header text-jarvis-red">Error</div>
        <div className="panel-body text-sm font-mono">{error}</div>
      </div>
    )
  }

  if (!status) return null

  return (
    <div className="h-full flex flex-col gap-4 max-w-3xl">
      <Panel title="Knowledge Vault" icon={BookOpen}>
        <div className="panel-body space-y-3 font-mono text-xs">
          <Row label="Status" value={status.enabled ? 'ENABLED' : 'DISABLED'} accent />
          <Row label="Vault Path" value={status.vault} />

          {status.enabled ? (
            <>
              <Row
                label="Recall"
                value={status.recall?.enabled ? 'ENABLED' : 'DISABLED'}
              />
              {status.recall?.enabled && (
                <>
                  <Row
                    label="Max Passages"
                    value={String(status.recall.max_passages ?? '—')}
                  />
                  <Row
                    label="Max Chars"
                    value={String(status.recall.max_chars ?? '—')}
                  />
                  <Row label="Calls" value={String(status.recall.calls ?? 0)} />
                </>
              )}
              <Row
                label="Sync"
                value={status.sync?.enabled ? 'ENABLED' : 'DISABLED'}
              />
            </>
          ) : (
            <div className="mt-4 p-3 bg-jarvis-bg border border-jarvis-amber/30 rounded space-y-2">
              <div className="text-jarvis-amber text-[10px] uppercase tracking-wider">
                Not initialised
              </div>
              <p className="text-jarvis-textDim">
                {status.reason ?? 'The knowledge vault has not been created.'}
              </p>
              <div className="text-jarvis-textMuted text-[10px] uppercase tracking-wider mt-2">
                Initialise with:
              </div>
              <code className="text-jarvis-cyan text-[11px] block">
                cd ~/JARVIS-Platform/JARVIS-Core && source .venv/bin/activate && python -m jarvis.knowledge init
              </code>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="About the Knowledge Vault">
        <div className="panel-body text-jarvis-textDim text-xs font-mono leading-relaxed space-y-2">
          <p>
            The knowledge vault is an Obsidian-compatible Markdown repository where
            J.A.R.V.I.S. records its own journal, analyses, and research findings.
          </p>
          <p>
            When enabled, strategies recall relevant passages from the vault during
            each evaluation, giving the AI contextual knowledge about past lessons,
            risk doctrine, and source material.
          </p>
          <p>
            Everything J.A.R.V.I.S. writes goes to a specific subdirectory; your own
            notes are read-only. The vault can be synced to a private Git remote.
          </p>
        </div>
      </Panel>
    </div>
  )
}
