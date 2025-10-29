"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    
    // Verificar se o usuário está logado (de forma segura)
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      setUser(user ?? null)
      setLoading(false)
    }

    checkUser()

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Validar usuário de forma segura após mudanças de estado
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const { data: { user } } = await supabase.auth.getUser()
          setUser(user ?? null)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
        setLoading(false)
        
        // Se o usuário acabou de fazer login, redirecionar para o dashboard
        if (event === 'SIGNED_IN' && pathname === '/') {
          router.push('/dashboard')
          router.refresh()
        }
        
        // Se o usuário fez logout, redirecionar para a home
        if (event === 'SIGNED_OUT') {
          router.push('/')
          router.refresh()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return

    const isDashboardRoute = pathname.startsWith('/dashboard')
    const isLoginRoute = pathname === '/'

    if (isDashboardRoute && !user) {
      // Usuário não logado tentando acessar dashboard
      router.push('/')
    } else if (isLoginRoute && user) {
      // Usuário logado na página de login
      router.push('/dashboard')
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}