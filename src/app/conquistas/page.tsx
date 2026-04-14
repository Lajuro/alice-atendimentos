"use client";

import { useMemo } from "react";
import { CONQUISTAS, CONQUISTAS_MAP, xpParaProximoNivel, getNomeNivel } from "@/lib/conquistas";
import { getConquistasDesbloqueadas, getGamificacao } from "@/lib/storage";
import type { CategoriaConquista } from "@/lib/types";
import { Trophy, Flame, Target, Compass, Users, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORIA_INFO: Record<CategoriaConquista, { label: string; icon: typeof Trophy; cor: string }> = {
  streak: { label: "Consistência", icon: Flame, cor: "text-amber-500" },
  volume: { label: "Volume", icon: Trophy, cor: "text-emerald-500" },
  meta: { label: "Metas", icon: Target, cor: "text-blue-500" },
  exploracao: { label: "Exploração", icon: Compass, cor: "text-violet-500" },
  social: { label: "Social", icon: Users, cor: "text-rose-500" },
};

const CATEGORIAS_ORDEM: CategoriaConquista[] = ["streak", "volume", "meta", "exploracao", "social"];

export default function ConquistasPage() {
  const gamificacao = useMemo(() => getGamificacao(), []);
  const desbloqueadas = useMemo(() => {
    const list = getConquistasDesbloqueadas();
    return new Map(list.map((c) => [c.id, c]));
  }, []);

  const progresso = xpParaProximoNivel(gamificacao.xp);
  const nomeNivel = getNomeNivel(gamificacao.nivel);
  const totalDesbloqueadas = desbloqueadas.size;
  const totalConquistas = CONQUISTAS.length;

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Conquistas</h2>
        <p className="text-alice-gray-400 text-xs sm:text-sm mt-1">
          {totalDesbloqueadas} de {totalConquistas} desbloqueadas
        </p>
      </div>

      {/* XP & Level Card */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs opacity-80">Nível {gamificacao.nivel}</p>
            <p className="text-xl sm:text-2xl font-bold">{nomeNivel}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl sm:text-3xl font-bold">{gamificacao.xp}</p>
            <p className="text-xs opacity-80">XP total</p>
          </div>
        </div>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progresso.progresso * 100}%` }}
          />
        </div>
        <p className="text-[10px] sm:text-xs mt-1.5 opacity-80">
          {progresso.atual} / {progresso.necessario} XP para o próximo nível
        </p>
      </div>

      {/* Badges by Category */}
      {CATEGORIAS_ORDEM.map((categoria) => {
        const info = CATEGORIA_INFO[categoria];
        const Icon = info.icon;
        const badges = CONQUISTAS.filter((c) => c.categoria === categoria);

        return (
          <div key={categoria} className="space-y-3">
            <h3 className={`text-sm font-bold inline-flex items-center gap-1.5 ${info.cor}`}>
              <Icon className="w-4 h-4" />
              {info.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {badges.map((badge) => {
                const unlocked = desbloqueadas.get(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`rounded-xl border p-3 sm:p-4 flex items-start gap-3 transition-all ${
                      unlocked
                        ? "bg-card border-alice-gray-100 shadow-sm"
                        : "bg-alice-gray-50 border-alice-gray-100 opacity-60"
                    }`}
                  >
                    <div className={`text-2xl shrink-0 ${unlocked ? "" : "grayscale"}`}>
                      {badge.icone}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`font-semibold text-xs sm:text-sm truncate ${unlocked ? "text-foreground" : "text-alice-gray-400"}`}>
                          {badge.titulo}
                        </p>
                        {!unlocked && <Lock className="w-3 h-3 text-alice-gray-300 shrink-0" />}
                      </div>
                      <p className="text-[10px] sm:text-xs text-alice-gray-400 mt-0.5">
                        {badge.descricao}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] font-medium text-amber-500">+{badge.xp} XP</span>
                        {unlocked && (
                          <span className="text-[10px] text-alice-gray-300">
                            {format(new Date(unlocked.desbloqueadaEm), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
