import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const projectId = "demo-ludcount-rules";
const primaryHouseholdId = "household-primary";
const secondaryHouseholdId = "household-secondary";
const ownerId = "owner-user";
const memberId = "member-user";
const outsiderId = "outsider-user";
const createdAt = Timestamp.fromMillis(1_700_000_000_000);

let testEnvironment: RulesTestEnvironment;

function profileData(
  activeHouseholdId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    displayName: "Test user",
    email: "user@example.test",
    locale: "cs",
    activeHouseholdId,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function householdData(
  householdOwnerId = ownerId,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Test household",
    currency: "CZK",
    ownerId: householdOwnerId,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function memberData(
  role: "owner" | "member",
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    role,
    displayName: "Test member",
    joinedAt: createdAt,
    ...overrides,
  };
}

function transactionData(
  creator = ownerId,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: "expense",
    amountMinor: 85050,
    currency: "CZK",
    categoryId: "expense.groceries",
    categoryLabelSnapshot: "Groceries",
    dateKey: "2026-07-29",
    monthKey: "2026-07",
    note: "Weekly shop",
    createdBy: creator,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function categoryData(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Pets",
    type: "expense",
    sortOrder: 1000,
    archived: false,
    createdBy: ownerId,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function authenticatedFirestore(userId: string) {
  return testEnvironment
    .authenticatedContext(userId, {
      email: `${userId}@example.test`,
    })
    .firestore();
}

function unauthenticatedFirestore() {
  return testEnvironment.unauthenticatedContext().firestore();
}

async function seedBaseData(): Promise<void> {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();

    await Promise.all([
      setDoc(doc(firestore, "users", ownerId), profileData(primaryHouseholdId)),
      setDoc(
        doc(firestore, "users", memberId),
        profileData(primaryHouseholdId),
      ),
      setDoc(
        doc(firestore, "users", outsiderId),
        profileData(secondaryHouseholdId),
      ),
      setDoc(doc(firestore, "households", primaryHouseholdId), householdData()),
      setDoc(
        doc(firestore, "households", primaryHouseholdId, "members", ownerId),
        memberData("owner"),
      ),
      setDoc(
        doc(firestore, "households", primaryHouseholdId, "members", memberId),
        memberData("member"),
      ),
      setDoc(
        doc(firestore, "households", secondaryHouseholdId),
        householdData(outsiderId),
      ),
      setDoc(
        doc(
          firestore,
          "households",
          secondaryHouseholdId,
          "members",
          outsiderId,
        ),
        memberData("owner"),
      ),
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "transactions",
          "owner-transaction",
        ),
        transactionData(),
      ),
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "transactions",
          "member-transaction",
        ),
        transactionData(memberId),
      ),
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "categories",
          "custom-pets",
        ),
        categoryData(),
      ),
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "categories",
          "archived-custom",
        ),
        categoryData({ name: "Old category", archived: true }),
      ),
    ]);
  });
}

beforeAll(async () => {
  const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST;
  if (!emulatorAddress) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is missing. Run tests through npm run test:rules.",
    );
  }

  const separatorIndex = emulatorAddress.lastIndexOf(":");
  const host = emulatorAddress.slice(0, separatorIndex);
  const port = Number(emulatorAddress.slice(separatorIndex + 1));
  const rulesPath = resolve(
    process.env.FIRESTORE_RULES_PATH ?? "firestore.rules",
  );

  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host,
      port,
      rules: await readFile(rulesPath, "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await seedBaseData();
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("authentication and user profiles", () => {
  it("denies unauthenticated reads and writes", async () => {
    const firestore = unauthenticatedFirestore();

    await assertFails(getDoc(doc(firestore, "users", ownerId)));
    await assertFails(
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "transactions",
          "anonymous-transaction",
        ),
        {
          ...transactionData("anonymous"),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    );
  });

  it("denies a signed-out demo from bootstrapping any household documents", async () => {
    const firestore = unauthenticatedFirestore();
    const demoUserId = "signed-out-demo";
    const demoHouseholdId = "demo-must-stay-local";
    const batch = writeBatch(firestore);

    batch.set(doc(firestore, "users", demoUserId), {
      ...profileData(demoHouseholdId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(firestore, "households", demoHouseholdId), {
      ...householdData(demoUserId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(
      doc(firestore, "households", demoHouseholdId, "members", demoUserId),
      {
        ...memberData("owner"),
        joinedAt: serverTimestamp(),
      },
    );

    await assertFails(batch.commit());
  });

  it("allows users to read only their own profile", async () => {
    const firestore = authenticatedFirestore(memberId);

    await assertSucceeds(getDoc(doc(firestore, "users", memberId)));
    await assertFails(getDoc(doc(firestore, "users", ownerId)));
  });

  it("allows locale, display-symbol, and active household preference updates", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          "households",
          secondaryHouseholdId,
          "members",
          memberId,
        ),
        memberData("member"),
      );
    });
    const firestore = authenticatedFirestore(memberId);

    await assertSucceeds(
      updateDoc(doc(firestore, "users", memberId), {
        locale: "en",
        activeHouseholdId: secondaryHouseholdId,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(firestore, "users", memberId), {
        locale: "ja",
        displayCurrency: "JPY",
        updatedAt: serverTimestamp(),
      }),
    );
    for (const displayCurrency of ["auto", "CZK", "USD", "JPY"]) {
      await assertSucceeds(
        updateDoc(doc(firestore, "users", memberId), {
          displayCurrency,
          updatedAt: serverTimestamp(),
        }),
      );
    }
  });

  it("denies invalid preferences and active non-member households", async () => {
    const firestore = authenticatedFirestore(memberId);

    await assertFails(
      updateDoc(doc(firestore, "users", memberId), {
        locale: "de",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(firestore, "users", memberId), {
        displayCurrency: "EUR",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(firestore, "users", memberId), {
        activeHouseholdId: secondaryHouseholdId,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("denies identity changes and unexpected profile fields", async () => {
    const firestore = authenticatedFirestore(memberId);
    const profileReference = doc(firestore, "users", memberId);

    await assertFails(
      updateDoc(profileReference, {
        email: "forged@example.test",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(profileReference, {
        displayName: "Forged name",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(profileReference, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(profileReference, {
        admin: true,
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe("households and memberships", () => {
  it("allows members to read a household and denies non-members", async () => {
    await assertSucceeds(
      getDoc(
        doc(authenticatedFirestore(memberId), "households", primaryHouseholdId),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          authenticatedFirestore(outsiderId),
          "households",
          primaryHouseholdId,
        ),
      ),
    );
  });

  it("allows the authenticated owner to bootstrap a personal household atomically", async () => {
    const newOwnerId = "new-owner";
    const newHouseholdId = "new-household";
    const firestore = authenticatedFirestore(newOwnerId);
    const batch = writeBatch(firestore);

    batch.set(doc(firestore, "users", newOwnerId), {
      ...profileData(newHouseholdId, {
        displayName: "New owner",
        email: "new-owner@example.test",
      }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(firestore, "households", newHouseholdId), {
      ...householdData(newOwnerId, { name: "New household" }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(
      doc(firestore, "households", newHouseholdId, "members", newOwnerId),
      {
        ...memberData("owner", { displayName: "New owner" }),
        joinedAt: serverTimestamp(),
      },
    );

    await assertSucceeds(batch.commit());
  });

  it("denies forged household ownership and malformed households", async () => {
    const firestore = authenticatedFirestore(memberId);

    await assertFails(
      setDoc(doc(firestore, "households", "forged-household"), {
        ...householdData(ownerId),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(firestore, "households", "invalid-household"), {
        ...householdData(memberId, { currency: "EUR", extra: true }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows only the owner to update settings while preserving ownership", async () => {
    await assertSucceeds(
      updateDoc(
        doc(authenticatedFirestore(ownerId), "households", primaryHouseholdId),
        {
          name: "Renamed household",
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      updateDoc(
        doc(authenticatedFirestore(memberId), "households", primaryHouseholdId),
        {
          name: "Member rename",
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      updateDoc(
        doc(authenticatedFirestore(ownerId), "households", primaryHouseholdId),
        {
          ownerId: memberId,
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      updateDoc(
        doc(authenticatedFirestore(ownerId), "households", primaryHouseholdId),
        {
          currency: "EUR",
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      updateDoc(
        doc(authenticatedFirestore(ownerId), "households", primaryHouseholdId),
        {
          unexpected: true,
          updatedAt: serverTimestamp(),
        },
      ),
    );
  });

  it("allows members to read memberships and denies outsiders", async () => {
    await assertSucceeds(
      getDoc(
        doc(
          authenticatedFirestore(memberId),
          "households",
          primaryHouseholdId,
          "members",
          ownerId,
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          authenticatedFirestore(outsiderId),
          "households",
          primaryHouseholdId,
          "members",
          ownerId,
        ),
      ),
    );
  });

  it("allows owners to add members but never another owner", async () => {
    const firestore = authenticatedFirestore(ownerId);

    await assertSucceeds(
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "members",
          "invited-member",
        ),
        {
          ...memberData("member"),
          joinedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "members",
          "forged-owner",
        ),
        {
          ...memberData("owner"),
          joinedAt: serverTimestamp(),
        },
      ),
    );
  });

  it("denies self-grants and membership role escalation", async () => {
    await assertFails(
      setDoc(
        doc(
          authenticatedFirestore(outsiderId),
          "households",
          primaryHouseholdId,
          "members",
          outsiderId,
        ),
        {
          ...memberData("member"),
          joinedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      updateDoc(
        doc(
          authenticatedFirestore(memberId),
          "households",
          primaryHouseholdId,
          "members",
          memberId,
        ),
        { role: "owner" },
      ),
    );
    await assertFails(
      updateDoc(
        doc(
          authenticatedFirestore(ownerId),
          "households",
          primaryHouseholdId,
          "members",
          memberId,
        ),
        { role: "owner" },
      ),
    );
  });
});

describe("custom categories", () => {
  it("allows household members to read categories and denies outsiders", async () => {
    const path = [
      "households",
      primaryHouseholdId,
      "categories",
      "custom-pets",
    ] as const;
    await assertSucceeds(
      getDoc(doc(authenticatedFirestore(memberId), ...path)),
    );
    await assertFails(getDoc(doc(authenticatedFirestore(outsiderId), ...path)));
  });

  it("allows only owners to create valid active categories", async () => {
    await assertSucceeds(
      setDoc(
        doc(
          authenticatedFirestore(ownerId),
          "households",
          primaryHouseholdId,
          "categories",
          "owner-created",
        ),
        {
          ...categoryData(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      setDoc(
        doc(
          authenticatedFirestore(memberId),
          "households",
          primaryHouseholdId,
          "categories",
          "member-created",
        ),
        {
          ...categoryData({ createdBy: memberId }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      setDoc(
        doc(
          authenticatedFirestore(ownerId),
          "households",
          primaryHouseholdId,
          "categories",
          "created-archived",
        ),
        {
          ...categoryData({ archived: true }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    );
  });

  it("validates fields and immutable category identity", async () => {
    const firestore = authenticatedFirestore(ownerId);
    const reference = doc(
      firestore,
      "households",
      primaryHouseholdId,
      "categories",
      "custom-pets",
    );
    await assertSucceeds(
      updateDoc(reference, {
        name: "Pet care",
        archived: true,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(reference, { type: "income", updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(reference, {
        createdBy: memberId,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(reference, { unexpected: true, updatedAt: serverTimestamp() }),
    );
    await assertFails(deleteDoc(reference));
  });
});

describe("transactions", () => {
  it("allows members to read and denies non-members", async () => {
    await assertSucceeds(
      getDoc(
        doc(
          authenticatedFirestore(memberId),
          "households",
          primaryHouseholdId,
          "transactions",
          "owner-transaction",
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          authenticatedFirestore(outsiderId),
          "households",
          primaryHouseholdId,
          "transactions",
          "owner-transaction",
        ),
      ),
    );
  });

  it("allows members to create transactions only as themselves", async () => {
    const firestore = authenticatedFirestore(memberId);

    await assertSucceeds(
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "transactions",
          "valid-member-transaction",
        ),
        {
          ...transactionData(memberId),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "transactions",
          "forged-creator-transaction",
        ),
        {
          ...transactionData(ownerId),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    );
  });

  it("allows active matching custom categories and rejects invalid category use", async () => {
    const firestore = authenticatedFirestore(memberId);
    const createWithCategory = (
      id: string,
      categoryId: string,
      type = "expense",
    ) =>
      setDoc(
        doc(firestore, "households", primaryHouseholdId, "transactions", id),
        {
          ...transactionData(memberId, { categoryId, type }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      );

    await assertSucceeds(createWithCategory("active-custom", "custom-pets"));
    await assertFails(createWithCategory("archived-custom", "archived-custom"));
    await assertFails(createWithCategory("missing-custom", "missing-category"));
    await assertFails(
      createWithCategory("wrong-type-built-in", "income.salary"),
    );
    await assertFails(
      createWithCategory("wrong-type-custom", "custom-pets", "income"),
    );
  });

  it("allows an archived custom category to remain on historical edits", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          "households",
          primaryHouseholdId,
          "transactions",
          "archived-history",
        ),
        transactionData(ownerId, {
          categoryId: "archived-custom",
          categoryLabelSnapshot: "Old category",
        }),
      );
    });
    const reference = doc(
      authenticatedFirestore(ownerId),
      "households",
      primaryHouseholdId,
      "transactions",
      "archived-history",
    );
    await assertSucceeds(
      updateDoc(reference, {
        note: "Updated note",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(reference, {
        categoryId: "archived-custom",
        type: "income",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("denies transaction creation by non-members", async () => {
    const firestore = authenticatedFirestore(outsiderId);

    await assertFails(
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "transactions",
          "outsider-transaction",
        ),
        {
          ...transactionData(outsiderId),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    );
  });

  it("allows creators to update and delete their own transactions", async () => {
    const firestore = authenticatedFirestore(memberId);
    const reference = doc(
      firestore,
      "households",
      primaryHouseholdId,
      "transactions",
      "member-transaction",
    );

    await assertSucceeds(
      updateDoc(reference, {
        amountMinor: 90000,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(deleteDoc(reference));
  });

  it("denies updates and deletes by other household members", async () => {
    const firestore = authenticatedFirestore(memberId);
    const reference = doc(
      firestore,
      "households",
      primaryHouseholdId,
      "transactions",
      "owner-transaction",
    );

    await assertFails(
      updateDoc(reference, {
        amountMinor: 1,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(deleteDoc(reference));
  });

  it.each([
    ["floating-point", 850.5],
    ["zero", 0],
    ["negative", -1],
    ["over maximum", 1_000_000_001],
  ])("denies %s amountMinor values", async (_label, amountMinor) => {
    const firestore = authenticatedFirestore(ownerId);

    await assertFails(
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "transactions",
          `invalid-amount-${String(amountMinor).replace(".", "-")}`,
        ),
        {
          ...transactionData(ownerId, { amountMinor }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    );
  });

  it.each([
    ["currency", { currency: "EUR" }],
    ["type", { type: "transfer" }],
    ["date", { dateKey: "2026-02-30", monthKey: "2026-02" }],
    ["month shape", { monthKey: "2026-7" }],
    ["month mismatch", { dateKey: "2026-07-29", monthKey: "2026-08" }],
  ])("denies an invalid %s", async (label, overrides) => {
    const firestore = authenticatedFirestore(ownerId);

    await assertFails(
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "transactions",
          `invalid-${label.replace(" ", "-")}`,
        ),
        {
          ...transactionData(ownerId, overrides),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ),
    );
  });

  it("keeps creator and creation timestamp immutable", async () => {
    const reference = doc(
      authenticatedFirestore(ownerId),
      "households",
      primaryHouseholdId,
      "transactions",
      "owner-transaction",
    );

    await assertFails(
      updateDoc(reference, {
        createdBy: memberId,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(reference, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it.each(["householdId", "creatorId", "localDate", "unexpected"])(
    "rejects the unexpected %s field",
    async (field) => {
      const firestore = authenticatedFirestore(ownerId);

      await assertFails(
        setDoc(
          doc(
            firestore,
            "households",
            primaryHouseholdId,
            "transactions",
            `unexpected-${field}`,
          ),
          {
            ...transactionData(ownerId, { [field]: "forged" }),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
    },
  );

  it("denies malformed timestamps", async () => {
    const firestore = authenticatedFirestore(ownerId);

    await assertFails(
      setDoc(
        doc(
          firestore,
          "households",
          primaryHouseholdId,
          "transactions",
          "stale-timestamps",
        ),
        transactionData(ownerId),
      ),
    );
  });
});
