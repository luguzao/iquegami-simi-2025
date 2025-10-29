"use client"

import * as React from "react"
import {
  IconInnerShadowTop,
  IconReportAnalytics,
  IconSettings,
  IconUsers,
  IconUserScreen,
} from "@tabler/icons-react"

import { NavSecondary } from "@/components/dashboard/nav-secondary"
import { NavMain } from "@/components/dashboard/nav-main"
import { NavUser } from "@/components/dashboard/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import Image from "next/image"
import Logo from "../../assets/logo.png"

const data = {
  user: {
    name: "teste iquegami",
    email: "teste@teste.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Colaboradores",
      url: "/dashboard/colaboradores",
      icon: IconUsers,
    },
    {
      title: "Relatórios",
      url: "/dashboard/relatorios",
      icon: IconReportAnalytics,
    },
  ],
  navSecondary: [
    {
      title: "Usuários",
      url: "/dashboard/usuarios",
      icon: IconUserScreen,
    },
    {
      title: "Configurações",
      url: "/dashboard/configuracoes",
      icon: IconSettings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" className="overflow-x-hidden" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 h-20"
            >
              <Link href="/dashboard ">
                <Image
                  src={Logo}
                  alt="Logo"
                  className="w-full rounded-md object-scale-down"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
