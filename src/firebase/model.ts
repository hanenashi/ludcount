import type { Locale } from "../i18n";
import type { DisplayCurrencyPreference } from "../lib/money";

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  locale: Locale;
  displayCurrency: DisplayCurrencyPreference;
  activeHouseholdId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Household {
  id: string;
  name: string;
  currency: "CZK";
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface HouseholdMember {
  id: string;
  role: "owner" | "member";
  displayName: string;
  joinedAt: number;
}

export interface UserWorkspace {
  profile: UserProfile;
  household: Household;
}
