# Registro de Alterações

As mudanças importantes deste projeto são registradas neste arquivo, seguindo o formato de [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/).

## [Unreleased]

## [0.4.0] - 2026-11-18

### Marca e licença

- **Projeto renomeado para WARROOM**: nome do binário, entrada de linha de comando (`cmd/warroom`), caminho do módulo Go, imagem Docker e nome do serviço, prefixo das variáveis de ambiente (unificado em `WARROOM_`), banner de inicialização, marca do frontend e título das páginas foram todos atualizados em conjunto. O `config.json` existente não precisa de alterações; se você já definiu variáveis de ambiente antes (`WARROOM_PG_DSN` / `WARROOM_SKILL_DIR` / `WARROOM_CONFIG` / `WARROOM_LLM_*`), confirme que o novo prefixo está em uso.
- **Licença de código aberto alterada de AGPL-3.0 para MIT**: qualquer pessoa pode usar, modificar e distribuir este software livremente, inclusive para fins comerciais e de código fechado, bastando manter o aviso de copyright e de licença. A seção de licença do `README`, o "Aviso de uso" da página de login e as informações de copyright do frontend foram sincronizados para MIT.
- **SDK do agent incorporado ao repositório**: o SDK `norma`, antes importado como módulo Go externo, foi incorporado ao diretório `norma/` deste repositório, com os caminhos de import unificados em `github.com/llypeDev/warroom/norma/...`, e o `go.mod` não depende mais desse módulo externo. Tudo foi mantido exceto `norma/cmd` e `norma/examples` (entradas independentes e exemplos, sem relação com este projeto); as funcionalidades `agentcore` / `tool` / `permission` / `harness` / `memory` / `transcript` permanecem inalteradas.
- **Todos os recursos de marca substituídos**: `logo.png` / `logo-dark.png` / `icon.png` / `favicon.ico` passaram a usar a nova identidade; o antigo `logo.svg` e as capturas de tela em `web/media/` foram removidos; a barra lateral alterna entre as versões dark/light do logo conforme o tema, e as páginas de login e de inicialização não forçam mais a inversão de cores com `brightness-0 invert`. O script de geração está em `web/scripts/make-brand-assets.mjs`.
- **Capturas antigas removidas**: o diretório `screenshots/` e a seção de prévia com capturas no README foram removidos (as imagens continham a identidade antiga). Se necessário, capture novamente com a aplicação em execução.
- **Verificação de zero resíduos nos artefatos de release**: novo script `scripts/verify-clean.ps1`, que varre todo o repositório byte a byte (inclusive binários) e retorna 1 ao encontrar qualquer identificador antigo. O build oficial usa `-trimpath -ldflags "-s -w -buildid="` junto com compressão UPX, e a tabela de strings do binário de release não contém nenhum nome antigo.

## [0.3.15] - 2026-10-07

### Interceptação

#### Funcionalidades adicionadas

- **Nova regra de interceptação embutida "caminhos de API de exclusão"**: antes, as regras HTTP destrutivas embutidas só reconheciam o **método** DELETE, mas as APIs de exclusão da maioria das aplicações podem ser acionadas por GET/POST, e chamadas como `curl 'http://t/api/user/delete?id=1'` realmente apagavam os dados do alvo. Foi adicionada uma regra `deny` cobrindo `/delete /del /remove /unlink /erase /destroy` (o verbo deve ser seguido de um separador, então `/delivery`, `/details` e `/delta` não são bloqueados por engano). Instâncias existentes também recebem a regra após a atualização, podendo desativá-la ou removê-la em "Sistema → Interceptação de comandos".
- **O consumo de token da aprovação de fallback pelo modelo pode ser consultado separadamente**: as chamadas de aprovação não tinham antes uma contabilização própria, e o gasto só podia ser estimado. Agora são contabilizadas à parte: abaixo do botão "Aprovação de fallback pelo modelo" em "Sistema → Interceptação de comandos" há um novo cartão de uso — cinco estatísticas acumuladas (número de chamadas, entrada, saída, leitura e escrita de cache) mais um mini gráfico de barras do consumo diário dos últimos 30 dias.

### Envio de vulnerabilidades

#### Funcionalidades adicionadas

- **Achados de vulnerabilidade podem ser enviados para IM**: nova página "Sistema → Notificações", que envia os achados do scan para seis canais: **DingTalk, Feishu, WeCom, Webhook genérico, Telegram e e-mail**. É possível configurar quantas instâncias quiser de cada tipo, com ativação/desativação, rate limit e regras de filtro independentes por instância.
- **Dois modos de envio: em tempo real e agregado**: no modo em tempo real, cada correspondência é enviada individualmente; no modo agregado, as mensagens são consolidadas conforme o período global (padrão de 30 minutos) em uma única mensagem, com a quantidade de novos itens e a distribuição por nível no início. Para ter "alto risco em tempo real e o resto agregado", crie dois canais com configurações separadas.
- **As regras de filtro cobrem quatro dimensões**: severidade mínima, restrição por tarefa / escopo de ativos, inclusão e exclusão de palavras-chave do tipo de vulnerabilidade (a exclusão tem prioridade) e se mudanças de status de tratamento são recebidas (desligado por padrão). As mensagens trazem um botão "Ver detalhes"; o endereço de destino vem da configuração global "Endereço de retorno" e, se ficar vazio, o botão não é incluído.
- **Histórico de entregas e reenvio manual**: lista o status, o número de tentativas, a causa da falha e o canal de cada entrega, com filtros por canal e status; itens com falha podem ser reenviados com um clique (o reenvio zera o contador de tentativas).
- **Credenciais de canal exibidas mascaradas**: endereço de Webhook, chave de assinatura, token do Bot, senha SMTP e afins só são exibidos como valor mascarado com dica dos últimos dígitos; retornar o valor mascarado intacto no envio significa "não alterar", e limpar o campo remove aquele valor.

#### Correções

> Esta seção reúne as conclusões de uma rodada de auditoria de segurança após a primeira versão da funcionalidade; cada item foi primeiro reproduzido, depois corrigido, e então coberto por teste de regressão.

- **Corrigido o bypass da máscara via "alterar o endereço de destino e manter as credenciais" (grave)**: a mesclagem de configuração mantinha o valor do banco para toda "chave não mencionada", então bastava alterar o endereço e omitir as credenciais para o servidor enviar as credenciais reais do banco para qualquer endereço, de forma totalmente silenciosa. Agora, quando o endereço de destino muda, cada campo de credencial deve se manifestar explicitamente — com um novo valor ou explicitamente vazio para indicar que não é mais necessário.
- **Corrigida a ausência total de escape de conteúdo não confiável nos canais baseados em markdown**: títulos e resumos de vulnerabilidade vêm da saída do modelo e as URLs de ativos vêm do resultado do scan; um título construído era renderizado como link externo clicável no DingTalk / WeCom / Feishu, e a sintaxe de imagem fazia o cliente buscar a imagem na renderização, vazando o IP do leitor. Agora há padronização em linha única + escape de metacaracteres de markdown, aplicados na saída de renderização de cada canal, e não na função de título compartilhada.
- **Corrigida a superfície de SSRF do endereço de entrega**: antes, endereços de loopback, de rede interna e de metadados de nuvem podiam receber entregas, e os primeiros 200 bytes do corpo da resposta de falha iam para `last_error`, sendo exibidos no histórico de entregas — uma primitiva de leitura semicega. Agora a proteção fica na **fase de dial**, cobre DNS rebinding e rejeita redirecionamentos entre hosts; endereços de loopback e link-local exigem `WARROOM_NOTIFY_ALLOW_LOCAL=1` explícito, e redes privadas RFC1918 continuam liberadas (relay SMTP próprio na rede interna é bastante comum).
- **Corrigido o vazamento de credenciais de envio em mensagens de erro**: o `access_token` do DingTalk, a `key` do WeCom e o bot token do Telegram ficam na URL, e quando a entrega falhava a URL completa vazava para quatro lugares: `last_error`, histórico de entregas, logs do servidor e aviso no frontend. Agora a sanitização é uniforme, mantendo apenas `scheme://host` e a causa subjacente.
- **Corrigida a perda silenciosa causada por marcar o lote inteiro como entregue após truncar a mensagem agregada**: as vulnerabilidades cortadas não apareciam nem na mensagem nem na lista de falhas, mas o histórico de entregas mostrava sucesso. Agora o empacotamento é feito por **item inteiro**, marcando apenas os que entraram nesta mensagem; os demais voltam à fila para continuar na próxima, sem consumir tentativas, e o cabeçalho da mensagem informa quantos itens seguirão adiante.
- **Corrigido o filtro que falhava silenciosamente quando o limite de severidade mínima tinha erro de digitação**: com `min_severity` escrito como `hgih`, por exemplo, a ordem do nível desconhecido virava 0 e a comparação degenerava para sempre verdadeira — o usuário achava que só recebia alto risco, mas todas as vulnerabilidades caíam no grupo. Agora o valor é validado na gravação, com a lista de valores aceitos.
- **Corrigido o `rate_per_min = 0` (sem rate limit) inalcançável**: a camada de escrita no banco trocava silenciosamente o 0 explícito pelo valor padrão, e o operador acreditava ter liberado o rate limit enquanto continuava limitado. O valor padrão passou para a camada de API, aplicado quando o campo está ausente.
- **Corrigido o canal agregado que ignorava completamente o token bucket**: `rate_per_min` não tinha efeito algum no modo digest. Agora a quantidade retirada é limitada simultaneamente pela cota da rodada e pelo limite superior em memória.
- **Corrigido o tratamento de falhas que decidia pelo número máximo de tentativas do lote, arrastando entregas novas junto com as antigas**: uma entrega antiga já reprocessada duas vezes levava junto para failed as entregas novíssimas do mesmo lote, e a nova vulnerabilidade era perdida permanentemente sem ter usado nenhuma tentativa. Agora a decisão é individual.
- **Corrigidas as entregas de lote agregado cujo snapshot não podia ser analisado e eram marcadas como sucesso em silêncio**: esses itens eram ignorados na fase de renderização, mas contavam como sucesso junto com o lote. Agora são explicitamente marcados como falha, com a causa.
- **Corrigido o número de entregas por rodada de um canal que podia exceder a duração do lease**: em deploy com múltiplas instâncias, linhas com lease expirado eram retomadas, enviadas em duplicidade e tinham as tentativas incrementadas duas vezes. Agora o limite por rodada é derivado de "lease / timeout por entrega", com asserções que fixam a relação entre essas constantes.
- **Corrigido o truncamento do Telegram que podia cortar entidades HTML**: o truncamento evitava apenas tags pela metade, sem evitar fragmentos de entidade como `&amp`, e o parser podia rejeitar a mensagem **inteira** por causa disso. Agora ambos são evitados.
- **Corrigido o canal de e-mail que tratava falhas temporárias de SMTP como permanentes**: recusas temporárias 4xx, como o `450` de greylisting, eram sempre tratadas como definitivas, e servidores com greylisting ativo faziam toda notificação falhar já na primeira tentativa. Agora a distinção é feita pelo primeiro dígito do código de resposta: 4xx é retentável, 5xx é falha permanente.
- **Corrigido o envio de estruturas aninhadas que gravava o literal de máscara no banco**: campos de objeto como `webhook.headers` só podem ser mascarados ou enviados por inteiro; inserir o sentinela de máscara dentro do objeto fazia com que fosse salvo como valor real, quebrando a autenticação em silêncio. Agora esse tipo de envio é explicitamente rejeitado.

#### Notas de design

- **A transação que grava a vulnerabilidade faz apenas um INSERT cego**: `notification_events` e a vulnerabilidade são gravados na mesma transação, e o commit garante a atomicidade dos dois. Esse INSERT deliberadamente não lê a tabela de canais nem executa as regras de filtro do usuário, e é envolvido por um `SAVEPOINT` — caso contrário, uma única condição de filtro mal configurada abortaria a transação e impediria vulnerabilidades de alto risco de chegar ao banco.
- **As entregas usam lease em vez de transação longa**: após a retirada com `FOR UPDATE SKIP LOCKED`, a linha é marcada como `sending` e o `next_attempt_at` é empurrado para o futuro como lease, sem manter lock de banco durante a entrega; linhas deixadas por um processo que caiu são retomadas quando o lease expira, com auto-recuperação e sem tentativas infinitas.
- **O rate limit não consome o orçamento de tentativas**: primeiro a cota da rodada é calculada com o token bucket e só então a retirada é feita nessa quantidade. A ordem inversa fazia com que as entregas barradas pelo rate limit gastassem uma tentativa à toa, esgotando as três disponíveis só com espera até cair em falha.

### Infraestrutura de testes

#### Correções

- **Corrigido o resíduo permanente de ativos causado pela ordem de limpeza no caso de teste de atribuição de ICP da empresa**: `defer d.Close()` era executado primeiro no retorno da função e `t.Cleanup` depois, então todas as instruções de limpeza caíam sobre a conexão já fechada e os erros eram descartados, deixando ativos e empresas de teste permanentemente no banco e fazendo outros casos que validam contagens por ativo falharem sem explicação. Agora o fechamento da conexão também passa por `t.Cleanup`, registrado antes, e falhas de limpeza ficam visíveis.

### Tráfego

#### Funcionalidades adicionadas

- **A lista de tráfego passou a ter busca por conteúdo, filtros por caminho / status / tamanho e ordenação por coluna**: a linha de filtros aceita **conteúdo da resposta** (via índice de texto completo), **caminho**, **status** (valor exato ou faixas como `2xx`) e **faixa de tamanho da resposta**; o cabeçalho ordena por hora, status e tamanho da resposta, com a preferência de ordenação salva localmente. Dois índices novos entram em vigor automaticamente após a atualização de instâncias existentes; o contrato de query das ferramentas do Agent não mudou.
- **Novo "Limpar tudo" na lista de tráfego**: remove todos os registros de tráfego de uma vez (ignorando os filtros atuais) e limpa os diretórios de hosts históricos que o índice não registra mais; em seguida faz uma compactação completa e informa quanto espaço foi realmente liberado. As evidências de tráfego já vinculadas a vulnerabilidades ficam em um banco de evidências separado e não são afetadas.

#### Correções

- **Corrigido o espaço em disco não liberado após excluir tráfego**: o banco do índice foi criado sem `auto_vacuum`, então o arquivo nunca encolhia; além disso, o índice de texto completo usa `contentless_delete`, e o `DELETE` apenas grava tombstones sem recuperar os postings originais — excluir tráfego fazia o índice crescer (medido: 6MB de corpo capturado → índice de 16MB, ainda 16MB depois de apagar tudo). Agora os novos bancos de índice usam `auto_vacuum=incremental`, e após cada exclusão há merge do índice de texto completo e recuperação incremental em blocos no background, devolvendo espaço ao sistema aos poucos (no mesmo cenário caiu para 104KB); a recuperação libera o write lock entre blocos e não bloqueia a captura de tráfego.

> Nota de atualização: o `auto_vacuum` só pode ser definido na criação do banco, então **o banco de índice de instâncias existentes permanece no modo antigo**, e a recuperação incremental é uma operação vazia nele (uma linha de aviso é impressa na inicialização). Nesses bancos o crescimento de tombstones já parou após a atualização, e o volume já ocupado pode ser recuperado uma vez com "Limpar tudo" — essa etapa converte o banco para o modo de recuperação incremental, e a partir daí as exclusões do dia a dia passam a ter efeito por conta própria.

### LLM

#### Correções

- **Corrigido o cabeçalho de sessão personalizado que não tinha efeito no caminho de "chamada LLM avulsa"**: a decomposição de objetivos (rodada 0) e a compressão de nós frios são chamadas avulsas sem transcript store, cujo context não tem session id, e por isso o gateway não conseguia ler o cabeçalho — em endpoints como o opencode zen, que retornam 400 direto quando o cabeçalho falta, o sintoma era "a rodada 0 falha, mas as rodadas seguintes do planner funcionam perfeitamente". Agora as duas rotas anexam explicitamente um session id estável por exploração, e o consumo de token passa a ser corretamente atribuído à exploração correspondente (antes não era registrado de forma alguma).

### Ferramentas

#### Correções

- **Corrigido o truncamento de saída de ferramentas MCP e personalizadas que não funcionava, despejando resultados grandes inteiros no contexto**: o retorno das ferramentas MCP não passava por truncamento algum, e as ferramentas personalizadas do tipo HTTP, por receberem um contexto de ferramenta vazio, usavam sempre o limite fixo de 6000 caracteres em vez do limite configurado na sessão. Agora as duas rotas passam por `actool.Capture`: truncamento conforme o `MaxOutputChars` da sessão (padrão 30000), e com `ToolOutputDir` configurado a saída completa é transbordada para o disco, mantendo na mensagem apenas o trecho inicial e o ponteiro de arquivo.
- **norma atualizado para v0.4.3**: a camada harness executa `CaptureOnce` de forma uniforme, e nenhuma ferramenta (inclusive as futuras) estoura mais o contexto por esquecer de ligar o truncamento.

### Deploy

#### Correções

- **Corrigido o stream de atividades que não conectava em deploy com proxy reverso**: o endereço SSE era sempre montado como `${hostname}:8787`, então em deploys com proxy reverso para a 443 a página carregava de `https://domínio/` mas o SSE apontava para a porta 8787, não exposta publicamente, e o sintoma era o stream de atividades reconectando sem parar. Agora a distinção é feita por `NODE_ENV`: em produção o padrão é a mesma origem, e apenas `next dev` mantém `:8787` para contornar o buffering de SSE do Next.js; o ponto de override `NEXT_PUBLIC_SSE_BASE` permanece. O README ganhou instruções de deploy com proxy reverso.

### Achados

#### Correções

- **Corrigida a ausência de barra de rolagem quando a lista de ativos da visão "por ativo" transbordava**: o cartão externo só definia `max-height` sem altura determinada, então a altura percentual do viewport de rolagem não era resolvida e, com muitos ativos, a lista estourava o cartão ou era cortada sem possibilidade de rolar. Agora o limite de altura é aplicado diretamente no contêiner de rolagem nativo da árvore de ativos, adaptando-se à altura da janela.

### Banco de dados

#### Correções

- **Limite superior definido para o pool de conexões**: por padrão, o `database/sql` não limita o número de conexões que a própria aplicação pode abrir; sem conexão ociosa no pool ele abria uma nova incondicionalmente até bater no `max_connections` do PostgreSQL (padrão 100) e ser recusado. Agora o teto é 32; consultas acima disso passam a esperar uma conexão ociosa, e sob a mesma carga o efeito é lentidão em vez de erro; se o `max_connections` foi reduzido, o teto precisa ser reduzido junto.
- **Maior taxa de reutilização de conexões**: o valor padrão de `MaxIdleConns` é 2, então conexões acima de 2 em concorrência eram fechadas ao terminar o uso e a próxima requisição precisava refazer o handshake TCP e a autenticação do PostgreSQL. Agora o limite de ociosas é igual ao limite total, com vida útil de 30 minutos e descarte por ociosidade de 5 minutos, para que o pool substitua naturalmente conexões defeituosas de longa duração.

## [0.3.14] - 2026-09-24

### Lista de tarefas

#### Funcionalidades adicionadas

- **Nova coluna "Vulnerabilidades" na lista de tarefas**: mostra as quantidades por faixa de severidade — Crítica / Alta / Média / Baixa —, com coloração conforme a severidade nas faixas não zero, dando de relance a dimensão e a distribuição das vulnerabilidades de cada tarefa.

#### Funcionalidades alteradas

- **Largura reduzida das colunas "Descrição / Objetivo"**: conteúdos muito longos aparecem truncados, com o texto completo ao passar o mouse, reduzindo o espaço horizontal que textos longos ocupavam na lista.

### Grafo de exploração e visão geral da situação de planejamento

#### Funcionalidades alteradas

- **Visão geral da situação de planejamento (graph_overview) enxugada, com limite de itens em cada lista**: fatos recentes, intenções encerradas, intenções pendentes, resumos de regiões frias e o detalhamento de vulnerabilidades confirmadas passaram a usar "janela mais recente + contagem residual", e o que não é exibido pode ser consultado sob demanda; isso reduz significativamente o volume de contexto do LLM por rodada e evita o inchaço do contexto em tarefas longas (as regiões frias da visão geral de tarefas relacionadas também passaram a ter limite).

#### Correções

- **Eliminação das arestas duplicadas em sentido inverso entre digest e finding no grafo de exploração após dobrar nós frios**.

## [0.3.13] - 2026-09-19

### Interceptação de ativos

#### Funcionalidades adicionadas

- **Novas regras globais de interceptação de ativos (blacklist)**: aceita domínios / IPs / URLs com correspondência exata ou fuzzy, além de faixas CIDR, com CRUD de regras e ativação/desativação, na página "Sistema → Interceptação de ativos"; por padrão já inclui bloqueio fuzzy de sites governamentais (`.gov` / `.gov.cn`) e educacionais (`.edu` / `.edu.cn`).
- **Interceptação de ativos integrada à cadeia de execução**: antes de despachar uma intenção (`add_intent`) e de inserir ativos (`insert_assets`), o Agent faz a verificação de interceptação nos ativos de destino — intenções que caem na interceptação não são despachadas e ativos que caem na interceptação não são inseridos, com retorno ao Agent das informações do ativo e do motivo do bloqueio.
- **Novas regras de interceptação / permissão (whitelist) por tarefa**: independentes das regras globais e válidas apenas para a própria tarefa, avaliadas na ordem "primeiro interceptação, depois permissão" — se cair na interceptação, é proibido; se não cair na interceptação, mas a tarefa tiver regras de permissão configuradas e nenhuma corresponder, então "não permitido testar"; sem regras de permissão configuradas, a whitelist não é ativada. Podem ser cadastradas na criação da tarefa ou gerenciadas (criar, alterar, remover, ativar/desativar) em "Visão geral" dos detalhes da tarefa.
- **Modelos de tarefa suportam categoria predefinida e regras de interceptação/permissão por tarefa**: o modelo pode salvar a categoria da tarefa e um conjunto de regras de nível de tarefa, que são levados junto ao formulário de nova tarefa ao aplicar o modelo.

### Revisão de operações

#### Correções

- **Protocolo de saída do juiz modelo mais rígido, reduzindo liberações indevidas por truncamento**: o limite do comentário do veredito (comment) caiu de 500 para 120 caracteres chineses, com exigência de "output apenas JSON, sem preâmbulo nem bloco de código", evitando que o veredito seja truncado por `MaxTokens`, não possa ser analisado e acabe liberado pela estratégia de falha do modelo (fail-open).

### Arquivamento de tarefas

#### Correções

- **O arquivamento pula links simbólicos em vez de falhar por completo**: o formato de arquivo suporta de ponta a ponta apenas arquivos comuns e diretórios, e antes qualquer link simbólico no diretório de trabalho fazia o arquivamento da tarefa inteira falhar; agora o link é ignorado com registro em log e os demais arquivos são arquivados normalmente (sem seguir links nem sair da árvore de diretórios).

### Conta e conformidade

#### Funcionalidades adicionadas

- **Novo modal de "Aviso de uso e isenção de responsabilidade" antes do login**: é preciso marcar o aceite para poder entrar.

### Licença e dependências

#### Funcionalidades alteradas

- **O projeto adota a licença de código aberto AGPL-3.0**, com a seção de licença e isenção de responsabilidade do README aprimorada.
- **norma atualizado para v0.4.1**.

## [0.3.12] - 2026-09-17

### Painel de transmissão da cadeia de exploração

#### Funcionalidades adicionadas

- **Novo "Painel de transmissão da cadeia de exploração" na página de detalhes da tarefa** (#144): apresenta os nós de exploração da tarefa (origem/objetivo/intenção/fato/vulnerabilidade/dica/compressão) em uma linha do tempo, com filtro por tipo, busca por palavra-chave, ordem crescente/decrescente, paginação e atualização automática; na "primeira página, mais recentes primeiro" ele funciona como modo ao vivo, atualizando a cada rodada, e ao sair desse ponto apenas acumula a contagem de não lidos, sem atrapalhar a leitura atual, com retorno em um clique por "N novas transmissões · voltar ao mais recente". Agrupado por dia, permite reconhecer "de que dia é isso" mesmo folheando tarefas longas.
- **Cada linha do painel mostra o id do nó** (#145), facilitando a comparação com o grafo da cadeia de exploração e a localização do nó específico.
- **A expansão do detalhe de um nó do painel mostra upstream/downstream e os ativos ancorados** (#147): expandir uma transmissão revela o upstream (de onde veio) e o downstream (o que gerou) do nó, e passar o mouse nos itens relacionados abre o cartão do nó correspondente (tipo/status/origem/hora/resumo/trecho de payload); também lista os ativos ancorados naquele nó (rótulo de tipo + texto identificável). Os dados vêm junto com a página de transmissões, e expandir não dispara requisição extra.
- **A busca do painel aceita filtro por id do nó** (#150): além de "conteúdo / origem", a caixa de busca passou a casar o id do nó; basta digitar o número puro ou a forma "#41" exibida na interface para localizar com precisão o nó correspondente.

### Gerenciamento de intenções

#### Funcionalidades adicionadas

- **A exclusão de intenções suporta dois modos: "exclusão lógica / exclusão física"** (#149): intenções pendentes de retirada, em execução e pausadas podem ser excluídas, sendo obrigatório informar o motivo; o modo é escolhido no modal de confirmação.
  - **Exclusão lógica (padrão)**: a intenção é marcada como "excluída" e o motivo é gravado em um campo separado, preservando o nó da intenção e todos os seus produtos e linhagem.
  - **Exclusão física**: remove fisicamente a intenção e os nós descendentes exclusivos "sustentados apenas por ela" (cascateando pelos produtos / pela cadeia de intenções até as folhas), evitando deixar dados órfãos; a contabilização de token da intenção excluída é arquivada pela data original; nós compartilhados (ainda referenciados por outras intenções), objetivos e fatos raiz da tarefa são sempre preservados, e o modal de exclusão física mostra a quantidade estimada de nós afetados em cascata.

  Os dois modos notificam o planner de que "a intenção foi excluída pelo usuário + motivo", que replaneja com base nisso.

### Revisão de operações

#### Funcionalidades adicionadas

- **Os registros de aprovação podem ser filtrados por status e origem da decisão** (#139): filtro por status da aprovação e origem do veredito, para localizar rapidamente o registro desejado.

#### Correções

- **As solicitações de aprovação pendentes carregam independentemente da paginação do histórico** (#133): as pendências não são mais afetadas pela paginação do histórico e continuam totalmente visíveis ao folhear registros antigos.

### Agent

#### Funcionalidades alteradas

- **A descrição do papel do Worker passou a usar a formulação genérica de plataforma de segurança cibernética** (#138).

#### Correções

- **Corrigida a compressão de nós frios que nunca era disparada**: o planner que roda por tarefa passou a ter o Compactor conectado; a compressão de nós frios (cold-digest) nunca era executada por falta dessa conexão e agora está restaurada.

### Chat

#### Funcionalidades adicionadas

- **O chat suporta referência @ de registros de vários tipos e paginação por rolagem** (#135): é possível referenciar com @ registros de vários tipos no chat, com os candidatos carregados por paginação conforme a rolagem.

#### Correções

- **Bolhas de mensagem longas ficam contidas no painel da conversa** (#137): bolhas muito longas não transbordam mais a área da conversa.
- **Corrigido o erro "arquivo de upload ausente" ao enviar arquivo sem conversa criada**: a seleção de arquivo do Composer tira um snapshot do `FileList` como array antes de limpar o input e só então chama o callback; antes, o estado de rascunho exigia criar a conversa de forma assíncrona, e ao retomar a execução o `FileList` ainda vinculado ao input já estava vazio, de modo que o upload ficava sem o campo de arquivo e o backend retornava 400.

### Tráfego

#### Correções

- **O proxy de captura de tráfego escuta apenas em 127.0.0.1 por padrão** (#129, #130): evita que o proxy aberto na configuração padrão fique exposto em outras interfaces de rede.

### Web

#### Correções

- **Corrigido o cabeçalho global ausente na página de lista de tarefas da exportação estática**.
- **Adicionado o mock de tráfego associado na página de detalhes de vulnerabilidade do demo, corrigindo a tela branca**.

## [0.3.11] - 2026-09-15

### Revisão de operações

#### Funcionalidades adicionadas

- **Os registros de aprovação permitem localizar a origem** (#125): clicar em "Origem" de um registro leva de volta àquela execução de ferramenta que disparou a aprovação — abre a conversa completa original, carrega por paginação até a posição alvo, expande o comando e o resultado no local e destaca centralizado na área de rolagem, mantendo as mensagens vizinhas legíveis; a correção automática para quando o usuário rola manualmente. Em conversas comuns, Workers de tarefa, planner e conversas segmentadas do Agent principal, a localização é precisa via `tool_use_id` persistido e mapeamento de tarefa (novo índice de IDs de chamada por escopo), e quando o registro está ausente, duplicado ou a associação é ambígua há um aviso explícito em vez de pular para outra execução. Se a conversa foi excluída ou a tarefa foi arquivada/registro ausente, um aviso claro é exibido.
- **Os registros de aprovação têm paginação** (#115).

#### Funcionalidades alteradas

- **Entrada da revisão pelo modelo enxugada** (#124, #125): a entrada da revisão pelo modelo (o juiz LLM após as regras não corresponderem) foi reduzida a um JSON versionado com "a chamada de ferramenta completa desta vez + o contexto curto explicitamente selecionado + o diretório de trabalho local". O contexto usa apenas mensagens reais do usuário (a mensagem atual do usuário no chat/Agent principal da tarefa), e o Worker não carrega mais o resumo da intenção, além de ter removido o contexto herdado do Agent superior; o planner e as conversas disparadas automaticamente não fabricam mensagens de usuário. Não são mais anexados descrição da tarefa, objetivos, restrições de operação, situação global de exploração, chamadas históricas ou a intenção completa do Worker — tudo isso continua sendo usado pela lógica original na execução do Agent e na auditoria de conversas independentes, apenas não entra na revisão de operações. Todo veredito exige `decision`/`comment` no JSON, e a justificativa deve conter "a operação real, a consequência em caso de sucesso e a regra correspondida"; instruções nos parâmetros ou no contexto não podem alterar a política de revisão. O snapshot da entrada realmente enviada ao modelo é salvo com fingerprint, snapshots antigos são mantidos com a versão indicada, e entradas antigas não são fabricadas com dados atuais.

#### Correções

- **Veredito do modelo embrulhado em bloco de código não é mais liberado em silêncio** (#126): se o JSON de veredito retornado pelo modelo vier envolvido por um ``` bloco de código, a falha de análise anteriormente fazia com que fosse liberado silenciosamente pela estratégia de falha do modelo; agora as cercas do bloco são removidas antes da análise, e só se a análise ainda falhar é aplicada a estratégia de falha configurada.

### Agent

#### Funcionalidades adicionadas

- **Nova compressão de contexto experimental noa** (norma atualizado para v0.4.0): funcionalidade experimental habilitável nas configurações do sistema, desligada por padrão. Quando ativada, o noa (compressão de contexto orientada por modelo) assume a compressão de contexto dos quatro tipos de Agent — Agent principal, planner, Worker e chat —, substituindo a compressão embutida; o texto original comprimido é arquivado de forma persistente, centralizado em `<workDir>/noa/<会话ID>/` (sem se espalhar pelos diretórios de cada tarefa), com um subdiretório por ID de conversa, único globalmente. Se a integração falhar, há fallback automático para a compressão embutida, sem interromper tarefas reais; o botão é lido uma vez a cada execução, e a troca só afeta execuções iniciadas depois.

#### Correções

- **Ferramentas do grafo de exploração recusam sem contexto de tarefa em vez de quebrar com nil**: chamar ferramentas do grafo de exploração fora de um contexto de tarefa retorna um erro explícito, sem mais quebrar por desreferência de armazenamento vazio.

### MCP

#### Funcionalidades adicionadas

- **Suporte a serviços MCP SSE legados** (#117): compatível com servidores MCP que oferecem apenas o transporte SSE antigo.

### Tráfego

#### Correções

- **A busca de tráfego reconhece a porta ao casar o host dos registros** (#114): a correspondência de host em `traffic_search` passou a considerar a porta, evitando interferência entre registros do mesmo host em portas diferentes.
- **Erro na migração da descrição de `traffic_search` não interrompe as migrações de reporter seguintes**: a falha de uma migração isolada não afeta a execução das seguintes.

### Web

#### Funcionalidades alteradas

- **Separadores nas opções de reteste de vulnerabilidade da tarefa** (#122): itens de seleção do reteste ganharam separação, deixando o visual mais claro.

#### Correções

- **Corrigida a quebra da página inteira nos detalhes de tarefa do demo**: no modo mock, a aba "Conversas" dos detalhes da tarefa buscava `GET /api/tasks/<id>/side-questions` (histórico de perguntas paralelas), mas o mock handler não tinha essa rota e o fallback de leitura, seguindo a regra "caminho terminado em s é coleção", retornava `[]`, deixando `data.items` como `undefined`; o `merge()` do hook de perguntas paralelas então iterava sobre ele e lançava `TypeError: t is not iterable`. Essa exceção ocorria dentro do updater de `setItems` e o React a relançava adiada na fase de render, de modo que o `catch` do chamador não a capturava, e a página inteira caía no error boundary exibindo "This page couldn't load". Agora o mock handler retorna explicitamente um histórico vazio de perguntas paralelas, e `sideAPI.history` também normaliza o retorno (`items` que não seja array sempre vira `[]`) como defesa em profundidade.

## [0.3.10] - 2026-09-13

### Rede

#### Funcionalidades adicionadas

- **Nova fonte oficial DeepSeek na busca na web**: reutiliza diretamente a configuração LLM ativa. Sua natureza difere das outras três fontes — a DeepSeek não tem uma interface de busca chamável diretamente; a busca existe apenas dentro da interface compatível com Anthropic (`web_search_20250305`, ferramenta de servidor), executada no servidor da DeepSeek. Por isso ela **só suporta o endpoint oficial da DeepSeek + protocolo anthropic** (endpoints com protocolo OpenAI rejeitam ferramentas de servidor), e cada busca **consome uma chamada de modelo adicional**, **não passa pelo proxy de saída de busca** e **não entra no registro de tráfego**, retornando **apenas título e link** (sem resumo; quando precisar do conteúdo, use o WebFetch). A página de configurações explica essas limitações mas **não faz bloqueio por validação**; o usuário confirma se os requisitos são atendidos, podendo usar o botão "Testar busca" para uma execução real.

### Agent

#### Funcionalidades adicionadas

- **O worker ganhou capacidade de revisar entre works**: novas ferramentas `search_all_worker_traces` (busca global por palavra-chave nos passos correspondentes de todos os works da tarefa, sem precisar saber o intent_id antes) e `get_worker_trace` (após fixar um work, lista o fluxo de passos, pesquisa por palavra-chave no local e obtém o conteúdo completo por step_id), para reaproveitar observações vistas em outro work que não foram gravadas em fact e evitar trabalho repetido.
- **`node_detail` liberada para o worker**: junto com as ferramentas de revisão acima, o worker pode consultar o detalhe completo do nó diretamente, tendo o intent_id / id do nó.
- **A rodada de planejamento disparada por `add_hint` é anunciada explicitamente**: antes, a nova dica era apenas dobrada na visão geral da situação, e o planner tinha que descobri-la sozinho; agora cada `add_hint` registra para o planner um gatilho "o humano adicionou N dicas estratégicas: …" (em lote conta como um, sem inundar com um por item), e o planner é informado claramente de que "esta rodada foi disparada por novas dicas (hint)" e vê o conteúdo das dicas diretamente.

#### Funcionalidades alteradas

- **O texto da situação global passou a um tom mais "solto"**: incentiva a divergência na exploração e o reporte imediato de pistas entre intenções, em vez de convergência prematura.
- **Formulação de limites do worker enxugada**: um bloqueio inicial não significa esgotamento; o foco passou a ser "percorrer todas as alternativas de bypass dentro desta intenção antes de concluir".
- `insert_assets` perdeu o parâmetro `related` de cada ativo: sua única função era decidir se o ativo entra no escopo desta tarefa, mas o valor não era gravado no banco (registrar o mesmo ativo novamente anulava a decisão, e a interface não mostrava quem foi considerado irrelevante), na prática só fazendo o modelo tomar mais uma decisão que não se preservava.
- **O escopo de teste (`task_scope`) não depende mais do botão de cobertura de ativos**: a inclusão automática no escopo feita por `insert_assets` (`source='auto'`) ocorre independentemente de a cobertura estar ativa, e `add_task_scope` continua sempre disponível para o planner / Agent principal dentro da tarefa / Agent de decomposição de objetivos. O escopo é o limite de autorização da tarefa e a base de filtragem das consultas de ativos; o botão de cobertura só decide se ele serve como denominador dos indicadores, e não deveria decidir se o escopo em si é acumulado. Antes, desligar a cobertura invalidava simultaneamente os dois caminhos de escrita, `auto` e `agent`, e `task_scope` ficava apenas com as linhas adicionadas manualmente na interface. `list_untested_assets` continua oculta quando a cobertura é desligada (ela é, por natureza, uma visão puramente de cobertura).

#### Correções

- **Corrigida a mistura de ativos entre tarefas** (#59): `list_assets` fixava o id da tarefa em 0 e consultava cru o banco de ativos compartilhado, enquanto o modelo não tinha como escrever condições de filtro por escopo, então ativos de outras tarefas (especialmente IPs) eram tomados como alvos desta tarefa e a direção dos testes se desviava. Agora ela retorna apenas ativos dentro do escopo de teste (`task_scope`) desta tarefa e das tarefas diretamente relacionadas, casando por **pertinência** e não por valor literal: tendo um domínio raiz no escopo, todos os seus subdomínios/serviços/endpoints são encontrados; tendo uma faixa de rede, os hosts e serviços dentro dela são encontrados; e buscar por id um ativo fora do escopo também não retorna nada. Fora de contexto de tarefa (Auto/pentest) não há escopo, então continua o fallback para o banco inteiro. De quebra, corrigido o ponto cego de pertinência em que um host acessado por IP direto (como `http://1.2.3.4/api`) não era encontrado por uma faixa de rede. A visão "Ativos de teste" da UI (filtrada pelo produtor da tarefa) não é afetada.
- **Corrigidas as ferramentas de revisão entre works do worker removidas por engano**: depois de entrarem no conjunto padrão de ferramentas do worker, `search_all_worker_traces` / `get_worker_trace` (e `node_detail`) eram desvinculadas na inicialização por uma migração antiga de "enxugar a superfície de ferramentas do worker", e o worker na prática não recebia essas ferramentas. Elas foram retiradas dessa lista de desvinculação, e bancos que já rodaram a migração antiga recebem uma revinculação única ao worker.
- **Corrigida a falha ocasional de gravação das perguntas paralelas `/btw`**: antes de gravar o checkpoint de side_question, o escape NUL (`\u0000`) não suportado pelo JSONB é removido, evitando erro ao gravar conteúdo com esse caractere.

### Gatilhos

#### Correções

- **Conversas de gatilho consolidado deduplicam descrição/objetivo por tarefa**: no gatilho consolidado de várias tarefas, a descrição/objetivo de uma mesma tarefa não é mais concatenada repetidamente na mensagem, evitando que objetivos longos se acumulem e estourem o contexto.

## [0.3.9] - 2026-09-11

### Agent

#### Funcionalidades adicionadas

- O Agent principal dentro da tarefa suporta **múltiplas conversas**: é possível criar, alternar e redefinir o contexto de cada uma de forma independente, e todas são interativas.
- Suporte a **perguntas paralelas** `/btw` persistentes: pergunta-se sem interromper a linha principal, o par pergunta/resposta é gravado no banco e sobrevive a reinicializações.
- `spawn_task` ganhou `source_task_ids`, e a nova tarefa pode **herdar em modo somente leitura** os ativos e achados da tarefa de origem.

#### Funcionalidades alteradas

- A memória entre engagements do worker foi desativada e sua superfície padrão de ferramentas enxugada: ler contexto e revisar entre works é atribuição do planejamento, e o worker cuida apenas da execução e do retorno de uma única intenção.
- Prompt padrão do worker enxugado; `get_worker_output` perdeu os campos `terminated` e `worker_name`; descrições de `insert_assets` / `list_assets` enxugadas.

#### Correções

- Corrigido o problema de o work ser interrompido antes do fim por **rodadas em vazio**: às vezes o modelo usa uma rodada inteira apenas para emitir raciocínio, sem texto nem chamada de ferramenta, e o harness vê isso como um encerramento natural (`end_turn` sem `tool_use`), terminando com `completed` + resumo vazio — uma intenção ainda inacabada morre no meio do caminho, com o sintoma "a tarefa terminou normalmente mas não há nenhum resumo em texto". Nenhuma das cinco camadas de retry do LLM alcança isso: não é erro, a entrada do retry de janela segura do mesmo provider é "falha de stream", o circuit breaker considera sucesso direto quando `err == nil`, e o re-run de intenção só reconhece `model_error`; o retry de resposta vazia do SDK também não alcança, porque aquela camada julga vazio por "se algum evento foi yielded", e o delta de raciocínio já é um evento. Agora o hook Stop do work reconhece essa rodada e injeta uma instrução de continuação, para o modelo seguir para o próximo passo levando o raciocínio já produzido — deliberadamente sem escolher "reenviar como está", porque esse tipo de rodada em vazio costuma ser determinado pelo prompt e pelo formato do contexto, sendo comportamento estável e não aleatório, e reenviar só faria o modelo pensar de novo.
- A contagem de ocorrências desta funcionalidade reaproveita o **número de retries de resposta vazia** da aba "Retry e backoff" da página LLM (ambos respondem a "o modelo terminou mas não produziu conteúdo substancial", apenas com critério e meio diferentes), com padrão 2; preencher `-1` desliga e volta ao comportamento anterior de "rodada em vazio encerra". É um limite **total** por intenção, não de ocorrências consecutivas: o próprio harness já limita a uma continuação por rodada consecutiva em vazio, e a cota só é renovada quando realmente houve rodada de ferramenta, então esse número barra ciclos do tipo "ferramenta → vazio → empurrão → ferramenta → vazio" que esgotam o orçamento da intenção. Quando dispara, o log registra `[work <worker> · #<意图>] 空转回合…注入续跑指令 (n/N)`. Design em `docs/LLM重试设计.md` §1.1.
- Corrigidos o orçamento de contexto e o layout de entrada do `/btw` em conversas longas; em contexto não seguro (acesso não HTTPS), o ID de requisição paralela é gerado em modo degradado (fallback).

### Tráfego

#### Funcionalidades adicionadas

- Vulnerabilidades suportam **múltiplas evidências de tráfego associadas**, com ordenação, observações e distinção por papel (requisição/resposta/corroboração).
- O Agent de relatório **associa automaticamente** as evidências de tráfego relevantes antes de escrever o relatório.
- Novo **botão de vínculo de tráfego** do Agent, completando a transferência de evidências entre Agents.

### Tarefas

#### Funcionalidades adicionadas

- Suporte a **reteste de vulnerabilidade no nível da conversa**: o reteste roda em uma conversa de Agent independente, com o status de execução exibido na lista e nos detalhes.

### Interceptação

#### Funcionalidades adicionadas

- Registros de aprovação ganharam **detalhes e auditoria de execução**: é possível ver o contexto da requisição da ferramenta, o veredito inicial do modelo/das regras, a saída da execução e o fingerprint dos parâmetros.

### Ativos

#### Funcionalidades adicionadas

- Os ativos de teste da tarefa suportam **busca DSL**.

### LLM

#### Correções

- Corrigido o teste de conexão que não reenviava o cabeçalho de sessão personalizado, fazendo o opencode zen retornar 400.

### Rede

#### Funcionalidades adicionadas

- O transporte HTTP do MCP suporta **pular a validação de certificado TLS**, facilitando a integração de serviços com certificado autoassinado.

### UI

#### Funcionalidades adicionadas

- A lista de conversas é agrupada por Agent, com expandir/recolher e fixação independente; as conversas podem ser filtradas por Agent.
- O grafo da cadeia de ataque renderiza nós de compressão (digest) e recolhe seus membros.

#### Correções

- Corrigida a tela branca causada por credenciais de login fora de sincronia.
- O texto do aviso de interceptação passou a indicar claramente "controle da plataforma", evitando que seja interpretado como defesa do lado do alvo.

### Deploy e atualização

#### Funcionalidades adicionadas

- Suporte a **atualização com um clique pela interface**: novo cartão "Versão e atualização" na página de configuração do sistema, e a barra superior mostra um aviso quando há versão nova. O fluxo é baixar o pacote de release → validar o `SHA256SUMS` → smoke test → preparar (staging) → sair e ser reiniciado pelo script supervisor para concluir a troca, com a página atualizando automaticamente.
- Novos scripts de inicialização supervisores `start.sh` / `start.bat` como entrada oficial de inicialização (já incluídos no pacote de release e na imagem Docker; `install.sh` inalterado), que decidem pelo código de saída se devem subir o processo de novo e encaminham o SIGTERM para o warroom. A validação e a lógica de troca ficam em Go, mantendo os scripts o mais simples possível.
- Fallback automático em caso de falha: se a validação ou o smoke falhar, o pacote é descartado e a versão atual continua rodando; se a nova versão falhar 3 vezes seguidas na inicialização, há rollback para a versão anterior. A página de configurações também tem rollback manual (atenção: o schema do banco não regride).
- A atualização aceita apenas o domínio do GitHub e exige HTTPS, com a fonte de release fixa; builds de desenvolvimento desativam a atualização com um clique. O resultado da consulta ao GitHub é cacheado por 30 minutos, evitando que o aviso da barra superior esgote a cota da API.

#### Limitações conhecidas

- No Docker, só o programa é trocado, não a imagem: a toolchain não acompanha a atualização, e recriar o contêiner volta para a versão embutida na imagem; quando necessário, use `docker compose pull warroom`.
- O `skills/` do pacote de release não é sincronizado, então as Skills embutidas novas da versão nova não passam a valer automaticamente.
- Atualizar implica reiniciar, o que interrompe as tarefas em execução.

### Dependências

#### Funcionalidades alteradas

- norma atualizado para v0.3.7.

## [0.3.8] - 2026-09-09

### LLM

#### Funcionalidades adicionadas

- Nova aba "Retry e backoff" na página LLM: tanto o **número** quanto o **intervalo** das cinco camadas de retry são configuráveis. A falha de uma chamada de modelo passa, de dentro para fora, por: retry de conexão (SDK: reset de conexão / timeout / 429 / 5xx antes do início do stream), retry de resposta vazia (SDK: termina normalmente sem nenhum conteúdo, apenas no formato openai), retry de janela segura do mesmo provider (replay do stream cortado antes de entregar qualquer saída ao chamador), circuit breaker de polling (ao atingir o limite de falhas consecutivas, entra em cooldown e é pulado) e re-run de intenção (re-executar a intenção inteira quando o worker termina com model_error) — só quando a camada interna se esgota a externa entra. Cada camada tem dois botões, com semântica uniforme: vazio = usa o número padrão original e o backoff exponencial; preencher o número usa aquele número; preencher o intervalo troca o backoff exponencial por intervalo fixo; preencher -1 = desliga aquela camada de retry. As três primeiras camadas acompanham o endpoint e podem sobrescrever o padrão global campo a campo em cada configuração de modelo (quem fixa apenas o intervalo continua herdando o número global); o circuit breaker e o re-run de intenção têm semântica de processo, com uma única configuração global. Passa a valer a quente após salvar, sem reiniciar. Tudo vazio mantém o comportamento atual, e bancos antigos ficam idênticos byte a byte após a atualização (colunas novas com padrão 0 e chaves de settings inexistentes equivalem a tudo no padrão). O teste de conexão deliberadamente não usa esses parâmetros — ele tem timeout rígido de 30s, e somar os retries do usuário só faria um endpoint que funciona ser testado como falha por timeout. Design em `docs/LLM重试设计.md`.
- Cada configuração LLM suporta um **cabeçalho de sessão** personalizado (`session_header_key`): quando não vazio, toda requisição LLM carrega esse cabeçalho HTTP, com valor igual ao session id em execução (conversa de chat `conv-<id>`, worker `exp<x>-worker-i<intent>`, etc.), para gateways que fazem cache de prompt / roteamento sticky com base no cabeçalho de session-id. A implementação lê o session id do context da requisição e o injeta, sem alterar o norma, e o mesmo provider compartilhado também consegue emitir valores de cabeçalho diferentes por conversa. Bancos antigos recebem migração, e o modal de configuração LLM no frontend ganhou o campo.

#### Correções

- Corrigido o erro `23502` direto ao salvar a configuração LLM quando o campo de cabeçalho de sessão está vazio: a coluna é `NOT NULL DEFAULT ''`, e antes o uso indevido de `NULLIF($n,'')` gravava NULL para o cabeçalho não preenchido, disparando a restrição de não nulo; agora o parâmetro é passado diretamente com semântica de string vazia.

### Agent

#### Funcionalidades adicionadas

- O timeout de wall clock passou a **finalizar no local**: depende do norma v0.3.6; quando o `MaxDuration` vence, a ferramenta em execução é interrompida e a execução continua no ctx ativo pelas rodadas de finalização (gravando o conteúdo já identificado + resumo, com estado final timeout), sem depender mais do ctx rígido externo `maxDur+90s` de cada worker/planner matando a execução travada direto como `aborted_tools`. O chat, usando o mesmo harness, ganha o mesmo comportamento automaticamente, e o mainagent, sem `MaxDuration`, não é afetado.
- Fallback de paralisação: quando o planner é acordado por heartbeat / sem mudanças e o grafo inteiro já não tem nenhuma intenção open ou running, a abertura passa a ser um alerta de paralisação, informando explicitamente que não há worker rodando nem direção na fila e que esta rodada precisa produzir uma ou mais intenções novas e mutuamente distintas (não pode produzir 0 intenções).

#### Funcionalidades alteradas

- Prompt do worker reestruturado: a intenção / a instrução de inicialização / o JSON bruto dos ativos ancorados foram movidos para o system prompt, remontado a cada rodada e jamais comprimido pelo compaction, e a continuação também não depende de a primeira mensagem do transcript permanecer; a mensagem user de inicialização foi enxugada para apenas o overview da situação global (degradável, tolerante a dados stale). O custo é o system passar a carregar dados por intenção e perder o reaproveitamento de cache entre intenções — uma escolha deliberada em favor de "não perder a intenção".
- Texto padrão do planner / worker enxugado e vários problemas de uso real corrigidos: o planner passa a distinguir `recent_done` por status (blocked/exhausted: consultar o trace antes de decidir, sem tratar como beco sem saída nem refazer às cegas), conclusões negativas viram "observação / dúvida, não veredito" e a evidência é examinada antes de aceitá-las, objetivo não atingido sem intenção open/running obriga a produzir (piso rígido), e profundidade tem prioridade sobre cobertura; no worker, conclusões negativas registram apenas "observação + leitura tentativa", com o poder de decisão no planner, e pistas entre intenções vão para o summary do fact, entregues ao planejamento em vez de serem perseguidas pelo próprio worker. O reseed acrescenta o novo padrão como nova versão e passa a usá-la, mantendo personalizações do usuário / versões antigas no histórico para rollback.
- Conjunto padrão de ferramentas do work agent enxugado, junto com as instruções de retorno de ativos: o worker cuida apenas da execução e do retorno de uma única intenção, e ler contexto / revisar entre works é atribuição do planejamento, então saíram de suas ferramentas padrão `list_facts` / `node_detail` / `list_companies` e as buscas entre works (`search_all_worker_traces` / `list_worker_traces` / `get_worker_trace`), ficando apenas `list_findings` (verificar duplicidade antes de reportar vulnerabilidade) + `add_finding` / `record_fact` + `insert_assets` / `list_assets`; o prompt perdeu a descrição de campos antigos em conflito com o schema de `insert_assets` (`type=tech`/`on_url`/`props`). Bancos antigos recebem migração única que remove os vínculos correspondentes, sem tocar nos vínculos de mesmo nome do planner/main.

### Grafo de exploração

#### Funcionalidades adicionadas

- **Compressão de nós frios do grafo de exploração (cold-digest)**: intenções / fatos antigos e há muito inativos são dobrados em nós digest exibidos no `graph_overview`, com os nós originais preservados para sempre e totalmente restauráveis por id (armazenamento sem perda, apenas a apresentação é comprimida, dobra reversível). A classificação frio/quente usa alcançabilidade inversa + qualquer ramo ativo torna quente, com debounce de R=6 rodadas e agrupamento por componentes conexas; a compressão em background (minor dobra blocos frios não cobertos, major volta à origem e recomprime mesclando fragmentos) tem revalidação de atividade e exclusão mútua por cooldown, jamais entrando no caminho quente e jamais cobrindo nós já revividos. Do lado da visão geral há `cold_digests` e o `cold_index` indexado por ativo, com `expand_digest` / `expand_index` fazendo a restauração. A visão geral de tarefas relacionadas / herdadas também reutiliza a própria visão dobrada, e `expand_digest` suporta restauração somente leitura entre tarefas. `expand_digest` / `expand_index` são dadas apenas ao planner e ao main agent, não ao worker. Todas com migração para bancos antigos.
- `graph_overview` passou a emitir `finding_list` por completo: os findings são o produto de maior valor da tarefa e costumam ser poucos por tarefa, então passaram a ser trazidos integralmente na visão geral (diferente de facts, que só vêm na janela recente), e planner/worker veem de uma vez, a cada rodada, todas as vulnerabilidades confirmadas, sem precisar chamar `list_findings`. Cada item foi enxugado para `{id, summary, evidence?, from_intent?, assets?}`, com os ativos afetados em formato legível (url / domínio / ip:porta) em vez de id cru.

#### Funcionalidades alteradas

- `graph_overview` não lista mais `hosts` achatados: o bloco coverage perdeu a lista de hosts (em tarefas de grande escopo, até 500 strings de host por rodada, com valor limitado para a decisão de planejamento) e mantém apenas `host_count`, com os hosts específicos consultados sob demanda via `list_assets`. Novo campo de topo `done_intents_total` (total de intenções encerradas), paralelo ao `recent_done_intents` truncado em ≤15, para o planner saber, ao deduplicar, se houve corte.

### Ferramentas

#### Funcionalidades alteradas

- O vínculo padrão de `add_company_scope` passou de worker para planner: definir o escopo de ativos da empresa é atribuição do planejamento / controle principal / Auto, e o worker apenas executa a exploração. Bancos novos fazem seed do vínculo padrão para mainagent/planner/auto, e bancos antigos recebem migração única.
- O planner passa a ter `list_assets` vinculada por padrão: agora tem tanto `list_assets` (busca DSL em todo o banco) quanto `list_untested_assets` (não testados dentro do escopo); bancos antigos recebem preenchimento único, sem sobrescrever desvinculações do usuário.

### Tarefas

#### Funcionalidades adicionadas

- Nova coluna "Workers em execução" na lista de tarefas: conta os nós de intenção com `state='running'` na tarefa, com critério idêntico ao "Workers em execução" da visão geral da página de detalhes da tarefa, exibindo 0 quando não há worker rodando.

### Rede

#### Funcionalidades adicionadas

- Nova configuração de **proxy de saída global**: todo o tráfego para os alvos pode sair pela rede por um proxy global unificado (http/https/socks5, com suporte a `user:pass`). Com a captura de tráfego ativada, ele funciona como upstream do proxy de registro MITM (o tráfego é registrado e depois sai pelo proxy, com os caminhos de interceptação e passthrough passando pelo upstream e sem vazar o IP de origem); com a captura desativada, é injetado diretamente no ambiente bash do agent e no WebFetch (`proxyEnv` ganhou suporte a `ALL_PROXY` para socks5). A configuração fica na tabela KV settings (sem migração), e a página de configuração do sistema ganhou um cartão "Proxy global", independente do proxy de busca na web e do proxy do LLM.

### UI

#### Correções

- Corrigidos os erros semânticos dos rótulos de status de intenção: `exhausted` passou de "esgotado" para "orçamento esgotado" (na verdade, o orçamento de passos / tempo foi cortado no meio e apenas parte dos resultados foi gravada, não que a direção tenha sido totalmente explorada) e `blocked` passou de "interceptado" para "erro de execução" (na verdade, os retries de falha de modelo / API / rede se esgotaram e a intenção praticamente não foi explorada, e não que tenha sido bloqueada por alvo / WAF), além de acrescentar o `stopped` ausente — "parado" (work parado manualmente pelo usuário).

### Dependências

#### Funcionalidades alteradas

- norma atualizado para v0.3.4: saída das ferramentas MCP ganhou truncamento e gravação em disco (ver `651b961`), e o v0.3.6 posterior habilita a finalização local no wall clock.

## [0.3.7] - 2026-08-31

### LLM

#### Funcionalidades adicionadas

- A configuração de modelo ganhou "Limite de saída", com escolha do nome do campo de requisição usado: o limite controla quantos tokens no máximo uma única resposta pode gerar e vai em cada requisição; 0 (padrão) = não enviar o campo, deixando a decisão para o padrão do servidor. Isso é diferente da "janela de contexto" — esta é a capacidade total do modelo, usada apenas localmente para calcular o limiar de compressão e nunca presente na requisição. O seletor de nome de campo só faz sentido no formato `openai` (Chat Completions): vazio (padrão) envia `max_tokens`, que é o que a esmagadora maioria dos gateways compatíveis entende; já os modelos de raciocínio oficiais da OpenAI (série o / GPT-5) só aceitam `max_completion_tokens` e retornam `unsupported_parameter` ao receber `max_tokens`, então esses endpoints precisam da troca manual para o campo novo. Os dois formatos têm nome de campo fixo (Anthropic usa `max_tokens`, Responses API usa `max_output_tokens`), por isso o seletor fica desabilitado e é limpo ao salvar nos formatos que não são openai. Também foi ligado um caminho que nunca estivera conectado: planner / worker / chat / Agent principal / decomposição de objetivos, os cinco, nunca definiam limite de saída — a família openai simplesmente não enviava nada e a Anthropic caía no 8192 do SDK, de modo que só adicionar a opção sem ligar esse fio faria o número preenchido não ter efeito; agora o valor é resolvido por configuração a cada rodada, como o "streaming", e passa a valer na rodada seguinte após um failover. Bancos antigos têm comportamento idêntico após a atualização (colunas novas com padrão 0 e nome de campo vazio).
- Ao clicar em "Testar" no backend, o código de status de cada tentativa HTTP e o corpo bruto da resposta do gateway passam a ir para o log do servidor (corpo truncado em 4K), facilitando diagnosticar 401, mensagens de cota, frames vazios, retorno de página HTML e afins, sem ficar restrito ao ok / err colapsado da UI. Esse log não depende do botão "Registros de LLM".

#### Funcionalidades alteradas

- A cadeia de configuração LLM da tarefa passou a ser editável em qualquer estado, sem a restrição de "em execução / pausada / cadeia esgotada": depois que a tarefa termina (done / failed / timeout) a conversa do Agent principal continua usando essa cadeia, e antes, quando um modelo da cadeia dava problema, não era possível alterá-la nem continuar a interação. Os dois bloqueios de estado final — no HTTP do backend e na transação do banco — foram removidos, e o modal do frontend libera edição e gravação também para tarefas em estado final. Ao salvar uma tarefa em estado final, não se reabrem mais intenções bloqueadas por cota (elas iriam para open, sem worker para executá-las e sem atender à condição de "re-run de intenção"); para continuar, usa-se re-run de intenção / novo objetivo, que devolvem a tarefa ao estado de execução.

### Agent

#### Funcionalidades alteradas

- "Enviar mensagem a um Worker em execução para ajustar a direção" passou a reutilizar o mecanismo existente de pausa / retomada + transcript resume, com comportamento igual ao da conversa com o Agent principal: antes era um protocolo próprio de persistência de intervenção, que envolvia a barreira de escalonamento, o fluxo de retomada e mais de dez filtros de consulta de atividade. Agora a mensagem é injetada na entrada da rodada seguinte, e a intenção roda diretamente em sua própria goroutine, sem a limitação do pool de 3 slots de worker, executando assim que enviada; o frontend mantém a caixa de mensagem e restaura o botão "continuar direto", com o envio passando a ser transportado por SSE. Sem alteração de schema no DB. Trade-off: as mensagens ficam apenas em memória, sem recuperação após crash, e ao enviar a mensagem a tarefa pode exceder em um worker o limite de concorrência por um instante (cenário de baixa frequência, aceitável).

### Tarefas

#### Correções

- Corrigida a quebra por esgotamento de memória (OOM) ao arquivar tarefas grandes: o arquivamento passou a gravar o snapshot em streaming, sem ler a tarefa inteira para a memória de uma só vez; também foram fechadas três lacunas de recuperação no caminho de arquivamento a frio — nas instalações modernas o tráfego fica só no SQLite, e antes um crash entre o commit no PostgreSQL e o commit no SQLite deixava o tráfego da tarefa arquivada preso no armazenamento quente sem forma de recuperação; agora, com ou sem diretório histórico, é gravado um log de staging, e um `journal.json` ausente é tratado como descartável.
- Corrigida a lentidão do sistema com muitas tarefas: havia atraso perceptível ao carregar conversas e ao carregar a interface. As consultas da lista de tarefas, do contexto da tarefa e dos registros de exploração foram otimizadas em conjunto, e o dashboard, a página de conversas e a página de detalhes da tarefa no frontend passaram a fazer menos requisições duplicadas.

### Ativos

#### Funcionalidades alteradas

- Removido o limite de "no máximo 256 regras" no escopo de ativos da empresa: empresas que cadastram o escopo IP por IP / domínio por domínio batiam facilmente nesse teto e, ao atingi-lo, só podiam ser divididas em várias empresas, sendo que o escopo em si não fica mais lento por ter mais linhas. O limite foi removido nos três lugares — backend, frontend e mock do demo; cada regra continua limitada a 1024 caracteres, e o teto de 2 MiB no corpo da requisição permanece como salvaguarda (o equivalente a quarenta e poucos mil regras).

### Skills

#### Correções

- Corrigido o erro "falha no upload: zip: unsupported compression" ao enviar pacote compactado de Skill: a biblioteca padrão do Go só traz os descompactadores Store / Deflate, e pacotes bzip2 e Zstandard gerados por softwares de compactação em níveis não padrão nunca abriam. Agora os dois descompactadores foram adicionados (implementação em Go puro, sem nova dependência externa); os métodos realmente não suportados, como Deflate64 / LZMA / XZ / PPMd, e pacotes criptografados passaram a exibir uma mensagem legível antes da descompactação, apontando qual arquivo usou qual método de compactação e como recompactar, em vez de jogar o erro em inglês de baixo nível no usuário.
- Corrigido o problema de a validação de nome de arquivo dentro da Skill considerar nomes em chinês como inválidos: a validação de caminho era uma whitelist ASCII `[A-Za-z0-9-_./]`, e bastava um arquivo com nome em chinês no pacote (como `参考/说明.md`) para o upload inteiro falhar com "o pacote contém caminho inválido". Agora é uma blacklist Unicode: nomes de arquivo de qualquer idioma e espaços são permitidos, continuando rejeitados caracteres de controle, UTF-8 inválido, caracteres de largura zero e de controle bidirecional (disfarce de nome de arquivo com RLO), `\ % # ? * : " < > |`, além de `..` / caminho absoluto / segmento de caminho vazio, com a proteção contra directory traversal inalterada. O nome da Skill também foi liberado — ASCII continua restrito a letras minúsculas, dígitos e hífen (especificação agentskills.io), letras não ASCII como as do chinês podem ser usadas diretamente como nome de Skill, mas espaços, pontos e separadores de caminho não são aceitos.
- Corrigido o problema de nomes de arquivo corrompidos ou do pacote inteiro rejeitado após descompactar pacotes em chinês gerados por softwares de compactação do Windows: esses zips não marcam o bit UTF-8 e gravam os nomes em GBK, e agora a decodificação de fallback em GBK acontece antes da validação de caminho. Além disso, frontmatter com aspas como `name: "中文技能"` também extrai corretamente o nome da Skill.

### UI

#### Funcionalidades adicionadas

- A página de achados ganhou uma visão achatada "Todos os achados", definida como padrão e alternável com a visão original "agrupada por tarefa" por abas no cabeçalho da página: na visão agrupada é preciso expandir tarefa por tarefa para ver as vulnerabilidades, o que atrapalha quem só quer passar os olhos na lista entre tarefas. A visão achatada é uma grande tabela entre tarefas (10/20/50/100 itens por página) com comportamento idêntico ao da visão agrupada — exportar itens marcados, expandir na linha para ver evidências e relatório detalhado, editar nome/categoria/severidade na linha, alterar status de tratamento, aprofundar e excluir. As duas visões compartilham os cartões de estatística e a barra de filtros, alternar não perde filtros, e a visão atual e os filtros são gravados juntos localmente; o polling atinge apenas a visão atual, e alterações na linha são gravadas nos caches das duas, de modo que alternar não mostra dados desatualizados.
- A página de achados ganhou a visão "por ativo": à esquerda uma árvore de ativos (empresa → domínio raiz / IP → subdomínio → serviço → endpoint, com o nível de empresa só aparecendo quando o ativo realmente tem vínculo), à direita os achados de toda a subárvore do nó selecionado, compartilhando a mesma tabela e o mesmo conjunto de filtros das outras duas visões. A árvore só inclui ativos que têm achados, e a cadeia de ancestrais é completada sob demanda (quando o achado está apenas no endpoint mais profundo, os níveis acima ainda são montados), com as contagens dos nós agregadas por subárvore e deduplicadas por achado; achados de ativos já excluídos ou que nunca tiveram vínculo vão para o balde "ativos não vinculados". Diferente das outras duas visões, a visão por ativo não faz polling — consulta ao entrar na visão, ao mudar filtros, ao criar/alterar/excluir achados na página ou ao clicar no botão de atualizar da árvore, porque a árvore da esquerda é estrutura de navegação e não precisa ser recalculada a cada 5 segundos. Cada nível da árvore mostra apenas o incremento em relação ao nível anterior (subdomínio sem o sufixo do domínio raiz, serviço exibido como `https :443`, endpoint apenas com o caminho), com o valor completo no tooltip e no breadcrumb; com nós demais, a camada inteira descarta os níveis de endpoint/serviço e exibe um aviso, mantendo as contagens nos níveis superiores.

#### Correções

- Corrigido o problema de o registro da conversa ficar espremido e ilegível nos detalhes de conversa no celular: em telas estreitas a lista de conversas é recolhida, liberando a largura para o registro em si.

### Dependências

#### Funcionalidades alteradas

- norma atualizado de v0.3.2 → v0.3.3: novo `Config.MaxTokensField`, permitindo que o limite de saída do OpenAI Chat Completions envie `max_completion_tokens` (os modelos de raciocínio só aceitam essa chave). As duas chaves são mutuamente exclusivas e apenas uma é enviada, com `max_tokens` ainda como padrão.
- `golang.org/x/mod` atualizado de v0.37.0 → v0.40.0, corrigindo dois alertas de segurança de dependência.

## [0.3.6] - 2026-08-27

### LLM

#### Correções

- Corrigido o botão "não streaming" que voltava para "streaming" ao reabrir após salvar (#69): o DTO da API de listagem de configurações não incluía o campo `streaming`, a resposta nunca o retornava e o frontend, lendo `undefined`, caía sempre no streaming padrão; a gravação e o armazenamento no DB estavam corretos, apenas não era possível ler de volta. O campo voltou ao DTO (sem `omitempty`, pois `false` também precisa aparecer na resposta).
- O teste de conexão passou a verificar que o modelo realmente responde e a testar no modo real de envio/recepção da configuração (#65): antes só se verificava o sucesso HTTP, e uma requisição que passava com zero resposta do modelo (raciocínio consumindo todo o orçamento / corpo engolido pela política de segurança / `content` perdido na camada de compatibilidade) também reportava "conexão bem-sucedida", em descompasso com o "não responde" na conversa; além disso, o teste sempre usava streaming, então uma configuração não streaming era testada, na prática, por outro caminho. Agora resposta vazia é falha direta, o sucesso mostra a resposta do modelo no aviso, e o botão de streaming atual é levado para o teste, mantendo coerência entre "teste aprovado" e "a conversa funciona".

### Agent

#### Funcionalidades alteradas

- `list_facts` passou a ter paginação + filtro por palavra-chave, evitando que uma única chamada estoure o contexto quando há muitos fatos (#74): retorna por padrão os 20 mais recentes, com suporte a `limit` (máximo 100) / cursor `before` / palavra-chave `q` no summary, retornando `{facts, total, has_more, next_before}`; summaries individuais muito longos são truncados por contagem de caracteres (o texto completo continua via `node_detail`). Os prompts de worker / planner foram sincronizados com a semântica de paginação. Bancos antigos recebem migração única que atualiza o schema dos novos parâmetros na tabela de catálogo de ferramentas (o `SeedTool` só insere na primeira vez; caso contrário a página de gerenciamento de ferramentas mostra "sem parâmetros").

### Ferramentas

#### Funcionalidades adicionadas

- A página "Execução de ferramentas" ganhou estatísticas de número de chamadas por ferramenta (#72): o botão "Estatísticas" na barra de ferramentas abre um modal que mostra, por ferramenta, número de chamadas, participação e número de falhas (em ordem decrescente de chamadas); reaproveita os filtros de tarefa / palavra-chave da lista, conta o conjunto de resultados inteiro e não a página atual, e só busca os dados quando o modal é aberto.

### Dependências

#### Funcionalidades alteradas

- norma atualizado de v0.3.1 → v0.3.2: corrige reasoning/refusal silenciosamente descartados nas respostas da família OpenAI (Responses ganhou `reasoning_text`), deduplicação dos três nomes do campo reasoning, retry limitado para resposta vazia (zero blocos de conteúdo) e o 400 de gateway causado por corte de pareamento de ferramenta na fronteira de compressão (corrigindo também os órfãos já gravados no transcript).

## [0.3.5] - 2026-08-25

### LLM

#### Funcionalidades adicionadas

- Cada configuração LLM suporta alternar entre streaming e não streaming (streaming por padrão): ligado usa SSE em streaming; desligado usa não streaming de verdade (`stream:false`, retornando o JSON completo de uma vez), contornando implementações ruins de SSE em alguns gateways (frames vazios, frames perdidos no campo de raciocínio), ao custo de perder o progresso em tempo real durante a execução e a contagem de token em tempo real. worker / planner / mainagent / chat / goals resolvem o valor dinamicamente conforme a configuração ativa; as três camadas de wrapper de Provider — `llmpool` / `llmrec` / runtime da tarefa — são compatíveis com não streaming; `llm_profiles` ganhou a coluna `streaming`, adicionada via `ALTER` em bancos antigos (padrão `true`, sem impacto nas configurações antigas).
- Suporte a configurações LLM no formato OpenAI Responses API: cada configuração ganhou um terceiro formato, `openai-responses` (que chama `POST /v1/responses`), ao lado de Chat Completions / Anthropic; `BaseURL` normalizada, modelo padrão `gpt-5`; a restrição de `format` em `llm_profiles` incluiu `openai-responses`, com migração idempotente para bancos antigos; o seletor de formato no frontend ganhou "OpenAI (Responses API)". Dependência norma atualizada para v0.3.1 (incluindo a correção do retorno de `reasoning_content`).
- Gravação do texto bruto HTTP das requisições/respostas do LLM: o wire body real é capturado na camada de transport HTTP, preservando o schema de ferramentas, os blocos `tool_use` e os frames SSE originais que a visão normalizada não mostra; as várias tentativas de retry internas do norma são preservadas uma a uma; `llm_records` ganhou as colunas `raw_request` / `raw_response`, adicionadas via `ALTER` em bancos antigos; o painel de detalhes da página de gravação ganhou alternância para a visão "texto bruto" e botões de copiar requisição/resposta (com fallback compatível com `execCommand` em contexto não seguro).

### Conversas

#### Funcionalidades alteradas

- A seleção múltipla na lista de conversas virou um botão de modo "seleção múltipla": por padrão a lista não mostra mais a caixa de seleção fixa em cada linha (visual mais limpo), e o cabeçalho passou a exibir "N no total + seleção múltipla"; clicar em "seleção múltipla" entra no modo de seleção (caixas de seleção, selecionar tudo, exclusão em lote), e "concluído" sai e limpa a seleção; a exclusão em lote sai automaticamente quando tudo dá certo (se algo falhar, permanece no modo de seleção para facilitar o retry); renomear / fixar / excluir um item individual continua no menu ⋯ de cada linha.

### UI

#### Funcionalidades alteradas

- Melhorias de experiência no gerenciamento de tarefas, nas operações de conversa e na visualização de tráfego (#57): a preferência de ordenação das colunas da lista de tarefas passou a ser memorizada de forma persistente, a renomeação na linha passou a ser acionada direto por ícone (sem passar pelo menu), e a interação de drawer (sheet) e os detalhes da visualização de tráfego foram otimizados.

#### Correções

- O rótulo de ativos do Worker mostra apenas domínio e IP, tratando corretamente o caso de rótulo vazio.

### Agent

#### Funcionalidades adicionadas

- O planner ganhou uma "verificação de aceite quantitativo" ao julgar objetivos: quando o objetivo contém condições de aceite quantificáveis (cobertura de teste dos ativos atingindo X%, obtenção de N flags, obtenção de determinada permissão), antes de `prove_goal` é obrigatório conferir os valores medidos no `graph_overview` (como `coverage.pct` e a contagem de findings); sem atingir o medido, o `prove_goal` fica proibido e devem-se despachar intenções para cobrir a diferença, não sendo permitido marcar met antecipadamente sob o argumento de "a maior parte está pronta / praticamente atingido". Corrigido o caso em que o objetivo exigia 100% de cobertura, o medido era apenas 40% e ainda assim foi julgado concluído.

#### Funcionalidades alteradas

- Reescrita a base de decisão de "0 intenções nesta rodada" no prompt do planner: o texto original descrevia 0 intenções como "o princípio mais comum e mais importante", o que fazia o planner recuar cedo demais quando o objetivo não foi atingido e ainda havia superfícies não testadas no escopo. Agora só se devem produzir 0 intenções em duas situações concretas — ① todas as direções pensadas já estão cobertas por intenções open/running/recent_done; ② o próximo passo depende da produção de um work em execução e essa produção ainda não apareceu (deve-se esperar ele terminar e planejar no próximo acordar, já com o grafo atualizado). E foi acrescentada a restrição inversa: se há direções novas não cobertas e que não dependem de work em execução, ou se o objetivo não foi atingido e ainda há superfície não testada, não recuar por "0 intenções é comum".
- Reforçado o "limiar de evidência para conclusões negativas" no prompt do worker: para conclusões negativas como "não injetável / porta fechada / sem ponto de login", que podem fazer o planner abandonar uma direção inteira, exige-se esgotar antes os meios razoáveis dentro da intenção (trocar codificação/parâmetro/caminho/método); se os meios não foram esgotados ou a evidência é fraca, marcar sempre `confidence=inferred`, evitando selar toda a rota com uma negativa precipitada marcada `observed` (negativas erradas no início da tarefa desviam especialmente a direção e são difíceis de auto-corrigir).
- As mudanças acima nos prompts padrão de planner / worker são acrescentadas como nova versão por migração única (`reseedPlannerPrompt` / `reseedWorkerPrompt`, cada uma protegida por settings flag) e passam a ser a versão atual; as versões antigas permanecem no histórico, e usuários que personalizaram os prompts podem restaurá-las no registro de versões.

### Operações

#### Funcionalidades adicionadas

- Novo `reset-password.sh` para redefinir a senha do administrador (usuário fixo `WARROOM`): suporta deploy local / docker, e as informações de conexão podem ser dadas explicitamente ou lidas automaticamente de `--dsn`/`$WARROOM_PG_DSN`/`config.json`; gera no banco, com `pgcrypto`, um hash bcrypt compatível com o login do backend e grava em `settings.auth.password_hash`, sem necessidade de reiniciar o serviço após a redefinição. A senha é passada por variável de ambiente, não entra no argv do processo, e há escape contra injeção.

## [0.3.4] - 2026-08-24

### UI

#### Funcionalidades adicionadas

- Após marcar várias tarefas na lista, é possível alterar a categoria em lote; a categoria de destino aceita "sem categoria", retirando a tarefa da categoria atual; a gravação do lote inteiro ocorre em uma transação, e os únicos itens que podem falhar são tarefas excluídas após a marcação.

#### Funcionalidades alteradas

- A "categoria da tarefa" no formulário de nova tarefa passou de seleção em lista para campo de texto com busca: digitar já filtra as categorias existentes, e um nome inexistente no banco é criado e selecionado na hora ao pressionar Enter (ou clicar em "criar" na lista), com o item selecionado exibido como tag removível; continua limitado a uma única categoria.

### Conversas

#### Correções

- Corrigido o bloqueio "LLM não configurado, impossível conversar" ao enviar mensagem quando a conversa já tinha uma configuração LLM escolhida mas não havia configuração ativa global. A verificação antes do envio olhava apenas a configuração ativa global, enquanto a execução real prioriza a configuração escolhida na conversa — duas lógicas de resolução inconsistentes; agora é uma só (vínculo da conversa/Agent com prioridade, global como fallback).
- O aviso de impossibilidade de conversar foi detalhado por estado: sem nenhuma configuração, avisa "adicionar configuração"; com configuração mas sem ativação, avisa "ativar ou indicar uma configuração para esta conversa"; não mostra mais "não configurado" para tudo, facilitando o diagnóstico.

### Agent

#### Funcionalidades adicionadas

- Em tarefas com todos os objetivos atingidos, as intenções despachadas pelo Agent principal via `add_intent` podem ser reivindicadas e executadas diretamente pelo Worker, encerrando ao terminar: nesse momento o Planner não roda mais (tarefa sem objetivo open não entra em planejamento), evitando que ele reavalie a consecução dos objetivos e cancele a intenção recém-despachada; quando a frontier é drenada, a tarefa volta a concluída. Antes de despachar a intenção, o Agent principal pergunta ao usuário, com base no conteúdo da intenção, se ela deve ser registrada como objetivo formal; se registrada, a tarefa volta ao planejamento autônomo normal.

#### Funcionalidades alteradas

- Quando `step_ids` de `get_worker_trace` / `get_task_worker_trace` excede o limite por chamada (5), não há mais erro direto: passam a ser retornados os 5 primeiros passos completos, e o resultado informa via `returned_step_ids` / `omitted_step_ids` / `notice` quais foram obtidos e quais ficaram de fora, com a dica "se já for suficiente, não é preciso buscar mais". IDs duplicados e inválidos informados são primeiro deduplicados e removidos, e só então contados.

#### Correções

- A lista de tarefas passou a ordenar por id decrescente (mais recentemente criada primeiro), substituindo a ordenação anterior por data de criação. Várias tarefas criadas no mesmo instante têm timestamp idêntico e ordenação instável, o que, somado ao polling a cada 10 segundos e à iteração aleatória de map em memória, fazia com que trocassem de posição constantemente na lista.

### Ativos

#### Correções

- Corrigido o recálculo de vínculo da empresa que quebrava por uma única linha de dados sujos: quando `assets.ip` guardava um nome de host (gravado pelo Agent ou pela API de ativos), `a.ip::inet` lançava `22P02`, fazendo falhar e reverter tudo — criação/alteração do escopo de ativos da empresa e exclusão da empresa. Passou-se a usar a conversão segura `try_inet()`, que ignora valores inválidos em vez de abortar a instrução inteira.
- O `ip` não analisável não é mais ignorado em silêncio: ao salvar o escopo da empresa, um aviso explícito informa quantos ativos têm `ip` que não é um IP válido (com o id e o valor concretos), lembrando que esses ativos não serão vinculados por regras de IP/CIDR; a mesma informação vai para o log do servidor, cobrindo os caminhos sem resposta no frontend (exclusão de empresa, sincronização com o scopesentry, gravação pelo Agent).
- A correspondência de IP/CIDR no escopo de teste da tarefa também passou a usar `try_inet()`, substituindo o guarda de regex que só verificava o conjunto de caracteres (nomes de host só com letras hexadecimais, como `abc.def`, ainda passavam e disparavam o mesmo erro).

#### Funcionalidades alteradas

- O campo `ip` dos ativos `ip`, `service` e `endpoint` não aceita mais nome de host: `insert_assets` e a API de ativos retornam erro item a item com `index` e a forma direta de corrigir (usar `type=subdomain` preenchendo `domain`, ou resolver antes os registros A/AAAA), permitindo ao Agent se autocorrigir e reinserir. Os demais ativos do mesmo lote não são afetados e entram no banco normalmente.

## [0.3.3] - 2026-08-23

### Worker

#### Funcionalidades adicionadas

- Workers em execução suportam pausa, retomada e cancelamento individuais; a pausa preserva intenção, fatos e vulnerabilidades, e o cancelamento limpa transacionalmente a intenção atual e seus produtos diretos após a execução sair.
- Adicionados o estado de intenção `paused`, a barreira de execução e a causa de término nomeada, evitando gravações tardias no blackboard após pausa, cancelamento ou exclusão de tarefa.
- Adicionado limite opcional de concorrência de tarefas; criação, retomada, aprofundamento de vulnerabilidade e reposição da fila passam uniformemente pelo caminho de admissão FIFO persistente.

#### Funcionalidades alteradas

- A duração padrão de wall clock por execução do Worker passou de 600 para 1200 segundos; tarefas revividas após timeout reiniciam a contagem na próxima execução real.
- O estado real de execução de Worker, Planner e Agent principal passou a dirigir uniformemente o selo de status da tarefa, corrigindo o "ocioso" exibido enquanto o Worker rodava.
- A conversa do Worker mantém o controle individual e o resumo de token da conversa atual; o nome do modelo passou a ser exibido à direita do título da conversa atual.

#### Funcionalidades removidas

- Removida a interface de seleção múltipla, selecionar tudo e pausa/retomada em lote de Workers, junto com a API de controle em lote e o contrato de Mock correspondente.
- Removidos o selo de Token e o Tooltip na linha da lista de Workers; o ledger completo de token na base e a API de agregação por tarefa continuam existindo.

### LLM

#### Funcionalidades adicionadas

- Tarefas suportam cadeia ordenada de configurações LLM; ao identificar claramente falta de cota do fornecedor, a próxima configuração é trocada automaticamente, persistindo a configuração atual, o estado de esgotamento e o resumo do erro.
- Tarefas em execução e pausadas suportam editar a cadeia completa, ajustar a ordem e trocar manualmente a configuração atual, com efeito a partir da próxima chamada LLM.
- Troca automática, troca manual e esgotamento da cadeia inteira são gravados como atividade de sistema estruturada, com aviso deduplicável exibido no stream de atividades da tarefa.
- Adicionada API de resolução de modelo por papel da tarefa, resolvendo uniformemente a configuração e o modelo usados na próxima chamada do Main Agent, do Planner e do Worker.
- Adicionado LLM Pool global opcional, com configuração da ordem de chamada, fallback para modelo específico em caso de falha, estado de saúde, recuperação por cooldown e reset manual.
- Adicionado ledger de uso do LLM sempre ativo, agregando token de entrada, saída e cache por tarefa, conversa, modelo e configuração.

#### Funcionalidades alteradas

- Decomposição de objetivos, Planner, Worker e Agent principal compartilham o runtime LLM da tarefa (prioridade de resolução abaixo).
- O failover só reage a erros explícitos de cota, saldo ou cobrança; rate limit comum, autenticação, rede, servidor e erros de contexto não provocam troca indevida.
- A página de configuração LLM passou a ser uma lista de cartões com edição em drawer à direita, oferecendo ordem de polling do Pool, prioridade, itens excluídos, estado de saúde e operações de recuperação.
- A informação de esgotamento da cadeia suporta quebra de linha em telas estreitas; o modelo atual deixou de ser um ícone na lista de conversas e passou a ser um rótulo de texto ao lado do título da conversa atual, com Tooltip completo.
- A ordem de resolução de LLM por papel dentro da tarefa passou a "vínculo do Agent → cadeia de configuração da tarefa → global": papéis com modelo explicitamente vinculado sempre rodam nesse modelo, papéis sem vínculo caem na cadeia da tarefa, e a cadeia vazia cai no global.
- Proxy de saída vazio significa conexão direta, sem fallback para as variáveis `HTTP_PROXY`/`HTTPS_PROXY` (o `WARROOM_LLM_PROXY` explícito não é afetado); o campo de proxy aceita `socks5://user:pass@host:port` com usuário e senha.

#### Correções

- Falhas transitórias de streaming antes do commit (sem nenhuma saída produzida) fazem retry com backoff seguro no mesmo provider, reduzindo significativamente os casos de "interrompe após uma ou duas ferramentas, sem resumo, com estado final `model_error`"; esgotamento de cota, contexto longo demais e erros determinísticos 4xx não são retentados e continuam sendo tratados pelo failover e pela recuperação por compressão, respectivamente.

#### Funcionalidades removidas

- Removida a identificação por ícone do LLM na lista de conversas, evitando confusão com o ícone de status do Worker.

### UI

#### Funcionalidades adicionadas

- Tarefas suportam criação, renomeação, exclusão e filtro de categorias globais; a nova tarefa pode selecionar a categoria diretamente.
- Adicionado CRUD de modelos globais de tarefa e drawer de gerenciamento à direita; a nova tarefa pode carregar descrição e objetivos predefinidos, ou salvar o conteúdo atual como modelo.
- A nova tarefa suporta associar várias tarefas de origem e vários escopos de ativos de empresas; o escopo da empresa é reconhecido automaticamente em um único campo de texto multilinha, identificando domínio, URL, IP, CIDR, ICP e palavras-chave da empresa.
- Os ativos de teste da tarefa podem ser adicionados e excluídos em tempo real, registrando a origem: manual, empresa, herança ou descoberta pelo Agent; ao lado do título da conversa do Worker são exibidos os ativos de teste atuais e um resumo das origens.
- A página de achados agrupa por tarefa com paginação independente dentro de cada grupo, e permite preencher a descrição da vulnerabilidade e criar uma intenção de aprofundamento de alta prioridade.
- Conversas suportam renomear, fixar, desafixar e excluir; a lista de tarefas suporta pausa e retomada em lote na página atual.
- Os detalhes de tráfego e de execução de ferramenta passaram a abrir em drawer à direita; a mensagem HTTP ganhou o `Host` e destaca linha de requisição, status, Header, JSON e corpo em linguagem de marcação.
- A coluna de ações da lista de tarefas ganhou os botões "Detalhes" e "Pausar/Retomar"; a tecla de envio da conversa é configurável nas configurações do sistema (`Enter` / `Cmd+Enter` etc.), e a área de busca na web ganhou um campo de proxy.
- O selo à direita do título da conversa passou a mostrar o nome da configuração LLM, com o ID do modelo movido para o Tooltip ao passar o mouse; tarefas podem ter nome opcional, e a lista de tarefas ganhou coluna de nome e busca (se vazio, recai na descrição).
- A página de Skills ganhou contagem de uso, hora do último uso e estatísticas de dependências ausentes, facilitando localizar Skills que não estão funcionando ou não estão instaladas.

#### Funcionalidades alteradas

- O título da tarefa passou a ser um link focável para os detalhes; ativos da tarefa, ativos da empresa, grupos de tarefas com achados e vulnerabilidades dentro do grupo usam paginação real do servidor, ordenação estável e total exato.
- A criação de empresa passou a usar drawer à direita, com o escopo em campo de texto multilinha unificado e reconhecimento, validação e prévia de tipo em tempo real.
- O campo do Agent principal cresce automaticamente, envia com `Enter` e quebra linha com `Shift+Enter`, evitando envio acidental durante a composição do IME de chinês.
- Prévia de Agent, relatório da tarefa e detalhes relacionados passaram a usar uniformemente a renderização Markdown compartilhada; confirmação de exclusão, erros longos e largura do drawer no celular foram corrigidos de forma uniforme.
- O seletor de modelo de tarefa exibe e pesquisa pelo nome do modelo e envia o ID do modelo; o tamanho de fonte original do sistema foi restaurado, e a versão do aplicativo aparece uniformemente como `0.3.3`.
- No total da tarefa e no token da conversa atual, apenas os valores de entrada, leitura de cache e saída são destacados; o botão de enviar usa um ícone de seta para cima mais simples.
- O escopo de teste na visão geral da tarefa mostra o nome da empresa em vez do ID.

#### Correções

- Textos comuns contendo pontos não são mais confundidos com número de registro ICP.
- Corrigido o conflito de nomes entre o catálogo de variáveis e variáveis de runtime globais (como `{{.Now}}`), que fazia a lista de variáveis do editor de Agent renderizar chaves duplicadas.

#### Funcionalidades removidas

- Removido o botão "entrar" separado do cartão de tarefa; agora o clique no título da tarefa abre os detalhes em todos os casos.
- Removidos o botão "nova tarefa" do dashboard, o campo de URL do Logo na criação de empresa e o Badge com a quantidade de vulnerabilidades no topo da página de achados e no agrupamento por tarefa.
- Revertido o estilo que aumentava a fonte global em 10%, e removidos da lista de conversas a caixa de seleção de Worker, o ícone de modelo e a estatística de token por linha.

### Agent

#### Funcionalidades adicionadas

- A nova tarefa pode associar diretamente várias tarefas existentes, herdando em tempo real e somente leitura os objetivos, fatos, vulnerabilidades, intenções concluídas, escopo de ativos e contexto de blackboard das tarefas de origem diretas.
- As ferramentas de leitura do blackboard consultam sob demanda nós, fatos, vulnerabilidades e traços de execução da tarefa de origem; nós herdados carregam marca de origem e todas as ferramentas de escrita recusam alteração.
- As ferramentas de escopo da empresa aceitam domínio, URL, IP, CIDR, ICP e palavras-chave da empresa; as palavras-chave servem apenas como indicação de escopo para o Agent e não participam da vinculação automática de ativos.
- A operação de aprofundamento de vulnerabilidade cria na tarefa original uma intenção de Worker manual de alta prioridade, com âncora de ativo e aresta `derived_from`.
- A visão geral ganhou o cartão "Gerenciamento de objetivos", permitindo consultar, criar, alterar e excluir objetivos manualmente; criar ou alterar notifica o Planner e reativa a tarefa, enquanto excluir remove fisicamente o nó de objetivo (cascateando arestas e âncoras) sem reativar.
- O Agent principal recebe por padrão a ferramenta `steer_work`, podendo injetar em tempo real instruções corretivas em um Worker em execução sem interromper nem perder o progresso (validando ainda que a intenção pertence a esta tarefa).

#### Funcionalidades alteradas

- As intenções da tarefa de origem não entram na frontier da nova tarefa, que continua usando exploração, fila de execução, diretório de trabalho e histórico de conversa independentes.
- Excluir uma intenção em execução não destrói mais dados: ela passa a `stopped`, exige o motivo da exclusão, anexa o motivo como fato à intenção e o grava no payload, e o planejamento percebe pelo gatilho `cancelled` (preservando o conteúdo da intenção e o motivo).
- A conversa do Agent principal passou a ser dirigida pelo stream de atividades do servidor, e a entrada é recuperável em caso de falha no envio; ao abrir a conversa ela rola automaticamente até o fim, mantendo a última resposta visível mesmo após o carregamento preguiçoso dos detalhes.
- Pausar a tarefa encerra as chamadas atuais do Main Agent, do Planner e dos Workers, mas não impede o usuário de iniciar novas conversas de orquestração com o Agent principal durante a pausa.
- Cancelamento, encerramento e interrupção de streaming preservam uniformemente a causa real de término, o conteúdo já gerado, o número de rodadas, o tempo decorrido, o token e as chamadas de ferramenta que não retornaram.

#### Funcionalidades removidas

- Removida a exibição otimista de mensagens no cliente do Agent principal, evitando mensagens duplicadas e vazamento entre conversas em caso de pausa, falha ou atividade concorrente.

### Restrições

#### Funcionalidades adicionadas

- A fase de decomposição de objetivos passou a extrair primeiro as restrições de operação (allow/deny) e só então decompor os objetivos, podendo o Agent principal complementá-las em runtime; as restrições são injetadas com prioridade máxima nos system prompts do Planner e do Worker, e após a descontaminação de viés a diversidade e a exploração de superfície obedecem explicitamente às restrições.
- A visão geral ganhou o cartão "Gerenciamento de restrições" e APIs de criação/alteração/exclusão; o escopo de injeção das restrições pode ser ligado/desligado separadamente por Planner / Worker (ambos ligados por padrão, lidos a cada rodada e com efeito imediato). A nova tabela `task_constraints` usa `CREATE TABLE IF NOT EXISTS`, criada automaticamente em bancos antigos.

### Interceptação

#### Funcionalidades adicionadas

- A interceptação de comandos ganhou, além das regras de regex/string, a aprovação de fallback pelo modelo: quando nenhuma regra corresponde, o modelo faz a avaliação semântica `ALLOW`/`ASK`/`DENY`, com ação de fallback em caso de falha e ação em caso de timeout de aprovação configuráveis; a página de interceptação foi dividida em duas abas, "Regras de interceptação / Configuração do modelo", e o resultado da decisão do modelo vem prefixado com `[模型]` e a justificativa.

#### Correções

- Reforçada a análise da saída do juiz, evitando que um `DENY` correto seja tomado por engano como liberação.

### Tráfego

#### Funcionalidades alteradas

- A captura de tráfego passou a gravar o exchange inteiro no SQLite (corpos grandes transbordando para um bucket de blobs deduplicado por hash), com índice de texto completo trigram sobre corpos textuais, suportando busca por qualquer substring e por chinês; a exclusão degradou para uma única transação SQL, caindo de horas para milissegundos e sem parar a captura durante a operação. Adicionado download em streaming para corpos grandes e parâmetros de texto completo em `traffic_search`; os dados antigos em árvore de arquivos não precisam de migração e continuam legíveis, pesquisáveis e removíveis.

### Tarefas e ativos

#### Funcionalidades adicionadas

- A criação de tarefa ganhou o botão "funcionalidade de cobertura de ativos" (ligado por padrão): desligado, a cobertura não é calculada nem exibida, o mapa de situação mostra apenas ativos, o `task_scope` não é acumulado automaticamente e as ferramentas relacionadas são removidas do Planner / Agent principal; o vínculo com empresas não é afetado por esse botão.
- `insert_assets` ganhou a marca `related` por ativo (padrão `true`): só tem efeito com a cobertura ativada; `false` grava apenas no banco de ativos compartilhado e não conta para a cobertura desta tarefa (como sites vizinhos descobertos por acaso ou ativos irrelevantes).
- O escopo da empresa e os ativos de teste da tarefa passaram a reconhecer uniformemente domínio, URL, IP, CIDR, ICP e palavras-chave; domínio/IP podem criar ou reaproveitar ativos globais, enquanto CIDR/ICP/palavras-chave ficam como contexto do escopo da tarefa.

### Build

- `build.sh --release` compila de uma vez Linux amd64/arm64, macOS amd64/arm64 e Windows amd64, gerando pacotes zip de release com `skills/`, exemplos de configuração e README.
- Uso do linker do Go para remover informações de depuração e gerar o pacote zip de release; o UPX passou a ser explicitamente opcional, evitando o segfault do seu ELF autoextraível na inicialização em alguns ambientes Linux.
- O Release Workflow executa smoke test de inicialização no binário Linux amd64 e fornece `SHA256SUMS` junto com o pacote de release.

## [0.3.2] - 2026-08-20

### Adicionado

- A nova tarefa pode associar várias tarefas existentes, herdando em tempo real e somente leitura os fatos, vulnerabilidades, intenções concluídas, escopo de ativos e contexto de blackboard das tarefas de origem diretas; a nova tarefa continua usando fila de execução, diretório de trabalho e histórico de conversa independentes.
- Tarefas suportam cadeia ordenada de configurações LLM. Ao identificar claramente falta de cota do fornecedor, a troca para a próxima configuração é automática, persistindo a configuração atual, o estado de esgotamento e atividades de auditoria estruturadas.
- Tarefas em execução e pausadas suportam editar a cadeia de configuração LLM, ajustar a ordem e trocar manualmente a configuração atual; troca automática, troca manual e esgotamento da cadeia inteira geram aviso na página de detalhes da tarefa.
- Workers em execução suportam pausa, retomada e cancelamento. A pausa preserva os dados do blackboard, e o cancelamento limpa transacionalmente, após o Worker parar de escrever, a intenção e os fatos, vulnerabilidades e registros de execução que ela produziu diretamente.
- Excluir uma tarefa permite limpar junto os ativos, o tráfego, as vulnerabilidades e os arquivos gerados pela tarefa, com barreira de exclusão, proteção de concorrência e estatísticas de exclusão auditáveis.
- Adicionado limite opcional de concorrência de tarefas; tarefas novas acima do limite entram em fila FIFO e iniciam automaticamente quando um slot de execução é liberado.
- Adicionados contratos de Mock para paginação de ativos da tarefa, paginação de ativos da empresa, estatísticas de categoria de tarefa e intenções paginadas.
- Adicionado o script de build de binário único `build.sh`, com suporte a exportação estática do frontend, embed de recursos, alvos multiplataforma e injeção da versão de build.

### Alterado

- A cadeia explícita de configuração LLM no nível da tarefa coexiste com o LLM Pool global existente; a cadeia explícita mantém a semântica estrita de failover por cota, e sem cadeia explícita valem as regras de vínculo do Agent e da configuração global.
- O campo do Agent principal suporta entrada multilinha com crescimento automático, envio com `Enter` e quebra de linha com `Shift+Enter`, evitando envio acidental durante a composição do IME de chinês.
- Planner, Worker e Agent principal compartilham o runtime LLM da tarefa; a cadeia da tarefa usa a menor janela de contexto entre os modelos candidatos como limiar seguro de compressão.
- A página de detalhes da tarefa mostra os estados em execução, ocioso e pausado conforme o estado real das chamadas LLM; fatos, vulnerabilidades, intenções, referências de ativos e nós de grafo da tarefa de origem são uniformemente marcados com a origem e permanecem somente leitura.
- A prévia de Agent, o relatório da tarefa e as visões de detalhes relacionadas passaram a usar uniformemente o componente compartilhado de renderização Markdown.
- A configuração de modelo LLM passou a usar interação de cartões e drawer, com a lista de modelos rolando de forma independente dentro do drawer.
- Pausar a tarefa não bloqueia mais a conversa do Agent principal: a conversa de orquestração do Agent principal é independente da pausa da tarefa, e novas mensagens podem continuar sendo enviadas durante a pausa (a pausa encerra apenas a rodada em andamento).
- A duração padrão de wall clock de um run do Worker passou de 600 para 1200 segundos.

### Corrigido

- Removida a exibição otimista do console do Agent principal, com renderização apenas a partir de dados do servidor, corrigindo mensagens fora de ordem e conteúdo de outras conversas aparecendo em cenários de pausa ou falha de envio.
- Ao abrir a conversa do Agent principal, ela rola até o fim e mostra a última resposta por completo: quando o conteúdo completo da última resposta é expandido por carregamento preguiçoso, a rolagem acompanha automaticamente até o fim e o texto não sai mais da tela.
- Corrigido o caso em que a conversa do Agent principal continuava rodando após pausar a tarefa, e em que o Agent de orquestração pausava a tarefa sem parar o Agent principal junto.
- Corrigida a dessincronização entre o selo de status da tarefa e o estado dos botões de ação quando a tarefa concluía, ou quando Planner, Worker ou Agent principal estavam realmente rodando.
- Corrigido o risco de gravações tardias no blackboard ou arquivos remanescentes entre cancelamento de Worker, exclusão de tarefa e escritas concorrentes.
- Corrigidos a prévia de Markdown que não funcionava, o estouro de textos longos na confirmação de exclusão, a largura no celular e o desalinhamento de alguns botões nos detalhes da tarefa.
- Todas as rotas de cancelamento de Agent ganharam causa de término nomeada, e o detalhe da atividade mostra quem cancelou, o estado final, o número de rodadas, o tempo, o uso de token e as chamadas de ferramenta que não retornaram.
- Corrigida a corrida em que o context pai podia sobrescrever a causa nomeada `shutdown` ao desligar o backend, e o texto corrompido por truncamento em bytes de resumos de atividade em chinês.
- Corrigida a perda da causa real de término em eventos de cancelamento com saída parcial em streaming, preservando o conteúdo já gerado antes do cancelamento.

[Unreleased]: https://github.com/llypeDev/warroom/compare/v0.4.0...HEAD
