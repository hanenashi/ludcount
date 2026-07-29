import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataOperationError } from "../../firebase/errors";
import { I18nProvider } from "../../i18n";
import { asMoneyAmount } from "../../lib/money";
import { TransactionForm } from "./TransactionForm";

describe("TransactionForm", () => {
  it("preserves values on validation failure and submits integer minor units", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <I18nProvider>
        <TransactionForm onSubmit={onSubmit} onCancel={vi.fn()} />
      </I18nProvider>,
    );

    const amount = screen.getByLabelText("Částka");
    fireEvent.change(amount, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Uložit výdaj" }));
    expect(
      screen.getByText("Zadejte částku větší než nula."),
    ).toBeInTheDocument();
    expect(amount).toHaveValue("abc");
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(amount, { target: { value: "850,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Uložit výdaj" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "expense",
        amountMinor: 85050,
        categoryId: "expense.groceries",
      }),
    );
  });

  it("preserves entered values and reports an offline write failure", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new DataOperationError("offline", "offline"));
    render(
      <I18nProvider>
        <TransactionForm onSubmit={onSubmit} onCancel={vi.fn()} />
      </I18nProvider>,
    );

    const amount = screen.getByLabelText("Částka");
    fireEvent.change(amount, { target: { value: "850,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Uložit výdaj" }));

    await waitFor(() =>
      expect(
        screen.getByText("Před uložením této změny se připojte k internetu."),
      ).toBeInTheDocument(),
    );
    expect(amount).toHaveValue("850,50");
  });

  it("prefills a duplicate draft without saving until explicitly submitted", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <I18nProvider>
        <TransactionForm
          initialDraft={{
            type: "expense",
            amountMinor: asMoneyAmount(85050),
            categoryId: "expense.groceries",
            dateKey: "2026-07-29",
            monthKey: "2026-07",
            note: "Týdenní nákup",
          }}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Duplikovat výdaj" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Částka")).toHaveValue("850,50");
    expect(screen.getByLabelText("Kategorie")).toHaveValue("expense.groceries");
    expect(screen.getByLabelText("Datum")).toHaveValue("2026-07-29");
    expect(screen.getByLabelText("Poznámka")).toHaveValue("Týdenní nákup");
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Uložit výdaj" }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: "expense",
      amountMinor: 85050,
      categoryId: "expense.groceries",
      dateKey: "2026-07-29",
      monthKey: "2026-07",
      note: "Týdenní nákup",
    });
  });
});
