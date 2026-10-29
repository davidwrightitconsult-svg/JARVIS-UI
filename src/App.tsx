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

import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import { useBrainStream } from './api/useBrainStream'
import { getDashboard, type DashboardResponse } from './api/client'

import Home from './pages/Home'
import Markets from './pages/Markets'
import Trades from './pages/Trades'
import Strategies from './pages/Strategies'
import Research from './pages/Research'
import Library from './pages/Library'
import Settings from './pages/Settings'
import { useNavigate } from 'react-router-dom'
import { useVoiceInput } from './api/useVoiceInput'
import { dispatchVoiceCommand, unknownCommandReply } from './api/voiceCommands'
import VoiceLog, { type VoiceMessage } from './components/VoiceLog'
// ---- Layout: persistent chrome around routed pages ----

function Layout() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const brainStream = useBrainStream()
  const navigate = useNavigate()
  const voice = useVoiceInput()
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([])
  const [lastHandled, setLastHandled] = useState<string>('')
  const voiceMsgIdRef = useRef<number>(0)

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
    const interval = setInterval(fetchData, 10000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])
      
     // Refetch function for voice commands
  const refreshDashboard = async () => {
    try {
      const d = await getDashboard()
      setData(d)
    } catch {
      // ignore
    }
  }

  // Handle transcribed voice commands
  useEffect(() => {
    if (!voice.transcript || voice.transcript === lastHandled) return
    setLastHandled(voice.transcript)

    // Add the "heard" message
    const heardId = voiceMsgIdRef.current++
    setVoiceMessages((prev) => [
      ...prev.slice(-4),
      { id: heardId, kind: 'heard', text: voice.transcript },
    ])

    // Dispatch
    dispatchVoiceCommand(voice.transcript, {
      navigate,
      refreshDashboard,
      dashboard: data,
    }).then((result) => {
      const reply = result?.reply ?? unknownCommandReply(voice.transcript)
      const replyId = voiceMsgIdRef.current++
      setVoiceMessages((prev) => [
        ...prev.slice(-4),
        { id: replyId, kind: 'reply', text: reply },
      ])
      // Speak
      speak(reply)
      if (result?.refresh) {
        refreshDashboard()
      }
    })
  }, [voice.transcript, lastHandled, data, navigate])

  // Speak using ElevenLabs via secure backend proxy
  const speak = async (text: string) => {
    if (!text.trim()) return

    try {
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        console.warn('TTS failed:', response.status)
        return
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      await audio.play()

      audio.onended = () => URL.revokeObjectURL(audioUrl)
    } catch (error) {
      console.warn('TTS request failed:', error)
    }
  }
   return ( 
    <div className="h-screen w-screen flex flex-col bg-jarvis-bg text-jarvis-text overflow-hidden">
      <TopBar
        data={data}
        streamState={brainStream.state}
        eventCount={brainStream.count}
        voiceListening={voice.listening}
        voiceSupported={voice.supported}
        onVoiceStart={voice.start}
        onVoiceStop={voice.stop}
      />
            
    <div className="flex-1 flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4">
        <Outlet />
      </main>
    </div>
    <VoiceLog
      messages={voiceMessages}
      onDismiss={() => setVoiceMessages([])}
    />
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
        <Route path="/research" element={<Research />}
        />
        <Route path="/library" element={<Library />} />
        <Route
          path="/settings" element={<Settings />}
        />
        <Route path="*" element={<ComingSoon name="Not Found" />} />
      </Route>
    </Routes>
  )
}
