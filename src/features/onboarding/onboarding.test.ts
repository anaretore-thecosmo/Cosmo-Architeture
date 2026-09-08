import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { createProjectFromOnboarding } from '../../domain/project/projectFactory';
import { ProjectStore } from '../../services/storage/projectStore';
import { FileStorageService } from '../../services/storage/fileStorage';

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

describe('Fluxo de Criação de Projeto (Onboarding & Storage)', () => {
  let fileService: FileStorageService;
  let projectStore: ProjectStore;

  beforeEach(() => {
    localStorage.clear();
    fileService = new FileStorageService();
    projectStore = new ProjectStore(fileService);
  });

  it('deve criar e salvar projeto residencial com planta ou arquivos', async () => {
    const project = createProjectFromOnboarding({
      name: 'Residência Terracota',
      category: 'residential',
      subtype: 'Casa',
      startingPoint: 'existing_plan',
      files: [
        {
          id: 'file-101',
          projectId: 'pending',
          name: 'planta_baixa.pdf',
          size: 10240,
          mimeType: 'application/pdf',
          storagePath: 'cosmo_file_file-101',
          storageLocation: 'local_indexeddb',
          uploadStatus: 'available',
          sourceKind: 'uploaded_document',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    await projectStore.saveProject(project);

    const loaded = await projectStore.getProject(project.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('Residência Terracota');
    expect(loaded?.category).toBe('residential');
    expect(loaded?.subtype).toBe('Casa');
    expect(loaded?.startingPoint).toBe('existing_plan');
    expect(loaded?.files.length).toBe(1);
    expect(loaded?.files[0].name).toBe('planta_baixa.pdf');
  });

  it('deve criar e salvar projeto comercial com ideia em texto', async () => {
    const project = createProjectFromOnboarding({
      name: 'Estúdio Onda Sonora',
      category: 'commercial',
      subtype: 'Estúdio de podcast',
      startingPoint: 'idea',
      originalText: 'Um estúdio com tratamento acústico de alto padrão e tons quentes.',
    });

    await projectStore.saveProject(project);

    const allProjects = await projectStore.getAllProjects();
    expect(allProjects.length).toBe(1);
    expect(allProjects[0].name).toBe('Estúdio Onda Sonora');
    expect(allProjects[0].brief.goals?.[0]).toBe(
      'Um estúdio com tratamento acústico de alto padrão e tons quentes.'
    );
  });

  it('deve criar e salvar projeto iniciando pelo Feng Shui', async () => {
    const project = createProjectFromOnboarding({
      name: 'Sítio Vale Sereno',
      category: 'residential',
      subtype: 'Sítio',
      startingPoint: 'feng_shui',
      fengShuiBase: 'croqui',
    });

    await projectStore.saveProject(project);

    const loaded = await projectStore.getProject(project.id);
    expect(loaded?.fengShuiProjects?.[0]?.sourceType).toBe('croqui');
  });
});
