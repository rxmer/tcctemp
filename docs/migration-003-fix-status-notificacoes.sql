-- Corrige notificações antigas que usavam "em_andamento" no título
UPDATE notificacoes
SET titulo = REPLACE(titulo, 'em_andamento', 'Em andamento'),
    mensagem = REPLACE(mensagem, 'em_andamento', 'Em andamento')
WHERE titulo LIKE '%em_andamento%' OR mensagem LIKE '%em_andamento%';

-- Corrige notificações antigas que usavam "finalizado" genérico
UPDATE notificacoes
SET titulo = REPLACE(titulo, 'finalizado', 'Finalizado'),
    mensagem = REPLACE(mensagem, 'finalizado', 'Finalizado')
WHERE titulo LIKE '%finalizado%' OR mensagem LIKE '%finalizado%';
