"use client";

// LLM 重试配置的共用件：五层重试各自的「次数 + 间隔」。
//
// 五层从内到外：建连(SDK) → 空响应(SDK) → 同 provider 安全窗口 → 轮询熔断 → 意图重跑。
// 前三层跟着端点走，所以每个模型配置都能覆盖全局默认；后两层是进程级的，只有全局一份。
//
// 所有输入都遵循同一套「留空 = 不配置」语义，与后端 db.RetryRule 一致：
//   次数   空/0 = 用内置默认 | -1 = 关闭这层重试 | >0 = 用这个次数
//   间隔   空/0 = 用这层原本的指数退避 | >0 = 改用这个固定毫秒间隔

import * as React from "react";

import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { LLMRetryOverride, LLMRetryPolicy, LLMRetryRule } from "@/lib/types";

export const ZERO_RULE: LLMRetryRule = { attempts: 0, interval_ms: 0 };
export const ZERO_OVERRIDE: LLMRetryOverride = {
  connect: ZERO_RULE,
  empty: ZERO_RULE,
  stream: ZERO_RULE,
};
const ZERO_POLICY: LLMRetryPolicy = {
  ...ZERO_OVERRIDE,
  breaker: ZERO_RULE,
  intent: ZERO_RULE,
};

type LayerMeta = {
  title: string;
  /** 这层重试发生在哪、由谁执行 */
  where: string;
  /** 什么样的错误会走到这层——具体到状态码，别让人猜 */
  trigger: string;
  /** 长得像但【不】走这层的错误，省得填了没反应还以为是 bug */
  skips?: string;
  desc: string;
  attemptsLabel: string;
  /** 次数留空时的默认值，用于占位符 */
  defAttempts: number;
  /** 间隔留空时的默认策略，用于占位符 */
  defInterval: string;
  /** 次数填 -1 的含义 */
  offHint: string;
};

export const RETRY_LAYERS = {
  connect: {
    title: "Retentativa de conexão",
    where: "SDK · antes de receber 200",
    trigger:
      "Não conecta ou ainda não recebeu 200: reset de conexão / timeout de leitura e escrita / falha de DNS e outros erros de camada de rede, além de HTTP 408, 429, 500, 502, 503, 504.",
    skips: "Os demais status codes (400 / 401 / 403 / 404 / 413 / 422 etc.) são recusas determinísticas: reenviar falha do mesmo jeito, então o erro é propagado direto.",
    desc: "Reenvia a mesma requisição sem alterações. Depois que o stream começa (200 já recebido), uma queda no meio do caminho não é responsabilidade desta camada.",
    attemptsLabel: "Número de retentativas",
    defAttempts: 3,
    defInterval: "0.5s→1s→2s exponencial (máx. 8s)",
    offHint: "-1 = não retenta nem uma vez; propaga a falha imediatamente",
  },
  empty: {
    title: "Retentativa de resposta vazia",
    where: "SDK · apenas formato openai",
    trigger:
      "HTTP 200 e finish_reason em stop normal, mas a resposta inteira sem nenhum bloco de conteúdo — quadro vazio do gateway, frame perdido do campo de raciocínio, soluço da amostragem: tudo isso se parece com isto.",
    skips: "Não conta quando não há conteúdo por truncamento em max_tokens (isso se resolve aumentando o limite de saída; reenviar só bate na mesma parede).",
    desc: "Reenvia o prompt inteiro, então sai caro em contextos longos: não convém usar um número alto.",
    attemptsLabel: "Número de retentativas",
    defAttempts: 2,
    defInterval: "0.5s→1s→2s exponencial (máx. 8s)",
    offHint: "-1 = entrega a resposta vazia exatamente como veio",
  },
  stream: {
    title: "Retentativa na janela segura do mesmo provider",
    where: "Este projeto · antes de entregar saída",
    trigger:
      "O problema só aparece depois que o stream está estabelecido (200 recebido): conexão cai no meio, provedor overloaded, eventos de erro 429 / 5xx dentro do stream — e nenhum token foi entregue ao chamador.",
    skips:
      "Cota esgotada (402 / insufficient_quota, entregue ao polling para trocar de configuração), contexto longo demais (413 / context length, entregue à compactação) e recusas determinísticas 400 / 401 / 403 / 404 / 422 não são retentados.",
    desc: "Reexecuta a mesma requisição na mesma configuração. Como nenhuma saída foi entregue, a reexecução não duplica saída do modelo nem execução de ferramentas.",
    attemptsLabel: "Número de retentativas",
    defAttempts: 2,
    defInterval: "0.5s→1s exponencial (máx. 4s)",
    offHint: "-1 = stream interrompido vai direto para a reexecução de intenção da camada externa",
  },
  breaker: {
    title: "Disjuntor do polling",
    where: "Este projeto · nível de processo, uma única cópia global",
    trigger:
      "Abre o circuito quando falhas transitórias (429, 5xx, erros de rede) acumulam seguidas até o limite; falhas determinísticas como saldo insuficiente (402), chave inválida (401 / 403) e modelo inexistente (404) ignoram o limite e abrem o circuito na primeira vez.",
    skips: "Um sucesso zera a contagem, então uma configuração que falha de vez em quando não vai acumulando até abrir o circuito.",
    desc: "Depois de abrir, entra em resfriamento; durante o resfriamento o polling pula essa configuração. O estado vai para o banco e sobrevive a reinícios.",
    attemptsLabel: "Falhas consecutivas até abrir o circuito",
    defAttempts: 3,
    defInterval: "gradiente de 1min→5min→30min",
    offHint: "-1 = falhas transitórias nunca abrem o circuito (as determinísticas continuam abrindo)",
  },
  intent: {
    title: "Reexecução de intenção",
    where: "Este projeto · nível de processo, uma única cópia global",
    trigger:
      "Nenhuma das camadas anteriores segurou: o worker termina em model_error — as retentativas internas se esgotaram, ou o stream caiu só depois de começar a entregar saída (aí reexecutar não é seguro e só resta refazer tudo).",
    skips: "Cota esgotada já é tratada pelo polling trocando de configuração e não é reexecutada aqui; quando a tarefa é pausada / encerrada / entra em finalização, cede o lugar na hora e não consome tempo de backoff.",
    desc: "Roda a intenção inteira do zero. É a camada mais externa: uma reexecução significa multiplicar de novo as contagens das camadas internas.",
    attemptsLabel: "Número de reexecuções",
    defAttempts: 2,
    defInterval: "fixo 3s",
    offHint: "-1 = não reexecuta; a intenção é marcada direto como blocked",
  },
} satisfies Record<string, LayerMeta>;

type LayerKey = keyof typeof RETRY_LAYERS;

/** 毫秒的人话，只用于在输入框旁边回显，免得数零。 */
function humanMs(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Number((ms / 1000).toFixed(2))}s`;
  return `${Number((ms / 60_000).toFixed(2))}min`;
}

/** 受控数字输入：空串 ↔ 0，中间态（"-"、"1e"）原样留在本地，不打扰父级。 */
function NumField({
  id,
  value,
  onChange,
  placeholder,
  min,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  placeholder: string;
  min: number;
}) {
  const [text, setText] = React.useState(value === 0 ? "" : String(value));
  // 父级换了一整套值（读取到策略、切换配置）时跟上；自己敲字时不会走到这里，
  // 因为那时 value 已经等于本地文本 parse 后的结果。
  React.useEffect(() => {
    const incoming = value === 0 ? "" : String(value);
    setText((cur) => (Number(cur || 0) === value ? cur : incoming));
  }, [value]);
  return (
    <Input
      id={id}
      type="number"
      min={min}
      className="w-28 shrink-0"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        onChange(e.target.value.trim() === "" || !Number.isFinite(n) ? 0 : Math.trunc(n));
      }}
    />
  );
}

/** 一层重试的两个旋钮。idPrefix 用来在同一页出现多次时保住 label 的 htmlFor。 */
export function RetryRuleFields({
  layer,
  idPrefix,
  value,
  onChange,
  compact,
}: {
  layer: LayerKey;
  idPrefix: string;
  value: LLMRetryRule;
  onChange: (r: LLMRetryRule) => void;
  /** true = 配置抽屉里的紧凑版：省掉展开说明，只留「什么错误会走到这层」这一句 */
  compact?: boolean;
}) {
  const meta = RETRY_LAYERS[layer];
  const human = humanMs(value.interval_ms);
  return (
    <div className={compact ? "grid gap-2" : "grid gap-3 rounded-lg border p-3"}>
      <div className="grid gap-0.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <Label className="text-sm">{meta.title}</Label>
          <span className="text-muted-foreground text-xs">{meta.where}</span>
        </div>
        {/* 哪些错误会走到这层，具体到状态码——填了旋钮却看不到效果，多半是错误压根不落在这层。 */}
        <p className="text-muted-foreground text-xs">
          <span className="font-medium text-foreground">Gatilho</span>: {meta.trigger}
        </p>
        {!compact && meta.skips && (
          <p className="text-muted-foreground text-xs">
            <span className="font-medium text-foreground">Não passa por esta camada</span>: {meta.skips}
          </p>
        )}
        {!compact && <p className="text-muted-foreground text-xs">{meta.desc}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-${layer}-n`} className="text-muted-foreground text-xs">
            {meta.attemptsLabel}
          </Label>
          <NumField
            id={`${idPrefix}-${layer}-n`}
            min={-1}
            value={value.attempts}
            placeholder={`padrão ${meta.defAttempts}`}
            onChange={(n) => onChange({ ...value, attempts: n })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-${layer}-ms`} className="text-muted-foreground text-xs">
            Intervalo ms
          </Label>
          <NumField
            id={`${idPrefix}-${layer}-ms`}
            min={0}
            value={value.interval_ms}
            placeholder="backoff padrão"
            onChange={(n) => onChange({ ...value, interval_ms: n })}
          />
          <span className="text-muted-foreground text-xs">{human ? `fixo ${human}` : meta.defInterval}</span>
        </div>
      </div>
      {!compact && <p className="text-muted-foreground text-xs">Vazio = usa o padrão; {meta.offHint}.</p>}
    </div>
  );
}

/** 模型配置抽屉里的三层覆盖（跟着端点走的那三层）。 */
export function ProfileRetryFields({
  value,
  onChange,
}: {
  value: LLMRetryOverride;
  onChange: (o: LLMRetryOverride) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-0.5">
        <Label className="text-sm">Substituição de retentativas</Label>
        <p className="text-muted-foreground text-xs">
          Vale só para esta configuração e sobrescreve os padrões globais de «Retentativas e backoff». Cada campo vazio = seguir o global; número -1 = desligar esta camada de retentativa;
          intervalo preenchido = usa intervalo fixo no lugar do backoff exponencial. O disjuntor e a reexecução de intenção são de nível de processo e só se ajustam na página global.
        </p>
      </div>
      {(["connect", "empty", "stream"] as const).map((k) => (
        <div key={k} className="border-t pt-3 first:border-t-0 first:pt-0">
          <RetryRuleFields
            compact
            layer={k}
            idPrefix="pf"
            value={value[k]}
            onChange={(r) => onChange({ ...value, [k]: r })}
          />
        </div>
      ))}
    </div>
  );
}

/** 「重试与退避」tab：五层的全局默认值。 */
export function RetryPolicyPanel() {
  const [policy, setPolicy] = React.useState<LLMRetryPolicy>(ZERO_POLICY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const p = await api.llmRetryPolicy();
      setPolicy({ ...ZERO_POLICY, ...p });
    } catch (e) {
      toast.error(`Falha ao ler a política de retentativas: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      // 后端会把越界值夹回区间并回传，直接用回传值刷新，所见即所存。
      const saved = await api.saveLLMRetryPolicy(policy);
      setPolicy({ ...ZERO_POLICY, ...saved });
      toast.success("Salvo e já em vigor (a rodada de chamadas em andamento ainda usa os parâmetros antigos)");
    } catch (e) {
      toast.error(`Falha ao salvar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: LayerKey) => (r: LLMRetryRule) => setPolicy((p) => ({ ...p, [k]: r }));

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-10 text-muted-foreground text-sm">
        <Loader2Icon className="size-4 animate-spin" /> Lendo a política de retentativas…
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-muted/30 p-3 text-muted-foreground text-xs leading-relaxed">
        Uma falha de chamada ao modelo passa por cinco camadas de retentativa, de dentro para fora:
        <span className="text-foreground"> conexão → resposta vazia → janela segura do mesmo provider → disjuntor do polling → reexecução de intenção</span>
        . A camada interna se esgota antes de a externa entrar, então as contagens se
        <span className="text-foreground">multiplicam</span>
        — encher todas as camadas pode queimar dezenas de requisições em um único soluço.
        Tudo vazio equivale aos valores padrão atuais, idêntico ao comportamento sem esta página. As três primeiras camadas podem ser sobrescritas individualmente em cada configuração de modelo.
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(RETRY_LAYERS) as LayerKey[]).map((k) => (
          <RetryRuleFields key={k} layer={k} idPrefix="gl" value={policy[k]} onChange={set(k)} />
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          Salvar
        </Button>
        <Button variant="outline" onClick={() => setPolicy(ZERO_POLICY)} disabled={saving}>
          Restaurar todos os padrões
        </Button>
      </div>
    </div>
  );
}
