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

// ======== Cloud Journal Entries ========

export interface DbJournalEntry {
  id: string
  user_id: string
  entry_id: string
  title: string
  category: string
  start_time: string
  end_time: string
  location_name: string | null
  location_address: string | null
  location_lat: number | null
  location_lng: number | null
  description: string
  cost: number
  photo_ids: string[]
  source: string
  status: string
  created_at: string
}

function toDbJournalEntry(entry: import('../types').JournalEntry, userId: string) {
  return {
    user_id: userId,
    entry_id: entry.id,
    title: entry.title,
    category: entry.category,
    start_time: entry.startTime,
    end_time: entry.endTime,
    location_name: entry.location.name || null,
    location_address: entry.location.address || null,
    location_lat: entry.location.lat || null,
    location_lng: entry.location.lng || null,
    description: entry.description,
    cost: entry.cost,
    photo_ids: entry.photoIds,
    source: entry.source,
    status: entry.status,
    created_at: new Date(entry.createdAt).toISOString(),
  }
}

function fromDbJournalEntry(row: DbJournalEntry): import('../types').JournalEntry {
  return {
    id: row.entry_id,
    title: row.title,
    category: row.category as import('../types').JournalCategory,
    startTime: row.start_time,
    endTime: row.end_time,
    location: {
      name: row.location_name || '',
      address: row.location_address || undefined,
      lat: row.location_lat || undefined,
      lng: row.location_lng || undefined,
    },
    description: row.description,
    cost: row.cost,
    photoIds: row.photo_ids || [],
    source: row.source as 'ai' | 'manual',
    status: row.status as 'planned' | 'completed' | 'missed',
    createdAt: new Date(row.created_at).getTime(),
  }
}

export async function loadCloudJournalEntries(userId: string) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return { entries: null, error }
  return { entries: (data as DbJournalEntry[]).map(fromDbJournalEntry), error: null }
}

export async function saveCloudJournalEntry(userId: string, entry: import('../types').JournalEntry) {
  const { error } = await supabase
    .from('journal_entries')
    .upsert(toDbJournalEntry(entry, userId), { onConflict: 'user_id,entry_id' })
  return { error }
}

export async function deleteCloudJournalEntry(userId: string, entryId: string) {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('user_id', userId)
    .eq('entry_id', entryId)
  return { error }
}

// ======== Cloud Albums ========

export interface DbAlbum {
  id: string
  user_id: string
  album_id: string
  name: string
  photo_ids: string[]
  created_at: number
}

function toDbAlbum(album: import('../lib/journalDB').AlbumMeta, userId: string) {
  return {
    user_id: userId,
    album_id: album.id,
    name: album.name,
    photo_ids: album.photoIds,
    created_at: album.createdAt,
  }
}

function fromDbAlbum(row: DbAlbum): import('../lib/journalDB').AlbumMeta {
  return {
    id: row.album_id,
    name: row.name,
    photoIds: row.photo_ids || [],
    createdAt: row.created_at,
  }
}

export async function loadCloudAlbums(userId: string) {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('user_id', userId)
  if (error) return { albums: null, error }
  return { albums: (data as DbAlbum[]).map(fromDbAlbum), error: null }
}

export async function saveCloudAlbum(userId: string, album: import('../lib/journalDB').AlbumMeta) {
  const { error } = await supabase
    .from('albums')
    .upsert(toDbAlbum(album, userId), { onConflict: 'user_id,album_id' })
  return { error }
}

export async function deleteCloudAlbum(userId: string, albumId: string) {
  const { error } = await supabase
    .from('albums')
    .delete()
    .eq('user_id', userId)
    .eq('album_id', albumId)
  return { error }
}

// ======== Photo Storage ========

const PHOTO_BUCKET = 'journal-photos'

function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(parts[1] || parts[0])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

function storagePath(userId: string, photoId: string): string {
  return `${userId}/${photoId}`
}

export async function uploadPhotoToStorage(userId: string, photoId: string, base64Data: string) {
  const path = storagePath(userId, photoId)
  const blob = base64ToBlob(base64Data)
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  return { error }
}

export async function getPhotoFromStorage(userId: string, photoId: string): Promise<string | null> {
  const path = storagePath(userId, photoId)
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .download(path)
  if (error || !data) return null
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(data)
  })
}

export async function deletePhotoFromStorage(userId: string, photoId: string) {
  const path = storagePath(userId, photoId)
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([path])
  return { error }
}
