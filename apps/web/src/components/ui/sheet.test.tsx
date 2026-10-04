import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { renderWithIntl, stubBrowserApis } from "@/components/shell/test-utils";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

beforeAll(stubBrowserApis);

function Sample(props: { showCloseButton?: boolean; closeLabel?: string }) {
  return (
    <Sheet open>
      <SheetContent showCloseButton={props.showCloseButton} closeLabel={props.closeLabel}>
        <SheetTitle>Title</SheetTitle>
        <SheetDescription>Body</SheetDescription>
      </SheetContent>
    </Sheet>
  );
}

describe("SheetContent close button", () => {
  it("is named in English under the en locale", async () => {
    await renderWithIntl(<Sample />, "en");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("is named «Закрыть» under the ru locale (B-001)", async () => {
    await renderWithIntl(<Sample />, "ru");
    expect(screen.getByRole("button", { name: "Закрыть" })).toBeInTheDocument();
  });

  it("lets a caller override the label", async () => {
    await renderWithIntl(<Sample closeLabel="Dismiss" />, "ru");
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("renders no close button when showCloseButton is false", async () => {
    await renderWithIntl(<Sample showCloseButton={false} />, "ru");
    expect(screen.queryByRole("button", { name: /Закрыть|Close/ })).not.toBeInTheDocument();
  });
});
