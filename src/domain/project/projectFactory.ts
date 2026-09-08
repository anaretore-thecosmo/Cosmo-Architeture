/**
 * COSMO ARCHITECTURE - Project Factory (Schema V3)
 * Fábrica pura para criação de instâncias de projetos neutros e compatíveis com Schema V3.
 */

import {
  Project,
  ProjectCategory,
  ProjectSubtype,
  StartingPoint,
  ProjectFile,
  FengShuiProject,
  SpatialOrientations,
  BriefingDocument,
  VisualReference,
  BriefingAudio,
} from './types';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface CreateProjectParams {
  name: string;
  category: ProjectCategory;
  subtype: ProjectSubtype;
  startingPoint: StartingPoint;
  originalText?: string;
  briefingText?: string;
  briefingDocuments?: BriefingDocument[];
  visualReferences?: VisualReference[];
  briefingAudios?: BriefingAudio[];
  files?: ProjectFile[];
  fengShuiBase?: 'planta_2d' | 'modelo_3d' | 'croqui' | 'sem_base' | string;
}

export function createInitialSpatialOrientations(): SpatialOrientations {
  return {
    geographicNorth: {
      confidenceLevel: 'requires_validation',
      confirmed: false,
    },
    magneticNorth: {
      confidenceLevel: 'requires_validation',
      confirmed: false,
    },
    magneticDeclination: {
      confidenceLevel: 'requires_validation',
      confirmed: false,
    },
    solarOrientation: {
      confidenceLevel: 'requires_validation',
      confirmed: false,
    },
    mainEntryAzimuth: {
      confidenceLevel: 'requires_validation',
      confirmed: false,
    },
  };
}

export function createProjectFromOnboarding(params: CreateProjectParams): Project {
  const now = new Date().toISOString();
  const projectId = generateUUID();

  const attachedFiles: ProjectFile[] = Array.isArray(params.files)
    ? params.files.map((file) => ({
        ...file,
        projectId,
      }))
    : [];

  const fengShuiProjects: FengShuiProject[] = [];

  // Se o ponto de partida for Feng Shui, cria um registro neutro registrando apenas a intenção explícita
  if (params.startingPoint === 'feng_shui') {
    fengShuiProjects.push({
      id: generateUUID(),
      projectId,
      name: 'Estudo Inicial de Feng Shui',
      sourceType: params.fengShuiBase,
      sourceFileId: attachedFiles.length > 0 ? attachedFiles[0].id : undefined,
      mainEntryConfirmed: false,
      orientations: createInitialSpatialOrientations(),
      occupantIds: [],
      objectives: [],
      pendingConfirmations: [],
      analyzedRoomIds: [],
      alternatives: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  const effectiveText = (params.briefingText || params.originalText || '').trim();

  // Mapeia documentos, referências visuais e áudios com o id do projeto
  const briefingDocs: BriefingDocument[] = Array.isArray(params.briefingDocuments)
    ? params.briefingDocuments.map((doc) => ({
        ...doc,
        projectId,
      }))
    : [];

  const visualRefs: VisualReference[] = Array.isArray(params.visualReferences)
    ? params.visualReferences.map((ref) => ({
        ...ref,
        projectId,
      }))
    : [];

  const briefingAuds: BriefingAudio[] = Array.isArray(params.briefingAudios)
    ? params.briefingAudios.map((aud) => ({
        ...aud,
        projectId,
      }))
    : [];

  const project: Project = {
    schemaVersion: 3,
    id: projectId,
    name: params.name.trim(),
    category: params.category,
    subtype: params.subtype.trim(),
    startingPoint: params.startingPoint,
    stage: 'concept',
    createdAt: now,
    updatedAt: now,
    brief: {
      id: generateUUID(),
      projectId,
      goals: effectiveText ? [effectiveText] : [],
      briefingText: effectiveText || undefined,
      documents: briefingDocs.length > 0 ? briefingDocs : undefined,
      visualReferences: visualRefs.length > 0 ? visualRefs : undefined,
      audios: briefingAuds.length > 0 ? briefingAuds : undefined,
      createdAt: now,
      updatedAt: now,
    },
    people: [],
    rooms: [],
    files: attachedFiles,
    versions: [],
    analyses: [],
    engineeringProjects: [],
    fengShuiProjects,
    collaborators: [],
  };

  return project;
}
