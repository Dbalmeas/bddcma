"use client"

import { useEffect, useState, useMemo } from "react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Checkbox } from "./ui/checkbox"
import { supabase, getEventsCount, Booking } from "@/lib/supabase"
import { DataTable } from "./DataTable"
import { StructuredReport } from "./StructuredReport"
import { downloadFile } from "@/lib/conversation-manager"
import {
  Download,
  Filter,
  Map,
  Table,
  BarChart3,
  RefreshCw,
  Search,
  X,
  Globe,
  Calendar,
  Tag,
  Ship,
  TrendingUp,
  Activity,
  FileText,
  Package,
} from "lucide-react"
import { EventMap } from "./EventMap"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from "recharts"

// Mapping des codes pays ISO vers les noms complets pour la carte
const ISO_TO_COUNTRY_NAME: Record<string, string> = {
  "CN": "China", "US": "United States", "FR": "France", "DE": "Germany", "GB": "United Kingdom",
  "IT": "Italy", "ES": "Spain", "NL": "Netherlands", "BE": "Belgium", "PT": "Portugal",
  "CA": "Canada", "MX": "Mexico", "BR": "Brazil", "AR": "Argentina", "CO": "Colombia",
  "IN": "India", "JP": "Japan", "KR": "South Korea", "AU": "Australia", "NZ": "New Zealand",
  "RU": "Russia", "TR": "Turkey", "SA": "Saudi Arabia", "AE": "UAE", "EG": "Egypt",
  "ZA": "South Africa", "NG": "Nigeria", "KE": "Kenya", "GH": "Ghana", "MA": "Morocco",
  "PL": "Poland", "RO": "Romania", "GR": "Greece", "CZ": "Czech Republic", "SE": "Sweden",
  "NO": "Norway", "DK": "Denmark", "FI": "Finland", "IE": "Ireland", "CH": "Switzerland",
  "AT": "Austria", "HU": "Hungary", "BG": "Bulgaria", "HR": "Croatia", "SK": "Slovakia",
  "SI": "Slovenia", "LT": "Lithuania", "LV": "Latvia", "EE": "Estonia", "ID": "Indonesia",
  "MY": "Malaysia", "TH": "Thailand", "VN": "Vietnam", "PH": "Philippines", "SG": "Singapore",
  "PK": "Pakistan", "BD": "Bangladesh", "LK": "Sri Lanka", "IR": "Iran", "IQ": "Iraq",
  "SY": "Syria", "JO": "Jordan", "LB": "Lebanon", "IL": "Israel", "QA": "Qatar",
  "KW": "Kuwait", "BH": "Bahrain", "OM": "Oman", "YE": "Yemen", "AF": "Afghanistan",
  "UZ": "Uzbekistan", "KZ": "Kazakhstan", "TJ": "Tajikistan", "KG": "Kyrgyzstan", "TM": "Turkmenistan",
  "UA": "Ukraine", "BY": "Belarus", "RS": "Serbia", "MD": "Moldova", "BA": "Bosnia and Herzegovina",
  "AL": "Albania", "MK": "North Macedonia", "ME": "Montenegro", "XK": "Kosovo",
  "TZ": "Tanzania", "UG": "Uganda", "ET": "Ethiopia", "CM": "Cameroon", "CI": "Ivory Coast",
  "SN": "Senegal", "ML": "Mali", "BF": "Burkina Faso", "RW": "Rwanda", "ZM": "Zambia",
  "MZ": "Mozambique", "MG": "Madagascar", "AO": "Angola", "CD": "Democratic Republic of Congo",
  "PE": "Peru", "CL": "Chile", "EC": "Ecuador", "BO": "Bolivia", "PY": "Paraguay",
  "UY": "Uruguay", "VE": "Venezuela", "CU": "Cuba", "HT": "Haiti", "DO": "Dominican Republic",
  "GT": "Guatemala", "HN": "Honduras", "SV": "El Salvador", "NI": "Nicaragua", "CR": "Costa Rica",
  "PA": "Panama", "PR": "Puerto Rico", "JM": "Jamaica", "TT": "Trinidad and Tobago",
  "GE": "Georgia", "AM": "Armenia", "AZ": "Azerbaijan", "MN": "Mongolia",
  "PG": "Papua New Guinea", "FJ": "Fiji", "MM": "Myanmar", "KH": "Cambodia", "LA": "Laos",
  "NP": "Nepal", "MV": "Maldives", "BN": "Brunei", "TL": "East Timor",
}

const convertCountryCodeToName = (code: string): string => {
  return ISO_TO_COUNTRY_NAME[code] || code
}

interface AnalyticsStats {
  totalBookings: number | null
  filteredCount: number
  shipcomps: string[]
  loadCountries: string[]
  dischargeCountries: string[]
  jobStatuses: number[]
}

interface Filters {
  dateFrom: string
  dateTo: string
  loadCountries: string[]
  dischargeCountries: string[]
  shipcomps: string[]
  jobStatuses: number[]
  keywords: string
}

const INITIAL_FILTERS: Filters = {
  dateFrom: "",
  dateTo: "",
  loadCountries: [],
  dischargeCountries: [],
  shipcomps: [],
  jobStatuses: [],
  keywords: "",
}

export function AnalyticsSection() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState<string>("")
  const [stats, setStats] = useState<AnalyticsStats>({
    totalBookings: null,
    filteredCount: 0,
    shipcomps: [],
    loadCountries: [],
    dischargeCountries: [],
    jobStatuses: [],
  })
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [showFilters, setShowFilters] = useState(true)
  const [activeView, setActiveView] = useState<"map" | "table" | "stats">("stats")
  
  // Search states for filter lists
  const [loadCountrySearch, setLoadCountrySearch] = useState("")
  const [dischargeCountrySearch, setDischargeCountrySearch] = useState("")
  const [shipcompSearch, setShipcompSearch] = useState("")
  
  // Filtered lists for display
  const filteredLoadCountries = useMemo(() => {
    if (!loadCountrySearch.trim()) return stats.loadCountries
    const search = loadCountrySearch.toLowerCase()
    return stats.loadCountries.filter((c) => c.toLowerCase().includes(search))
  }, [stats.loadCountries, loadCountrySearch])
  
  const filteredDischargeCountries = useMemo(() => {
    if (!dischargeCountrySearch.trim()) return stats.dischargeCountries
    const search = dischargeCountrySearch.toLowerCase()
    return stats.dischargeCountries.filter((c) => c.toLowerCase().includes(search))
  }, [stats.dischargeCountries, dischargeCountrySearch])

  const filteredShipcomps = useMemo(() => {
    if (!shipcompSearch.trim()) return stats.shipcomps
    const search = shipcompSearch.toLowerCase()
    return stats.shipcomps.filter((s) => s.toLowerCase().includes(search))
  }, [stats.shipcomps, shipcompSearch])

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setLoadingProgress("Connecting to database...")
    try {
      const countResult = await getEventsCount()
      const totalCount = countResult.success ? countResult.count ?? 0 : 0

      setLoadingProgress("Loading filter options...")
      
      // Helper function to load all rows with pagination
      const loadAllRows = async (table: string, column: string) => {
        const allRows: any[] = []
        let page = 0
        const pageSize = 1000
        let hasMore = true
        
        while (hasMore) {
          const { data, error } = await supabase
            .from(table)
            .select(column)
            .not(column, "is", null)
            .range(page * pageSize, (page + 1) * pageSize - 1)
          
          if (error || !data || data.length === 0) {
            hasMore = false
          } else {
            allRows.push(...data)
            hasMore = data.length === pageSize
            page++
          }
        }
        return allRows
      }
      
      // Get all distinct shipcomps
      const shipcompsData = await loadAllRows("bookings", "shipcomp_name")
      const allShipcomps = [...new Set(shipcompsData.map((r: any) => r.shipcomp_name).filter(Boolean))]
      
      // Get all distinct load countries
      const loadCountriesData = await loadAllRows("bookings", "point_load_country")
      const allLoadCountries = [...new Set(loadCountriesData.map((r: any) => r.point_load_country).filter(Boolean))]
      
      // Get all distinct discharge countries
      const dischargeCountriesData = await loadAllRows("bookings", "point_disch_country")
      const allDischargeCountries = [...new Set(dischargeCountriesData.map((r: any) => r.point_disch_country).filter(Boolean))]
      
      // Get all distinct job statuses
      const statusesData = await loadAllRows("bookings", "job_status")
      const allStatuses = [...new Set(statusesData.map((r: any) => r.job_status).filter(Boolean))]

      // Load ALL bookings using pagination
      const PAGE_SIZE = 1000
      const allData: Booking[] = []
      let page = 0
      let hasMore = true

      setLoadingProgress(`Loading ${totalCount.toLocaleString()} bookings...`)

      while (hasMore) {
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .order("booking_confirmation_date", { ascending: false, nullsFirst: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allData.push(...(data as Booking[]))
          page++
          setLoadingProgress(`Loaded ${allData.length.toLocaleString()} / ${totalCount.toLocaleString()} bookings...`)
          hasMore = data.length === PAGE_SIZE && allData.length < totalCount
        } else {
          hasMore = false
        }
      }

      setBookings(allData)
      setStats({
        totalBookings: totalCount,
        filteredCount: allData.length,
        shipcomps: allShipcomps.sort() as string[],
        loadCountries: allLoadCountries.sort() as string[],
        dischargeCountries: allDischargeCountries.sort() as string[],
        jobStatuses: allStatuses.sort((a, b) => a - b) as number[],
      })
    } catch (e: any) {
      console.error("Failed to load analytics data:", e)
      setLoadingProgress(`Error: ${e?.message || 'Unknown error occurred'}`)
      // Set empty stats to prevent crashes
      setStats({
        totalBookings: 0,
        filteredCount: 0,
        shipcomps: [],
        loadCountries: [],
        dischargeCountries: [],
        jobStatuses: [],
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Date filter
      if (filters.dateFrom && booking.booking_confirmation_date && booking.booking_confirmation_date < filters.dateFrom) return false
      if (filters.dateTo && booking.booking_confirmation_date && booking.booking_confirmation_date > filters.dateTo) return false

      // Shipcomp filter
      if (filters.shipcomps.length > 0 && booking.shipcomp_name && !filters.shipcomps.includes(booking.shipcomp_name)) return false

      // Load country filter
      if (filters.loadCountries.length > 0 && booking.point_load_country && !filters.loadCountries.includes(booking.point_load_country)) return false

      // Discharge country filter
      if (filters.dischargeCountries.length > 0 && booking.point_disch_country && !filters.dischargeCountries.includes(booking.point_disch_country)) return false

      // Job status filter
      if (filters.jobStatuses.length > 0 && booking.job_status !== null && !filters.jobStatuses.includes(booking.job_status)) return false

      // Keyword filter
      if (filters.keywords.trim()) {
        const keywords = filters.keywords.toLowerCase().split(/[,;]/).map((k) => k.trim())
        const searchText = [
          booking.job_reference,
          booking.point_load,
          booking.point_disch,
          booking.origin,
          booking.destination,
        ].filter(Boolean).join(" ").toLowerCase()
        if (!keywords.some((k) => searchText.includes(k))) return false
      }

      return true
    })
  }, [bookings, filters])

  // Country counts for map visualization (using load countries) - convert codes to names
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const activeCountryFilter = filters.loadCountries.length > 0

    filteredBookings.forEach((booking) => {
      if (booking.point_load_country) {
        const countryName = convertCountryCodeToName(booking.point_load_country)
          if (activeCountryFilter) {
          if (filters.loadCountries.includes(booking.point_load_country)) {
            counts[countryName] = (counts[countryName] || 0) + 1
            }
          } else {
          counts[countryName] = (counts[countryName] || 0) + 1
          }
        }
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
  }, [filteredBookings, filters.loadCountries])

  // Bookings grouped by country for map popups - convert codes to names
  const bookingsByCountry = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    const activeCountryFilter = filters.loadCountries.length > 0

    filteredBookings.forEach((booking) => {
      if (booking.point_load_country) {
        const countryName = convertCountryCodeToName(booking.point_load_country)
        if (activeCountryFilter && !filters.loadCountries.includes(booking.point_load_country)) {
            return
          }
        if (!grouped[countryName]) {
          grouped[countryName] = []
          }
        // Convert Booking to EventDetail-like format for EventMap
        const eventDetail = {
          id: booking.job_reference,
          text: `${booking.job_reference} - ${booking.shipcomp_name || 'Unknown'}`,
          publish_date: booking.booking_confirmation_date || '',
          network: booking.shipcomp_name || '',
          url: '',
        }
        if (!grouped[countryName].find((e) => e.id === booking.job_reference)) {
          grouped[countryName].push(eventDetail)
          }
        }
      })
    Object.keys(grouped).forEach((country) => {
      grouped[country].sort((a, b) => {
        const dateA = a.publish_date ? new Date(a.publish_date).getTime() : 0
        const dateB = b.publish_date ? new Date(b.publish_date).getTime() : 0
        return dateB - dateA
      })
    })
    return grouped
  }, [filteredBookings, filters.loadCountries])

  // Shipcomp counts
  const shipcompCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const activeShipcompFilter = filters.shipcomps.length > 0

    filteredBookings.forEach((booking) => {
      if (booking.shipcomp_name) {
        if (activeShipcompFilter) {
          if (filters.shipcomps.includes(booking.shipcomp_name)) {
            counts[booking.shipcomp_name] = (counts[booking.shipcomp_name] || 0) + 1
            }
          } else {
          counts[booking.shipcomp_name] = (counts[booking.shipcomp_name] || 0) + 1
          }
        }
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [filteredBookings, filters.shipcomps])

  // Job status counts
  const jobStatusCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    const activeStatusFilter = filters.jobStatuses.length > 0

    filteredBookings.forEach((booking) => {
      if (booking.job_status !== null) {
        if (activeStatusFilter) {
          if (filters.jobStatuses.includes(booking.job_status)) {
            counts[booking.job_status] = (counts[booking.job_status] || 0) + 1
          }
        } else {
          counts[booking.job_status] = (counts[booking.job_status] || 0) + 1
        }
      }
    })
    return Object.entries(counts)
      .map(([status, count]) => [Number(status), count] as [number, number])
      .sort((a, b) => b[1] - a[1])
  }, [filteredBookings, filters.jobStatuses])

  // Timeline data - bookings per day
  const timelineData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredBookings.forEach((booking) => {
      if (booking.booking_confirmation_date) {
        const date = booking.booking_confirmation_date.split("T")[0]
        counts[date] = (counts[date] || 0) + 1
      }
    })
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        fullDate: date,
        bookings: count,
      }))
  }, [filteredBookings])

  // Weekly trend
  const weeklyTrend = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredBookings.forEach((booking) => {
      if (booking.booking_confirmation_date) {
        const date = new Date(booking.booking_confirmation_date)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekKey = weekStart.toISOString().split("T")[0]
        counts[weekKey] = (counts[weekKey] || 0) + 1
      }
    })
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        bookings: count,
      }))
  }, [filteredBookings])

  // Shipcomp distribution for pie chart
  const shipcompDistribution = useMemo(() => {
    return shipcompCounts.map(([name, value]) => ({ name, value }))
  }, [shipcompCounts])

  // Chart colors
  const CHART_COLORS = [
    "#3B82F6", "#60A5FA", "#1E40AF", "#06B6D4", "#0EA5E9",
    "#2563EB", "#7DD3FC", "#0284C7", "#1D4ED8", "#38BDF8",
  ]

  const handleExportCSV = () => {
    const headers = ["Job Reference", "Shipcomp", "Load Country", "Discharge Country", "Origin", "Destination", "Confirmation Date", "Status"]
    const rows = filteredBookings.map((booking) => [
      booking.job_reference || "",
      booking.shipcomp_name || "",
      booking.point_load_country || "",
      booking.point_disch_country || "",
      booking.origin || "",
      booking.destination || "",
      booking.booking_confirmation_date || "",
      booking.job_status?.toString() || "",
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    downloadFile(csv, `cma-cgm-bookings-${Date.now()}.csv`, "text/csv")
  }

  const handleExportJSON = () => {
    const json = JSON.stringify(filteredBookings, null, 2)
    downloadFile(json, `cma-cgm-bookings-${Date.now()}.json`, "application/json")
  }

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS)
  }

  const toggleFilter = (
    key: "loadCountries" | "dischargeCountries" | "shipcomps" | "jobStatuses",
    value: string | number
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }))
  }

  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.loadCountries.length > 0 ||
    filters.dischargeCountries.length > 0 ||
    filters.shipcomps.length > 0 ||
    filters.jobStatuses.length > 0 ||
    filters.keywords.trim()

  // Report generation state
  const [showReport, setShowReport] = useState(false)

  // Generate report data from filtered bookings
  const reportData = useMemo(() => {
    if (!showReport || filteredBookings.length === 0) return null

    const dates = filteredBookings
      .map((b) => b.booking_confirmation_date)
      .filter(Boolean)
      .sort()
    const dateRange = dates.length > 0 ? {
      start: dates[0],
      end: dates[dates.length - 1]
    } : undefined

    const byShipcomp: Record<string, number> = {}
    const byLoadCountry: Record<string, number> = {}
    const byDischargeCountry: Record<string, number> = {}
    const byStatus: Record<number, number> = {}

    filteredBookings.forEach((booking) => {
      if (booking.shipcomp_name) {
        byShipcomp[booking.shipcomp_name] = (byShipcomp[booking.shipcomp_name] || 0) + 1
      }
      if (booking.point_load_country) {
        byLoadCountry[booking.point_load_country] = (byLoadCountry[booking.point_load_country] || 0) + 1
        }
      if (booking.point_disch_country) {
        byDischargeCountry[booking.point_disch_country] = (byDischargeCountry[booking.point_disch_country] || 0) + 1
        }
      if (booking.job_status !== null) {
        byStatus[booking.job_status] = (byStatus[booking.job_status] || 0) + 1
      }
    })

    const topShipcompsList = Object.entries(byShipcomp)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([s, n]) => `${s} (${n})`)
      .join(", ")

    const topLoadCountriesList = Object.entries(byLoadCountry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([c, n]) => `${c} (${n})`)
      .join(", ")

    const dateRangeText = dateRange
      ? `${new Date(dateRange.start).toLocaleDateString("fr-FR")} au ${new Date(dateRange.end).toLocaleDateString("fr-FR")}`
      : "Non spécifié"

    const filterSummary = []
    if (filters.shipcomps.length > 0) filterSummary.push(`Compagnies: ${filters.shipcomps.join(", ")}`)
    if (filters.loadCountries.length > 0) filterSummary.push(`Pays de chargement: ${filters.loadCountries.join(", ")}`)
    if (filters.dischargeCountries.length > 0) filterSummary.push(`Pays de déchargement: ${filters.dischargeCountries.join(", ")}`)
    if (filters.keywords) filterSummary.push(`Mots-clés: ${filters.keywords}`)

    const summary = `**Rapport d'analyse des réservations CMA CGM**

Ce rapport présente une analyse de **${filteredBookings.length} réservations** ${hasActiveFilters ? "filtrées" : ""} du **${dateRangeText}**.

${hasActiveFilters ? `**Filtres appliqués:** ${filterSummary.join(" | ")}` : ""}

**Distribution par compagnie:** Les compagnies les plus représentées sont ${topShipcompsList || "Non disponible"}.

**Pays de chargement:** Les pays les plus représentés sont ${topLoadCountriesList || "Non disponible"}.`

    const shipcompPieData = Object.entries(byShipcomp)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }))

    return {
      summary,
      statistics: {
        total: filteredBookings.length,
        dateRange,
        byShipcomp,
        byLoadCountry,
        byDischargeCountry,
        byStatus,
      },
      charts: shipcompPieData.length > 0 ? [
        {
          type: "pie" as const,
          title: "Top Shipcomps",
          data: shipcompPieData,
        }
      ] : [],
      rawData: filteredBookings.slice(0, 100),
      notableEvents: filteredBookings.slice(0, 5),
    }
  }, [showReport, filteredBookings, filters, hasActiveFilters])

  return (
    <section id="analytics" className="scroll-mt-32 pb-12">
      <div className="px-4 md:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.35em] text-primary/80 uppercase mb-1">
              Analytics
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold">
              Database Explorer
            </h2>
            <p className="text-sm text-foreground/60 mt-1">
              {loading
                ? loadingProgress || "Loading bookings..."
                : `${filteredBookings.length.toLocaleString()} bookings${
                    hasActiveFilters
                      ? ` (filtered from ${stats.totalBookings?.toLocaleString() || "—"})`
                      : ` of ${stats.totalBookings?.toLocaleString() || "—"} total`
                  }`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={loadData}
              disabled={loading}
              className="border-white/20"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className="border-white/20"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 rounded-full">
                  {
                    [
                      filters.dateFrom ? 1 : 0,
                      filters.dateTo ? 1 : 0,
                      filters.loadCountries.length > 0 ? 1 : 0,
                      filters.dischargeCountries.length > 0 ? 1 : 0,
                      filters.shipcomps.length > 0 ? 1 : 0,
                      filters.jobStatuses.length > 0 ? 1 : 0,
                      filters.keywords ? 1 : 0,
                    ].reduce((a, b) => a + b, 0)
                  }
                </span>
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleExportCSV} className="border-white/20">
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={handleExportJSON} className="border-white/20">
              <Download className="h-4 w-4 mr-1" />
              JSON
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowReport(!showReport)} 
              className={showReport ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/30"}
              disabled={filteredBookings.length === 0}
            >
              <FileText className="h-4 w-4 mr-1" />
              {showReport ? "Fermer Rapport" : "Générer Rapport"}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-4 md:p-6 bg-black/60 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Filtering capabilities</h3>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={clearFilters} className="h-7 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Confirmation Date Range
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    className="h-8 text-xs bg-black/40 border-white/10"
                  />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    className="h-8 text-xs bg-black/40 border-white/10"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  Keywords
                </Label>
                <Input
                  placeholder="Search job reference, origin, destination..."
                  value={filters.keywords}
                  onChange={(e) => setFilters((f) => ({ ...f, keywords: e.target.value }))}
                  className="h-8 text-xs bg-black/40 border-white/10"
                />
              </div>

              {/* Load Countries */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Load Countries ({filters.loadCountries.length}/{stats.loadCountries.length} selected)
                </Label>
                <Input
                  placeholder="Search countries..."
                  value={loadCountrySearch}
                  onChange={(e) => setLoadCountrySearch(e.target.value)}
                  className="h-7 text-xs bg-black/40 border-white/10 mb-1"
                />
                <div className="max-h-40 overflow-y-auto bg-black/40 border border-white/10 rounded-md p-2 space-y-1">
                  {filteredLoadCountries.map((country) => (
                    <div key={country} className="flex items-center gap-2">
                      <Checkbox
                        id={`load-country-${country}`}
                        checked={filters.loadCountries.includes(country)}
                        onCheckedChange={() => toggleFilter("loadCountries", country)}
                      />
                      <label htmlFor={`load-country-${country}`} className="text-xs cursor-pointer">
                        {country}
                      </label>
                    </div>
                  ))}
                  {filteredLoadCountries.length === 0 && (
                    <p className="text-xs text-foreground/40 py-2">
                      {stats.loadCountries.length === 0 ? "No countries found" : "No match"}
                    </p>
                  )}
                </div>
              </div>

              {/* Discharge Countries */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Discharge Countries ({filters.dischargeCountries.length}/{stats.dischargeCountries.length} selected)
                </Label>
                <Input
                  placeholder="Search countries..."
                  value={dischargeCountrySearch}
                  onChange={(e) => setDischargeCountrySearch(e.target.value)}
                  className="h-7 text-xs bg-black/40 border-white/10 mb-1"
                />
                <div className="max-h-40 overflow-y-auto bg-black/40 border border-white/10 rounded-md p-2 space-y-1">
                  {filteredDischargeCountries.map((country) => (
                    <div key={country} className="flex items-center gap-2">
                      <Checkbox
                        id={`discharge-country-${country}`}
                        checked={filters.dischargeCountries.includes(country)}
                        onCheckedChange={() => toggleFilter("dischargeCountries", country)}
                      />
                      <label htmlFor={`discharge-country-${country}`} className="text-xs cursor-pointer">
                        {country}
                      </label>
                    </div>
                  ))}
                  {filteredDischargeCountries.length === 0 && (
                    <p className="text-xs text-foreground/40 py-2">
                      {stats.dischargeCountries.length === 0 ? "No countries found" : "No match"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Shipcomps and Job Statuses */}
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                  <Ship className="h-3 w-3" />
                  Shipping Companies
                </Label>
                <Input
                  placeholder="Search companies..."
                  value={shipcompSearch}
                  onChange={(e) => setShipcompSearch(e.target.value)}
                  className="h-7 text-xs bg-black/40 border-white/10 mb-1"
                />
                <div className="max-h-40 overflow-y-auto bg-black/40 border border-white/10 rounded-md p-2 space-y-1">
                  {filteredShipcomps.map((shipcomp) => (
                    <div key={shipcomp} className="flex items-center gap-2">
                      <Checkbox
                        id={`shipcomp-${shipcomp}`}
                        checked={filters.shipcomps.includes(shipcomp)}
                        onCheckedChange={() => toggleFilter("shipcomps", shipcomp)}
                      />
                      <label htmlFor={`shipcomp-${shipcomp}`} className="text-xs cursor-pointer">
                        {shipcomp}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Job Status
              </Label>
              <div className="flex flex-wrap gap-2">
                  {stats.jobStatuses.map((status) => (
                  <button
                      key={status}
                    type="button"
                      onClick={() => toggleFilter("jobStatuses", status)}
                    className={`px-3 py-1 text-xs rounded-full border transition ${
                        filters.jobStatuses.includes(status)
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-black/40 border-white/20 text-foreground/70 hover:border-white/40"
                    }`}
                  >
                      {status}
                  </button>
                ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* View Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView("map")}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition ${
              activeView === "map"
                ? "bg-white/10 text-white"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <Map className="h-4 w-4" />
            Map View
          </button>
          <button
            type="button"
            onClick={() => setActiveView("table")}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition ${
              activeView === "table"
                ? "bg-white/10 text-white"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <Table className="h-4 w-4" />
            Table View
          </button>
          <button
            type="button"
            onClick={() => setActiveView("stats")}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition ${
              activeView === "stats"
                ? "bg-white/10 text-white"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Statistics
          </button>
        </div>

        {/* Report View */}
        {showReport && reportData && (
          <Card className="p-6 bg-gradient-to-br from-slate-900/60 to-black/40 border-blue-500/20 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Rapport sur les réservations filtrées
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setShowReport(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <StructuredReport {...reportData} />
          </Card>
        )}

        {/* Content */}
        <div className="min-h-[500px]">
          {loading ? (
            <div className="h-[500px] flex flex-col items-center justify-center text-foreground/60">
              <RefreshCw className="h-8 w-8 animate-spin mb-4" />
              <p className="text-sm">{loadingProgress || "Loading database..."}</p>
            </div>
          ) : activeView === "map" ? (
            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              <Card className="bg-[#0a1628] border-white/10 overflow-hidden min-h-[500px] relative">
                <div className="absolute top-4 left-4 z-20 bg-black/70 px-3 py-2 rounded-lg border border-white/10">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    Booking Distribution
                  </h3>
                  <p className="text-xs text-foreground/60 mt-1">
                    {filteredBookings.length.toLocaleString()} bookings across{" "}
                    {countryCounts.length} countries
                  </p>
                </div>
                <EventMap 
                  countryCounts={countryCounts}
                  eventsByCountry={bookingsByCountry}
                  totalEvents={filteredBookings.length} 
                />
              </Card>

              <div className="space-y-4">
                <Card className="bg-black/60 border-white/10 p-4">
                  <h4 className="text-xs font-semibold mb-3 text-foreground/80">
                    TOP LOAD COUNTRIES
                  </h4>
                  <div className="space-y-2">
                    {countryCounts.slice(0, 10).map(([country, count], i) => (
                      <div key={country} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="text-foreground/40 w-4">{i + 1}</span>
                          <span>{country}</span>
                        </span>
                        <span className="font-mono text-foreground/60">{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="bg-black/60 border-white/10 p-4">
                  <h4 className="text-xs font-semibold mb-3 text-foreground/80">
                    BY SHIPPING COMPANY
                  </h4>
                  <div className="space-y-2">
                    {shipcompCounts.map(([shipcomp, count]) => (
                      <div key={shipcomp} className="flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                          {shipcomp}
                        </span>
                        <span className="font-mono text-foreground/60">{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          ) : activeView === "table" ? (
            <DataTable data={filteredBookings as any} title="Filtered Bookings" />
          ) : (
            /* Stats view */
            <div className="space-y-6">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-blue-950/80 to-black/60 border-blue-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-blue-400" />
                    <p className="text-xs text-foreground/60 uppercase tracking-wider">Total Bookings</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stats.totalBookings?.toLocaleString() || "—"}
                  </p>
                </Card>
                <Card className="bg-gradient-to-br from-cyan-950/80 to-black/60 border-cyan-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-4 w-4 text-cyan-400" />
                    <p className="text-xs text-foreground/60 uppercase tracking-wider">Filtered</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{filteredBookings.length.toLocaleString()}</p>
                </Card>
                <Card className="bg-gradient-to-br from-sky-950/80 to-black/60 border-sky-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Ship className="h-4 w-4 text-sky-400" />
                    <p className="text-xs text-foreground/60 uppercase tracking-wider">Companies</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {hasActiveFilters ? shipcompCounts.length : stats.shipcomps.length}
                  </p>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-950/80 to-black/60 border-indigo-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-indigo-400" />
                    <p className="text-xs text-foreground/60 uppercase tracking-wider">Load Countries</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {hasActiveFilters ? filters.loadCountries.length || countryCounts.length : stats.loadCountries.length}
                  </p>
                </Card>
                <Card className="bg-gradient-to-br from-slate-900/80 to-black/60 border-slate-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-slate-400" />
                    <p className="text-xs text-foreground/60 uppercase tracking-wider">Status Types</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {hasActiveFilters ? filters.jobStatuses.length || jobStatusCounts.length : stats.jobStatuses.length}
                  </p>
                </Card>
              </div>

              {/* Timeline Chart */}
              <Card className="bg-gradient-to-br from-slate-900/60 to-black/60 border-blue-500/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <h4 className="text-sm font-semibold uppercase tracking-wider">Bookings Timeline</h4>
                </div>
                <div className="h-[280px]">
                  {timelineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData}>
                        <defs>
                          <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5}/>
                            <stop offset="50%" stopColor="#1E40AF" stopOpacity={0.2}/>
                            <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                          tickLine={false}
                          axisLine={{ stroke: 'rgba(59,130,246,0.2)' }}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(10,20,40,0.95)', 
                            border: '1px solid rgba(59,130,246,0.4)',
                            borderRadius: '8px',
                            color: '#fff',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                          }}
                          labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="bookings" 
                          stroke="#60A5FA" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorBookings)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-foreground/40">
                      No timeline data available
                    </div>
                  )}
                </div>
              </Card>

              {/* Charts Row */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Shipcomp Distribution */}
                <Card className="bg-gradient-to-br from-slate-900/60 to-black/60 border-cyan-500/20 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Ship className="h-4 w-4 text-cyan-400" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider">
                      Shipping Companies ({shipcompCounts.length})
                    </h4>
                  </div>
                  <div className="h-[220px]">
                    {shipcompDistribution.length > 0 ? (
                      <div className="h-full flex flex-col">
                        <div className="flex-1 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height={140}>
                            <PieChart>
                              <Pie
                                data={shipcompDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={65}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="rgba(0,0,0,0.4)"
                                strokeWidth={1}
                              >
                                {shipcompDistribution.map((entry, index) => (
                                  <Cell 
                                    key={`cell-shipcomp-${index}`} 
                                    fill={CHART_COLORS[index % CHART_COLORS.length]} 
                                  />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(10,20,40,0.95)', 
                                  border: '1px solid rgba(59,130,246,0.4)',
                                  borderRadius: '8px',
                                  color: '#fff',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          {shipcompDistribution.map((item, index) => (
                            <div key={item.name} className="flex items-center gap-1.5 text-xs">
                              <div 
                                className="w-2.5 h-2.5 rounded-sm" 
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="text-white/70">{item.name}</span>
                              <span className="text-white/40">({item.value})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-foreground/40">
                        No shipcomp data
                      </div>
                    )}
                  </div>
                </Card>

                {/* Top Load Countries */}
              <Card className="bg-gradient-to-br from-slate-900/60 to-black/60 border-blue-500/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <h4 className="text-sm font-semibold uppercase tracking-wider">
                      Top Load Countries
                  </h4>
                </div>
                  <div className="h-[220px]">
                    {countryCounts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={countryCounts.slice(0, 10).map(([country, count]) => ({ country, bookings: count }))} layout="vertical">
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#1E40AF" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" horizontal={true} vertical={false} />
                        <XAxis 
                          type="number"
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          type="category"
                          dataKey="country" 
                          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                            width={80}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(10,20,40,0.95)', 
                            border: '1px solid rgba(59,130,246,0.4)',
                            borderRadius: '8px',
                            color: '#fff',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                          }}
                          cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                        />
                        <Bar 
                            dataKey="bookings" 
                          fill="url(#barGradient)"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-foreground/40">
                        No country data
                    </div>
                  )}
                </div>
              </Card>

                {/* Weekly Trend */}
                <Card className="bg-gradient-to-br from-slate-900/60 to-black/60 border-indigo-500/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider">Weekly Trend</h4>
                </div>
                  <div className="h-[220px]">
                    {weeklyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" vertical={false} />
                        <XAxis 
                            dataKey="week" 
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }}
                          tickLine={false}
                          axisLine={{ stroke: 'rgba(59,130,246,0.2)' }}
                        />
                        <YAxis 
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(10,20,40,0.95)', 
                            border: '1px solid rgba(59,130,246,0.4)',
                            borderRadius: '8px',
                            color: '#fff',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                          }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="bookings" 
                            stroke="#818CF8" 
                            strokeWidth={2.5}
                            dot={{ fill: '#4F46E5', strokeWidth: 2, stroke: '#818CF8', r: 4 }}
                            activeDot={{ r: 6, fill: '#A5B4FC', stroke: '#4F46E5' }}
                        />
                        </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-foreground/40">
                        No weekly data
                    </div>
                  )}
                </div>
              </Card>
                  </div>
                  </div>
          )}
        </div>
      </div>
    </section>
  )
}
