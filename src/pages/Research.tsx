/**
 * Research — the private research library (ingested books).
 *
 * Data source: /api/research/documents
 * If uninitialised, shows the exact command to initialise it.
 */

import { useEffect, useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { Panel } from '../components/ui/shared'
import { api } from '../api/client'

interface ResearchDocument {
  doc_id: string
  title: string
  author: string | null
  kind: string
  format: string
  source: string
  pages: number | null
  chunks: number
  withheld_chunks: number
  tags: string[]
  added_at: string
  digest: {
    next_section: number
    total_sections: number | null
    tokens_used: number
  }
}

export default function Research() {
  const [docs, setDocs] = useState<ResearchDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notInitialised, setNotInitialised] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get<ResearchDocument[] | { detail: string }>('/research/documents')
      .then((resp) => {
        if (cancelled) return
        if (Array.isArray(resp.data)) {
          setDocs(resp.data)
        } else if (resp.data && 'detail' in resp.data) {
          setNotInitialised(resp.data.detail)
        }
        setLoading(false)
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
        Loading research library…
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

  if (notInitialised) {
    return (
      <div className="panel max-w-2xl mx-auto mt-12">
        <div className="panel-header text-jarvis-amber">Library Not Initialised</div>
        <div className="panel-body text-sm font-mono space-y-4">
          <p className="text-jarvis-text">
            The research library has not been initialised. Books and papers added to
            this library become searchable by the strategy engine.
          </p>
          <div className="p-3 bg-jarvis-bg border border-jarvis-border rounded">
            <div className="text-jarvis-textMuted text-[10px] uppercase tracking-wider mb-1">
              Initialise with:
            </div>
            <code className="text-jarvis-cyan text-xs">
              cd ~/JARVIS-Platform/JARVIS-Core && source .venv/bin/activate && python -m jarvis.research init
            </code>
          </div>
          <p className="text-jarvis-textDim text-xs">
            Backend reported: <span className="text-jarvis-text">{notInitialised}</span>
          </p>
        </div>
      </div>
    )
  }

  const filtered = search
    ? docs.filter((d) => {
        const q = search.toLowerCase()
        return (
          d.title.toLowerCase().includes(q) ||
          (d.author?.toLowerCase() ?? '').includes(q) ||
          d.kind.toLowerCase().includes(q)
        )
      })
    : docs

  const totalPages = docs.reduce((sum, d) => sum + (d.pages ?? 0), 0)
  const totalChunks = docs.reduce((sum, d) => sum + d.chunks, 0)

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Documents" value={String(docs.length)} accent />
        <Stat label="Total Pages" value={totalPages.toLocaleString()} />
        <Stat label="Total Chunks" value={totalChunks.toLocaleString()} />
        <Stat label="Books" value={String(docs.filter((d) => d.kind === 'book').length)} />
      </div>

      <Panel title={`Research Library (${filtered.length} of ${docs.length})`} icon={BookOpen} className="flex-1">
        <div className="panel-header flex items-center gap-2 border-b border-jarvis-border">
          <Search className="w-3.5 h-3.5 text-jarvis-textDim" />
          <input
            type="text"
            placeholder="Search by title, author, or kind…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-mono text-jarvis-text placeholder-jarvis-textMuted w-full"
          />
        </div>
        <div className="flex-1 overflow-auto p-3">
          {filtered.length === 0 ? (
            <div className="text-jarvis-textDim text-xs font-mono text-center py-12">
              No documents match your search.
            </div>
          ) : (
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-jarvis-panel">
                <tr className="text-jarvis-textMuted text-[10px] uppercase tracking-wider border-b border-jarvis-border">
                  <th className="text-left py-2 px-2">Title</th>
                  <th className="text-left py-2 px-2">Author</th>
                  <th className="text-left py-2 px-2">Kind</th>
                  <th className="text-right py-2 px-2">Pages</th>
                  <th className="text-right py-2 px-2">Chunks</th>
                  <th className="text-left py-2 px-2">Added</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.doc_id} className="border-b border-jarvis-gridline hover:bg-jarvis-cyan/5">
                    <td className="py-2 px-2 text-jarvis-text">{d.title}</td>
                    <td className="py-2 px-2 text-jarvis-textDim">{d.author ?? '—'}</td>
                    <td className="py-2 px-2 text-jarvis-cyan">{d.kind}</td>
                    <td className="py-2 px-2 text-right text-jarvis-textDim">
                      {d.pages ?? '—'}
                    </td>
                    <td className="py-2 px-2 text-right text-jarvis-textDim">
                      {d.chunks}
                    </td>
                    <td className="py-2 px-2 text-jarvis-textMuted text-[10px]">
                      {new Date(d.added_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel">
      <div className="panel-body">
        <div className="text-jarvis-textMuted text-[10px] uppercase tracking-wider font-mono mb-1">
          {label}
        </div>
        <div className={`font-mono text-lg ${accent ? 'text-jarvis-cyan' : 'text-jarvis-text'}`}>
          {value}
        </div>
      </div>
    </div>
  )
}
