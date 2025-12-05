import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Simple client creation - Next.js handles module caching
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
    },
  }
)

// Types pour notre schéma de base de données
export interface Event {
  id: string
  text: string
  english_sentence: string | null
  lang: string | null
  publish_date: string | null
  network: string | null
  url: string | null
  created_at?: string
}

export interface EventLabel {
  id?: number
  event_id: string
  type: string
  value: string
  score: number
  created_at?: string
}

export interface EventLocation {
  id?: number
  event_id: string
  location_type: 'mention' | 'inferred' | 'post'
  name: string | null
  label: string | null
  layer: string | null
  country: string | null
  coordinates: [number, number] | null
  created_at?: string
}

export interface EventMedia {
  id?: number
  event_id: string
  media_type: 'image' | 'video'
  url: string
  created_at?: string
}

export interface EventUser {
  id?: number
  event_id: string
  username: string | null
  created_at?: string
}

export interface UserMetric {
  id?: number
  user_id: number
  metric_name: string
  metric_count: number
  created_at?: string
}

// Types pour les données CMA CGM
export interface Booking {
  job_reference: string
  shipcomp_code: string | null
  shipcomp_name: string | null
  point_load: string | null
  point_load_country: string | null
  point_disch: string | null
  point_disch_country: string | null
  origin: string | null
  destination: string | null
  booking_confirmation_date: string | null
  cancellation_date: string | null
  job_status: number | null
  created_at?: string
  updated_at?: string
}

export interface DtlSequence {
  job_reference: string
  job_dtl_sequence: number
  nb_teu: number | null
  nb_units: number | null
  commodity_description: string | null
  net_weight: number | null
  haz_flag: boolean
  reef_flag: boolean
  is_reefer: boolean
  oversize_flag: boolean
  is_oog: boolean
  package_code: string | null
  commodity_code_lara: string | null
  created_at?: string
  updated_at?: string
}

// Helper functions
export async function testConnection() {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, message: 'Missing Supabase environment variables' }
    }
    // Test avec la table bookings
    const { data, error } = await supabase.from('bookings').select('job_reference').limit(1)
    if (error) throw error
    return { success: true, message: 'Connected to Supabase successfully!', data }
  } catch (error: any) {
    return { success: false, message: `Connection failed: ${error.message || error}` }
  }
}

export async function getEventsCount() {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Missing Supabase environment variables', count: 0 }
    }
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    return { success: true, count }
  } catch (error: any) {
    return { success: false, error: error.message, count: 0 }
  }
}
