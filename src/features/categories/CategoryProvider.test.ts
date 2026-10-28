import { describe, expect, it } from "vitest";
import type { CustomCategory } from "../transactions/model";
import { availableCategories, categoryLookup } from "./CategoryProvider";

const importedCategory: CustomCategory = {
  id: "custom-imported",
  name: "Imported food",
  type: "expense",
  sortOrder: 1000,
  archived: false,
  source: "custom",
  createdBy: "owner",
  createdAt: 1,
  updatedAt: 1,
};

describe("category availability", () => {
  it("shows custom categories without built-in choices when defaults are hidden", () => {
    const categories = availableCategories([importedCategory], false);

    expect(categories).toEqual([importedCategory]);
  });

  it("keeps hidden built-ins resolvable for existing transactions", () => {
    const lookup = categoryLookup([importedCategory]);

    expect(lookup.get("expense.groceries")?.source).toBe("built-in");
    expect(lookup.get(importedCategory.id)).toBe(importedCategory);
  });
});
