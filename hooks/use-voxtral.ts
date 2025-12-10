import { useState, useEffect, useRef, useCallback } from 'react'

interface VoxtralState {
  isRecording: boolean
  transcript: string
  error: string | null
  isSupported: boolean
  isTranscribing: boolean
}

export function useVoxtral() {
  const [state, setState] = useState<VoxtralState>({
    isRecording: false,
    transcript: '',
    error: null,
    isSupported: false,
    isTranscribing: false,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    // Vérifier si MediaRecorder est supporté
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setState(prev => ({ ...prev, isSupported: true }))
    } else {
      setState(prev => ({ 
        ...prev, 
        isSupported: false, 
        error: 'Microphone access not supported in this browser' 
      }))
    }

    return () => {
      // Nettoyer les ressources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Microphone access not available',
      }))
      return
    }

    try {
      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Créer un MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Créer un blob avec tous les chunks audio
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
        
        // Arrêter le stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        // Envoyer à l'API de transcription Voxtral
        setState(prev => ({ ...prev, isTranscribing: true }))
        
        try {
          const formData = new FormData()
          // Utiliser un nom de fichier avec extension appropriée
          const extension = mediaRecorder.mimeType.includes('webm') ? 'webm' : 
                          mediaRecorder.mimeType.includes('mp4') ? 'mp4' : 
                          'webm'
          formData.append('audio', audioBlob, `recording.${extension}`)

          console.log('🎤 Sending audio to Voxtral API...', {
            size: audioBlob.size,
            type: mediaRecorder.mimeType,
            extension
          })

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })

          const data = await response.json()

          if (!response.ok || !data.success) {
            // Si c'est une erreur avec fallback suggéré, ne pas traiter comme erreur fatale
            if (data.fallback) {
              console.warn('⚠️ Voxtral unavailable, fallback to Web Speech API recommended:', data.error)
              setState(prev => ({
                ...prev,
                isTranscribing: false,
                error: null, // Ne pas afficher d'erreur, juste suggérer le fallback
                transcript: '', // Laisser vide pour que Web Speech API prenne le relais
              }))
              // Ne pas afficher de toast d'erreur, c'est normal d'utiliser Web Speech API
              return
            }
            throw new Error(data.error || 'Transcription failed')
          }

          console.log('✅ Transcription successful:', data.text?.substring(0, 50))

          setState(prev => ({
            ...prev,
            transcript: data.text || '',
            isTranscribing: false,
            error: null,
          }))
        } catch (error: any) {
          console.error('❌ Transcription error:', error)
          setState(prev => ({
            ...prev,
            isTranscribing: false,
            error: error.message || 'Failed to transcribe audio. Please try again or type your message.',
          }))
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
        transcript: '',
      }))
    } catch (error: any) {
      console.error('Error starting recording:', error)
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to access microphone. Please check permissions.',
      }))
    }
  }, [state.isSupported])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
      setState(prev => ({ ...prev, isRecording: false }))
    }
  }, [state.isRecording])

  const resetTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', error: null }))
  }, [])

  return {
    ...state,
    startRecording,
    stopRecording,
    resetTranscript,
  }
}

