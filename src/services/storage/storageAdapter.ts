/**
 * COSMO ARCHITECTURE - Storage Adapter
 * Adaptador de armazenamento com persistência de binários no IndexedDB.
 */

export interface StoredBinaryRecord {
  fileId: string;
  projectId: string;
  content: Blob | ArrayBuffer | Uint8Array;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface IFileStorageAdapter {
  save(
    fileId: string,
    projectId: string,
    content: Blob | ArrayBuffer | Uint8Array,
    metadata?: { mimeType?: string; size?: number; createdAt?: string }
  ): Promise<void>;
  get(fileId: string): Promise<StoredBinaryRecord | null>;
  delete(fileId: string): Promise<void>;
  deleteByProject(projectId: string): Promise<void>;
  exists(fileId: string): Promise<boolean>;
}

const DB_NAME = 'cosmo_architecture_local';
const DB_VERSION = 1;
const STORE_NAME = 'file_binaries';
const PROJECT_INDEX = 'by_projectId';

export class LocalFileStorageAdapter implements IFileStorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB não está disponível no ambiente atual.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
          store.createIndex(PROJECT_INDEX, 'projectId', { unique: false });
        }
      };

      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event: Event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        this.dbPromise = null;
        reject(error || new Error('Erro ao abrir o banco IndexedDB local.'));
      };
    });

    return this.dbPromise;
  }

  async save(
    fileId: string,
    projectId: string,
    content: Blob | ArrayBuffer | Uint8Array,
    metadata?: { mimeType?: string; size?: number; createdAt?: string }
  ): Promise<void> {
    const db = await this.getDB();

    let calculatedSize = metadata?.size;
    if (calculatedSize === undefined) {
      if (content instanceof Blob) {
        calculatedSize = content.size;
      } else if (content instanceof ArrayBuffer) {
        calculatedSize = content.byteLength;
      } else if (content instanceof Uint8Array) {
        calculatedSize = content.byteLength;
      } else {
        calculatedSize = 0;
      }
    }

    const record: StoredBinaryRecord = {
      fileId,
      projectId,
      content,
      mimeType: metadata?.mimeType || 'application/octet-stream',
      size: calculatedSize,
      createdAt: metadata?.createdAt || new Date().toISOString(),
    };

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error('Falha ao salvar binário no IndexedDB.'));
        tx.onerror = () => reject(tx.error || new Error('Erro na transação de escrita do IndexedDB.'));
      } catch (err) {
        reject(err);
      }
    });
  }

  async get(fileId: string): Promise<StoredBinaryRecord | null> {
    const db = await this.getDB();

    return new Promise<StoredBinaryRecord | null>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(fileId);

        request.onsuccess = () => {
          resolve(request.result || null);
        };
        request.onerror = () => reject(request.error || new Error('Falha ao consultar binário no IndexedDB.'));
        tx.onerror = () => reject(tx.error || new Error('Erro na transação de leitura do IndexedDB.'));
      } catch (err) {
        reject(err);
      }
    });
  }

  async delete(fileId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(fileId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error('Falha ao excluir binário no IndexedDB.'));
        tx.onerror = () => reject(tx.error || new Error('Erro na transação de exclusão do IndexedDB.'));
      } catch (err) {
        reject(err);
      }
    });
  }

  async deleteByProject(projectId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index(PROJECT_INDEX);
        const request = index.openCursor(IDBKeyRange.only(projectId));

        request.onsuccess = (event: Event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => reject(request.error || new Error('Falha ao excluir binários do projeto no IndexedDB.'));
        tx.onerror = () => reject(tx.error || new Error('Erro na transação ao excluir binários do projeto.'));
      } catch (err) {
        reject(err);
      }
    });
  }

  async exists(fileId: string): Promise<boolean> {
    const db = await this.getDB();

    return new Promise<boolean>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.count(IDBKeyRange.only(fileId));

        request.onsuccess = () => {
          resolve(request.result > 0);
        };
        request.onerror = () => reject(request.error || new Error('Falha ao verificar existência do binário.'));
        tx.onerror = () => reject(tx.error || new Error('Erro na transação de verificação do IndexedDB.'));
      } catch (err) {
        reject(err);
      }
    });
  }
}
