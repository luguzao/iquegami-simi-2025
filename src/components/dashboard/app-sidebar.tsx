"use client"

import * as React from "react"
import {
  IconInnerShadowTop,
  IconReportAnalytics,
  IconSettings,
  IconUsers,
  IconUserScreen,
  IconZoom,
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
      title: "Auditoria",
      url: "/dashboard/auditoria",
      icon: IconZoom,
    },
    {
      title: "Eventos",
      url: "/dashboard/eventos",
      icon: IconInnerShadowTop,
    },
    // {
    //   title: "Relatórios",
    //   url: "/dashboard/relatorios",
    //   icon: IconReportAnalytics,
    // },
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
  const [currentUser, setCurrentUser] = React.useState<{ name: string; email: string; avatar: string } | null>(null)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const supabase = (await import('@/lib/supabase')).createClient()
        const { data } = await supabase.auth.getUser()
        const user = data?.user ?? null
        if (!mounted) return
        if (user) {
          setCurrentUser({
            name: String(user.user_metadata?.name || user.email || 'Usuário'),
            email: String(user.email || ''),
            avatar: String(user.user_metadata?.avatar || '/avatars/shadcn.jpg'),
          })
        } else {
          setCurrentUser(null)
        }
      } catch (e) {
        // ignore
      }
    }
    load()
    return () => { mounted = false }
  }, [])
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
        <NavUser user={currentUser ?? data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
