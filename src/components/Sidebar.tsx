import {
  Home,
  FolderKanban,
  Bookmark,
  Sparkles,
  Compass,
  HelpCircle,
  Settings,
  User,
  Plus,
} from 'lucide-react';
import { NavItemKey } from '../types';

interface SidebarProps {
  activeItem?: NavItemKey;
  onNewProject?: () => void;
  onNavigateHome?: () => void;
}

export function Sidebar({
  activeItem = 'hoje',
  onNewProject,
  onNavigateHome,
}: SidebarProps) {
  return (
    <aside
      id="desktop-sidebar"
      className="hidden min-[900px]:flex flex-col justify-between w-[250px] min-w-[250px] h-screen fixed left-0 top-0 bg-[#FBF9F4] border-r border-[#E3DCCF] p-4 select-none z-30"
    >
      {/* Topo: Marca e Ação principal */}
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 px-2 pt-1 text-left cursor-pointer"
        >
          <div
            id="brand-logo-badge"
            className="w-7 h-7 rounded-[8px] bg-[#173D3A] text-[#FBF9F4] flex items-center justify-center font-serif text-base font-semibold leading-none shadow-xs"
            aria-hidden="true"
          >
            C
          </div>
          <div className="flex flex-col">
            <span
              id="brand-title"
              className="text-[13px] font-bold tracking-[0.06em] text-[#272C2B] uppercase leading-none font-sans"
            >
              COSMO ARCHITECTURE
            </span>
          </div>
        </button>

        {/* Botão + Novo projeto */}
        <button
          id="btn-sidebar-novo-projeto"
          type="button"
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-[10px] bg-[#173D3A] text-[#FBF9F4] hover:bg-[#122e2c] transition-colors text-[13px] font-medium tracking-tight shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo projeto</span>
        </button>

        {/* Navegação Principal */}
        <nav aria-label="Navegação principal" className="flex flex-col gap-1 pt-1">
          {/* Hoje (Ativo) */}
          <button
            id="nav-item-hoje"
            type="button"
            onClick={onNavigateHome}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-[9px] text-[13.5px] font-medium transition-colors cursor-pointer ${
              activeItem === 'hoje'
                ? 'bg-[#E3DCCF]/60 text-[#173D3A] font-semibold'
                : 'text-[#68706A] hover:text-[#272C2B] hover:bg-[#E3DCCF]/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Home className="w-4 h-4 text-[#173D3A]" />
              <span>Hoje</span>
            </div>
          </button>

          {/* Meus projetos */}
          <button
            id="nav-item-meus-projetos"
            type="button"
            className={`w-full flex items-center justify-between px-3 py-2 rounded-[9px] text-[13.5px] font-medium transition-colors cursor-pointer ${
              activeItem === 'meus-projetos'
                ? 'bg-[#E3DCCF]/60 text-[#173D3A] font-semibold'
                : 'text-[#68706A] hover:text-[#272C2B] hover:bg-[#E3DCCF]/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FolderKanban className="w-4 h-4 text-[#68706A]" />
              <span>Meus projetos</span>
            </div>
          </button>

          {/* Referências (Em breve) */}
          <div
            id="nav-item-referencias"
            className="w-full flex items-center justify-between px-3 py-2 rounded-[9px] text-[13.5px] font-medium text-[#68706A]/80 hover:bg-[#E3DCCF]/20 cursor-default"
          >
            <div className="flex items-center gap-2.5">
              <Bookmark className="w-4 h-4 text-[#68706A]/70" />
              <span>Referências</span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#E3DCCF]/50 text-[#68706A]">
              Em breve
            </span>
          </div>

          {/* Assistente COSMO (Em breve) */}
          <div
            id="nav-item-assistente"
            className="w-full flex items-center justify-between px-3 py-2 rounded-[9px] text-[13.5px] font-medium text-[#68706A]/80 hover:bg-[#E3DCCF]/20 cursor-default"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#68706A]/70" />
              <span>Assistente COSMO</span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#E3DCCF]/50 text-[#68706A]">
              Em breve
            </span>
          </div>
        </nav>
      </div>

      {/* Base: Institucional, Ajuda, Configurações e Perfil */}
      <div className="flex flex-col gap-1 border-t border-[#E3DCCF] pt-3">
        <button
          id="nav-base-principios"
          type="button"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[13px] text-[#68706A] hover:text-[#272C2B] hover:bg-[#E3DCCF]/30 transition-colors text-left cursor-pointer"
        >
          <Compass className="w-4 h-4 text-[#68706A]" />
          <span>Princípios THE COSMO</span>
        </button>

        <button
          id="nav-base-ajuda"
          type="button"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[13px] text-[#68706A] hover:text-[#272C2B] hover:bg-[#E3DCCF]/30 transition-colors text-left cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-[#68706A]" />
          <span>Ajuda</span>
        </button>

        <button
          id="nav-base-configuracoes"
          type="button"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[13px] text-[#68706A] hover:text-[#272C2B] hover:bg-[#E3DCCF]/30 transition-colors text-left cursor-pointer"
        >
          <Settings className="w-4 h-4 text-[#68706A]" />
          <span>Configurações</span>
        </button>

        <button
          id="nav-base-perfil"
          type="button"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[13px] text-[#68706A] hover:text-[#272C2B] hover:bg-[#E3DCCF]/30 transition-colors text-left cursor-pointer"
        >
          <User className="w-4 h-4 text-[#68706A]" />
          <span>Perfil</span>
        </button>
      </div>
    </aside>
  );
}
