import type { User } from "firebase/auth";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import type { Locale } from "../i18n";
import type { DisplayCurrencyPreference } from "../lib/money";
import { householdConverter, userProfileConverter } from "./converters";
import { assertOnline, DataOperationError, normalizeDataError } from "./errors";
import type { UserWorkspace } from "./model";

const pendingWorkspaceRequests = new Map<string, Promise<UserWorkspace>>();

export interface HouseholdRepository {
  ensurePersonalWorkspace(
    user: User,
    fallbackLocale: Locale,
    localizedHouseholdName: string,
  ): Promise<UserWorkspace>;
  updateLocale(userId: string, locale: Locale): Promise<void>;
  updateDisplayCurrency(
    userId: string,
    preference: DisplayCurrencyPreference,
  ): Promise<void>;
}

export function createFirestoreHouseholdRepository(
  firestore: Firestore,
): HouseholdRepository {
  return {
    async ensurePersonalWorkspace(
      user,
      fallbackLocale,
      localizedHouseholdName,
    ) {
      assertOnline();
      const pendingRequest = pendingWorkspaceRequests.get(user.uid);
      if (pendingRequest) {
        return pendingRequest;
      }

      const request = runTransaction<UserWorkspace>(
        firestore,
        async (transaction) => {
          const profileReference = doc(firestore, "users", user.uid);
          const profileSnapshot = await transaction.get(
            profileReference.withConverter(userProfileConverter),
          );

          if (profileSnapshot.exists()) {
            const profile = profileSnapshot.data();
            const householdReference = doc(
              firestore,
              "households",
              profile.activeHouseholdId,
            ).withConverter(householdConverter);
            const householdSnapshot = await transaction.get(householdReference);

            if (!householdSnapshot.exists()) {
              throw new DataOperationError(
                "invalid-data",
                "The active household does not exist.",
              );
            }

            return {
              profile,
              household: householdSnapshot.data(),
            };
          }

          const householdReference = doc(collection(firestore, "households"));
          const memberReference = doc(
            firestore,
            "households",
            householdReference.id,
            "members",
            user.uid,
          );
          const now = serverTimestamp();
          const displayName =
            user.displayName ?? user.email?.split("@")[0] ?? "";
          const email = user.email ?? "";

          transaction.set(profileReference, {
            displayName,
            email,
            locale: fallbackLocale,
            displayCurrency: "auto",
            activeHouseholdId: householdReference.id,
            createdAt: now,
            updatedAt: now,
          });
          transaction.set(householdReference, {
            name: localizedHouseholdName,
            currency: "CZK",
            ownerId: user.uid,
            createdAt: now,
            updatedAt: now,
          });
          transaction.set(memberReference, {
            role: "owner",
            displayName,
            joinedAt: now,
          });

          const timestamp = Date.now();
          return {
            profile: {
              id: user.uid,
              displayName,
              email,
              locale: fallbackLocale,
              displayCurrency: "auto",
              activeHouseholdId: householdReference.id,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            household: {
              id: householdReference.id,
              name: localizedHouseholdName,
              currency: "CZK",
              ownerId: user.uid,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          };
        },
      ).catch((error: unknown) => {
        throw normalizeDataError(error);
      });
      pendingWorkspaceRequests.set(user.uid, request);

      try {
        return await request;
      } catch (error) {
        throw normalizeDataError(error);
      } finally {
        if (pendingWorkspaceRequests.get(user.uid) === request) {
          pendingWorkspaceRequests.delete(user.uid);
        }
      }
    },

    async updateLocale(userId, locale) {
      assertOnline();
      try {
        await updateDoc(doc(firestore, "users", userId), {
          locale,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        throw normalizeDataError(error, "write-failure");
      }
    },

    async updateDisplayCurrency(userId, displayCurrency) {
      assertOnline();
      try {
        await updateDoc(doc(firestore, "users", userId), {
          displayCurrency,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        throw normalizeDataError(error, "write-failure");
      }
    },
  };
}
