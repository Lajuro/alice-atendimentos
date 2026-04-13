"use client";

import { useState, useRef } from "react";
import {
  exportarBackup,
  validarBackup,
  restaurarBackup,
  limparTodosOsDados,
  getRegistros,
  getUltimoBackup,
} from "@/lib/storage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DadosPage() {
  const [status, setStatus] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [confirmandoReset, setConfirmandoReset] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState("");
  const [confirmandoRestauro, setConfirmandoRestauro] = useState(false);
  const [backupPendente, setBackupPendente] = useState<ReturnType<typeof exportarBackup> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalRegistros = getRegistros().length;
  const ultimoBackup = getUltimoBackup();

  const handleExportar = () => {
    try {
      const backup = exportarBackup();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dataStr = format(new Date(), "yyyy-MM-dd_HH-mm");
      a.href = url;
      a.download = `backup-${dataStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ tipo: "sucesso", msg: "Backup exportado com sucesso!" });
    } catch {
      setStatus({ tipo: "erro", msg: "Erro ao exportar backup." });
    }
  };

  const handleArquivoSelecionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be selected again
    e.target.value = "";

    if (!file.name.endsWith(".json")) {
      setStatus({ tipo: "erro", msg: "O arquivo precisa ser um .json" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!validarBackup(parsed)) {
          setStatus({ tipo: "erro", msg: "Arquivo inválido. Não parece ser um backup deste painel." });
          return;
        }
        setBackupPendente(parsed);
        setConfirmandoRestauro(true);
        setStatus(null);
      } catch {
        setStatus({ tipo: "erro", msg: "Erro ao ler o arquivo. Verifique se é um JSON válido." });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmarRestauro = () => {
    if (!backupPendente) return;
    try {
      restaurarBackup(backupPendente);
      setStatus({
        tipo: "sucesso",
        msg: `Backup restaurado! ${backupPendente.registros.length} registros, ${backupPendente.tipos.length} tipos.`,
      });
      setConfirmandoRestauro(false);
      setBackupPendente(null);
    } catch {
      setStatus({ tipo: "erro", msg: "Erro ao restaurar backup." });
    }
  };

  const handleReset = () => {
    if (textoConfirmacao !== "APAGAR") return;
    limparTodosOsDados();
    setConfirmandoReset(false);
    setTextoConfirmacao("");
    setStatus({ tipo: "sucesso", msg: "Todos os dados foram apagados. Recarregue a página." });
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 sm:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Meus Dados</h2>
        <p className="text-alice-gray-400 text-xs sm:text-sm mt-1">
          Exporte, restaure ou limpe seus dados
        </p>
      </div>

      {/* Status toast */}
      {status && (
        <div
          className={`rounded-xl p-4 text-sm font-medium ${
            status.tipo === "sucesso"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {status.msg}
        </div>
      )}

      {/* Resumo */}
      <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5">
        <h3 className="font-semibold text-sm mb-3">Resumo dos dados</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-alice-gray-50 p-3 rounded-lg">
            <p className="text-alice-gray-400 text-xs">Total de registros</p>
            <p className="text-lg font-bold text-foreground">{totalRegistros}</p>
          </div>
          <div className="bg-alice-gray-50 p-3 rounded-lg">
            <p className="text-alice-gray-400 text-xs">Último backup</p>
            <p className="text-sm font-bold text-foreground">
              {ultimoBackup
                ? format(new Date(ultimoBackup), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : "Nunca"}
            </p>
          </div>
        </div>
      </div>

      {/* Exportar */}
      <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <DownloadIcon className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Exportar Backup</h3>
            <p className="text-alice-gray-400 text-xs mt-0.5">
              Baixa um arquivo .json com todos os seus dados (tipos, registros, perfil, almoços e configurações).
            </p>
          </div>
        </div>
        <button
          onClick={handleExportar}
          className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Exportar backup (.json)
        </button>
      </div>

      {/* Importar */}
      <div className="bg-card border border-alice-gray-100 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <UploadIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Restaurar Backup</h3>
            <p className="text-alice-gray-400 text-xs mt-0.5">
              Substitui todos os dados atuais pelo conteúdo do arquivo de backup.
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          onChange={handleArquivoSelecionado}
          className="hidden"
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Selecionar arquivo de backup
        </button>

        {/* Confirmação de restauro */}
        {confirmandoRestauro && backupPendente && (
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-amber-800">
              Backup encontrado
            </p>
            <div className="text-xs text-amber-700 space-y-1">
              <p>Exportado em: {format(new Date(backupPendente.dataExportacao), "dd/MM/yyyy HH:mm")}</p>
              <p>{backupPendente.registros.length} registros, {backupPendente.tipos.length} tipos</p>
            </div>
            <p className="text-xs text-amber-800 font-medium">
              Isso vai substituir TODOS os seus dados atuais. Deseja continuar?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmarRestauro}
                className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
              >
                Sim, restaurar
              </button>
              <button
                onClick={() => { setConfirmandoRestauro(false); setBackupPendente(null); }}
                className="flex-1 px-3 py-2 bg-card border border-alice-gray-200 text-alice-gray-500 rounded-lg text-xs hover:bg-alice-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="bg-card border border-red-100 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <TrashIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-red-700">Apagar Todos os Dados</h3>
            <p className="text-alice-gray-400 text-xs mt-0.5">
              Remove permanentemente todos os dados do app. Essa ação não pode ser desfeita.
            </p>
          </div>
        </div>

        {!confirmandoReset ? (
          <button
            onClick={() => setConfirmandoReset(true)}
            className="w-full px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Apagar todos os dados...
          </button>
        ) : (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
            <p className="text-xs text-red-700 font-medium">
              Digite <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded">APAGAR</span> para confirmar:
            </p>
            <input
              type="text"
              value={textoConfirmacao}
              onChange={(e) => setTextoConfirmacao(e.target.value)}
              placeholder="APAGAR"
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                disabled={textoConfirmacao !== "APAGAR"}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar exclusão
              </button>
              <button
                onClick={() => { setConfirmandoReset(false); setTextoConfirmacao(""); }}
                className="flex-1 px-3 py-2 bg-card border border-alice-gray-200 text-alice-gray-500 rounded-lg text-xs hover:bg-alice-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
