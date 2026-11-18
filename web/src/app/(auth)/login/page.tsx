"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { AlertTriangle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const termsBodyRef = useRef<HTMLDivElement>(null);

  // 滚动到条款底部（含无需滚动即可完整展示的情况）方可点击「同意」。
  function handleTermsScroll() {
    const el = termsBodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadToEnd(true);
  }

  useEffect(() => {
    if (!termsOpen) return;
    // 打开时重置，并处理内容本就不足一屏、无法触发滚动的场景。
    setReadToEnd(false);
    const el = termsBodyRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) setReadToEnd(true);
  }, [termsOpen]);

  useEffect(() => {
    // 已登录直接进主界面（静态导出下无 middleware 代劳这层跳转）。
    const token = auth.getToken();
    if (token) {
      // localStorage 可能仍有凭据但 cookie 已丢失。先同步，再发起全新请求，
      // 避免服务端守卫或路由缓存把跳转送回仍处于 checking 状态的登录页。
      auth.setToken(token);
      window.location.replace("/function/tasks");
      return;
    }
    api
      .authStatus()
      .then(({ initialized }) => {
        if (!initialized) router.replace("/setup");
      })
      .catch(() => setError("Não foi possível conectar ao serviço de backend"))
      .finally(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Leia e aceite os Termos de Uso primeiro");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token } = await api.login("WARROOM", password);
      auth.setToken(token);
      window.location.replace("/function/tasks");
    } catch {
      setError("Usuário ou senha incorretos");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center text-muted-foreground">
        Verificando o status de login…
      </div>
    );
  }

  return (
    <div className="flex h-dvh">
      {/* Left panel */}
      <div className="hidden flex-col items-center justify-center bg-primary p-12 text-center lg:flex lg:w-1/3">
        <div className="relative flex items-center justify-center">
          <div className="absolute size-80 rounded-full border border-primary-foreground/10" />
          <div className="absolute size-60 rounded-full border border-primary-foreground/15" />
          <div className="absolute size-40 rounded-full border border-primary-foreground/20" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt="WARROOM" width={160} height={160} className="relative" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-medium tracking-tight">Entrar</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">Bem-vindo de volta, insira a senha para continuar usando o WARROOM</p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" value="WARROOM" readOnly className="bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Insira a senha"
                autoFocus
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="agree-terms"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="agree-terms" className="text-sm font-normal leading-relaxed text-muted-foreground">
                Li e aceito os
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="mx-0.5 font-medium text-primary underline-offset-4 hover:underline"
                >
                  Termos de Uso
                </button>
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !password || !agreed}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="flex-row items-center gap-3 border-b px-6 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-base">WARROOM Termos de Uso e Isenção de Responsabilidade</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Versão v1.0 · Data de vigência 2026-09-18 · Leia integralmente todas as cláusulas abaixo antes de entrar
              </p>
            </div>
          </DialogHeader>

          <div
            ref={termsBodyRef}
            onScroll={handleTermsScroll}
            className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-muted-foreground"
          >
            <p className="rounded-lg border bg-muted/40 p-3 text-foreground/80">
              Estes Termos de Uso e Isenção de Responsabilidade (doravante "esta Declaração") constituem o acordo entre você e os
              autores e contribuidores do projeto WARROOM quanto ao uso deste software. Leia atentamente e compreenda integralmente cada cláusula antes de usar, especialmente as cláusulas de isenção de responsabilidade, limitação de responsabilidade e condutas proibidas, destacadas em negrito ou blocos coloridos.
              <span className="font-medium text-foreground">
                {" "}
                Ao baixar, instalar, acessar ou usar este software de qualquer forma, considera-se que você leu, compreendeu e concorda em aceitar integralmente todas as disposições desta Declaração.
              </span>
            </p>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  1
                </span>
                Cláusula 1 · Definições e licença de código aberto
              </h4>
              <p className="pl-7">
                Este software (WARROOM) é um programa de código aberto distribuído sob a licença MIT. Você pode livremente usar, copiar, modificar, combinar, publicar, distribuir, sublicenciar e vender este software, inclusive para fins comerciais; o único requisito é manter o aviso de copyright original e este aviso de licença. Os termos completos da MIT constam no arquivo LICENSE que acompanha o software.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  2
                </span>
                Cláusula 2 · Escopo de uso autorizado
              </h4>
              <p className="pl-7">
                Este software destina-se exclusivamente a estudo pessoal, pesquisa de código, discussão de princípios de segurança técnica e verificação técnica em ambientes locais isolados montados por você mesmo, sendo adequado para usos não agressivos e não destrutivos, como aprendizado, pesquisa acadêmica e revisão de código. Fora das situações expressamente autorizadas nesta cláusula, você não deve usar este software para qualquer outra finalidade.
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="flex items-center gap-2 font-medium text-destructive">
                <span className="flex size-5 items-center justify-center rounded-md bg-destructive/10 text-xs font-semibold text-destructive">
                  3
                </span>
                <AlertTriangle className="size-4" />
                Cláusula 3 · Condutas proibidas
              </h4>
              <ul className="ml-7 list-decimal space-y-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 pl-8 text-foreground/80 marker:text-destructive/70">
                <li>
                  É terminantemente proibido realizar varreduras, sondagens, exploração ou ataques contra qualquer site, serviço online ou sistema conectado de propriedade de terceiros (independentemente de haver autorização ou de ser um ativo próprio);
                </li>
                <li>É terminantemente proibido usar este software para qualquer teste de intrusão real, confronto ofensivo-defensivo, exercício red team/blue team ou ambiente de produção;</li>
                <li>É terminantemente proibido usar este software para invasão ilegal, roubo de dados, extorsão, negação de serviço (DoS/DDoS) ou qualquer atividade destrutiva ou criminosa;</li>
                <li>É terminantemente proibido remover, alterar ou contornar quaisquer avisos de copyright, licença ou segurança deste software e de suas saídas;</li>
                <li>É terminantemente proibido praticar qualquer ato que viole as leis, regulamentos e normas regulatórias do seu país ou região.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  4
                </span>
                Cláusula 4 · Propriedade intelectual
              </h4>
              <p className="pl-7">
                Os direitos autorais e os direitos de propriedade intelectual relacionados a este software pertencem aos autores e contribuidores do projeto, que concedem a você os direitos correspondentes na forma prevista no
                acordo MIT. Salvo os direitos expressamente concedidos por esse acordo, esta Declaração não lhe concede qualquer outro direito, de forma expressa ou implícita.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  5
                </span>
                Cláusula 5 · Dados e privacidade
              </h4>
              <p className="pl-7">
                Este software é um programa de código aberto que pode ser implantado por conta própria; o autor não opera nenhum serviço centralizado nem coleta ou envia seus dados de uso. Todos os dados gerados, processados ou acessados por você durante o uso ficam sob seu controle, e você é responsável por sua legalidade e segurança; quaisquer consequências decorrentes de tratamento inadequado de dados são de sua responsabilidade.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  6
                </span>
                Cláusula 6 · Conformidade e responsabilidade legal
              </h4>
              <p className="pl-7">
                Você deve cumprir, por sua conta, todas as leis e regulamentos do seu país ou região relativos à segurança cibernética, segurança de dados e proteção de dados pessoais e crimes informáticos (na China continental, incluindo, entre outras, a Lei de Segurança Cibernética, a Lei de Segurança de Dados, a Lei de Proteção de Dados Pessoais e as interpretações judiciais pertinentes).
                <span className="font-medium text-foreground">
                  {" "}
                  Toda e qualquer responsabilidade legal e consequência decorrente da violação das leis e regulamentos acima ou das disposições desta Declaração é assumida exclusivamente por você, não tendo relação com os autores e contribuidores deste software.
                </span>
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  7
                </span>
                Cláusula 7 · Isenção de responsabilidade e limitação de responsabilidade
              </h4>
              <p className="pl-7">
                Este software é fornecido "no estado em que se encontra (AS IS)" e "conforme disponível (AS
                AVAILABLE)", sem qualquer garantia expressa ou implícita, incluindo, entre outras, garantias de comercialização, adequação a uma finalidade específica, exatidão e não violação. Na máxima extensão permitida pela lei aplicável, os autores e contribuidores deste software não se responsabilizam por quaisquer perdas diretas, indiretas, incidentais, especiais ou consequenciais decorrentes do uso ou da impossibilidade de uso deste software (independentemente de o uso ter sido adequado ou não), incluindo, entre outras, perda de dados, danos ao sistema, interrupção de negócios, perda de lucros ou disputas legais.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  8
                </span>
                Cláusula 8 · Alterações dos termos e interpretação final
              </h4>
              <p className="pl-7">
                O autor tem o direito de atualizar esta Declaração periodicamente conforme as leis e regulamentos ou as necessidades de desenvolvimento do projeto; a versão atualizada será publicada junto com o projeto e entrará em vigor na data de sua publicação; o uso continuado deste software implica aceitação dos termos revisados. Na medida permitida por lei, o direito de interpretação final desta Declaração pertence ao autor do projeto. Se qualquer cláusula desta Declaração for considerada inválida, isso não afetará a validade das demais cláusulas.
              </p>
            </section>
          </div>

          <DialogFooter className="mx-0 mb-0 flex-col items-stretch gap-2 rounded-b-xl px-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {readToEnd ? "Você visualizou todas as cláusulas" : "Role as cláusulas até o final para confirmar"}
            </p>
            <DialogClose asChild>
              <Button
                type="button"
                disabled={!readToEnd}
                onClick={() => {
                  setAgreed(true);
                  setError("");
                }}
              >
                Li e aceito todas as cláusulas
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
