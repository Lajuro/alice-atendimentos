"use client";

import { useAtendimentos } from "@/hooks/useAtendimentos";
import {
  getRegistrosDoMes,
  contarPorDia,
  contarPorHora,
  contarPorTipo,
  getRegistrosDoDia,
  getRecordes,
  getNotasDia,
} from "@/lib/storage";
import { AVALIACAO_LABEL } from "@/lib/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Frown, Meh, Smile, StickyNote, Trophy } from "lucide-react";

export default function DashboardPage() {
  const { tipos, horasTrabalho, loaded } = useAtendimentos();
  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth() + 1;

  const registrosMes = useMemo(() => {
    if (!loaded) return [];
    return getRegistrosDoMes(ano, mes);
  }, [loaded, ano, mes]);

  const contagemDias = useMemo(() => contarPorDia(registrosMes), [registrosMes]);
  const totalMes = registrosMes.length;

  const diasDoMes = useMemo(() => {
    const inicio = startOfMonth(mesAtual);
    const fim = endOfMonth(mesAtual);
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [mesAtual]);

  const heatmapHorasAgregado = useMemo(() => {
    return contarPorHora(registrosMes);
  }, [registrosMes]);

  const dadosDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return null;
    const registros = getRegistrosDoDia(diaSelecionado);
    return {
      registros,
      porTipo: contarPorTipo(registros),
      porHora: contarPorHora(registros),
      total: registros.length,
    };
  }, [diaSelecionado]);

  const contagemTiposMes = useMemo(() => contarPorTipo(registrosMes), [registrosMes]);

  const recordes = useMemo(() => {
    if (!loaded) return null;
    return getRecordes();
  }, [loaded]);

  const notasMes = useMemo(() => {
    const prefix = `${ano}-${String(mes).padStart(2, "0")}`;
    return getNotasDia().filter((n) => n.data.startsWith(prefix)).sort((a, b) => b.data.localeCompare(a.data));
  }, [ano, mes, loaded]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-alice-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxDia = Math.max(1, ...Object.values(contagemDias));
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const offsetInicio = getDay(diasDoMes[0]);
  const diasTrabalhados = Object.keys(contagemDias).length;
  const mediaDia = diasTrabalhados > 0 ? Math.round(totalMes / diasTrabalhados) : 0;

  const getAvaliacaoIcon = (avaliacao: keyof typeof AVALIACAO_LABEL) => {
    if (avaliacao === "bom") return Smile;
    if (avaliacao === "normal") return Meh;
    return Frown;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header com navegação do mês */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Dashboard</h2>
          <p className="text-alice-gray-400 text-xs sm:text-sm mt-1">Visão geral dos atendimentos</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMesAtual(subMonths(mesAtual, 1))}
            className="p-2 rounded-lg bg-alice-gray-50 hover:bg-alice-gray-100 transition-colors"
          >
            <ChevronLeftIcon />
          </button>
          <span className="text-sm font-semibold min-w-[140px] text-center capitalize">
            {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={() => setMesAtual(addMonths(mesAtual, 1))}
            className="p-2 rounded-lg bg-alice-gray-50 hover:bg-alice-gray-100 transition-colors"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total no mês" value={totalMes} />
        <StatCard label="Dias trabalhados" value={diasTrabalhados} />
        <StatCard label="Média por dia" value={mediaDia} />
        <StatCard
          label="Hora mais agitada"
          value={
            totalMes > 0
              ? `${Object.entries(heatmapHorasAgregado).sort(([, a], [, b]) => b - a)[0][0]}h`
              : "—"
          }
        />
      </div>

      {/* Recordes pessoais */}
      {recordes && (recordes.melhorDia || recordes.melhorSemana || recordes.melhorMes) && (
        <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Recordes Pessoais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recordes.melhorDia && (
              <div className="p-3 rounded-lg bg-alice-gray-50 text-center">
                <p className="text-[10px] sm:text-xs text-alice-gray-400 mb-1">Melhor dia</p>
                <p className="text-xl sm:text-2xl font-bold text-alice-primary">{recordes.melhorDia.total}</p>
                <p className="text-[10px] sm:text-xs text-alice-gray-300 mt-0.5">
                  {format(new Date(recordes.melhorDia.data + "T12:00:00"), "dd/MM/yyyy")}
                </p>
              </div>
            )}
            {recordes.melhorSemana && (
              <div className="p-3 rounded-lg bg-alice-gray-50 text-center">
                <p className="text-[10px] sm:text-xs text-alice-gray-400 mb-1">Melhor semana</p>
                <p className="text-xl sm:text-2xl font-bold text-alice-primary">{recordes.melhorSemana.total}</p>
                <p className="text-[10px] sm:text-xs text-alice-gray-300 mt-0.5">
                  {format(new Date(recordes.melhorSemana.inicio + "T12:00:00"), "dd/MM")} — {format(new Date(recordes.melhorSemana.fim + "T12:00:00"), "dd/MM")}
                </p>
              </div>
            )}
            {recordes.melhorMes && (
              <div className="p-3 rounded-lg bg-alice-gray-50 text-center">
                <p className="text-[10px] sm:text-xs text-alice-gray-400 mb-1">Melhor mês</p>
                <p className="text-xl sm:text-2xl font-bold text-alice-primary">{recordes.melhorMes.total}</p>
                <p className="text-[10px] sm:text-xs text-alice-gray-300 mt-0.5 capitalize">
                  {format(new Date(recordes.melhorMes.mes + "-15"), "MMMM yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contagem por tipo no mês */}
      <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4">Atendimentos por tipo — {format(mesAtual, "MMMM", { locale: ptBR })}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {tipos.map((tipo) => {
            const count = contagemTiposMes[tipo.id] || 0;
            const pct = totalMes > 0 ? Math.round((count / totalMes) * 100) : 0;
            return (
              <div key={tipo.id} className="text-center p-2 sm:p-3 rounded-lg bg-alice-gray-50">
                <div className="w-3 h-3 rounded-full mx-auto mb-1.5" style={{ backgroundColor: tipo.cor }} />
                <p className="text-[10px] sm:text-xs text-alice-gray-400 leading-tight">{tipo.nome}</p>
                <p className="text-lg sm:text-xl font-bold mt-1" style={{ color: tipo.cor }}>{count}</p>
                <p className="text-[9px] sm:text-[10px] text-alice-gray-300">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mapa de calor — Dias do mês + Detalhes do dia */}
      <div className={`bg-card rounded-xl border p-3 sm:p-5 transition-colors ${diaSelecionado ? "border-alice-primary/30" : "border-alice-gray-100"}`}>
        <h3 className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4">Mapa de calor — Dias do mês</h3>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 max-w-md mx-auto">
          {diasSemana.map((d) => (
            <div key={d} className="text-[9px] sm:text-[10px] text-alice-gray-400 text-center font-medium pb-1">
              {d}
            </div>
          ))}
          {Array.from({ length: offsetInicio }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {diasDoMes.map((dia) => {
            const key = format(dia, "yyyy-MM-dd");
            const count = contagemDias[key] || 0;
            const intensity = count / maxDia;
            const isSelected = diaSelecionado === key;
            return (
              <button
                key={key}
                onClick={() => setDiaSelecionado(diaSelecionado === key ? null : key)}
                className={`aspect-square rounded-md sm:rounded-lg flex flex-col items-center justify-center text-[10px] sm:text-xs transition-all hover:ring-2 hover:ring-alice-primary ${
                  isSelected ? "ring-2 ring-alice-primary ring-offset-1 sm:ring-offset-2" : ""
                }`}
                style={{
                  backgroundColor:
                    count === 0
                      ? "var(--heatmap-empty)"
                      : `rgba(190, 3, 128, ${0.12 + intensity * 0.88})`,
                  color: intensity > 0.35 ? "white" : "var(--heatmap-text)",
                }}
                title={`${format(dia, "dd/MM")} — ${count} atendimentos`}
              >
                <span className="font-medium">{format(dia, "d")}</span>
                {count > 0 && <span className="text-[8px] sm:text-[9px] opacity-80">{count}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 justify-end">
          <span className="text-[9px] sm:text-[10px] text-alice-gray-400">Menos</span>
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <div
              key={level}
              className="w-3 h-3 sm:w-4 sm:h-4 rounded"
              style={{
                backgroundColor: level === 0 ? "var(--heatmap-empty)" : `rgba(190, 3, 128, ${0.12 + level * 0.88})`,
              }}
            />
          ))}
          <span className="text-[9px] sm:text-[10px] text-alice-gray-400">Mais</span>
        </div>

        {/* Detalhes do dia selecionado — dentro do mesmo card */}
        {diaSelecionado && dadosDiaSelecionado ? (
          <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-alice-gray-100 space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-semibold">
                {format(new Date(diaSelecionado + "T12:00:00"), "dd 'de' MMMM, EEEE", { locale: ptBR })}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold text-alice-primary">{dadosDiaSelecionado.total}</span>
                <span className="text-[10px] sm:text-xs text-alice-gray-400">atendimentos</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              {tipos.map((tipo) => {
                const count = dadosDiaSelecionado.porTipo[tipo.id] || 0;
                if (count === 0) return null;
                return (
                  <div key={tipo.id} className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-alice-gray-50 rounded-lg text-xs sm:text-sm">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" style={{ backgroundColor: tipo.cor }} />
                    <span>{tipo.nome}</span>
                    <span className="font-bold" style={{ color: tipo.cor }}>{count}</span>
                  </div>
                );
              })}
            </div>

            <div>
              <h4 className="text-[10px] sm:text-xs font-medium text-alice-gray-400 mb-2">Distribuição por horário</h4>
              <HeatmapHoras dados={dadosDiaSelecionado.porHora} horas={horasTrabalho} />
            </div>
          </div>
        ) : (
          <p className="text-[10px] sm:text-xs text-alice-gray-300 text-center mt-3">Toque em um dia para ver detalhes</p>
        )}
      </div>

      {/* Mapa de calor agregado de horários */}
      <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold mb-2">
          Horários mais agitados — {format(mesAtual, "MMMM", { locale: ptBR })}
        </h3>
        <p className="text-[10px] sm:text-xs text-alice-gray-400 mb-3 sm:mb-4">
          Soma de atendimentos em cada horário ao longo de todos os dias trabalhados
        </p>
        <HeatmapHoras dados={heatmapHorasAgregado} horas={horasTrabalho} showMedia={diasTrabalhados} />
      </div>

      {/* Heatmap cruzado: dias × horas */}
      <HeatmapDiasHoras
        diasDoMes={diasDoMes}
        registrosMes={registrosMes}
        horasTrabalho={horasTrabalho}
      />

      {/* Histórico de notas do mês */}
      {notasMes.length > 0 && (
        <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4 inline-flex items-center gap-1.5">
            <StickyNote className="w-4 h-4" />
            Diario do turno — {format(mesAtual, "MMMM", { locale: ptBR })}
          </h3>
          <div className="space-y-2">
            {notasMes.map((nota) => (
              <div key={nota.data} className="flex items-start gap-3 rounded-lg bg-alice-gray-50 px-3 py-2.5">
                <div className="shrink-0 text-center min-w-[36px]">
                  <p className="text-xs font-bold text-alice-primary">{format(new Date(nota.data + "T12:00:00"), "dd")}</p>
                  <p className="text-[9px] text-alice-gray-400 capitalize">{format(new Date(nota.data + "T12:00:00"), "EEE", { locale: ptBR })}</p>
                </div>
                {nota.avaliacao && (
                  <span className="shrink-0" title={AVALIACAO_LABEL[nota.avaliacao]}>
                    {(() => {
                      const Icon = getAvaliacaoIcon(nota.avaliacao);
                      return <Icon className="w-4 h-4" />;
                    })()}
                  </span>
                )}
                <p className="text-xs sm:text-sm text-foreground leading-relaxed flex-1">{nota.nota || <span className="italic text-alice-gray-300">Sem texto</span>}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== Sub-Components ========== */

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-4">
      <p className="text-[10px] sm:text-xs text-alice-gray-400">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}

function HeatmapHoras({
  dados,
  horas,
  showMedia,
}: {
  dados: Record<number, number>;
  horas: number[];
  showMedia?: number;
}) {
  const maxCount = Math.max(1, ...Object.values(dados));

  return (
    <div className="flex gap-0.5 sm:gap-1 overflow-x-auto">
      {horas.map((hora) => {
        const count = dados[hora] || 0;
        const intensity = count / maxCount;
        const media = showMedia && showMedia > 0 ? (count / showMedia).toFixed(1) : null;
        return (
          <div key={hora} className="flex-1 min-w-[28px] text-center">
            <div
              className="h-10 sm:h-14 rounded-md mb-1 flex flex-col items-center justify-center transition-colors"
              style={{
                backgroundColor:
                  count === 0 ? "var(--heatmap-empty)" : `rgba(190, 3, 128, ${0.15 + intensity * 0.85})`,
                color: intensity > 0.4 ? "white" : "var(--heatmap-text)",
              }}
              title={`${hora}h: ${count} atendimentos${media ? ` (média ${media}/dia)` : ""}`}
            >
              <span className="text-xs sm:text-sm font-bold">{count > 0 ? count : ""}</span>
              {media && count > 0 && (
                <span className="text-[8px] sm:text-[9px] opacity-70">~{media}/d</span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] text-alice-gray-400">{hora}h</span>
          </div>
        );
      })}
    </div>
  );
}

function HeatmapDiasHoras({
  diasDoMes,
  registrosMes,
  horasTrabalho,
}: {
  diasDoMes: Date[];
  registrosMes: ReturnType<typeof getRegistrosDoMes>;
  horasTrabalho: number[];
}) {
  const matrix = useMemo(() => {
    const m: Record<string, Record<number, number>> = {};
    for (const r of registrosMes) {
      const dia = format(new Date(r.timestamp), "yyyy-MM-dd");
      const hora = new Date(r.timestamp).getHours();
      if (!m[dia]) m[dia] = {};
      m[dia][hora] = (m[dia][hora] || 0) + 1;
    }
    return m;
  }, [registrosMes]);

  const maxVal = Math.max(
    1,
    ...Object.values(matrix).flatMap((h) => Object.values(h))
  );

  const diasComRegistro = diasDoMes.filter(
    (d) => matrix[format(d, "yyyy-MM-dd")]
  );

  if (diasComRegistro.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-5">
      <h3 className="text-xs sm:text-sm font-semibold mb-2">Mapa de calor — Dias × Horários</h3>
      <p className="text-[10px] sm:text-xs text-alice-gray-400 mb-3 sm:mb-4">
        Cada célula representa a quantidade de atendimentos naquele horário, naquele dia
      </p>
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <table className="w-full border-collapse min-w-[500px]">
          <thead>
            <tr>
              <th className="text-[9px] sm:text-[10px] text-alice-gray-400 text-left px-1 pb-2 font-medium">Dia</th>
              {horasTrabalho.map((h) => (
                <th key={h} className="text-[9px] sm:text-[10px] text-alice-gray-400 font-medium px-0.5 pb-2">
                  {h}h
                </th>
              ))}
              <th className="text-[9px] sm:text-[10px] text-alice-gray-400 font-medium px-1 pb-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {diasComRegistro.map((dia) => {
              const key = format(dia, "yyyy-MM-dd");
              const horasDia = matrix[key] || {};
              const totalDia = Object.values(horasDia).reduce((a, b) => a + b, 0);
              return (
                <tr key={key}>
                  <td className="text-[9px] sm:text-[10px] text-alice-gray-500 px-1 py-0.5 font-medium whitespace-nowrap">
                    {format(dia, "dd/MM EEE", { locale: ptBR })}
                  </td>
                  {horasTrabalho.map((h) => {
                    const count = horasDia[h] || 0;
                    const intensity = count / maxVal;
                    return (
                      <td key={h} className="px-0.5 py-0.5">
                        <div
                          className="w-full h-5 sm:h-6 rounded flex items-center justify-center text-[8px] sm:text-[9px] font-medium"
                          style={{
                            backgroundColor:
                              count === 0
                                ? "var(--heatmap-empty-alt)"
                                : `rgba(190, 3, 128, ${0.15 + intensity * 0.85})`,
                            color: intensity > 0.4 ? "white" : count > 0 ? "var(--heatmap-text)" : "transparent",
                          }}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-[10px] sm:text-xs font-bold text-alice-primary text-center px-1">
                    {totalDia}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
