import { NextRequest, NextResponse } from 'next/server'

/**
 * Route API pour la transcription audio avec Voxtral/Mistral
 * 
 * Note: Mistral AI n'a pas d'endpoint direct pour la transcription audio.
 * Voxtral est un modèle séparé qui nécessite une intégration spécifique.
 * 
 * Cette implémentation utilise une approche hybride :
 * 1. Essai avec l'API Mistral si un endpoint audio devient disponible
 * 2. Utilisation d'un service de transcription compatible (OpenAI Whisper via proxy)
 * 3. Fallback vers Web Speech API côté client
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Vérifier la clé API Mistral
    const mistralApiKey = process.env.MISTRAL_API_KEY
    if (!mistralApiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Mistral API key not configured. Please set MISTRAL_API_KEY in your .env file.' 
        },
        { status: 500 }
      )
    }

    console.log('🎤 Receiving audio for transcription:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    })

    // Préparer le FormData pour la transcription
    const transcriptionFormData = new FormData()
    transcriptionFormData.append('file', audioFile)
    transcriptionFormData.append('model', 'whisper-1') // Format OpenAI Whisper
    transcriptionFormData.append('language', 'fr') // Forcer le français pour de meilleurs résultats

    // Option 1: Essayer avec l'endpoint Mistral (si disponible dans le futur)
    const mistralEndpoints = [
      'https://api.mistral.ai/v1/audio/transcriptions',
    ]

    for (const endpoint of mistralEndpoints) {
      try {
        console.log(`Trying Mistral endpoint: ${endpoint}`)
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mistralApiKey}`,
          },
          body: transcriptionFormData,
        })

        if (response.ok) {
          const data = await response.json()
          const transcription = data.text || data.transcription || ''
          
          if (transcription) {
            console.log('✅ Transcription successful via Mistral:', transcription.substring(0, 50))
            return NextResponse.json({
              success: true,
              text: transcription.trim(),
              source: 'Mistral API',
            })
          }
        } else {
          const errorText = await response.text()
          console.log(`Mistral endpoint failed (${response.status}):`, errorText.substring(0, 200))
        }
      } catch (error: any) {
        console.log(`Error with Mistral endpoint:`, error.message)
      }
    }

    // Option 2: Utiliser OpenAI Whisper (si disponible via une clé OpenAI séparée)
    // Note: Cela nécessite une clé OpenAI, pas Mistral
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (openaiApiKey) {
      try {
        console.log('Trying OpenAI Whisper API...')
        
        const openaiFormData = new FormData()
        openaiFormData.append('file', audioFile)
        openaiFormData.append('model', 'whisper-1')
        openaiFormData.append('language', 'fr')

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: openaiFormData,
        })

        if (response.ok) {
          const data = await response.json()
          const transcription = data.text || ''
          
          if (transcription) {
            console.log('✅ Transcription successful via OpenAI Whisper:', transcription.substring(0, 50))
            return NextResponse.json({
              success: true,
              text: transcription.trim(),
              source: 'OpenAI Whisper',
            })
          }
        } else {
          const errorText = await response.text()
          console.log(`OpenAI Whisper failed (${response.status}):`, errorText.substring(0, 200))
        }
      } catch (error: any) {
        console.log(`Error with OpenAI Whisper:`, error.message)
      }
    }

    // Si aucune API de transcription n'est disponible, retourner un succès avec suggestion de fallback
    // On ne retourne pas d'erreur car le fallback Web Speech API fonctionne
    console.warn('⚠️ Aucune API de transcription serveur disponible, fallback vers Web Speech API recommandé')
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Les services de transcription serveur (Voxtral/Whisper) ne sont pas configurés. Utilisez la reconnaissance vocale du navigateur (Web Speech API) qui est disponible directement dans votre navigateur, ou tapez votre message.',
        fallback: true,
        suggestion: 'La reconnaissance vocale du navigateur fonctionne sans configuration supplémentaire.',
        useBrowserSpeech: true
      },
      { status: 200 } // 200 au lieu de 503 car c'est un fallback normal, pas une erreur
    )

  } catch (error: any) {
    console.error('❌ Transcription error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erreur lors de la transcription audio. Veuillez réessayer ou utiliser la reconnaissance vocale du navigateur.',
        fallback: true 
      },
      { status: 500 }
    )
  }
}
