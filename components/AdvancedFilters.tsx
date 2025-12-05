"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Checkbox } from "./ui/checkbox"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Filter, Calendar as CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

// Common countries in the database
const COUNTRIES = [
  "France",
  "United States",
  "United Kingdom",
  "Germany",
  "Spain",
  "Italy",
  "Canada",
  "Australia",
  "Gaza",
  "Israel",
  "Palestine",
  "Ukraine",
  "Russia",
  "China",
  "Japan",
  "Brazil",
  "India",
  "South Africa",
]

// Common event types
const EVENT_TYPES = [
  "Accident",
  "Cyberattack",
  "Crime",
  "Illicit",
  "Security",
  "Aviation",
  "Railway",
  "Road",
  "Arrest",
  "Incident",
  "Conflict",
  "Political",
  "Natural Disaster",
  "Health",
]

export interface FilterState {
  dateRange?: DateRange
  countries: string[]
  eventTypes: string[]
  keywords: string
  network: "all" | "twitter" | "news"
}

interface AdvancedFiltersProps {
  onApplyFilters: (filters: FilterState) => void
  initialFilters?: FilterState
}

export function AdvancedFilters({ onApplyFilters, initialFilters }: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialFilters?.dateRange)
  const [selectedCountries, setSelectedCountries] = useState<string[]>(initialFilters?.countries || [])
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(initialFilters?.eventTypes || [])
  const [keywords, setKeywords] = useState(initialFilters?.keywords || "")
  const [network, setNetwork] = useState<"all" | "twitter" | "news">(initialFilters?.network || "all")

  const handleApply = () => {
    onApplyFilters({
      dateRange,
      countries: selectedCountries,
      eventTypes: selectedEventTypes,
      keywords,
      network,
    })
    setOpen(false)
  }

  const handleClear = () => {
    setDateRange(undefined)
    setSelectedCountries([])
    setSelectedEventTypes([])
    setKeywords("")
    setNetwork("all")
  }

  const toggleCountry = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    )
  }

  const toggleEventType = (type: string) => {
    setSelectedEventTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const hasActiveFilters =
    dateRange !== undefined ||
    selectedCountries.length > 0 ||
    selectedEventTypes.length > 0 ||
    keywords.trim() !== "" ||
    network !== "all"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="xs"
          variant="ghost"
          className="border-white/20 bg-transparent hover:bg-white/5"
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 rounded-full">
              {[
                dateRange ? 1 : 0,
                selectedCountries.length > 0 ? 1 : 0,
                selectedEventTypes.length > 0 ? 1 : 0,
                keywords ? 1 : 0,
                network !== "all" ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-white/10">
        <DialogHeader>
          <DialogTitle>Advanced Filters</DialogTitle>
          <DialogDescription>
            Refine your search with detailed filtering options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className="w-full justify-start text-left font-normal bg-zinc-800 hover:bg-zinc-700 border-white/10"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span className="text-muted-foreground">Select date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  initialFocus
                />
                {dateRange && (
                  <div className="p-3 border-t border-white/10">
                    <Button
                      size="sm"
                      onClick={() => setDateRange(undefined)}
                      className="w-full bg-zinc-800 hover:bg-zinc-700"
                    >
                      Clear dates
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords</Label>
            <div className="relative">
              <Input
                id="keywords"
                placeholder="Search keywords..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="bg-zinc-800 border-white/10"
              />
              {keywords && (
                <button
                  onClick={() => setKeywords("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Network Filter */}
          <div className="space-y-2">
            <Label>Network</Label>
            <RadioGroup value={network} onValueChange={(v) => setNetwork(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="network-all" />
                <Label htmlFor="network-all" className="font-normal cursor-pointer">
                  All sources
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="twitter" id="network-twitter" />
                <Label htmlFor="network-twitter" className="font-normal cursor-pointer">
                  Twitter only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="news" id="network-news" />
                <Label htmlFor="network-news" className="font-normal cursor-pointer">
                  News only
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Countries */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Countries ({selectedCountries.length} selected)</Label>
              {selectedCountries.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setSelectedCountries([])}
                  className="h-6 text-xs bg-zinc-800 hover:bg-zinc-700"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-800/50 rounded-md border border-white/5 max-h-48 overflow-y-auto">
              {COUNTRIES.map((country) => (
                <div key={country} className="flex items-center space-x-2">
                  <Checkbox
                    id={`country-${country}`}
                    checked={selectedCountries.includes(country)}
                    onCheckedChange={() => toggleCountry(country)}
                  />
                  <Label
                    htmlFor={`country-${country}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {country}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Event Types */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Event Types ({selectedEventTypes.length} selected)</Label>
              {selectedEventTypes.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setSelectedEventTypes([])}
                  className="h-6 text-xs bg-zinc-800 hover:bg-zinc-700"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-800/50 rounded-md border border-white/5 max-h-48 overflow-y-auto">
              {EVENT_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={selectedEventTypes.includes(type)}
                    onCheckedChange={() => toggleEventType(type)}
                  />
                  <Label
                    htmlFor={`type-${type}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleClear}
            className="bg-zinc-800 hover:bg-zinc-700 border-white/10"
          >
            Clear All
          </Button>
          <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700">
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
