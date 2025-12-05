"use server"

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { FilterState } from "@/components/AdvancedFilters"

type EventsResponse = {
  success: boolean
  data?: any[]
  error?: string
}

const MAX_LIMIT = 500

const normalizeDate = (value?: string | Date) => {
  if (!value) return undefined
  if (typeof value === "string") return value
  return value.toISOString().split("T")[0]
}

const keywordList = (keywords?: string) =>
  keywords
    ?.split(/[,;]/)
    .map(k => k.trim())
    .filter(Boolean) ?? []

const matchesFilters = (event: any, filters?: FilterState) => {
  if (!filters) return true

  if (filters.dateRange?.from || filters.dateRange?.to) {
    const from = normalizeDate(filters.dateRange?.from)
    const to = normalizeDate(filters.dateRange?.to)
    const publishDate = event.publish_date?.slice(0, 10)
    if (from && publishDate < from) return false
    if (to && publishDate > to) return false
  }

  if (filters.network !== "all" && filters.network) {
    if (event.network?.toLowerCase() !== filters.network) return false
  }

  if (filters.countries?.length) {
    const countries = event.event_locations?.map((loc: any) => loc.country?.toLowerCase()) ?? []
    const hasCountry = filters.countries.some(country => countries.includes(country.toLowerCase()))
    if (!hasCountry) return false
  }

  if (filters.eventTypes?.length) {
    const types = event.event_labels?.map((label: any) => label.value?.toLowerCase()) ?? []
    const hasType = filters.eventTypes.some(type => types.includes(type.toLowerCase()))
    if (!hasType) return false
  }

  const words = keywordList(filters.keywords)
  if (words.length) {
    const haystack = `${event.text || ""}`.toLowerCase()
    const hasKeyword = words.some(word => haystack.includes(word.toLowerCase()))
    if (!hasKeyword) return false
  }

  return true
}

export async function POST(req: NextRequest): Promise<NextResponse<EventsResponse>> {
  try {
    const { filters, limit = 200 } = await req.json()

    const { data, error } = await supabase
      .from("events")
      .select(
        `
        id,
        text,
        publish_date,
        network,
        url,
        event_labels (
          type,
          value
        ),
        event_locations (
          country,
          name
        )
      `
      )
      .order("publish_date", { ascending: false })
      .limit(MAX_LIMIT)

    if (error) {
      throw new Error(error.message)
    }

    const filtered = (data ?? []).filter(event => matchesFilters(event, filters)).slice(0, Math.min(limit, MAX_LIMIT))

    return NextResponse.json({
      success: true,
      data: filtered,
    })
  } catch (error: any) {
    console.error("Events API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unable to fetch events",
      },
      { status: 500 }
    )
  }
}

