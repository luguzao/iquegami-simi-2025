"use server"

import createServerSupabase from "@/lib/supabase-server"

const supabase = createServerSupabase()

type CreatePayload = {
  email: string
  password: string
  user_metadata?: any
}

export async function fetchUsersAction() {
  try {
    // Use admin.listUsers to enumerate auth users (no PostgREST `users` view required)
    // @ts-ignore
    const res = await (supabase as any).auth.admin.listUsers()

    const users = res?.data?.users ?? res?.users ?? res?.data ?? []

    // Normalize to array of simple records
    return (users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      user_metadata: u.user_metadata,
      created_at: u.created_at,
    }))
  } catch (err: any) {
    console.error("fetchUsersAction error", err)
    throw new Error(err?.message || String(err))
  }
}

export async function createUserAction(payload: CreatePayload) {
  // Always ensure consent is active when creating here
  const meta = { ...(payload.user_metadata || {}), consent: true }

  try {
    // Prefer auth.admin.createUser for creating auth users with service role
    // The supabase client on server (service role) exposes admin methods.
    // @ts-ignore - some typings differ between versions; runtime will call the admin API
    // Try to create the user already confirmed by passing admin flag (email_confirm) when supported
    const res = await (supabase as any).auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      user_metadata: meta,
      // prefer to mark email as confirmed if the SDK supports it
      email_confirm: true,
      // also include explicit timestamp where supported
      email_confirmed_at: new Date().toISOString(),
    })

    // res may contain user in different shapes depending on version
    const created = res?.data?.user ?? res?.user ?? res?.data ?? null

    if (created) {
      // Ensure confirmation is present: try updating user to set confirmed timestamp if needed
      try {
        // @ts-ignore
        await (supabase as any).auth.admin.updateUserById(created.id, {
          user_metadata: created.user_metadata ?? meta,
          email_confirm: true,
          email_confirmed_at: new Date().toISOString(),
        })
      } catch (e) {
        // ignore non-fatal
      }

      return {
        id: created.id,
        email: created.email,
        user_metadata: created.user_metadata ?? meta,
        created_at: created.created_at,
      }
    }

    // Fallback: list users and find by email (admin API)
    // @ts-ignore
    const list = await (supabase as any).auth.admin.listUsers()
    const listUsers = list?.data?.users ?? list?.users ?? list?.data ?? []
    const found = (listUsers || []).find((u: any) => u.email === payload.email)
    if (!found) throw new Error('Usuário criado mas não foi possível recuperar o registro')
    return { id: found.id, email: found.email, user_metadata: found.user_metadata, created_at: found.created_at }
  } catch (err: any) {
    console.error("createUserAction error", err)
    throw new Error(err?.message || String(err))
  }
}

export async function updateUserAction(id: string, patch: { password?: string; user_metadata?: any }) {
  try {
    // Update password and metadata using admin API
    // @ts-ignore
    const res = await (supabase as any).auth.admin.updateUserById(id, {
      password: patch.password,
      user_metadata: patch.user_metadata,
    })

    const updated = res?.data?.user ?? res?.user ?? res?.data ?? null
    if (updated) {
      return { id: updated.id, email: updated.email, user_metadata: updated.user_metadata, created_at: updated.created_at }
    }

    // Fallback: list users and find by id
    // @ts-ignore
    const list = await (supabase as any).auth.admin.listUsers()
    const listUsers = list?.data?.users ?? list?.users ?? list?.data ?? []
    const found = (listUsers || []).find((u: any) => u.id === id)
    if (!found) throw new Error('Usuário atualizado mas não foi possível recuperar o registro')
    return { id: found.id, email: found.email, user_metadata: found.user_metadata, created_at: found.created_at }
  } catch (err: any) {
    console.error("updateUserAction error", err)
    throw new Error(err?.message || String(err))
  }
}

export async function deleteUserAction(id: string) {
  try {
    // @ts-ignore
    const res = await (supabase as any).auth.admin.deleteUser(id)
    if (res?.error) {
      throw new Error(res.error.message || JSON.stringify(res.error))
    }

    return { success: true }
  } catch (err: any) {
    console.error("deleteUserAction error", err)
    throw new Error(err?.message || String(err))
  }
}
