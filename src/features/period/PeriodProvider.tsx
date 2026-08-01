import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultPeriod, type PeriodSelection } from "./period";

interface PeriodContextValue {
  period: PeriodSelection;
  setPeriod: (period: PeriodSelection) => void;
  resetPeriod: () => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<PeriodSelection>(() => defaultPeriod());
  const resetPeriod = useCallback(() => setPeriod(defaultPeriod()), []);
  const value = useMemo(
    () => ({
      period,
      setPeriod,
      resetPeriod,
    }),
    [period, resetPeriod],
  );
  return (
    <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodContextValue {
  const context = useContext(PeriodContext);
  if (!context)
    throw new Error("usePeriod must be used within PeriodProvider.");
  return context;
}
