import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Cria um cliente Supabase para uso no navegador (client components)
 * 
 * @important SEGURANÇA DE AUTENTICAÇÃO
 * 
 * ❌ NÃO USE: supabase.auth.getSession()
 * - Lê dados diretamente do cookie/storage sem validação
 * - Pode ser manipulado/falsificado no lado do cliente
 * - Não garante que o token seja válido
 * 
 * ✅ USE: supabase.auth.getUser()
 * - Valida o token com o servidor Supabase Auth
 * - Garante que o usuário é autêntico
 * - Mais seguro, mas faz uma requisição de rede
 * 
 * Para escutar mudanças de autenticação, use:
 * supabase.auth.onAuthStateChange() e então valide com getUser()
 */
export const createClient = () => {
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}

// Manter compatibilidade com código existente
export const supabase = createClient()