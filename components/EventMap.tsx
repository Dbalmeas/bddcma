"use client"

import { useMemo } from "react"
import dynamic from "next/dynamic"

// Country coordinates mapping (centroid approximations)
const COUNTRY_COORDS: Record<string, [number, number]> = {
  // Asia
  "Pakistan": [30.3753, 69.3451],
  "India": [20.5937, 78.9629],
  "China": [35.8617, 104.1954],
  "Japan": [36.2048, 138.2529],
  "South Korea": [35.9078, 127.7669],
  "North Korea": [40.3399, 127.5101],
  "Bangladesh": [23.685, 90.3563],
  "Afghanistan": [33.9391, 67.71],
  "Iran": [32.4279, 53.688],
  "Iraq": [33.2232, 43.6793],
  "Syria": [34.8021, 38.9968],
  "Turkey": [38.9637, 35.2433],
  "Saudi Arabia": [23.8859, 45.0792],
  "Yemen": [15.5527, 48.5164],
  "Oman": [21.4735, 55.9754],
  "UAE": [23.4241, 53.8478],
  "Qatar": [25.3548, 51.1839],
  "Kuwait": [29.3117, 47.4818],
  "Bahrain": [26.0667, 50.5577],
  "Jordan": [30.5852, 36.2384],
  "Lebanon": [33.8547, 35.8623],
  "Israel": [31.0461, 34.8516],
  "Palestine": [31.9522, 35.2332],
  "Indonesia": [-0.7893, 113.9213],
  "Malaysia": [4.2105, 101.9758],
  "Thailand": [15.87, 100.9925],
  "Vietnam": [14.0583, 108.2772],
  "Philippines": [12.8797, 121.774],
  "Myanmar": [21.9162, 95.956],
  "Cambodia": [12.5657, 104.991],
  "Singapore": [1.3521, 103.8198],
  "Nepal": [28.3949, 84.124],
  "Sri Lanka": [7.8731, 80.7718],
  "Uzbekistan": [41.3775, 64.5853],
  "Kazakhstan": [48.0196, 66.9237],
  "Tajikistan": [38.861, 71.2761],
  "Kyrgyzstan": [41.2044, 74.7661],
  "Turkmenistan": [38.9697, 59.5563],

  // Europe
  "Russia": [61.524, 105.3188],
  "Ukraine": [48.3794, 31.1656],
  "Germany": [51.1657, 10.4515],
  "France": [46.2276, 2.2137],
  "United Kingdom": [55.3781, -3.436],
  "UK": [55.3781, -3.436],
  "Italy": [41.8719, 12.5674],
  "Spain": [40.4637, -3.7492],
  "Poland": [51.9194, 19.1451],
  "Romania": [45.9432, 24.9668],
  "Netherlands": [52.1326, 5.2913],
  "Belgium": [50.5039, 4.4699],
  "Greece": [39.0742, 21.8243],
  "Czech Republic": [49.8175, 15.473],
  "Czechia": [49.8175, 15.473],
  "Portugal": [39.3999, -8.2245],
  "Sweden": [60.1282, 18.6435],
  "Hungary": [47.1625, 19.5033],
  "Austria": [47.5162, 14.5501],
  "Switzerland": [46.8182, 8.2275],
  "Belarus": [53.7098, 27.9534],
  "Serbia": [44.0165, 21.0059],
  "Bulgaria": [42.7339, 25.4858],
  "Denmark": [56.2639, 9.5018],
  "Finland": [61.9241, 25.7482],
  "Norway": [60.472, 8.4689],
  "Ireland": [53.1424, -7.6921],
  "Croatia": [45.1, 15.2],
  "Moldova": [47.4116, 28.3699],
  "Bosnia": [43.9159, 17.6791],
  "Bosnia and Herzegovina": [43.9159, 17.6791],
  "Albania": [41.1533, 20.1683],
  "Lithuania": [55.1694, 23.8813],
  "Latvia": [56.8796, 24.6032],
  "Estonia": [58.5953, 25.0136],
  "Slovenia": [46.1512, 14.9955],
  "Kosovo": [42.6026, 20.903],
  "North Macedonia": [41.5124, 21.4532],
  "Montenegro": [42.7087, 19.3744],
  "Slovakia": [48.669, 19.699],

  // Africa
  "Nigeria": [9.082, 8.6753],
  "Egypt": [26.8206, 30.8025],
  "South Africa": [-30.5595, 22.9375],
  "Kenya": [-0.0236, 37.9062],
  "Ethiopia": [9.145, 40.4897],
  "Morocco": [31.7917, -7.0926],
  "Algeria": [28.0339, 1.6596],
  "Sudan": [12.8628, 30.2176],
  "Uganda": [1.3733, 32.2903],
  "Ghana": [7.9465, -1.0232],
  "Tanzania": [-6.369, 34.8888],
  "Congo": [-4.0383, 21.7587],
  "DRC": [-4.0383, 21.7587],
  "Democratic Republic of Congo": [-4.0383, 21.7587],
  "Cameroon": [7.3697, 12.3547],
  "Ivory Coast": [7.54, -5.5471],
  "Cote d'Ivoire": [7.54, -5.5471],
  "Mali": [17.5707, -3.9962],
  "Senegal": [14.4974, -14.4524],
  "Zimbabwe": [-19.0154, 29.1549],
  "Tunisia": [33.8869, 9.5375],
  "Libya": [26.3351, 17.2283],
  "Somalia": [5.1521, 46.1996],
  "Niger": [17.6078, 8.0817],
  "Burkina Faso": [12.2383, -1.5616],
  "Rwanda": [-1.9403, 29.8739],
  "Zambia": [-13.1339, 27.8493],
  "Mozambique": [-18.6657, 35.5296],
  "Madagascar": [-18.7669, 46.8691],
  "Angola": [-11.2027, 17.8739],

  // Americas
  "United States": [37.0902, -95.7129],
  "USA": [37.0902, -95.7129],
  "Canada": [56.1304, -106.3468],
  "Mexico": [23.6345, -102.5528],
  "Brazil": [-14.235, -51.9253],
  "Argentina": [-38.4161, -63.6167],
  "Colombia": [4.5709, -74.2973],
  "Peru": [-9.19, -75.0152],
  "Venezuela": [6.4238, -66.5897],
  "Chile": [-35.6751, -71.543],
  "Ecuador": [-1.8312, -78.1834],
  "Bolivia": [-16.2902, -63.5887],
  "Paraguay": [-23.4425, -58.4438],
  "Uruguay": [-32.5228, -55.7658],
  "Cuba": [21.5218, -77.7812],
  "Haiti": [18.9712, -72.2852],
  "Dominican Republic": [18.7357, -70.1627],
  "Guatemala": [15.7835, -90.2308],
  "Honduras": [15.2, -86.2419],
  "El Salvador": [13.7942, -88.8965],
  "Nicaragua": [12.8654, -85.2072],
  "Costa Rica": [9.7489, -83.7534],
  "Panama": [8.538, -80.7821],

  // Oceania
  "Australia": [-25.2744, 133.7751],
  "New Zealand": [-40.9006, 174.886],
  "Papua New Guinea": [-6.315, 143.9555],
  "Fiji": [-17.7134, 178.065],

  // Central Asia
  "Mongolia": [46.8625, 103.8467],
  "Georgia": [42.3154, 43.3569],
  "Armenia": [40.0691, 45.0382],
  "Azerbaijan": [40.1431, 47.5769],

  // South Asia specific locations often mentioned
  "Lahore": [31.5497, 74.3436],
  "Balochistan": [28.4907, 65.0958],
  "Khyber Pakhtunkhwa": [34.9526, 72.331],
  "North Waziristan": [32.9, 69.85],
  "Muridke": [31.8, 74.2667],
  "Assam": [26.2006, 92.9376],
  "Islamabad": [33.6844, 73.0479],
  "Karachi": [24.8607, 67.0011],
  "Kashmir": [34.0837, 74.7973],
  "Punjab": [31.1471, 75.3412],
  "Sindh": [25.8943, 68.5247],
}

export interface EventDetail {
  id: string
  text: string
  publish_date: string
  network: string
  url: string
  event_labels?: Array<{ type: string; value: string }>
}

export interface MapMarker {
  country: string
  count: number
  lat: number
  lng: number
  events: EventDetail[]
}

interface EventMapProps {
  countryCounts: [string, number][]
  eventsByCountry: Record<string, EventDetail[]>
  totalEvents: number
}

// We need to dynamically import the map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(
  () => import("./MapContent"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0a1628]">
        <div className="text-foreground/60 text-sm">Loading map...</div>
      </div>
    )
  }
)

export function EventMap({ countryCounts, eventsByCountry, totalEvents }: EventMapProps) {
  // Convert country counts to markers with coordinates and events
  const markers = useMemo(() => {
    return countryCounts
      .map(([country, count]) => {
        const coords = COUNTRY_COORDS[country]
        if (!coords) return null
        return {
          country,
          count,
          lat: coords[0],
          lng: coords[1],
          events: eventsByCountry[country] || [],
        }
      })
      .filter(Boolean) as MapMarker[]
  }, [countryCounts, eventsByCountry])

  return (
    <div className="w-full h-full min-h-[450px] relative rounded-lg overflow-hidden">
      <MapComponent markers={markers} totalEvents={totalEvents} />
    </div>
  )
}

export { COUNTRY_COORDS }
