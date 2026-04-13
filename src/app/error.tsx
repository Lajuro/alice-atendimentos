"use client";

import { useEffect, useState } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: Readonly<{
  error: Error & { digest?: string };
  unstable_retry: () => void;
}>) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      unstable_retry();
    }, 400);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        {/* Warning icon */}
        <div className="mb-5 flex items-center justify-center w-14 h-14 rounded-full bg-alice-primary/10">
          <svg className="w-7 h-7 text-alice-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-foreground mb-2">
          Algo deu errado
        </h1>
        <p className="text-sm text-alice-gray-400 mb-2 leading-relaxed">
          Um erro inesperado aconteceu. Seus dados estão seguros.
        </p>

        {error.digest && (
          <p className="text-xs text-alice-gray-300 mb-6 font-mono">
            Código: {error.digest}
          </p>
        )}
        {!error.digest && <div className="mb-6" />}

        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-alice-primary text-white text-sm font-medium hover:bg-alice-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg
            className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {retrying ? "Tentando…" : "Tentar novamente"}
        </button>

        <a
          href="/"
          className="mt-3 text-sm text-alice-primary hover:text-alice-primary-dark transition-colors font-medium"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}
