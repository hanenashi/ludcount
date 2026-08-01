import type { CustomCategory, TransactionType } from "../transactions/model";

export interface CategorySnapshot {
  categories: readonly CustomCategory[];
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export interface CategoryRepository {
  subscribe(
    onData: (snapshot: CategorySnapshot) => void,
    onError: (error: Error) => void,
  ): () => void;
  create(
    name: string,
    type: TransactionType,
    sortOrder: number,
  ): Promise<string>;
  rename(id: string, name: string): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
}
