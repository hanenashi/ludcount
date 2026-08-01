import type { CsvImportPreview } from "./csvImport";

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
