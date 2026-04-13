"use client";

import { useAtendimentos } from "@/hooks/useAtendimentos";
import { getRegistros, atualizarNota } from "@/lib/storage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Select } from "@/components/ui/Select";
import { DatePickerInput } from "@/components/ui/DatePickerInput";

export default function RegistrosPage() {
  const { tipos, loaded } = useAtendimentos();
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [editandoNota, setEditandoNota] = useState<string | null>(null);
  const [textoNota, setTextoNota] = useState("");
  const [tick, setTick] = useState(0);

  const localDateKey = (timestamp: string) => format(new Date(timestamp), "yyyy-MM-dd");

  const todosRegistros = useMemo(() => {
    if (!loaded) return [];
    void tick;
    return getRegistros();
  }, [loaded, tick]);

  const registrosFiltrados = useMemo(() => {
    let result = [...todosRegistros].reverse();

    // Filter by type
    if (filtroTipo !== "todos") {
      result = result.filter((r) => r.tipoId === filtroTipo);
    }

    // Filter by date range
    if (filtroDataInicio) {
      result = result.filter((r) => localDateKey(r.timestamp) >= filtroDataInicio);
    }
    if (filtroDataFim) {
      result = result.filter((r) => localDateKey(r.timestamp) <= filtroDataFim);
    }

    // Search by note text or type name
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      result = result.filter((r) => {
        const tipo = tipos.find((t) => t.id === r.tipoId);
        const nomeMatch = tipo?.nome.toLowerCase().includes(termo);
        const notaMatch = r.nota?.toLowerCase().includes(termo);
        return nomeMatch || notaMatch;
      });
    }

    return result;
  }, [todosRegistros, filtroTipo, filtroDataInicio, filtroDataFim, busca, tipos]);

  const handleSalvarNota = (id: string) => {
    atualizarNota(id, textoNota);
    setEditandoNota(null);
    setTextoNota("");
    setTick((t) => t + 1);
  };

  const limparFiltros = () => {
    setBusca("");
    setFiltroTipo("todos");
    setFiltroDataInicio("");
    setFiltroDataFim("");
  };

  const temFiltros = busca || filtroTipo !== "todos" || filtroDataInicio || filtroDataFim;

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-alice-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group by date
  const porDia = new Map<string, typeof registrosFiltrados>();
  for (const reg of registrosFiltrados) {
    const data = localDateKey(reg.timestamp);
    if (!porDia.has(data)) porDia.set(data, []);
    porDia.get(data)!.push(reg);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Histórico de Registros</h2>
        <p className="text-alice-gray-400 text-xs sm:text-sm mt-1">
          {todosRegistros.length} registros no total
          {registrosFiltrados.length !== todosRegistros.length && (
            <span> — {registrosFiltrados.length} encontrados</span>
          )}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-4 space-y-3">
        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-alice-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por tipo ou nota..."
            className="w-full pl-10 pr-4 py-2.5 border border-alice-gray-200 rounded-lg text-sm focus:outline-none focus:border-alice-primary bg-card"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] sm:text-xs text-alice-gray-400 mb-1">Tipo</label>
            <Select
              value={filtroTipo}
              onChange={setFiltroTipo}
              options={[
                { value: "todos", label: "Todos os tipos" },
                ...tipos.map((t) => ({ value: t.id, label: t.nome })),
              ]}
            />
          </div>
          <div className="min-w-[130px]">
            <label className="block text-[10px] sm:text-xs text-alice-gray-400 mb-1">De</label>
            <DatePickerInput
              value={filtroDataInicio}
              onChange={setFiltroDataInicio}
              placeholder="Início"
            />
          </div>
          <div className="min-w-[130px]">
            <label className="block text-[10px] sm:text-xs text-alice-gray-400 mb-1">Até</label>
            <DatePickerInput
              value={filtroDataFim}
              onChange={setFiltroDataFim}
              placeholder="Fim"
            />
          </div>
          {temFiltros && (
            <button
              onClick={limparFiltros}
              className="px-3 py-2 text-xs text-alice-gray-500 bg-alice-gray-50 rounded-lg hover:bg-alice-gray-100 transition-colors whitespace-nowrap"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Results grouped by day */}
      {registrosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-alice-gray-400 text-sm">
            {temFiltros ? "Nenhum registro encontrado com esses filtros." : "Nenhum registro ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...porDia.entries()].map(([data, regs]) => (
            <div key={data} className="bg-card rounded-xl border border-alice-gray-100 overflow-hidden">
              {/* Day header */}
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-alice-gray-50 border-b border-alice-gray-100 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold capitalize">
                  {format(new Date(data + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
                <span className="text-xs text-alice-gray-400 font-medium">
                  {regs.length} {regs.length === 1 ? "registro" : "registros"}
                </span>
              </div>
              {/* Records */}
              <div className="divide-y divide-alice-gray-100">
                {regs.map((reg) => {
                  const tipo = tipos.find((t) => t.id === reg.tipoId);
                  const isExpanded = expandido === reg.id;
                  const isEditing = editandoNota === reg.id;
                  return (
                    <div key={reg.id}>
                      <button
                        onClick={() => setExpandido(isExpanded ? null : reg.id)}
                        className="w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-alice-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: tipo?.cor || "#999" }}
                          />
                          <span className="text-xs sm:text-sm font-medium truncate">
                            {tipo?.nome || "Desconhecido"}
                          </span>
                          {reg.nota && (
                            <span className="text-[10px] sm:text-xs text-alice-gray-400 truncate max-w-[150px] sm:max-w-[250px]">
                              — {reg.nota}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-alice-gray-400">
                            {format(new Date(reg.timestamp), "HH:mm:ss")}
                          </span>
                          <svg
                            className={`w-3.5 h-3.5 text-alice-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-3 sm:px-4 pb-3 space-y-2">
                          <div className="flex flex-wrap gap-3 text-[10px] sm:text-xs text-alice-gray-400">
                            <span>
                              <strong className="text-foreground">Tipo:</strong>{" "}
                              <span style={{ color: tipo?.cor }}>{tipo?.nome}</span>
                            </span>
                            <span>
                              <strong className="text-foreground">Horário:</strong>{" "}
                              {format(new Date(reg.timestamp), "HH:mm:ss")}
                            </span>
                            <span>
                              <strong className="text-foreground">Data:</strong>{" "}
                              {format(new Date(reg.timestamp), "dd/MM/yyyy")}
                            </span>
                          </div>
                          {/* Note section */}
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={textoNota}
                                onChange={(e) => setTextoNota(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSalvarNota(reg.id);
                                  if (e.key === "Escape") { setEditandoNota(null); setTextoNota(""); }
                                }}
                                placeholder="Nota sobre este atendimento..."
                                className="flex-1 px-2 py-1.5 border border-alice-gray-200 rounded text-xs focus:outline-none focus:border-alice-primary bg-card"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSalvarNota(reg.id)}
                                className="px-2 py-1.5 text-xs text-white bg-alice-primary rounded hover:bg-alice-primary-dark transition-colors"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => { setEditandoNota(null); setTextoNota(""); }}
                                className="px-2 py-1.5 text-xs text-alice-gray-400 hover:text-foreground"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              {reg.nota ? (
                                <p className="text-xs text-alice-gray-500 flex-1">
                                  <strong className="text-foreground">Nota:</strong> {reg.nota}
                                </p>
                              ) : (
                                <p className="text-xs text-alice-gray-300 italic flex-1">Sem nota</p>
                              )}
                              <button
                                onClick={() => {
                                  setEditandoNota(reg.id);
                                  setTextoNota(reg.nota || "");
                                }}
                                className="text-[10px] sm:text-xs text-alice-primary hover:text-alice-primary-dark transition-colors shrink-0"
                              >
                                {reg.nota ? "Editar" : "Adicionar nota"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
