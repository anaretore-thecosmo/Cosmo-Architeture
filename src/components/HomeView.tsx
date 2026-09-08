import { useEffect, useState } from 'react';
import { FileUp, Lightbulb, Compass, FolderClosed, ArrowRight } from 'lucide-react';
import { Project, StartingPoint } from '../domain/project/types';
import { ProjectStore } from '../services/storage/projectStore';
import { ProjectCard } from './ProjectCard';

interface HomeViewProps {
  onStartOnboarding: (startingPoint?: StartingPoint | null) => void;
  onOpenProject: (project: Project) => void;
  refreshTrigger?: number;
}

export function HomeView({
  onStartOnboarding,
  onOpenProject,
  refreshTrigger = 0,
}: HomeViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      try {
        const store = new ProjectStore();
        const all = await store.getAllProjects();
        setProjects(all);
      } catch (err) {
        console.error('Falha ao carregar projetos do armazenamento local:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [refreshTrigger]);

  return (
    <div
      id="home-view-container"
      className="max-w-4xl w-full mx-auto space-y-5 sm:space-y-6 md:space-y-8"
    >
      {/* Bloco de Saudação / Título Inicial */}
      <section id="home-intro" className="space-y-1.5 pt-1">
        <h2 className="text-[34px] sm:text-[36px] md:text-[32px] font-normal text-[#272C2B] tracking-tight font-serif leading-[1.12]">
          O que você quer criar hoje?
        </h2>
        <p className="text-[14px] sm:text-[14.5px] text-[#68706A] leading-relaxed max-w-xl font-sans">
          Comece com uma planta, um projeto existente ou apenas uma ideia.
        </p>
      </section>

      {/* Entradas Principais de Criação */}
      <section id="home-creation-entries" className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
          {/* Opção 1: Já tenho planta ou projeto */}
          <div
            id="card-entry-planta-existente"
            className="flex flex-col justify-between p-[18px] sm:p-5 rounded-[12px] bg-[#FBF9F4] border border-[#E3DCCF] hover:border-[#68706A]/40 transition-all shadow-xs"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-[10px] bg-[#E3DCCF]/50 text-[#173D3A] flex items-center justify-center">
                <FileUp className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[15px] sm:text-base font-semibold text-[#272C2B] font-sans">
                  Já tenho planta ou projeto
                </h3>
                <p className="text-[13px] sm:text-[13.5px] text-[#68706A] leading-relaxed font-sans line-clamp-2">
                  Envie o que você já possui e organize o próximo passo.
                </p>
              </div>
            </div>

            <div className="pt-3.5">
              <button
                id="btn-enviar-meu-projeto"
                type="button"
                onClick={() => onStartOnboarding('existing_plan')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#173D3A] text-[#FBF9F4] text-[13px] font-medium hover:bg-[#122e2c] transition-colors cursor-pointer w-fit"
              >
                <span>Enviar meu projeto</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Opção 2: Ainda não tenho planta */}
          <div
            id="card-entry-sem-planta"
            className="flex flex-col justify-between p-[18px] sm:p-5 rounded-[12px] bg-[#FBF9F4] border border-[#E3DCCF] hover:border-[#68706A]/40 transition-all shadow-xs"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-[10px] bg-[#E3DCCF]/50 text-[#B66F52] flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[15px] sm:text-base font-semibold text-[#272C2B] font-sans">
                  Ainda não tenho planta
                </h3>
                <p className="text-[13px] sm:text-[13.5px] text-[#68706A] leading-relaxed font-sans line-clamp-2">
                  Conte sua ideia por texto, áudio, imagens ou referências.
                </p>
              </div>
            </div>

            <div className="pt-3.5">
              <button
                id="btn-contar-minha-ideia"
                type="button"
                onClick={() => onStartOnboarding('idea')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#173D3A] text-[#FBF9F4] text-[13px] font-medium hover:bg-[#122e2c] transition-colors cursor-pointer w-fit"
              >
                <span>Contar minha ideia</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Opção 3 Compacta: Começar pelo Feng Shui */}
        <div
          id="card-entry-feng-shui"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-[12px] bg-[#FBF9F4] border border-[#E3DCCF] hover:border-[#68706A]/40 transition-all shadow-xs"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[10px] bg-[#E3DCCF]/50 text-[#B59A63] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-[14px] sm:text-[14.5px] font-semibold text-[#272C2B] font-sans whitespace-normal">
                Começar pelo Feng Shui
              </h3>
              <p className="text-[12.5px] sm:text-[13px] text-[#68706A] leading-snug font-sans">
                Comece considerando o espaço, as pessoas e sua orientação.
              </p>
            </div>
          </div>

          <div className="shrink-0 pl-[52px] sm:pl-0">
            <button
              id="btn-iniciar-estudo"
              type="button"
              onClick={() => onStartOnboarding('feng_shui')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-[#272C2B]/20 bg-transparent hover:bg-[#E3DCCF]/40 text-[#272C2B] text-[12.5px] font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Iniciar estudo</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Seção: Seus projetos com persistência real */}
      <section id="section-seus-projetos" className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] sm:text-base font-semibold text-[#272C2B] font-sans">
            Seus projetos
          </h3>
          {projects.length > 0 && (
            <span className="text-[12px] text-[#68706A] font-medium">
              {projects.length} projeto{projects.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-[13px] text-[#68706A]">
            Carregando projetos...
          </div>
        ) : projects.length === 0 ? (
          /* Estado vazio compacto */
          <div
            id="empty-state-projetos"
            className="flex flex-col items-center justify-center text-center p-5 sm:p-6 rounded-[12px] border border-dashed border-[#E3DCCF] bg-[#FBF9F4]/60 space-y-1.5"
          >
            <div className="w-8 h-8 rounded-[8px] bg-[#E3DCCF]/40 text-[#68706A] flex items-center justify-center">
              <FolderClosed className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 max-w-sm">
              <p className="text-[13.5px] font-medium text-[#272C2B] font-sans">
                Você ainda não criou nenhum projeto.
              </p>
              <p className="text-[12.5px] text-[#68706A] font-sans">
                Quando começar, seus projetos aparecerão aqui.
              </p>
            </div>
          </div>
        ) : (
          /* Lista de Projetos Reais */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {projects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                onOpen={onOpenProject}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
