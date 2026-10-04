import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { renderWithIntl, stubBrowserApis } from "@/components/shell/test-utils";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./dialog";

beforeAll(stubBrowserApis);

function Sample(props: { showCloseButton?: boolean; closeLabel?: string; footerClose?: boolean }) {
  return (
    <Dialog open>
      <DialogContent showCloseButton={props.showCloseButton} closeLabel={props.closeLabel}>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Body</DialogDescription>
        <DialogFooter showCloseButton={props.footerClose} />
      </DialogContent>
    </Dialog>
  );
}

describe("DialogContent close button", () => {
  it("is named in English under the en locale", async () => {
    await renderWithIntl(<Sample />, "en");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("is named «Закрыть» under the ru locale (B-001)", async () => {
    await renderWithIntl(<Sample />, "ru");
    expect(screen.getByRole("button", { name: "Закрыть" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("lets a caller override the label", async () => {
    await renderWithIntl(<Sample closeLabel="Dismiss" />, "ru");
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("renders no close button when showCloseButton is false", async () => {
    await renderWithIntl(<Sample showCloseButton={false} />, "ru");
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeInTheDocument();
  });

  it("localizes the footer close button too", async () => {
    await renderWithIntl(<Sample showCloseButton={false} footerClose />, "ru");
    expect(screen.getByRole("button", { name: "Закрыть" })).toBeInTheDocument();
  });
});
