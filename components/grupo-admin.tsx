"use client";

import { HeartHandshakeIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const LINKS_ADMIN = [{ href: "/admin/apoiadores", label: "Apoiadores", icon: HeartHandshakeIcon }] as const;

/** Grupo "Admin" da sidebar; só é montado por SidebarAdmin quando a sessão é de admin. */
export function GrupoAdmin() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Admin</SidebarGroupLabel>
      <SidebarGroupContent>
        <nav aria-label="Admin">
          <SidebarMenu>
            {LINKS_ADMIN.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={active}
                    tooltip={`Admin: ${label}`}
                    render={
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => isMobile && setOpenMobile(false)}
                      />
                    }
                  >
                    <Icon aria-hidden="true" className="text-secao-glossario" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </nav>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
