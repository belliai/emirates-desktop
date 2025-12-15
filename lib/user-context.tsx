"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { BuildupStaff } from "./buildup-staff"

type UserContextType = {
  currentUser: BuildupStaff | null
  setCurrentUser: (user: BuildupStaff | null) => void
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<BuildupStaff | null>(null)

  const logout = () => {
    setCurrentUser(null)
  }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

