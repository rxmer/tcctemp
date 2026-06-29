-- Corrige notificacoes existentes que usam o status cru "em_andamento" no titulo
UPDATE notificacoes
SET titulo = REPLACE(titulo, 'em_andamento', 'Em andamento')
WHERE titulo LIKE '%em_andamento%';
