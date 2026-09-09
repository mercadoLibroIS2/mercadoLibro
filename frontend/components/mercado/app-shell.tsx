"use client"

import { useState, useEffect } from "react"
import { StoreProvider, useStore } from "./store"
import { Navbar } from "./navbar"
import { Sidebar } from "./sidebar"
import { BottomNav } from "./bottom-nav"
import { Toast } from "./toast"
import { LoginScreen } from "./login-screen"
import { RegisterScreen } from "./register-screen"
import { WelcomeScreen } from "./welcome-screen"
import { FeedScreen } from "./feed-screen"
import { ProfileScreen } from "./profile-screen"
import { PublishForm } from "./publish-form"
import { TradesScreen } from "./trades-screen"
import { TrackerScreen } from "./tracker-screen"
import { ChainsView } from "./chains-view"
import { NotificationsScreen } from "./notifications-screen"
import { BookDetailModal } from "./book-detail-modal"
import { TradeRequestModal } from "./trade-request-modal"
import { ReviewModal } from "./review-modal"

const SIDEBAR_STORAGE_KEY = "mercadolibro_sidebar_open_pref"

function AuthedRouter() {
  const { screen } = useStore()
  switch (screen) {
    case "bienvenida":
      return <WelcomeScreen />
    case "inicio":
      return <FeedScreen />
    case "intercambios":
      return <TradesScreen />
    case "tracker":
      return <TrackerScreen />
    case "notificaciones":
      return <NotificationsScreen />
    case "cadenas":
      return (
        <div className="mx-auto max-w-5xl px-3 sm:px-6 py-4 sm:py-8">
          <div className="mb-4 sm:mb-6 border-b border-stone-200 pb-3 sm:pb-4">
            <h1 className="font-serif text-xl sm:text-3xl font-bold text-stone-900">
              Cadenas Multiusuario de Intercambio
            </h1>
            <p className="text-sm md:text-base md:text-lg text-stone-600 mt-1">
              Circuitos inteligentes detectados para que todos consigan el libro que buscan.
            </p>
          </div>
          <ChainsView />
        </div>
      )
    case "perfil":
    case "perfil_publico":
      return <ProfileScreen />
    case "publicar":
      return <PublishForm />
    default:
      return <FeedScreen />
  }
}

function GuestRouter() {
  const { screen } = useStore()
  return screen === "registro" ? <RegisterScreen /> : <LoginScreen />
}

function Shell() {
  const { currentUser, screen } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  // Load user sidebar preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (saved !== null) {
        setSidebarOpen(JSON.parse(saved))
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // Instantly scroll to top when switching tabs/screens to avoid cut-off headers
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" })
    }
  }, [screen])

  function toggleSidebar() {
    setSidebarOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans text-stone-700 antialiased selection:bg-amber-100 selection:text-amber-900">
        <main>
          <GuestRouter />
        </main>
        <Toast />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50/70 font-sans text-stone-700 antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* Left Sidebar on desktop */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />

      {/* Main Content Area */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          sidebarOpen ? "lg:pl-80 pl-0" : "pl-0"
        }`}
      >
        {/* Top Navbar */}
        <Navbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        {/* Page Content with safe padding for mobile bottom bar */}
        <main className="flex-1 pb-28 lg:pb-12">
          <AuthedRouter />
        </main>
      </div>

      {/* Mobile Native Bottom Navigation Bar */}
      <BottomNav />

      {/* Global Modals */}
      <BookDetailModal />
      <TradeRequestModal />
      <ReviewModal />

      <Toast />
    </div>
  )
}

export function AppShell() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
