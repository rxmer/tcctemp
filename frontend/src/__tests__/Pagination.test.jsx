import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Pagination } from "../components/ui/Pagination";

describe("Pagination", () => {
  const defaultProps = { page: 1, limit: 20, total: 100, onPageChange: vi.fn() };

  it("renderiza quando total > limit", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("Página 1 de 5")).toBeInTheDocument();
  });

  it("nao renderiza quando total <= limit", () => {
    const { container } = render(
      <Pagination page={1} limit={20} total={15} onPageChange={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("nao renderiza quando total e 0", () => {
    const { container } = render(
      <Pagination page={1} limit={20} total={0} onPageChange={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("desabilita botao Anterior na primeira pagina", () => {
    render(<Pagination {...defaultProps} page={1} />);
    expect(screen.getByText("Anterior")).toBeDisabled();
  });

  it("habilita botao Anterior quando nao esta na primeira pagina", () => {
    render(<Pagination {...defaultProps} page={2} />);
    expect(screen.getByText("Anterior")).not.toBeDisabled();
  });

  it("desabilita botao Proximo na ultima pagina", () => {
    render(<Pagination {...defaultProps} page={5} total={100} />);
    expect(screen.getByText("Próxima")).toBeDisabled();
  });

  it("habilita botao Proximo quando nao esta na ultima pagina", () => {
    render(<Pagination {...defaultProps} page={3} />);
    expect(screen.getByText("Próxima")).not.toBeDisabled();
  });

  it("chama onPageChange com page - 1 ao clicar Anterior", async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} page={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByText("Anterior"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("chama onPageChange com page + 1 ao clicar Proximo", async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} page={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByText("Próxima"));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("mostra o texto correto com pagina e totalPages", () => {
    render(<Pagination {...defaultProps} page={4} total={80} />);
    expect(screen.getByText("Página 4 de 4")).toBeInTheDocument();
  });
});
