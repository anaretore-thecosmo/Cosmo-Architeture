import { CheckCircle2, HelpCircle, Settings, User } from 'lucide-react';

export function DesktopHeader() {
  return (
    <header
      id="desktop-header"
      className="hidden min-[900px]:flex items-center justify-between h-14 px-8 border-b border-[#E3DCCF] bg-[#F3F0E9]/80 backdrop-blur-xs sticky top-0 z-20"
    >
      {/* Lado esquerdo: Contexto da visão atual e estado */}
      <div className="flex items-center gap-3.5">
        <h1 className="text-base font-semibold text-[#272C2B] tracking-tight font-sans">
          Hoje
        </h1>

        <div className="h-3.5 w-px bg-[#E3DCCF]" aria-hidden="true" />

        <div
          id="status-salvo-localmente"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#E3DCCF]/45 text-[#68706A] text-[11.5px] font-mono tracking-tight"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-[#173D3A]" />
          <span>Salvo localmente</span>
        </div>
      </div>

      {/* Lado direito: Ações de apoio (Ajuda, Configurações, Perfil) */}
      <div className="flex items-center gap-1.5">
        <button
          id="btn-header-ajuda"
          type="button"
          aria-label="Ajuda"
          className="p-2 rounded-[8px] text-[#68706A] hover:text-[#272C2B] hover:bg-[#E3DCCF]/50 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          id="btn-header-configuracoes"
          type="button"
          aria-label="Configurações"
          className="p-2 rounded-[8px] text-[#68706A] hover:text-[#272C2B] hover:bg-[#E3DCCF]/50 transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-[#E3DCCF] mx-1" aria-hidden="true" />

        <button
          id="btn-header-perfil"
          type="button"
          aria-label="Perfil"
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-[8px] text-[#272C2B] hover:bg-[#E3DCCF]/50 transition-colors cursor-pointer text-[13px] font-medium"
        >
          <div className="w-6 h-6 rounded-full bg-[#E3DCCF] text-[#173D3A] flex items-center justify-center">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="text-[13px] text-[#272C2B]">Perfil</span>
        </button>
      </div>
    </header>
  );
}
