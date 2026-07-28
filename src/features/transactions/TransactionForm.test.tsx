import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n";
import { TransactionForm } from "./TransactionForm";

describe("TransactionForm", () => {
  it("preserves values on validation failure and submits integer minor units", () => {
    const onSubmit = vi.fn();
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
});
