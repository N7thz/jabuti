import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

// Resultado das ações da área logada, vindo de `?aviso=` depois do redirect (funciona sem JavaScript).

const AVISOS: Record<string, { texto: string; erro?: boolean }> = {
  "cidade-salva": { texto: "Cidade salva. Seus representantes estão logo abaixo." },
  "cidade-invalida": { texto: "Não encontramos essa cidade. Escolha de novo na lista.", erro: true },
  salvo: { texto: "Salvo na lista." },
  "item-invalido": { texto: "Não deu para salvar este item. Tente de novo pela página dele.", erro: true },
  "nome-invalido": { texto: "Dê um nome de até 80 caracteres para a lista.", erro: true },
  "lista-invalida": { texto: "Escolha uma das suas listas ou crie uma nova.", erro: true },
  "limite-listas": { texto: "Você chegou ao limite de 50 listas. Apague uma para criar outra.", erro: true },
  "limite-itens": { texto: "Esta lista chegou ao limite de 500 itens.", erro: true },
  renomeada: { texto: "Lista renomeada." },
  "lista-apagada": { texto: "Lista apagada." },
  "nota-salva": { texto: "Anotação salva." },
  "nota-longa": { texto: "A anotação pode ter até 2.000 caracteres.", erro: true },
  "item-removido": { texto: "Item removido da lista." },
  "empresa-vigiada": { texto: "Pronto: o painel avisa quando aparecer sanção ou contrato novo desta empresa." },
  "empresa-removida": { texto: "Você parou de vigiar esta empresa." },
  "empresa-invalida": { texto: "Confira o CNPJ: ele precisa ter 14 números.", erro: true },
  "limite-empresas": { texto: "Você chegou ao limite de 20 empresas vigiadas.", erro: true },
};

export function Aviso({ codigo }: { codigo?: string | string[] }) {
  const aviso = typeof codigo === "string" ? AVISOS[codigo] : undefined;
  if (!aviso) return null;
  const Icone = aviso.erro ? CircleAlertIcon : CircleCheckIcon;
  return (
    <Alert role={aviso.erro ? "alert" : "status"} variant={aviso.erro ? "destructive" : "default"}>
      <Icone aria-hidden="true" />
      <AlertDescription>{aviso.texto}</AlertDescription>
    </Alert>
  );
}
