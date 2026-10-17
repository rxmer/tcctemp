# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O(a) dono(a)/administrador(a) de uma estética automotiva de pequeno porte. Ele(a) abre a conta, configura o negócio e depois opera o dia a dia (agenda, ordens de serviço, financeiro, WhatsApp). O cadastro e a configuração inicial acontecem sobretudo no desktop (computador do balcão/escritório), sozinho, na primeira sessão — frequentemente entre atendimentos, sem tempo nem paciência para um formulário longo. Funcionários entram depois, com perfil restrito, num app já configurado.

## Product Purpose

Sistema web de gestão para estéticas automotivas: agenda, clientes, veículos, serviços, ordens de serviço, financeiro, relatórios e um chatbot de WhatsApp embutido. Existe para tirar do caderno e da memória a operação de uma pequena oficina de estética automotiva e colocar agenda + atendimento + caixa num só lugar. Sucesso = o negócio configurado e operando no mesmo dia em que a conta foi criada.

## Positioning

Não é um CRM genérico: é um ERP de estética automotiva multi-tenant com atendimento WhatsApp nativo (chatbot Baileys + inbox de atendente humano) e regras de negócio do ramo embutidas (conflito de horário por duração, expediente, feriados, fluxo de status de agendamento e geração automática de faturamento ao finalizar a OS). O momento de cadastro precisa provar que o produto "já entende" uma estética automotiva — serviços comuns pré-criados, expediente padrão, WhatsApp pronto.

## Operating Context

- Uso administrativo, autenticado, isolado por `tenant_id` derivado do JWT.
- Dois perfis: admin (dono) e funcionário; telas financeiras, de empresa e relatórios são exclusivas do admin.
- Cadastro público cria a empresa + usuário admin → onboarding guiado → dashboard.
- O onboarding configura, na ordem: serviços, expediente, dados da empresa, conexão do WhatsApp (QR Code de 60s) e conclusão.
- Existe um checklist de "primeiros passos" no dashboard que retoma essas mesmas etapas (imagem demonstrativa do mundo visual, não contrato de layout).
- Sessão em `sessionStorage`; autenticação via Supabase Auth no frontend, dados via API REST no backend.

## Capabilities and Constraints

- Cadastro hoje é um fluxo de 2 passos (Empresa → Acesso) com validação no frontend (nome da empresa, nome, e-mail válido, senha ≥ 8, confirmação, aceite dos Termos de Uso e Política de Privacidade) e `signUp` que cria empresa + admin.
- Onboarding hoje é um wizard de 5 passos com "Pular configuração" e salvamento por etapa (serviços via `servicosService`, expediente via `expedienteService.upsertAll`, empresa via `configuracaoEmpresaService`, WhatsApp via `whatsappService` + polling de status a cada 5s).
- Passos, ordem, validações e chamadas de API são preservados neste redesign; a lógica de negócio não muda.
- Constraint confirmado pela direção: manter a identidade visual EstetiCar (tema escuro padrão + tema claro opcional, accent dourado, fontes Rajdhani/Inter) e evoluir composição, hierarquia, estados e experiência dentro desse mundo.
- Responsividade: mobile ≤ 768px, com quebras por breakpoint (não tipografia fluida).

## Evidence on Hand

- Identidade e marca: `/esteticar.png` (logo), nome "EstetiCar" (usado no login, no título e no shell).
- Tokens de design em `frontend/src/styles/global.css`.
- Telas irmãs que definem o vocabulário visual: `Login.jsx`/`Login.module.css` (split brand + form), `AppLayout` (topbar + navegação).
- Sem depoimentos, métricas, clientes reais ou preços neste projeto — nenhum deve ser inventado.

## Product Principles

1. **Configurar é trabalho, não leitura:** cada tela é uma tarefa com um próximo passo óbvio; nada decorativo atrapalha a conclusão.
2. **Já entende o ramo:** pré-preencher e pré-criar o que é padrão em estética automotiva; o dono edita, não parte do zero.
3. **Grave o progresso:** o usuário pode pular e retomar; o estado nunca fica ambíguo sobre o que já foi salvo.
4. **Confiança premium:** a mesma linguagem escura/dourada do produto, consistente entre login, cadastro e onboarding.
5. **Uma ação primária por vez:** hierarquia clara, sem competição de botões.

## Accessibility & Inclusion

Nenhum requisito específico declarado além das boas práticas já presentes (foco visível, contraste de texto, `aria` em controles). Manter e não regredir foco por teclado, rótulos e contraste em ambos os temas.
