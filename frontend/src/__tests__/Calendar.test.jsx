import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Calendar } from "../components/ui/Calendar";

vi.mock("../components/ui/Calendar.module.css", () => ({
  default: {
    wrapper: "wrapper",
    header: "header",
    nav: "nav",
    title: "title",
    todayBtn: "todayBtn",
    weekdays: "weekdays",
    weekday: "weekday",
    grid: "grid",
    day: "day",
    dayToday: "dayToday",
    daySelected: "daySelected",
    dayHasEvents: "dayHasEvents",
    dayNum: "dayNum",
    badge: "badge",
  },
}));

describe("Calendar", () => {
  it("renderiza o mes e ano atual", () => {
    const hoje = new Date();
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    render(<Calendar />);
    expect(screen.getByText(`${meses[hoje.getMonth()]} ${hoje.getFullYear()}`)).toBeInTheDocument();
  });

  it("renderiza dias da semana", () => {
    render(<Calendar />);
    expect(screen.getByText("Dom")).toBeInTheDocument();
    expect(screen.getByText("Seg")).toBeInTheDocument();
    expect(screen.getByText("Sáb")).toBeInTheDocument();
  });

  it("renderiza botoes de navegacao", () => {
    render(<Calendar />);
    expect(screen.getByText("‹")).toBeInTheDocument();
    expect(screen.getByText("›")).toBeInTheDocument();
    expect(screen.getByText("Hoje")).toBeInTheDocument();
  });

  it("navega para o mes anterior ao clicar em ‹", () => {
    render(<Calendar />);
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    const hoje = new Date();
    const mesAnterior = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1;
    const anoAnterior = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();

    fireEvent.click(screen.getByText("‹"));
    expect(screen.getByText(`${meses[mesAnterior]} ${anoAnterior}`)).toBeInTheDocument();
  });

  it("navega para o mes proximo ao clicar em ›", () => {
    render(<Calendar />);
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    const hoje = new Date();
    const mesProximo = hoje.getMonth() === 11 ? 0 : hoje.getMonth() + 1;
    const anoProximo = hoje.getMonth() === 11 ? hoje.getFullYear() + 1 : hoje.getFullYear();

    fireEvent.click(screen.getByText("›"));
    expect(screen.getByText(`${meses[mesProximo]} ${anoProximo}`)).toBeInTheDocument();
  });

  it("chama onDateSelect ao clicar em um dia", () => {
    const onDateSelect = vi.fn();
    render(<Calendar onDateSelect={onDateSelect} />);
    const dias = screen.getAllByText(/^1$/);
    fireEvent.click(dias[0]);
    expect(onDateSelect).toHaveBeenCalled();
  });

  it("chama onMonthChange ao navegar", () => {
    const onMonthChange = vi.fn();
    render(<Calendar onMonthChange={onMonthChange} />);
    fireEvent.click(screen.getByText("‹"));
    expect(onMonthChange).toHaveBeenCalled();
  });

  it("exibe badge com contagem de agendamentos", () => {
    const hoje = new Date();
    const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const agendamentos = [
      { data_agendamento: dataHoje },
      { data_agendamento: dataHoje },
    ];
    const { container } = render(<Calendar agendamentos={agendamentos} />);
    const badges = container.querySelectorAll(".badge");
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].textContent).toBe("2");
  });
});
