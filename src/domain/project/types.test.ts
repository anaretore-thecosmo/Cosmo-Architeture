import { describe, it, expect } from 'vitest';
import type {
  Project,
  ProjectFile,
  EngineeringProject,
  FengShuiProject,
  ProfessionalValidation,
  SpatialOrientations,
} from './types';

describe('COSMO ARCHITECTURE - Schema V3 Domain Types', () => {
  it('1. subtype aceita texto livre além dos valores sugeridos', () => {
    const projectWithCustomSubtype: Partial<Project> = {
      schemaVersion: 3,
      id: 'proj-1',
      name: 'Centro de Meditação Orgânico',
      category: 'other',
      subtype: 'ecovillage_sanctuary_custom', // Texto livre não pré-definido
    };

    expect(projectWithCustomSubtype.subtype).toBe('ecovillage_sanctuary_custom');
  });

  it('2. discipline de engenharia aceita texto livre sem lista fechada', () => {
    const customEngineering: EngineeringProject = {
      id: 'eng-1',
      projectId: 'proj-1',
      name: 'Captação e Reuso Pluvial',
      discipline: 'engenharia_bioclimatica_hidraulica_avancada', // Texto livre
      status: 'draft',
      priority: 'high',
      linkedFileIds: [],
      relatedRoomIds: [],
      relatedEngineeringProjectIds: [],
      decisions: [],
      pendingItems: [],
      alternatives: [],
      history: [],
      createdAt: '2026-08-23T19:00:00Z',
      updatedAt: '2026-08-23T19:00:00Z',
    };

    expect(customEngineering.discipline).toBe(
      'engenharia_bioclimatica_hidraulica_avancada',
    );
  });

  it('3. um projeto aceita múltiplos projetos de engenharia', () => {
    const engineeringProjects: EngineeringProject[] = [
      {
        id: 'eng-1',
        projectId: 'proj-1',
        name: 'Instalações Hidrossanitárias',
        discipline: 'hidraulica',
        status: 'draft',
        priority: 'medium',
        linkedFileIds: [],
        relatedRoomIds: [],
        relatedEngineeringProjectIds: [],
        decisions: [],
        pendingItems: [],
        alternatives: [],
        history: [],
        createdAt: '2026-08-23T19:00:00Z',
        updatedAt: '2026-08-23T19:00:00Z',
      },
      {
        id: 'eng-2',
        projectId: 'proj-1',
        name: 'Sistema Fotovoltaico e Baterias',
        discipline: 'energia_solar',
        status: 'in_progress',
        priority: 'high',
        linkedFileIds: [],
        relatedRoomIds: [],
        relatedEngineeringProjectIds: [],
        decisions: [],
        pendingItems: [],
        alternatives: [],
        history: [],
        createdAt: '2026-08-23T19:00:00Z',
        updatedAt: '2026-08-23T19:00:00Z',
      },
    ];

    expect(engineeringProjects).toHaveLength(2);
    expect(engineeringProjects[0].id).toBe('eng-1');
    expect(engineeringProjects[1].id).toBe('eng-2');
  });

  it('4. um projeto aceita múltiplos estudos de Feng Shui', () => {
    const defaultOrientations: SpatialOrientations = {
      geographicNorth: { confidenceLevel: 'requires_validation', confirmed: false },
      magneticNorth: { confidenceLevel: 'requires_validation', confirmed: false },
      magneticDeclination: { confidenceLevel: 'requires_validation', confirmed: false },
      solarOrientation: { confidenceLevel: 'requires_validation', confirmed: false },
      mainEntryAzimuth: { confidenceLevel: 'requires_validation', confirmed: false },
    };

    const fengShuiStudies: FengShuiProject[] = [
      {
        id: 'fs-1',
        projectId: 'proj-1',
        name: 'Estudo Inicial de Implantação',
        mainEntryConfirmed: false,
        orientations: defaultOrientations,
        occupantIds: [],
        objectives: [],
        pendingConfirmations: [],
        analyzedRoomIds: [],
        alternatives: [],
        createdAt: '2026-08-23T19:00:00Z',
        updatedAt: '2026-08-23T19:00:00Z',
      },
      {
        id: 'fs-2',
        projectId: 'proj-1',
        name: 'Estudo de Harmonização de Interiores',
        mainEntryConfirmed: false,
        orientations: defaultOrientations,
        occupantIds: [],
        objectives: [],
        pendingConfirmations: [],
        analyzedRoomIds: [],
        alternatives: [],
        createdAt: '2026-08-23T19:00:00Z',
        updatedAt: '2026-08-23T19:00:00Z',
      },
    ];

    expect(fengShuiStudies).toHaveLength(2);
    expect(fengShuiStudies[0].id).toBe('fs-1');
    expect(fengShuiStudies[1].id).toBe('fs-2');
  });

  it('5. as cinco orientações espaciais permanecem independentes', () => {
    const orientations: SpatialOrientations = {
      geographicNorth: {
        value: 0,
        method: 'cartographic_map',
        confidenceLevel: 'confirmed',
        confirmed: true,
      },
      magneticNorth: {
        value: 341.5,
        method: 'compass_onsite',
        confidenceLevel: 'informed',
        confirmed: false,
      },
      magneticDeclination: {
        value: -18.5,
        method: 'noaa_geomagnetism_model',
        confidenceLevel: 'confirmed',
        confirmed: true,
      },
      solarOrientation: {
        value: 'solsticio_inverno_nascente_67deg',
        method: 'sun_path_diagram',
        confidenceLevel: 'estimate',
        confirmed: false,
      },
      mainEntryAzimuth: {
        value: 128.0,
        method: 'laser_rangefinder',
        confidenceLevel: 'confirmed',
        confirmed: true,
      },
    };

    expect(orientations.geographicNorth.value).toBe(0);
    expect(orientations.magneticNorth.value).toBe(341.5);
    expect(orientations.magneticDeclination.value).toBe(-18.5);
    expect(orientations.solarOrientation.value).toBe(
      'solsticio_inverno_nascente_67deg',
    );
    expect(orientations.mainEntryAzimuth.value).toBe(128.0);
    // Cada uma tem seu próprio status independente
    expect(orientations.geographicNorth.confirmed).toBe(true);
    expect(orientations.magneticNorth.confirmed).toBe(false);
  });

  it('6. ProjectFile não exige nem utiliza dataUrl ou base64', () => {
    const fileMetadata: ProjectFile = {
      id: 'file-101',
      projectId: 'proj-1',
      name: 'planta_baixa_terreo.dwg',
      mimeType: 'application/acad',
      size: 4521090,
      createdAt: '2026-08-23T19:00:00Z',
      updatedAt: '2026-08-23T19:00:00Z',
      sourceKind: 'cad_import',
      storageLocation: 'local_indexeddb',
      storagePath: 'projects/proj-1/files/file-101.bin',
      uploadStatus: 'available',
    };

    expect(fileMetadata.storageLocation).toBe('local_indexeddb');
    expect('dataUrl' in fileMetadata).toBe(false);
    expect('base64' in fileMetadata).toBe(false);
    expect('data' in fileMetadata).toBe(false);
    expect('blob' in fileMetadata).toBe(false);
  });

  it('7. ProfessionalValidation pode existir sem ser validada', () => {
    const emptyValidation: ProfessionalValidation = {
      id: 'val-1',
      isValidated: false,
    };

    expect(emptyValidation.isValidated).toBe(false);
    expect(emptyValidation.validatedAt).toBeUndefined();
    expect(emptyValidation.professionalName).toBeUndefined();
    expect(emptyValidation.councilRegistrationNumber).toBeUndefined();
  });

  it('8. um novo estudo de Feng Shui pode permanecer completamente neutro', () => {
    const neutralStudy: FengShuiProject = {
      id: 'fs-neutral',
      projectId: 'proj-1',
      mainEntryConfirmed: false,
      orientations: {
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
      },
      occupantIds: [],
      objectives: [],
      pendingConfirmations: [],
      analyzedRoomIds: [],
      alternatives: [],
      createdAt: '2026-08-23T19:00:00Z',
      updatedAt: '2026-08-23T19:00:00Z',
    };

    expect(neutralStudy.methodology).toBeUndefined();
    expect(neutralStudy.approach).toBeUndefined();
    expect(neutralStudy.mainEntryDescription).toBeUndefined();
    expect(neutralStudy.occupantIds).toHaveLength(0);
    expect(neutralStudy.objectives).toHaveLength(0);
    expect(neutralStudy.mainEntryConfirmed).toBe(false);
    expect(neutralStudy.orientations.geographicNorth.value).toBeUndefined();
  });

  it('9. suporta briefing multimodal completo com distinção estrita de fontes', () => {
    const projectWithMultimodalBrief: Project = {
      schemaVersion: 3,
      id: 'proj-multimodal-1',
      name: 'Estúdio Jardim Botânico',
      category: 'residential',
      subtype: 'Estúdio',
      startingPoint: 'idea',
      stage: 'briefing',
      createdAt: '2026-08-24T10:00:00Z',
      updatedAt: '2026-08-24T10:00:00Z',
      files: [],
      people: [],
      rooms: [],
      versions: [],
      analyses: [],
      collaborators: [],
      engineeringProjects: [],
      fengShuiProjects: [],
      brief: {
        id: 'brief-1',
        projectId: 'proj-multimodal-1',
        createdAt: '2026-08-24T10:00:00Z',
        updatedAt: '2026-08-24T10:00:00Z',
        briefingText: 'Preciso de um estúdio com ventilação cruzada e luz natural suave pela manhã.',
        goals: ['Preciso de um estúdio com ventilação cruzada e luz natural suave pela manhã.'],
        documents: [
          {
            id: 'doc-1',
            projectId: 'proj-multimodal-1',
            fileId: 'bin-doc-1',
            fileName: 'programa_de_necessidades.pdf',
            fileSize: 1048576,
            mimeType: 'application/pdf',
            classification: 'briefing_document',
            createdAt: '2026-08-24T10:00:00Z',
            updatedAt: '2026-08-24T10:00:00Z',
          },
        ],
        visualReferences: [
          {
            id: 'vis-1',
            projectId: 'proj-multimodal-1',
            fileId: 'bin-vis-1',
            fileName: 'painel_madeira_iluminacao.jpg',
            fileSize: 524288,
            mimeType: 'image/jpeg',
            classification: 'visual_reference_inspiration',
            instruction: 'Adoro esta modulação de ripas na parede dos fundos',
            sourceUrl: 'https://br.pinterest.com/pin/123456',
            createdAt: '2026-08-24T10:00:00Z',
            updatedAt: '2026-08-24T10:00:00Z',
          },
        ],
        audios: [
          {
            id: 'aud-1',
            projectId: 'proj-multimodal-1',
            fileId: 'bin-aud-1',
            fileName: 'audio_briefing_cliente.webm',
            fileSize: 312000,
            mimeType: 'audio/webm',
            durationSeconds: 24,
            transcription: 'A acústica é fundamental pois gravamos aulas no espaço.',
            transcriptionStatus: 'completed',
            createdAt: '2026-08-24T10:00:00Z',
            updatedAt: '2026-08-24T10:00:00Z',
          },
        ],
      },
    };

    // Validações
    expect(projectWithMultimodalBrief.brief.briefingText).toBe(
      'Preciso de um estúdio com ventilação cruzada e luz natural suave pela manhã.'
    );
    expect(projectWithMultimodalBrief.brief.documents).toHaveLength(1);
    expect(projectWithMultimodalBrief.brief.documents![0].classification).toBe('briefing_document');

    expect(projectWithMultimodalBrief.brief.visualReferences).toHaveLength(1);
    expect(projectWithMultimodalBrief.brief.visualReferences![0].classification).toBe('visual_reference_inspiration');
    expect(projectWithMultimodalBrief.brief.visualReferences![0].instruction).toBe(
      'Adoro esta modulação de ripas na parede dos fundos'
    );

    expect(projectWithMultimodalBrief.brief.audios).toHaveLength(1);
    expect(projectWithMultimodalBrief.brief.audios![0].transcriptionStatus).toBe('completed');
    expect(projectWithMultimodalBrief.brief.audios![0].transcription).toBe(
      'A acústica é fundamental pois gravamos aulas no espaço.'
    );
  });
});
