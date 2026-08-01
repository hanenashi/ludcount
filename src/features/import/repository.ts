import type { CsvImportPreview, ImportTransaction } from "./csvImport";

export const IMPORT_WRITE_CHUNK_SIZE = 100;

export function transactionImportChunks(
  transactions: readonly ImportTransaction[],
): readonly (readonly ImportTransaction[])[] {
  const byCategory = new Map<string, ImportTransaction[]>();
  for (const transaction of transactions) {
    const group = byCategory.get(transaction.categoryId) ?? [];
    group.push(transaction);
    byCategory.set(transaction.categoryId, group);
  }

  const chunks: ImportTransaction[][] = [];
  for (const group of byCategory.values()) {
    for (
      let index = 0;
      index < group.length;
      index += IMPORT_WRITE_CHUNK_SIZE
    ) {
      chunks.push(group.slice(index, index + IMPORT_WRITE_CHUNK_SIZE));
    }
  }
  return chunks;
}

export interface ImportProgress {
  completed: number;
  total: number;
}

export interface ImportResult {
  createdCategories: number;
  createdTransactions: number;
  skippedTransactions: number;
}

export interface DataImportRepository {
  importCsv(
    preview: CsvImportPreview,
    onProgress: (progress: ImportProgress) => void,
  ): Promise<ImportResult>;
}
