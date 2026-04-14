"use client";

import { getRegistros, contarPorDia, contarPorHora, getMeta, getTipos } from "./storage";
import { DIAS_SEMANA } from "./types";

export interface Tendencia {
  direcao: "subindo" | "descendo" | "estavel";
  percentual: number; // variação % da última semana vs anterior
}

export interface PrevisaoMensal {
  projecao: number;
  diasRestantes: number;
  mediaAteAgora: number;
}

export interface InsightDiaSemana {
  dia: string;
  media: number;
  total: number;
  contagem: number;
}

export interface InsightHoraPico {
  hora: number;
  media: number;
}

export interface Consistencia {
  percentual: number; // 0-100
  diasComRegistro: number;
  diasUteisTotais: number;
}

export interface Anomalia {
  data: string;
  total: number;
  media: number;
  desvio: number; // quantos desvios padrão acima/abaixo
}

export function calcularTendencia(): Tendencia {
  const registros = getRegistros();
  const porDia = contarPorDia(registros);
  const hoje = new Date();

  let totalSemanaAtual = 0;
  let totalSemanaAnterior = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    totalSemanaAtual += porDia[d.toISOString().slice(0, 10)] || 0;
  }
  for (let i = 7; i < 14; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    totalSemanaAnterior += porDia[d.toISOString().slice(0, 10)] || 0;
  }

  if (totalSemanaAnterior === 0) {
    return { direcao: totalSemanaAtual > 0 ? "subindo" : "estavel", percentual: 0 };
  }

  const percentual = ((totalSemanaAtual - totalSemanaAnterior) / totalSemanaAnterior) * 100;
  const direcao = percentual > 5 ? "subindo" : percentual < -5 ? "descendo" : "estavel";
  return { direcao, percentual: Math.round(percentual) };
}

export function melhorDiaSemana(): InsightDiaSemana[] {
  const registros = getRegistros();
  const porDia = contarPorDia(registros);
  const totais: Record<number, { total: number; contagem: number }> = {};

  for (const [data, total] of Object.entries(porDia)) {
    const dow = new Date(data + "T12:00:00").getDay();
    if (!totais[dow]) totais[dow] = { total: 0, contagem: 0 };
    totais[dow].total += total;
    totais[dow].contagem++;
  }

  return Object.entries(totais)
    .map(([dow, { total, contagem }]) => ({
      dia: DIAS_SEMANA[Number(dow)],
      media: contagem > 0 ? Math.round((total / contagem) * 10) / 10 : 0,
      total,
      contagem,
    }))
    .sort((a, b) => b.media - a.media);
}

export function melhorHoraPico(): InsightHoraPico[] {
  const registros = getRegistros();
  const porHora = contarPorHora(registros);
  const dias = new Set(registros.map((r) => r.timestamp.slice(0, 10))).size || 1;

  return Object.entries(porHora)
    .map(([h, total]) => ({ hora: Number(h), media: Math.round((total / dias) * 10) / 10 }))
    .filter((h) => h.media > 0)
    .sort((a, b) => b.media - a.media);
}

export function previsaoMensal(): PrevisaoMensal {
  const registros = getRegistros();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diaAtual = hoje.getDate();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const diasRestantes = diasNoMes - diaAtual;

  const prefix = `${ano}-${String(mes + 1).padStart(2, "0")}`;
  const registrosMes = registros.filter((r) => r.timestamp.startsWith(prefix));
  const totalAteAgora = registrosMes.length;
  const mediaAteAgora = diaAtual > 0 ? totalAteAgora / diaAtual : 0;
  const projecao = Math.round(totalAteAgora + mediaAteAgora * diasRestantes);

  return { projecao, diasRestantes, mediaAteAgora: Math.round(mediaAteAgora * 10) / 10 };
}

export function detectarAnomalias(limite = 5): Anomalia[] {
  const registros = getRegistros();
  const porDia = contarPorDia(registros);
  const valores = Object.values(porDia);
  if (valores.length < 3) return [];

  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const variancia = valores.reduce((sum, v) => sum + (v - media) ** 2, 0) / valores.length;
  const desvioPadrao = Math.sqrt(variancia);

  if (desvioPadrao === 0) return [];

  return Object.entries(porDia)
    .map(([data, total]) => ({
      data,
      total,
      media: Math.round(media * 10) / 10,
      desvio: Math.round(((total - media) / desvioPadrao) * 10) / 10,
    }))
    .filter((a) => Math.abs(a.desvio) >= 1.5)
    .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))
    .slice(0, limite);
}

export function calcularConsistencia(): Consistencia {
  const registros = getRegistros();
  const porDia = contarPorDia(registros);
  const dias = Object.keys(porDia);
  if (dias.length === 0) return { percentual: 0, diasComRegistro: 0, diasUteisTotais: 0 };

  const primeiro = new Date(dias.sort()[0] + "T12:00:00");
  const hoje = new Date();
  let diasUteis = 0;
  let diasComRegistro = 0;

  for (let d = new Date(primeiro); d <= hoje; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      diasUteis++;
      const key = d.toISOString().slice(0, 10);
      if (porDia[key]) diasComRegistro++;
    }
  }

  return {
    percentual: diasUteis > 0 ? Math.round((diasComRegistro / diasUteis) * 100) : 0,
    diasComRegistro,
    diasUteisTotais: diasUteis,
  };
}

export function compararComMediaHistorica(): { hoje: number; media: number; diferenca: number; percentual: number } {
  const registros = getRegistros();
  const porDia = contarPorDia(registros);
  const valores = Object.values(porDia);
  const media = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;

  const hojeKey = new Date().toISOString().slice(0, 10);
  const hoje = porDia[hojeKey] || 0;
  const diferenca = hoje - media;
  const percentual = media > 0 ? Math.round((diferenca / media) * 100) : 0;

  return { hoje, media: Math.round(media * 10) / 10, diferenca: Math.round(diferenca * 10) / 10, percentual };
}
