import type { Locale } from "../i18n";

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  locale: Locale;
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
