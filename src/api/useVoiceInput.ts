/**
 * useVoiceInput — Web Speech API hook for browser-native speech recognition.
 *
 * Chrome/Edge/Safari only. Firefox will return null.
 *
 * Usage:
 *   const { listening, transcript, start, stop, reset, supported } = useVoiceInput()
 *   start() → begins listening
 *   stop() → ends listening
 *   transcript → final transcribed text
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface VoiceInput {
  listening: boolean
  transcript: string
  interim: string
  error: string | null
  supported: boolean
  start: () => void
  stop: () => void
  reset: () => void
}

// Browser may or may not have SpeechRecognition
const SpeechRecognitionImpl =
  typeof window !== 'undefined'
    ? (window as unknown as {
        SpeechRecognition?: new () => SpeechRecognition
        webkitSpeechRecognition?: new () => SpeechRecognition
      }).SpeechRecognition ||
      (window as unknown as {
        SpeechRecognition?: new () => SpeechRecognition
        webkitSpeechRecognition?: new () => SpeechRecognition
      }).webkitSpeechRecognition
    : undefined

// Minimal type surface we actually use
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

export function useVoiceInput(): VoiceInput {
  const supported = !!SpeechRecognitionImpl
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Initialize recognizer once
  useEffect(() => {
    if (!SpeechRecognitionImpl) return
    const rec = new SpeechRecognitionImpl()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const alt = result[0]
        if (result.isFinal) {
          finalText += alt.transcript
        } else {
          interimText += alt.transcript
        }
      }
      if (finalText) setTranscript((prev) => (prev + ' ' + finalText).trim())
      setInterim(interimText)
    }

    rec.onerror = (event) => {
      if (event.error === 'no-speech') return
      if (event.error === 'aborted') return
      setError(event.error)
      setListening(false)
    }

    rec.onend = () => {
      setListening(false)
      setInterim('')
    }

    recognitionRef.current = rec
    return () => {
      try {
        rec.abort()
      } catch {
        // ignore
      }
    }
  }, [])

  const start = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    setError(null)
    setTranscript('')
    setInterim('')
    try {
      rec.start()
      setListening(true)
    } catch (e) {
      // 'already started' error — ignore
      if (e instanceof Error && e.message.includes('already started')) {
        return
      }
      setError(e instanceof Error ? e.message : 'Unknown error')
    }
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
  }, [])

  return { listening, transcript, interim, error, supported, start, stop, reset }
}
