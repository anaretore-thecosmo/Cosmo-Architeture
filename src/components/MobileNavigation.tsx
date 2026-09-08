import {
  Home,
  FolderKanban,
  Plus,
  Sparkles,
  User,
} from 'lucide-react';

interface MobileNavigationProps {
  activeTab?: 'hoje' | 'projetos' | 'assistente' | 'perfil';
  onNewProject?: () => void;
  onNavigateHome?: () => void;
}

export function MobileNavigation({
  activeTab = 'hoje',
  onNewProject,
  onNavigateHome,
}: MobileNavigationProps) {
  return (
    <nav
      id="mobile-navigation"
      aria-label="Navegação inferior móvel"
      className="flex min-[900px]:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FBF9F4]/95 backdrop-blur-md border-t border-[#E3DCCF] pb-safe"
    >
      <div className="flex items-center justify-around w-full max-w-lg mx-auto px-2 py-1">
        {/* Destino: Hoje */}
        <button
          id="mobile-nav-hoje"
          type="button"
          onClick={onNavigateHome}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-2 py-1 rounded-[8px] transition-colors cursor-pointer ${
            activeTab === 'hoje'
              ? 'text-[#173D3A] font-semibold'
              : 'text-[#68706A] hover:text-[#272C2B]'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'hoje' ? 'text-[#173D3A]' : 'text-[#68706A]'}`} />
          <span className="text-[10.5px] mt-0.5 tracking-tight font-sans">Hoje</span>
        </button>

        {/* Destino: Projetos */}
        <button
          id="mobile-nav-projetos"
          type="button"
          onClick={onNavigateHome}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-2 py-1 rounded-[8px] transition-colors cursor-pointer ${
            activeTab === 'projetos'
              ? 'text-[#173D3A] font-semibold'
              : 'text-[#68706A] hover:text-[#272C2B]'
          }`}
        >
          <FolderKanban className="w-5 h-5 text-[#68706A]" />
          <span className="text-[10.5px] mt-0.5 tracking-tight font-sans">Projetos</span>
        </button>

        {/* Destino Central Destacado: Novo projeto */}
        <div className="flex items-center justify-center px-1">
          <button
            id="mobile-nav-novo-projeto"
            type="button"
            onClick={onNewProject}
            aria-label="Criar novo projeto"
            className="flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-[#173D3A] text-[#FBF9F4] shadow-sm hover:bg-[#122e2c] active:scale-95 transition-all cursor-pointer -mt-3 border-2 border-[#FBF9F4]"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Destino: Assistente */}
        <button
          id="mobile-nav-assistente"
          type="button"
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-2 py-1 rounded-[8px] transition-colors cursor-pointer ${
            activeTab === 'assistente'
              ? 'text-[#173D3A] font-semibold'
              : 'text-[#68706A] hover:text-[#272C2B]'
          }`}
        >
          <Sparkles className="w-5 h-5 text-[#68706A]" />
          <span className="text-[10.5px] mt-0.5 tracking-tight font-sans">Assistente</span>
        </button>

        {/* Destino: Perfil */}
        <button
          id="mobile-nav-perfil"
          type="button"
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-2 py-1 rounded-[8px] transition-colors cursor-pointer ${
            activeTab === 'perfil'
              ? 'text-[#173D3A] font-semibold'
              : 'text-[#68706A] hover:text-[#272C2B]'
          }`}
        >
          <User className="w-5 h-5 text-[#68706A]" />
          <span className="text-[10.5px] mt-0.5 tracking-tight font-sans">Perfil</span>
        </button>
      </div>
    </nav>
  );
}
