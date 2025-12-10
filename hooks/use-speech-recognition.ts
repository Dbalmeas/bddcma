import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechRecognitionState {
  isListening: boolean
  transcript: string
  error: string | null
  isSupported: boolean
}

export function useSpeechRecognition() {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    transcript: '',
    error: null,
    isSupported: false,
  })

  const recognitionRef = useRef<any>(null)
  const finalTranscriptRef = useRef<string>('')

  useEffect(() => {
    // Vérifier si la reconnaissance vocale est supportée
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      setState(prev => ({ ...prev, isSupported: false, error: 'Speech recognition not supported in this browser' }))
      return
    }

    setState(prev => ({ ...prev, isSupported: true }))

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'fr-FR' // Français par défaut, peut être changé

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }))
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = finalTranscriptRef.current

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      finalTranscriptRef.current = finalTranscript
      setState(prev => ({
        ...prev,
        transcript: finalTranscript + interimTranscript,
      }))
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setState(prev => ({
        ...prev,
        isListening: false,
        error: event.error === 'no-speech' 
          ? 'No speech detected. Please try again.' 
          : `Speech recognition error: ${event.error}`,
      }))
    }

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }))
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!state.isSupported || !recognitionRef.current) {
      setState(prev => ({
        ...prev,
        error: 'Speech recognition not available',
      }))
      return
    }

    try {
      finalTranscriptRef.current = ''
      setState(prev => ({ ...prev, transcript: '', error: null }))
      recognitionRef.current.start()
    } catch (error: any) {
      console.error('Error starting speech recognition:', error)
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to start speech recognition',
      }))
    }
  }, [state.isSupported])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
      }
    }
  }, [state.isListening])

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = ''
    setState(prev => ({ ...prev, transcript: '' }))
  }, [])

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  }
}


