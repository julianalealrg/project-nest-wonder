# PCP NUE Projetos — Guia de Uso

Sistema de Planejamento e Controle de Produção da NUE Projetos.
Domínio: `pcp.nueprojetos.com.br`

---

## 1. Primeiro acesso

1. Abre `pcp.nueprojetos.com.br`
2. Login com seu email/senha (se for nova conta, faz cadastro)
3. Tela inicial: KPIs gerais (OS em produção, registros abertos, alertas, OS entregues no mês) + módulos no menu lateral

## 2. Cadastrar clientes (recomendado antes da primeira OS)

1. Menu lateral → **Clientes**
2. **Novo Cliente** → preenche: nome, CNPJ/CPF, telefone, email, endereço, supervisor, arquiteta, observações
3. Salva — cliente aparece na lista
4. Pode preencher só o nome agora e completar depois

> **Dica:** se você criar a OS primeiro, o cliente é criado automaticamente, mas só com os campos básicos (nome, endereço, supervisor, contato). Os outros campos você completa depois em /clientes.

## 3. Mesclar clientes duplicados (limpeza one-time)

1. Em **Clientes**, se houver duplicados, aparece o botão **"Mesclar (N)"** no canto superior
2. Clica — vê lista de pares similares (ex: "Hurquiza" / "Urquiza")
3. Pra cada par: **Manter A** ou **Manter B** ou **Não são duplicados**
4. Ao mesclar, todas as OS migram pro mantido + campos vazios são preenchidos com os dados do removido

## 4. Criar uma OS

### Modo manual

1. **Produção** → **Nova OS**
2. Digita nome do cliente — autocomplete sugere existentes (badge **Exato** verde / **Parecido** amarelo)
3. Seleciona ou cria novo
4. Preenche dados da OS: ambiente, material, projetista, data de entrega
5. Adiciona peças (item, descrição, quantidade, comprimento × largura)
6. Marca se cada peça precisa de 45°, poliborda, usinagem
7. Salva — OS gerada com código `OS{YY}-{NNN}` em status "Aguardando Material"

### Modo PDF (importar OS pronta)

1. **Nova OS** → aba **PDF**
2. Solta um ou mais PDFs de Ordem de Serviço
3. Sistema usa IA pra extrair: cliente, material, peças, área (do cabeçalho)
4. Confere os campos, salva
5. A área extraída do cabeçalho fica travada como "manual" (não é sobrescrita pela soma das peças). Pra trocar pra auto-soma, clica em "usar auto-soma" no campo de área.

## 5. Fluxo de produção (do material até a entrega)

```
Aguardando Material → Fila Corte → Cortando → Enviado B2 → Acabamento → CQ → Expedição → Entregue
```

Cada passo é controlado pelo botão **primário** no header da OS:

1. **Aguardando Material → Fila Corte:** quando o material chega, clica no botão "Fila Corte"
2. **Fila Corte → Cortando:** quando o operador começa o corte
3. **Cortando → Env. B2:** ao concluir todas as peças no corte, clica "Gerar romaneio B1→B2" → preenche motorista/ajudante/peças → cria romaneio (status: pendente)
4. Em **Logística**, despacha o romaneio (foto cavalete, foto carga, foto romaneio motorista — opcionais)
5. Quando chega na Base 2, abre o romaneio em **Logística** → **Confirmar recebimento** → confere peça por peça (marca faltante/avariada com foto se for o caso) + 2 fotos gerais (peças armazenadas, romaneio assinado)
6. OS auto-avança pra **Acabamento**
7. Avança peças no **detalhe da OS → Operação**: 45°, poliborda, usinagem, acabamento (com fotos opcionais de insumos e doc do acabador)
8. Quando todas as peças terminam acabamento, OS auto-avança pra **CQ**
9. Marca cada peça como Aprovada ou Reprovada (com foto opcional). Se reprovada, OS volta pra Acabamento automaticamente e ganha badge "Retrabalho (N)"
10. Quando todas aprovadas, **Confirmar expedição** (preenche "Aprovado por")
11. **Expedição → Entregue:** clica "Gerar romaneio" → cria romaneio B2→Cliente → despacha em Logística → cliente recebe (foto romaneio assinado) → OS auto-vira **Entregue**

## 6. Fluxos paralelos (casos especiais)

### Enviar pra terceiro (corte fora)

- OS em **Cortando** → "Enviar para terceiro" → escolhe terceiro → cria romaneio B1→Cliente
- Quando volta: **Confirmar entrega** com romaneio recebido

### Terceiro recusou

- OS em **Terceiros** → dropdown "Mais ações" → **Terceiro recusou** (preenche motivo)
- OS vira **Terceiro recusou** (vermelho) → escolhe **Refazer na Base 1** ou **Reencaminhar a outro terceiro**

### Retorno B2 → B1 (faltou um corte/recorte)

- OS em **Acabamento** ou **CQ** → "Mais ações" → **Voltar para Base 1 (gerar romaneio)** → cria romaneio B2→B1
- Quando recebido na B1, OS auto-volta pra **Cortando** pra refazer
- Termina o corte → cria novo romaneio B1→B2 → segue fluxo normal

## 7. Registros (ocorrências + reposições)

Quando algo acontece (peça quebrou, cliente reclamou, faltou no recebimento):

1. Menu **Registros** → **Novo**, ou
2. Direto na OS → aba **Ocorrências** → "+ Ocorrência Fábrica" / "+ Solicitação Reposição"

### Tipos de origem

- **OBRA** (OC) — problema na obra do cliente
- **FÁBRICA** (OF) — problema interno (corte errado, peça quebrou)
- **REPOSIÇÃO** (REP) — pedido de peça nova

### Ação produtiva

- **Cortar nova** — gera OS nova passando por Base 1 completo
- **Cortar nova + retrabalhar antiga** — Base 1 + Base 2
- **Apenas retrabalho** — pula Base 1, vai direto pra Acabamento (Base 2)
- **Nenhuma** — só registra, sem gerar OS

Sistema gera automaticamente uma OS vinculada (com código REP/OC/OF) quando há ação produtiva.

## 8. Kanban (gestão visual)

1. **Produção** → toggle **Kanban** (canto superior direito)
2. Visão por colunas de status (Aguardando → Entregue) + faixas separadas pra Terceiros, Recusados e Retorno à B1
3. Cards mostram: tipo (REP/OC/OF), código, cliente, ambiente/material, peças, prazo
4. Badges de alerta:
   - **Atrasado** (vermelho)
   - **Retrabalho (N)** (vermelho)
   - **Ocorrência (N)** (vermelho)
   - **Em trânsito** (azul)
   - **Há X nesta etapa** (verde/amarelo se >24h/vermelho se >48h)
5. Clica num card pra abrir o detalhe
6. Coluna **Entregue** mostra só OS dos últimos 5 dias (rotativa)

## 9. Detalhe da OS

- **Header:** ações primárias (próximo passo) + dropdown "Mais ações" + alertas
- **Cards de resumo:** Material, Área, Em produção (X dias), Prazo, Peças (X/Y)
- **Aba Operação:** peças (todas as estações), romaneios vinculados, timeline lateral
- **Aba Linha do tempo:** etapas concluídas com duração, etapa atual com badge de severidade (Atenção >24h amarelo, Atenção crítica >48h vermelho), pendentes
- **Aba Ocorrências:** registros vinculados a essa OS
- **Aba Histórico:** activity_logs detalhado
- **Botão "Gerar PDF":** ordem de produção completa com peças, ocorrências, histórico

## 10. Logística

1. Menu **Logística** → 2 abas: **Internas** (B1↔B2, recolha) e **Expedição** (B2/B1 → cliente)
2. Cada romaneio: **Despachar** (com fotos) → **Confirmar recebimento** (com conferência peça por peça)
3. Faltantes/avariadas geram Registros automáticos
4. Romaneios cancelados ficam tachados (linha cortada vermelha)
5. Pra cancelar um romaneio: abre o romaneio → **Cancelar romaneio**

## 11. Dashboard (analytics)

- KPIs: Registros abertos, OS em produção, Pendentes Projetos, Taxa de resolução, Tempo médio
- Filtros: origem, período (7d, 30d, 90d, customizado), supervisor, projetista, urgência
- Gráficos por origem, por status, por supervisor
- Botão **Exportar Excel**

## 12. Exportar Excel

Botão **Exportar** existe em: Produção, Registros, Logística, Dashboard. Sempre exporta o que está filtrado na tela.

## 13. PDF da OS

Em **Detalhe da OS** → **Gerar PDF**. Gera documento completo:

- Capa com header + cliente + peças
- Anexo de Ocorrências/Solicitações com pills coloridas
- Anexo de Histórico (últimos 40 logs)
- Marcação inline em peças com problema: `[✗ FALTANTE — REP26-NNN]`, `[⚠ AVARIADA — OF26-NNN]`

---

## Glossário rápido

| Termo | Significado |
|-------|-------------|
| **OS** | Ordem de Serviço (uma peça ou conjunto pra um cliente) |
| **Cliente** | Cliente final + obra. Cada cliente pode ter várias OS |
| **Peça** | Item dentro da OS (bancada, testeira, soleira, etc) |
| **Romaneio** | Documento de transporte. Tipos: B1→B2, B2→B1, B2→Cliente, B1→Cliente, Recolha |
| **Registro** | Ocorrência ou pedido de reposição |
| **B1** | Base 1 (corte, primeira fase) |
| **B2** | Base 2 (acabamento, CQ, expedição) |
| **CQ** | Controle de Qualidade |
| **Ação produtiva** | Decisão sobre o que fazer com um registro (cortar nova, retrabalhar, etc) |
| **Em trânsito** | Romaneio despachado e ainda não confirmado no destino |

## Códigos

- **OS normal:** `OS{YY}-{NNN}` (ex: OS26-001)
- **OS de Reposição:** `REP{YY}-{NNN}`
- **OS de Ocorrência Obra:** `OC{YY}-{NNN}`
- **OS de Ocorrência Fábrica:** `OF{YY}-{NNN}`
- **Romaneio:** `ROM-{B1B2|B2C|B1C|B2B1|REC}-{YY}-{NNN}`

## Suporte

Em caso de bugs ou dúvidas estruturais, registrar com a Juliana.
