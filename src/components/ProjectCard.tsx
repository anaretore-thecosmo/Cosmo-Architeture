import React from 'react';
import { Calendar, FileText, Compass, Sparkles, ArrowRight, FolderKanban } from 'lucide-react';
import { Project } from '../domain/project/types';

interface ProjectCardProps {
  key?: React.Key;
  project: Project;
  onOpen: (project: Project) => void;
}

export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'residential':
        return 'Residencial';
      case 'commercial':
        return 'Comercial';
      case 'other':
        return 'Outros espaços';
      default:
        return cat;
    }
  };

  const getStartingPointBadge = (sp: string) => {
    switch (sp) {
      case 'existing_plan':
        return {
          label: 'Planta ou arquivos',
          icon: <FileText className="w-3.5 h-3.5 text-[#173D3A]" />,
        };
      case 'idea':
        return {
          label: 'Ideia em texto',
          icon: <Sparkles className="w-3.5 h-3.5 text-[#173D3A]" />,
        };
      case 'feng_shui':
        return {
          label: 'Estudo Feng Shui',
          icon: <Compass className="w-3.5 h-3.5 text-[#B59A63]" />,
        };
      default:
        return {
          label: sp,
          icon: <FolderKanban className="w-3.5 h-3.5 text-[#68706A]" />,
        };
    }
  };

  const startingInfo = getStartingPointBadge(project.startingPoint);

  const formattedDate = new Date(project.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      id={`project-card-${project.id}`}
      className="p-4 sm:p-5 rounded-[14px] bg-[#FBF9F4] border border-[#E3DCCF] hover:border-[#173D3A]/40 transition-all flex flex-col justify-between gap-4 group shadow-xs"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E3DCCF]/40 border border-[#E3DCCF] text-[11px] sm:text-[11.5px] font-medium text-[#272C2B]">
            {startingInfo.icon}
            <span>{startingInfo.label}</span>
          </div>

          <span className="text-[11px] sm:text-[11.5px] px-2 py-0.5 rounded-md bg-[#F2EDE4] font-medium text-[#68706A]">
            Rascunho
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-[15.5px] sm:text-[16.5px] font-semibold text-[#272C2B] group-hover:text-[#173D3A] transition-colors leading-snug">
            {project.name}
          </h3>
          <p className="text-[12.5px] sm:text-[13px] text-[#68706A]">
            {getCategoryLabel(project.category)} • {project.subtype}
          </p>
        </div>

        {project.brief.goals && project.brief.goals.length > 0 && (
          <p className="text-[12px] sm:text-[12.5px] text-[#68706A] line-clamp-2 italic bg-[#F2EDE4]/60 p-2.5 rounded-[8px] border border-[#E3DCCF]/60">
            "{project.brief.goals[0]}"
          </p>
        )}

        {project.files && project.files.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#68706A]">
            <FileText className="w-3.5 h-3.5 text-[#173D3A]" />
            <span>{project.files.length} arquivo(s) anexado(s)</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#E3DCCF]/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-[11px] text-[#68706A]">
          <Calendar className="w-3 h-3" />
          <span>Atualizado em {formattedDate}</span>
        </div>

        <button
          id={`btn-continue-${project.id}`}
          type="button"
          onClick={() => onOpen(project)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#173D3A] text-white text-[12.5px] font-medium hover:bg-[#122F2D] transition-colors"
        >
          <span>Continuar projeto</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
