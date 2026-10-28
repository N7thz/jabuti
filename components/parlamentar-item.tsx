import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import type { ParlamentarResumo } from "@/lib/parlamentares/queries";

const CASA = { camara: "Deputado(a)", senado: "Senador(a)" } as const;

export const hrefParlamentar = (p: Pick<ParlamentarResumo, "casa" | "id">) =>
  `/parlamentares/${p.casa === "camara" ? "deputado" : "senador"}/${p.id}`;

export const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

export function ParlamentarItem({ parlamentar: p }: { parlamentar: ParlamentarResumo }) {
  return (
    <Item variant="outline" render={<Link href={hrefParlamentar(p)} />}>
      <ItemMedia>
        <Avatar size="lg">
          {p.fotoUrl && <AvatarImage src={p.fotoUrl} alt="" />}
          <AvatarFallback>{iniciais(p.nome)}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{p.nome}</ItemTitle>
        <ItemDescription>
          {CASA[p.casa]} · {p.partido ?? "sem partido"}
          {p.uf && <>/{p.uf}</>}
        </ItemDescription>
      </ItemContent>
      <Badge variant={p.casa === "senado" ? "secondary" : "outline"}>
        {p.casa === "senado" ? "Senado" : "Câmara"}
      </Badge>
    </Item>
  );
}
