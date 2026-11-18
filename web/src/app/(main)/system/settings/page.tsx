"use client";

import * as React from "react";

import { CpuIcon, FlaskConicalIcon, KeyboardIcon, RadioTowerIcon, SearchIcon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { CHAT_SEND_MODE_OPTIONS, type ChatSendMode, setChatSendMode, useChatSendMode } from "@/lib/chat-send-mode";
import type { Settings } from "@/lib/types";

import { UpdateCard } from "./_components/update-card";

export default function SystemSettingsPage() {
  const [trafficCapture, setTrafficCapture] = React.useState(false);
  const [agentTrafficBinding, setAgentTrafficBinding] = React.useState(false);
  const [webSearch, setWebSearch] = React.useState(false);
  const [backend, setBackend] = React.useState("ddgs");
  const [braveKeySet, setBraveKeySet] = React.useState(false);
  const [braveKeyInput, setBraveKeyInput] = React.useState("");
  const [tavilyKeySet, setTavilyKeySet] = React.useState(false);
  const [tavilyKeyInput, setTavilyKeyInput] = React.useState("");
  const [savingTavilyKey, setSavingTavilyKey] = React.useState(false);
  const [proxyInput, setProxyInput] = React.useState("");
  const [savingProxy, setSavingProxy] = React.useState(false);
  const [globalProxyInput, setGlobalProxyInput] = React.useState("");
  const [savingGlobalProxy, setSavingGlobalProxy] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savingKey, setSavingKey] = React.useState(false);
  const [pyInterp, setPyInterp] = React.useState("");
  const [workers, setWorkers] = React.useState("3");
  const [savingWorkers, setSavingWorkers] = React.useState(false);
  // 操作约束注入范围(默认都开)。
  const [injectPlanner, setInjectPlanner] = React.useState(true);
  const [injectWorker, setInjectWorker] = React.useState(true);
  // 实验功能:noa 上下文压缩(默认关)。
  const [noaCompaction, setNoaCompaction] = React.useState(false);
  // 纯前端偏好：不走 /api/settings，直接读写 localStorage。
  const sendMode = useChatSendMode();

  const apply = React.useCallback((s: Settings) => {
    setTrafficCapture(!!s.traffic_capture);
    setAgentTrafficBinding(!!s.agent_traffic_binding);
    setWebSearch(!!s.web_search_enabled);
    setBackend(s.web_search_backend || "ddgs");
    setBraveKeySet(!!s.brave_key_set);
    setTavilyKeySet(!!s.tavily_key_set);
    setProxyInput(s.web_search_proxy ?? "");
    setGlobalProxyInput(s.global_proxy ?? "");
    setPyInterp(s.python_interpreter ?? "");
    setWorkers(String(s.workers ?? 3));
    setInjectPlanner(s.constraints_inject_planner !== false);
    setInjectWorker(s.constraints_inject_worker !== false);
    setNoaCompaction(!!s.noa_compaction);
  }, []);

  const saveWorkers = () => {
    const n = Number(workers);
    if (!Number.isInteger(n) || n <= 0) {
      toast.error("O número de concorrência deve ser um inteiro maior que 0");
      return;
    }
    setSavingWorkers(true);
    api
      .setSettings({ workers: n })
      .then((s) => {
        apply(s);
        toast.success("Quantidade de agentes de trabalho concorrentes salva (vale para tarefas iniciadas depois)");
      })
      .catch((e) => toast.error("Falha ao salvar: " + (e as Error).message))
      .finally(() => setSavingWorkers(false));
  };

  const savePython = () => {
    setSaving(true);
    api
      .setSettings({ python_interpreter: pyInterp.trim() })
      .then((s) => {
        apply(s);
        toast.success("Configuração do interpretador Python salva");
      })
      .catch((e) => toast.error("Falha ao salvar: " + (e as Error).message))
      .finally(() => setSaving(false));
  };
  const detectPython = () => {
    setSaving(true);
    api
      .detectPython()
      .then((r) => setPyInterp(r.python_interpreter))
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  React.useEffect(() => {
    api
      .settings()
      .then(apply)
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [apply]);

  const toggleTraffic = (v: boolean) => {
    setTrafficCapture(v); // optimistic
    setSaving(true);
    api
      .setSettings({ traffic_capture: v })
      .then(apply)
      .catch(() => setTrafficCapture(!v)) // revert on failure
      .finally(() => setSaving(false));
  };

  const toggleInjectPlanner = (v: boolean) => {
    setInjectPlanner(v); // optimistic
    api
      .setSettings({ constraints_inject_planner: v })
      .then(apply)
      .catch(() => setInjectPlanner(!v)); // revert on failure
  };

  const toggleAgentTrafficBinding = (v: boolean) => {
    setAgentTrafficBinding(v);
    setSaving(true);
    api
      .setSettings({ agent_traffic_binding: v })
      .then((s) => {
        apply(s);
        toast.success(v ? "Vinculação automática de tráfego do Agent ativada" : "Vinculação automática de tráfego do Agent desativada");
      })
      .catch((e) => {
        setAgentTrafficBinding(!v);
        toast.error(`Falha ao salvar: ${(e as Error).message}`);
      })
      .finally(() => setSaving(false));
  };

  const toggleInjectWorker = (v: boolean) => {
    setInjectWorker(v); // optimistic
    api
      .setSettings({ constraints_inject_worker: v })
      .then(apply)
      .catch(() => setInjectWorker(!v)); // revert on failure
  };

  const toggleNoaCompaction = (v: boolean) => {
    setNoaCompaction(v); // optimistic
    api
      .setSettings({ noa_compaction: v })
      .then((s) => {
        apply(s);
        toast.success(v ? "Compactação de contexto noa ativada (vale para execuções iniciadas depois)" : "Compactação de contexto noa desativada (volta à compactação integrada)");
      })
      .catch((e) => {
        setNoaCompaction(!v); // revert on failure
        toast.error(`Falha ao salvar: ${(e as Error).message}`);
      });
  };

  // Persist a web-search patch (enable and/or backend). Optimistic with refetch.
  const saveWebSearch = (patch: Partial<Settings>) => {
    setSaving(true);
    api
      .setSettings(patch)
      .then((s) => {
        apply(s);
        toast.success("Configuração de busca na web salva");
      })
      .catch((e) => {
        toast.error("Falha ao salvar: " + (e as Error).message);
        api
          .settings()
          .then(apply)
          .catch(() => undefined);
      })
      .finally(() => setSaving(false));
  };

  const saveBraveKey = () => {
    setSavingKey(true);
    api
      .setSettings({ brave_search_api_key: braveKeyInput })
      .then((s) => {
        apply(s);
        setBraveKeyInput("");
        toast.success("Brave API Key salva");
      })
      .catch((e) => toast.error("Falha ao salvar: " + (e as Error).message))
      .finally(() => setSavingKey(false));
  };

  const saveTavilyKey = () => {
    setSavingTavilyKey(true);
    api
      .setSettings({ tavily_search_api_key: tavilyKeyInput })
      .then((s) => {
        apply(s);
        setTavilyKeyInput("");
        toast.success("Tavily API Key salva");
      })
      .catch((e) => toast.error("Falha ao salvar: " + (e as Error).message))
      .finally(() => setSavingTavilyKey(false));
  };

  const saveProxy = () => {
    setSavingProxy(true);
    api
      .setSettings({ web_search_proxy: proxyInput.trim() })
      .then((s) => {
        apply(s);
        toast.success(proxyInput.trim() ? "Proxy de saída salvo" : "Proxy de saída removido (conexão direta)");
      })
      .catch((e) => toast.error("Falha ao salvar: " + (e as Error).message))
      .finally(() => setSavingProxy(false));
  };

  const saveGlobalProxy = () => {
    setSavingGlobalProxy(true);
    api
      .setSettings({ global_proxy: globalProxyInput.trim() })
      .then((s) => {
        apply(s);
        toast.success(globalProxyInput.trim() ? "Proxy global salvo" : "Proxy global removido (conexão direta)");
      })
      .catch((e) => toast.error("Falha ao salvar: " + (e as Error).message))
      .finally(() => setSavingGlobalProxy(false));
  };

  // Run a real "test" search ("test") against the CURRENT form values (backend +
  // proxy + entered key), falling back to saved values server-side. Toasts result.
  const runTest = () => {
    setTesting(true);
    api
      .testWebSearch({
        web_search_backend: backend,
        web_search_proxy: proxyInput.trim(),
        brave_search_api_key: braveKeyInput,
        tavily_search_api_key: tavilyKeyInput,
      })
      .then((r) => {
        if (r.ok) toast.success(`Teste de busca concluído · ${r.backend} retornou ${r.count} resultados`);
        else toast.error("Falha no teste de busca: " + (r.error || "erro desconhecido"));
      })
      .catch((e) => toast.error("Falha no teste de busca: " + (e as Error).message))
      .finally(() => setTesting(false));
  };

  // brave-free selected but no key stored and none being entered → tool stays off.
  const braveNeedsKey = webSearch && backend === "brave-free" && !braveKeySet;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configurações do sistema</h1>
        <p className="text-muted-foreground text-sm">Interruptores globais de execução</p>
      </div>

      {/* 多列而非 grid：网络搜索卡片比其余高数倍，且高度随所选后端变化（brave/tavily
          的 key 输入是条件渲染）。grid 会按最高的一张撑满整行、在旁边留下大片空白，
          多列则自动按内容高度平衡填充。卡片间距靠 mb 而非 gap——多列布局下
          column-gap 只管列间距，行间距要由子元素自己给。 */}
      <div className="columns-1 gap-4 md:gap-6 lg:columns-2">
        <UpdateCard />

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              Captura de tráfego
            </CardTitle>
            <CardDescription>
              Quando ativada, todo o tráfego HTTP dos Agents passa pelo proxy de registro e é gravado
              integralmente, e os Agents recebem as ferramentas traffic_search / traffic_get e a configuração de proxy (o prompt inclui a explicação do proxy).
              <br />
              Quando desativada (padrão), nenhum tráfego é registrado: o Agent
              <b>não</b> recebe a configuração de proxy nem as ferramentas de tráfego, e o prompt também <b>não contém</b> conteúdo sobre proxy. A troca reconstrói o Agent imediatamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="traffic-capture" className="text-sm font-normal text-muted-foreground">
              {trafficCapture ? "Ativada · registrando tráfego e injetando proxy" : "Desativada · não registra nem injeta proxy"}
            </Label>
            <Switch
              id="traffic-capture"
              checked={trafficCapture}
              disabled={!loaded || saving}
              onCheckedChange={toggleTraffic}
            />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              Vinculação automática de tráfego do Agent
            </CardTitle>
            <CardDescription id="agent-traffic-binding-description">
              Desativada por padrão. Quando ativada, o Agent de relatório acionado na entrada da vulnerabilidade confere as requisições/respostas HTTP existentes e associa o tráfego correspondente antes de escrever o relatório.
              <b>Consultar os pacotes e as chamadas de ferramenta adicionais aumentam o consumo de Token.</b>
              <br />
              Em TCP, com pacotes não capturados ou sem tráfego correspondente, o reporte continua funcionando. Este interruptor não afeta a captura de tráfego, a vinculação manual nem a visualização das evidências salvas. Vale para o próximo turno do Agent;
              com o interruptor desativado, novas vinculações automáticas são recusadas imediatamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="agent-traffic-binding" className="text-sm font-normal text-muted-foreground">
              {agentTrafficBinding ? "Ativada · aumenta o consumo de Token" : "Desativada · vinculação manual continua disponível"}
            </Label>
            <Switch
              id="agent-traffic-binding"
              aria-describedby="agent-traffic-binding-description"
              checked={agentTrafficBinding}
              disabled={!loaded || saving}
              onCheckedChange={toggleAgentTrafficBinding}
            />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              Proxy global
            </CardTitle>
            <CardDescription>
              O <b>tráfego de destino</b> de todos os Agents sai pela rede através deste proxy (oculta o IP de origem / usa um salto). Suporta <b>http / https / socks5</b>, com autenticação{" "}
              <code>user:pass</code> opcional. Vazio = conexão direta.
              <br />
              Com a <b>captura de tráfego</b> ativada, ele é o <b>upstream</b> do proxy de registro (o tráfego continua gravado integralmente e então sai por este proxy); com a captura desativada, é injetado diretamente
              na saída de rede do bash / WebFetch do Agent. É independente do proxy de busca na web e do proxy do LLM.
              <br />
              <b>Dica</b>: com a <b>captura desativada</b>, o socks5 depende do suporte de cada ferramenta de linha de comando a <code>ALL_PROXY</code> (curl
              funciona, algumas ferramentas podem ignorar); se você usa principalmente socks5, recomenda-se ativar a captura de tráfego — nesse caminho o MITM
              disca a conexão diretamente, sem que as ferramentas percebam e com efeito estável.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Label htmlFor="global-proxy" className="text-sm font-normal text-muted-foreground">
              Endereço do proxy
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="global-proxy"
                autoComplete="off"
                placeholder="socks5://user:pass@host:1080 ou http://host:port (vazio = conexão direta)"
                value={globalProxyInput}
                disabled={!loaded || savingGlobalProxy}
                onChange={(e) => setGlobalProxyInput(e.target.value)}
              />
              <Button type="button" onClick={saveGlobalProxy} disabled={!loaded || savingGlobalProxy}>
                Salvar
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {globalProxyInput.trim() ? "Configurado · todo o tráfego de destino sai por este proxy" : "Não configurado · o tráfego de destino sai direto"}
            </p>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlertIcon className="size-4" />
              Injeção de restrições de operação
            </CardTitle>
            <CardDescription>
              Quando ativada, concatena as <b>restrições de operação</b> de cada tarefa (as entradas allow/deny mantidas em "Restrições de operação" na visão geral da tarefa) no prompt
              de sistema do Agent correspondente, para delimitar o escopo da exploração (ex.: "testar apenas a porta atual", "proibido força bruta").
              <br />
              É possível controlar separadamente a injeção no <b>planner</b> e no <b>worker</b>
              ; ambos vêm ativados. A troca vale imediatamente (lida no próximo turno), sem reconstruir o Agent. Com o interruptor desativado, o Agent deixa de ver as restrições.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="inject-planner" className="text-sm font-normal text-muted-foreground">
                Injetar no planner{injectPlanner ? " · Ativado" : " · Desativado"}
              </Label>
              <Switch
                id="inject-planner"
                checked={injectPlanner}
                disabled={!loaded}
                onCheckedChange={toggleInjectPlanner}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="inject-worker" className="text-sm font-normal text-muted-foreground">
                Injetar no worker{injectWorker ? " · Ativado" : " · Desativado"}
              </Label>
              <Switch
                id="inject-worker"
                checked={injectWorker}
                disabled={!loaded}
                onCheckedChange={toggleInjectWorker}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConicalIcon className="size-4" />
              Funcionalidades experimentais
            </CardTitle>
            <CardDescription>
              Mecanismos ainda em validação, desativados por padrão. Podem alterar o comportamento do Agent ou afetar a estabilidade; ative somente após entender o impacto.
              <br />
              <b>Compactação de contexto noa</b>: o modelo compacta ativamente o histórico de conversas longas (norma v0.4.0). Quando ativada, os quatro tipos de Agent conectados à plataforma (
              <b>planner / worker / Agent principal / conversa</b>) passam a usar o noa para assumir o contexto, substituindo a compactação integrada,
              e o texto original compactado é arquivado no diretório de trabalho da tarefa para consulta posterior. A troca vale imediatamente (para execuções iniciadas depois), sem reconstruir o Agent;
              ao desativar, a compactação integrada volta na hora.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="noa-compaction" className="text-sm font-normal text-muted-foreground">
              Compactação de contexto noa{noaCompaction ? " · Ativada" : " · Desativada"}
            </Label>
            <Switch
              id="noa-compaction"
              checked={noaCompaction}
              disabled={!loaded}
              onCheckedChange={toggleNoaCompaction}
            />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SearchIcon className="size-4" />
              Busca na web
            </CardTitle>
            <CardDescription>
              Este é o <b>interruptor geral + configuração de origem</b> da busca na web. Só depois de ativá-lo é possível escolher, <b>na configuração de cada Agent</b>, se o
              <b>web_search</b> fica habilitado (retorna apenas título/link/resumo, sem baixar o conteúdo; o download fica a cargo do WebFetch). A busca na web <b>não passa</b>
              pelo proxy de registro e é independente da captura de tráfego.
              <br />
              As origens disponíveis são <b>DuckDuckGo (ddgs)</b> (sem Key), <b>Brave (versão gratuita)</b> (requer a Brave API Key),{" "}
              <b>Tavily</b> (requer a Tavily API Key) ou <b>DeepSeek</b> (reutiliza a configuração atual do LLM). Com o interruptor geral desativado, o
              interruptor de busca na web de cada Agent fica indisponível.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="web-search" className="text-sm font-normal text-muted-foreground">
                {webSearch ? "Interruptor geral ativado · pode ser habilitado individualmente na configuração de cada Agent" : "Desativado · os Agents não conseguem habilitar a busca na web"}
              </Label>
              <Switch
                id="web-search"
                checked={webSearch}
                disabled={!loaded || saving}
                onCheckedChange={(v) => {
                  setWebSearch(v); // optimistic
                  saveWebSearch({ web_search_enabled: v });
                }}
              />
            </div>

            {webSearch && (
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm font-normal text-muted-foreground">Origem da busca</Label>
                <Select
                  value={backend}
                  disabled={!loaded || saving}
                  onValueChange={(v) => {
                    setBackend(v); // optimistic
                    saveWebSearch({ web_search_backend: v });
                  }}
                >
                  <SelectTrigger className="w-48 shrink-0">
                    <SelectValue placeholder="Selecionar origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ddgs">DuckDuckGo（ddgs · grátis, sem Key）</SelectItem>
                    <SelectItem value="brave-free">Brave（versão gratuita · requer Key）</SelectItem>
                    <SelectItem value="tavily">Tavily（requer Key）</SelectItem>
                    <SelectItem value="deepseek">DeepSeek（oficial）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {webSearch && backend === "deepseek" && (
              <div className="border-border/60 bg-muted/30 flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-medium">Busca online oficial do DeepSeek</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Esta origem reutiliza diretamente a <b>configuração de LLM ativa no momento</b>. Por isso ela
                  <b>só suporta modelos oficiais do DeepSeek</b>, e essa configuração<b> precisa usar o protocolo anthropic</b>
                  — o endpoint do DeepSeek no protocolo OpenAI não suporta busca no servidor. Após trocar a configuração de LLM, esta origem pode deixar de funcionar.
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Diferente das outras origens, a busca é <b>executada pelo servidor do DeepSeek</b>: cada busca consome uma chamada extra de modelo (gerando custo de Token),
                  a requisição de busca<b>não passa pelo proxy de saída acima</b> e também<b>não entra no registro de tráfego</b>; o resultado retorna<b>apenas título e link</b>
                  (sem resumo), e o conteúdo é obtido pelo WebFetch quando necessário.
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Confirmar se as condições acima são atendidas é responsabilidade sua; o sistema não bloqueia nada. Use o botão "Testar busca" abaixo para executar uma busca real e validar.
                </p>
              </div>
            )}

            {webSearch && backend === "brave-free" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="brave-key" className="text-sm font-normal text-muted-foreground">
                  Brave Search API Key
                  {braveKeySet && <span className="ml-2 text-xs text-emerald-500">Configurado</span>}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="brave-key"
                    type="password"
                    autoComplete="off"
                    placeholder={braveKeySet ? "Configurado (deixe vazio para manter)" : "Informe a Brave API Key"}
                    value={braveKeyInput}
                    disabled={!loaded || savingKey}
                    onChange={(e) => setBraveKeyInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={saveBraveKey}
                    disabled={!loaded || savingKey || braveKeyInput.trim() === ""}
                  >
                    Salvar
                  </Button>
                </div>
                {braveNeedsKey && (
                  <p className="text-xs text-amber-500">
                    Brave selecionado, mas nenhuma Key configurada —— a ferramenta de busca não será habilitada até você salvar a Key.
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  A versão gratuita tem cota de cerca de 2.000 consultas/mês. Obtenha a Key em https://brave.com/search/api/.
                </p>
              </div>
            )}

            {webSearch && backend === "tavily" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="tavily-key" className="text-sm font-normal text-muted-foreground">
                  Tavily Search API Key
                  {tavilyKeySet && <span className="ml-2 text-xs text-emerald-500">Configurado</span>}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tavily-key"
                    type="password"
                    autoComplete="off"
                    placeholder={tavilyKeySet ? "Configurado (deixe vazio para manter)" : "Informe a Tavily API Key (tvly-…)"}
                    value={tavilyKeyInput}
                    disabled={!loaded || savingTavilyKey}
                    onChange={(e) => setTavilyKeyInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={saveTavilyKey}
                    disabled={!loaded || savingTavilyKey || tavilyKeyInput.trim() === ""}
                  >
                    Salvar
                  </Button>
                </div>
                {webSearch && backend === "tavily" && !tavilyKeySet && (
                  <p className="text-xs text-amber-500">
                    Tavily selecionado, mas nenhuma Key configurada —— a ferramenta de busca não será habilitada até você salvar a Key.
                  </p>
                )}
                <p className="text-muted-foreground text-xs">Acesse https://tavily.com, registre-se e obtenha a API Key.</p>
              </div>
            )}

            {webSearch && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-proxy" className="text-sm font-normal text-muted-foreground">
                  Proxy de saída (opcional)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ws-proxy"
                    autoComplete="off"
                    placeholder="http://host:port ou socks5://host:port (vazio = conexão direta)"
                    value={proxyInput}
                    disabled={!loaded || savingProxy}
                    onChange={(e) => setProxyInput(e.target.value)}
                  />
                  <Button type="button" onClick={saveProxy} disabled={!loaded || savingProxy}>
                    Salvar
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Proxy de saída independente, usado apenas para acessar os endpoints de busca (VPN/SOCKS etc.). Não tem relação com o proxy MITM que registra o tráfego; quando a rede não funciona, o acesso passa por este proxy.
                </p>
              </div>
            )}

            {webSearch && (
              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <p className="text-muted-foreground text-xs">
                  Faz uma busca real por "test" com a configuração atual (origem + proxy + Key) para verificar se funciona.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={runTest}
                  disabled={!loaded || testing}
                  className="shrink-0"
                >
                  {testing ? "Testando…" : "Testar busca"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              Script personalizado · Interpretador Python
            </CardTitle>
            <CardDescription>
              Ferramentas personalizadas do tipo <b>script</b> usam este interpretador para rodar Python. A detecção automática ocorre na inicialização (python3 tem prioridade); aqui você pode informar manualmente o caminho absoluto de um venv /
              de uma versão específica. Se deixar vazio, a detecção é automática em tempo de execução.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                className="font-mono text-sm"
                placeholder="/usr/bin/python3 (vazio = detecção automática)"
                value={pyInterp}
                disabled={!loaded || saving}
                onChange={(e) => setPyInterp(e.target.value)}
              />
              <Button variant="outline" onClick={detectPython} disabled={!loaded || saving}>
                Detectar novamente
              </Button>
              <Button onClick={savePython} disabled={!loaded || saving}>
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CpuIcon className="size-4" />
              Concorrência de trabalho · Nº de Work Agents
            </CardTitle>
            <CardDescription>
              Quantidade de agents de trabalho executados em paralelo em cada tarefa (padrão 3). Quanto maior o valor, mais sondagens simultâneas e maior o consumo. Após a alteração,
              <b>vale para tarefas iniciadas depois</b>; tarefas em execução não são afetadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                className="w-32 font-mono text-sm"
                placeholder="3"
                value={workers}
                disabled={!loaded || savingWorkers}
                onChange={(e) => setWorkers(e.target.value)}
              />
              <Button onClick={saveWorkers} disabled={!loaded || savingWorkers}>
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyboardIcon className="size-4" />
              Tecla de envio da caixa de mensagem
            </CardTitle>
            <CardDescription>
              A caixa de mensagem do Agent principal, na página de conversa e nos detalhes da tarefa, compartilha esta configuração; a escolha vale na hora, sem precisar salvar.
              <br />
              Essa preferência fica <b>somente neste navegador</b> e não é sincronizada com a conta; ao trocar de navegador ou limpar os dados do site, é preciso configurar de novo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="chat-send-mode" className="text-sm font-normal text-muted-foreground">
              Modo de envio
            </Label>
            <Select value={sendMode} onValueChange={(v) => setChatSendMode(v as ChatSendMode)}>
              <SelectTrigger id="chat-send-mode" className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAT_SEND_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
