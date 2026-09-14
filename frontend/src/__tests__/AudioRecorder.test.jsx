import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioRecorder } from "../components/AudioRecorder";

const { MockRecorder } = vi.hoisted(() => {
  class MockRecorder {
    static isRecordingSupported = () => true;

    constructor(config) {
      if (!MockRecorder.isRecordingSupported()) {
        throw new Error("Recording is not supported in this browser");
      }
      this.config = config;
      MockRecorder.instance = this;
    }

    start = vi.fn(() => Promise.resolve());
    stop = vi.fn(function () {
      this.onstop?.();
      return Promise.resolve();
    });
    close = vi.fn(() => {});
  }
  return { MockRecorder };
});

vi.mock("opus-recorder", () => ({ default: MockRecorder }));
vi.mock("../styles/pages/whatsapp.module.css", () => ({
  default: new Proxy({}, { get: (_, prop) => String(prop) }),
}));

describe("AudioRecorder", () => {
  const onSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSend.mockResolvedValue(undefined);
  });

  it("renderiza botão de microfone no estado inicial", () => {
    render(<AudioRecorder onSend={onSend} />);
    expect(screen.getByRole("button", { name: "Gravar nota de voz" })).toBeInTheDocument();
  });

  it("inicia gravação ao clicar no microfone", async () => {
    render(<AudioRecorder onSend={onSend} />);
    fireEvent.click(screen.getByRole("button", { name: "Gravar nota de voz" }));

    await waitFor(() => {
      expect(MockRecorder.instance.start).toHaveBeenCalled();
    });
    expect(screen.getByTitle("Parar gravação")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("para gravação e permite envio do blob OGG", async () => {
    render(<AudioRecorder onSend={onSend} />);
    fireEvent.click(screen.getByRole("button", { name: "Gravar nota de voz" }));

    await waitFor(() => {
      expect(screen.getByTitle("Parar gravação")).toBeInTheDocument();
    });

    MockRecorder.instance.ondataavailable(new Uint8Array([1, 2, 3]));
    fireEvent.click(screen.getByTitle("Parar gravação"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /enviar/i })).toBeInTheDocument();
    });
    expect(document.querySelector("audio")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledTimes(1);
    });
    const blob = onSend.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("audio/ogg");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Gravar nota de voz" })).toBeInTheDocument();
    });
  });

  it("cancela gravação voltando ao estado inicial", async () => {
    render(<AudioRecorder onSend={onSend} />);
    fireEvent.click(screen.getByRole("button", { name: "Gravar nota de voz" }));

    await waitFor(() => {
      expect(screen.getByTitle("Cancelar gravação")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Cancelar gravação"));

    expect(MockRecorder.instance.close).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Gravar nota de voz" })).toBeInTheDocument();
  });

  it("mostra mensagem de erro quando gravador não é suportado", async () => {
    MockRecorder.isRecordingSupported = () => false;
    MockRecorder.instance = null;
    render(<AudioRecorder onSend={onSend} />);
    fireEvent.click(screen.getByRole("button", { name: "Gravar nota de voz" }));

    await waitFor(() => {
      expect(screen.getByText(/Recording is not supported/i)).toBeInTheDocument();
    });
  });
});