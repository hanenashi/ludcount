import type {
  TransactionRepository,
  TransactionSnapshot,
} from "../transactions/repository";
import type { Transaction, TransactionDraft } from "../transactions/model";
import { createDemoFixture } from "./fixtures";

type FixtureFactory = () => readonly Transaction[];

function sortTransactions(
  transactions: readonly Transaction[],
): readonly Transaction[] {
  return [...transactions].sort(
    (left, right) =>
      right.dateKey.localeCompare(left.dateKey) ||
      right.createdAt - left.createdAt,
  );
}

export class DemoTransactionRepository implements TransactionRepository {
  readonly #fixtureFactory: FixtureFactory;
  readonly #listeners = new Set<(snapshot: TransactionSnapshot) => void>();
  #transactions: readonly Transaction[];

  constructor(fixtureFactory: FixtureFactory = createDemoFixture) {
    this.#fixtureFactory = fixtureFactory;
    this.#transactions = sortTransactions(fixtureFactory());
  }

  subscribe(onData: (snapshot: TransactionSnapshot) => void): () => void {
    this.#listeners.add(onData);
    onData(this.#snapshot());
    return () => this.#listeners.delete(onData);
  }

  async create(
    draft: TransactionDraft,
    categoryLabelSnapshot: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const id = crypto.randomUUID();
    this.#transactions = sortTransactions([
      ...this.#transactions,
      {
        ...draft,
        id,
        currency: "CZK",
        categoryLabelSnapshot,
        createdBy: "demo-session",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    this.#emit();
    return id;
  }

  async update(
    id: string,
    draft: TransactionDraft,
    categoryLabelSnapshot: string,
  ): Promise<void> {
    const current = this.#transactions.find(
      (transaction) => transaction.id === id,
    );
    if (!current) {
      throw new Error(`Demo transaction ${id} does not exist.`);
    }
    this.#transactions = sortTransactions(
      this.#transactions.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              ...draft,
              categoryLabelSnapshot,
              updatedAt: Date.now(),
            }
          : transaction,
      ),
    );
    this.#emit();
  }

  async remove(id: string): Promise<void> {
    this.#transactions = this.#transactions.filter(
      (transaction) => transaction.id !== id,
    );
    this.#emit();
  }

  async removeAll(ids: readonly string[]): Promise<void> {
    const removed = new Set(ids);
    this.#transactions = this.#transactions.filter(
      (transaction) => !removed.has(transaction.id),
    );
    this.#emit();
  }

  reset(): void {
    this.#transactions = sortTransactions(this.#fixtureFactory());
    this.#emit();
  }

  snapshotForTesting(): readonly Transaction[] {
    return this.#transactions;
  }

  #snapshot(): TransactionSnapshot {
    return {
      transactions: this.#transactions,
      fromCache: false,
      hasPendingWrites: false,
    };
  }

  #emit(): void {
    const snapshot = this.#snapshot();
    for (const listener of this.#listeners) {
      listener(snapshot);
    }
  }
}
