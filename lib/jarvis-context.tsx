'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface JarvisContextType {
  open: boolean
  toggle: () => void
  close: () => void
}

const JarvisContext = createContext<JarvisContextType>({
  open: false,
  toggle: () => {},
  close: () => {},
})

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <JarvisContext.Provider value={{
      open,
      toggle: () => setOpen(o => !o),
      close: () => setOpen(false),
    }}>
      {children}
    </JarvisContext.Provider>
  )
}

export const useJarvis = () => useContext(JarvisContext)
