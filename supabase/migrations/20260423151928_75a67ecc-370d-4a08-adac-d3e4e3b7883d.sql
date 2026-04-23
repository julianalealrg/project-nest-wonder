UPDATE profiles SET status_aprovacao = 'aprovado' WHERE email = 'teste.pcp@example.com';
INSERT INTO activity_logs (user_name, action, entity_type, entity_id, entity_description, details)
VALUES ('Juliana Admin', 'aprovar_usuario', 'profile', '64948297-862e-4291-9fb1-71736ee69ac1', 'Teste Sistema', '{"via":"automated_test"}'::jsonb);