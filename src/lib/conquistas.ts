"use client";

import type { DefinicaoConquista, ConquistaDesbloqueada, PerfilGamificacao } from "./types";
import {
  getRegistros,
  getTipos,
  contarPorDia,
  calcularStreak,
  getMeta,
  getConquistasDesbloqueadas,
  salvarConquistasDesbloqueadas,
  getGamificacao,
  salvarGamificacao,
  getUltimoBackup,
} from "./storage";

// --- Badge Definitions ---
export const CONQUISTAS: DefinicaoConquista[] = [
  // Streak
  { id: "streak-7", titulo: "Fogo Sagrado", descricao: "7 dias consecutivos batendo a meta", icone: "🔥", categoria: "streak", xp: 50 },
  { id: "streak-30", titulo: "Inabalável", descricao: "30 dias consecutivos batendo a meta", icone: "⚡", categoria: "streak", xp: 200 },
  { id: "streak-100", titulo: "Lendário", descricao: "100 dias consecutivos batendo a meta", icone: "👑", categoria: "streak", xp: 500 },

  // Volume
  { id: "vol-100", titulo: "Centurião", descricao: "100 atendimentos registrados", icone: "💯", categoria: "volume", xp: 30 },
  { id: "vol-500", titulo: "Dedicação", descricao: "500 atendimentos registrados", icone: "📈", categoria: "volume", xp: 100 },
  { id: "vol-1000", titulo: "Milhar", descricao: "1.000 atendimentos registrados", icone: "🏆", categoria: "volume", xp: 250 },
  { id: "vol-5000", titulo: "Veterano", descricao: "5.000 atendimentos registrados", icone: "🌟", categoria: "volume", xp: 500 },

  // Meta
  { id: "meta-5x", titulo: "Superação", descricao: "Bater a meta 5 dias em uma semana", icone: "🎯", categoria: "meta", xp: 80 },
  { id: "meta-mes-perfeito", titulo: "Mês Perfeito", descricao: "Bater a meta todos os dias úteis do mês", icone: "✨", categoria: "meta", xp: 300 },
  { id: "meta-2x", titulo: "Dobro", descricao: "Registrar o dobro da meta em um dia", icone: "🚀", categoria: "meta", xp: 60 },

  // Exploração
  { id: "exp-madrugador", titulo: "Madrugador", descricao: "Registrar atendimento antes das 7h", icone: "🌅", categoria: "exploracao", xp: 20 },
  { id: "exp-coruja", titulo: "Coruja", descricao: "Registrar atendimento depois das 22h", icone: "🦉", categoria: "exploracao", xp: 20 },
  { id: "exp-diversificado", titulo: "Diversificado", descricao: "Usar todos os tipos de atendimento em um dia", icone: "🎨", categoria: "exploracao", xp: 40 },
  { id: "exp-primeiro", titulo: "Primeiro Passo", descricao: "Registrar seu primeiro atendimento", icone: "👣", categoria: "exploracao", xp: 10 },

  // Social
  { id: "soc-backup", titulo: "Precavido", descricao: "Fazer o primeiro backup dos dados", icone: "💾", categoria: "social", xp: 20 },
  { id: "soc-organizado", titulo: "Organizado", descricao: "Criar 3 ou mais tipos personalizados", icone: "📋", categoria: "social", xp: 30 },
  { id: "soc-maratonista", titulo: "Maratonista", descricao: "Trabalhar 10 horas em um dia (primeiro ao último registro)", icone: "🏃", categoria: "social", xp: 60 },
];

export const CONQUISTAS_MAP = new Map(CONQUISTAS.map((c) => [c.id, c]));

// --- XP & Level ---
export function calcularNivel(xp: number): number {
  // Level thresholds: 0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800...
  // Formula: level N requires N*(N+1)*50/2 total XP => sum = 50 * sum(1..N) = 25*N*(N+1)
  let nivel = 1;
  let acumulado = 0;
  while (true) {
    const proximo = nivel * 100;
    if (acumulado + proximo > xp) break;
    acumulado += proximo;
    nivel++;
  }
  return nivel;
}

export function xpParaProximoNivel(xp: number): { atual: number; necessario: number; progresso: number } {
  let nivel = 1;
  let acumulado = 0;
  while (true) {
    const proximo = nivel * 100;
    if (acumulado + proximo > xp) {
      return { atual: xp - acumulado, necessario: proximo, progresso: (xp - acumulado) / proximo };
    }
    acumulado += proximo;
    nivel++;
  }
}

export const NOME_NIVEL: Record<number, string> = {
  1: "Iniciante",
  2: "Aprendiz",
  3: "Praticante",
  4: "Competente",
  5: "Proficiente",
  6: "Experiente",
  7: "Especialista",
  8: "Mestre",
  9: "Grão-Mestre",
  10: "Lenda",
};

export function getNomeNivel(nivel: number): string {
  return NOME_NIVEL[Math.min(nivel, 10)] ?? `Nível ${nivel}`;
}

// --- Check which badges are newly unlocked ---
export function verificarConquistas(): DefinicaoConquista[] {
  const desbloqueadas = new Set(getConquistasDesbloqueadas().map((c) => c.id));
  const registros = getRegistros();
  const tipos = getTipos();
  const meta = getMeta().metaDiaria;
  const streak = calcularStreak();
  const porDia = contarPorDia(registros);
  const totalRegistros = registros.length;
  const novas: DefinicaoConquista[] = [];

  function check(id: string, condicao: boolean) {
    if (!desbloqueadas.has(id) && condicao) {
      const def = CONQUISTAS_MAP.get(id);
      if (def) novas.push(def);
    }
  }

  // Streak badges
  check("streak-7", streak >= 7);
  check("streak-30", streak >= 30);
  check("streak-100", streak >= 100);

  // Volume badges
  check("vol-100", totalRegistros >= 100);
  check("vol-500", totalRegistros >= 500);
  check("vol-1000", totalRegistros >= 1000);
  check("vol-5000", totalRegistros >= 5000);

  // First step
  check("exp-primeiro", totalRegistros >= 1);

  // Meta badges
  if (meta > 0) {
    // Meta 2x in a day
    const temDobro = Object.values(porDia).some((c) => c >= meta * 2);
    check("meta-2x", temDobro);

    // Meta 5x in a week — check current ISO week
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0=Sun
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    let diasBatidosSemana = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicioSemana);
      d.setDate(inicioSemana.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      if ((porDia[key] || 0) >= meta) diasBatidosSemana++;
    }
    check("meta-5x", diasBatidosSemana >= 5);

    // Perfect month — all weekdays of current month
    const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const diaHoje = hoje.getDate();
    let diasUteisPassados = 0;
    let diasUteisBatidos = 0;
    for (let d = 1; d <= diaHoje; d++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth(), d);
      const dow = data.getDay();
      if (dow >= 1 && dow <= 5) {
        diasUteisPassados++;
        const key = data.toISOString().slice(0, 10);
        if ((porDia[key] || 0) >= meta) diasUteisBatidos++;
      }
    }
    check("meta-mes-perfeito", diasUteisPassados >= 15 && diasUteisBatidos === diasUteisPassados);
  }

  // Exploration badges
  const horasRegistros = registros.map((r) => new Date(r.timestamp).getHours());
  check("exp-madrugador", horasRegistros.some((h) => h < 7));
  check("exp-coruja", horasRegistros.some((h) => h >= 22));

  // Diversified — all types used in one day
  if (tipos.length > 0) {
    const tipoIds = new Set(tipos.map((t) => t.id));
    for (const dia of Object.keys(porDia)) {
      const registrosDia = registros.filter((r) => r.timestamp.startsWith(dia));
      const tiposUsados = new Set(registrosDia.map((r) => r.tipoId));
      if (tipoIds.size > 0 && [...tipoIds].every((id) => tiposUsados.has(id))) {
        check("exp-diversificado", true);
        break;
      }
    }
  }

  // Social badges
  check("soc-backup", getUltimoBackup() !== null);

  const tiposCustom = tipos.filter((t) => !["chat-branco", "emergencia", "renovacao-receita", "pedido-exame", "sintomas", "administrativo"].includes(t.id));
  check("soc-organizado", tiposCustom.length >= 3);

  // Marathon — 10+ hours span in a day
  for (const dia of Object.keys(porDia)) {
    const registrosDia = registros.filter((r) => r.timestamp.startsWith(dia));
    if (registrosDia.length < 2) continue;
    const timestamps = registrosDia.map((r) => new Date(r.timestamp).getTime()).sort((a, b) => a - b);
    const spanHoras = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60);
    if (spanHoras >= 10) {
      check("soc-maratonista", true);
      break;
    }
  }

  return novas;
}

/**
 * Process newly unlocked badges: save them and update XP/level.
 * Returns the list of newly unlocked conquistas for display.
 */
export function processarNovasConquistas(): DefinicaoConquista[] {
  const novas = verificarConquistas();
  if (novas.length === 0) return [];

  // Save unlocked badges
  const desbloqueadas = getConquistasDesbloqueadas();
  const agora = new Date().toISOString();
  for (const c of novas) {
    desbloqueadas.push({ id: c.id, desbloqueadaEm: agora });
  }
  salvarConquistasDesbloqueadas(desbloqueadas);

  // Update XP and level
  const gamificacao = getGamificacao();
  const xpGanho = novas.reduce((sum, c) => sum + c.xp, 0);
  gamificacao.xp += xpGanho;
  gamificacao.nivel = calcularNivel(gamificacao.xp);
  gamificacao.conquistasDesbloqueadas = desbloqueadas.map((c) => c.id);
  salvarGamificacao(gamificacao);

  return novas;
}
