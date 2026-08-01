import { describe, expect, it, vi } from "vitest";
import { DemoCategoryRepository } from "./DemoCategoryRepository";

describe("DemoCategoryRepository", () => {
  it("keeps custom category mutations in memory and resets them", async () => {
    const repository = new DemoCategoryRepository();
    const listener = vi.fn();
    repository.subscribe(listener);

    const id = await repository.create("Mazlíčci", "expense", 1000);
    await repository.rename(id, "Péče o mazlíčky");
    await repository.setArchived(id, true);

    const archived = listener.mock.calls.at(-1)?.[0].categories[0];
    expect(archived).toMatchObject({
      id,
      name: "Péče o mazlíčky",
      type: "expense",
      archived: true,
      source: "custom",
    });

    repository.reset();
    expect(listener.mock.calls.at(-1)?.[0].categories).toEqual([]);
  });
});
