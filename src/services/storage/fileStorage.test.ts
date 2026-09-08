import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalFileStorageAdapter } from './storageAdapter';
import { FileStorageService, sanitizeProjectForStorage, FileStorageOperationError } from './fileStorage';
import { ProjectStore } from './projectStore';
import { Project } from '../../domain/project/types';

// Polyfill de localStorage caso o ambiente de execução não possua DOM completo
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new LocalStorageMock() as unknown as Storage;
}

describe('COSMO ARCHITECTURE - Storage Engine & File Storage Service', () => {
  let adapter: LocalFileStorageAdapter;
  let fileService: FileStorageService;
  let projectStore: ProjectStore;

  const mockProject: Project = {
    schemaVersion: 3,
    id: 'proj-teste-01',
    name: 'Residência Terracota',
    category: 'residential',
    subtype: 'single_family_home',
    startingPoint: 'existing_plan',
    stage: 'concept',
    createdAt: '2026-08-23T19:00:00.000Z',
    updatedAt: '2026-08-23T19:00:00.000Z',
    brief: {
      id: 'brief-01',
      projectId: 'proj-teste-01',
      goals: ['Integração com a paisagem'],
      createdAt: '2026-08-23T19:00:00.000Z',
      updatedAt: '2026-08-23T19:00:00.000Z',
    },
    people: [
      {
        id: 'person-01',
        projectId: 'proj-teste-01',
        name: 'Ana',
        createdAt: '2026-08-23T19:00:00.000Z',
        updatedAt: '2026-08-23T19:00:00.000Z',
      },
    ],
    rooms: [
      {
        id: 'room-01',
        projectId: 'proj-teste-01',
        name: 'Ateliê',
        occupantIds: ['person-01'],
        createdAt: '2026-08-23T19:00:00.000Z',
        updatedAt: '2026-08-23T19:00:00.000Z',
      },
    ],
    files: [],
    versions: [],
    analyses: [],
    engineeringProjects: [],
    fengShuiProjects: [],
    collaborators: [],
  };

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalFileStorageAdapter();
    fileService = new FileStorageService(adapter);
    projectStore = new ProjectStore(fileService);
  });

  it('1. salva e recupera conteúdo binário via LocalFileStorageAdapter', async () => {
    const fileId = 'file-bin-01';
    const projectId = 'proj-teste-01';
    const textContent = 'CONTEÚDO_DWG_BINÁRIO_TESTE';
    const encoder = new TextEncoder();
    const bytes = encoder.encode(textContent);

    await adapter.save(fileId, projectId, bytes, {
      mimeType: 'application/acad',
      size: bytes.byteLength,
    });

    const exists = await adapter.exists(fileId);
    expect(exists).toBe(true);

    const retrieved = await adapter.get(fileId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.fileId).toBe(fileId);
    expect(retrieved?.projectId).toBe(projectId);
    expect(retrieved?.mimeType).toBe('application/acad');
    expect(retrieved?.size).toBe(bytes.byteLength);
  });

  it('2. confirma igualdade exata do conteúdo recuperado', async () => {
    const fileId = 'file-bin-02';
    const projectId = 'proj-teste-01';
    const rawBytes = new Uint8Array([0x00, 0xff, 0x42, 0x17, 0x3d, 0x3a]);

    await fileService.saveFileBinary(fileId, projectId, rawBytes, {
      name: 'topografia.bin',
      mimeType: 'application/octet-stream',
    });

    const retrieved = await fileService.getFileBinary(fileId);
    const retrievedBytes = new Uint8Array(retrieved.content as ArrayBuffer | Uint8Array);

    expect(retrievedBytes.length).toBe(rawBytes.length);
    for (let i = 0; i < rawBytes.length; i++) {
      expect(retrievedBytes[i]).toBe(rawBytes[i]);
    }
  });

  it('3. confirma que localStorage não contém dataUrl', async () => {
    const fileWithDataUrl: any = {
      id: 'file-with-dataurl',
      projectId: 'proj-teste-01',
      name: 'croqui.png',
      mimeType: 'image/png',
      size: 1024,
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const project = {
      ...mockProject,
      files: [fileWithDataUrl],
    };

    await projectStore.saveProject(project);

    const rawLocalStorage = localStorage.getItem('cosmo_architecture_projects_v3') || '';
    expect(rawLocalStorage).not.toContain('data:image/png;base64');
    expect(rawLocalStorage).not.toContain('dataUrl');
  });

  it('4. confirma que localStorage não contém base64', async () => {
    const fileWithBase64: any = {
      id: 'file-with-b64',
      projectId: 'proj-teste-01',
      name: 'esboco.jpg',
      mimeType: 'image/jpeg',
      size: 512,
      base64: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=',
    };

    const project = {
      ...mockProject,
      files: [fileWithBase64],
    };

    await projectStore.saveProject(project);

    const rawLocalStorage = localStorage.getItem('cosmo_architecture_projects_v3') || '';
    expect(rawLocalStorage).not.toContain('QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=');
    expect(rawLocalStorage).not.toContain('"base64"');
  });

  it('5. salva projeto e reidrata status dos arquivos como available ao recarregar', async () => {
    const fileId = 'file-persisted-01';
    const projectId = 'proj-teste-01';

    // Salva o binário no IndexedDB
    const savedFile = await fileService.saveFileBinary(
      fileId,
      projectId,
      new Uint8Array([1, 2, 3]),
      { name: 'planta.pdf', mimeType: 'application/pdf' }
    );

    const project: Project = {
      ...mockProject,
      files: [savedFile],
    };

    await projectStore.saveProject(project);

    // Carrega o projeto reidratado
    const loadedProject = await projectStore.getProject(projectId, true);
    expect(loadedProject).not.toBeNull();
    expect(loadedProject?.files).toHaveLength(1);
    expect(loadedProject?.files[0].uploadStatus).toBe('available');
    expect(loadedProject?.files[0].id).toBe(fileId);
  });

  it('6. marca uploadStatus como error quando o binário não for encontrado', async () => {
    const nonExistentFileId = 'file-fantasma-99';
    const projectWithGhostFile: Project = {
      ...mockProject,
      files: [
        {
          id: nonExistentFileId,
          projectId: mockProject.id,
          name: 'corte_aa.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          createdAt: '2026-08-23T19:00:00.000Z',
          updatedAt: '2026-08-23T19:00:00.000Z',
          sourceKind: 'uploaded_document',
          storageLocation: 'local_indexeddb',
          uploadStatus: 'available',
        },
      ],
    };

    await projectStore.saveProject(projectWithGhostFile);

    const rehydrated = await projectStore.getProject(mockProject.id, true);
    expect(rehydrated).not.toBeNull();
    expect(rehydrated?.files[0].uploadStatus).toBe('error');
    expect(rehydrated?.files[0].provenance?.notes).toContain('não encontrado');
  });

  it('7. exclui arquivo e remove o binário do IndexedDB', async () => {
    const fileId = 'file-to-delete-01';
    await fileService.saveFileBinary(fileId, mockProject.id, new Uint8Array([4, 5, 6]), {
      name: 'excluir.dwg',
    });

    expect(await adapter.exists(fileId)).toBe(true);

    await fileService.deleteFileBinary(fileId);
    expect(await adapter.exists(fileId)).toBe(false);
  });

  it('8. arquivar projeto preserva metadados e não remove binários', async () => {
    const fileId = 'file-archive-test';
    await fileService.saveFileBinary(fileId, mockProject.id, new Uint8Array([10, 20, 30]), {
      name: 'registro.bin',
    });

    await projectStore.saveProject({
      ...mockProject,
      files: [
        {
          id: fileId,
          projectId: mockProject.id,
          name: 'registro.bin',
          mimeType: 'application/octet-stream',
          size: 3,
          createdAt: '2026-08-23T19:00:00.000Z',
          updatedAt: '2026-08-23T19:00:00.000Z',
          sourceKind: 'uploaded_document',
          storageLocation: 'local_indexeddb',
          uploadStatus: 'available',
        },
      ],
    });

    const archived = await projectStore.archiveProject(mockProject.id);
    expect(archived.archivedAt).toBeDefined();

    // Confirma que os binários ainda existem
    const binaryStillExists = await adapter.exists(fileId);
    expect(binaryStillExists).toBe(true);
  });

  it('9. restaura projeto arquivado removendo archivedAt sem perdas', async () => {
    await projectStore.saveProject(mockProject);
    await projectStore.archiveProject(mockProject.id);

    const restored = await projectStore.restoreProject(mockProject.id);
    expect(restored.archivedAt).toBeUndefined();

    const fromDb = await projectStore.getProject(mockProject.id);
    expect(fromDb?.archivedAt).toBeUndefined();
  });

  it('10. exclui projeto permanentemente e limpa todos os binários associados', async () => {
    const file1 = 'file-proj-del-1';
    const file2 = 'file-proj-del-2';

    await fileService.saveFileBinary(file1, mockProject.id, new Uint8Array([1]), { name: 'f1.bin' });
    await fileService.saveFileBinary(file2, mockProject.id, new Uint8Array([2]), { name: 'f2.bin' });

    await projectStore.saveProject(mockProject);
    expect(await adapter.exists(file1)).toBe(true);
    expect(await adapter.exists(file2)).toBe(true);

    await projectStore.deleteProjectPermanently(mockProject.id);

    expect(await adapter.exists(file1)).toBe(false);
    expect(await adapter.exists(file2)).toBe(false);
    expect(await projectStore.getProject(mockProject.id)).toBeNull();
  });

  it('11. impede exclusão dos metadados no localStorage quando a limpeza dos binários falha', async () => {
    await projectStore.saveProject(mockProject);

    // Simula falha catastrófica ao tentar excluir binários no IndexedDB
    vi.spyOn(fileService, 'deleteProjectBinaries').mockRejectedValueOnce(
      new Error('Erro simulado de I/O no IndexedDB')
    );

    await expect(projectStore.deleteProjectPermanently(mockProject.id)).rejects.toThrow(
      FileStorageOperationError
    );

    // Garante que o projeto continua existindo no localStorage
    const projectStillInStore = await projectStore.getProject(mockProject.id, false);
    expect(projectStillInStore).not.toBeNull();
    expect(projectStillInStore?.id).toBe(mockProject.id);
  });

  it('12. importa arquivo legado com dataUrl salvando no IndexedDB sem mantê-lo no localStorage', async () => {
    const legacyProject = {
      ...mockProject,
      id: 'proj-legacy-01',
      files: [
        {
          id: 'file-legacy-01',
          projectId: 'proj-legacy-01',
          name: 'esquema.png',
          mimeType: 'image/png',
          dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      ],
    };

    const imported = await projectStore.importProject(legacyProject);
    expect(imported).toBeDefined();
    expect(imported.files).toHaveLength(1);
    expect(imported.files[0].storageLocation).toBe('local_indexeddb');

    // Confirma que o binário foi para o IndexedDB
    const binaryExists = await adapter.exists(imported.files[0].id);
    expect(binaryExists).toBe(true);

    // Confirma que localStorage não tem a string dataUrl
    const rawStorage = localStorage.getItem('cosmo_architecture_projects_v3') || '';
    expect(rawStorage).not.toContain('data:image/png;base64');
    expect(rawStorage).not.toContain('"dataUrl"');
  });

  it('13. evita colisão de IDs durante importação e atualiza referências internas', async () => {
    await projectStore.saveProject(mockProject);

    // Importa o mesmo projeto novamente (mesmo ID raiz e pessoas/ambientes)
    const duplicateProjectData = JSON.stringify(mockProject);
    const importedSecond = await projectStore.importProject(duplicateProjectData);

    expect(importedSecond.id).not.toBe(mockProject.id);
    expect(importedSecond.brief.projectId).toBe(importedSecond.id);
    expect(importedSecond.people[0].projectId).toBe(importedSecond.id);
    expect(importedSecond.rooms[0].projectId).toBe(importedSecond.id);

    // Verifica que a referência personId -> room.occupantIds foi atualizada para o novo ID
    const newPersonId = importedSecond.people[0].id;
    expect(importedSecond.rooms[0].occupantIds).toContain(newPersonId);

    // Ambos os projetos existem de forma independente
    const allProjects = await projectStore.getAllProjects(false);
    expect(allProjects).toHaveLength(2);
  });

  it('14. exporta apenas metadados sanitizados sem binários', async () => {
    const fileId = 'file-export-test';
    const projectWithFiles: Project = {
      ...mockProject,
      files: [
        {
          id: fileId,
          projectId: mockProject.id,
          name: 'detalhe.dwg',
          mimeType: 'application/acad',
          size: 4096,
          createdAt: '2026-08-23T19:00:00.000Z',
          updatedAt: '2026-08-23T19:00:00.000Z',
          sourceKind: 'cad_import',
          storageLocation: 'local_indexeddb',
          uploadStatus: 'available',
        },
      ],
    };

    await projectStore.saveProject(projectWithFiles);

    const exportedString = await projectStore.exportProject(mockProject.id);
    const parsed = JSON.parse(exportedString);

    expect(parsed.id).toBe(mockProject.id);
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].storageLocation).toBe('local_indexeddb');
    expect(parsed.files[0].dataUrl).toBeUndefined();
    expect(parsed.files[0].base64).toBeUndefined();
    expect(parsed.files[0].content).toBeUndefined();
  });
});
