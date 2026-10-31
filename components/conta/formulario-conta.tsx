"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheckIcon } from "lucide-react";
import { startTransition, useActionState } from "react";
import { type FieldValues, type Resolver, useForm } from "react-hook-form";

import { acaoConta, type EstadoConta } from "@/app/entrar/actions";
import { CampoTexto } from "@/components/form/campo-texto";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SCHEMAS_CONTA, type FormularioConta as Tipo } from "@/lib/conta/schemas";

type Campo = {
  nome: string;
  rotulo: string;
  ajuda?: string;
  type?: "email" | "password" | "text";
  autoComplete: string;
};

const EMAIL: Campo = { nome: "email", rotulo: "Email", type: "email", autoComplete: "email" };
const SENHA_NOVA: Campo = {
  nome: "senha",
  rotulo: "Senha",
  ajuda: "Pelo menos 8 caracteres. Uma frase curta é mais fácil de lembrar e difícil de adivinhar.",
  type: "password",
  autoComplete: "new-password",
};
const CONFIRMAR: Campo = { nome: "confirmar", rotulo: "Repita a senha", type: "password", autoComplete: "new-password" };

const FORMULARIOS: Record<Tipo, { campos: Campo[]; enviar: string; enviando: string; rotulo: string }> = {
  entrar: {
    campos: [EMAIL, { nome: "senha", rotulo: "Senha", type: "password", autoComplete: "current-password" }],
    enviar: "Entrar",
    enviando: "Entrando…",
    rotulo: "Entrar com email e senha",
  },
  cadastrar: {
    campos: [{ nome: "nome", rotulo: "Seu nome", autoComplete: "name" }, EMAIL, SENHA_NOVA, CONFIRMAR],
    enviar: "Criar conta",
    enviando: "Criando…",
    rotulo: "Criar conta",
  },
  recuperar: { campos: [EMAIL], enviar: "Enviar link", enviando: "Enviando…", rotulo: "Recuperar senha" },
  redefinir: {
    campos: [{ ...SENHA_NOVA, rotulo: "Senha nova" }, CONFIRMAR],
    enviar: "Salvar senha nova",
    enviando: "Salvando…",
    rotulo: "Criar senha nova",
  },
};

/**
 * Formulário de login, cadastro e senha. Com JavaScript valida antes no navegador; sem ele, posta direto
 * na Server Action e a página volta com os erros. `de` é para onde voltar depois de entrar;
 * `token` vem do link de redefinição de senha.
 */
export function FormularioConta({ tipo, de = "/", token }: { tipo: Tipo; de?: string; token?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoConta, FormData>(acaoConta.bind(null, tipo), { status: "inicial" });
  const { campos, enviar, enviando: textoEnviando, rotulo } = FORMULARIOS[tipo];
  const valores = estado.status === "erro" ? estado.valores : {};
  const erros = estado.status === "erro" ? (estado.erros ?? {}) : {};

  const form = useForm<FieldValues>({
    // Um schema por tela; os campos variam, então o formulário trabalha com FieldValues genérico.
    resolver: zodResolver(SCHEMAS_CONTA[tipo]) as unknown as Resolver<FieldValues>,
    defaultValues: Object.fromEntries([...campos.map((c) => [c.nome, valores[c.nome] ?? ""]), ["token", token ?? ""]]),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  if (estado.status === "ok") {
    return (
      <Alert role="status">
        <CircleCheckIcon aria-hidden="true" />
        <AlertTitle className="font-semibold">Pronto</AlertTitle>
        <AlertDescription>{estado.mensagem}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      action={acao}
      noValidate
      aria-label={rotulo}
      onSubmit={(evento) => {
        const elemento = evento.currentTarget;
        void form.handleSubmit(() => startTransition(() => acao(new FormData(elemento))))(evento);
      }}
      className="flex flex-col gap-5"
    >
      {estado.status === "erro" && estado.mensagem && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{estado.mensagem}</AlertTitle>
        </Alert>
      )}

      {campos.map((campo) => (
        <CampoTexto
          key={campo.nome}
          form={form}
          nome={campo.nome}
          rotulo={campo.rotulo}
          ajuda={campo.ajuda}
          type={campo.type ?? "text"}
          autoComplete={campo.autoComplete}
          inputMode={campo.type === "email" ? "email" : undefined}
          erroServidor={erros[campo.nome]}
        />
      ))}

      <input type="hidden" name="de" value={de} />
      {tipo === "redefinir" && <input type="hidden" {...form.register("token")} />}
      {erros.token && (
        <p role="alert" className="text-sm text-destructive">
          {erros.token}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? textoEnviando : enviar}
      </Button>
    </form>
  );
}
