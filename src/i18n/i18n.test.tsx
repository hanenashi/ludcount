import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cs } from "./cs";
import { en } from "./en";
import { I18nProvider, useI18n } from ".";

function LanguageHarness() {
  const { locale, setLocale, t } = useI18n();
  return (
    <>
      <span>{t("settings.heading")}</span>
      <button type="button" onClick={() => setLocale("en")}>
        English
      </button>
      <output>{locale}</output>
    </>
  );
}

describe("translations", () => {
  it("keeps Czech and English key sets identical", () => {
    expect(Object.keys(cs).sort()).toEqual(Object.keys(en).sort());
  });

  it("defaults to Czech and persists an English selection", () => {
    render(
      <I18nProvider>
        <LanguageHarness />
      </I18nProvider>,
    );

    expect(screen.getByText("Nastavení")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(window.localStorage.getItem("ludcount.locale")).toBe("en");
  });
});
