// Pix "copia e cola" estático (BR Code): o texto que o app do banco lê no QR Code ou cola no campo.
// Segue o Manual de Padrões para Iniciação do Pix (Banco Central), no formato EMV: cada campo é
// ID (2 dígitos) + tamanho (2 dígitos) + valor, e o último campo é o CRC16 de tudo o que vem antes.
// Estático = sem cobrança gerada no banco: a mesma chave serve para qualquer pessoa e qualquer valor.

export type TipoChave = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

export interface DadosPix {
  chave: string;
  /** Nome de quem recebe, como aparece no app do banco. Cortado em 25 caracteres, sem acento. */
  nome: string;
  /** Cidade de quem recebe. Cortada em 15 caracteres, sem acento. */
  cidade: string;
  /** Valor em centavos. Sem valor, o app pede para a pessoa digitar. */
  centavos?: number;
  /** Mensagem curta que aparece para quem paga. */
  mensagem?: string;
}

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

/** Sem acento e só com caracteres que todo app de banco aceita no nome e na cidade. */
export function limparTexto(texto: string, max: number) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .,\-/]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

/** Reconhece o tipo da chave pelo formato. CPF e CNPJ podem vir com pontuação. */
export function tipoDaChave(chave: string): TipoChave {
  const c = chave.trim();
  if (c.includes("@")) return "email";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return "aleatoria";
  if (c.startsWith("+")) return "telefone";
  const digitos = c.replace(/\D/g, "");
  if (digitos.length === 14) return "cnpj";
  if (digitos.length === 11 && /^[\d.\-\s]+$/.test(c)) return "cpf";
  return "telefone";
}

/** A chave no formato que o Pix espera: CPF/CNPJ só dígitos, email minúsculo, telefone com +55. */
export function normalizarChave(chave: string): string {
  const c = chave.trim();
  switch (tipoDaChave(c)) {
    case "email":
      return c.toLowerCase();
    case "aleatoria":
      return c.toLowerCase();
    case "cpf":
    case "cnpj":
      return c.replace(/\D/g, "");
    case "telefone": {
      const digitos = c.replace(/\D/g, "");
      return `+${digitos.startsWith("55") ? digitos : `55${digitos}`}`;
    }
  }
}

export const ROTULO_CHAVE: Record<TipoChave, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "Email",
  telefone: "Telefone",
  aleatoria: "Chave aleatória",
};

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), em 4 dígitos hexadecimais maiúsculos. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Monta o Pix copia e cola. Lança erro se a chave, o nome ou a cidade ficarem vazios. */
export function gerarPix({ chave, nome, cidade, centavos, mensagem }: DadosPix): string {
  const chaveOk = normalizarChave(chave);
  const nomeOk = limparTexto(nome, 25);
  const cidadeOk = limparTexto(cidade, 15);
  if (!chaveOk || !nomeOk || !cidadeOk) throw new Error("Pix precisa de chave, nome e cidade.");

  // O campo 26 inteiro (GUI + chave + mensagem) não pode passar de 99 caracteres: a mensagem cede.
  const base = campo("00", "br.gov.bcb.pix") + campo("01", chaveOk);
  const espaco = 99 - base.length - 4;
  const msg = mensagem ? limparTexto(mensagem, Math.max(0, espaco)) : "";
  const contaRecebedor = base + (msg ? campo("02", msg) : "");

  const valor = centavos && centavos > 0 ? campo("54", (centavos / 100).toFixed(2)) : "";

  const semCrc =
    campo("00", "01") +
    campo("26", contaRecebedor) +
    campo("52", "0000") +
    campo("53", "986") +
    valor +
    campo("58", "BR") +
    campo("59", nomeOk) +
    campo("60", cidadeOk) +
    campo("62", campo("05", "***")) +
    "6304";
  return semCrc + crc16(semCrc);
}

/** Lê um BR Code de volta em campos (ID → valor). Serve para testar e para conferir o que foi gerado. */
export function lerCampos(texto: string): Map<string, string> {
  const campos = new Map<string, string>();
  let i = 0;
  while (i < texto.length) {
    const id = texto.slice(i, i + 2);
    const tamanho = Number(texto.slice(i + 2, i + 4));
    campos.set(id, texto.slice(i + 4, i + 4 + tamanho));
    i += 4 + tamanho;
  }
  return campos;
}
