import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { renderWithIntl, stubBrowserApis } from "@/components/shell/test-utils";

import { Dropzone } from "./dropzone";

beforeAll(stubBrowserApis);

const pdf = (size = 10): File => new File([new Uint8Array(size)], "cv.pdf", { type: "application/pdf" });

function fileInput(): HTMLInputElement {
  return document.querySelector("input[type=file]") as HTMLInputElement;
}

describe("Dropzone", () => {
  it("accessible name states PDF or DOCX up to 5 MB", async () => {
    await renderWithIntl(<Dropzone onFile={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Upload your resume, PDF or DOCX, up to 5 megabytes" })).toBeInTheDocument();
    expect(fileInput()).toHaveAttribute("accept", ".pdf,.docx");
  });

  it("Enter opens the file picker", async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    await renderWithIntl(<Dropzone onFile={vi.fn()} />);
    await user.tab();
    expect(screen.getByRole("button", { name: /Upload your resume/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it("hands a valid file to onFile", async () => {
    const onFile = vi.fn();
    const user = userEvent.setup();
    await renderWithIntl(<Dropzone onFile={onFile} />);
    await user.upload(fileInput(), pdf());
    expect(onFile).toHaveBeenCalledTimes(1);
    expect((onFile.mock.calls[0]?.[0] as File).name).toBe("cv.pdf");
  });

  it('rejected file shows "We only accept PDF or DOCX files" and sends nothing', async () => {
    const onFile = vi.fn();
    const user = userEvent.setup({ applyAccept: false });
    await renderWithIntl(<Dropzone onFile={onFile} />);
    await user.upload(fileInput(), new File(["x"], "photo.png", { type: "image/png" }));
    expect(screen.getByRole("alert")).toHaveTextContent("We only accept PDF or DOCX files");
    expect(onFile).not.toHaveBeenCalled();
  });

  it('over 5 MB shows "This file is larger than 5 MB"', async () => {
    const onFile = vi.fn();
    const user = userEvent.setup();
    await renderWithIntl(<Dropzone onFile={onFile} />);
    await user.upload(fileInput(), pdf(5_242_881));
    expect(screen.getByRole("alert")).toHaveTextContent("This file is larger than 5 MB");
    expect(onFile).not.toHaveBeenCalled();
  });

  it("a file dropped on the zone is validated the same way", async () => {
    const onFile = vi.fn();
    await renderWithIntl(<Dropzone onFile={onFile} />);
    const zone = screen.getByRole("button", { name: /Upload your resume/ }).parentElement as HTMLElement;
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.drop(zone, { dataTransfer: { files: [pdf()] } });
    expect(onFile).toHaveBeenCalledTimes(1);
  });

  it("shows an error passed from the parent (server rejection)", async () => {
    await renderWithIntl(<Dropzone onFile={vi.fn()} error="resume.unsupported_type" />);
    expect(screen.getByRole("alert")).toHaveTextContent("We only accept PDF or DOCX files");
  });

  it("the picker is disabled while busy", async () => {
    await renderWithIntl(<Dropzone onFile={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /Upload your resume/ })).toBeDisabled();
  });
});
