import Image from "next/image";

import { cn } from "@/lib/utils";

/** Selo do Jabuti: o recorte de public/icons/jabuti-original.png usado também no favicon e nos ícones do app. */
export function LogoJabuti({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/icon-192.png"
      alt=""
      width={32}
      height={32}
      className={cn("size-8 rounded-lg", className)}
    />
  );
}
