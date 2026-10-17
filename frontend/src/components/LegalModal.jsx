import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import styles from "../styles/components/LegalModal.module.css";

const SECOES = {
  termos: {
    titulo: "Termos de Uso",
    atualizado: "Janeiro de 2026",
    blocos: [
      { h: "Aceitação", p: "Ao criar uma conta no EstetiCar, você concorda com estes Termos de Uso. Caso não concorde, não utilize o sistema." },
      { h: "Descrição do serviço", p: "O EstetiCar é um sistema de gestão para estéticas automotivas que inclui agenda, cadastro de clientes e veículos, controle financeiro e atendimento via WhatsApp." },
      { h: "Responsabilidades do usuário", p: "Você é responsável pela veracidade dos dados informados, pela guarda das suas credenciais de acesso e pelo uso adequado das informações de seus clientes, observando a legislação aplicável." },
      { h: "Uso aceitável", p: "É proibido utilizar o sistema para envio de mensagens não solicitadas (spam), atividades ilícitas ou que violem direitos de terceiros." },
      { h: "Suspensão e cancelamento", p: "Podemos suspender ou encerrar contas que violem estes termos ou a legislação vigente." },
      { h: "Contato", p: "Em caso de dúvidas, entre em contato pelo canal de suporte do sistema." },
    ],
  },
  privacidade: {
    titulo: "Política de Privacidade",
    atualizado: "Janeiro de 2026",
    blocos: [
      { h: "Dados coletados", p: "Coletamos os dados necessários para operar o sistema: dados da empresa (nome, contato, endereço), dados de acesso (nome, e-mail) e os dados dos seus clientes que você cadastra." },
      { h: "Finalidade do tratamento", p: "Os dados são utilizados para prestar o serviço contratado, gerenciar agendamentos e comunicações, e cumprir obrigações legais." },
      { h: "Base legal", p: "O tratamento é realizado com base na execução do contrato e no seu consentimento, conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)." },
      { h: "Compartilhamento", p: "Não vendemos seus dados. O compartilhamento ocorre apenas com provedores de infraestrutura necessários à operação do serviço." },
      { h: "Seus direitos", p: "Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados pessoais a qualquer momento, conforme previsto na LGPD." },
      { h: "Segurança", p: "Adotamos medidas técnicas e administrativas para proteger os dados, incluindo controle de acesso, criptografia de credenciais sensíveis e logs de auditoria." },
    ],
  },
};

export function LegalModal({ tipo, onClose }) {
  const dialogRef = useRef(null);
  const conteudo = SECOES[tipo];

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  if (!conteudo) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="legal-title" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <h2 id="legal-title">{conteudo.titulo}</h2>
            <p className={styles.updated}>Última atualização: {conteudo.atualizado}</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className={styles.body}>
          {conteudo.blocos.map((b) => (
            <section key={b.h} className={styles.bloco}>
              <h3>{b.h}</h3>
              <p>{b.p}</p>
            </section>
          ))}
        </div>

        <footer className={styles.footer}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Entendi
          </button>
        </footer>
      </div>
    </div>
  );
}
