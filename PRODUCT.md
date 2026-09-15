# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner or manager of a small automotive detailing shop (estética automotiva), running day-to-day operations alone or with a few employees. Their job: book and run services, manage customers, vehicles and staff, track finances and reports, and keep WhatsApp conversations with clients flowing — all from one place they can operate without dedicated IT support.

The system models two roles, `admin` and `funcionário`, with admin-only access to finance, reports, expediente, feriados, employee management and service catalog deactivation.

## Product Purpose

EstetiCar is a complete management system for small Brazilian automotive detailing businesses. It covers clients, vehicles, services, appointments, work orders, invoicing and accounts, expediente and holidays, company configuration, notifications, and reports with PDF/Excel export, alongside a WhatsApp chatbot that lets customers book, consult, and cancel on their own.

It exists as an academic TCC project (Técnico em Desenvolvimento de Sistemas) and doubles as a working product for real shops. Success means one owner/manager can run bookings, follow-up, and finances without a separate channel or a second tool.

## Positioning

WhatsApp-first customer flow: customers start on WhatsApp and the same system handles their appointment, reminder, and live conversation through a built-in chatbot with human handoff — a small shop's clients never need to leave the messaging app they already use, and the business records stay in one tenant instead of scattered chats.

## Operating Context

- Brazilian Portuguese is the working language of the interface, chatbot, and copy.
- Operators work from desktop and mobile (layout adapts at ≤ 768px, tables become cards).
- A WhatsApp number connected via Baileys (unofficial WhatsApp Web protocol embedded in the backend) is the customer channel; an admin panel shows conversations alongside the chatbot.
- Each shop is a multi-tenant unit isolated by `tenant_id` derived from the JWT in every query.
- Phone numbers are normalized to the `(11) 99999-9999` mask across the system.

## Capabilities and Constraints

Confirmed capabilities:

- Clientes, Veículos (vinculados, placa única), Serviços (preço base e duração), Agendamentos (calendário + lista, conflito por janela de duração, expediente, feriados), Ordens de Serviço, Financeiro (contas a pagar, faturamentos, resumo), Relatórios com exportação PDF/Excel, Expediente, Feriados, Configuração da Empresa, Funcionários, Notificações, WhatsApp (conexão, chatbot, widget de conversas).
- Chatbot WhatsApp: menu contextual, agendar/consultar/cancelar, keywords (`menu`, `0`, `voltar`), atendimento humano com botões "Voltar ao bot" / "Continuar com atendente", retorno automático ao menu após 30 min sem atividade, não responde a si mesmo.
- Auth via Supabase Auth (JWT), sessão em `sessionStorage`, recuperação de senha por e-mail (link mágico) com validação de e-mail cadastrado, redefinição manual pelo admin.
- Segurança: Helmet, CORS restrito, rate limiting, Zod em rotas de escrita, sanitização de erros, logs sem dados pessoais, Swagger apenas fora de produção.
- Manutenção automática: limpeza de notificações > 30 dias, expiração de sessões do chatbot, lembretes com reenvio (máx. 3 tentativas).
- Testes: 306 backend + 277 frontend (Vitest).

Business rules (confirmed):

- Status do agendamento: pendente → confirmado → em_andamento → finalizado | cancelado | falta.
- Cancelamento exige antecedência mínima de 2 horas; conflito de horário considera a duração do serviço.
- Finalizar OS gera faturamento automaticamente e finaliza o agendamento; cancelar OS devolve o agendamento para confirmado.
- Cliente/veículo/serviço não podem ser excluídos se vinculados a registros ativos; conta paga e faturamento recebido não podem ser pagos novamente.

Constraints and open decisions:

- Backend: Node.js + Express; Frontend: React (Vite); DB: PostgreSQL (Supabase); Auth: Supabase Auth.
- Baileys is an unofficial protocol; migration to the WhatsApp Business API is recorded as optional future work.
- Not yet deployed (no production DB, domain, or env config); deploy targets, domain, and backup policy are open decisions.
- Academic project (TCC); no customer data, testimonials, or production tenants exist to treat as real-world evidence.

## Brand Commitments

The name "EstetiCar" is the project name; no committed logo, slogan, or brand system exists. No visual direction was given as binding.

## Evidence on Hand

- `README.md` — functional overview, business rules, setup, production gaps.
- `projetoDetalhado.md` — detailed project documentation (architecture, stack, DB).
- `docs/schema.sql` + `docs/schema-falta-status.sql` e demais `docs/migration-*.sql` — versioned database schema.
- 583 automated tests (backend + frontend) pass.
- Real customer testimonials, benchmarks, or production usage data do not exist and must not be fabricated.

## Product Principles

- WhatsApp is the point of entry: customer interaction flows into WhatsApp-first behavior, and every feature that touches a client should work through or alongside it without a second channel.
- Enforce rules, don't ask operators to remember them: conflict detection, 2-hour cancellation window, status transitions, and double-payment guards live in the system.
- Fit a lean operation: the primary user is one owner/manager, sometimes low-tech; a feature that needs dedicated staff or IT support to run does not belong in the core.
- One shop, isolated: tenant isolation is absolute; multi-tenant correctness outranks convenience across shared features.
- Records stay consistent: appointment → OS → invoicing flow should stay coherent automatically, with reports as a truthful mirror of the operation.

## Accessibility & Inclusion

No product-specific accessibility requirement was established beyond responsive layout for small screens.