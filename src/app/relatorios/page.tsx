"use client";

import { useAtendimentos } from "@/hooks/useAtendimentos";
import {
  getRegistrosDoMes,
  getRegistros,
  contarPorTipo,
  contarPorHora,
  contarPorDia,
  getPerfil,
} from "@/lib/storage";
import { RegistroAtendimento } from "@/lib/types";
import {
  format,
  subMonths,
  addMonths,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  subYears,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState, useCallback } from "react";
import { BarChart3, Calendar, MessageCircle, X } from "lucide-react";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";

// ─── Helpers ───

type TipoObj = { id: string; nome: string; cor: string };

function contarPorDiaTipo(registros: RegistroAtendimento[]): Record<string, Record<string, number>> {
  const m: Record<string, Record<string, number>> = {};
  for (const r of registros) {
    const dia = format(new Date(r.timestamp), "yyyy-MM-dd");
    if (!m[dia]) m[dia] = {};
    m[dia][r.tipoId] = (m[dia][r.tipoId] || 0) + 1;
  }
  return m;
}

function getSemanasDoMes(ano: number, mes: number) {
  const inicio = startOfMonth(new Date(ano, mes - 1));
  const fim = endOfMonth(new Date(ano, mes - 1));
  const semanas: { num: number; inicio: Date; fim: Date; dias: Date[] }[] = [];
  let semanaInicio = startOfWeek(inicio, { weekStartsOn: 1 });
  let num = 1;

  while (semanaInicio <= fim) {
    const semanaFim = endOfWeek(semanaInicio, { weekStartsOn: 1 });
    const dias = eachDayOfInterval({ start: semanaInicio, end: semanaFim }).filter((d) =>
      isSameMonth(d, inicio)
    );
    if (dias.length > 0) {
      semanas.push({ num, inicio: dias[0], fim: dias.at(-1)!, dias });
    }
    semanaInicio = new Date(semanaFim);
    semanaInicio.setDate(semanaInicio.getDate() + 1);
    num++;
  }
  return semanas;
}

function contarPorSemana(
  registros: RegistroAtendimento[],
  semanas: ReturnType<typeof getSemanasDoMes>,
) {
  const contagemDias = contarPorDia(registros);
  return semanas.map((s) => {
    let total = 0;
    for (const d of s.dias) {
      total += contagemDias[format(d, "yyyy-MM-dd")] || 0;
    }
    return { ...s, total, diasUteis: s.dias.filter((d) => d.getDay() !== 0 && d.getDay() !== 6).length };
  });
}

function contarPorSemanaTipo(
  registros: RegistroAtendimento[],
  semanas: ReturnType<typeof getSemanasDoMes>,
) {
  const porDiaTipo = contarPorDiaTipo(registros);
  return semanas.map((s) => {
    const tipos: Record<string, number> = {};
    for (const d of s.dias) {
      const key = format(d, "yyyy-MM-dd");
      if (porDiaTipo[key]) {
        for (const [tid, count] of Object.entries(porDiaTipo[key])) {
          tipos[tid] = (tipos[tid] || 0) + count;
        }
      }
    }
    return { ...s, tipos };
  });
}

// ─── Page ───

export default function RelatoriosPage() {
  const { tipos, horasTrabalho, loaded } = useAtendimentos();
  const perfil = getPerfil();
  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [exportando, setExportando] = useState(false);
  const [aba, setAba] = useState<"resumo" | "graficos" | "diario" | "semanal" | "comparativo">("resumo");
  const [rangeInicio, setRangeInicio] = useState("");
  const [rangeFim, setRangeFim] = useState("");

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth() + 1;

  const registrosMes = useMemo(() => {
    if (!loaded) return [];
    return getRegistrosDoMes(ano, mes);
  }, [loaded, ano, mes]);

  // Meses anteriores para comparativo (3 meses)
  const mesesComparativos = useMemo(() => {
    if (!loaded) return [];
    return [0, 1, 2, 3].map((offset) => {
      const d = subMonths(mesAtual, offset);
      const a = d.getFullYear();
      const m = d.getMonth() + 1;
      const regs = getRegistrosDoMes(a, m);
      const dias = contarPorDia(regs);
      const diasUteis = Object.keys(dias).length;
      return {
        label: format(d, "MMM yy", { locale: ptBR }),
        labelFull: format(d, "MMMM yyyy", { locale: ptBR }),
        total: regs.length,
        diasUteis,
        media: diasUteis > 0 ? Math.round(regs.length / diasUteis) : 0,
        porTipo: contarPorTipo(regs),
        porHora: contarPorHora(regs),
      };
    });
  }, [loaded, mesAtual]);

  // Custom date range filtered data
  const registrosRange = useMemo(() => {
    if (!rangeInicio || !rangeFim) return null;
    const all = getRegistros();
    return all.filter((r) => {
      const d = new Date(r.timestamp);
      const localKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return localKey >= rangeInicio && localKey <= rangeFim;
    });
  }, [rangeInicio, rangeFim]);

  // Records to display: date range takes priority over current month
  const registrosAtivos = registrosRange ?? registrosMes;

  const contagemTipos = useMemo(() => contarPorTipo(registrosAtivos), [registrosAtivos]);
  const contagemHoras = useMemo(() => contarPorHora(registrosAtivos), [registrosAtivos]);
  const contagemDias = useMemo(() => contarPorDia(registrosAtivos), [registrosAtivos]);
  const porDiaTipo = useMemo(() => contarPorDiaTipo(registrosAtivos), [registrosAtivos]);
  const totalMes = registrosAtivos.length;
  const diasTrabalhados = Object.keys(contagemDias).length;

  const semanas = useMemo(() => getSemanasDoMes(ano, mes), [ano, mes]);
  const semanasComDados = useMemo(() => contarPorSemana(registrosAtivos, semanas), [registrosAtivos, semanas]);
  const semanasComTipos = useMemo(() => contarPorSemanaTipo(registrosAtivos, semanas), [registrosAtivos, semanas]);

  // YoY comparison (same month last year)
  const yoyData = useMemo(() => {
    if (!loaded) return null;
    const lastYear = subYears(mesAtual, 1);
    const regsLastYear = getRegistrosDoMes(lastYear.getFullYear(), lastYear.getMonth() + 1);
    if (regsLastYear.length === 0) return null;
    const porDiaLY = contarPorDia(regsLastYear);
    const diasLY = Object.keys(porDiaLY).length;
    return {
      label: format(lastYear, "MMM yyyy", { locale: ptBR }),
      total: regsLastYear.length,
      dias: diasLY,
      media: diasLY > 0 ? Math.round(regsLastYear.length / diasLY) : 0,
      porTipo: contarPorTipo(regsLastYear),
    };
  }, [loaded, mesAtual]);

  // WhatsApp share
  const compartilharWhatsApp = useCallback(() => {
    const periodoNome = rangeInicio && rangeFim
      ? `${rangeInicio} a ${rangeFim}`
      : format(mesAtual, "MMMM yyyy", { locale: ptBR });
    const media = diasTrabalhados > 0 ? Math.round(totalMes / diasTrabalhados) : 0;
    const tipoLines = tipos.map((t) => `  • ${t.nome}: ${contagemTipos[t.id] || 0}`).join("\n");
    const text = `*Relatório de Atendimentos*\n${periodoNome}\n\nTotal: *${totalMes}* atendimentos\nDias trabalhados: *${diasTrabalhados}*\nMédia/dia: *${media}*\n\nPor tipo:\n${tipoLines}\n\n_Gerado por Alice Atendimentos_`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [mesAtual, rangeInicio, rangeFim, totalMes, diasTrabalhados, tipos, contagemTipos]);

  // ─── CSV ───
  const exportarCSV = useCallback(() => {
    if (registrosAtivos.length === 0) return;
    const headers = ["Data", "Horário", "Tipo", "Tipo ID"];
    const rows = registrosAtivos.map((r) => {
      const tipo = tipos.find((t) => t.id === r.tipoId);
      const dt = new Date(r.timestamp);
      return [format(dt, "dd/MM/yyyy"), format(dt, "HH:mm:ss"), tipo?.nome || "Desconhecido", r.tipoId];
    });
    const summary = [
      [], ["--- RESUMO ---"],
      ["Total de atendimentos", String(totalMes)],
      ["Dias trabalhados", String(diasTrabalhados)],
      ["Média por dia", String(diasTrabalhados > 0 ? Math.round(totalMes / diasTrabalhados) : 0)],
      [], ["--- POR TIPO ---"],
      ...tipos.map((t) => [t.nome, String(contagemTipos[t.id] || 0)]),
    ];
    const csvContent = [headers, ...rows, ...summary]
      .map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atendimentos-${format(mesAtual, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [registrosAtivos, tipos, totalMes, diasTrabalhados, contagemTipos, mesAtual]);

  // ─── PDF ───
  const exportarPDF = useCallback(async () => {
    if (registrosAtivos.length === 0) return;
    setExportando(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      const periodoNome = rangeInicio && rangeFim
        ? `${rangeInicio} a ${rangeFim}`
        : format(mesAtual, "MMMM yyyy", { locale: ptBR });
      const getLastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      const pink: [number, number, number] = [190, 3, 128];

      // ── Page 1: Resumo ──
      doc.setFillColor(...pink);
      doc.rect(0, 0, 210, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("Relatório de Atendimentos", 14, 18);
      doc.setFontSize(11);
      doc.text((perfil?.nome ?? "Alice Saúde") + " — Alice Saúde", 14, 26);
      doc.text(periodoNome, 196, 18, { align: "right" });

      doc.setTextColor(20, 20, 20);
      doc.setFontSize(13);
      doc.text("Resumo Geral", 14, 45);
      autoTable(doc, {
        startY: 50,
        head: [["Métrica", "Valor"]],
        body: [
          ["Total de atendimentos", String(totalMes)],
          ["Dias trabalhados", String(diasTrabalhados)],
          ["Média por dia", String(diasTrabalhados > 0 ? Math.round(totalMes / diasTrabalhados) : 0)],
        ],
        theme: "grid", headStyles: { fillColor: pink }, styles: { fontSize: 10 },
      });

      // Por tipo
      doc.setFontSize(13);
      doc.text("Atendimentos por Tipo", 14, getLastY() + 10);
      autoTable(doc, {
        startY: getLastY() + 15,
        head: [["Tipo", "Quantidade", "Percentual"]],
        body: tipos.map((t) => {
          const count = contagemTipos[t.id] || 0;
          const pct = totalMes > 0 ? `${Math.round((count / totalMes) * 100)}%` : "0%";
          return [t.nome, String(count), pct];
        }),
        theme: "grid", headStyles: { fillColor: pink }, styles: { fontSize: 10 },
      });

      // Por hora
      doc.setFontSize(13);
      doc.text("Atendimentos por Horário", 14, getLastY() + 10);
      autoTable(doc, {
        startY: getLastY() + 15,
        head: [["Horário", "Total", "Média/dia"]],
        body: horasTrabalho.map((h) => {
          const count = contagemHoras[h] || 0;
          const media = diasTrabalhados > 0 ? (count / diasTrabalhados).toFixed(1) : "0";
          return [`${h}:00 - ${h}:59`, String(count), media];
        }),
        theme: "grid", headStyles: { fillColor: pink }, styles: { fontSize: 9 },
      });

      // ── Page 2: Detalhamento Diário por Tipo ──
      doc.addPage();
      doc.setFillColor(...pink);
      doc.rect(0, 0, 210, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("Detalhamento Diário por Tipo", 14, 16);
      doc.setTextColor(20, 20, 20);

      const diasOrdenados = Object.keys(porDiaTipo).sort((a, b) => a.localeCompare(b));
      autoTable(doc, {
        startY: 32,
        head: [["Data", "Dia", ...tipos.map((t) => t.nome), "Total"]],
        body: diasOrdenados.map((dia) => {
          const dt = new Date(dia + "T12:00:00");
          const tiposDia = porDiaTipo[dia] || {};
          const total = Object.values(tiposDia).reduce((a, b) => a + b, 0);
          return [
            format(dt, "dd/MM"),
            format(dt, "EEE", { locale: ptBR }),
            ...tipos.map((t) => String(tiposDia[t.id] || 0)),
            String(total),
          ];
        }),
        theme: "grid",
        headStyles: { fillColor: pink, fontSize: 7, cellPadding: 2 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 14 },
        },
      });

      // ── Page 3: Visão Semanal ──
      doc.addPage();
      doc.setFillColor(...pink);
      doc.rect(0, 0, 210, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("Visão por Semana", 14, 16);
      doc.setTextColor(20, 20, 20);

      autoTable(doc, {
        startY: 32,
        head: [["Semana", "Período", "Dias úteis", ...tipos.map((t) => t.nome), "Total", "Média/dia"]],
        body: semanasComTipos.map((s) => {
          const total = Object.values(s.tipos).reduce((a, b) => a + b, 0);
          const diasU = s.dias.filter((d) => d.getDay() !== 0 && d.getDay() !== 6).length;
          return [
            `Sem ${s.num}`,
            `${format(s.inicio, "dd/MM")} - ${format(s.fim, "dd/MM")}`,
            String(diasU),
            ...tipos.map((t) => String(s.tipos[t.id] || 0)),
            String(total),
            diasU > 0 ? (total / diasU).toFixed(1) : "0",
          ];
        }),
        theme: "grid",
        headStyles: { fillColor: pink, fontSize: 7, cellPadding: 2 },
        styles: { fontSize: 8, cellPadding: 2 },
      });

      // ── Page 4: Comparativo Mensal ──
      doc.addPage();
      doc.setFillColor(...pink);
      doc.rect(0, 0, 210, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("Comparativo Mensal (últimos 4 meses)", 14, 16);
      doc.setTextColor(20, 20, 20);

      // Tabela resumo
      doc.setFontSize(12);
      doc.text("Resumo Comparativo", 14, 33);
      autoTable(doc, {
        startY: 38,
        head: [["Mês", "Total", "Dias úteis", "Média/dia"]],
        body: mesesComparativos.map((m) => [m.labelFull, String(m.total), String(m.diasUteis), String(m.media)]),
        theme: "grid", headStyles: { fillColor: pink }, styles: { fontSize: 10 },
      });

      // Tabela por tipo comparativa
      doc.setFontSize(12);
      doc.text("Comparativo por Tipo", 14, getLastY() + 10);
      autoTable(doc, {
        startY: getLastY() + 15,
        head: [["Tipo", ...mesesComparativos.map((m) => m.label)]],
        body: tipos.map((t) => [
          t.nome,
          ...mesesComparativos.map((m) => String(m.porTipo[t.id] || 0)),
        ]),
        theme: "grid", headStyles: { fillColor: pink }, styles: { fontSize: 10 },
      });

      // Tabela por hora comparativa
      doc.setFontSize(12);
      doc.text("Comparativo por Horário", 14, getLastY() + 10);
      autoTable(doc, {
        startY: getLastY() + 15,
        head: [["Horário", ...mesesComparativos.map((m) => m.label)]],
        body: horasTrabalho.map((h) => [
          `${h}:00`,
          ...mesesComparativos.map((m) => String(m.porHora[h] || 0)),
        ]),
        theme: "grid", headStyles: { fillColor: pink }, styles: { fontSize: 9 },
      });

      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")} — Painel de Atendimentos Alice | Página ${i}/${pageCount}`,
          105, 290, { align: "center" },
        );
      }

      doc.save(`relatorio-${format(mesAtual, "yyyy-MM")}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF. Verifique o console.");
    } finally {
      setExportando(false);
    }
  }, [registrosAtivos, rangeInicio, rangeFim, tipos, totalMes, diasTrabalhados, contagemTipos, contagemHoras, porDiaTipo, semanasComTipos, mesesComparativos, mesAtual, horasTrabalho]);

  if (!loaded) return null;

  const abas = [
    { key: "resumo" as const, label: "Resumo" },
    { key: "graficos" as const, label: "Gráficos" },
    { key: "diario" as const, label: "Diário" },
    { key: "semanal" as const, label: "Semanal" },
    { key: "comparativo" as const, label: "Comparativo" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Relatórios</h2>
          <p className="text-alice-gray-400 text-xs sm:text-sm mt-1">Visualize e exporte dados de atendimentos</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setMesAtual(subMonths(mesAtual, 1))}
            className="p-2 rounded-lg bg-alice-gray-50 hover:bg-alice-gray-100 transition-colors"
          >
            <ChevronLeftIcon />
          </button>
          <span className="text-xs sm:text-sm font-semibold min-w-32.5 sm:min-w-40 text-center capitalize">
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

      {/* Botões de exportação + WhatsApp */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={exportarCSV}
          disabled={registrosAtivos.length === 0}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-card border-2 border-alice-gray-100 rounded-xl p-4 sm:p-6 hover:border-alice-primary hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition-colors shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-xs sm:text-sm">Exportar CSV</p>
            <p className="text-[10px] sm:text-xs text-alice-gray-400">Planilha com registros</p>
          </div>
        </button>
        <button
          onClick={exportarPDF}
          disabled={registrosAtivos.length === 0 || exportando}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-card border-2 border-alice-gray-100 rounded-xl p-4 sm:p-6 hover:border-alice-primary hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-xs sm:text-sm">{exportando ? "Gerando..." : "Exportar PDF"}</p>
            <p className="text-[10px] sm:text-xs text-alice-gray-400">Relatório completo</p>
          </div>
        </button>
        <button
          onClick={compartilharWhatsApp}
          disabled={registrosAtivos.length === 0}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-card border-2 border-alice-gray-100 rounded-xl p-4 sm:p-6 hover:border-green-500 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition-colors shrink-0">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-xs sm:text-sm">WhatsApp</p>
            <p className="text-[10px] sm:text-xs text-alice-gray-400">Compartilhar resumo</p>
          </div>
        </button>
      </div>

      {/* Date range filter */}
      <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-semibold text-foreground shrink-0 inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Período personalizado:
          </span>
          <div className="flex items-center gap-2 flex-1">
            <DatePickerInput
              value={rangeInicio}
              onChange={setRangeInicio}
              placeholder="Início"
              className="flex-1 min-w-0 text-xs py-1.5"
            />
            <span className="text-xs text-alice-gray-400">até</span>
            <DatePickerInput
              value={rangeFim}
              onChange={setRangeFim}
              placeholder="Fim"
              className="flex-1 min-w-0 text-xs py-1.5"
            />
          </div>
          {rangeInicio && rangeFim && registrosRange && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-alice-primary">{registrosRange.length} registros</span>
              <button onClick={() => { setRangeInicio(""); setRangeFim(""); }} className="text-xs text-alice-gray-400 hover:text-foreground inline-flex items-center gap-1">
                <X className="w-3.5 h-3.5" />
                Limpar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs de visualização */}
      <div className="flex gap-1 bg-alice-gray-50 rounded-xl p-1 overflow-x-auto">
        {abas.map((a) => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            className={`flex-1 min-w-fit px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              aba === a.key
                ? "bg-card text-alice-primary shadow-sm"
                : "text-alice-gray-400 hover:text-foreground"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-5 space-y-4 sm:space-y-6">
        {registrosAtivos.length === 0 ? (
          <p className="text-sm text-alice-gray-400 text-center py-8">
            {rangeInicio && rangeFim ? "Nenhum registro no período selecionado" : "Nenhum registro neste mês"}
          </p>
        ) : (
          <>
            {aba === "resumo" && (
              <PreviewResumo
                totalMes={totalMes}
                diasTrabalhados={diasTrabalhados}
                contagemTipos={contagemTipos}
                contagemHoras={contagemHoras}
                tipos={tipos}
                horasTrabalho={horasTrabalho}
              />
            )}
            {aba === "graficos" && (
              <PreviewGraficos
                contagemTipos={contagemTipos}
                contagemHoras={contagemHoras}
                contagemDias={contagemDias}
                porDiaTipo={porDiaTipo}
                tipos={tipos}
                horasTrabalho={horasTrabalho}
                totalMes={totalMes}
              />
            )}
            {aba === "diario" && (
              <PreviewDiario porDiaTipo={porDiaTipo} contagemDias={contagemDias} tipos={tipos} />
            )}
            {aba === "semanal" && (
              <PreviewSemanal semanas={semanasComDados} semanasComTipos={semanasComTipos} tipos={tipos} />
            )}
            {aba === "comparativo" && (
              <PreviewComparativo meses={mesesComparativos} tipos={tipos} horasTrabalho={horasTrabalho} yoy={yoyData} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Preview Components ───

const CHART_COLORS = ["#BE0380", "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function PreviewGraficos({
  contagemTipos, contagemHoras, contagemDias, porDiaTipo, tipos, horasTrabalho, totalMes,
}: Readonly<{
  contagemTipos: Record<string, number>; contagemHoras: Record<number, number>;
  contagemDias: Record<string, number>; porDiaTipo: Record<string, Record<string, number>>;
  tipos: TipoObj[]; horasTrabalho: number[]; totalMes: number;
}>) {
  // Pie data
  const pieData = tipos
    .map((t) => ({ name: t.nome, value: contagemTipos[t.id] || 0, cor: t.cor }))
    .filter((d) => d.value > 0);

  // Daily bar chart data (stacked by type)
  const diasOrdenados = Object.keys(contagemDias).sort();
  const barDiaData = diasOrdenados.map((dia) => {
    const entry: Record<string, string | number> = { dia: dia.slice(8) }; // dd
    for (const t of tipos) {
      entry[t.nome] = porDiaTipo[dia]?.[t.id] || 0;
    }
    entry.total = contagemDias[dia];
    return entry;
  });

  // Hourly bar chart data
  const barHoraData = horasTrabalho.map((h) => ({
    hora: `${h}h`,
    total: contagemHoras[h] || 0,
  }));

  // Trend line (daily totals)
  const trendData = diasOrdenados.map((dia) => ({
    dia: dia.slice(8),
    total: contagemDias[dia],
  }));

  return (
    <>
      <h3 className="text-xs sm:text-sm font-semibold">Gráficos Interativos</h3>

      {/* Pie Chart — por tipo */}
      <div>
        <h4 className="text-xs font-medium text-alice-gray-400 mb-2">Distribuição por tipo</h4>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="80%"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={11}
              >
                {pieData.map((entry, i) => (
                  <Cell key={entry.name} fill={entry.cor || CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => { const v = Number(value ?? 0); return [`${v} (${totalMes > 0 ? Math.round((v / totalMes) * 100) : 0}%)`, "Atendimentos"]; }} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stacked Bar — atendimentos diários por tipo */}
      <div>
        <h4 className="text-xs font-medium text-alice-gray-400 mb-2">Atendimentos diários por tipo</h4>
        <div className="h-64 sm:h-80 -mx-3 sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barDiaData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              {tipos.map((t, i) => (
                <Bar key={t.id} dataKey={t.nome} stackId="a" fill={t.cor || CHART_COLORS[i % CHART_COLORS.length]} radius={i === tipos.length - 1 ? [2, 2, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line — tendência diária */}
      <div>
        <h4 className="text-xs font-medium text-alice-gray-400 mb-2">Tendência diária</h4>
        <div className="h-48 sm:h-64 -mx-3 sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="total" stroke="#BE0380" strokeWidth={2} dot={{ r: 3 }} name="Atendimentos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar — por horário */}
      <div>
        <h4 className="text-xs font-medium text-alice-gray-400 mb-2">Distribuição por horário</h4>
        <div className="h-48 sm:h-64 -mx-3 sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barHoraData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="total" fill="#BE0380" radius={[4, 4, 0, 0]} name="Atendimentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function PreviewResumo({
  totalMes, diasTrabalhados, contagemTipos, contagemHoras, tipos, horasTrabalho,
}: Readonly<{
  totalMes: number; diasTrabalhados: number;
  contagemTipos: Record<string, number>; contagemHoras: Record<number, number>;
  tipos: TipoObj[]; horasTrabalho: number[];
}>) {
  return (
    <>
      <h3 className="text-xs sm:text-sm font-semibold">Resumo Geral</h3>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-alice-gray-50 rounded-lg p-2 sm:p-4 text-center">
          <p className="text-[10px] sm:text-xs text-alice-gray-400">Total</p>
          <p className="text-xl sm:text-3xl font-bold text-alice-primary">{totalMes}</p>
        </div>
        <div className="bg-alice-gray-50 rounded-lg p-2 sm:p-4 text-center">
          <p className="text-[10px] sm:text-xs text-alice-gray-400">Dias trabalhados</p>
          <p className="text-xl sm:text-3xl font-bold text-foreground">{diasTrabalhados}</p>
        </div>
        <div className="bg-alice-gray-50 rounded-lg p-2 sm:p-4 text-center">
          <p className="text-[10px] sm:text-xs text-alice-gray-400">Média/dia</p>
          <p className="text-xl sm:text-3xl font-bold text-foreground">
            {diasTrabalhados > 0 ? Math.round(totalMes / diasTrabalhados) : 0}
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-alice-gray-400 mb-2">Por tipo</h4>
        <div className="space-y-2">
          {tipos.map((tipo) => {
            const count = contagemTipos[tipo.id] || 0;
            const pct = totalMes > 0 ? (count / totalMes) * 100 : 0;
            return (
              <div key={tipo.id} className="flex items-center gap-2 sm:gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tipo.cor }} />
                <span className="text-xs sm:text-sm flex-1 truncate">{tipo.nome}</span>
                <span className="text-xs sm:text-sm font-bold" style={{ color: tipo.cor }}>{count}</span>
                <div className="w-20 sm:w-32 h-2 bg-alice-gray-100 rounded-full overflow-hidden shrink-0">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: tipo.cor }} />
                </div>
                <span className="text-[10px] text-alice-gray-400 w-8 text-right">{Math.round(pct)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-alice-gray-400 mb-2">Por horário</h4>
        <div className="flex gap-1 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          {horasTrabalho.map((h) => {
            const count = contagemHoras[h] || 0;
            const maxH = Math.max(1, ...horasTrabalho.map((hr) => contagemHoras[hr] || 0));
            const intensity = count / maxH;
            return (
              <div key={h} className="flex-1 min-w-7 text-center">
                <div
                  className="h-10 rounded-md mb-1 flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: count === 0 ? "var(--heatmap-empty)" : `rgba(190, 3, 128, ${0.15 + intensity * 0.85})`,
                    color: intensity > 0.4 ? "white" : "var(--heatmap-text)",
                  }}
                >
                  {count > 0 ? count : ""}
                </div>
                <span className="text-[10px] text-alice-gray-400">{h}h</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function PreviewDiario({
  porDiaTipo, contagemDias, tipos,
}: Readonly<{
  porDiaTipo: Record<string, Record<string, number>>;
  contagemDias: Record<string, number>;
  tipos: TipoObj[];
}>) {
  const diasOrdenados = Object.keys(contagemDias).sort((a, b) => a.localeCompare(b));

  return (
    <>
      <h3 className="text-xs sm:text-sm font-semibold">Detalhamento Diário por Tipo</h3>
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <table className="w-full border-collapse min-w-125">
          <thead>
            <tr className="border-b border-alice-gray-100">
              <th className="text-[10px] sm:text-xs text-alice-gray-400 text-left px-2 py-2 font-medium">Data</th>
              <th className="text-[10px] sm:text-xs text-alice-gray-400 text-left px-2 py-2 font-medium">Dia</th>
              {tipos.map((t) => (
                <th key={t.id} className="text-[10px] sm:text-xs text-alice-gray-400 text-center px-1 py-2 font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                    <span className="truncate">{t.nome}</span>
                  </div>
                </th>
              ))}
              <th className="text-[10px] sm:text-xs text-alice-gray-400 text-center px-2 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {diasOrdenados.map((dia) => {
              const dt = new Date(dia + "T12:00:00");
              const tiposDia = porDiaTipo[dia] || {};
              const total = contagemDias[dia] || 0;
              return (
                <tr key={dia} className="border-b border-alice-gray-50 hover:bg-alice-gray-50 transition-colors">
                  <td className="text-[10px] sm:text-xs px-2 py-1.5 font-medium">{format(dt, "dd/MM")}</td>
                  <td className="text-[10px] sm:text-xs px-2 py-1.5 text-alice-gray-400">{format(dt, "EEE", { locale: ptBR })}</td>
                  {tipos.map((t) => {
                    const count = tiposDia[t.id] || 0;
                    return (
                      <td key={t.id} className="text-center px-1 py-1.5">
                        {count > 0 ? (
                          <span className="inline-block min-w-6 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold text-white" style={{ backgroundColor: t.cor }}>
                            {count}
                          </span>
                        ) : (
                          <span className="text-[10px] text-alice-gray-200">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center px-2 py-1.5 text-xs sm:text-sm font-bold text-alice-primary">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PreviewSemanal({
  semanas, semanasComTipos, tipos,
}: Readonly<{
  semanas: { num: number; inicio: Date; fim: Date; total: number; diasUteis: number }[];
  semanasComTipos: { num: number; inicio: Date; fim: Date; tipos: Record<string, number> }[];
  tipos: TipoObj[];
}>) {
  return (
    <>
      <h3 className="text-xs sm:text-sm font-semibold">Visão por Semana</h3>
      <div className="space-y-3">
        {semanas.map((s, i) => {
          const tiposData = semanasComTipos[i]?.tipos || {};
          const media = s.diasUteis > 0 ? (s.total / s.diasUteis).toFixed(1) : "0";
          return (
            <div key={s.num} className="bg-alice-gray-50 rounded-xl p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold">Semana {s.num}</p>
                  <p className="text-[10px] sm:text-xs text-alice-gray-400">
                    {format(s.inicio, "dd/MM")} — {format(s.fim, "dd/MM")} · {s.diasUteis} dias úteis
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg sm:text-2xl font-bold text-alice-primary">{s.total}</p>
                  <p className="text-[10px] sm:text-xs text-alice-gray-400">{media}/dia</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {tipos.map((t) => {
                  const count = tiposData[t.id] || 0;
                  if (count === 0) return null;
                  return (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium text-white"
                      style={{ backgroundColor: t.cor }}
                    >
                      {t.nome}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PreviewComparativo({
  meses, tipos, horasTrabalho, yoy,
}: Readonly<{
  meses: {
    label: string; labelFull: string;
    total: number; diasUteis: number; media: number;
    porTipo: Record<string, number>; porHora: Record<number, number>;
  }[];
  tipos: TipoObj[];
  horasTrabalho: number[];
  yoy: { label: string; total: number; dias: number; media: number; porTipo: Record<string, number> } | null;
}>) {
  const maxTotal = Math.max(1, ...meses.map((m) => m.total));

  return (
    <>
      <h3 className="text-xs sm:text-sm font-semibold">Comparativo — Últimos 4 meses</h3>

      {/* Barras comparativas */}
      <div className="space-y-3">
        {meses.map((m, i) => (
          <div key={m.label} className="flex items-center gap-3">
            <span className="text-[10px] sm:text-xs font-medium w-16 sm:w-20 text-right shrink-0 capitalize">{m.label}</span>
            <div className="flex-1 h-8 sm:h-10 bg-alice-gray-50 rounded-lg overflow-hidden relative">
              <div
                className="h-full rounded-lg transition-all flex items-center justify-end pr-2"
                style={{
                  width: `${Math.max(5, (m.total / maxTotal) * 100)}%`,
                  backgroundColor: i === 0 ? "#BE0380" : `rgba(190, 3, 128, ${0.6 - i * 0.15})`,
                }}
              >
                <span className="text-xs font-bold text-white">{m.total}</span>
              </div>
            </div>
            <div className="text-right shrink-0 w-16 sm:w-20">
              <p className="text-[10px] sm:text-xs text-alice-gray-400">{m.diasUteis}d · {m.media}/d</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela por tipo */}
      <div>
        <h4 className="text-xs font-medium text-alice-gray-400 mb-2">Por tipo</h4>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-alice-gray-100">
                <th className="text-[10px] sm:text-xs text-alice-gray-400 text-left px-2 py-2 font-medium">Tipo</th>
                {meses.map((m) => (
                  <th key={m.label} className="text-[10px] sm:text-xs text-alice-gray-400 text-center px-2 py-2 font-medium capitalize">{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.id} className="border-b border-alice-gray-50">
                  <td className="text-[10px] sm:text-xs px-2 py-1.5 font-medium">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                      {t.nome}
                    </div>
                  </td>
                  {meses.map((m) => (
                    <td key={m.label} className="text-center text-xs sm:text-sm font-bold px-2 py-1.5" style={{ color: t.cor }}>
                      {m.porTipo[t.id] || 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Horários comparativos */}
      <div>
        <h4 className="text-xs font-medium text-alice-gray-400 mb-2">Por horário</h4>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-alice-gray-100">
                <th className="text-[10px] sm:text-xs text-alice-gray-400 text-left px-2 py-2 font-medium">Hora</th>
                {meses.map((m) => (
                  <th key={m.label} className="text-[10px] sm:text-xs text-alice-gray-400 text-center px-2 py-2 font-medium capitalize">{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horasTrabalho.map((h) => (
                <tr key={h} className="border-b border-alice-gray-50">
                  <td className="text-[10px] sm:text-xs px-2 py-1.5 font-medium text-alice-gray-500">{h}h</td>
                  {meses.map((m) => {
                    const count = m.porHora[h] || 0;
                    const maxH = Math.max(1, ...horasTrabalho.map((hr) => m.porHora[hr] || 0));
                    const intensity = count / maxH;
                    return (
                      <td key={m.label} className="text-center px-1 py-1">
                        <div
                          className="mx-auto w-8 sm:w-10 h-6 rounded flex items-center justify-center text-[10px] font-medium"
                          style={{
                            backgroundColor: count === 0 ? "var(--heatmap-empty-alt)" : `rgba(190, 3, 128, ${0.15 + intensity * 0.85})`,
                            color: intensity > 0.4 ? "white" : "var(--heatmap-text)",
                          }}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* YoY Comparison */}
      {yoy && (
        <div>
          <h4 className="text-xs font-medium text-alice-gray-400 mb-2 inline-flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5" />
            Comparativo Ano a Ano — {yoy.label}
          </h4>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-alice-gray-50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-[10px] text-alice-gray-400">Total ({yoy.label})</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{yoy.total}</p>
            </div>
            <div className="bg-alice-gray-50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-[10px] text-alice-gray-400">Dias</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{yoy.dias}</p>
            </div>
            <div className="bg-alice-gray-50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-[10px] text-alice-gray-400">Média/dia</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{yoy.media}</p>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            {tipos.map((t) => {
              const countLY = yoy.porTipo[t.id] || 0;
              const countMes = meses[0]?.porTipo[t.id] || 0;
              const diff = countMes - countLY;
              return (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                    <span>{t.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-alice-gray-400">{yoy.label}: {countLY}</span>
                    <span className={`font-semibold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-500" : "text-alice-gray-400"}`}>
                      {diff > 0 ? "▲" : diff < 0 ? "▼" : "="} {Math.abs(diff)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Icons ───

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
