/**
 * App — root component with routing.
 *
 * Structure:
 *   <Routes>
 *     <Route element={<Layout />}>       ← persistent chrome
 *       <Route path="/" element={<Home />} />
 *       <Route path="/markets" element={<Markets />} />
 *       ... other routes ...
 *     </Route>
 *   </Routes>
 *
 * The Layout component holds the TopBar, Sidebar, and <Outlet />
 * for whatever route is active.
 */

import { useEffect, useState } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import { useBrainStream } from './api/useBrainStream'
import { getDashboard, type DashboardResponse } from './api/client'

import Home from './pages/Home'
import Markets from './pages/Markets'
import Trades from './pages/Trades'
import Strategies from './pages/Strategies'

// ---- Layout: persistent chrome around routed pages ----

function Layout() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const brainStream = useBrainStream()

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const d = await getDashboard()
        if (!cancelled) setData(d)
      } catch {
        // TopBar will show DISCONNECTED if data stays null
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col bg-jarvis-bg text-jarvis-text overflow-hidden">
      <TopBar
        data={data}
        streamState={brainStream.state}
        eventCount={brainStream.count}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ---- Placeholder for routes we haven't built yet ----

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <div className="text-jarvis-cyan font-mono text-sm">
          {name}
        </div>
        <div className="text-jarvis-textMuted font-mono text-xs">
          Coming in a future phase
        </div>
      </div>
    </div>
  )
}

// ---- Root component ----

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/strategies" element={<Strategies />}
        />
        <Route
          path="/research"
          element={<ComingSoon name="Research" />}
        />
        <Route path="/library" element={<ComingSoon name="Library" />} />
        <Route
          path="/settings"
          element={<ComingSoon name="Settings" />}
        />
        <Route path="*" element={<ComingSoon name="Not Found" />} />
      </Route>
    </Routes>
  )
}
