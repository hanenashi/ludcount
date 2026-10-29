import type { Locale } from "../i18n";
import type {
  AmountDisplayMode,
  DisplayCurrencyPreference,
} from "../lib/money";
import type { TextSizePreference } from "../lib/textSize";

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  locale: Locale;
  displayCurrency: DisplayCurrencyPreference;
  amountDisplay: AmountDisplayMode;
  textSize: TextSizePreference;
  activeHouseholdId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Household {
  id: string;
  name: string;
  currency: "CZK";
  showBuiltInCategories: boolean;
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
