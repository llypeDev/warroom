// 渠道字段表与配置值的解析工具。
//
// 与页面拆开是因为这一份是**数据**而不是视图：它描述每种渠道有哪些字段、
// 各自该用什么控件，以及表单文本到配置值（JSON）的双向转换。
// 单独放一个文件后，新增渠道只需要动这里，页面本身不必改。
// 渠道类型的展示名与简介。放在前端是因为它只影响文案，后端不需要知道。
export const KIND_LABEL: Record<string, string> = {
  dingtalk: "DingTalk",
  feishu: "Feishu",
  wecom: "WeCom",
  webhook: "Webhook genérico",
  telegram: "Telegram",
  email: "E-mail",
};

// 各渠道的配置字段定义。
//
// 这里刻意保留一份前端字段表，而不是让后端下发 schema：后端只负责
// Validate（必填/格式），UI 需要的是布局与控件类型，两者关注的不是同一件事。
// 唯一的耦合点是 secret_keys —— 哪些字段该渲染成密码框由后端给出，
// 因为只有渠道实现自己清楚哪些值算凭据（企业微信的整个 Webhook 就是凭据，
// 而钉钉的只是其中一个 secret）。新增渠道时这里少一个条目只会让表单变空白，
// 不会静默出错（下面的 hasFields 会提示）。
export type FieldKind = "text" | "password" | "number" | "select" | "textarea" | "switch" | "kv" | "list";
export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
}
export const CHANNEL_FIELDS: Record<string, FieldDef[]> = {
  dingtalk: [
    {
      key: "webhook",
      label: "Endereço do Webhook",
      kind: "text",
      placeholder: "https://oapi.dingtalk.com/robot/send?access_token=...",
    },
    {
      key: "secret",
      label: "Chave de assinatura",
      kind: "password",
      help: "Preencha quando a segurança do robô usar «assinatura»; deixe vazio com «palavra-chave personalizada» ou sem segurança",
    },
  ],
  feishu: [
    {
      key: "webhook",
      label: "Endereço do Webhook",
      kind: "text",
      placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/...",
    },
    { key: "secret", label: "Chave de verificação de assinatura", kind: "password", help: "Preencha quando o robô tiver a «verificação de assinatura» ativada; caso contrário, deixe vazio" },
  ],
  wecom: [
    {
      key: "webhook",
      label: "Endereço do Webhook",
      kind: "text",
      placeholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...",
    },
  ],
  webhook: [
    { key: "url", label: "URL de destino", kind: "text", placeholder: "https://your-endpoint.example.com/hook" },
    {
      key: "method",
      label: "Método da requisição",
      kind: "select",
      options: [
        { value: "POST", label: "POST (com corpo da requisição)" },
        { value: "PUT", label: "PUT (com corpo da requisição)" },
        { value: "PATCH", label: "PATCH (com corpo da requisição)" },
        { value: "GET", label: "GET (sem corpo da requisição)" },
      ],
    },
    { key: "headers", label: "Cabeçalhos personalizados", kind: "kv", help: "Um KEY=VALUE por linha, por exemplo Authorization=Bearer xxx" },
    {
      key: "body_template",
      label: "Modelo do corpo da requisição",
      kind: "textarea",
      help:
        "Deixe vazio para usar o modelo padrão interno. Variáveis: {{.Title}} {{.Batch}} {{.Count}} {{.HomeURL}} {{.SentAt}}, " +
        "e, dentro de range .Items, .Name/.VulnClass/.Severity/.Summary/.Assets/.DetailURL/.StatusLabel. " +
        "Para inserir strings use {{json .Xxx}} em vez de {{.Xxx}}, caso contrário as aspas do título quebram o JSON.",
    },
  ],
  telegram: [
    { key: "bot_token", label: "Bot Token", kind: "password", placeholder: "123456:ABC-DEF..." },
    { key: "chat_id", label: "Chat ID", kind: "text", placeholder: "-1001234567890" },
    {
      key: "base_url",
      label: "Endereço da API",
      kind: "text",
      placeholder: "https://api.telegram.org",
      help: "Deixe vazio para usar o endereço oficial; preencha ao usar um proxy reverso próprio do Bot API",
    },
  ],
  email: [
    { key: "host", label: "Servidor SMTP", kind: "text", placeholder: "smtp.example.com" },
    {
      key: "port",
      label: "Porta",
      kind: "number",
      placeholder: "587",
      help: "587 usa STARTTLS; em 465 ative o «TLS implícito»",
    },
    { key: "username", label: "Conta", kind: "text" },
    { key: "password", label: "Senha / Código de autorização", kind: "password" },
    { key: "from", label: "Remetente", kind: "text", placeholder: "warroom@example.com" },
    { key: "to", label: "Destinatário", kind: "list", help: "Separe vários endereços por vírgula" },
    { key: "tls", label: "TLS implícito", kind: "switch", help: "Ative na porta 465; mantenha desligado em 587 (STARTTLS é automático)" },
  ],
};

export const SEVERITY_OPTIONS = [
  { value: "", label: "Qualquer" },
  { value: "low", label: "Baixo ou superior" },
  { value: "medium", label: "Médio ou superior" },
  { value: "high", label: "Alto ou superior" },
  { value: "critical", label: "Apenas crítico" },
];

export type ChannelForm = {
  name: string;
  kind: string;
  mode: "realtime" | "digest";
  enabled: boolean;
  ratePerMin: string;
  config: Record<string, unknown>;
  minSeverity: string;
  includeText: string;
  excludeText: string;
  taskIDsText: string;
  assetIDsText: string;
  onStatusChange: boolean;
};

export const emptyForm = (kind: string): ChannelForm => ({
  name: "",
  kind,
  mode: "realtime",
  enabled: true,
  ratePerMin: "",
  config: {},
  minSeverity: "",
  includeText: "",
  excludeText: "",
  taskIDsText: "",
  assetIDsText: "",
  onStatusChange: false,
});

// parseKV 解析「每行 KEY=VALUE」的文本域。
export function parseKV(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const i = t.indexOf("=");
    if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}
// parseIDs 解析逗号/空白分隔的 id 列表。
export function parseIDs(text: string): number[] {
  return text
    .split(/[\s,，]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}
// parseKeywords 解析行/逗号分隔的关键词列表（漏洞类型名可能含空格，所以按行或逗号切）。
export function parseKeywords(text: string): string[] {
  return text
    .split(/[\n,，]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
