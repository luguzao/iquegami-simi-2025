"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { fetchUsersAction, createUserAction, updateUserAction, deleteUserAction } from "./actions"

type UserRecord = {
  id: string
  email: string
  created_at?: string
  user_metadata?: any
}

export default function UsersAdminPage() {
  const breadcrumbs = [
    { title: "Início", url: "/dashboard" },
    { title: "Usuários", url: "/dashboard/usuarios" },
  ]

  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchUsersAction()
        // Show all users and indicate consent in the UI. Admin can toggle consent per-user.
        if (mounted) setUsers(data || [])
      } catch (err: any) {
        console.error(err)
        setError(err?.message || "Erro ao carregar usuários")
        toast.error(err?.message || "Erro ao carregar usuários")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const openNew = () => {
    setEditingUser(null)
    setEmail("")
    setName("")
    setPassword("")
    setIsDialogOpen(true)
  }

  const openEdit = (u: UserRecord) => {
    setEditingUser(u)
    setEmail(u.email)
    setName(u.user_metadata?.name || "")
    setPassword("")
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingUser) {
        // Update
  const updated = await updateUserAction(editingUser.id, {
          password: password || undefined,
          user_metadata: { ...(editingUser.user_metadata || {}), name, consent: true },
        })
        setUsers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        toast.success("Usuário atualizado com sucesso")
      } else {
      // Create
    const created = await createUserAction({
          email,
          password,
          user_metadata: { name, consent: true },
        })
        setUsers((prev) => [...prev, created])
        toast.success("Usuário criado com sucesso")
      }

      setIsDialogOpen(false)
      setEditingUser(null)
      setEmail("")
      setName("")
      setPassword("")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Erro ao salvar usuário")
      throw err
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return
    try {
      await deleteUserAction(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
      toast.success("Usuário deletado com sucesso")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Erro ao deletar usuário")
    }
  }

  const toggleConsent = async (u: UserRecord) => {
    try {
      const updated = await updateUserAction(u.id, { user_metadata: { ...(u.user_metadata || {}), consent: !u.user_metadata?.consent } })
      setUsers(prev => prev.map(p => (p.id === updated.id ? updated : p)))
      toast.success('Consentimento atualizado')
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao atualizar consentimento')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-4 p-4 min-w-0">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md">
              <strong>Erro:</strong> {error}. Verifique se a variável de ambiente SUPABASE_SERVICE_ROLE_KEY está configurada no servidor.
            </div>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Gestão de Usuários</h2>
            <div className="flex gap-2">
              <Button onClick={openNew}>Novo usuário</Button>
            </div>
          </div>

          <div className="overflow-x-auto bg-white border rounded-md">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b">Email</th>
                  <th className="text-left p-2 border-b">Nome</th>
                  <th className="text-left p-2 border-b">Criado em</th>
                  <th className="text-left p-2 border-b">Consentimento</th>
                  <th className="text-left p-2 border-b">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">Carregando...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum usuário encontrado.</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="odd:bg-muted/50">
                      <td className="p-2 border-b">{u.email}</td>
                      <td className="p-2 border-b">{u.user_metadata?.name || "-"}</td>
                      <td className="p-2 border-b">{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</td>
                      <td className="p-2 border-b">
                        <div className="flex items-center gap-2">
                          <span>{u.user_metadata?.consent ? "Ativo" : "—"}</span>
                          <Button size="sm" variant="outline" onClick={() => toggleConsent(u)}>
                            {u.user_metadata?.consent ? "Desativar" : "Ativar"}
                          </Button>
                        </div>
                      </td>
                      <td className="p-2 border-b">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(u.id)}>Excluir</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? "Editar usuário" : "Novo usuário"}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-2">
                <div>
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" disabled={!!editingUser} />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Senha {editingUser ? "(manter em branco para não alterar)" : ""}</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                </div>
              </div>

              <DialogFooter>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSave}>{editingUser ? "Salvar" : "Criar"}</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}


