"use client"

import { useState } from "react"
import { IconQrcode, IconCamera, type Icon } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { QRCodeReader } from "./qr-code-reader"
import { useRouter } from "next/navigation"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
  const router = useRouter()
  const [isQRReaderOpen, setIsQRReaderOpen] = useState(false)

  const handleQRScan = (result: string) => {
    console.log("QR Code escaneado:", result)
    // Aqui você pode implementar a lógica adicional para processar o resultado do QR code
    // Por exemplo, salvar no banco de dados, enviar para API, etc.
  }

  const openQRReader = () => {
    console.log("Abrindo leitor de QR Code...")
    setIsQRReaderOpen(true)
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2 overflow-x-hidden">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2 min-w-0">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear flex-shrink-0"
              onClick={openQRReader}
            >
              <IconQrcode />
              <span>Escanear etiqueta</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
              onClick={openQRReader}
            >
              <IconCamera className="text-primaty" />
              <span className="sr-only">Abrir câmera</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title} onClick={() => {
              router.push(item.url)
            }}>
              <SidebarMenuButton tooltip={item.title}>
                {item.icon && <item.icon className="text-primary"/>}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>

      <QRCodeReader
        isOpen={isQRReaderOpen}
        onClose={() => setIsQRReaderOpen(false)}
        onScan={handleQRScan}
      />
    </SidebarGroup>
  )
}
