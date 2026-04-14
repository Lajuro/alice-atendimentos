"use client";

import { useAtendimentos } from "@/hooks/useAtendimentos";
import { calcularTendencia, melhorDiaSemana, melhorHoraPico, previsaoMensal, detectarAnomalias, calcularConsistencia, compararComMediaHistorica } from "@/lib/insights";
import { calcularStreak, getMeta } from "@/lib/storage";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Calendar, Clock, Target, Activity, BarChart3, AlertTriangle, Flame } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function InsightsPage() {
  const { loaded } = useAtendimentos();

  const tendencia = useMemo(() => (loaded ? calcularTendencia() : null), [loaded]);
  const diasSemana = useMemo(() => (loaded ? melhorDiaSemana() : []), [loaded]);
  const horaPico = useMemo(() => (loaded ? melhorHoraPico() : []), [loaded]);
  const previsao = useMemo(() => (loaded ? previsaoMensal() : null), [loaded]);
  const anomalias = useMemo(() => (loaded ? detectarAnomalias() : []), [loaded]);
  const consistencia = useMemo(() => (loaded ? calcularConsistencia() : null), [loaded]);
  const comparativo = useMemo(() => (loaded ? compararComMediaHistorica() : null), [loaded]);
  const streak = useMemo(() => (loaded ? calcularStreak() : 0), [loaded]);
  const meta = useMemo(() => (loaded ? getMeta().metaDiaria : 0), [loaded]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-alice-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const TrendIcon = tendencia?.direcao === "subindo" ? TrendingUp : tendencia?.direcao === "descendo" ? TrendingDown : Minus;
  const trendColor = tendencia?.direcao === "subindo" ? "text-emerald-500" : tendencia?.direcao === "descendo" ? "text-red-500" : "text-alice-gray-400";
  const trendLabel = tendencia?.direcao === "subindo" ? "Em alta" : tendencia?.direcao === "descendo" ? "Em queda" : "Estável";

  const melhorDia = diasSemana[0];
  const melhorHora = horaPico[0];

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Insights Pessoais</h1>
        <p className="text-alice-gray-400 text-xs sm:text-sm mt-1">
          Análise inteligente dos seus padrões de atendimento
        </p>
      </div>

      {/* Top cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Ritmo Atual */}
        <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-alice-gray-400 uppercase tracking-wider">Ritmo Atual</span>
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
          </div>
          <p className={`text-lg sm:text-xl font-bold ${trendColor}`}>{trendLabel}</p>
          {tendencia && tendencia.percentual !== 0 && (
            <p className="text-xs text-alice-gray-400 mt-1">
              {tendencia.percentual > 0 ? "+" : ""}{tendencia.percentual}% vs semana anterior
            </p>
          )}
        </div>

        {/* Projeção do Mês */}
        {previsao && (
          <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-alice-gray-400 uppercase tracking-wider">Projeção do Mês</span>
              <Target className="w-5 h-5 text-alice-primary" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground">{previsao.projecao}</p>
            <p className="text-xs text-alice-gray-400 mt-1">
              Média {previsao.mediaAteAgora}/dia · {previsao.diasRestantes} dias restantes
            </p>
          </div>
        )}

        {/* Consistência */}
        {consistencia && consistencia.diasUteisTotais > 0 && (
          <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-alice-gray-400 uppercase tracking-wider">Consistência</span>
              <Activity className="w-5 h-5 text-violet-500" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground">{consistencia.percentual}%</p>
            <div className="h-1.5 bg-alice-gray-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${consistencia.percentual}%` }}
              />
            </div>
            <p className="text-xs text-alice-gray-400 mt-1">
              {consistencia.diasComRegistro} de {consistencia.diasUteisTotais} dias úteis
            </p>
          </div>
        )}

        {/* Comparativo Hoje */}
        {comparativo && (
          <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-alice-gray-400 uppercase tracking-wider">Hoje vs Média</span>
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground">
              {comparativo.hoje} <span className="text-sm font-normal text-alice-gray-400">/ {comparativo.media}</span>
            </p>
            {comparativo.percentual !== 0 && (
              <p className={`text-xs mt-1 font-medium ${comparativo.percentual > 0 ? "text-emerald-500" : "text-red-500"}`}>
                {comparativo.percentual > 0 ? "+" : ""}{comparativo.percentual}% da média
              </p>
            )}
          </div>
        )}

        {/* Streak */}
        {meta > 0 && (
          <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-alice-gray-400 uppercase tracking-wider">Sequência</span>
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-amber-500">{streak} {streak === 1 ? "dia" : "dias"}</p>
            <p className="text-xs text-alice-gray-400 mt-1">Consecutivos batendo a meta</p>
          </div>
        )}
      </div>

      {/* Melhor dia da semana */}
      {diasSemana.length > 0 && (
        <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-alice-primary" />
            <h2 className="text-sm sm:text-base font-bold">Melhor Dia da Semana</h2>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            {diasSemana.map((d, i) => {
              const maxMedia = diasSemana[0].media;
              const ratio = maxMedia > 0 ? d.media / maxMedia : 0;
              return (
                <div key={d.dia} className="flex-1 text-center">
                  <div className="h-20 sm:h-28 flex items-end justify-center mb-1">
                    <div
                      className="w-full max-w-10 rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(4, ratio * 100)}%`,
                        backgroundColor: i === 0 ? "#BE0380" : `rgba(190, 3, 128, ${0.15 + ratio * 0.45})`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs font-semibold text-alice-gray-400 capitalize">{d.dia}</p>
                  <p className="text-[10px] text-alice-gray-300">{d.media}</p>
                </div>
              );
            })}
          </div>
          {melhorDia && (
            <p className="text-xs text-alice-gray-400 mt-3">
              Seu melhor dia é <strong className="text-foreground capitalize">{melhorDia.dia}</strong> com média de <strong className="text-foreground">{melhorDia.media}</strong> atendimentos
            </p>
          )}
        </div>
      )}

      {/* Hora de Ouro */}
      {horaPico.length > 0 && (
        <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm sm:text-base font-bold">Hora de Ouro</h2>
          </div>
          <div className="flex gap-0.5 sm:gap-1 overflow-x-auto">
            {horaPico.slice(0, 12).map((h, i) => {
              const maxMedia = horaPico[0].media;
              const ratio = maxMedia > 0 ? h.media / maxMedia : 0;
              return (
                <div key={h.hora} className="flex-1 min-w-[28px] text-center">
                  <div className="h-16 sm:h-24 flex items-end justify-center mb-1">
                    <div
                      className="w-full max-w-8 rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(8, ratio * 100)}%`,
                        backgroundColor: i === 0 ? "#F59E0B" : `rgba(245, 158, 11, ${0.15 + ratio * 0.55})`,
                      }}
                    />
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-alice-gray-400">{h.hora}h</p>
                </div>
              );
            })}
          </div>
          {melhorHora && (
            <p className="text-xs text-alice-gray-400 mt-3">
              Seu pico é às <strong className="text-foreground">{melhorHora.hora}h</strong> com média de <strong className="text-foreground">{melhorHora.media}</strong> atendimentos
            </p>
          )}
        </div>
      )}

      {/* Anomalias */}
      {anomalias.length > 0 && (
        <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm sm:text-base font-bold">Dias Atípicos</h2>
          </div>
          <div className="space-y-2">
            {anomalias.map((a) => (
              <div key={a.data} className="flex items-center justify-between text-xs sm:text-sm rounded-lg bg-alice-gray-50 px-3 py-2">
                <span className="text-alice-gray-500">
                  {format(new Date(a.data + "T12:00:00"), "dd MMM yyyy", { locale: ptBR })}
                </span>
                <span className="font-bold">{a.total} atendimentos</span>
                <span className={`text-xs font-medium ${a.desvio > 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {a.desvio > 0 ? "+" : ""}{a.desvio}σ
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-alice-gray-300 mt-2">
            Dias com volume significativamente diferente da média ({anomalias[0]?.media ?? 0}/dia)
          </p>
        </div>
      )}
    </div>
  );
}
