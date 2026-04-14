"use client";

import { getNotificacoesConfig, getMeta, getRegistrosDoDia, diasDesdeUltimoBackup, getPerfil, getAlmocosDoDia } from "./storage";
import { format } from "date-fns";

function notificacoesSuportadas(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function pedirPermissao(): Promise<NotificationPermission> {
  if (!notificacoesSuportadas()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function getPermissaoAtual(): NotificationPermission {
  if (!notificacoesSuportadas()) return "denied";
  return Notification.permission;
}

function notificar(titulo: string, corpo: string, tag?: string) {
  if (!notificacoesSuportadas() || Notification.permission !== "granted") return;
  const config = getNotificacoesConfig();
  if (!config.habilitadas) return;

  // Use service worker notification if available (works in background when PWA)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(titulo, {
        body: corpo,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: tag ?? "alice-geral",
      } as NotificationOptions);
    }).catch(() => {
      // Fallback to regular notification
      new Notification(titulo, { body: corpo, icon: "/icons/icon-192.png", tag: tag ?? "alice-geral" });
    });
  } else {
    new Notification(titulo, { body: corpo, icon: "/icons/icon-192.png", tag: tag ?? "alice-geral" });
  }
}

// --- Notification Triggers ---

let metaNotificada = false;

export function verificarMetaProxima() {
  const config = getNotificacoesConfig();
  if (!config.habilitadas || !config.metaDiaria) return;

  const meta = getMeta().metaDiaria;
  if (meta <= 0) return;

  const hoje = format(new Date(), "yyyy-MM-dd");
  const registros = getRegistrosDoDia(hoje);
  const faltam = meta - registros.length;

  if (faltam === 3 && !metaNotificada) {
    metaNotificada = true;
    notificar("Quase lá! 🎯", `Faltam apenas 3 atendimentos para bater sua meta de ${meta}!`, "meta-proxima");
  }

  if (faltam <= 0 && registros.length === meta) {
    notificar("Meta batida! 🎉", `Parabéns! Você atingiu sua meta de ${meta} atendimentos hoje!`, "meta-batida");
  }
}

export function resetarNotificacoesDiarias() {
  metaNotificada = false;
}

export function verificarBackupPendente() {
  const config = getNotificacoesConfig();
  if (!config.habilitadas || !config.backupPendente) return;

  const dias = diasDesdeUltimoBackup();
  if (dias === null || dias >= 7) {
    notificar(
      "Backup pendente 💾",
      dias === null
        ? "Você ainda não fez nenhum backup. Proteja seus dados!"
        : `Já faz ${dias} dias desde o último backup. Hora de exportar!`,
      "backup-pendente"
    );
  }
}

let lembretePausaTimer: ReturnType<typeof setTimeout> | null = null;

export function iniciarLembretePausa() {
  pararLembretePausa();

  const config = getNotificacoesConfig();
  if (!config.habilitadas || !config.lembretePausa) return;

  const perfil = getPerfil();
  if (!perfil?.onboardingCompleto) return;

  const [h, m] = perfil.almocoPadrao.inicio.split(":").map(Number);
  const agora = new Date();
  const horaPausa = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m);

  // If lunch time hasn't passed yet, schedule a check
  if (agora < horaPausa) {
    const diff = horaPausa.getTime() - agora.getTime();
    lembretePausaTimer = setTimeout(() => {
      const hoje = format(new Date(), "yyyy-MM-dd");
      const almocos = getAlmocosDoDia(hoje);
      if (almocos.length === 0) {
        notificar("Hora da pausa! ☕", "Está na hora do seu intervalo. Não esqueça de pausar!", "lembrete-pausa");
      }
    }, diff);
  }
}

export function pararLembretePausa() {
  if (lembretePausaTimer) {
    clearTimeout(lembretePausaTimer);
    lembretePausaTimer = null;
  }
}
