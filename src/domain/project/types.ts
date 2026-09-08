/**
 * COSMO ARCHITECTURE - Schema V3 Domain Types
 * Modelo de domínio extensível e neutro para projetos de arquitetura e engenharia.
 */

export type SchemaVersion = 3;

export type ConfidenceLevel =
  | 'confirmed'
  | 'informed'
  | 'estimate'
  | 'inference'
  | 'requires_validation';

export type ProjectCategory = 'residential' | 'commercial' | 'other' | (string & {});

export type ProjectSubtype =
  | 'single_family_home'
  | 'apartment'
  | 'country_house'
  | 'commercial_store'
  | 'office'
  | 'restaurant'
  | 'hotel'
  | 'mixed_use'
  | (string & {});

export type StartingPoint =
  | 'existing_plan'
  | 'idea'
  | 'feng_shui'
  | (string & {});

export type ProjectStage =
  | 'concept'
  | 'preliminary'
  | 'developed'
  | 'executive'
  | 'construction'
  | 'as_built'
  | (string & {});

export type StorageLocation = 'local_indexeddb' | 'storage_bucket';

export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'available'
  | 'error'
  | 'deleted';

export type SourceKind =
  | 'client_interview'
  | 'uploaded_document'
  | 'briefing_document'
  | 'briefing_text'
  | 'briefing_audio'
  | 'visual_reference_inspiration'
  | 'existing_space_photo'
  | 'architectural_plan'
  | 'sketch'
  | '3d_model'
  | 'audio_recording'
  | 'manual_entry'
  | 'survey'
  | 'ai_inference'
  | 'cad_import'
  | 'bim_import'
  | (string & {});

/**
 * Proveniência detalhada para rastrear origem e confiabilidade da informação.
 */
export interface ProvenanceRecord {
  sourceKind: SourceKind;
  sourceId?: string;
  sourceDescription?: string;
  capturedAt?: string;
  confidenceLevel: ConfidenceLevel;
  confirmed: boolean;
  notes?: string;
}

/**
 * Metadados de arquivo persistido.
 * Não inclui nem exige dataUrl, base64, Blob ou conteúdo binário no modelo persistido.
 */
export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  sourceKind: SourceKind;
  storageLocation: StorageLocation;
  storagePath?: string;
  uploadStatus: UploadStatus;
  provenance?: ProvenanceRecord;
}

export interface ProjectLocation {
  address?: string;
  city?: string;
  stateOrRegion?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  elevationMeters?: number;
  climateZone?: string;
  provenance?: ProvenanceRecord;
}

export interface ProjectCover {
  fileId?: string;
  altText?: string;
}

export interface PersonProfile {
  id: string;
  projectId: string;
  name: string;
  role?: string;
  birthDate?: string;
  preferences?: string[];
  specialNeeds?: string[];
  notes?: string;
  provenance?: ProvenanceRecord;
  createdAt: string;
  updatedAt: string;
}

export interface RoomRequirement {
  id: string;
  projectId: string;
  name: string;
  category?: string;
  targetAreaMin?: number;
  targetAreaMax?: number;
  floorLevel?: number | string;
  orientationPreferences?: string[];
  occupantIds: string[];
  notes?: string;
  provenance?: ProvenanceRecord;
  createdAt: string;
  updatedAt: string;
}

export interface SiteContext {
  id: string;
  projectId: string;
  terrainSlope?: string;
  soilType?: string;
  climateZone?: string;
  surroundingNotes?: string;
  sunPathNotes?: string;
  windPatternNotes?: string;
  legalConstraints?: string[];
  provenance?: ProvenanceRecord;
  createdAt: string;
  updatedAt: string;
}

export type TranscriptionStatus =
  | 'idle'
  | 'processing'
  | 'completed'
  | 'unavailable'
  | 'error'
  | 'manual';

/**
 * Referência visual de inspiração.
 * Não é classificada automaticamente como planta, croqui, modelo ou espaço existente.
 */
export interface VisualReference {
  id: string;
  projectId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  classification: 'visual_reference_inspiration';
  instruction?: string; // O que você quer aproveitar desta referência
  sourceUrl?: string; // Link de origem opcional (ex: Pinterest)
  createdAt: string;
  updatedAt: string;
}

/**
 * Áudio do briefing com transcrição vinculada.
 */
export interface BriefingAudio {
  id: string;
  projectId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSeconds: number;
  transcription?: string;
  transcriptionStatus: TranscriptionStatus;
  transcriptionError?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Documento explicativo anexado ao briefing.
 */
export interface BriefingDocument {
  id: string;
  projectId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  classification: 'briefing_document';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBrief {
  id: string;
  projectId: string;
  goals: string[]; // Preserva retrocompatibilidade
  briefingText?: string; // Texto escrito ou colado
  documents?: BriefingDocument[]; // PDFs explicativos
  visualReferences?: VisualReference[]; // Imagens e fotos de inspiração
  audios?: BriefingAudio[]; // Áudios gravados e transcrições
  budgetNotes?: string;
  timelineNotes?: string;
  stylePreferences?: string[];
  siteContext?: SiteContext;
  provenance?: ProvenanceRecord;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  name: string;
  description?: string;
  snapshotReferenceId?: string;
  changesSummary?: string[];
  createdAt: string;
  createdBy?: string;
}

export interface AnalysisRecord {
  id: string;
  projectId: string;
  type: string;
  status: string;
  summary?: string;
  findings?: string[];
  linkedFileIds: string[];
  relatedRoomIds: string[];
  confidenceLevel: ConfidenceLevel;
  provenance?: ProvenanceRecord;
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationMember {
  id: string;
  projectId: string;
  userId?: string;
  name: string;
  email?: string;
  role: string;
  permissions: string[];
  addedAt: string;
}

/**
 * Validação profissional independente.
 * Pode existir sem ter sido validada (isValidated = false) e sem preenchimento automático.
 */
export interface ProfessionalValidation {
  id: string;
  professionalType?: string;
  professionalName?: string;
  specialty?: string;
  councilName?: string;
  councilRegistrationNumber?: string;
  documentType?: string;
  documentNumber?: string;
  date?: string;
  notes?: string;
  documentFileId?: string;
  isValidated: boolean;
  validatedAt?: string;
}

export interface EngineeringDecision {
  id: string;
  title: string;
  rationale?: string;
  decidedBy?: string;
  decidedAt?: string;
  linkedFileIds?: string[];
}

export interface EngineeringPendingItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  assignedTo?: string;
  dueDate?: string;
}

export interface EngineeringAlternative {
  id: string;
  name: string;
  description?: string;
  pros?: string[];
  cons?: string[];
  costEstimate?: string;
}

export interface EngineeringHistoryEntry {
  id: string;
  action: string;
  description?: string;
  timestamp: string;
  actor?: string;
}

/**
 * Projeto de Engenharia com disciplina como texto livre, suportando múltiplos registros.
 */
export interface EngineeringProject {
  id: string;
  projectId: string;
  name: string;
  discipline: string; // Aceita qualquer texto livre
  description?: string;
  status: string;
  priority: string;
  linkedFileIds: string[];
  relatedRoomIds: string[];
  relatedEngineeringProjectIds: string[];
  decisions: EngineeringDecision[];
  pendingItems: EngineeringPendingItem[];
  alternatives: EngineeringAlternative[];
  history: EngineeringHistoryEntry[];
  professionalValidation?: ProfessionalValidation;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

/**
 * Dimensão única de orientação espacial.
 * As dimensões são independentes e não inferem dados entre si.
 */
export interface OrientationDimension {
  value?: number | string;
  method?: string;
  source?: string;
  measurementDate?: string;
  confidenceLevel: ConfidenceLevel;
  confirmed: boolean;
}

/**
 * Orientações espaciais com cinco dimensões independentes.
 */
export interface SpatialOrientations {
  geographicNorth: OrientationDimension;
  magneticNorth: OrientationDimension;
  magneticDeclination: OrientationDimension;
  solarOrientation: OrientationDimension;
  mainEntryAzimuth: OrientationDimension;
}

export interface FengShuiAlternative {
  id: string;
  name: string;
  description?: string;
  consideredAt?: string;
}

/**
 * Estudo de Feng Shui.
 * Começa neutro, sem metodologia, escola, morador ou orientação presumida.
 */
export interface FengShuiProject {
  id: string;
  projectId: string;
  name?: string;
  methodology?: string;
  approach?: string;
  sourceType?: string;
  sourceFileId?: string;
  mainEntryDescription?: string;
  mainEntryConfirmed: boolean;
  orientations: SpatialOrientations;
  occupantIds: string[];
  objectives: string[];
  pendingConfirmations: string[];
  analyzedRoomIds: string[];
  alternatives: FengShuiAlternative[];
  professionalValidation?: ProfessionalValidation;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

/**
 * Entidade raiz do Projeto - Schema V3.
 */
export interface Project {
  schemaVersion: SchemaVersion;
  id: string;
  ownerId?: string;
  name: string;
  description?: string;
  category: ProjectCategory;
  subtype: ProjectSubtype;
  startingPoint: StartingPoint;
  stage: ProjectStage;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  cover?: ProjectCover;
  location?: ProjectLocation;
  brief: ProjectBrief;
  people: PersonProfile[];
  rooms: RoomRequirement[];
  files: ProjectFile[];
  versions: ProjectVersion[];
  currentVersionId?: string;
  analyses: AnalysisRecord[];
  engineeringProjects: EngineeringProject[];
  fengShuiProjects: FengShuiProject[];
  collaborators: CollaborationMember[];
}
