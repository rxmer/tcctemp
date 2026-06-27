import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useConfirm } from "../hooks/useConfirm";

function TestComponent() {
  const { confirm, ConfirmModal } = useConfirm();

  async function handleClick() {
    const result = await confirm("Deseja excluir?");
    if (result) {
      document.title = "confirmado";
    } else {
      document.title = "cancelado";
    }
  }

  return (
    <div>
      <button onClick={handleClick}>Excluir</button>
      <ConfirmModal />
    </div>
  );
}

describe("useConfirm", () => {
  it("nao mostra modal inicialmente", () => {
    render(<TestComponent />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra modal ao chamar confirm", async () => {
    render(<TestComponent />);
    await act(async () => {
      fireEvent.click(screen.getByText("Excluir"));
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Deseja excluir?")).toBeInTheDocument();
  });

  it("fecha modal ao clicar em Cancelar", async () => {
    render(<TestComponent />);
    await act(async () => {
      fireEvent.click(screen.getByText("Excluir"));
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Cancelar"));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fecha modal ao clicar em Confirmar", async () => {
    render(<TestComponent />);
    await act(async () => {
      fireEvent.click(screen.getByText("Excluir"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Confirmar"));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("retorna true ao confirmar", async () => {
    render(<TestComponent />);
    await act(async () => {
      fireEvent.click(screen.getByText("Excluir"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Confirmar"));
    });
    expect(document.title).toBe("confirmado");
  });

  it("retorna false ao cancelar", async () => {
    render(<TestComponent />);
    await act(async () => {
      fireEvent.click(screen.getByText("Excluir"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Cancelar"));
    });
    expect(document.title).toBe("cancelado");
  });

  it("fecha modal ao clicar no overlay", async () => {
    render(<TestComponent />);
    await act(async () => {
      fireEvent.click(screen.getByText("Excluir"));
    });

    const overlay = screen.getByRole("dialog");
    await act(async () => {
      fireEvent.click(overlay);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
