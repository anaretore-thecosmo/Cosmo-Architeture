import { useState, useEffect, ChangeEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  FileText,
  Trash2,
  AlertCircle,
  Sparkles,
  Compass,
  Home,
  Building2,
  Layers,
  CheckCircle2,
  Image as ImageIcon,
  Volume2,
  ExternalLink,
} from 'lucide-react';
import {
  BriefingAudio,
  BriefingDocument,
  Project,
  ProjectCategory,
  ProjectFile,
  StartingPoint,
  VisualReference,
} from '../../domain/project/types';
import { createProjectFromOnboarding } from '../../domain/project/projectFactory';
import { FileStorageService } from '../../services/storage/fileStorage';
import { ProjectStore } from '../../services/storage/projectStore';
import { MultimodalBriefingInput } from './components/MultimodalBriefingInput';

interface NewProjectOnboardingProps {
  initialStartingPoint?: StartingPoint | null;
  onCancel: () => void;
  onProjectCreated: (project: Project) => void;
}

const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  residential: ['Casa', 'Apartamento', 'Sítio', 'Reforma', 'Ambiente específico', 'Outro'],
  commercial: ['Clínica', 'Escritório', 'Loja', 'Estúdio de podcast', 'Restaurante', 'Outro'],
  other: ['Terreno', 'Área externa', 'Espaço comunitário', 'Estrutura rural', 'Outro'],
};

export function NewProjectOnboarding({
  initialStartingPoint,
  onCancel,
  onProjectCreated,
}: NewProjectOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [category, setCategory] = useState<ProjectCategory | ''>('residential');
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('Casa');
  const [customSubtype, setCustomSubtype] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');

  const [startingPoint, setStartingPoint] = useState<StartingPoint>(
    initialStartingPoint || 'existing_plan'
  );

  // Step 3 States - Multimodal Briefing
  const [briefingText, setBriefingText] = useState<string>('');
  const [briefingDocuments, setBriefingDocuments] = useState<BriefingDocument[]>([]);
  const [visualReferences, setVisualReferences] = useState<VisualReference[]>([]);
  const [briefingAudios, setBriefingAudios] = useState<BriefingAudio[]>([]);

  const [fengShuiBase, setFengShuiBase] = useState<string>('planta_2d');
  const [attachedFiles, setAttachedFiles] = useState<ProjectFile[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isSavingProject, setIsSavingProject] = useState<boolean>(false);
  const [saveProjectError, setSaveProjectError] = useState<string | null>(null);

  // Cache de URLs para miniaturas no Step 4
  const [step4Thumbnails, setStep4Thumbnails] = useState<Record<string, string>>({});

  const fileService = new FileStorageService();
  const projectStore = new ProjectStore(fileService);

  // Carrega miniaturas para visualização na confirmação
  useEffect(() => {
    if (currentStep === 4 && visualReferences.length > 0) {
      const loadThumbs = async () => {
        for (const ref of visualReferences) {
          if (!step4Thumbnails[ref.fileId]) {
            try {
              const record = await fileService.getFileBinary(ref.fileId);
              if (record && record.content) {
                const blob =
                  record.content instanceof Blob
                    ? record.content
                    : new Blob([record.content], { type: ref.mimeType });
                const url = URL.createObjectURL(blob);
                setStep4Thumbnails((prev) => ({ ...prev, [ref.fileId]: url }));
              }
            } catch {
              // Ignora
            }
          }
        }
      };
      loadThumbs();
    }
  }, [currentStep, visualReferences]);

  // Helpers
  const effectiveSubtype =
    selectedSuggestion === 'Outro'
      ? customSubtype.trim()
      : selectedSuggestion || customSubtype.trim();

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);

    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];

    try {
      const newFiles: ProjectFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
          throw new Error(
            `O arquivo "${file.name}" possui formato não aceito. Aceitamos PDF, PNG, JPG, JPEG e WEBP.`
          );
        }

        const tempFileId =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `temp-file-${Date.now()}-${i}`;

        const arrayBuffer = await file.arrayBuffer();

        const savedProjectFile = await fileService.saveFileBinary(
          tempFileId,
          'temp-pending-project',
          arrayBuffer,
          {
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            sourceKind: 'uploaded_document',
            createdAt: new Date().toISOString(),
          }
        );

        newFiles.push(savedProjectFile);
      }

      setAttachedFiles((prev) => [...prev, ...newFiles]);
    } catch (err) {
      setUploadError((err as Error).message || 'Falha ao processar e salvar arquivo no armazenamento local.');
    } finally {
      setIsUploading(false);
      // Reset input value
      e.target.value = '';
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await fileService.deleteFileBinary(fileId);
    } catch {
      // Ignora erro se não encontrou
    }
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !category || !effectiveSubtype) {
      return;
    }

    setIsSavingProject(true);
    setSaveProjectError(null);

    try {
      const newProject = createProjectFromOnboarding({
        name: projectName.trim(),
        category,
        subtype: effectiveSubtype,
        startingPoint,
        originalText: startingPoint === 'idea' ? briefingText : undefined,
        briefingText: startingPoint === 'idea' ? briefingText : undefined,
        briefingDocuments: startingPoint === 'idea' ? briefingDocuments : undefined,
        visualReferences: startingPoint === 'idea' ? visualReferences : undefined,
        briefingAudios: startingPoint === 'idea' ? briefingAudios : undefined,
        files: attachedFiles,
        fengShuiBase: startingPoint === 'feng_shui' ? fengShuiBase : undefined,
      });

      await projectStore.saveProject(newProject);
      onProjectCreated(newProject);
    } catch (err) {
      setSaveProjectError(
        `Não foi possível salvar o projeto no armazenamento local: ${(err as Error).message}`
      );
      setIsSavingProject(false);
    }
  };

  // Stepper Labels
  const stepsMeta = [
    { num: 1, title: 'Categoria' },
    { num: 2, title: 'Espaço e Nome' },
    { num: 3, title: 'Ponto de Partida' },
    { num: 4, title: 'Confirmação' },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-20 sm:pb-12">
      {/* Top Bar with Cancel and Step Indicator */}
      <div className="flex items-center justify-between gap-4 border-b border-[#E3DCCF] pb-4">
        <button
          id="btn-cancel-onboarding"
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#68706A] hover:text-[#272C2B] transition-colors py-1 px-2 rounded-md hover:bg-[#F2EDE4]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancelar</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {stepsMeta.map((s) => (
            <div key={s.num} className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                  currentStep === s.num
                    ? 'bg-[#173D3A] text-white'
                    : currentStep > s.num
                    ? 'bg-[#173D3A]/20 text-[#173D3A]'
                    : 'bg-[#E3DCCF] text-[#68706A]'
                }`}
              >
                {currentStep > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span
                className={`text-[12px] hidden md:inline ${
                  currentStep === s.num ? 'font-medium text-[#272C2B]' : 'text-[#68706A]'
                }`}
              >
                {s.title}
              </span>
              {s.num < 4 && <div className="w-3 sm:w-6 h-[1px] bg-[#E3DCCF]" />}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: O que você quer desenvolver? */}
      {currentStep === 1 && (
        <div className="p-5 sm:p-8 rounded-[16px] bg-[#FBF9F4] border border-[#E3DCCF] space-y-6 shadow-xs">
          <div className="space-y-1">
            <span className="text-[12px] uppercase font-semibold tracking-wider text-[#173D3A]">
              Etapa 1 de 4
            </span>
            <h2 className="text-[20px] sm:text-[24px] font-serif text-[#272C2B] tracking-tight">
              O que você quer desenvolver?
            </h2>
            <p className="text-[13.5px] text-[#68706A]">
              Selecione a categoria principal que melhor define seu projeto.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              id="cat-residential"
              type="button"
              onClick={() => {
                setCategory('residential');
                setSelectedSuggestion('Casa');
              }}
              className={`p-4 rounded-[12px] border text-left flex flex-col justify-between gap-3 transition-all ${
                category === 'residential'
                  ? 'border-[#173D3A] bg-[#173D3A]/5 shadow-xs'
                  : 'border-[#E3DCCF] bg-white/70 hover:border-[#68706A]/40'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${
                  category === 'residential'
                    ? 'bg-[#173D3A] text-white'
                    : 'bg-[#E3DCCF]/50 text-[#173D3A]'
                }`}
              >
                <Home className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[15px] font-semibold text-[#272C2B]">Residencial</p>
                <p className="text-[12px] text-[#68706A]">Casas, apartamentos, sítios e reformas.</p>
              </div>
            </button>

            <button
              id="cat-commercial"
              type="button"
              onClick={() => {
                setCategory('commercial');
                setSelectedSuggestion('Escritório');
              }}
              className={`p-4 rounded-[12px] border text-left flex flex-col justify-between gap-3 transition-all ${
                category === 'commercial'
                  ? 'border-[#173D3A] bg-[#173D3A]/5 shadow-xs'
                  : 'border-[#E3DCCF] bg-white/70 hover:border-[#68706A]/40'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${
                  category === 'commercial'
                    ? 'bg-[#173D3A] text-white'
                    : 'bg-[#E3DCCF]/50 text-[#173D3A]'
                }`}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[15px] font-semibold text-[#272C2B]">Comercial</p>
                <p className="text-[12px] text-[#68706A]">Lojas, clínicas, escritórios e estúdios.</p>
              </div>
            </button>

            <button
              id="cat-other"
              type="button"
              onClick={() => {
                setCategory('other');
                setSelectedSuggestion('Terreno');
              }}
              className={`p-4 rounded-[12px] border text-left flex flex-col justify-between gap-3 transition-all ${
                category === 'other'
                  ? 'border-[#173D3A] bg-[#173D3A]/5 shadow-xs'
                  : 'border-[#E3DCCF] bg-white/70 hover:border-[#68706A]/40'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${
                  category === 'other'
                    ? 'bg-[#173D3A] text-white'
                    : 'bg-[#E3DCCF]/50 text-[#173D3A]'
                }`}
              >
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[15px] font-semibold text-[#272C2B]">Outros espaços</p>
                <p className="text-[12px] text-[#68706A]">Terrenos, áreas externas e rurais.</p>
              </div>
            </button>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              id="btn-step1-next"
              type="button"
              disabled={!category}
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#173D3A] text-white text-[13.5px] font-medium hover:bg-[#122F2D] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              <span>Avançar para espaço e nome</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Que espaço vamos desenvolver? */}
      {currentStep === 2 && (
        <div className="p-5 sm:p-8 rounded-[16px] bg-[#FBF9F4] border border-[#E3DCCF] space-y-6 shadow-xs">
          <div className="space-y-1">
            <span className="text-[12px] uppercase font-semibold tracking-wider text-[#173D3A]">
              Etapa 2 de 4
            </span>
            <h2 className="text-[20px] sm:text-[24px] font-serif text-[#272C2B] tracking-tight">
              Que espaço vamos desenvolver?
            </h2>
            <p className="text-[13.5px] text-[#68706A]">
              Escolha uma das sugestões ou informe livremente o tipo de espaço, e dê um nome ao projeto.
            </p>
          </div>

          {/* Sugestões de Subtipo */}
          <div className="space-y-2">
            <label className="block text-[13px] font-medium text-[#272C2B]">
              Tipo de espaço <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(CATEGORY_SUGGESTIONS[category || 'residential'] || []).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setSelectedSuggestion(sug)}
                  className={`px-3.5 py-2 rounded-[8px] text-[13px] font-medium transition-all min-h-[44px] flex items-center ${
                    selectedSuggestion === sug
                      ? 'bg-[#173D3A] text-white shadow-xs'
                      : 'bg-white/80 border border-[#E3DCCF] text-[#272C2B] hover:border-[#173D3A]/40'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Campo livre se for 'Outro' ou custom */}
            {selectedSuggestion === 'Outro' && (
              <div className="pt-2">
                <input
                  id="input-custom-subtype"
                  type="text"
                  placeholder="Especifique o tipo de espaço (ex: Cabana na montanha, Galeria de arte)"
                  value={customSubtype}
                  onChange={(e) => setCustomSubtype(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[10px] bg-white border border-[#E3DCCF] text-[#272C2B] text-[13.5px] focus:outline-none focus:border-[#173D3A] transition-colors"
                />
              </div>
            )}
          </div>

          {/* Nome do Projeto */}
          <div className="space-y-2 pt-2 border-t border-[#E3DCCF]/60">
            <label htmlFor="input-project-name" className="block text-[13px] font-medium text-[#272C2B]">
              Nome do projeto <span className="text-red-500">*</span>
            </label>
            <input
              id="input-project-name"
              type="text"
              placeholder="Ex: Residência Terracota, Ateliê Jardim, Nova Clínica"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[10px] bg-white border border-[#E3DCCF] text-[#272C2B] text-[14px] focus:outline-none focus:border-[#173D3A] transition-colors"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] border border-[#E3DCCF] bg-white text-[#272C2B] text-[13px] font-medium hover:bg-[#F2EDE4] transition-colors min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              id="btn-step2-next"
              type="button"
              disabled={!projectName.trim() || !effectiveSubtype}
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#173D3A] text-white text-[13.5px] font-medium hover:bg-[#122F2D] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              <span>Avançar para ponto de partida</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Envie o que tem ou conte sua ideia */}
      {currentStep === 3 && (
        <div className="p-5 sm:p-8 rounded-[16px] bg-[#FBF9F4] border border-[#E3DCCF] space-y-6 shadow-xs">
          <div className="space-y-1">
            <span className="text-[12px] uppercase font-semibold tracking-wider text-[#173D3A]">
              Etapa 3 de 4
            </span>
            <h2 className="text-[20px] sm:text-[24px] font-serif text-[#272C2B] tracking-tight">
              Envie o que tem ou conte sua ideia
            </h2>
            <p className="text-[13.5px] text-[#68706A]">
              Como você deseja iniciar a estruturação deste projeto?
            </p>
          </div>

          {/* Opções de início */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setStartingPoint('existing_plan')}
              className={`p-3.5 rounded-[10px] border text-left flex items-center gap-3 transition-all min-h-[52px] ${
                startingPoint === 'existing_plan'
                  ? 'border-[#173D3A] bg-[#173D3A]/5 text-[#173D3A] font-semibold shadow-xs'
                  : 'border-[#E3DCCF] bg-white/70 text-[#272C2B] hover:border-[#68706A]/40'
              }`}
            >
              <FileText className="w-4 h-4 text-[#173D3A] shrink-0" />
              <span className="text-[13px] leading-snug">Já tenho planta ou arquivos</span>
            </button>

            <button
              type="button"
              onClick={() => setStartingPoint('idea')}
              className={`p-3.5 rounded-[10px] border text-left flex items-center gap-3 transition-all min-h-[52px] ${
                startingPoint === 'idea'
                  ? 'border-[#173D3A] bg-[#173D3A]/5 text-[#173D3A] font-semibold shadow-xs'
                  : 'border-[#E3DCCF] bg-white/70 text-[#272C2B] hover:border-[#68706A]/40'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#173D3A] shrink-0" />
              <span className="text-[13px] leading-snug">Quero contar minha ideia</span>
            </button>

            <button
              type="button"
              onClick={() => setStartingPoint('feng_shui')}
              className={`p-3.5 rounded-[10px] border text-left flex items-center gap-3 transition-all min-h-[52px] ${
                startingPoint === 'feng_shui'
                  ? 'border-[#173D3A] bg-[#173D3A]/5 text-[#173D3A] font-semibold shadow-xs'
                  : 'border-[#E3DCCF] bg-white/70 text-[#272C2B] hover:border-[#68706A]/40'
              }`}
            >
              <Compass className="w-4 h-4 text-[#B59A63] shrink-0" />
              <span className="text-[13px] leading-snug">Quero começar pelo Feng Shui</span>
            </button>
          </div>

          {/* Bloco específico: Já tenho planta ou arquivos */}
          {startingPoint === 'existing_plan' && (
            <div className="space-y-4 pt-2 border-t border-[#E3DCCF]/60">
              <div className="space-y-1">
                <label className="block text-[13px] font-medium text-[#272C2B]">
                  Selecione os arquivos do seu projeto
                </label>
                <p className="text-[12px] text-[#68706A]">
                  Formatos aceitos nesta etapa: PDF, PNG, JPG, JPEG, WEBP.
                </p>
              </div>

              {/* Upload Drop/Button */}
              <div className="relative border-2 border-dashed border-[#E3DCCF] rounded-[12px] p-6 text-center bg-white/50 hover:bg-white transition-colors">
                <input
                  id="file-upload-input"
                  type="file"
                  multiple
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-[#E3DCCF]/50 flex items-center justify-center text-[#173D3A]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-[13.5px] font-medium text-[#272C2B]">
                    {isUploading ? 'Processando e salvando...' : 'Clique ou arraste arquivos aqui'}
                  </p>
                  <p className="text-[11.5px] text-[#68706A]">
                    Os binários são armazenados com segurança no IndexedDB local.
                  </p>
                </div>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[12.5px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Lista de Arquivos Anexados */}
              {attachedFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[12.5px] font-medium text-[#272C2B]">
                    Arquivos preparados ({attachedFiles.length}):
                  </span>
                  <div className="space-y-1.5">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-[8px] bg-white border border-[#E3DCCF] text-[12.5px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#173D3A] shrink-0" />
                          <span className="font-medium text-[#272C2B] truncate">{file.name}</span>
                          <span className="text-[#68706A] shrink-0">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Pronto
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.id)}
                            className="text-[#68706A] hover:text-red-600 p-1 transition-colors"
                            title="Remover arquivo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bloco específico: Quero contar minha ideia (Entrada Multimodal) */}
          {startingPoint === 'idea' && (
            <MultimodalBriefingInput
              briefingText={briefingText}
              onBriefingTextChange={setBriefingText}
              documents={briefingDocuments}
              onDocumentsChange={setBriefingDocuments}
              visualReferences={visualReferences}
              onVisualReferencesChange={setVisualReferences}
              audios={briefingAudios}
              onAudiosChange={setBriefingAudios}
              attachedFiles={attachedFiles}
              onAttachedFilesChange={setAttachedFiles}
              fileService={fileService}
            />
          )}

          {/* Bloco específico: Quero começar pelo Feng Shui */}
          {startingPoint === 'feng_shui' && (
            <div className="space-y-4 pt-2 border-t border-[#E3DCCF]/60">
              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-[#272C2B]">
                  Qual base você possui neste momento?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'planta_2d', label: 'Planta 2D' },
                    { id: 'modelo_3d', label: 'Modelo 3D' },
                    { id: 'croqui', label: 'Croqui' },
                    { id: 'sem_base', label: 'Ainda não tenho base gráfica' },
                  ].map((base) => (
                    <button
                      key={base.id}
                      type="button"
                      onClick={() => setFengShuiBase(base.id)}
                      className={`p-3 rounded-[8px] border text-left text-[13px] font-medium transition-all min-h-[44px] flex items-center ${
                        fengShuiBase === base.id
                          ? 'border-[#173D3A] bg-[#173D3A]/5 text-[#173D3A]'
                          : 'border-[#E3DCCF] bg-white/70 text-[#272C2B] hover:border-[#68706A]/40'
                      }`}
                    >
                      {base.label}
                    </button>
                  ))}
                </div>
              </div>

              {fengShuiBase !== 'sem_base' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-[12.5px] font-medium text-[#272C2B]">
                    Anexar base gráfica (opcional neste momento)
                  </label>
                  <div className="relative border border-[#E3DCCF] rounded-[10px] p-4 bg-white text-center">
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    <div className="flex items-center justify-center gap-2 text-[12.5px] text-[#173D3A] font-medium">
                      <Upload className="w-4 h-4" />
                      <span>{isUploading ? 'Salvando...' : 'Selecionar arquivo de base gráfica'}</span>
                    </div>
                  </div>

                  {attachedFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-[8px] bg-white border border-[#E3DCCF] text-[12px]"
                        >
                          <span className="font-medium text-[#272C2B] truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.id)}
                            className="text-[#68706A] hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] border border-[#E3DCCF] bg-white text-[#272C2B] text-[13px] font-medium hover:bg-[#F2EDE4] transition-colors min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              id="btn-step3-next"
              type="button"
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#173D3A] text-white text-[13.5px] font-medium hover:bg-[#122F2D] transition-colors min-h-[44px]"
            >
              <span>Avançar para confirmação</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Confirme o que foi entendido */}
      {currentStep === 4 && (
        <div className="p-5 sm:p-8 rounded-[16px] bg-[#FBF9F4] border border-[#E3DCCF] space-y-6 shadow-xs">
          <div className="space-y-1">
            <span className="text-[12px] uppercase font-semibold tracking-wider text-[#173D3A]">
              Etapa 4 de 4
            </span>
            <h2 className="text-[20px] sm:text-[24px] font-serif text-[#272C2B] tracking-tight">
              Confirme o que foi entendido
            </h2>
            <p className="text-[13.5px] text-[#68706A]">
              Revise o resumo das informações e referências cadastradas antes de criar o projeto.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-[12px] bg-white border border-[#E3DCCF] space-y-4 text-[13.5px]">
            {/* Cabeçalho do Projeto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-[#E3DCCF]/60">
              <div>
                <span className="text-[11.5px] text-[#68706A] block">Nome do projeto</span>
                <span className="font-semibold text-[#272C2B]">{projectName}</span>
              </div>
              <div>
                <span className="text-[11.5px] text-[#68706A] block">Categoria & Espaço</span>
                <span className="font-semibold text-[#272C2B]">
                  {category === 'residential' && 'Residencial'}
                  {category === 'commercial' && 'Comercial'}
                  {category === 'other' && 'Outros espaços'} • {effectiveSubtype}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11.5px] text-[#68706A] block">Forma escolhida para começar</span>
              <span className="font-semibold text-[#272C2B]">
                {startingPoint === 'existing_plan' && 'Já tenho planta ou arquivos'}
                {startingPoint === 'idea' && 'Quero contar minha ideia'}
                {startingPoint === 'feng_shui' && 'Quero começar pelo Feng Shui'}
              </span>
            </div>

            {/* BASE GRÁFICA */}
            {startingPoint === 'existing_plan' && attachedFiles.length > 0 && (
              <div className="pt-2 border-t border-[#E3DCCF]/60">
                <span className="text-[11.5px] font-semibold text-[#173D3A] uppercase tracking-wider block">
                  Base Gráfica ({attachedFiles.length})
                </span>
                <div className="space-y-1 mt-1.5">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 text-[12.5px] text-[#272C2B] p-2 rounded bg-[#FBF9F4] border border-[#E3DCCF]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="text-[#68706A] text-[11px] shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FENG SHUI BASE */}
            {startingPoint === 'feng_shui' && (
              <div className="pt-2 border-t border-[#E3DCCF]/60">
                <span className="text-[11.5px] font-semibold text-[#173D3A] uppercase tracking-wider block">
                  Base Gráfica Declarada
                </span>
                <span className="font-medium text-[#272C2B] block mt-0.5">
                  {fengShuiBase === 'planta_2d' && 'Planta 2D'}
                  {fengShuiBase === 'modelo_3d' && 'Modelo 3D'}
                  {fengShuiBase === 'croqui' && 'Croqui'}
                  {fengShuiBase === 'sem_base' && 'Ainda não tenho base gráfica'}
                </span>
              </div>
            )}

            {/* TEXTO INFORMADO */}
            {startingPoint === 'idea' && briefingText.trim() && (
              <div className="pt-2 border-t border-[#E3DCCF]/60">
                <span className="text-[11.5px] font-semibold text-[#173D3A] uppercase tracking-wider block">
                  Texto Informado
                </span>
                <div className="p-3 rounded-[8px] bg-[#FBF9F4] border border-[#E3DCCF] text-[13px] text-[#272C2B] whitespace-pre-wrap leading-relaxed mt-1.5">
                  {briefingText.trim()}
                </div>
              </div>
            )}

            {/* DOCUMENTOS DO BRIEFING */}
            {startingPoint === 'idea' && briefingDocuments.length > 0 && (
              <div className="pt-2 border-t border-[#E3DCCF]/60">
                <span className="text-[11.5px] font-semibold text-[#173D3A] uppercase tracking-wider block">
                  Documentos do Briefing ({briefingDocuments.length})
                </span>
                <div className="space-y-1.5 mt-1.5">
                  {briefingDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-2 p-2 rounded bg-[#FBF9F4] border border-[#E3DCCF] text-[12px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-[#173D3A] shrink-0" />
                        <span className="font-medium text-[#272C2B] truncate">{doc.fileName}</span>
                        <span className="text-[#68706A] text-[11px] shrink-0">
                          ({(doc.fileSize / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <span className="text-[10.5px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                        Documento do briefing
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REFERÊNCIAS VISUAIS */}
            {startingPoint === 'idea' && visualReferences.length > 0 && (
              <div className="pt-2 border-t border-[#E3DCCF]/60">
                <span className="text-[11.5px] font-semibold text-[#173D3A] uppercase tracking-wider block">
                  Referências Visuais ({visualReferences.length})
                </span>
                <div className="space-y-2 mt-1.5">
                  {visualReferences.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-start gap-3 p-2.5 rounded-[8px] bg-[#FBF9F4] border border-[#E3DCCF] text-[12px]"
                    >
                      {/* Miniatura */}
                      <div className="w-12 h-12 rounded-[6px] overflow-hidden bg-[#E3DCCF]/40 border border-[#E3DCCF] shrink-0">
                        {step4Thumbnails[ref.fileId] ? (
                          <img
                            src={step4Thumbnails[ref.fileId]}
                            alt={ref.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#68706A]">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-[#272C2B] truncate">{ref.fileName}</p>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                            Referência visual de inspiração
                          </span>
                        </div>
                        {ref.instruction && ref.instruction.trim() && (
                          <p className="text-[#272C2B] text-[11.5px] italic bg-white/80 p-1.5 rounded border border-[#E3DCCF]/60">
                            "{ref.instruction.trim()}"
                          </p>
                        )}
                        {ref.sourceUrl && ref.sourceUrl.trim() && (
                          <p className="text-[#68706A] text-[10.5px] flex items-center gap-1 truncate">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{ref.sourceUrl.trim()}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ÁUDIOS E TRANSCRIÇÕES */}
            {startingPoint === 'idea' && briefingAudios.length > 0 && (
              <div className="pt-2 border-t border-[#E3DCCF]/60">
                <span className="text-[11.5px] font-semibold text-[#173D3A] uppercase tracking-wider block">
                  Áudios e Transcrições ({briefingAudios.length})
                </span>
                <div className="space-y-2 mt-1.5">
                  {briefingAudios.map((aud) => (
                    <div
                      key={aud.id}
                      className="p-2.5 rounded-[8px] bg-[#FBF9F4] border border-[#E3DCCF] text-[12px] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Volume2 className="w-3.5 h-3.5 text-[#173D3A] shrink-0" />
                          <span className="font-medium text-[#272C2B] truncate">{aud.fileName}</span>
                          <span className="text-[#68706A] text-[11px]">
                            ({aud.durationSeconds}s)
                          </span>
                        </div>
                        <span className="text-[10.5px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                          Salvo localmente
                        </span>
                      </div>

                      {aud.transcription && aud.transcription.trim() ? (
                        <p className="text-[11.5px] text-[#272C2B] bg-white/80 p-2 rounded border border-[#E3DCCF]/60">
                          {aud.transcription.trim()}
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#68706A] italic">
                          {aud.transcriptionStatus === 'unavailable'
                            ? 'Transcrição automática indisponível neste navegador.'
                            : 'Nenhuma anotação de transcrição registrada.'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aviso neutro de preservação */}
            <div className="pt-2 text-[11px] text-[#68706A] border-t border-[#E3DCCF]/60">
              Esta etapa apenas confirma as fontes e referências que você forneceu. Nenhum dado foi presumido ou interpretado por IA.
            </div>
          </div>

          {saveProjectError && (
            <div className="flex items-center gap-2 p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[12.5px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveProjectError}</span>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              id="btn-back-and-review"
              type="button"
              disabled={isSavingProject}
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] border border-[#E3DCCF] bg-white text-[#272C2B] text-[13px] font-medium hover:bg-[#F2EDE4] transition-colors min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar e revisar</span>
            </button>

            <button
              id="btn-create-project-final"
              type="button"
              disabled={isSavingProject}
              onClick={handleCreateProject}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[10px] bg-[#173D3A] text-white text-[14px] font-semibold hover:bg-[#122F2D] transition-colors disabled:opacity-50 min-h-[44px] shadow-sm"
            >
              {isSavingProject ? (
                <span>Salvando projeto...</span>
              ) : (
                <>
                  <span>Criar projeto</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

