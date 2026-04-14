"use client";

import { useAtendimentos } from "@/hooks/useAtendimentos";
import { contarPorTipo, contarPorHora, getRegistrosDoDia, getRegistros, contarPorDia, getPerfil, getAlmocosDoDia, iniciarAlmoco, finalizarAlmoco, getMeta, calcularStreak, atualizarNota, getNotaDia, salvarNotaDia, getAlmocoOverrideDia, setAlmocoOverrideDia, removerAlmocoOverrideDia } from "@/lib/storage";
import { type HorarioAlmoco, AVALIACOES, AVALIACAO_LABEL, type AvaliacaoEmoji } from "@/lib/types";
import { processarNovasConquistas, xpParaProximoNivel, getNomeNivel, CONQUISTAS_MAP } from "@/lib/conquistas";
import { getGamificacao, getConquistasDesbloqueadas } from "@/lib/storage";
import { compararComMediaHistorica } from "@/lib/insights";
import { verificarMetaProxima } from "@/lib/notifications";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ChartColumn, Check, Coffee, Flame, Frown, Keyboard, Meh, Smile, Sparkles, Star, StickyNote, Timer, TrendingUp, X } from "lucide-react";
import { TimeInputSm } from "@/components/ui/TimeInput";

export default function Home() {
  const { tipos, registrar, removerRegistro, horasTrabalho, loaded } = useAtendimentos();
  const [dataAtual] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<{ msg: string; key: number; hiding?: boolean } | null>(null);
  const [popId, setPopId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, key: Date.now() });
    setTimeout(() => setToast((t) => (t ? { ...t, hiding: true } : null)), 1800);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Meta & streak
  const meta = useMemo(() => (loaded ? getMeta() : null), [loaded, tick]);
  const metaDiaria = meta?.metaDiaria ?? 0;
  const streak = useMemo(() => (loaded ? calcularStreak() : 0), [loaded, tick]);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevTotalRef = useRef(0);
  const [editandoNota, setEditandoNota] = useState<string | null>(null);
  const [textoNota, setTextoNota] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showQuickStats, setShowQuickStats] = useState(false);
  const [horaAtual, setHoraAtual] = useState(() => new Date().getHours());
  const [showTimeline, setShowTimeline] = useState(false);

  // Nota do dia
  const [notaDiaTexto, setNotaDiaTexto] = useState("");
  const [notaDiaAvaliacao, setNotaDiaAvaliacao] = useState<AvaliacaoEmoji | undefined>(undefined);
  const [editandoNotaDia, setEditandoNotaDia] = useState(false);

  // Gamification state — updates in real-time via event
  const [gamificacao, setGamificacao] = useState(() => loaded ? getGamificacao() : { xp: 0, nivel: 1, conquistasDesbloqueadas: [] });
  const [ultimasConquistas, setUltimasConquistas] = useState(() => loaded ? getConquistasDesbloqueadas().slice(-3).reverse() : []);

  useEffect(() => {
    if (!loaded) return;
    setGamificacao(getGamificacao());
    setUltimasConquistas(getConquistasDesbloqueadas().slice(-3).reverse());
  }, [loaded, tick]);

  useEffect(() => {
    const handler = () => {
      setGamificacao(getGamificacao());
      setUltimasConquistas(getConquistasDesbloqueadas().slice(-3).reverse());
    };
    window.addEventListener("conquistas-updated", handler);
    return () => window.removeEventListener("conquistas-updated", handler);
  }, []);

  const registrosHoje = useMemo(() => {
    if (!loaded) return [];
    void tick; // force recalc
    return getRegistrosDoDia(dataAtual);
  }, [loaded, dataAtual, tick]);

  const contagemTipos = useMemo(() => contarPorTipo(registrosHoje), [registrosHoje]);
  const contagemHoras = useMemo(() => contarPorHora(registrosHoje), [registrosHoje]);
  const totalHoje = registrosHoje.length;

  // Lunch break logic
  const [perfilVersion, setPerfilVersion] = useState(0);
  useEffect(() => {
    const handler = () => setPerfilVersion((v) => v + 1);
    window.addEventListener("atendimentos-updated", handler);
    return () => window.removeEventListener("atendimentos-updated", handler);
  }, []);
  const perfil = useMemo(() => getPerfil(), [loaded, perfilVersion]);
  const almocosHoje = useMemo(() => {
    if (!loaded) return [];
    void tick;
    return getAlmocosDoDia(dataAtual);
  }, [loaded, dataAtual, tick]);

  const almocoEmAndamento = almocosHoje.find((a) => !a.fim);

  const almocoEsperadoHoje = useMemo((): HorarioAlmoco | null => {
    if (!perfil) return null;
    const override = getAlmocoOverrideDia(dataAtual);
    return override ?? perfil.almocoPadrao;
  }, [perfil, dataAtual, tick]);

  const [editandoAlmocoHoje, setEditandoAlmocoHoje] = useState(false);
  const [almocoOverrideTemp, setAlmocoOverrideTemp] = useState<HorarioAlmoco>({ inicio: "17:30", fim: "18:30" });

  // Confetti trigger when daily goal is met
  useEffect(() => {
    if (metaDiaria > 0 && prevTotalRef.current < metaDiaria && totalHoje >= metaDiaria) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    }
    prevTotalRef.current = totalHoje;
  }, [totalHoje, metaDiaria]);

  // Auto-refresh current hour marker every 60s
  useEffect(() => {
    const iv = setInterval(() => setHoraAtual(new Date().getHours()), 60_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!loaded || editandoNotaDia) return;
    const notaDia = getNotaDia(dataAtual);
    setNotaDiaTexto(notaDia?.nota ?? "");
    setNotaDiaAvaliacao(notaDia?.avaliacao);
  }, [loaded, dataAtual, tick, editandoNotaDia]);

  // Quick stats data
  const quickStats = useMemo(() => {
    if (!loaded) return null;
    const allRegs = getRegistros();
    const porDia = contarPorDia(allRegs);
    const dias = Object.keys(porDia);
    if (dias.length === 0) return null;
    const total = Object.values(porDia).reduce((a, b) => a + b, 0);
    const media = total / dias.length;
    const ontem = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
    const totalOntem = porDia[ontem] ?? 0;
    const diff = totalHoje - totalOntem;
    return { media: media.toFixed(1), totalOntem, diff };
  }, [loaded, totalHoje, tick]);

  // Compute which hours have lunch coverage
  const horasAlmoco = useMemo(() => {
    const set = new Set<number>();
    // From actual lunch records
    for (const a of almocosHoje) {
      const start = new Date(a.inicio).getHours();
      const end = a.fim ? new Date(a.fim).getHours() : new Date().getHours();
      const endMin = a.fim ? new Date(a.fim).getMinutes() : new Date().getMinutes();
      // Include end hour only if there are minutes past the hour (e.g. 19:15 includes 19h)
      for (let h = start; h < end || (h === end && endMin > 0); h++) set.add(h);
    }
    // From expected schedule if no manual records
    if (almocosHoje.length === 0 && almocoEsperadoHoje) {
      const [sh] = almocoEsperadoHoje.inicio.split(":").map(Number);
      const [eh, em] = almocoEsperadoHoje.fim.split(":").map(Number);
      for (let h = sh; h < eh || (h === eh && em > 0); h++) set.add(h);
    }
    return set;
  }, [almocosHoje, almocoEsperadoHoje]);

  const handleToggleAlmoco = useCallback(() => {
    if (almocoEmAndamento) {
      finalizarAlmoco(almocoEmAndamento.id);
    } else {
      iniciarAlmoco(dataAtual);
    }
    setTick((t) => t + 1);
  }, [almocoEmAndamento, dataAtual]);

  const handleRegistrar = useCallback((tipoId: string) => {
    registrar(tipoId);
    setTick((t) => t + 1);
    setPopId(tipoId);
    setTimeout(() => setPopId(null), 200);
    const tipo = tipos.find((t) => t.id === tipoId);
    if (tipo) showToast(`+1 ${tipo.nome}`);
    // Check conquests & notifications after registration
    processarNovasConquistas();
    verificarMetaProxima();
  }, [tipos, registrar, showToast]);

  const handleDesfazer = useCallback(() => {
    if (registrosHoje.length === 0) return;
    const ultimo = registrosHoje[registrosHoje.length - 1];
    const tipo = tipos.find((t) => t.id === ultimo.tipoId);
    removerRegistro(ultimo.id);
    setTick((t) => t + 1);
    showToast(`Desfeito${tipo ? `: ${tipo.nome}` : ""}`);
  }, [registrosHoje, tipos, removerRegistro, showToast]);

  const handleSalvarNota = (id: string) => {
    atualizarNota(id, textoNota);
    setEditandoNota(null);
    setTextoNota("");
    setTick((t) => t + 1);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((h) => !h);
        return;
      }
      if (e.key === "Escape") {
        setShowHelp(false);
        setShowQuickStats(false);
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= 9 && num <= tipos.length) {
        e.preventDefault();
        handleRegistrar(tipos[num - 1].id);
        return;
      }
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        handleDesfazer();
        return;
      }
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        handleToggleAlmoco();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tipos, handleToggleAlmoco, handleRegistrar, handleDesfazer]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-alice-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function heatmapBg(isLunch: boolean, count: number, intensity: number) {
    if (isLunch && count === 0) return "var(--heatmap-lunch)";
    if (count === 0) return "var(--heatmap-empty)";
    return `rgba(190, 3, 128, ${0.15 + intensity * 0.85})`;
  }

  function heatmapColor(isLunch: boolean, count: number, intensity: number) {
    if (isLunch && count === 0) return "var(--heatmap-lunch-text)";
    if (intensity > 0.4) return "white";
    return "var(--heatmap-text)";
  }

  function heatmapLabel(isLunch: boolean, count: number) {
    if (isLunch && count === 0) return <Coffee className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-label="Almoço" />;
    if (count > 0) return count;
    return "";
  }

  function getAvaliacaoIcon(avaliacao: AvaliacaoEmoji) {
    if (avaliacao === "bom") return Smile;
    if (avaliacao === "normal") return Meh;
    return Frown;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Toast */}
      {toast && (
        <div
          key={toast.key}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-alice-black text-alice-white text-sm font-medium shadow-lg ${
            toast.hiding ? "animate-toast-out" : "animate-toast-in"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Registrar Atendimento</h2>
        <p className="text-alice-gray-400 text-sm mt-1">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Total counter */}
      <div className="bg-gradient-to-r from-alice-primary to-alice-primary-dark rounded-2xl p-4 sm:p-6 text-white flex items-center justify-between gap-3 relative">
        <div
          className="cursor-pointer"
          onMouseEnter={() => setShowQuickStats(true)}
          onMouseLeave={() => setShowQuickStats(false)}
          onClick={() => setShowQuickStats((s) => !s)}
        >
          <p className="text-xs sm:text-sm opacity-80">Total de atendimentos hoje</p>
          <p className="text-4xl sm:text-5xl font-bold mt-1">{totalHoje}</p>
        </div>
        {/* Quick stats popover */}
        {showQuickStats && quickStats && (
          <div className="absolute left-4 top-full mt-2 z-30 bg-white dark:bg-gray-800 text-foreground rounded-xl shadow-xl border border-alice-gray-100 dark:border-gray-700 p-3 min-w-[200px] text-xs sm:text-sm space-y-1.5">
            <p className="font-semibold text-alice-primary inline-flex items-center gap-1">
              <ChartColumn className="w-3.5 h-3.5" />
              Resumo rapido
            </p>
            <p>Média diária: <strong>{quickStats.media}</strong></p>
            <p>Ontem: <strong>{quickStats.totalOntem}</strong></p>
            <p>
              vs ontem:{" "}
              <strong className={quickStats.diff > 0 ? "text-emerald-600" : quickStats.diff < 0 ? "text-red-500" : ""}>
                {quickStats.diff > 0 ? "+" : ""}{quickStats.diff}
              </strong>
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2 items-end">
          <button
            onClick={handleDesfazer}
            disabled={totalHoje === 0}
            className="px-3 py-2 sm:px-4 bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap"
          >
            Desfazer último <kbd className="inline ml-1 opacity-60 text-[10px] border border-white/30 rounded px-1">Z</kbd>
          </button>
          {perfil?.onboardingCompleto && (
            <button
              onClick={handleToggleAlmoco}
              className={`px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
                almocoEmAndamento
                  ? "bg-amber-500/80 hover:bg-amber-500 text-white"
                  : "bg-white/20 hover:bg-white/30"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Coffee className="w-3.5 h-3.5" />
                {almocoEmAndamento ? "Encerrar almoço" : "Iniciar almoço"}
              </span>
              <kbd className="inline ml-1 opacity-60 text-[10px] border border-white/30 rounded px-1">L</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Meta diária progress + streak */}
      {metaDiaria > 0 && (
        <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-4 space-y-2 relative overflow-hidden">
          {/* Confetti overlay */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => {
                const Icon = i % 2 === 0 ? Sparkles : Star;
                return (
                <span
                  key={i}
                  className="absolute"
                  style={{
                    left: `${4 + (i * 17) % 92}%`,
                    top: `-10px`,
                    animation: `confetti-fall ${1.2 + Math.random() * 1.3}s ease-in ${Math.random() * 0.4}s forwards`,
                  }}
                >
                  <Icon className={`w-3.5 h-3.5 ${i % 3 === 0 ? "text-rose-500" : i % 3 === 1 ? "text-amber-500" : "text-violet-500"}`} />
                </span>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-foreground">
                Meta diária: {totalHoje}/{metaDiaria}
              </span>
              {totalHoje >= metaDiaria && (
                <span className="text-xs font-medium text-emerald-600 animate-confetti-pop inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Batida!
                </span>
              )}
            </div>
            {streak > 0 && (
              <span className="text-xs sm:text-sm font-semibold text-amber-500 inline-flex items-center gap-1" title={`${streak} dias consecutivos batendo a meta`}>
                <Flame className="w-3.5 h-3.5" />
                {streak} {streak === 1 ? "dia" : "dias"}
              </span>
            )}
          </div>
          <div className="h-3 sm:h-4 bg-alice-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalHoje >= metaDiaria
                  ? "bg-emerald-500 animate-goal-pulse"
                  : totalHoje >= metaDiaria * 0.7
                  ? "bg-amber-400"
                  : "bg-alice-primary"
              }`}
              style={{ width: `${Math.min(100, (totalHoje / metaDiaria) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] sm:text-xs text-alice-gray-400">
            {totalHoje >= metaDiaria
              ? `Parabéns! Meta superada em ${totalHoje - metaDiaria} atendimento${totalHoje - metaDiaria !== 1 ? "s" : ""}`
              : `Faltam ${metaDiaria - totalHoje} atendimento${metaDiaria - totalHoje !== 1 ? "s" : ""} para bater a meta`}
          </p>
        </div>
      )}

      {/* Badge / Level widget */}
      {gamificacao.xp > 0 && (
        <Link
          href="/conquistas"
          className="block bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-4 hover:border-amber-400/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            {/* Level badge */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-sm shrink-0">
              {gamificacao.nivel}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  {getNomeNivel(gamificacao.nivel)}
                </span>
                <span className="text-[10px] text-alice-gray-400">
                  {gamificacao.xp} XP
                </span>
              </div>
              {/* XP progress bar */}
              {(() => {
                const xpInfo = xpParaProximoNivel(gamificacao.xp);
                return (
                  <div className="h-1.5 bg-alice-gray-100 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, xpInfo.progresso * 100)}%` }}
                    />
                  </div>
                );
              })()}
              {/* Recent badges */}
              {ultimasConquistas.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  {ultimasConquistas.map((c) => {
                    const def = CONQUISTAS_MAP.get(c.id);
                    return def ? (
                      <span key={c.id} className="text-sm" title={def.titulo}>
                        {def.icone}
                      </span>
                    ) : null;
                  })}
                  <span className="text-[10px] text-alice-gray-400 ml-1 group-hover:text-alice-primary transition-colors">
                    Ver todas →
                  </span>
                </div>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Botões de registro — grandes e fáceis de clicar */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {tipos.map((tipo, idx) => {
          const count = contagemTipos[tipo.id] || 0;
          return (
            <button
              key={tipo.id}
              onClick={() => handleRegistrar(tipo.id)}
              className={`relative group rounded-xl border-2 border-alice-gray-100 bg-card p-4 sm:p-5 text-left transition-all hover:shadow-lg hover:border-alice-primary active:scale-[0.97] min-h-[80px]${popId === tipo.id ? " animate-register-pop" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: tipo.cor }}
                />
                <p className="font-semibold text-xs sm:text-sm text-foreground leading-tight">{tipo.nome}</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold" style={{ color: tipo.cor }}>
                {count}
              </p>
              <div className="absolute top-3 right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-alice-gray-50 group-hover:bg-alice-primary group-hover:text-white flex items-center justify-center text-alice-gray-400 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              {idx < 9 && (
                <kbd className="flex absolute bottom-2 right-3 w-5 h-5 rounded text-[10px] font-mono bg-alice-gray-100 text-alice-gray-400 items-center justify-center">{idx + 1}</kbd>
              )}
            </button>
          );
        })}
      </div>

      {/* Mini heatmap de horas do dia */}
      <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">Atendimentos por hora — Hoje</h3>
        <div className="flex gap-0.5 sm:gap-1 overflow-x-auto">
          {horasTrabalho.map((hora) => {
            const count = contagemHoras[hora] || 0;
            const maxCount = Math.max(1, ...Object.values(contagemHoras));
            const intensity = count / maxCount;
            const isLunch = horasAlmoco.has(hora);
            return (
              <div key={hora} className="flex-1 min-w-[28px] text-center">
                <div
                  className="h-8 sm:h-10 rounded-md mb-1 transition-colors flex items-center justify-center text-[10px] sm:text-xs font-bold relative"
                  style={{
                    backgroundColor: heatmapBg(isLunch, count, intensity),
                    color: heatmapColor(isLunch, count, intensity),
                    outline: isLunch && count > 0 ? "2px solid #f59e0b" : undefined,
                    outlineOffset: "-2px",
                  }}
                >
                  {heatmapLabel(isLunch, count)}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] ${
                    hora === horaAtual ? "font-bold text-alice-primary" : "text-alice-gray-400"
                  }`}
                >
                  {hora}h
                </span>
              </div>
            );
          })}
        </div>
        {horasAlmoco.size > 0 && (
          <div className="flex items-center gap-3 mt-3 text-[10px] text-alice-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: 'var(--heatmap-lunch)' }} /> Almoço/Janta
            </span>
            {almocosHoje.some((a) => !a.fim) && (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                ● Em almoço agora
              </span>
            )}
          </div>
        )}
        {/* Override de horário de almoço para hoje */}
        {perfil?.onboardingCompleto && (
          <div className="mt-3 pt-3 border-t border-alice-gray-100">
            {editandoAlmocoHoje ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-alice-gray-500 font-medium">Pausa hoje:</span>
                <TimeInputSm
                  value={almocoOverrideTemp.inicio}
                  onChange={(v) => setAlmocoOverrideTemp((p) => ({ ...p, inicio: v }))}
                />
                <span className="text-alice-gray-300">–</span>
                <TimeInputSm
                  value={almocoOverrideTemp.fim}
                  onChange={(v) => setAlmocoOverrideTemp((p) => ({ ...p, fim: v }))}
                />
                <button
                  onClick={() => {
                    setAlmocoOverrideDia(dataAtual, almocoOverrideTemp);
                    setEditandoAlmocoHoje(false);
                    setTick((t) => t + 1);
                  }}
                  className="px-2.5 py-1 rounded bg-alice-primary text-white font-medium hover:bg-alice-primary-dark transition-colors"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditandoAlmocoHoje(false)}
                  className="px-2 py-1 rounded text-alice-gray-400 hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                {getAlmocoOverrideDia(dataAtual) && (
                  <button
                    onClick={() => {
                      removerAlmocoOverrideDia(dataAtual);
                      setEditandoAlmocoHoje(false);
                      setTick((t) => t + 1);
                    }}
                    className="px-2 py-1 rounded text-alice-gray-400 hover:text-red-500 transition-colors"
                  >
                    Usar padrão
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setAlmocoOverrideTemp(almocoEsperadoHoje ?? perfil.almocoPadrao);
                  setEditandoAlmocoHoje(true);
                }}
                className="flex items-center gap-1.5 text-[10px] text-alice-gray-400 hover:text-alice-primary transition-colors group"
              >
                <Coffee className="w-3 h-3" />
                <span>
                  Pausa hoje: <strong className="font-semibold">{almocoEsperadoHoje?.inicio}–{almocoEsperadoHoje?.fim}</strong>
                  {getAlmocoOverrideDia(dataAtual) && (
                    <span className="ml-1 text-amber-600 font-medium">(ajustado)</span>
                  )}
                </span>
                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Últimos registros */}
      {registrosHoje.length > 0 && (
        <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3">
            Últimos registros de hoje
          </h3>
          <div className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
            {[...registrosHoje]
              .reverse()
              .slice(0, 20)
              .map((reg) => {
                const tipo = tipos.find((t) => t.id === reg.tipoId);
                const isEditing = editandoNota === reg.id;
                return (
                  <div key={reg.id} className="rounded-lg bg-alice-gray-50 text-xs sm:text-sm">
                    <div className="flex items-center justify-between py-1.5 sm:py-2 px-2 sm:px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tipo?.cor || "#999" }}
                        />
                        <span className="font-medium truncate">{tipo?.nome || "Desconhecido"}</span>
                        {reg.nota && !isEditing && (
                          <span className="text-alice-gray-400 truncate max-w-[120px] sm:max-w-[200px]" title={reg.nota}>
                            — {reg.nota}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            if (isEditing) {
                              handleSalvarNota(reg.id);
                            } else {
                              setEditandoNota(reg.id);
                              setTextoNota(reg.nota || "");
                            }
                          }}
                          className="p-1 rounded hover:bg-alice-gray-200 transition-colors text-alice-gray-400 hover:text-foreground"
                          title={isEditing ? "Salvar nota" : reg.nota ? "Editar nota" : "Adicionar nota"}
                        >
                          {isEditing ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          )}
                        </button>
                        <span className="text-alice-gray-400">
                          {format(new Date(reg.timestamp), "HH:mm:ss")}
                        </span>
                      </div>
                    </div>
                    {isEditing && (
                      <div className="px-2 sm:px-3 pb-2 flex gap-2">
                        <input
                          type="text"
                          value={textoNota}
                          onChange={(e) => setTextoNota(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSalvarNota(reg.id);
                            if (e.key === "Escape") { setEditandoNota(null); setTextoNota(""); }
                          }}
                          placeholder="Nota rápida..."
                          className="flex-1 px-2 py-1 border border-alice-gray-200 rounded text-xs focus:outline-none focus:border-alice-primary bg-card"
                          autoFocus
                        />
                        <button
                          onClick={() => { setEditandoNota(null); setTextoNota(""); }}
                          className="px-2 py-1 text-[10px] text-alice-gray-400 hover:text-foreground"
                        >
                          Esc
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Insights mini-card */}
      {(() => {
        const cmp = compararComMediaHistorica();
        if (!cmp || (cmp.hoje === 0 && cmp.media === 0)) return null;
        return (
          <Link
            href="/insights"
            className="block bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-4 hover:border-alice-primary/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-alice-primary" />
                <span className="text-xs sm:text-sm font-semibold text-foreground">Seus Insights</span>
              </div>
              <svg className="w-4 h-4 text-alice-gray-300 group-hover:text-alice-primary transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
            <p className="text-xs text-alice-gray-400 mt-1">
              {cmp.percentual > 0
                ? `Hoje você está ${cmp.percentual}% acima da sua média (${cmp.media}/dia)`
                : cmp.percentual < 0
                ? `Hoje você está ${Math.abs(cmp.percentual)}% abaixo da sua média (${cmp.media}/dia)`
                : `Hoje está na média (${cmp.media}/dia)`}
            </p>
          </Link>
        );
      })()}

      {/* Nota do Dia */}
      <div className="bg-card rounded-xl border border-alice-gray-100 p-3 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground inline-flex items-center gap-1">
            <StickyNote className="w-3.5 h-3.5" />
            Nota do turno
          </h3>
          <div className="flex items-center gap-1">
            {AVALIACOES.map((avaliacao) => {
              const Icon = getAvaliacaoIcon(avaliacao);
              return (
              <button
                key={avaliacao}
                onClick={() => {
                  const next = notaDiaAvaliacao === avaliacao ? undefined : avaliacao;
                  setNotaDiaAvaliacao(next);
                  salvarNotaDia(dataAtual, notaDiaTexto, next);
                }}
                className={`transition-all rounded-lg p-1 ${notaDiaAvaliacao === avaliacao ? "bg-alice-gray-100 scale-110" : "opacity-40 hover:opacity-80"}`}
                title={AVALIACAO_LABEL[avaliacao]}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              );
            })}
          </div>
        </div>
        {editandoNotaDia ? (
          <div className="space-y-2">
            <textarea
              value={notaDiaTexto}
              onChange={(e) => setNotaDiaTexto(e.target.value)}
              placeholder="Como foi o turno? Algum caso especial? Observações..."
              className="w-full px-3 py-2 border border-alice-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-alice-primary resize-none bg-card"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditandoNotaDia(false)}
                className="px-3 py-1.5 text-xs text-alice-gray-400 hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  salvarNotaDia(dataAtual, notaDiaTexto, notaDiaAvaliacao);
                  setEditandoNotaDia(false);
                }}
                className="px-3 py-1.5 text-xs font-medium bg-alice-primary text-white rounded-lg hover:bg-alice-primary-dark transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditandoNotaDia(true)}
            className="w-full text-left text-xs sm:text-sm text-alice-gray-400 hover:text-foreground transition-colors rounded-lg bg-alice-gray-50 px-3 py-2 min-h-[36px]"
          >
            {notaDiaTexto || <span className="italic">Clique para adicionar uma nota do turno…</span>}
          </button>
        )}
      </div>

      {/* Timeline do turno */}
      <div className="bg-card rounded-xl border border-alice-gray-100 overflow-hidden">
        <button
          onClick={() => setShowTimeline((s) => !s)}
          className="w-full flex items-center justify-between px-3 py-2.5 sm:px-5 sm:py-3 hover:bg-alice-gray-50 transition-colors"
        >
          <h3 className="text-xs sm:text-sm font-semibold text-foreground inline-flex items-center gap-1">
            <Timer className="w-3.5 h-3.5" />
            Timeline do turno
          </h3>
          <svg className={`w-4 h-4 text-alice-gray-400 transition-transform ${showTimeline ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showTimeline && (
          <div className="px-3 pb-3 sm:px-5 sm:pb-4 max-h-72 overflow-y-auto space-y-1.5">
            {(() => {
              // Build timeline events: registros + almoco starts/ends
              type TimelineEvent =
                | { kind: "registro"; time: Date; tipoId: string; nota?: string }
                | { kind: "almoco-start" | "almoco-end"; time: Date };
              const events: TimelineEvent[] = [
                ...registrosHoje.map((r) => ({ kind: "registro" as const, time: new Date(r.timestamp), tipoId: r.tipoId, nota: r.nota })),
                ...almocosHoje.map((a) => ({ kind: "almoco-start" as const, time: new Date(a.inicio) })),
                ...almocosHoje.filter((a) => a.fim).map((a) => ({ kind: "almoco-end" as const, time: new Date(a.fim!) })),
              ].sort((a, b) => a.time.getTime() - b.time.getTime());

              if (events.length === 0) {
                return <p className="text-xs text-alice-gray-400 text-center py-4">Nenhum evento registrado hoje.</p>;
              }
              return events.map((ev, i) => {
                const timeStr = format(ev.time, "HH:mm");
                if (ev.kind === "registro") {
                  const tipo = tipos.find((t) => t.id === ev.tipoId);
                  return (
                    <div key={i} className="flex items-start gap-2.5 text-xs">
                      <span className="shrink-0 text-alice-gray-400 w-11 text-right">{timeStr}</span>
                      <div className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: tipo?.cor || "#9CA3AF" }} />
                      <span className="text-foreground">
                        {tipo?.nome || "Desconhecido"}
                        {ev.nota && <span className="text-alice-gray-400"> — {ev.nota}</span>}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-amber-600">
                    <span className="shrink-0 w-11 text-right">{timeStr}</span>
                    <Coffee className="w-3.5 h-3.5" />
                    <span>{ev.kind === "almoco-start" ? "Início do almoço" : "Fim do almoço"}</span>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Floating help button (desktop) */}
      <button
        onClick={() => setShowHelp(true)}
        className="flex fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full bg-alice-black text-alice-white hover:bg-alice-primary items-center justify-center shadow-lg transition-colors text-lg font-bold"
        title="Atalhos do teclado (?)"
      >
        ?
      </button>

      {/* Help overlay */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div
            className="bg-alice-black text-alice-white rounded-2xl shadow-2xl p-6 max-w-sm w-[calc(100%-2rem)] space-y-4 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-alice-white text-lg inline-flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Atalhos do teclado
              </h3>
              <button onClick={() => setShowHelp(false)} className="text-alice-gray-300 hover:text-alice-white text-xl" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-alice-white">
              {tipos.slice(0, 9).map((tipo, i) => (
                <div key={tipo.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tipo.cor }} />
                    {tipo.nome}
                  </span>
                  <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">{i + 1}</kbd>
                </div>
              ))}
              <hr className="border-white/10" />
              <div className="flex items-center justify-between">
                <span>Desfazer último registro</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">Z</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Iniciar/encerrar almoço</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">L</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Mostrar/fechar atalhos</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">?</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Fechar diálogos</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">Esc</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Alternar modo escuro</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">Ctrl+Shift+D</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
