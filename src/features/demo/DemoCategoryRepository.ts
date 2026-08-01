import type {
  CategoryRepository,
  CategorySnapshot,
} from "../categories/repository";
import type { CustomCategory, TransactionType } from "../transactions/model";

export class DemoCategoryRepository implements CategoryRepository {
  readonly #listeners = new Set<(snapshot: CategorySnapshot) => void>();
  #categories: readonly CustomCategory[] = [];

  subscribe(onData: (snapshot: CategorySnapshot) => void): () => void {
    this.#listeners.add(onData);
    onData(this.#snapshot());
    return () => this.#listeners.delete(onData);
  }

  async create(name: string, type: TransactionType, sortOrder: number) {
    const timestamp = Date.now();
    const id = crypto.randomUUID();
    this.#categories = [
      ...this.#categories,
      {
        id,
        name,
        type,
        sortOrder,
        archived: false,
        source: "custom",
        createdBy: "demo-session",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];
    this.#emit();
    return id;
  }

  async rename(id: string, name: string) {
    this.#categories = this.#categories.map((category) =>
      category.id === id
        ? { ...category, name, updatedAt: Date.now() }
        : category,
    );
    this.#emit();
  }

  async setArchived(id: string, archived: boolean) {
    this.#categories = this.#categories.map((category) =>
      category.id === id
        ? { ...category, archived, updatedAt: Date.now() }
        : category,
    );
    this.#emit();
  }

  reset() {
    this.#categories = [];
    this.#emit();
  }

  #snapshot(): CategorySnapshot {
    return {
      categories: this.#categories,
      fromCache: false,
      hasPendingWrites: false,
    };
  }

  #emit() {
    const snapshot = this.#snapshot();
    for (const listener of this.#listeners) listener(snapshot);
  }
}
