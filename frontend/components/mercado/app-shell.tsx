"use client"

import { useState, useEffect } from "react"
import { Share2 } from "lucide-react"
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
import { ReportModal } from "./report-modal"
import { AdminScreen } from "./admin-screen"

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
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 border-b border-stone-200/80 pb-5">
            <div className="flex items-center gap-1.5 text-amber-800 mb-1.5">
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em]">
                Intercambio Inteligente
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              Cadenas Multiusuario de Intercambio
            </h1>
            <p className="mt-1.5 text-sm sm:text-[15px] leading-relaxed text-stone-600 max-w-2xl">
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
    case "admin":
      return <AdminScreen />
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (saved !== null) {
        setSidebarOpen(JSON.parse(saved))
      }
    } catch {
      // ignore storage read errors
    }
  }, [])

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
        // ignore storage write errors
      }
      return next
    })
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#faf8f5] font-sans text-stone-800 antialiased selection:bg-amber-100 selection:text-amber-950">
        <main>
          <GuestRouter />
        </main>
        <Toast />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans text-stone-800 antialiased selection:bg-amber-100 selection:text-amber-950">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-200 ease-out ${
          sidebarOpen ? "lg:pl-72 pl-0" : "pl-0"
        }`}
      >
        <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

        <main className="flex-1 pb-28 lg:pb-12">
          <AuthedRouter />
        </main>
      </div>

      <BottomNav />

      <BookDetailModal />
      <TradeRequestModal />
      <ReviewModal />
      <ReportModal />

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
