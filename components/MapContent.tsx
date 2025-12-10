"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { MapMarker, EventDetail } from "./EventMap"

interface MapContentProps {
  markers: MapMarker[]
  totalEvents: number
}

// Helper to truncate text
function truncate(text: string, maxLength: number): string {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

// Helper to format date
function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// Generate popup content for a country with events list
function generatePopupContent(marker: MapMarker): string {
  const eventsToShow = marker.events.slice(0, 10) // Show max 10 events in popup
  const hasMore = marker.events.length > 10

  let eventsHtml = ""
  
  if (eventsToShow.length > 0) {
    eventsHtml = `
      <div style="max-height: 300px; overflow-y: auto; margin-top: 12px;">
        ${eventsToShow
          .map((event) => {
            const eventType = event.event_labels?.[0]?.value || "Event"
            const summary = truncate(event.text || "", 120)
            const date = formatDate(event.publish_date)
            const source = event.network || "Unknown"
            const url = event.url || "#"

            return `
              <div style="padding: 10px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid #3B82F6;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span style="font-size: 10px; padding: 2px 6px; background: rgba(59,130,246,0.3); border-radius: 4px; color: #93C5FD; text-transform: uppercase;">${eventType}</span>
                  <span style="font-size: 10px; color: rgba(255,255,255,0.5);">${date}</span>
                </div>
                <p style="font-size: 12px; color: rgba(255,255,255,0.85); margin: 0 0 8px 0; line-height: 1.4;">${summary}</p>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 10px; color: rgba(255,255,255,0.5);">Source: <strong style="color: rgba(255,255,255,0.7);">${source}</strong></span>
                  ${url !== "#" ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="font-size: 10px; color: #60A5FA; text-decoration: none;">View source →</a>` : ""}
                </div>
              </div>
            `
          })
          .join("")}
        ${hasMore ? `<div style="text-align: center; padding: 8px; color: rgba(255,255,255,0.5); font-size: 11px;">+ ${marker.events.length - 10} more events</div>` : ""}
      </div>
    `
  }

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 320px; max-width: 400px;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div>
          <div style="font-weight: 600; font-size: 16px; color: #fff;">${marker.country}</div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;">${marker.count.toLocaleString()} events recorded</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 28px; font-weight: bold; color: #3B82F6;">${marker.count}</div>
        </div>
      </div>
      ${eventsHtml}
    </div>
  `
}

export default function MapContent({ markers, totalEvents }: MapContentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Initialize map with dark theme
    const map = L.map(containerRef.current, {
      center: [25, 50], // Center on Middle East / South Asia
      zoom: 3,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false,
    })

    // Dark tile layer (CartoDB Dark Matter)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map)

    // Custom attribution
    L.control.attribution({
      position: "bottomright",
      prefix: false,
    }).addTo(map).addAttribution('&copy; <a href="https://carto.com/">CARTO</a>')

    // Create layer group for markers
    markersLayerRef.current = L.layerGroup().addTo(map)

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return

    const map = mapRef.current
    const markersLayer = markersLayerRef.current

    // Clear existing markers
    markersLayer.clearLayers()

    if (markers.length === 0) return

    // Calculate max count for scaling
    const maxCount = Math.max(...markers.map((m) => m.count))

    // Add circle markers for each country
    markers.forEach((marker) => {
      const intensity = marker.count / maxCount
      const radius = Math.max(10, Math.min(45, 10 + intensity * 35))
      
      // Create circle marker
      const circle = L.circleMarker([marker.lat, marker.lng], {
        radius: radius,
        fillColor: `rgba(59, 130, 246, ${0.3 + intensity * 0.5})`,
        color: "#3B82F6",
        weight: 1.5,
        opacity: 0.8,
        fillOpacity: 0.4 + intensity * 0.4,
      })

      // Add popup with detailed events
      circle.bindPopup(generatePopupContent(marker), {
        className: "custom-popup",
        maxWidth: 420,
        maxHeight: 450,
      })

      // Add hover effect
      circle.on("mouseover", function (this: L.CircleMarker) {
        this.setStyle({
          fillOpacity: 0.8,
          weight: 2.5,
          color: "#60A5FA",
        })
      })

      circle.on("mouseout", function (this: L.CircleMarker) {
        this.setStyle({
          fillOpacity: 0.4 + intensity * 0.4,
          weight: 1.5,
          color: "#3B82F6",
        })
      })

      markersLayer.addLayer(circle)

      // Add small inner dot for emphasis on high-count locations
      if (intensity > 0.3) {
        const innerDot = L.circleMarker([marker.lat, marker.lng], {
          radius: 4,
          fillColor: "#60A5FA",
          color: "#93C5FD",
          weight: 1,
          opacity: 1,
          fillOpacity: 1,
        })
        markersLayer.addLayer(innerDot)
      }
    })

    // Fit bounds to show all markers
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 })
    }
  }, [markers])

  return (
    <>
      <style jsx global>{`
        .leaflet-container {
          background: #0a1628 !important;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(10, 22, 40, 0.9) !important;
          color: #fff !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(30, 50, 80, 0.9) !important;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(10, 22, 40, 0.98) !important;
          color: #fff !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 14px 16px !important;
        }
        .leaflet-popup-tip {
          background: rgba(10, 22, 40, 0.98) !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          border-top: none !important;
          border-left: none !important;
        }
        .leaflet-popup-close-button {
          color: rgba(255,255,255,0.6) !important;
          font-size: 20px !important;
          padding: 8px 10px !important;
        }
        .leaflet-popup-close-button:hover {
          color: #fff !important;
        }
        .leaflet-control-attribution {
          background: rgba(0,0,0,0.5) !important;
          color: rgba(255,255,255,0.5) !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: rgba(255,255,255,0.6) !important;
        }
        /* Scrollbar styling for popup */
        .leaflet-popup-content div::-webkit-scrollbar {
          width: 6px;
        }
        .leaflet-popup-content div::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
        }
        .leaflet-popup-content div::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.4);
          border-radius: 3px;
        }
        .leaflet-popup-content div::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.6);
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full min-h-[450px]" />
    </>
  )
}
