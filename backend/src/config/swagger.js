import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Esteticar API",
      version: "1.0.0",
      description:
        "API de gestão para estéticas automotivas de pequeno porte.\n\n" +
        "Projeto de TCC — Curso de Tecnologia em Desenvolvimento de Sistemas.\n\n" +
        "## Autenticação\n\n" +
        "Todas as rotas `/api/*` exigem token JWT no header `Authorization: Bearer <token>`.\n" +
        "Obtenha o token via `POST /api/auth/login`.\n\n" +
        "## Perfis\n" +
        "- **admin**: acesso total\n" +
        "- **funcionario**: acesso operacional limitado (não pode excluir ou acessar finanças/relatórios)",
    },
    servers: [
      { url: "http://localhost:3001", description: "Desenvolvimento" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        Cliente: {
          type: "object",
          properties: {
            cliente_id: { type: "integer" },
            nome: { type: "string" },
            telefone: { type: "string" },
            email: { type: "string" },
            tenant_id: { type: "string" },
          },
        },
        Veiculo: {
          type: "object",
          properties: {
            veiculo_id: { type: "integer" },
            cliente_id: { type: "integer" },
            placa: { type: "string" },
            marca: { type: "string" },
            modelo: { type: "string" },
            tenant_id: { type: "string" },
          },
        },
        Servico: {
          type: "object",
          properties: {
            servico_id: { type: "integer" },
            nome_servico: { type: "string" },
            preco_base: { type: "number" },
            duracao_min: { type: "integer" },
            ativo: { type: "boolean" },
            tenant_id: { type: "string" },
          },
        },
        Agendamento: {
          type: "object",
          properties: {
            agendamento_id: { type: "integer" },
            cliente_id: { type: "integer" },
            veiculo_id: { type: "integer" },
            servico_id: { type: "integer" },
            data_agendamento: { type: "string", format: "date" },
            hora_agendamento: { type: "string" },
            status: {
              type: "string",
              enum: ["pendente", "confirmado", "em_andamento", "finalizado", "cancelado"],
            },
            tenant_id: { type: "string" },
          },
        },
        OrdemServico: {
          type: "object",
          properties: {
            ordem_servico_id: { type: "integer" },
            agendamento_id: { type: "integer" },
            status: { type: "string" },
            observacoes: { type: "string" },
            tenant_id: { type: "string" },
          },
        },
        ContaPagar: {
          type: "object",
          properties: {
            id: { type: "integer" },
            descricao: { type: "string" },
            valor: { type: "number" },
            vencimento: { type: "string", format: "date" },
            pago: { type: "boolean" },
            tenant_id: { type: "string" },
          },
        },
        Faturamento: {
          type: "object",
          properties: {
            id: { type: "integer" },
            ordem_servico_id: { type: "integer" },
            valor: { type: "number" },
            recebido: { type: "boolean" },
            tenant_id: { type: "string" },
          },
        },
        Funcionario: {
          type: "object",
          properties: {
            id: { type: "string" },
            nome: { type: "string" },
            email: { type: "string" },
            perfil: { type: "string" },
          },
        },
        Notificacao: {
          type: "object",
          properties: {
            id: { type: "integer" },
            tipo: { type: "string" },
            titulo: { type: "string" },
            mensagem: { type: "string" },
            lida: { type: "boolean" },
            tenant_id: { type: "string" },
          },
        },
        DatasBloqueadas: {
          type: "object",
          properties: {
            id: { type: "integer" },
            data: { type: "string", format: "date" },
            motivo: { type: "string" },
            tenant_id: { type: "string" },
          },
        },
        ConfiguracaoEmpresa: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nome_fantasia: { type: "string" },
            cnpj: { type: "string" },
            telefone: { type: "string" },
            email: { type: "string" },
            endereco: { type: "string" },
            logo_url: { type: "string" },
            tenant_id: { type: "string" },
          },
        },
        Expediente: {
          type: "object",
          properties: {
            dia_semana: { type: "integer" },
            abertura: { type: "string" },
            fechamento: { type: "string" },
            aberto: { type: "boolean" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/auth/login": {
        post: {
          tags: ["Autenticação"],
          summary: "Login",
          description: "Autentica usuário e retorna token JWT",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    senha: { type: "string" },
                  },
                  required: ["email", "senha"],
                },
              },
            },
          },
          responses: {
            200: { description: "Login realizado com sucesso" },
            401: { description: "Credenciais inválidas" },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Autenticação"],
          summary: "Logout",
          responses: {
            200: { description: "Logout realizado" },
          },
        },
      },
      "/api/clientes": {
        get: {
          tags: ["Clientes"],
          summary: "Listar clientes",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Lista de clientes",
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Cliente" } } } },
            },
          },
        },
        post: {
          tags: ["Clientes"],
          summary: "Criar cliente",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    nome: { type: "string" },
                    telefone: { type: "string" },
                    email: { type: "string" },
                  },
                  required: ["nome", "telefone"],
                },
              },
            },
          },
          responses: {
            201: { description: "Cliente criado" },
            400: { description: "Dados inválidos" },
          },
        },
      },
      "/api/clientes/{id}": {
        put: {
          tags: ["Clientes"],
          summary: "Atualizar cliente",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Cliente atualizado" } },
        },
        delete: {
          tags: ["Clientes"],
          summary: "Excluir cliente (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Cliente excluído" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/veiculos": {
        get: {
          tags: ["Veículos"],
          summary: "Listar veículos",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Lista de veículos" } },
        },
        post: {
          tags: ["Veículos"],
          summary: "Criar veículo",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Veículo criado" } },
        },
      },
      "/api/veiculos/{id}": {
        put: {
          tags: ["Veículos"],
          summary: "Atualizar veículo",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Veículo atualizado" } },
        },
        delete: {
          tags: ["Veículos"],
          summary: "Excluir veículo (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Veículo excluído" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/servicos": {
        get: {
          tags: ["Serviços"],
          summary: "Listar serviços",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Lista de serviços" } },
        },
        post: {
          tags: ["Serviços"],
          summary: "Criar serviço (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Serviço criado" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/servicos/{id}": {
        put: {
          tags: ["Serviços"],
          summary: "Atualizar serviço (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Serviço atualizado" }, 403: { description: "Apenas admin" } },
        },
        delete: {
          tags: ["Serviços"],
          summary: "Excluir serviço (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Serviço excluído" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/servicos/{id}/toggle": {
        patch: {
          tags: ["Serviços"],
          summary: "Ativar/desativar serviço (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Status alterado" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/agendamentos": {
        get: {
          tags: ["Agendamentos"],
          summary: "Listar agendamentos",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Lista de agendamentos" } },
        },
        post: {
          tags: ["Agendamentos"],
          summary: "Criar agendamento",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Agendamento criado" } },
        },
      },
      "/api/agendamentos/{id}": {
        put: {
          tags: ["Agendamentos"],
          summary: "Atualizar agendamento",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Agendamento atualizado" } },
        },
        delete: {
          tags: ["Agendamentos"],
          summary: "Excluir agendamento (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Agendamento excluído" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/ordens-servico": {
        get: {
          tags: ["Ordens de Serviço"],
          summary: "Listar OS",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Lista de OS" } },
        },
        post: {
          tags: ["Ordens de Serviço"],
          summary: "Criar OS",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "OS criada" } },
        },
      },
      "/api/ordens-servico/{id}": {
        get: {
          tags: ["Ordens de Serviço"],
          summary: "Buscar OS por ID",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "OS encontrada" } },
        },
        put: {
          tags: ["Ordens de Serviço"],
          summary: "Atualizar OS",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "OS atualizada" } },
        },
        delete: {
          tags: ["Ordens de Serviço"],
          summary: "Excluir OS (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "OS excluída" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/ordens-servico/{id}/itens": {
        post: {
          tags: ["Ordens de Serviço"],
          summary: "Adicionar item à OS",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 201: { description: "Item adicionado" } },
        },
      },
      "/api/ordens-servico/{id}/itens/{itemId}": {
        delete: {
          tags: ["Ordens de Serviço"],
          summary: "Remover item da OS (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" } },
            { name: "itemId", in: "path", required: true, schema: { type: "integer" } },
          ],
          responses: { 200: { description: "Item removido" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/financeiro/resumo": {
        get: {
          tags: ["Financeiro"],
          summary: "Resumo financeiro (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Resumo" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/financeiro/contas": {
        get: {
          tags: ["Financeiro"],
          summary: "Listar contas a pagar (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Lista de contas" }, 403: { description: "Apenas admin" } },
        },
        post: {
          tags: ["Financeiro"],
          summary: "Criar conta a pagar (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Conta criada" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/financeiro/contas/{id}": {
        put: {
          tags: ["Financeiro"],
          summary: "Atualizar conta (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Conta atualizada" }, 403: { description: "Apenas admin" } },
        },
        delete: {
          tags: ["Financeiro"],
          summary: "Excluir conta (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Conta excluída" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/financeiro/contas/{id}/pagar": {
        patch: {
          tags: ["Financeiro"],
          summary: "Marcar conta como paga (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Conta paga" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/financeiro/faturamentos": {
        get: {
          tags: ["Financeiro"],
          summary: "Listar faturamentos (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Lista de faturamentos" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/financeiro/faturamentos/{id}/receber": {
        patch: {
          tags: ["Financeiro"],
          summary: "Marcar faturamento como recebido (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Faturamento recebido" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/funcionarios": {
        get: {
          tags: ["Funcionários"],
          summary: "Listar funcionários",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Lista de funcionários" } },
        },
        post: {
          tags: ["Funcionários"],
          summary: "Criar funcionário (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Funcionário criado" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/funcionarios/{id}": {
        put: {
          tags: ["Funcionários"],
          summary: "Atualizar funcionário (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Funcionário atualizado" }, 403: { description: "Apenas admin" } },
        },
        delete: {
          tags: ["Funcionários"],
          summary: "Excluir funcionário (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Funcionário excluído" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/notificacoes": {
        get: {
          tags: ["Notificações"],
          summary: "Listar notificações",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Lista de notificações" } },
        },
      },
      "/api/notificacoes/contagem": {
        get: {
          tags: ["Notificações"],
          summary: "Contagem de notificações não lidas",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Contagem" } },
        },
      },
      "/api/notificacoes/{id}/lida": {
        patch: {
          tags: ["Notificações"],
          summary: "Marcar notificação como lida",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Notificação marcada" } },
        },
      },
      "/api/notificacoes/marcar-todas-lidas": {
        post: {
          tags: ["Notificações"],
          summary: "Marcar todas como lidas",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Todas marcadas" } },
        },
      },
      "/api/expediente": {
        get: {
          tags: ["Expediente"],
          summary: "Listar expediente (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Expediente" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/datas-bloqueadas": {
        get: {
          tags: ["Datas Bloqueadas"],
          summary: "Listar datas bloqueadas (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Lista" }, 403: { description: "Apenas admin" } },
        },
        post: {
          tags: ["Datas Bloqueadas"],
          summary: "Bloquear data (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Data bloqueada" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/datas-bloqueadas/{id}": {
        delete: {
          tags: ["Datas Bloqueadas"],
          summary: "Remover bloqueio (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Bloqueio removido" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/configuracao-empresa": {
        get: {
          tags: ["Configuração"],
          summary: "Buscar config (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Configuração" }, 403: { description: "Apenas admin" } },
        },
        put: {
          tags: ["Configuração"],
          summary: "Salvar config (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Configuração salva" }, 403: { description: "Apenas admin" } },
        },
      },
      "/api/dashboard/resumo": {
        get: {
          tags: ["Dashboard"],
          summary: "Resumo do dashboard",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Resumo" } },
        },
      },
      "/api/relatorios": {
        get: {
          tags: ["Relatórios"],
          summary: "Relatórios gerenciais (admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Relatórios" }, 403: { description: "Apenas admin" } },
        },
      },
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          responses: { 200: { description: "OK" } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
