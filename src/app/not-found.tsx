import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center px-6 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center text-center max-w-sm">
        <span className="text-8xl font-black tracking-tight text-alice-primary mb-4">
          404
        </span>

        <h1 className="text-xl font-semibold text-foreground mb-2">
          Página não encontrada
        </h1>
        <p className="text-sm text-alice-gray-400 mb-8 leading-relaxed">
          O endereço acessado não existe ou foi movido.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-alice-primary text-white text-sm font-medium hover:bg-alice-primary-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
