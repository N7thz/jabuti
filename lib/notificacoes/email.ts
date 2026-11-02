import { createHmac, timingSafeEqual } from "node:crypto";

import type { FrequenciaEmail } from "../generated/prisma/enums";
import type { PrismaClient } from "../prisma";
import { urlDoSite } from "../site";

// Resumo por email das notificações (opt-in em /configuracoes). Sem `server-only`: roda no script
// scripts/notificar.ts, fora do Next. O link de descadastro funciona sem login, assinado com BETTER_AUTH_SECRET.

/**
 * O resumo por email só funciona com um domínio verificado no Resend (sem ele, o Resend só entrega para o dono
 * da conta). Até lá fica desligado: a escolha some das telas e o script não envia. Ligue com NOTIFICACOES_POR_EMAIL=1.
 */
export const emailLigado = () => process.env.NOTIFICACOES_POR_EMAIL === "1";

const HORA = 60 * 60 * 1000;
/** Intervalo mínimo entre resumos. Um pouco abaixo de 1 e 7 dias para o horário do agendamento variar sem pular um envio. */
const INTERVALO: Record<Exclude<FrequenciaEmail, "NUNCA">, number> = { DIARIO: 20 * HORA, SEMANAL: 6.5 * 24 * HORA };
/** Itens listados no email; o resto fica em /notificacoes. */
export const MAXIMO_NO_EMAIL = 30;

function segredo() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET não configurada; não dá para assinar o link de descadastro.");
  return s;
}

/** Assinatura do email para o link "parar de receber". Não expira: o link vale enquanto o segredo for o mesmo. */
export const assinarDescadastro = (usuario: string) =>
  createHmac("sha256", segredo()).update(`descadastro:${usuario}`).digest("base64url");

export function conferirDescadastro(usuario: string, assinatura: string) {
  const esperada = Buffer.from(assinarDescadastro(usuario));
  const recebida = Buffer.from(assinatura);
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
}

const consulta = (usuario: string) => `u=${encodeURIComponent(usuario)}&t=${assinarDescadastro(usuario)}`;

/** Página com o botão de confirmar: um GET não descadastra, porque antivírus de email abrem os links sozinhos. */
export const linkDescadastro = (usuario: string) => urlDoSite(`/notificacoes/parar-email?${consulta(usuario)}`);

/** Descadastro em um clique dos clientes de email (POST, RFC 8058); o formulário da página também posta aqui. */
export const linkDescadastroDireto = (usuario: string) => urlDoSite(`/api/notificacoes/parar-email?${consulta(usuario)}`);

/** Já está na hora de mandar o próximo resumo? */
export function resumoDevido(frequencia: FrequenciaEmail, ultimoEnvio: Date | null, agora: Date) {
  if (frequencia === "NUNCA") return false;
  return !ultimoEnvio || agora.getTime() - ultimoEnvio.getTime() >= INTERVALO[frequencia];
}

interface ItemResumo {
  titulo: string;
  texto: string;
  url: string | null;
}

/** Assunto e corpo (texto puro, como os outros emails do portal) do resumo. */
export function montarResumo(itens: ItemResumo[], total: number, frequencia: Exclude<FrequenciaEmail, "NUNCA">, descadastro: string) {
  const periodo = frequencia === "DIARIO" ? "do dia" : "da semana";
  const assunto = `Jabuti: ${total} ${total === 1 ? "novidade" : "novidades"} ${periodo} sobre quem você segue`;
  const linhas = itens.map((n) => {
    const link = n.url ? `\n  ${n.url.startsWith("/") ? urlDoSite(n.url) : n.url}` : "";
    return `• ${n.titulo}\n  ${n.texto}${link}`;
  });
  const resto = total > itens.length ? `\n\nE mais ${total - itens.length}. Veja todas em ${urlDoSite("/notificacoes")}` : "";
  const texto = [
    `Novidades ${periodo} sobre os parlamentares e projetos que você segue no Jabuti:`,
    "",
    linhas.join("\n\n") + resto,
    "",
    "—",
    `Ver no portal: ${urlDoSite("/notificacoes")}`,
    `Mudar a frequência: ${urlDoSite("/configuracoes#notificacoes")}`,
    `Parar de receber estes emails: ${descadastro}`,
  ].join("\n");
  return { assunto, texto };
}

async function enviar(para: string, assunto: string, texto: string, umClique: string) {
  const chave = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_REMETENTE || process.env.FEEDBACK_REMETENTE || "Jabuti <onboarding@resend.dev>";
  if (!chave) throw new Error("RESEND_API_KEY não configurada; resumo não enviado.");

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: de,
      to: [para],
      subject: assunto,
      text: texto,
      // Botão "cancelar inscrição" do Gmail e de outros clientes (RFC 8058).
      headers: { "List-Unsubscribe": `<${umClique}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resposta.ok) throw new Error(`Resend recusou o email (${resposta.status}): ${await resposta.text()}`);
}

/** Manda os resumos que estão na hora. Devolve quantos emails saíram; falha de um não impede os outros. */
export async function enviarResumos(prisma: PrismaClient, { agora = new Date(), log }: { agora?: Date; log?: (m: string) => void } = {}) {
  const preferencias = await prisma.preferenciaNotificacao.findMany({ where: { email: { not: "NUNCA" } } });
  let enviados = 0;

  for (const pref of preferencias) {
    if (pref.email === "NUNCA" || !resumoDevido(pref.email, pref.ultimoEnvio, agora)) continue;
    const filtro = { usuario: pref.usuario, enviadaEm: null, lidaEm: null };
    const [itens, total] = await Promise.all([
      prisma.notificacao.findMany({ where: filtro, orderBy: { ocorridoEm: "desc" }, take: MAXIMO_NO_EMAIL }),
      prisma.notificacao.count({ where: filtro }),
    ]);
    if (total === 0) continue;

    const descadastro = linkDescadastro(pref.usuario);
    const { assunto, texto } = montarResumo(itens, total, pref.email, descadastro);
    try {
      await enviar(pref.usuario, assunto, texto, linkDescadastroDireto(pref.usuario));
    } catch (erro) {
      log?.(`resumo não enviado: ${String(erro)}`);
      continue;
    }
    await prisma.$transaction([
      prisma.notificacao.updateMany({ where: { ...filtro, criadaEm: { lte: agora } }, data: { enviadaEm: agora } }),
      prisma.preferenciaNotificacao.update({ where: { usuario: pref.usuario }, data: { ultimoEnvio: agora } }),
    ]);
    enviados++;
  }
  log?.(`${enviados} resumos enviados por email`);
  return enviados;
}
