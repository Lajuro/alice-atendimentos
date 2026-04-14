"use client";

import { useState, useEffect, useCallback } from "react";
import { TipoAtendimento, RegistroAtendimento, Configuracao } from "@/lib/types";
import {
  getTipos,
  salvarTipos,
  getRegistros,
  salvarRegistros,
  adicionarRegistro,
  removerRegistro as removerRegistroStorage,
  atualizarNota as atualizarNotaStorage,
  getConfig,
  salvarConfig as salvarConfigStorage,
  initStorage,
} from "@/lib/storage";
import { gerarDadosExemplo } from "@/lib/seed";

export function useAtendimentos() {
  const [tipos, setTipos] = useState<TipoAtendimento[]>([]);
  const [registros, setRegistros] = useState<RegistroAtendimento[]>([]);
  const [config, setConfig] = useState<Configuracao>({ horaInicio: 12, horaFim: 21 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Initialize IDB storage (async, non-blocking — data loads from localStorage meanwhile)
    initStorage().then(() => {
      // After IDB is ready, refresh to pick up any IDB-only data
      setRegistros(getRegistros());
      setTipos(getTipos());
      setConfig(getConfig());
    }).catch(() => {});

    let regs = getRegistros();
    if (regs.length === 0 && process.env.NEXT_PUBLIC_SEED_FAKE === "true") {
      regs = gerarDadosExemplo();
      salvarRegistros(regs);
    }
    setTipos(getTipos());
    setRegistros(regs);
    setConfig(getConfig());
    setLoaded(true);
  }, []);

  const refresh = useCallback(() => {
    setRegistros(getRegistros());
    setTipos(getTipos());
    setConfig(getConfig());
  }, []);

  // Listen for data changes from other hook instances / components
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("atendimentos-updated", handler);
    return () => window.removeEventListener("atendimentos-updated", handler);
  }, [refresh]);

  const notify = useCallback(() => {
    window.dispatchEvent(new Event("atendimentos-updated"));
  }, []);

  const registrar = useCallback(
    (tipoId: string, nota?: string) => {
      adicionarRegistro(tipoId, nota);
      refresh();
      notify();
    },
    [refresh, notify]
  );

  const removerRegistro = useCallback(
    (id: string) => {
      removerRegistroStorage(id);
      refresh();
      notify();
    },
    [refresh, notify]
  );

  const atualizarNota = useCallback(
    (id: string, nota: string) => {
      atualizarNotaStorage(id, nota);
      refresh();
      notify();
    },
    [refresh, notify]
  );

  const atualizarTipos = useCallback(
    (novosTipos: TipoAtendimento[]) => {
      salvarTipos(novosTipos);
      refresh();
      notify();
    },
    [refresh, notify]
  );

  const salvarConfig = useCallback(
    (novaConfig: Configuracao) => {
      salvarConfigStorage(novaConfig);
      setConfig(novaConfig);
      notify();
    },
    [notify]
  );

  const horasTrabalho = Array.from(
    { length: config.horaFim - config.horaInicio + 1 },
    (_, i) => i + config.horaInicio
  );

  return { tipos, registros, config, horasTrabalho, loaded, registrar, removerRegistro, atualizarNota, atualizarTipos, salvarConfig, refresh };
}
