#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDateRange() {
  console.log('🔍 Checking date range in database...\n')

  // Get min/max dates
  const { data, error } = await supabase
    .from('bookings')
    .select('booking_confirmation_date')
    .not('booking_confirmation_date', 'is', null)
    .order('booking_confirmation_date', { ascending: true })
    .limit(1)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  const { data: maxData, error: maxError } = await supabase
    .from('bookings')
    .select('booking_confirmation_date')
    .not('booking_confirmation_date', 'is', null)
    .order('booking_confirmation_date', { ascending: false })
    .limit(1)

  if (maxError) {
    console.error('❌ Error:', maxError)
    return
  }

  // Get count
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })

  console.log('📊 Database Date Range:')
  console.log('  Min date:', data?.[0]?.booking_confirmation_date)
  console.log('  Max date:', maxData?.[0]?.booking_confirmation_date)
  console.log('  Total bookings:', count)

  // Check data per month
  console.log('\n📅 Bookings per month:')
  const { data: monthly, error: monthlyError } = await supabase
    .from('bookings')
    .select('booking_confirmation_date')
    .not('booking_confirmation_date', 'is', null)
    .order('booking_confirmation_date', { ascending: true })
    .limit(10000)

  if (!monthlyError && monthly) {
    const byMonth: Record<string, number> = {}
    monthly.forEach((row: any) => {
      const month = row.booking_confirmation_date.substring(0, 7) // YYYY-MM
      byMonth[month] = (byMonth[month] || 0) + 1
    })

    Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 20)
      .forEach(([month, count]) => {
        console.log(`  ${month}: ${count.toLocaleString()} bookings`)
      })
  }
}

checkDateRange()
