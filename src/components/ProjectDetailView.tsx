import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  FileText,
  FolderKanban,
  Compass,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  Volume2,
  ExternalLink,
} from 'lucide-react';
import { Project } from '../domain/project/types';
import { FileStorageService } from '../services/storage/fileStorage';

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
}

export function ProjectDetailView({ project, onBack }: ProjectDetailViewProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const fileService = new FileStorageService();

  useEffect(() => {
    const visualRefs = project.brief?.visualReferences || [];
    if (visualRefs.length > 0) {
      const load = async () => {
        for (const ref of visualRefs) {
          if (!thumbnails[ref.fileId]) {
            try {
              const record = await fileService.getFileBinary(ref.fileId);
              if (record && record.content) {
                const blob =
                  record.content instanceof Blob
                    ? record.content
                    : new Blob([record.content], { type: ref.mimeType });
                const url = URL.createObjectURL(blob);
                setThumbnails((prev) => ({ ...prev, [ref.fileId]: url }));
              }
            } catch {
              // Ignore
            }
          }
        }
      };
      load();
    }
  }, [project]);

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

  const getStartingLabel = (sp: string) => {
    switch (sp) {
      case 'existing_plan':
        return 'Já tenho planta ou arquivos';
      case 'idea':
        return 'Quero contar minha ideia';
      case 'feng_shui':
        return 'Quero começar pelo Feng Shui';
      default:
        return sp;
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const brief = project.brief;
  const hasBriefingText = Boolean(brief?.briefingText?.trim() || (brief?.goals && brief.goals[0]?.trim()));
  const briefingTextContent = brief?.briefingText?.trim() || brief?.goals?.[0]?.trim() || '';
  const documents = brief?.documents || [];
  const visualReferences = brief?.visualReferences || [];
  const audios = brief?.audios || [];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top action */}
      <div className="flex items-center justify-between gap-4">
        <button
          id="btn-back-to-home"
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-[#FBF9F4] border border-[#E3DCCF] text-[#272C2B] text-[13.5px] font-medium hover:bg-[#F2EDE4] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Home</span>
        </button>

        <span className="px-3 py-1 rounded-full bg-[#173D3A]/10 border border-[#173D3A]/20 text-[#173D3A] text-[12px] font-semibold">
          Status: Rascunho
        </span>
      </div>

      {/* Header card */}
      <div className="p-5 sm:p-6 rounded-[16px] bg-[#FBF9F4] border border-[#E3DCCF] space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[12.5px] text-[#68706A]">
            <span>{getCategoryLabel(project.category)}</span>
            <span>•</span>
            <span className="font-medium text-[#272C2B]">{project.subtype}</span>
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-serif text-[#272C2B] tracking-tight">
            {project.name}
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[12.5px] text-[#68706A]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#173D3A]" />
            <span>Criado em: {formatDateTime(project.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#173D3A]" />
            <span>Última atualização: {formatDateTime(project.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Starting point information */}
      <div className="p-5 sm:p-6 rounded-[16px] bg-[#FBF9F4] border border-[#E3DCCF] space-y-4">
        <h2 className="text-[15px] font-semibold text-[#272C2B] flex items-center gap-2">
          {project.startingPoint === 'existing_plan' && <FileText className="w-4 h-4 text-[#173D3A]" />}
          {project.startingPoint === 'idea' && <Sparkles className="w-4 h-4 text-[#173D3A]" />}
          {project.startingPoint === 'feng_shui' && <Compass className="w-4 h-4 text-[#B59A63]" />}
          <span>Forma de início: {getStartingLabel(project.startingPoint)}</span>
        </h2>

        {/* Text of Idea if exists */}
        {hasBriefingText && (
          <div className="space-y-1.5 pt-2 border-t border-[#E3DCCF]/60">
            <h3 className="text-[13px] font-semibold text-[#173D3A] uppercase tracking-wider">
              Texto Informado
            </h3>
            <div className="p-4 rounded-[12px] bg-[#F2EDE4]/80 border border-[#E3DCCF] text-[13.5px] text-[#272C2B] whitespace-pre-wrap leading-relaxed">
              {briefingTextContent}
            </div>
          </div>
        )}

        {/* Documents of Briefing if exists */}
        {documents.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#E3DCCF]/60">
            <h3 className="text-[13px] font-semibold text-[#173D3A] uppercase tracking-wider">
              Documentos do Briefing ({documents.length})
            </h3>
            <div className="space-y-1.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-[10px] bg-[#F2EDE4]/80 border border-[#E3DCCF] text-[12.5px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[#173D3A] shrink-0" />
                    <span className="font-medium text-[#272C2B] truncate">{doc.fileName}</span>
                    <span className="text-[#68706A] text-[11px] shrink-0">
                      ({(doc.fileSize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    Documento do briefing
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual references if exists */}
        {visualReferences.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#E3DCCF]/60">
            <h3 className="text-[13px] font-semibold text-[#173D3A] uppercase tracking-wider">
              Referências Visuais ({visualReferences.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visualReferences.map((ref) => (
                <div
                  key={ref.id}
                  className="p-3 rounded-[10px] bg-[#F2EDE4]/80 border border-[#E3DCCF] flex gap-3 items-start"
                >
                  <div className="w-14 h-14 rounded-[8px] overflow-hidden bg-[#E3DCCF]/50 border border-[#E3DCCF] shrink-0">
                    {thumbnails[ref.fileId] ? (
                      <img
                        src={thumbnails[ref.fileId]}
                        alt={ref.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#68706A]">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[12.5px] font-medium text-[#272C2B] truncate">{ref.fileName}</p>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block">
                      Referência de inspiração
                    </span>
                    {ref.instruction && (
                      <p className="text-[11.5px] text-[#272C2B] italic bg-white/70 p-1 rounded border border-[#E3DCCF]/60">
                        "{ref.instruction}"
                      </p>
                    )}
                    {ref.sourceUrl && (
                      <p className="text-[10.5px] text-[#68706A] flex items-center gap-1 truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{ref.sourceUrl}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audios if exists */}
        {audios.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#E3DCCF]/60">
            <h3 className="text-[13px] font-semibold text-[#173D3A] uppercase tracking-wider">
              Áudios e Transcrições ({audios.length})
            </h3>
            <div className="space-y-2">
              {audios.map((aud) => (
                <div
                  key={aud.id}
                  className="p-3 rounded-[10px] bg-[#F2EDE4]/80 border border-[#E3DCCF] space-y-1.5 text-[12.5px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-[#173D3A]" />
                      <span className="font-medium text-[#272C2B]">{aud.fileName}</span>
                      <span className="text-[#68706A] text-[11px]">({aud.durationSeconds}s)</span>
                    </div>
                    <span className="text-[10.5px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Salvo localmente
                    </span>
                  </div>
                  {aud.transcription ? (
                    <div className="p-2.5 rounded bg-white/80 border border-[#E3DCCF]/60 text-[12px] text-[#272C2B] whitespace-pre-wrap">
                      {aud.transcription}
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-[#68706A] italic">
                      {aud.transcriptionStatus === 'unavailable'
                        ? 'Transcrição automática não suportada pelo navegador.'
                        : 'Sem transcrição associada.'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feng Shui info if exists */}
        {project.fengShuiProjects && project.fengShuiProjects.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#E3DCCF]/60">
            <h3 className="text-[13px] font-semibold text-[#173D3A] uppercase tracking-wider">
              Estudo de Feng Shui registrado
            </h3>
            <div className="p-3.5 rounded-[12px] bg-[#F2EDE4]/80 border border-[#E3DCCF] text-[13px] text-[#272C2B] space-y-1">
              <p>
                <span className="text-[#68706A]">Base gráfica declarada: </span>
                <span className="font-medium">
                  {project.fengShuiProjects[0].sourceType === 'planta_2d' && 'Planta 2D'}
                  {project.fengShuiProjects[0].sourceType === 'modelo_3d' && 'Modelo 3D'}
                  {project.fengShuiProjects[0].sourceType === 'croqui' && 'Croqui'}
                  {project.fengShuiProjects[0].sourceType === 'sem_base' && 'Ainda não tenho base gráfica'}
                  {!['planta_2d', 'modelo_3d', 'croqui', 'sem_base'].includes(
                    project.fengShuiProjects[0].sourceType || ''
                  ) && (project.fengShuiProjects[0].sourceType || 'Não informada')}
                </span>
              </p>
              <p className="text-[12px] text-[#68706A]">
                Configuração neutra inicial preservada sem metodologia ou curas presumidas.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Files section */}
      <div className="p-5 sm:p-6 rounded-[16px] bg-[#FBF9F4] border border-[#E3DCCF] space-y-3">
        <h2 className="text-[15px] font-semibold text-[#272C2B] flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-[#173D3A]" />
          <span>Todos os Arquivos e Binários ({project.files.length})</span>
        </h2>

        {project.files.length === 0 ? (
          <p className="text-[13px] text-[#68706A] italic">Nenhum arquivo binário anexado neste momento.</p>
        ) : (
          <div className="space-y-2 pt-1">
            {project.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-3 p-3 rounded-[10px] bg-[#F2EDE4]/60 border border-[#E3DCCF]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-[#173D3A] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#272C2B] truncate">{file.name}</p>
                    <p className="text-[11.5px] text-[#68706A]">
                      {file.mimeType} • {(file.size / 1024).toFixed(1)} KB • {file.sourceKind}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[11.5px] font-medium px-2 py-0.5 rounded bg-white/80 border border-[#E3DCCF]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{file.uploadStatus === 'available' ? 'Salvo localmente' : file.uploadStatus}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

