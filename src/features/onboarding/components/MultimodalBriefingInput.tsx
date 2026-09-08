import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Mic,
  MicOff,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  X,
  ExternalLink,
  Plus,
  Play,
  Square,
  Volume2,
} from 'lucide-react';
import {
  BriefingAudio,
  BriefingDocument,
  ProjectFile,
  TranscriptionStatus,
  VisualReference,
} from '../../../domain/project/types';
import { FileStorageService } from '../../../services/storage/fileStorage';
import { BrowserSpeechTranscriptionService } from '../../../services/transcription/transcriptionService';

export interface MultimodalBriefingInputProps {
  briefingText: string;
  onBriefingTextChange: (text: string) => void;
  documents: BriefingDocument[];
  onDocumentsChange: (docs: BriefingDocument[]) => void;
  visualReferences: VisualReference[];
  onVisualReferencesChange: (refs: VisualReference[]) => void;
  audios: BriefingAudio[];
  onAudiosChange: (audios: BriefingAudio[]) => void;
  attachedFiles: ProjectFile[];
  onAttachedFilesChange: (files: ProjectFile[]) => void;
  fileService: FileStorageService;
}

export function MultimodalBriefingInput({
  briefingText,
  onBriefingTextChange,
  documents,
  onDocumentsChange,
  visualReferences,
  onVisualReferencesChange,
  audios,
  onAudiosChange,
  attachedFiles,
  onAttachedFilesChange,
  fileService,
}: MultimodalBriefingInputProps) {
  // Active sub-tab or view mode (all 4 are available and can be combined)
  const [activeSection, setActiveSection] = useState<'text' | 'pdf' | 'images' | 'audio'>('text');

  // Image lightbox preview
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; name: string } | null>(null);

  // In-memory object URLs for immediate preview
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({});

  // Loading and error states
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [isUploadingImg, setIsUploadingImg] = useState<boolean>(false);
  const [imgError, setImgError] = useState<string | null>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [transcriptionNotice, setTranscriptionNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const transcriptionServiceRef = useRef<BrowserSpeechTranscriptionService | null>(null);
  const currentLiveTranscriptRef = useRef<string>('');

  // Limpa URLs de objeto ao desmontar
  useEffect(() => {
    return () => {
      Object.values(objectUrls).forEach((url: string) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignora
        }
      });
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (transcriptionServiceRef.current) {
        transcriptionServiceRef.current.abort();
      }
    };
  }, []);

  // Carrega miniaturas do IndexedDB se necessário
  useEffect(() => {
    const loadMissingUrls = async () => {
      for (const ref of visualReferences) {
        if (!objectUrls[ref.fileId]) {
          try {
            const record = await fileService.getFileBinary(ref.fileId);
            if (record && record.content) {
              const blob =
                record.content instanceof Blob
                  ? record.content
                  : new Blob([record.content], { type: ref.mimeType });
              const url = URL.createObjectURL(blob);
              setObjectUrls((prev) => ({ ...prev, [ref.fileId]: url }));
            }
          } catch {
            // Ignora se ainda não carregou
          }
        }
      }

      for (const aud of audios) {
        if (!objectUrls[aud.fileId]) {
          try {
            const record = await fileService.getFileBinary(aud.fileId);
            if (record && record.content) {
              const blob =
                record.content instanceof Blob
                  ? record.content
                  : new Blob([record.content], { type: aud.mimeType });
              const url = URL.createObjectURL(blob);
              setObjectUrls((prev) => ({ ...prev, [aud.fileId]: url }));
            }
          } catch {
            // Ignora
          }
        }
      }
    };

    loadMissingUrls();
  }, [visualReferences, audios]);

  // Helper para gerar ID único
  const getUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // ==========================================
  // HANDLERS: PDF
  // ==========================================
  const handlePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setDocError(null);
    setIsUploadingDoc(true);

    try {
      const newDocs: BriefingDocument[] = [];
      const newFiles: ProjectFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
          throw new Error(`O arquivo "${file.name}" não é um PDF válido.`);
        }

        const fileId = getUUID();
        const arrayBuffer = await file.arrayBuffer();

        const savedFile = await fileService.saveFileBinary(
          fileId,
          'temp-pending-project',
          arrayBuffer,
          {
            name: file.name,
            mimeType: 'application/pdf',
            size: file.size,
            sourceKind: 'briefing_document',
            createdAt: new Date().toISOString(),
          }
        );

        const briefingDoc: BriefingDocument = {
          id: getUUID(),
          projectId: 'temp-pending-project',
          fileId: savedFile.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: 'application/pdf',
          classification: 'briefing_document',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newDocs.push(briefingDoc);
        newFiles.push(savedFile);
      }

      onDocumentsChange([...documents, ...newDocs]);
      onAttachedFilesChange([...attachedFiles, ...newFiles]);
    } catch (err) {
      setDocError((err as Error).message || 'Falha ao processar arquivo PDF.');
    } finally {
      setIsUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleRemoveDocument = async (docId: string, fileId: string) => {
    try {
      await fileService.deleteFileBinary(fileId);
    } catch {
      // Ignora
    }
    onDocumentsChange(documents.filter((d) => d.id !== docId));
    onAttachedFilesChange(attachedFiles.filter((f) => f.id !== fileId));
  };

  // ==========================================
  // HANDLERS: REFERÊNCIAS VISUAIS
  // ==========================================
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImgError(null);
    setIsUploadingImg(true);

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    try {
      const newRefs: VisualReference[] = [];
      const newFiles: ProjectFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!allowedMimes.includes(file.type)) {
          throw new Error(
            `A imagem "${file.name}" possui formato não suportado. Use JPG, PNG ou WEBP.`
          );
        }

        const fileId = getUUID();
        const arrayBuffer = await file.arrayBuffer();

        // Cria URL de pré-visualização imediata
        const blob = new Blob([arrayBuffer], { type: file.type });
        const localUrl = URL.createObjectURL(blob);
        setObjectUrls((prev) => ({ ...prev, [fileId]: localUrl }));

        const savedFile = await fileService.saveFileBinary(
          fileId,
          'temp-pending-project',
          arrayBuffer,
          {
            name: file.name,
            mimeType: file.type,
            size: file.size,
            sourceKind: 'visual_reference_inspiration',
            createdAt: new Date().toISOString(),
          }
        );

        const visualRef: VisualReference = {
          id: getUUID(),
          projectId: 'temp-pending-project',
          fileId: savedFile.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          classification: 'visual_reference_inspiration',
          instruction: '',
          sourceUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newRefs.push(visualRef);
        newFiles.push(savedFile);
      }

      onVisualReferencesChange([...visualReferences, ...newRefs]);
      onAttachedFilesChange([...attachedFiles, ...newFiles]);
    } catch (err) {
      setImgError((err as Error).message || 'Falha ao carregar imagens de referência.');
    } finally {
      setIsUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleUpdateImageInstruction = (refId: string, instruction: string) => {
    onVisualReferencesChange(
      visualReferences.map((r) =>
        r.id === refId ? { ...r, instruction, updatedAt: new Date().toISOString() } : r
      )
    );
  };

  const handleUpdateImageSourceUrl = (refId: string, sourceUrl: string) => {
    onVisualReferencesChange(
      visualReferences.map((r) =>
        r.id === refId ? { ...r, sourceUrl, updatedAt: new Date().toISOString() } : r
      )
    );
  };

  const handleRemoveImage = async (refId: string, fileId: string) => {
    try {
      await fileService.deleteFileBinary(fileId);
    } catch {
      // Ignora
    }
    if (objectUrls[fileId]) {
      try {
        URL.revokeObjectURL(objectUrls[fileId]);
      } catch {
        // Ignora
      }
    }
    onVisualReferencesChange(visualReferences.filter((r) => r.id !== refId));
    onAttachedFilesChange(attachedFiles.filter((f) => f.id !== fileId));
  };

  // ==========================================
  // HANDLERS: GRAVAÇÃO E TRANSCRIÇÃO DE ÁUDIO
  // ==========================================
  const startAudioRecording = async () => {
    setRecordingError(null);
    setTranscriptionNotice(null);
    audioChunksRef.current = [];
    currentLiveTranscriptRef.current = '';

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('A gravação de áudio não é suportada neste navegador.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Suporte a codecs comuns no navegador
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const finalBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const durationSec = recordingSeconds;

        await processCompletedAudio(finalBlob, durationSec);
      };

      // Inicia transcrição se suportado
      const transcriptionService = new BrowserSpeechTranscriptionService();
      transcriptionServiceRef.current = transcriptionService;

      if (transcriptionService.isSupported()) {
        transcriptionService.start({
          onInterim: (text) => {
            // Pode atualizar feedback se desejar
          },
          onFinal: (text) => {
            currentLiveTranscriptRef.current = text;
          },
          onError: (errMsg) => {
            setTranscriptionNotice(errMsg);
          },
        });
      } else {
        setTranscriptionNotice(
          'Reconhecimento de voz automático indisponível neste navegador. Você poderá ouvir o áudio gravado e digitar anotações ou transcrições manuais.'
        );
      }

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      const errorObj = err as Error;
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        setRecordingError(
          'Permissão do microfone negada. Permita o acesso ao microfone nas configurações do navegador para gravar áudio.'
        );
      } else if (errorObj.name === 'NotFoundError' || errorObj.name === 'DevicesNotFoundError') {
        setRecordingError('Nenhum microfone foi detectado neste dispositivo.');
      } else {
        setRecordingError(errorObj.message || 'Falha ao iniciar gravação de áudio.');
      }
      setIsRecording(false);
    }
  };

  const stopAudioRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (transcriptionServiceRef.current) {
      transcriptionServiceRef.current.stop();
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    setIsRecording(false);
  };

  const processCompletedAudio = async (blob: Blob, durationSeconds: number) => {
    try {
      const fileId = getUUID();
      const arrayBuffer = await blob.arrayBuffer();

      const localUrl = URL.createObjectURL(blob);
      setObjectUrls((prev) => ({ ...prev, [fileId]: localUrl }));

      const savedFile = await fileService.saveFileBinary(
        fileId,
        'temp-pending-project',
        arrayBuffer,
        {
          name: `audio-briefing-${Date.now()}.webm`,
          mimeType: blob.type || 'audio/webm',
          size: blob.size,
          sourceKind: 'briefing_audio',
          createdAt: new Date().toISOString(),
        }
      );

      const recognizedText = currentLiveTranscriptRef.current.trim();
      let status: TranscriptionStatus = 'completed';

      if (!transcriptionServiceRef.current?.isSupported()) {
        status = 'unavailable';
      } else if (!recognizedText) {
        status = 'manual';
      }

      const briefingAudio: BriefingAudio = {
        id: getUUID(),
        projectId: 'temp-pending-project',
        fileId: savedFile.id,
        fileName: savedFile.name,
        fileSize: savedFile.size,
        mimeType: savedFile.mimeType,
        durationSeconds: Math.max(1, durationSeconds),
        transcription: recognizedText,
        transcriptionStatus: status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onAudiosChange([...audios, briefingAudio]);
      onAttachedFilesChange([...attachedFiles, savedFile]);
    } catch (err) {
      setRecordingError(`Falha ao salvar áudio: ${(err as Error).message}`);
    }
  };

  const handleUpdateAudioTranscription = (audioId: string, newTranscription: string) => {
    onAudiosChange(
      audios.map((a) =>
        a.id === audioId
          ? {
              ...a,
              transcription: newTranscription,
              transcriptionStatus: a.transcriptionStatus === 'unavailable' ? 'manual' : a.transcriptionStatus,
              updatedAt: new Date().toISOString(),
            }
          : a
      )
    );
  };

  const handleRemoveAudio = async (audioId: string, fileId: string) => {
    try {
      await fileService.deleteFileBinary(fileId);
    } catch {
      // Ignora
    }
    if (objectUrls[fileId]) {
      try {
        URL.revokeObjectURL(objectUrls[fileId]);
      } catch {
        // Ignora
      }
    }
    onAudiosChange(audios.filter((a) => a.id !== audioId));
    onAttachedFilesChange(attachedFiles.filter((f) => f.id !== fileId));
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 pt-2 border-t border-[#E3DCCF]/60">
      {/* Sub-Tabs / Modos de Entrada Multimodal */}
      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium text-[#272C2B]">
          Conte o que você imagina para este projeto
        </label>
        <p className="text-[12px] text-[#68706A]">
          Você pode combinar texto, PDFs, fotos de referência e áudio. Nenhuma fonte impede ou substitui as outras.
        </p>
      </div>

      {/* Seletor Compacto das 4 Formas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          id="tab-briefing-text"
          type="button"
          onClick={() => setActiveSection('text')}
          className={`px-3 py-2.5 rounded-[10px] border text-left flex flex-col gap-1 transition-all ${
            activeSection === 'text'
              ? 'border-[#173D3A] bg-[#173D3A]/5 text-[#173D3A] font-semibold'
              : 'border-[#E3DCCF] bg-white text-[#272C2B] hover:border-[#68706A]/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <FileText className="w-4 h-4 text-[#173D3A]" />
            {briefingText.trim() && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Texto preenchido" />
            )}
          </div>
          <span className="text-[12px] leading-tight">Escrever ou colar</span>
        </button>

        <button
          id="tab-briefing-pdf"
          type="button"
          onClick={() => setActiveSection('pdf')}
          className={`px-3 py-2.5 rounded-[10px] border text-left flex flex-col gap-1 transition-all ${
            activeSection === 'pdf'
              ? 'border-[#173D3A] bg-[#173D3A]/5 text-[#173D3A] font-semibold'
              : 'border-[#E3DCCF] bg-white text-[#272C2B] hover:border-[#68706A]/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <Upload className="w-4 h-4 text-[#173D3A]" />
            {documents.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                {documents.length}
              </span>
            )}
          </div>
          <span className="text-[12px] leading-tight">Anexar PDF</span>
        </button>

        <button
          id="tab-briefing-images"
          type="button"
          onClick={() => setActiveSection('images')}
          className={`px-3 py-2.5 rounded-[10px] border text-left flex flex-col gap-1 transition-all ${
            activeSection === 'images'
              ? 'border-[#173D3A] bg-[#173D3A]/5 text-[#173D3A] font-semibold'
              : 'border-[#E3DCCF] bg-white text-[#272C2B] hover:border-[#68706A]/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <ImageIcon className="w-4 h-4 text-[#173D3A]" />
            {visualReferences.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                {visualReferences.length}
              </span>
            )}
          </div>
          <span className="text-[12px] leading-tight">Referências visuais</span>
        </button>

        <button
          id="tab-briefing-audio"
          type="button"
          onClick={() => setActiveSection('audio')}
          className={`px-3 py-2.5 rounded-[10px] border text-left flex flex-col gap-1 transition-all ${
            activeSection === 'audio'
              ? 'border-[#173D3A] bg-[#173D3A]/5 text-[#173D3A] font-semibold'
              : 'border-[#E3DCCF] bg-white text-[#272C2B] hover:border-[#68706A]/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <Mic className="w-4 h-4 text-[#173D3A]" />
            {audios.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                {audios.length}
              </span>
            )}
          </div>
          <span className="text-[12px] leading-tight">Gravar áudio</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. SEÇÃO TEXTO */}
      {/* ======================================================== */}
      {activeSection === 'text' && (
        <div className="space-y-2 p-4 rounded-[12px] bg-white border border-[#E3DCCF]">
          <div className="flex items-center justify-between">
            <label htmlFor="textarea-briefing-text" className="text-[13px] font-medium text-[#272C2B]">
              Escreva ou cole aqui
            </label>
            <span className="text-[11px] text-[#68706A]">
              {briefingText.length > 0 ? `${briefingText.length} caracteres` : 'Opcional'}
            </span>
          </div>
          <textarea
            id="textarea-briefing-text"
            rows={6}
            placeholder="Descreva suas ideias, necessidades, sensações ou programa de necessidades..."
            value={briefingText}
            onChange={(e) => onBriefingTextChange(e.target.value)}
            className="w-full p-3.5 rounded-[10px] bg-[#FBF9F4] border border-[#E3DCCF] text-[#272C2B] text-[13.5px] leading-relaxed focus:outline-none focus:border-[#173D3A] transition-colors"
          />
          <p className="text-[11.5px] text-[#68706A]">
            Você pode escrever do zero ou colar um briefing preparado em outro lugar. Seu texto será preservado literalmente.
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SEÇÃO PDF */}
      {/* ======================================================== */}
      {activeSection === 'pdf' && (
        <div className="space-y-4 p-4 rounded-[12px] bg-white border border-[#E3DCCF]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#272C2B]">Anexar PDF explicativo</p>
              <p className="text-[11.5px] text-[#68706A]">
                Briefings pré-existentes, memoriais descritivos ou relatórios em PDF.
              </p>
            </div>
            <label
              htmlFor="pdf-upload-input"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#173D3A] text-white text-[12.5px] font-medium hover:bg-[#122F2D] cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Anexar PDF</span>
            </label>
            <input
              id="pdf-upload-input"
              type="file"
              multiple
              accept="application/pdf,.pdf"
              onChange={handlePdfUpload}
              className="hidden"
              disabled={isUploadingDoc}
            />
          </div>

          {docError && (
            <div className="flex items-center gap-2 p-2.5 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[12px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{docError}</span>
            </div>
          )}

          {documents.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-[#E3DCCF] rounded-[10px] bg-[#FBF9F4]">
              <FileText className="w-6 h-6 text-[#68706A] mx-auto mb-1.5 opacity-60" />
              <p className="text-[12.5px] text-[#68706A]">Nenhum PDF explicativo anexado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[12px] font-medium text-[#272C2B]">
                Documentos do briefing ({documents.length}):
              </span>
              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-[8px] bg-[#FBF9F4] border border-[#E3DCCF] text-[12.5px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[#173D3A] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-[#272C2B] truncate">{doc.fileName}</p>
                        <p className="text-[11px] text-[#68706A]">
                          Tipo: Documento do briefing • {(doc.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Salvo localmente
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id, doc.fileId)}
                        className="text-[#68706A] hover:text-red-600 p-1 transition-colors"
                        title="Remover documento"
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

      {/* ======================================================== */}
      {/* 3. SEÇÃO REFERÊNCIAS VISUAIS */}
      {/* ======================================================== */}
      {activeSection === 'images' && (
        <div className="space-y-4 p-4 rounded-[12px] bg-white border border-[#E3DCCF]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#272C2B]">Fotos e referências de inspiração</p>
              <p className="text-[11.5px] text-[#68706A]">
                Pinterest, capturas e fotos de iluminação, materiais ou atmosfera.
              </p>
            </div>
            <label
              htmlFor="image-upload-input"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#173D3A] text-white text-[12.5px] font-medium hover:bg-[#122F2D] cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar fotos</span>
            </label>
            <input
              id="image-upload-input"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploadingImg}
            />
          </div>

          {imgError && (
            <div className="flex items-center gap-2 p-2.5 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[12px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{imgError}</span>
            </div>
          )}

          {visualReferences.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-[#E3DCCF] rounded-[10px] bg-[#FBF9F4]">
              <ImageIcon className="w-6 h-6 text-[#68706A] mx-auto mb-1.5 opacity-60" />
              <p className="text-[12.5px] text-[#68706A]">Nenhuma referência visual adicionada ainda.</p>
              <p className="text-[11px] text-[#68706A]/80 mt-0.5">
                Aceitamos JPG, JPEG, PNG e WEBP.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-[12px] font-medium text-[#272C2B]">
                Referências adicionadas ({visualReferences.length}):
              </span>

              <div className="space-y-3">
                {visualReferences.map((ref) => (
                  <div
                    key={ref.id}
                    className="p-3 rounded-[10px] bg-[#FBF9F4] border border-[#E3DCCF] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Miniatura com clique para ampliar */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          onClick={() => {
                            if (objectUrls[ref.fileId]) {
                              setEnlargedImage({ url: objectUrls[ref.fileId], name: ref.fileName });
                            }
                          }}
                          className="relative w-14 h-14 rounded-[8px] overflow-hidden bg-[#E3DCCF]/50 border border-[#E3DCCF] shrink-0 cursor-pointer group"
                        >
                          {objectUrls[ref.fileId] ? (
                            <img
                              src={objectUrls[ref.fileId]}
                              alt={ref.fileName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#68706A]">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#272C2B] truncate">
                            {ref.fileName}
                          </p>
                          <p className="text-[11px] text-[#68706A]">
                            {(ref.fileSize / 1024).toFixed(1)} KB • Referência visual de inspiração
                          </p>
                          <span className="inline-block mt-0.5 text-[10.5px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Salvo localmente
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(ref.id, ref.fileId)}
                        className="text-[#68706A] hover:text-red-600 p-1 transition-colors shrink-0"
                        title="Remover referência"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Campo de Orientação / Instrução específica vinculada à imagem */}
                    <div className="space-y-1 pt-1 border-t border-[#E3DCCF]/60">
                      <label className="block text-[11.5px] font-medium text-[#272C2B]">
                        O que você quer aproveitar desta referência? (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Iluminação, materiais, distribuição, mobiliário ou atmosfera."
                        value={ref.instruction || ''}
                        onChange={(e) => handleUpdateImageInstruction(ref.id, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E3DCCF] text-[#272C2B] text-[12.5px] focus:outline-none focus:border-[#173D3A] transition-colors"
                      />
                    </div>

                    {/* Link de origem opcional */}
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5 text-[#68706A] shrink-0" />
                      <input
                        type="url"
                        placeholder="Link de origem (opcional, ex: Pinterest, Instagram)"
                        value={ref.sourceUrl || ''}
                        onChange={(e) => handleUpdateImageSourceUrl(ref.id, e.target.value)}
                        className="w-full px-2.5 py-1 rounded-[6px] bg-white/70 border border-[#E3DCCF] text-[#272C2B] text-[11.5px] focus:outline-none focus:border-[#173D3A] transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SEÇÃO GRAVAÇÃO DE ÁUDIO */}
      {/* ======================================================== */}
      {activeSection === 'audio' && (
        <div className="space-y-4 p-4 rounded-[12px] bg-white border border-[#E3DCCF]">
          <div className="space-y-1">
            <p className="text-[13px] font-medium text-[#272C2B]">Gravar áudio do briefing</p>
            <p className="text-[11.5px] text-[#68706A]">
              Fale livremente sobre suas preferências. O áudio será salvo e transcrito automaticamente em português quando suportado.
            </p>
          </div>

          {/* Área de Gravação Ativa */}
          {isRecording ? (
            <div className="p-4 rounded-[12px] bg-red-50/70 border border-red-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-red-700">Gravando áudio...</p>
                  <p className="text-[12px] font-mono text-red-600">{formatSeconds(recordingSeconds)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={stopAudioRecording}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 transition-colors shadow-xs"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Parar gravação</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-start">
              <button
                type="button"
                onClick={startAudioRecording}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#173D3A] text-white text-[13px] font-medium hover:bg-[#122F2D] transition-colors shadow-xs"
              >
                <Mic className="w-4 h-4" />
                <span>{audios.length === 0 ? 'Gravar áudio' : 'Gravar outro áudio'}</span>
              </button>
            </div>
          )}

          {recordingError && (
            <div className="flex items-center gap-2 p-2.5 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[12px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{recordingError}</span>
            </div>
          )}

          {transcriptionNotice && (
            <div className="p-2.5 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px]">
              {transcriptionNotice}
            </div>
          )}

          {/* Lista de Áudios Gravados */}
          {audios.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[#E3DCCF]/60">
              <span className="text-[12px] font-medium text-[#272C2B]">
                Áudios registrados ({audios.length}):
              </span>

              <div className="space-y-3">
                {audios.map((aud) => (
                  <div
                    key={aud.id}
                    className="p-3.5 rounded-[10px] bg-[#FBF9F4] border border-[#E3DCCF] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Volume2 className="w-4 h-4 text-[#173D3A] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium text-[#272C2B] truncate">
                            {aud.fileName}
                          </p>
                          <p className="text-[11px] text-[#68706A]">
                            Duração: {formatSeconds(aud.durationSeconds)} • {(aud.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Salvo localmente
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAudio(aud.id, aud.fileId)}
                          className="text-[#68706A] hover:text-red-600 p-1 transition-colors"
                          title="Excluir áudio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Player de reprodução */}
                    {objectUrls[aud.fileId] && (
                      <audio
                        controls
                        src={objectUrls[aud.fileId]}
                        className="w-full h-8 rounded"
                      />
                    )}

                    {/* Campo de transcrição e correção manual */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11.5px] font-medium text-[#272C2B]">
                          Transcrição do áudio (editável)
                        </label>
                        <span className="text-[10.5px] text-[#68706A]">
                          {aud.transcriptionStatus === 'completed' && 'Transcrição automática'}
                          {aud.transcriptionStatus === 'unavailable' && 'Transcrição indisponível'}
                          {aud.transcriptionStatus === 'manual' && 'Transcrição manual'}
                          {aud.transcriptionStatus === 'error' && 'Erro na transcrição'}
                        </span>
                      </div>

                      <textarea
                        rows={2}
                        placeholder="Digite ou corrija a transcrição deste áudio..."
                        value={aud.transcription || ''}
                        onChange={(e) => handleUpdateAudioTranscription(aud.id, e.target.value)}
                        className="w-full p-2.5 rounded-[8px] bg-white border border-[#E3DCCF] text-[#272C2B] text-[12.5px] leading-relaxed focus:outline-none focus:border-[#173D3A] transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Lightbox de Imagem Ampliada */}
      {enlargedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={enlargedImage.url}
              alt={enlargedImage.name}
              className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
            />
            <p className="text-white text-[13px] mt-2 text-center font-medium truncate max-w-full">
              {enlargedImage.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
