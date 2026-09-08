/**
 * COSMO ARCHITECTURE - Project Store
 * Gerenciamento assíncrono de projetos com persistência de metadados no localStorage
 * e orquestração de arquivos binários no FileStorageService.
 */

import { Project, ProjectFile } from '../../domain/project/types';
import { FileStorageService, sanitizeProjectForStorage, FileStorageOperationError } from './fileStorage';

const LOCAL_STORAGE_KEY = 'cosmo_architecture_projects_v3';

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

export class ProjectStore {
  private fileStorageService: FileStorageService;
  private storageKey: string;

  constructor(fileStorageService?: FileStorageService, storageKey: string = LOCAL_STORAGE_KEY) {
    this.fileStorageService = fileStorageService || new FileStorageService();
    this.storageKey = storageKey;
  }

  private readRawProjectsMap(): Record<string, Project> {
    if (typeof localStorage === 'undefined') {
      return {};
    }
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }

  private writeRawProjectsMap(map: Record<string, Project>): void {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage não está disponível no ambiente atual.');
    }
    localStorage.setItem(this.storageKey, JSON.stringify(map));
  }

  /**
   * Salva o projeto sanitizado no localStorage.
   */
  async saveProject(project: Project): Promise<void> {
    const sanitized = sanitizeProjectForStorage(project);
    sanitized.updatedAt = new Date().toISOString();

    const map = this.readRawProjectsMap();
    map[sanitized.id] = sanitized;
    this.writeRawProjectsMap(map);
  }

  /**
   * Obtém um projeto pelo ID. Se hydrate for true, reidrata o status dos arquivos.
   */
  async getProject(projectId: string, hydrate: boolean = true): Promise<Project | null> {
    const map = this.readRawProjectsMap();
    const rawProject = map[projectId];

    if (!rawProject) {
      return null;
    }

    if (!hydrate) {
      return sanitizeProjectForStorage(rawProject);
    }

    return await this.fileStorageService.rehydrateProjectFiles(rawProject);
  }

  /**
   * Obtém todos os projetos salvos.
   */
  async getAllProjects(hydrate: boolean = true): Promise<Project[]> {
    const map = this.readRawProjectsMap();
    const projectsList = Object.values(map);

    if (!hydrate) {
      return projectsList.map((p) => sanitizeProjectForStorage(p));
    }

    const rehydratedList: Project[] = [];
    for (const project of projectsList) {
      const rehydrated = await this.fileStorageService.rehydrateProjectFiles(project);
      rehydratedList.push(rehydrated);
    }

    return rehydratedList;
  }

  /**
   * Arquiva o projeto sem remover metadados nem binários.
   */
  async archiveProject(projectId: string): Promise<Project> {
    const map = this.readRawProjectsMap();
    const project = map[projectId];

    if (!project) {
      throw new Error(`Projeto ${projectId} não encontrado para arquivamento.`);
    }

    const now = new Date().toISOString();
    project.archivedAt = now;
    project.updatedAt = now;

    map[projectId] = sanitizeProjectForStorage(project);
    this.writeRawProjectsMap(map);

    return project;
  }

  /**
   * Restaura um projeto arquivado.
   */
  async restoreProject(projectId: string): Promise<Project> {
    const map = this.readRawProjectsMap();
    const project = map[projectId];

    if (!project) {
      throw new Error(`Projeto ${projectId} não encontrado para restauração.`);
    }

    delete project.archivedAt;
    project.updatedAt = new Date().toISOString();

    map[projectId] = sanitizeProjectForStorage(project);
    this.writeRawProjectsMap(map);

    return project;
  }

  /**
   * Exclusão permanente de um projeto:
   * Limpa primeiro todos os binários associados no IndexedDB.
   * Se a limpeza dos binários falhar, NÃO remove os metadados do projeto do localStorage.
   */
  async deleteProjectPermanently(projectId: string): Promise<void> {
    const map = this.readRawProjectsMap();
    const project = map[projectId];

    if (!project) {
      // Se já não existe, não há o que excluir
      return;
    }

    // 1. Tentar excluir todos os binários no IndexedDB
    try {
      await this.fileStorageService.deleteProjectBinaries(projectId);
    } catch (error) {
      // Falha na limpeza dos binários: não remove metadados
      throw new FileStorageOperationError(
        `Falha ao excluir binários do projeto ${projectId}. Os metadados foram preservados para evitar perda parcial de integridade.`,
        error
      );
    }

    // 2. Apenas se os binários foram excluídos com sucesso, remove os metadados do localStorage
    delete map[projectId];
    this.writeRawProjectsMap(map);
  }

  /**
   * Exporta os metadados do projeto sanitizados em JSON (sem binários).
   */
  async exportProject(projectId: string): Promise<string> {
    const map = this.readRawProjectsMap();
    const project = map[projectId];

    if (!project) {
      throw new Error(`Projeto ${projectId} não encontrado para exportação.`);
    }

    const sanitized = sanitizeProjectForStorage(project);
    return JSON.stringify(sanitized, null, 2);
  }

  /**
   * Importa um projeto de uma string ou objeto serializado.
   * - Evita colisão de projectId e fileIds.
   * - Atualiza referências internas conhecidas.
   * - Migra arquivos legados com dataUrl para o IndexedDB sem mantê-los no localStorage.
   * - Não inventa conteúdo ausente.
   */
  async importProject(serializedProject: string | object): Promise<Project> {
    let parsed: any;
    if (typeof serializedProject === 'string') {
      try {
        parsed = JSON.parse(serializedProject);
      } catch (err) {
        throw new Error(`Conteúdo de projeto inválido para importação: ${(err as Error).message}`);
      }
    } else {
      parsed = JSON.parse(JSON.stringify(serializedProject));
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Formato de projeto inválido para importação.');
    }

    const map = this.readRawProjectsMap();
    const originalProjectId = parsed.id || generateUUID();
    let finalProjectId = originalProjectId;

    // Se já existe um projeto com este ID, gera um novo ID para evitar colisão
    const hasProjectCollision = Boolean(map[originalProjectId]);
    if (hasProjectCollision) {
      finalProjectId = generateUUID();
    }

    // Mapeamento de IDs para referências internas
    const fileIdMap = new Map<string, string>();
    const roomIdMap = new Map<string, string>();
    const personIdMap = new Map<string, string>();

    // Processamento de Pessoas
    const processedPeople = Array.isArray(parsed.people)
      ? parsed.people.map((person: any) => {
          const oldId = person.id || generateUUID();
          const newId = hasProjectCollision ? generateUUID() : oldId;
          personIdMap.set(oldId, newId);
          return {
            ...person,
            id: newId,
            projectId: finalProjectId,
          };
        })
      : [];

    // Processamento de Ambientes
    const processedRooms = Array.isArray(parsed.rooms)
      ? parsed.rooms.map((room: any) => {
          const oldId = room.id || generateUUID();
          const newId = hasProjectCollision ? generateUUID() : oldId;
          roomIdMap.set(oldId, newId);

          const updatedOccupantIds = Array.isArray(room.occupantIds)
            ? room.occupantIds.map((id: string) => personIdMap.get(id) || id)
            : [];

          return {
            ...room,
            id: newId,
            projectId: finalProjectId,
            occupantIds: updatedOccupantIds,
          };
        })
      : [];

    // Processamento de Arquivos e migração de dataUrl legados
    const processedFiles: ProjectFile[] = [];
    if (Array.isArray(parsed.files)) {
      for (const rawFile of parsed.files) {
        const oldFileId = rawFile.id || generateUUID();
        const newFileId = hasProjectCollision ? generateUUID() : oldFileId;
        fileIdMap.set(oldFileId, newFileId);

        const fileToMigrate = {
          ...rawFile,
          id: newFileId,
          projectId: finalProjectId,
        };

        const migratedFile = await this.fileStorageService.migrateLegacyFile(
          fileToMigrate,
          finalProjectId
        );
        processedFiles.push(migratedFile);
      }
    }

    // Processamento de Projetos de Engenharia
    const processedEngineering = Array.isArray(parsed.engineeringProjects)
      ? parsed.engineeringProjects.map((eng: any) => {
          const updatedLinkedFiles = Array.isArray(eng.linkedFileIds)
            ? eng.linkedFileIds.map((id: string) => fileIdMap.get(id) || id)
            : [];
          const updatedRelatedRooms = Array.isArray(eng.relatedRoomIds)
            ? eng.relatedRoomIds.map((id: string) => roomIdMap.get(id) || id)
            : [];

          const updatedDecisions = Array.isArray(eng.decisions)
            ? eng.decisions.map((dec: any) => ({
                ...dec,
                linkedFileIds: Array.isArray(dec.linkedFileIds)
                  ? dec.linkedFileIds.map((id: string) => fileIdMap.get(id) || id)
                  : [],
              }))
            : [];

          const updatedValidation = eng.professionalValidation
            ? {
                ...eng.professionalValidation,
                documentFileId: eng.professionalValidation.documentFileId
                  ? fileIdMap.get(eng.professionalValidation.documentFileId) ||
                    eng.professionalValidation.documentFileId
                  : undefined,
              }
            : undefined;

          return {
            ...eng,
            id: hasProjectCollision ? generateUUID() : eng.id || generateUUID(),
            projectId: finalProjectId,
            linkedFileIds: updatedLinkedFiles,
            relatedRoomIds: updatedRelatedRooms,
            decisions: updatedDecisions,
            professionalValidation: updatedValidation,
          };
        })
      : [];

    // Processamento de Estudos de Feng Shui
    const processedFengShui = Array.isArray(parsed.fengShuiProjects)
      ? parsed.fengShuiProjects.map((fs: any) => {
          const updatedOccupants = Array.isArray(fs.occupantIds)
            ? fs.occupantIds.map((id: string) => personIdMap.get(id) || id)
            : [];
          const updatedRooms = Array.isArray(fs.analyzedRoomIds)
            ? fs.analyzedRoomIds.map((id: string) => roomIdMap.get(id) || id)
            : [];
          const updatedSourceFileId = fs.sourceFileId
            ? fileIdMap.get(fs.sourceFileId) || fs.sourceFileId
            : undefined;

          const updatedValidation = fs.professionalValidation
            ? {
                ...fs.professionalValidation,
                documentFileId: fs.professionalValidation.documentFileId
                  ? fileIdMap.get(fs.professionalValidation.documentFileId) ||
                    fs.professionalValidation.documentFileId
                  : undefined,
              }
            : undefined;

          return {
            ...fs,
            id: hasProjectCollision ? generateUUID() : fs.id || generateUUID(),
            projectId: finalProjectId,
            occupantIds: updatedOccupants,
            analyzedRoomIds: updatedRooms,
            sourceFileId: updatedSourceFileId,
            professionalValidation: updatedValidation,
          };
        })
      : [];

    // Processamento de Análises
    const processedAnalyses = Array.isArray(parsed.analyses)
      ? parsed.analyses.map((an: any) => ({
          ...an,
          id: hasProjectCollision ? generateUUID() : an.id || generateUUID(),
          projectId: finalProjectId,
          linkedFileIds: Array.isArray(an.linkedFileIds)
            ? an.linkedFileIds.map((id: string) => fileIdMap.get(id) || id)
            : [],
          relatedRoomIds: Array.isArray(an.relatedRoomIds)
            ? an.relatedRoomIds.map((id: string) => roomIdMap.get(id) || id)
            : [],
        }))
      : [];

    // Processamento de Versões
    const processedVersions = Array.isArray(parsed.versions)
      ? parsed.versions.map((ver: any) => ({
          ...ver,
          id: hasProjectCollision ? generateUUID() : ver.id || generateUUID(),
          projectId: finalProjectId,
        }))
      : [];

    // Processamento de Membros de Colaboração
    const processedCollaborators = Array.isArray(parsed.collaborators)
      ? parsed.collaborators.map((col: any) => ({
          ...col,
          id: hasProjectCollision ? generateUUID() : col.id || generateUUID(),
          projectId: finalProjectId,
        }))
      : [];

    // Montagem do Briefing
    const processedBrief = parsed.brief
      ? {
          ...parsed.brief,
          id: parsed.brief.id || generateUUID(),
          projectId: finalProjectId,
          siteContext: parsed.brief.siteContext
            ? {
                ...parsed.brief.siteContext,
                id: parsed.brief.siteContext.id || generateUUID(),
                projectId: finalProjectId,
              }
            : undefined,
        }
      : {
          id: generateUUID(),
          projectId: finalProjectId,
          goals: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    const finalCover = parsed.cover
      ? {
          ...parsed.cover,
          fileId: parsed.cover.fileId ? fileIdMap.get(parsed.cover.fileId) || parsed.cover.fileId : undefined,
        }
      : undefined;

    const importedProject: Project = {
      schemaVersion: 3,
      id: finalProjectId,
      ownerId: parsed.ownerId,
      name: parsed.name || 'Projeto Importado',
      description: parsed.description,
      category: parsed.category || 'other',
      subtype: parsed.subtype || 'other',
      startingPoint: parsed.startingPoint || 'idea',
      stage: parsed.stage || 'concept',
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: parsed.archivedAt,
      cover: finalCover,
      location: parsed.location,
      brief: processedBrief,
      people: processedPeople,
      rooms: processedRooms,
      files: processedFiles,
      versions: processedVersions,
      currentVersionId: parsed.currentVersionId,
      analyses: processedAnalyses,
      engineeringProjects: processedEngineering,
      fengShuiProjects: processedFengShui,
      collaborators: processedCollaborators,
    };

    // Salvar o projeto sanitizado no localStorage
    await this.saveProject(importedProject);

    return importedProject;
  }
}
