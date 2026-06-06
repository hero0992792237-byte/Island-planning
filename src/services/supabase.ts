import { createClient } from '@supabase/supabase-js'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
import type { User as LocalUser } from '../types'

const SUPABASE_URL = 'https://fvvchxwtdloraozwdrfc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2dmNoeHd0ZGxvcmFvendkcmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTU0NTgsImV4cCI6MjA5NTgzMTQ1OH0.6SE6MOqzcmqvPZgAlBpIgDxzC202d4j-v-7lbg2on0w'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export function mapSupabaseUser(authUser: SupabaseAuthUser, profile?: DbUserProfile): LocalUser {
  const username = profile?.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || authUser.id
  const displayName = profile?.display_name || authUser.user_metadata?.display_name || username

  return {
    id: authUser.id,
    username,
    email: authUser.email || '',
    displayName,
    avatar: profile?.avatar_url || authUser.user_metadata?.avatar_url || undefined,
    phone: profile?.phone || authUser.user_metadata?.phone || undefined,
    bio: profile?.bio || authUser.user_metadata?.bio || undefined,
    createdAt: profile ? Date.parse(profile.created_at) : authUser.created_at ? Date.parse(authUser.created_at) : Date.now(),
  }
}

// ======== Auth Helpers ========

export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: username,
      },
      // 确认邮件后重定向回应用首页（用户会收到确认邮件，点击链接完成验证）
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  console.log('[supabase] signIn:', { email, hasData: !!data, hasSession: !!data?.session, error })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  console.log('[supabase] signOut:', { error })
  return { error }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

// ======== User Profile ========

export interface DbUserProfile {
  id: string
  username: string
  email: string
  display_name?: string
  avatar_url?: string
  phone?: string
  bio?: string
  invite_code: string
  invite_count: number
  free_api_quota: number
  created_at: string
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data: data as DbUserProfile | null, error }
}

export async function updateUserProfile(userId: string, updates: Partial<DbUserProfile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  return { data: data as DbUserProfile | null, error }
}

// ======== Friends ========

export interface DbFriend {
  id: string
  user_id: string
  friend_id: string
  friend_username: string
  friend_display_name?: string
  friend_avatar_url?: string
  status: 'online' | 'offline'
  created_at: string
}

export async function getFriends(userId: string) {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .eq('user_id', userId)
  return { data: data as DbFriend[] | null, error }
}

export async function addFriend(userId: string, friendUsername: string) {
  // 先查找好友的用户ID
  const { data: friendProfile, error: findError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', friendUsername)
    .single()

  if (findError || !friendProfile) {
    return { data: null, error: new Error('用户不存在') }
  }

  const { data, error } = await supabase
    .from('friends')
    .insert({
      user_id: userId,
      friend_id: friendProfile.id,
      friend_username: friendProfile.username,
      friend_display_name: friendProfile.display_name,
      friend_avatar_url: friendProfile.avatar_url,
      status: 'offline',
    })
    .select()
    .single()

  return { data: data as DbFriend | null, error }
}

export async function removeFriend(userId: string, friendId: string) {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId)
  return { error }
}
