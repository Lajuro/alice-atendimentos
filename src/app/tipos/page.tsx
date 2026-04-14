"use client";

import { useAtendimentos } from "@/hooks/useAtendimentos";
import { TipoAtendimento } from "@/lib/types";
import { getMeta, salvarMeta, getNotificacoesConfig, salvarNotificacoesConfig } from "@/lib/storage";
import { pedirPermissao, getPermissaoAtual } from "@/lib/notifications";
import { useState, useEffect } from "react";
import { Target, Sparkles, Bell } from "lucide-react";
import type { NotificacoesConfig } from "@/lib/types";
import { Select } from "@/components/ui/Select";
import { NumberInput } from "@/components/ui/NumberInput";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { getIntroHabilitada, salvarIntroHabilitada } from "@/lib/storage";

export default function ConfiguracoesPage() {
  const { tipos, config, atualizarTipos, salvarConfig, loaded } = useAtendimentos();
  const [editando, setEditando] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#BE0380");
  const [showNovo, setShowNovo] = useState(false);

  const [horaInicio, setHoraInicio] = useState(config.horaInicio);
  const [horaFim, setHoraFim] = useState(config.horaFim);
  const [metaDiaria, setMetaDiaria] = useState(0);
  const [introHabilitada, setIntroHabilitada] = useState(true);
  const [notifConfig, setNotifConfig] = useState<NotificacoesConfig>({ habilitadas: false, lembretePausa: true, metaDiaria: true, backupPendente: true });
  const [notifPermissao, setNotifPermissao] = useState<NotificationPermission>("default");

  useEffect(() => {
    setHoraInicio(config.horaInicio);
    setHoraFim(config.horaFim);
  }, [config.horaInicio, config.horaFim]);

  useEffect(() => {
    setMetaDiaria(getMeta().metaDiaria);
    setIntroHabilitada(getIntroHabilitada());
    setNotifConfig(getNotificacoesConfig());
    setNotifPermissao(getPermissaoAtual());
  }, []);

  if (!loaded) return null;

  const handleAdicionar = () => {
    if (!novoNome.trim()) return;
    const novo: TipoAtendimento = {
      id: novoNome.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
      nome: novoNome.trim(),
      cor: novaCor,
    };
    atualizarTipos([...tipos, novo]);
    setNovoNome("");
    setNovaCor("#BE0380");
    setShowNovo(false);
  };

  const handleEditar = (id: string, nome: string, cor: string) => {
    atualizarTipos(tipos.map((t) => (t.id === id ? { ...t, nome, cor } : t)));
    setEditando(null);
  };

  const handleRemover = (id: string) => {
    if (!confirm("Remover este tipo de atendimento? Os registros existentes serão mantidos.")) return;
    atualizarTipos(tipos.filter((t) => t.id !== id));
  };

  const handleSalvarHorario = () => {
    if (horaInicio >= horaFim) return;
    salvarConfig({ horaInicio, horaFim });
  };

  const horarioAlterado = horaInicio !== config.horaInicio || horaFim !== config.horaFim;

  const metaOriginal = getMeta().metaDiaria;
  const metaAlterada = metaDiaria !== metaOriginal;

  const handleSalvarMeta = () => {
    salvarMeta({ metaDiaria });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Configurações</h1>
        <p className="text-alice-gray-400 text-xs sm:text-sm mt-1">
          Gerencie horário de trabalho, meta diária e tipos de atendimento
        </p>
      </div>

      {/* Configuração de horário */}
      <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold">Horário de Trabalho</h2>
          <p className="text-alice-gray-400 text-xs sm:text-sm mt-0.5">
            Configure o intervalo de horas exibido nos gráficos e relatórios
          </p>
        </div>
        <div className="flex items-end gap-3 sm:gap-4 flex-wrap">
          <div className="flex-1 min-w-25">
            <label htmlFor="hora-inicio" className="block text-xs text-alice-gray-400 mb-1">Início</label>
            <Select
              id="hora-inicio"
              value={String(horaInicio)}
              onChange={(v) => setHoraInicio(Number(v))}
              options={Array.from({ length: 24 }, (_, i) => ({
                value: String(i),
                label: `${String(i).padStart(2, "0")}:00`,
              }))}
            />
          </div>
          <div className="flex-1 min-w-25">
            <label htmlFor="hora-fim" className="block text-xs text-alice-gray-400 mb-1">Fim</label>
            <Select
              id="hora-fim"
              value={String(horaFim)}
              onChange={(v) => setHoraFim(Number(v))}
              options={Array.from({ length: 24 }, (_, i) => ({
                value: String(i),
                label: `${String(i).padStart(2, "0")}:00`,
              }))}
            />
          </div>
          <button
            onClick={handleSalvarHorario}
            disabled={!horarioAlterado || horaInicio >= horaFim}
            className="px-4 py-2.5 bg-alice-primary text-white rounded-lg text-sm font-medium hover:bg-alice-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Salvar
          </button>
        </div>
        {horaInicio >= horaFim && (
          <p className="text-xs text-red-500">O horário de início deve ser menor que o de fim</p>
        )}
        <p className="text-[10px] sm:text-xs text-alice-gray-300">
          Atualmente: {String(config.horaInicio).padStart(2, "0")}:00 às {String(config.horaFim).padStart(2, "0")}:00
        </p>
      </div>

      {/* Meta diária */}
      <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold inline-flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            Meta Diária
          </h2>
          <p className="text-alice-gray-400 text-xs sm:text-sm mt-0.5">
            Defina quantos atendimentos deseja fazer por dia. Use 0 para desativar.
          </p>
        </div>
        <div className="flex items-end gap-3 sm:gap-4 flex-wrap">
          <div className="flex-1 min-w-25">
            <label htmlFor="meta-diaria" className="block text-xs text-alice-gray-400 mb-1">Atendimentos/dia</label>
            <NumberInput
              id="meta-diaria"
              value={metaDiaria}
              onChange={setMetaDiaria}
              min={0}
              max={200}
            />
          </div>
          <button
            onClick={handleSalvarMeta}
            disabled={!metaAlterada}
            className="px-4 py-2.5 bg-alice-primary text-white rounded-lg text-sm font-medium hover:bg-alice-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Salvar
          </button>
        </div>
        {metaDiaria > 0 && (
          <p className="text-[10px] sm:text-xs text-alice-gray-300">
            Meta atual: {metaOriginal} atendimentos/dia
          </p>
        )}
      </div>

      {/* Preferências */}
      <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold inline-flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Preferências
          </h2>
          <p className="text-alice-gray-400 text-xs sm:text-sm mt-0.5">
            Personalize o comportamento do aplicativo
          </p>
        </div>
        <label className="flex items-center justify-between gap-3 cursor-pointer group">
          <div>
            <span className="text-sm font-medium">Tela de boas-vindas</span>
            <p className="text-[10px] sm:text-xs text-alice-gray-300 mt-0.5">
              Exibir saudação animada ao abrir o aplicativo
            </p>
          </div>
          <button
            role="switch"
            aria-checked={introHabilitada}
            onClick={() => {
              const next = !introHabilitada;
              setIntroHabilitada(next);
              salvarIntroHabilitada(next);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              introHabilitada ? "bg-alice-primary" : "bg-alice-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${
                introHabilitada ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Notificações */}
      <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold inline-flex items-center gap-1.5">
            <Bell className="w-4 h-4" />
            Notificações
          </h2>
          <p className="text-alice-gray-400 text-xs sm:text-sm mt-0.5">
            Receba lembretes e alertas sobre metas e pausas
          </p>
        </div>
        {notifPermissao === "denied" && (
          <p className="text-xs text-red-500">
            Notificações estão bloqueadas no navegador. Permita nas configurações do site para usar este recurso.
          </p>
        )}
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <span className="text-sm font-medium">Ativar notificações</span>
            <p className="text-[10px] sm:text-xs text-alice-gray-300 mt-0.5">
              Permite enviar avisos locais (nenhum dado sai do dispositivo)
            </p>
          </div>
          <button
            role="switch"
            aria-checked={notifConfig.habilitadas}
            onClick={async () => {
              const next = !notifConfig.habilitadas;
              if (next && notifPermissao !== "granted") {
                const perm = await pedirPermissao();
                setNotifPermissao(perm);
                if (perm !== "granted") return;
              }
              const updated = { ...notifConfig, habilitadas: next };
              setNotifConfig(updated);
              salvarNotificacoesConfig(updated);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              notifConfig.habilitadas ? "bg-alice-primary" : "bg-alice-gray-200"
            }`}
          >
            <span className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${notifConfig.habilitadas ? "translate-x-5.5" : "translate-x-0.5"}`} />
          </button>
        </label>
        {notifConfig.habilitadas && (
          <>
            {([
              { key: "lembretePausa" as const, label: "Lembrete de pausa", desc: "Aviso na hora do almoço/janta configurada" },
              { key: "metaDiaria" as const, label: "Progresso da meta", desc: "Notifica quando está perto e quando bate a meta" },
              { key: "backupPendente" as const, label: "Backup pendente", desc: "Alerta semanal se não fez backup dos dados" },
            ]).map(({ key, label, desc }) => (
              <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <span className="text-sm font-medium">{label}</span>
                  <p className="text-[10px] sm:text-xs text-alice-gray-300 mt-0.5">{desc}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={notifConfig[key]}
                  onClick={() => {
                    const updated = { ...notifConfig, [key]: !notifConfig[key] };
                    setNotifConfig(updated);
                    salvarNotificacoesConfig(updated);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    notifConfig[key] ? "bg-alice-primary" : "bg-alice-gray-200"
                  }`}
                >
                  <span className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${notifConfig[key] ? "translate-x-5.5" : "translate-x-0.5"}`} />
                </button>
              </label>
            ))}
          </>
        )}
      </div>

      {/* Tipos de atendimento */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Tipos de Atendimento</h2>
          <p className="text-alice-gray-400 text-xs sm:text-sm mt-1">Adicione, edite ou remova tipos</p>
        </div>
        <button
          onClick={() => setShowNovo(true)}
          className="px-3 sm:px-4 py-2 bg-alice-primary text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-alice-primary-dark transition-colors"
        >
          + Novo tipo
        </button>
      </div>

      {/* Formulário novo tipo */}
      {showNovo && (
        <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-xs sm:text-sm">Novo tipo de atendimento</h3>
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do tipo"
              className="flex-1 px-3 sm:px-4 py-2 border border-alice-gray-200 rounded-lg text-sm focus:outline-none focus:border-alice-primary"
              onKeyDown={(e) => e.key === "Enter" && handleAdicionar()}
            />
            <ColorPicker value={novaCor} onChange={setNovaCor} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdicionar}
              className="px-4 py-2 bg-alice-primary text-white rounded-lg text-sm font-medium hover:bg-alice-primary-dark transition-colors"
            >
              Adicionar
            </button>
            <button
              onClick={() => { setShowNovo(false); setNovoNome(""); }}
              className="px-4 py-2 bg-alice-gray-100 text-alice-gray-500 rounded-lg text-sm hover:bg-alice-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de tipos */}
      <div className="space-y-2 sm:space-y-3">
        {tipos.map((tipo) => (
          <div
            key={tipo.id}
            className="bg-card border border-alice-gray-100 rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4"
          >
            {editando === tipo.id ? (
              <EditForm
                tipo={tipo}
                onSave={(nome, cor) => handleEditar(tipo.id, nome, cor)}
                onCancel={() => setEditando(null)}
              />
            ) : (
              <>
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: tipo.cor }} />
                <span className="flex-1 font-medium text-xs sm:text-sm truncate">{tipo.nome}</span>
                <button
                  onClick={() => setEditando(tipo.id)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs text-alice-gray-500 bg-alice-gray-50 rounded-lg hover:bg-alice-gray-100 transition-colors shrink-0"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleRemover(tipo.id)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors shrink-0"
                >
                  Remover
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditForm({
  tipo,
  onSave,
  onCancel,
}: {
  tipo: TipoAtendimento;
  onSave: (nome: string, cor: string) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(tipo.nome);
  const [cor, setCor] = useState(tipo.cor);

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-1 flex-wrap">
      <ColorPicker value={cor} onChange={setCor} size="sm" />
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="flex-1 min-w-25 px-3 py-1.5 border border-alice-gray-200 rounded-lg text-sm focus:outline-none focus:border-alice-primary"
        onKeyDown={(e) => e.key === "Enter" && onSave(nome, cor)}
      />
      <button
        onClick={() => onSave(nome, cor)}
        className="px-3 py-1.5 text-xs text-white bg-alice-primary rounded-lg hover:bg-alice-primary-dark transition-colors"
      >
        Salvar
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-xs text-alice-gray-500 bg-alice-gray-50 rounded-lg hover:bg-alice-gray-100 transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}
