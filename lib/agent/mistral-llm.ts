/**
 * Client pour Mistral AI
 * Projet Everdian x Albert School
 */

interface MistralConfig {
  apiKey: string
  model?: string
}

interface GenerateParams {
  model: string
  prompt: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
}

interface GenerateResponse {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

class MistralLLMClient {
  private apiKey: string
  private baseURL = 'https://api.mistral.ai/v1'

  constructor(config: MistralConfig) {
    this.apiKey = config.apiKey
  }

  async generate(params: GenerateParams): Promise<string> {
    const {
      model,
      prompt,
      temperature = 0.1,
      maxTokens = 2000,
      topP = 0.9,
      stream = false,
    } = params

    // Mistral exige top_p = 1 quand temperature = 0 (greedy sampling)
    const actualTopP = temperature === 0 ? 1 : topP

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature,
          max_tokens: maxTokens,
          top_p: actualTopP,
          stream,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Mistral API error: ${response.status} - ${error}`)
      }

      const data = await response.json()

      // Extraire le texte de la réponse
      const text = data.choices?.[0]?.message?.content || ''

      return text.trim()
    } catch (error: any) {
      console.error('Mistral LLM error:', error)
      throw new Error(`Failed to generate response: ${error.message}`)
    }
  }

  /**
   * Génère une réponse structurée en JSON
   */
  async generateJSON<T = any>(params: GenerateParams): Promise<T> {
    const response = await this.generate(params)

    try {
      // Extraire le JSON de la réponse (peut être entouré de markdown)
      // Essayer plusieurs patterns de matching
      let jsonStr: string | null = null

      // Pattern 1: ```json ... ```
      const jsonCodeBlock = response.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonCodeBlock) {
        jsonStr = jsonCodeBlock[1]
      }

      // Pattern 2: ``` ... ``` (sans le "json")
      if (!jsonStr) {
        const codeBlock = response.match(/```\s*([\s\S]*?)\s*```/)
        if (codeBlock) {
          jsonStr = codeBlock[1]
        }
      }

      // Pattern 3: Premier objet JSON trouvé
      if (!jsonStr) {
        const jsonObject = response.match(/\{[\s\S]*\}/)
        if (jsonObject) {
          jsonStr = jsonObject[0]
        }
      }

      if (!jsonStr) {
        throw new Error('No JSON found in response')
      }

      // Nettoyer le JSON agressivement
      jsonStr = jsonStr
        .trim()
        // Remplacer les sauts de ligne dans les strings par des espaces
        .replace(/(\r\n|\n|\r)/gm, ' ')
        // Supprimer les tabulations
        .replace(/\t/g, ' ')
        // Remplacer les multiples espaces par un seul
        .replace(/\s+/g, ' ')
        // Fix common JSON errors
        .replace(/,\s*}/g, '}') // Trailing commas
        .replace(/,\s*]/g, ']')

      // Parser le JSON
      return JSON.parse(jsonStr)
    } catch (error: any) {
      console.error('Failed to parse JSON from LLM response:')
      console.error('Response length:', response.length)
      console.error('First 500 chars:', response.substring(0, 500))
      throw new Error(`Invalid JSON response: ${error.message}`)
    }
  }
}

// Instance singleton (sera initialisée avec la clé API)
let mistralClient: MistralLLMClient | null = null

export function initMistralLLM(apiKey: string) {
  mistralClient = new MistralLLMClient({ apiKey })
  return mistralClient
}

export function getMistralLLM(): MistralLLMClient {
  if (!mistralClient) {
    throw new Error('Mistral LLM client not initialized. Call initMistralLLM first.')
  }
  return mistralClient
}

// Export pour usage direct
export { MistralLLMClient }
export type { GenerateParams, GenerateResponse }
