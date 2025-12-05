"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface PowerUserContextType {
  isPowerUser: boolean
  togglePowerUser: () => void
}

const PowerUserContext = createContext<PowerUserContextType | undefined>(undefined)

export function PowerUserProvider({ children }: { children: React.ReactNode }) {
  const [isPowerUser, setIsPowerUser] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("everdian-power-user")
    if (stored !== null) {
      setIsPowerUser(stored === "true")
    }
    setIsLoaded(true)
  }, [])

  // Persist to localStorage when changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("everdian-power-user", String(isPowerUser))
    }
  }, [isPowerUser, isLoaded])

  const togglePowerUser = () => {
    setIsPowerUser(prev => !prev)
  }

  return (
    <PowerUserContext.Provider value={{ isPowerUser, togglePowerUser }}>
      {children}
    </PowerUserContext.Provider>
  )
}

export function usePowerUser() {
  const context = useContext(PowerUserContext)
  if (context === undefined) {
    throw new Error("usePowerUser must be used within a PowerUserProvider")
  }
  return context
}
