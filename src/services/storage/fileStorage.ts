/**
 * COSMO ARCHITECTURE - File Storage Service
 * Gerenciamento de metadados e conteúdo binário de arquivos no armazenamento local.
 */

import { Project, ProjectFile, SourceKind } from '../../domain/project/types';
import { IFileStorageAdapter, LocalFileStorageAdapter, StoredBinaryRecord } from './storageAdapter';

export class FileStorageOperationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'FileStorageOperationError';
  }
}

export class FileBinaryNotFoundError extends Error {
  constructor(public readonly fileId: string) {
    super(`Conteúdo binário do arquivo ${fileId} não foi encontrado.`);
    this.name = 'FileBinaryNotFoundError';
  }
}

/**
 * Converte dataUrl ou base64 para Uint8Array e extrai o mimeType.
 */
export function decodeDataUrlOrBase64(input: string): { bytes: Uint8Array; mimeType: string } {
  const match = input.match(/^data:([^;]+);base64,(.*)$/);
  if (match) {
    const mimeType = match[1];
    const base64Data = match[2];
    const binaryString =
      typeof atob === 'function'
        ? atob(base64Data)
        : Buffer.from(base64Data, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return { bytes, mimeType };
  }

  // Se for base64 puro sem prefixo data:
  try {
    const binaryString =
      typeof atob === 'function'
        ? atob(input)
        : Buffer.from(input, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return { bytes, mimeType: 'application/octet-stream' };
  } catch {
    const encoder = new TextEncoder();
    return { bytes: encoder.encode(input), mimeType: 'text/plain' };
  }
}

/**
 * Produz uma versão serializável e sanitizada do projeto sem nenhum conteúdo binário embutido.
 * Remove dataUrl, base64, Blob, ArrayBuffer, File ou dados transitórios.
 */
export function sanitizeProjectForStorage(project: Project): Project {
  const cloned = JSON.parse(JSON.stringify(project)) as Project;

  if (Array.isArray(cloned.files)) {
    cloned.files = cloned.files.map((file: any) => {
      const sanitizedFile: ProjectFile = {
        id: String(file.id),
        projectId: String(file.projectId),
        name: String(file.name),
        mimeType: String(file.mimeType || 'application/octet-stream'),
        size: typeof file.size === 'number' ? file.size : 0,
        createdAt: file.createdAt || new Date().toISOString(),
        updatedAt: file.updatedAt || new Date().toISOString(),
        sourceKind: (file.sourceKind || 'manual_entry') as SourceKind,
        storageLocation: (file.storageLocation || 'local_indexeddb'),
        storagePath: file.storagePath || `projects/${file.projectId}/files/${file.id}`,
        uploadStatus: file.uploadStatus || 'available',
        provenance: file.provenance ? { ...file.provenance } : undefined,
      };

      // Garante exclusão explícita de campos binários não canônicos
      delete (sanitizedFile as any).dataUrl;
      delete (sanitizedFile as any).base64;
      delete (sanitizedFile as any).content;
      delete (sanitizedFile as any).data;
      delete (sanitizedFile as any).blob;
      delete (sanitizedFile as any).file;

      return sanitizedFile;
    });
  }

  return cloned;
}

export class FileStorageService {
  private adapter: IFileStorageAdapter;

  constructor(adapter?: IFileStorageAdapter) {
    this.adapter = adapter || new LocalFileStorageAdapter();
  }

  /**
   * Salva o binário no storage adapter e devolve ProjectFile sanitizado apenas com metadados.
   */
  async saveFileBinary(
    fileId: string,
    projectId: string,
    content: Blob | ArrayBuffer | Uint8Array | string,
    metadata: {
      name: string;
      mimeType?: string;
      size?: number;
      sourceKind?: SourceKind;
      createdAt?: string;
    }
  ): Promise<ProjectFile> {
    try {
      let finalContent: Blob | ArrayBuffer | Uint8Array;
      let finalMimeType = metadata.mimeType || 'application/octet-stream';
      let finalSize = metadata.size;

      if (typeof content === 'string') {
        const decoded = decodeDataUrlOrBase64(content);
        finalContent = decoded.bytes;
        if (!metadata.mimeType || metadata.mimeType === 'application/octet-stream') {
          finalMimeType = decoded.mimeType;
        }
        finalSize = finalContent.byteLength;
      } else {
        finalContent = content;
        if (finalSize === undefined) {
          if (content instanceof Blob) {
            finalSize = content.size;
          } else if (content instanceof ArrayBuffer || content instanceof Uint8Array) {
            finalSize = content.byteLength;
          } else {
            finalSize = 0;
          }
        }
      }

      await this.adapter.save(fileId, projectId, finalContent, {
        mimeType: finalMimeType,
        size: finalSize,
        createdAt: metadata.createdAt,
      });

      const now = new Date().toISOString();
      const projectFile: ProjectFile = {
        id: fileId,
        projectId,
        name: metadata.name,
        mimeType: finalMimeType,
        size: finalSize || 0,
        createdAt: metadata.createdAt || now,
        updatedAt: now,
        sourceKind: metadata.sourceKind || 'uploaded_document',
        storageLocation: 'local_indexeddb',
        storagePath: `projects/${projectId}/files/${fileId}`,
        uploadStatus: 'available',
        provenance: {
          sourceKind: metadata.sourceKind || 'uploaded_document',
          confidenceLevel: 'confirmed',
          confirmed: true,
          capturedAt: now,
        },
      };

      return projectFile;
    } catch (error) {
      throw new FileStorageOperationError(
        `Falha ao salvar conteúdo binário do arquivo ${fileId}: ${(error as Error).message}`,
        error
      );
    }
  }

  /**
   * Recupera o registro binário armazenado.
   */
  async getFileBinary(fileId: string): Promise<StoredBinaryRecord> {
    try {
      const record = await this.adapter.get(fileId);
      if (!record) {
        throw new FileBinaryNotFoundError(fileId);
      }
      return record;
    } catch (error) {
      if (error instanceof FileBinaryNotFoundError) {
        throw error;
      }
      throw new FileStorageOperationError(
        `Falha ao consultar conteúdo binário do arquivo ${fileId}: ${(error as Error).message}`,
        error
      );
    }
  }

  /**
   * Reidrata arquivos ao carregar um projeto:
   * Verifica a integridade dos binários no IndexedDB e atualiza o uploadStatus.
   * Nunca declara um arquivo como 'available' se o IndexedDB falhar ou o registro não existir.
   */
  async rehydrateProjectFiles(project: Project): Promise<Project> {
    const cloned = sanitizeProjectForStorage(project);

    if (!Array.isArray(cloned.files) || cloned.files.length === 0) {
      return cloned;
    }

    const rehydratedFiles: ProjectFile[] = [];

    for (const file of cloned.files) {
      try {
        const binaryExists = await this.adapter.exists(file.id);

        if (binaryExists) {
          rehydratedFiles.push({
            ...file,
            uploadStatus: 'available',
          });
        } else {
          rehydratedFiles.push({
            ...file,
            uploadStatus: 'error',
            provenance: {
              sourceKind: file.sourceKind || 'manual_entry',
              confidenceLevel: 'requires_validation',
              confirmed: false,
              notes: 'Conteúdo binário não encontrado no armazenamento local (IndexedDB).',
            },
          });
        }
      } catch (err) {
        rehydratedFiles.push({
          ...file,
          uploadStatus: 'error',
          provenance: {
            sourceKind: file.sourceKind || 'manual_entry',
            confidenceLevel: 'requires_validation',
            confirmed: false,
            notes: `Erro ao validar armazenamento local: ${(err as Error).message}`,
          },
        });
      }
    }

    cloned.files = rehydratedFiles;
    return cloned;
  }

  /**
   * Exclui o binário individual de um arquivo.
   */
  async deleteFileBinary(fileId: string): Promise<void> {
    try {
      await this.adapter.delete(fileId);
    } catch (error) {
      throw new FileStorageOperationError(
        `Falha ao excluir binário do arquivo ${fileId}: ${(error as Error).message}`,
        error
      );
    }
  }

  /**
   * Exclui todos os binários associados a um projeto.
   */
  async deleteProjectBinaries(projectId: string): Promise<void> {
    try {
      await this.adapter.deleteByProject(projectId);
    } catch (error) {
      throw new FileStorageOperationError(
        `Falha ao excluir binários do projeto ${projectId}: ${(error as Error).message}`,
        error
      );
    }
  }

  /**
   * Migra arquivo legado (com dataUrl ou base64) para o IndexedDB e devolve metadados sanitizados.
   */
  async migrateLegacyFile(legacyFile: any, projectId: string): Promise<ProjectFile> {
    const fileId = legacyFile.id || crypto.randomUUID();
    const dataUrl = legacyFile.dataUrl || legacyFile.base64 || legacyFile.content;

    if (dataUrl && typeof dataUrl === 'string') {
      try {
        return await this.saveFileBinary(fileId, projectId, dataUrl, {
          name: legacyFile.name || 'arquivo_importado',
          mimeType: legacyFile.mimeType,
          size: legacyFile.size,
          sourceKind: legacyFile.sourceKind,
          createdAt: legacyFile.createdAt,
        });
      } catch (err) {
        // Se a gravação falhar, não descarta silenciosamente o arquivo legado: marca como erro
        const fallbackFile: ProjectFile = {
          id: fileId,
          projectId,
          name: legacyFile.name || 'arquivo_importado',
          mimeType: legacyFile.mimeType || 'application/octet-stream',
          size: legacyFile.size || 0,
          createdAt: legacyFile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sourceKind: legacyFile.sourceKind || 'uploaded_document',
          storageLocation: 'local_indexeddb',
          storagePath: `projects/${projectId}/files/${fileId}`,
          uploadStatus: 'error',
          provenance: {
            sourceKind: legacyFile.sourceKind || 'uploaded_document',
            confidenceLevel: 'requires_validation',
            confirmed: false,
            notes: `Falha ao migrar arquivo legado para IndexedDB: ${(err as Error).message}`,
          },
        };
        return fallbackFile;
      }
    }

    // Se já não possuía dataUrl
    return sanitizeProjectForStorage({ files: [legacyFile] } as any).files[0];
  }
}
