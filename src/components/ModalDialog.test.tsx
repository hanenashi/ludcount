import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ModalDialog } from "./ModalDialog";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      {open ? (
        <ModalDialog
          labelledBy="test-dialog-title"
          describedBy="test-dialog-description"
          onDismiss={() => setOpen(false)}
        >
          <h2 id="test-dialog-title">Delete item?</h2>
          <p id="test-dialog-description">This cannot be undone.</p>
          <button
            type="button"
            data-dialog-initial-focus
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button type="button">Delete</button>
        </ModalDialog>
      ) : null}
    </>
  );
}

describe("ModalDialog", () => {
  it("moves and traps focus, closes with Escape, and restores focus", () => {
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Open dialog" });
    opener.focus();
    fireEvent.click(opener);

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const remove = screen.getByRole("button", { name: "Delete" });
    expect(cancel).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(remove).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(cancel).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
