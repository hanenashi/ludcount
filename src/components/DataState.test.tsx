import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataOperationError } from "../firebase/errors";
import { I18nProvider } from "../i18n";
import { DataStatePanel, OfflineBanner } from "./DataState";

describe("data state UI", () => {
  it("explains permission-denied without exposing technical errors", () => {
    render(
      <I18nProvider>
        <DataStatePanel
          error={new DataOperationError("permission-denied", "technical")}
          onRetry={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Přístup k Firestore je uzamčený",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("technical")).not.toBeInTheDocument();
  });

  it("renders an explicit offline status", () => {
    render(
      <I18nProvider>
        <OfflineBanner />
      </I18nProvider>,
    );
    expect(screen.getByText("Jste offline")).toBeInTheDocument();
  });
});
