"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { PerfilUsuario } from "@/lib/types";
import { diasDesdeUltimoBackup } from "@/lib/storage";

const NAV_ITEMS = [
  { href: "/", label: "Registrar", icon: PlusIcon },
  { href: "/registros", label: "Histórico", icon: ClockIcon },
  { href: "/dashboard", label: "Dashboard", icon: ChartIcon },
  { href: "/relatorios", label: "Relatórios", icon: FileIcon },
  { href: "/conquistas", label: "Conquistas", icon: TrophyIcon },
  { href: "/insights", label: "Insights", icon: TrendIcon },
  { href: "/tipos", label: "Configurações", icon: SettingsIcon },
  { href: "/dados", label: "Meus Dados", icon: DatabaseIcon },
];

export default function Sidebar({
  collapsed,
  open,
  onClose,
  minimized,
  onToggleMinimized,
  perfil,
  onEditPerfil,
  dark,
  onToggleDark,
  animate,
}: {
  collapsed: boolean;
  open: boolean;
  onClose: () => void;
  minimized: boolean;
  onToggleMinimized: () => void;
  perfil: PerfilUsuario | null;
  onEditPerfil: () => void;
  dark: boolean;
  onToggleDark: () => void;
  animate?: boolean;
}) {
  const pathname = usePathname();

  // Backup reminder: show badge if never backed up or >7 days since last backup
  const [backupAlerta, setBackupAlerta] = useState(false);
  useEffect(() => {
    const dias = diasDesdeUltimoBackup();
    setBackupAlerta(dias === null || dias >= 7);
  }, []);

  const width = minimized && !collapsed ? "w-16" : "w-64";

  // On narrow: sidebar is a drawer (slides from left)
  // On wide: sidebar is always visible fixed
  const drawerClasses = collapsed
    ? `fixed left-0 top-0 h-full w-64 bg-alice-black text-alice-white flex flex-col z-50 transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`
    : `fixed left-0 top-0 h-full ${width} bg-alice-black text-alice-white flex flex-col z-50 ${animate ? "transition-[width] duration-200" : ""}`;  

  return (
    <aside className={drawerClasses}>
      {/* Primary accent bar */}
      <div className="h-1 w-full bg-linear-to-r from-alice-primary via-alice-primary-light to-alice-primary shrink-0" />

      {/* Logo / Header */}
      <div className={`border-b border-alice-primary/15 flex items-center justify-between gap-2 ${minimized && !collapsed ? "p-3 justify-center" : "px-5 py-4"}`}>
        <button
          onClick={minimized && !collapsed ? onToggleMinimized : undefined}
          className={`flex items-center gap-2.5 shrink-0 ${minimized && !collapsed ? "cursor-pointer" : "cursor-default"}`}
          aria-label={minimized && !collapsed ? "Expandir sidebar" : undefined}
          title={minimized && !collapsed ? "Expandir" : undefined}
          tabIndex={minimized && !collapsed ? 0 : -1}
        >
          <div className="w-9 h-9 rounded-lg bg-alice-primary flex items-center justify-center shrink-0 relative overflow-hidden">
            {/* "A" logo — visible when expanded */}
            <span
              className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold leading-none transition-all duration-300 ease-in-out"
              style={{
                fontFamily: "Arial, sans-serif",
                opacity: minimized && !collapsed ? 0 : 1,
                transform: minimized && !collapsed ? "scale(0.3) rotate(-90deg)" : "scale(1) rotate(0deg)",
              }}
            >
              A
            </span>
            {/* Expand arrows — visible when minimized */}
            <svg
              className="absolute inset-0 m-auto w-5 h-5 text-white transition-all duration-300 ease-in-out"
              style={{
                opacity: minimized && !collapsed ? 1 : 0,
                transform: minimized && !collapsed ? "scale(1) rotate(0deg)" : "scale(0.3) rotate(90deg)",
              }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
          {!(minimized && !collapsed) && (
            <span className="text-[15px] font-bold tracking-tight text-white">Alice</span>
          )}
        </button>
        {collapsed ? (
          <button onClick={onClose} className="p-1 text-alice-gray-300 hover:text-white shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : !minimized && (
          <button
            onClick={onToggleMinimized}
            className="p-1 text-alice-gray-300 hover:text-white shrink-0"
            aria-label="Encolher sidebar"
          >
            <CollapseIcon className="w-5 h-5" minimized={false} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-1 ${minimized && !collapsed ? "p-2" : "p-4"}`}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const showBadge = href === "/dados" && backupAlerta && !active;
          return (
            <Link
              key={href}
              href={href}
              onClick={collapsed ? onClose : undefined}
              className={`group/tip relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                minimized && !collapsed ? "justify-center px-0 py-3" : "px-4 py-3"
              } ${
                active
                  ? "bg-alice-primary text-white shadow-[0_0_12px_rgba(190,3,128,0.3)]"
                  : "text-alice-gray-300 hover:bg-alice-primary/10 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!(minimized && !collapsed) && label}
              {showBadge && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
              )}
              {minimized && !collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-alice-black px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 opacity-0 translate-x-1 transition-all group-hover/tip:opacity-100 group-hover/tip:translate-x-0 z-60">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Dark mode toggle */}
      <div className={`${minimized && !collapsed ? "px-2 pb-1" : "px-4 pb-1"}`}>
        <button
          onClick={onToggleDark}
          className={`group/tip relative flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-colors text-alice-gray-300 hover:bg-alice-primary/10 hover:text-white ${
            minimized && !collapsed ? "justify-center px-0 py-3" : "px-4 py-3"
          }`}
        >
          {dark ? <SunIcon className="w-5 h-5 shrink-0" /> : <MoonIcon className="w-5 h-5 shrink-0" />}
          {!(minimized && !collapsed) && (
            <div className="flex flex-col items-start">
              <span>{dark ? "Modo claro" : "Modo escuro"}</span>
              <kbd className="text-[10px] font-mono text-alice-gray-400">Ctrl+Shift+D</kbd>
            </div>
          )}
          {minimized && !collapsed && (
            <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-alice-black px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 opacity-0 translate-x-1 transition-all group-hover/tip:opacity-100 group-hover/tip:translate-x-0 z-60">
              {dark ? "Modo claro" : "Modo escuro"}
              <kbd className="ml-1.5 px-1 py-0.5 rounded bg-white/10 text-[10px] font-mono text-alice-gray-300">Ctrl+Shift+D</kbd>
            </span>
          )}
        </button>
      </div>

      {/* LGPD notice */}
      {!(minimized && !collapsed) && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-alice-gray-400 flex items-center justify-center gap-1.5">
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Dados salvos apenas neste navegador
          </p>
        </div>
      )}

      {/* Profile footer */}
      <div className={`border-t border-alice-primary/15 ${minimized && !collapsed ? "p-2 flex justify-center" : "p-4"}`}>
        {perfil?.onboardingCompleto ? (
          <button
            onClick={onEditPerfil}
            className={`group/tip relative flex items-center gap-3 w-full rounded-lg transition-colors hover:bg-alice-primary/10 ${
              minimized && !collapsed ? "justify-center p-1" : "px-3 py-2"
            }`}
          >
            {perfil.imagemBase64 ? (
              <img
                src={perfil.imagemBase64}
                alt={perfil.nome}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-alice-primary/30 flex items-center justify-center text-xs font-bold text-alice-primary shrink-0">
                {perfil.nome.charAt(0).toUpperCase()}
              </div>
            )}
            {!(minimized && !collapsed) && (
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">{perfil.nome}</p>
                {perfil.profissao && (
                  <p className="text-[10px] text-alice-gray-400 truncate">{perfil.profissao}</p>
                )}
              </div>
            )}
            {minimized && !collapsed && (
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-alice-black px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 opacity-0 translate-x-1 transition-all group-hover/tip:opacity-100 group-hover/tip:translate-x-0 z-60">
                {perfil.nome}
              </span>
            )}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CollapseIcon({ className, minimized }: { className?: string; minimized: boolean }) {
  return (
    <svg className={`${className} transition-transform ${minimized ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
    </svg>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.985 6.985 0 01-2.27.998 6.985 6.985 0 01-2.27-.998" />
    </svg>
  );
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}
