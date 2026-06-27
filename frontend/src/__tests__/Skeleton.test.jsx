import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SkeletonTable, SkeletonCard } from "../components/ui/Skeleton";

describe("SkeletonTable", () => {
  it("renderiza 5 linhas por padrao", () => {
    const { container } = render(<SkeletonTable />);
    const rows = container.querySelectorAll(".skeleton");
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it("renderiza numero customizado de linhas", () => {
    const { container } = render(<SkeletonTable rows={3} />);
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBe(12);
  });

  it("renderiza colunas customizadas", () => {
    const { container } = render(<SkeletonTable columns={[3, 6, 3]} rows={2} />);
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBe(6);
  });
});

describe("SkeletonCard", () => {
  it("renderiza 3 linhas por padrao", () => {
    const { container } = render(<SkeletonCard />);
    const lines = container.querySelectorAll(".skeleton");
    expect(lines.length).toBe(3);
  });

  it("renderiza numero customizado de linhas", () => {
    const { container } = render(<SkeletonCard lines={5} />);
    const lines = container.querySelectorAll(".skeleton");
    expect(lines.length).toBe(5);
  });
});
