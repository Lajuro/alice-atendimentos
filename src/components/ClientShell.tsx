"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import Onboarding from "./Onboarding";
import WelcomeIntro from "./WelcomeIntro";
import type { PerfilUsuario } from "@/lib/types";
import { getPerfil, salvarPerfil, salvarConfig, getSidebarMinimized, salvarSidebarMinimized, getIntroHabilitada } from "@/lib/storage";
import { Smartphone, X } from "lucide-react";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [dark, setDark] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  /* Register service worker & capture install prompt */
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          void Promise.all(registrations.map((registration) => registration.unregister()));
        });

        if ("caches" in globalThis) {
          caches.keys().then((cacheNames) => {
            void Promise.all(
              cacheNames
                .filter((cacheName) => cacheName.startsWith("alice-atendimentos"))
                .map((cacheName) => caches.delete(cacheName))
            );
          });
        }
      }
    }

    // Never show banner if already running as installed PWA or dismissed this session
    const isStandalone = globalThis.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    const dismissedThisSession = sessionStorage.getItem("pwa-banner-dismissed") === "1";

    if (isStandalone || dismissedThisSession) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsNarrow(e.matches);
      if (!e.matches) setSidebarOpen(false);
    };
    onChange(mq);
    mq.addEventListener("change", onChange);

    const saved = getPerfil();
    setPerfil(saved);
    setMinimized(getSidebarMinimized());
    setDark(document.documentElement.classList.contains("dark"));
    setLoaded(true);

    // Re-read profile when data changes (e.g. from Onboarding or config pages)
    const onUpdate = () => setPerfil(getPerfil());
    window.addEventListener("atendimentos-updated", onUpdate);

    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("atendimentos-updated", onUpdate);
    };
  }, []);

  // Show welcome intro once per session after profile is loaded
  useEffect(() => {
    if (loaded && perfil?.onboardingCompleto && !editandoPerfil && getIntroHabilitada()) {
      setShowIntro(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleMinimized = useCallback(() => setMinimized((m) => {
    const next = !m;
    salvarSidebarMinimized(next);
    return next;
  }), []);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("painel-tema", next ? "escuro" : "claro");
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl+Shift+D to toggle dark mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        toggleDark();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleDark]);

  const handleOnboardingComplete = useCallback((p: PerfilUsuario) => {
    salvarPerfil(p);
    // Sync work hours config from profile
    const horaInicio = Number.parseInt(p.horaEntrada.split(":")[0], 10);
    const horaSaida = Number.parseInt(p.horaSaida.split(":")[0], 10);
    salvarConfig({ horaInicio, horaFim: horaSaida });
    setPerfil(p);
    setEditandoPerfil(false);
    // Notify other hook instances that data changed
    window.dispatchEvent(new Event("atendimentos-updated"));
  }, []);

  const showOnboarding = loaded && (!perfil?.onboardingCompleto || editandoPerfil);

  return (
    <>
      {showIntro && perfil && (
        <WelcomeIntro nome={perfil.nome} onDone={() => setShowIntro(false)} />
      )}
      {showOnboarding && (
        <Onboarding
          onComplete={handleOnboardingComplete}
          onCancel={editandoPerfil ? () => setEditandoPerfil(false) : undefined}
          initial={perfil}
        />
      )}
      {/* Hamburger button — only on narrow, hidden when sidebar is open */}
      {isNarrow && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-3 left-3 z-60 p-2 rounded-lg bg-alice-black text-white shadow-lg"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}

      {/* Overlay backdrop */}
      {isNarrow && sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={closeSidebar} />
      )}

      <Sidebar
        collapsed={isNarrow}
        open={sidebarOpen}
        onClose={closeSidebar}
        minimized={minimized}
        onToggleMinimized={toggleMinimized}
        perfil={perfil}
        onEditPerfil={() => setEditandoPerfil(true)}
        dark={dark}
        onToggleDark={toggleDark}
        animate={loaded}
      />

      <main
        className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-screen ${loaded ? "transition-[margin] duration-200" : ""} ${
          isNarrow ? "ml-0 pt-14" : (minimized ? "ml-16" : "ml-64")
        }`}
      >
        {children}
      </main>

      {/* PWA install banner */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-alice-primary rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3 max-w-sm w-[calc(100%-2rem)]">
          <Smartphone className="w-6 h-6 text-white/80 shrink-0" />
          <p className="text-sm flex-1 text-white/90">
            Instale o app para acesso rápido e offline!
          </p>
          <button
            onClick={async () => {
              if (installPrompt && "prompt" in installPrompt) {
                (installPrompt as { prompt: () => Promise<void> }).prompt();
              }
              setShowInstallBanner(false);
              setInstallPrompt(null);
            }}
            className="px-3 py-1.5 bg-white text-alice-primary text-sm font-semibold rounded-lg hover:bg-white/90 transition shrink-0"
          >
            Instalar
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem("pwa-banner-dismissed", "1");
              setShowInstallBanner(false);
            }}
            className="text-white/60 hover:text-white transition"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
