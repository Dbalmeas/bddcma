"use client"

import { useState } from "react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Download, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { downloadFile } from "@/lib/conversation-manager"
import { Booking } from "@/lib/supabase"

interface DataTableProps {
  data: Booking[]
  title?: string
}

type SortField = 'booking_confirmation_date' | 'shipcomp_name' | 'job_reference' | 'point_load_country' | 'point_disch_country'
type SortDirection = 'asc' | 'desc'

export function DataTable({ data, title = "Raw Booking Data" }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('booking_confirmation_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const pageSize = 50
  const totalPages = Math.ceil(data.length / pageSize)

  // Fonction de tri
  const sortedData = [...data].sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortField) {
      case 'booking_confirmation_date':
        aVal = a.booking_confirmation_date ? new Date(a.booking_confirmation_date).getTime() : 0
        bVal = b.booking_confirmation_date ? new Date(b.booking_confirmation_date).getTime() : 0
        break
      case 'shipcomp_name':
        aVal = a.shipcomp_name || ''
        bVal = b.shipcomp_name || ''
        break
      case 'job_reference':
        aVal = a.job_reference || ''
        bVal = b.job_reference || ''
        break
      case 'point_load_country':
        aVal = a.point_load_country || ''
        bVal = b.point_load_country || ''
        break
      case 'point_disch_country':
        aVal = a.point_disch_country || ''
        bVal = b.point_disch_country || ''
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  //Pagination
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = sortedData.slice(startIndex, endIndex)

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Job Reference', 'Shipping Company', 'Load Country', 'Discharge Country', 'Origin', 'Destination', 'Confirmation Date', 'Status']
    const rows = data.map(booking => [
      booking.job_reference || '',
      booking.shipcomp_name || 'N/A',
      booking.point_load_country || 'N/A',
      booking.point_disch_country || 'N/A',
      booking.origin || 'N/A',
      booking.destination || 'N/A',
      booking.booking_confirmation_date ? new Date(booking.booking_confirmation_date).toLocaleDateString() : 'N/A',
      booking.job_status?.toString() || 'N/A',
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    downloadFile(csv, `cma-cgm-bookings-${Date.now()}.csv`, 'text/csv')
  }

  // Export JSON
  const handleExportJSON = () => {
    const json = JSON.stringify(data, null, 2)
    downloadFile(json, `cma-cgm-bookings-${Date.now()}.json`, 'application/json')
  }

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    )
  }

  return (
    <Card className="p-4 bg-zinc-900/20 border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Showing {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length} bookings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 border-white/10"
          >
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
          <Button
            size="sm"
            onClick={handleExportJSON}
            className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 border-white/10"
          >
            <Download className="h-3 w-3 mr-1" />
            JSON
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th
                className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('job_reference')}
              >
                <div className="flex items-center">
                  Job Reference
                  {renderSortIcon('job_reference')}
                </div>
              </th>
              <th
                className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('shipcomp_name')}
              >
                <div className="flex items-center">
                  Shipping Company
                  {renderSortIcon('shipcomp_name')}
                </div>
              </th>
              <th
                className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('point_load_country')}
              >
                <div className="flex items-center">
                  Load Country
                  {renderSortIcon('point_load_country')}
                </div>
              </th>
              <th
                className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('point_disch_country')}
              >
                <div className="flex items-center">
                  Discharge Country
                  {renderSortIcon('point_disch_country')}
                </div>
              </th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground">
                Origin
              </th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground">
                Destination
              </th>
              <th
                className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('booking_confirmation_date')}
              >
                <div className="flex items-center">
                  Confirmation Date
                  {renderSortIcon('booking_confirmation_date')}
                </div>
              </th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((booking, idx) => (
              <tr
                key={booking.job_reference || idx}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="py-3 px-3 text-xs font-mono text-blue-400">
                  {booking.job_reference}
                </td>
                <td className="py-3 px-3 text-xs">
                  {booking.shipcomp_name || 'N/A'}
                </td>
                <td className="py-3 px-3 text-xs text-muted-foreground">
                  {booking.point_load_country || 'N/A'}
                </td>
                <td className="py-3 px-3 text-xs text-muted-foreground">
                  {booking.point_disch_country || 'N/A'}
                </td>
                <td className="py-3 px-3 text-xs text-muted-foreground">
                  {booking.origin || 'N/A'}
                </td>
                <td className="py-3 px-3 text-xs text-muted-foreground">
                  {booking.destination || 'N/A'}
                </td>
                <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                  {booking.booking_confirmation_date ? new Date(booking.booking_confirmation_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }) : 'N/A'}
                </td>
                <td className="py-3 px-3 text-xs">
                  <span className={`px-2 py-1 rounded text-xs ${
                    booking.job_status === 70
                      ? 'bg-green-500/20 text-green-400'
                      : booking.job_status === 9
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {booking.job_status || 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <div className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 border-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 border-white/10 disabled:opacity-30"
            >
              Next
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
