#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testMaterializedViews() {
  console.log('📊 Testing materialized views for aggregations...\n')

  // Test 1: Client monthly volumes
  console.log('1️⃣ Client monthly volumes (2020):')
  const { data: clientData } = await supabase
    .from('mv_client_monthly_volumes')
    .select('*')
    .gte('month', '2020-01-01')
    .lt('month', '2020-07-01')
    .order('total_teu', { ascending: false })
    .limit(100)

  const clientTotals: Record<string, { teu: number; bookings: number }> = {}
  clientData?.forEach((row: any) => {
    const key = row.partner_name || row.partner_code || 'Unknown'
    if (!clientTotals[key]) {
      clientTotals[key] = { teu: 0, bookings: 0 }
    }
    clientTotals[key].teu += row.total_teu || 0
    clientTotals[key].bookings += row.booking_count || 0
  })

  Object.entries(clientTotals)
    .sort(([,a], [,b]) => b.teu - a.teu)
    .slice(0, 5)
    .forEach(([client, data]) => {
      console.log(`  ${client}: ${data.teu} TEU, ${data.bookings} bookings`)
    })

  // Test 2: Total volume for a period using mv
  console.log('\n2️⃣ Total volume Jan-Jun 2020 from materialized view:')
  const { data: totalData } = await supabase
    .from('mv_client_monthly_volumes')
    .select('total_teu, total_units, total_weight, booking_count')
    .gte('month', '2020-01-01')
    .lt('month', '2020-07-01')

  const totals = totalData?.reduce((acc, row: any) => ({
    teu: acc.teu + (row.total_teu || 0),
    units: acc.units + (row.total_units || 0),
    weight: acc.weight + (row.total_weight || 0),
    bookings: acc.bookings + (row.booking_count || 0)
  }), { teu: 0, units: 0, weight: 0, bookings: 0 })

  console.log(`  Total TEU: ${totals?.teu?.toLocaleString()}`)
  console.log(`  Total bookings: ${totals?.bookings?.toLocaleString()}`)
  console.log(`  Total units: ${totals?.units?.toLocaleString()}`)
}

testMaterializedViews()
