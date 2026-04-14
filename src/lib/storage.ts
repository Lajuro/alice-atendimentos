"use client";

import { TipoAtendimento, RegistroAtendimento, RegistroAlmoco, Configuracao, PerfilUsuario, MetaConfig, CONFIG_PADRAO, META_PADRAO, TIPOS_PADRAO, NotaDia, AvaliacaoEmoji, HorarioAlmoco } from "./types";
import { idbSet, idbDelete, migrateToIDB, loadCacheFromIDB, isIDBAvailable } from "./db";

export const STORAGE_KEYS = {
  TIPOS: "alice-tipos-atendimento",
  REGISTROS: "alice-registros",
  CONFIG: "alice-config",
  PERFIL: "alice-perfil",
  ALMOCOS: "alice-almocos",
  ALMOCO_OVERRIDES: "alice-almoco-overrides",
  ULTIMO_BACKUP: "alice-ultimo-backup",
  META: "alice-meta",
  NOTAS_DIA: "alice-notas-dia",
  SIDEBAR_MINIMIZED: "alice-sidebar-minimized",
  INTRO_HABILITADA: "alice-intro-habilitada",
  NOTIFICACOES_CONFIG: "alice-notificacoes-config",
  CONQUISTAS: "alice-conquistas",
  GAMIFICACAO: "alice-gamificacao",
} as const;

const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS);

// --- In-memory cache for fast sync reads ---
const cache = new Map<string, unknown>();
let idbReady = false;

/** Initialize IDB: migrate from localStorage then load cache. Call once on app start. */
export async function initStorage(): Promise<void> {
  if (typeof window === "undefined" || !isIDBAvailable()) return;
  try {
    await migrateToIDB(ALL_STORAGE_KEYS);
    await loadCacheFromIDB(cache);
    idbReady = true;
  } catch {
    // IDB unavailable — localStorage continues as source of truth
  }
}

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  // Check in-memory cache first
  if (cache.has(key)) return cache.get(key) as T;
  // Fall back to localStorage
  try {
    const raw = localStorage.getItem(key);
    const val = raw ? JSON.parse(raw) as T : fallback;
    cache.set(key, val);
    return val;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  cache.set(key, value);
  localStorage.setItem(key, JSON.stringify(value));
  // Async write-through to IDB
  if (idbReady) idbSet(key, value).catch(() => {});
}

function toLocalDateKey(timestamp: string): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalMonthKey(timestamp: string): string {
  return toLocalDateKey(timestamp).slice(0, 7);
}

// --- Tipos ---
export function getTipos(): TipoAtendimento[] {
  return getItem(STORAGE_KEYS.TIPOS, TIPOS_PADRAO);
}

export function salvarTipos(tipos: TipoAtendimento[]) {
  setItem(STORAGE_KEYS.TIPOS, tipos);
}

// --- Registros ---
export function getRegistros(): RegistroAtendimento[] {
  return getItem(STORAGE_KEYS.REGISTROS, []);
}

export function salvarRegistros(registros: RegistroAtendimento[]) {
  setItem(STORAGE_KEYS.REGISTROS, registros);
}

export function adicionarRegistro(tipoId: string, nota?: string): RegistroAtendimento {
  const registros = getRegistros();
  const novo: RegistroAtendimento = {
    id: crypto.randomUUID(),
    tipoId,
    timestamp: new Date().toISOString(),
    ...(nota ? { nota } : {}),
  };
  registros.push(novo);
  salvarRegistros(registros);
  return novo;
}

export function atualizarNota(id: string, nota: string) {
  const registros = getRegistros();
  const reg = registros.find((r) => r.id === id);
  if (reg) {
    if (nota.trim()) {
      reg.nota = nota.trim();
    } else {
      delete reg.nota;
    }
    salvarRegistros(registros);
  }
}

export function removerRegistro(id: string) {
  const registros = getRegistros().filter((r) => r.id !== id);
  salvarRegistros(registros);
}

// --- Queries ---
export function getRegistrosDoDia(data: string): RegistroAtendimento[] {
  return getRegistros().filter((r) => toLocalDateKey(r.timestamp) === data);
}

export function getRegistrosDoMes(ano: number, mes: number): RegistroAtendimento[] {
  const prefix = `${ano}-${String(mes).padStart(2, "0")}`;
  return getRegistros().filter((r) => toLocalMonthKey(r.timestamp) === prefix);
}

export function contarPorTipo(registros: RegistroAtendimento[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const r of registros) {
    contagem[r.tipoId] = (contagem[r.tipoId] || 0) + 1;
  }
  return contagem;
}

export function contarPorHora(registros: RegistroAtendimento[]): Record<number, number> {
  const contagem: Record<number, number> = {};
  for (let h = 0; h < 24; h++) contagem[h] = 0;
  for (const r of registros) {
    const hora = new Date(r.timestamp).getHours();
    contagem[hora] = (contagem[hora] || 0) + 1;
  }
  return contagem;
}

export function contarPorDia(registros: RegistroAtendimento[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const r of registros) {
    const dia = toLocalDateKey(r.timestamp);
    contagem[dia] = (contagem[dia] || 0) + 1;
  }
  return contagem;
}

// --- Configuração ---
export function getConfig(): Configuracao {
  return getItem(STORAGE_KEYS.CONFIG, CONFIG_PADRAO);
}

export function salvarConfig(config: Configuracao) {
  setItem(STORAGE_KEYS.CONFIG, config);
}

// --- Perfil ---
export function getPerfil(): PerfilUsuario | null {
  return getItem<PerfilUsuario | null>(STORAGE_KEYS.PERFIL, null);
}

export function salvarPerfil(perfil: PerfilUsuario) {
  setItem(STORAGE_KEYS.PERFIL, perfil);
}

// --- Almoços ---
export function getAlmocos(): RegistroAlmoco[] {
  return getItem(STORAGE_KEYS.ALMOCOS, []);
}

export function salvarAlmocos(almocos: RegistroAlmoco[]) {
  setItem(STORAGE_KEYS.ALMOCOS, almocos);
}

export function getAlmocosDoDia(data: string): RegistroAlmoco[] {
  return getAlmocos().filter((a) => a.data === data);
}

export function iniciarAlmoco(data: string): RegistroAlmoco {
  const almocos = getAlmocos();
  const novo: RegistroAlmoco = {
    id: crypto.randomUUID(),
    data,
    inicio: new Date().toISOString(),
  };
  almocos.push(novo);
  salvarAlmocos(almocos);
  return novo;
}

export function finalizarAlmoco(id: string) {
  const almocos = getAlmocos();
  const almoco = almocos.find((a) => a.id === id);
  if (almoco) {
    almoco.fim = new Date().toISOString();
    salvarAlmocos(almocos);
  }
}

export function removerAlmoco(id: string) {
  const almocos = getAlmocos().filter((a) => a.id !== id);
  salvarAlmocos(almocos);
}

// --- Overrides de horário de almoço por data (YYYY-MM-DD) ---
export function getAlmocoOverridesDia(): Record<string, HorarioAlmoco> {
  return getItem(STORAGE_KEYS.ALMOCO_OVERRIDES, {});
}

export function getAlmocoOverrideDia(data: string): HorarioAlmoco | null {
  return getAlmocoOverridesDia()[data] ?? null;
}

export function setAlmocoOverrideDia(data: string, horario: HorarioAlmoco) {
  const overrides = getAlmocoOverridesDia();
  overrides[data] = horario;
  setItem(STORAGE_KEYS.ALMOCO_OVERRIDES, overrides);
}

export function removerAlmocoOverrideDia(data: string) {
  const overrides = getAlmocoOverridesDia();
  delete overrides[data];
  setItem(STORAGE_KEYS.ALMOCO_OVERRIDES, overrides);
}

// --- Meta diária ---
export function getMeta(): MetaConfig {
  return getItem(STORAGE_KEYS.META, META_PADRAO);
}

export function salvarMeta(meta: MetaConfig) {
  setItem(STORAGE_KEYS.META, meta);
}

export function calcularStreak(): number {
  const meta = getMeta().metaDiaria;
  if (meta <= 0) return 0;
  const registros = getRegistros();
  const contagem = contarPorDia(registros);
  let streak = 0;
  const hoje = new Date();
  // Start from today and go backwards
  for (let i = 0; i < 365; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const total = contagem[key] || 0;
    if (total >= meta) {
      streak++;
    } else if (i === 0) {
      // Today hasn't met goal yet — that's ok, continue checking yesterday
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export interface Recordes {
  melhorDia: { data: string; total: number } | null;
  melhorSemana: { inicio: string; fim: string; total: number } | null;
  melhorMes: { mes: string; total: number } | null;
}

export function getRecordes(): Recordes {
  const registros = getRegistros();
  const porDia = contarPorDia(registros);
  const result: Recordes = { melhorDia: null, melhorSemana: null, melhorMes: null };

  // Best day
  let maxDia = 0;
  for (const [data, total] of Object.entries(porDia)) {
    if (total > maxDia) {
      maxDia = total;
      result.melhorDia = { data, total };
    }
  }

  // Best week (sliding 7-day window)
  const dias = Object.keys(porDia).sort();
  if (dias.length > 0) {
    const primeiro = new Date(dias[0]);
    const ultimo = new Date(dias[dias.length - 1]);
    let maxSemana = 0;
    for (let d = new Date(primeiro); d <= ultimo; d.setDate(d.getDate() + 1)) {
      let soma = 0;
      for (let j = 0; j < 7; j++) {
        const dj = new Date(d);
        dj.setDate(dj.getDate() + j);
        soma += porDia[dj.toISOString().slice(0, 10)] || 0;
      }
      if (soma > maxSemana) {
        maxSemana = soma;
        const fim = new Date(d);
        fim.setDate(fim.getDate() + 6);
        result.melhorSemana = { inicio: d.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10), total: soma };
      }
    }
  }

  // Best month
  const porMes: Record<string, number> = {};
  for (const r of registros) {
    const mes = toLocalMonthKey(r.timestamp);
    porMes[mes] = (porMes[mes] || 0) + 1;
  }
  let maxMes = 0;
  for (const [mes, total] of Object.entries(porMes)) {
    if (total > maxMes) {
      maxMes = total;
      result.melhorMes = { mes, total };
    }
  }

  return result;
}

// --- Backup ---
interface BackupData {
  versao: number;
  dataExportacao: string;
  tipos: TipoAtendimento[];
  registros: RegistroAtendimento[];
  config: Configuracao;
  perfil: PerfilUsuario | null;
  almocos: RegistroAlmoco[];
  meta?: MetaConfig;
  notasDia?: NotaDia[];
  conquistas?: ConquistaDesbloqueada[];
  gamificacao?: PerfilGamificacao;
  almocoOverrides?: Record<string, HorarioAlmoco>;
}

export function exportarBackup(): BackupData {
  const backup: BackupData = {
    versao: 2,
    dataExportacao: new Date().toISOString(),
    tipos: getTipos(),
    registros: getRegistros(),
    config: getConfig(),
    perfil: getPerfil(),
    almocos: getAlmocos(),
    meta: getMeta(),
    notasDia: getNotasDia(),
    conquistas: getConquistasDesbloqueadas(),
    gamificacao: getGamificacao(),
    almocoOverrides: getAlmocoOverridesDia(),
  };
  registrarUltimoBackup();
  return backup;
}

export function validarBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.versao === "number" &&
    typeof obj.dataExportacao === "string" &&
    Array.isArray(obj.tipos) &&
    Array.isArray(obj.registros) &&
    Array.isArray(obj.almocos) &&
    typeof obj.config === "object" &&
    obj.config !== null
  );
}

export function restaurarBackup(backup: BackupData) {
  salvarTipos(backup.tipos);
  salvarRegistros(backup.registros);
  salvarConfig(backup.config);
  if (backup.perfil) salvarPerfil(backup.perfil);
  salvarAlmocos(backup.almocos);
  if (backup.meta) salvarMeta(backup.meta);
  if (backup.notasDia) setItem(STORAGE_KEYS.NOTAS_DIA, backup.notasDia);
  if (backup.conquistas) salvarConquistasDesbloqueadas(backup.conquistas);
  if (backup.gamificacao) salvarGamificacao(backup.gamificacao);
  if (backup.almocoOverrides) setItem(STORAGE_KEYS.ALMOCO_OVERRIDES, backup.almocoOverrides);
  registrarUltimoBackup();
}

export function limparTodosOsDados() {
  if (typeof window === "undefined") return;
  for (const key of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(key);
    if (idbReady) idbDelete(key).catch(() => {});
  }
  cache.clear();
  localStorage.removeItem("alice-migrated-idb");
}

// --- Último Backup ---
export function getUltimoBackup(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.ULTIMO_BACKUP);
}

function registrarUltimoBackup() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ULTIMO_BACKUP, new Date().toISOString());
}

export function diasDesdeUltimoBackup(): number | null {
  const ultimo = getUltimoBackup();
  if (!ultimo) return null;
  const diff = Date.now() - new Date(ultimo).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// --- Notas do Dia ---
export function getNotasDia(): NotaDia[] {
  return getItem(STORAGE_KEYS.NOTAS_DIA, []);
}

export function getNotaDia(data: string): NotaDia | null {
  return getNotasDia().find((n) => n.data === data) ?? null;
}

export function salvarNotaDia(data: string, nota: string, avaliacao?: AvaliacaoEmoji) {
  const notas = getNotasDia().filter((n) => n.data !== data);
  if (nota.trim() || avaliacao) {
    notas.push({ data, nota: nota.trim(), avaliacao, atualizadoEm: new Date().toISOString() });
  }
  setItem(STORAGE_KEYS.NOTAS_DIA, notas);
}

export function removerNotaDia(data: string) {
  const notas = getNotasDia().filter((n) => n.data !== data);
  setItem(STORAGE_KEYS.NOTAS_DIA, notas);
}

// --- Sidebar ---
export function getSidebarMinimized(): boolean {
  return getItem(STORAGE_KEYS.SIDEBAR_MINIMIZED, false);
}

export function salvarSidebarMinimized(minimized: boolean) {
  setItem(STORAGE_KEYS.SIDEBAR_MINIMIZED, minimized);
}

// --- Intro / Boas-vindas ---
export function getIntroHabilitada(): boolean {
  return getItem(STORAGE_KEYS.INTRO_HABILITADA, true);
}

export function salvarIntroHabilitada(habilitada: boolean) {
  setItem(STORAGE_KEYS.INTRO_HABILITADA, habilitada);
}

export function getResumoDiaAnterior(): { total: number; data: string } | null {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const y = ontem.getFullYear();
  const m = String(ontem.getMonth() + 1).padStart(2, "0");
  const d = String(ontem.getDate()).padStart(2, "0");
  const dataOntem = `${y}-${m}-${d}`;
  const registros = getRegistros();
  const total = registros.filter((r) => toLocalDateKey(r.timestamp) === dataOntem).length;
  if (total === 0) return null;
  return { total, data: dataOntem };
}

// --- Conquistas / Gamificação ---
import type { ConquistaDesbloqueada, PerfilGamificacao, NotificacoesConfig } from "./types";

const GAMIFICACAO_PADRAO: PerfilGamificacao = { xp: 0, nivel: 1, conquistasDesbloqueadas: [] };
const NOTIFICACOES_PADRAO: NotificacoesConfig = {
  habilitadas: false,
  lembretePausa: true,
  metaDiaria: true,
  backupPendente: true,
};

export function getGamificacao(): PerfilGamificacao {
  return getItem(STORAGE_KEYS.GAMIFICACAO, GAMIFICACAO_PADRAO);
}

export function salvarGamificacao(g: PerfilGamificacao) {
  setItem(STORAGE_KEYS.GAMIFICACAO, g);
}

export function getConquistasDesbloqueadas(): ConquistaDesbloqueada[] {
  return getItem(STORAGE_KEYS.CONQUISTAS, []);
}

export function salvarConquistasDesbloqueadas(c: ConquistaDesbloqueada[]) {
  setItem(STORAGE_KEYS.CONQUISTAS, c);
}

// --- Notificações Config ---
export function getNotificacoesConfig(): NotificacoesConfig {
  return getItem(STORAGE_KEYS.NOTIFICACOES_CONFIG, NOTIFICACOES_PADRAO);
}

export function salvarNotificacoesConfig(config: NotificacoesConfig) {
  setItem(STORAGE_KEYS.NOTIFICACOES_CONFIG, config);
}
