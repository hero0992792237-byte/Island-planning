import { useState, useEffect, useCallback } from 'react'
import {
  X,
  User,
  Mail,
  Calendar,
  Copy,
  Share2,
  Users,
  Gift,
  Check,
  Plus,
  Trash2,
  LogOut,
  Edit3,
  Save,
  Phone,
  FileText,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getUserProfile, updateUserProfile, getFriends, addFriend, removeFriend } from '../services/supabase'
import type { Friend } from '../types'

type Tab = 'account' | 'profile' | 'invite' | 'friends'

interface Props {
  onClose: () => void
  onLogout: () => void
}

export default function UserCenterModal({ onClose, onLogout }: Props) {
  const { state, dispatch } = useApp()
  const { userAuth } = state
  const user = userAuth.user

  const [activeTab, setActiveTab] = useState<Tab>('account')
  const [copied, setCopied] = useState(false)

  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [bio, setBio] = useState(user?.bio || '')

  // Friend adding state
  const [friendUsername, setFriendUsername] = useState('')
  const [friendError, setFriendError] = useState('')

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'account', label: '账号', icon: User },
    { key: 'profile', label: '资料', icon: Edit3 },
    { key: 'invite', label: '邀请', icon: Gift },
    { key: 'friends', label: '好友', icon: Users },
  ]

  useEffect(() => {
    if (!user) return

    async function loadProfile() {
      const profileResult = await getUserProfile(user!.id)
      if (profileResult.data) {
        const profile = profileResult.data
        setDisplayName(profile.display_name || user!.displayName || '')
        setPhone(profile.phone || user!.phone || '')
        setBio(profile.bio || user!.bio || '')
        dispatch({ type: 'UPDATE_USER', payload: {
          displayName: profile.display_name || user!.displayName,
          phone: profile.phone || user!.phone,
          bio: profile.bio || user!.bio,
        } })
        dispatch({ type: 'SET_INVITE_COUNT', payload: profile.invite_count })
        dispatch({ type: 'SET_FREE_API_QUOTA', payload: profile.free_api_quota })
      }

      const friendsResult = await getFriends(user!.id)
      if (friendsResult.data) {
        dispatch({ type: 'SET_FRIENDS', payload: friendsResult.data.map((friend) => ({
          id: friend.friend_id,
          username: friend.friend_username,
          displayName: friend.friend_display_name || friend.friend_username,
          avatar: friend.friend_avatar_url || undefined,
          status: friend.status,
        })) })
      }
    }

    loadProfile()
  }, [user, dispatch])

  const handleCopyInviteCode = useCallback(() => {
    if (!userAuth.inviteCode) return
    navigator.clipboard.writeText(userAuth.inviteCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [userAuth.inviteCode])

  const handleShare = useCallback(() => {
    const text = `快来使用迹划 AI 行程规划工具！输入我的邀请码 ${userAuth.inviteCode}，双方都能获得免费 API 调用额度！`
    if (navigator.share) {
      navigator.share({ title: '迹划邀请', text })
    } else {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [userAuth.inviteCode])

  const handleSaveProfile = useCallback(async () => {
    if (!user) return
    const updates = {
      display_name: displayName || undefined,
      phone: phone || undefined,
      bio: bio || undefined,
    }
    const result = await updateUserProfile(user.id, updates)
    if (result.error) return

    dispatch({
      type: 'UPDATE_USER',
      payload: { displayName: displayName || undefined, phone: phone || undefined, bio: bio || undefined },
    })
    setEditingProfile(false)
  }, [dispatch, displayName, phone, bio, user])

  const handleAddFriend = useCallback(async () => {
    if (!friendUsername.trim()) {
      setFriendError('请输入用户名')
      return
    }
    if (!user) return
    if (friendUsername === user.username) {
      setFriendError('不能添加自己为好友')
      return
    }

    if (userAuth.friends.some(f => f.username === friendUsername)) {
      setFriendError('该用户已是你的好友')
      return
    }

    const { data, error } = await addFriend(user.id, friendUsername.trim())
    if (error || !data) {
      setFriendError(error?.message || '添加好友失败')
      return
    }

    const newFriend: Friend = {
      id: data.friend_id,
      username: data.friend_username,
      displayName: data.friend_display_name || data.friend_username,
      avatar: data.friend_avatar_url || undefined,
      status: data.status,
    }

    dispatch({ type: 'ADD_FRIEND', payload: newFriend })
    setFriendUsername('')
    setFriendError('')
  }, [friendUsername, user, userAuth.friends, dispatch])

  const handleRemoveFriend = useCallback(async (friendId: string) => {
    if (!user) return
    await removeFriend(user.id, friendId)
    dispatch({ type: 'REMOVE_FRIEND', payload: friendId })
  }, [dispatch, user])

  if (!user) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative w-[420px] max-w-[calc(100vw-32px)] max-h-[85vh] bg-white border border-neutral-200 animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-white text-sm font-medium">
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900">{user.displayName || user.username}</p>
              <p className="text-[11px] text-neutral-400">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
              title="退出登录"
            >
              <LogOut size={13} />
              退出
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 flex-shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors
                  ${activeTab === tab.key
                    ? 'text-neutral-900 border-b-2 border-neutral-800'
                    : 'text-neutral-400 hover:text-neutral-600'
                  }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
          {/* ====== Account Tab ====== */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 space-y-3">
                <div className="flex items-center gap-3">
                  <User size={15} className="text-neutral-400" />
                  <div className="flex-1">
                    <p className="text-[11px] text-neutral-400">用户名</p>
                    <p className="text-sm text-neutral-800">{user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={15} className="text-neutral-400" />
                  <div className="flex-1">
                    <p className="text-[11px] text-neutral-400">邮箱</p>
                    <p className="text-sm text-neutral-800">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={15} className="text-neutral-400" />
                  <div className="flex-1">
                    <p className="text-[11px] text-neutral-400">注册时间</p>
                    <p className="text-sm text-neutral-800">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={15} className="text-neutral-400" />
                    <div className="flex-1">
                      <p className="text-[11px] text-neutral-400">手机号</p>
                      <p className="text-sm text-neutral-800">{user.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-50 text-center">
                  <p className="text-lg font-medium text-neutral-800">{userAuth.inviteCount}</p>
                  <p className="text-[11px] text-neutral-400">已邀请</p>
                </div>
                <div className="p-3 bg-neutral-50 text-center">
                  <p className="text-lg font-medium text-neutral-800">{userAuth.friends.length}</p>
                  <p className="text-[11px] text-neutral-400">好友</p>
                </div>
                <div className="p-3 bg-neutral-50 text-center">
                  <p className="text-lg font-medium text-neutral-800">{userAuth.freeApiQuota}</p>
                  <p className="text-[11px] text-neutral-400">免费额度</p>
                </div>
              </div>
            </div>
          )}

          {/* ====== Profile Tab ====== */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {!editingProfile ? (
                <>
                  <div className="p-4 bg-neutral-50 space-y-3">
                    <div className="flex items-center gap-3">
                      <User size={15} className="text-neutral-400" />
                      <div>
                        <p className="text-[11px] text-neutral-400">显示昵称</p>
                        <p className="text-sm text-neutral-800">{user.displayName || user.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={15} className="text-neutral-400" />
                      <div>
                        <p className="text-[11px] text-neutral-400">手机号</p>
                        <p className="text-sm text-neutral-800">{user.phone || '未设置'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileText size={15} className="text-neutral-400" />
                      <div>
                        <p className="text-[11px] text-neutral-400">个性签名</p>
                        <p className="text-sm text-neutral-800">{user.bio || '未设置'}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDisplayName(user.displayName || '')
                      setPhone(user.phone || '')
                      setBio(user.bio || '')
                      setEditingProfile(true)
                    }}
                    className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit3 size={15} />
                    编辑资料
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1.5 block">显示昵称</label>
                    <div className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 focus-within:border-neutral-400 transition-colors">
                      <User size={15} className="text-neutral-400" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="输入昵称"
                        className="flex-1 text-sm bg-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1.5 block">手机号</label>
                    <div className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 focus-within:border-neutral-400 transition-colors">
                      <Phone size={15} className="text-neutral-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="输入手机号"
                        className="flex-1 text-sm bg-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1.5 block">个性签名</label>
                    <div className="flex items-start gap-2 px-3 py-2.5 border border-neutral-200 focus-within:border-neutral-400 transition-colors">
                      <FileText size={15} className="text-neutral-400 mt-0.5" />
                      <textarea
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        placeholder="写点什么..."
                        rows={3}
                        className="flex-1 text-sm bg-transparent outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Save size={15} />
                      保存
                    </button>
                    <button
                      onClick={() => setEditingProfile(false)}
                      className="flex-1 py-2.5 border border-neutral-300 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====== Invite Tab ====== */}
          {activeTab === 'invite' && (
            <div className="space-y-5">
              {/* Invite Code */}
              <div className="p-4 bg-neutral-50">
                <p className="text-xs text-neutral-500 mb-3">我的邀请码</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 bg-white border border-neutral-200 text-center">
                    <p className="text-lg font-mono font-medium text-neutral-800 tracking-wider">
                      {userAuth.inviteCode}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyInviteCode}
                    className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                    title="复制邀请码"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Rewards */}
              <div className="space-y-3">
                <p className="text-xs text-neutral-500">邀请奖励</p>
                <div className="p-3 bg-neutral-50 flex items-center gap-3">
                  <Gift size={18} className="text-neutral-600" />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-800">每成功邀请 1 位好友</p>
                    <p className="text-[11px] text-neutral-400">双方各获得 50 次免费 API 调用</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 text-center">
                  <p className="text-2xl font-medium text-neutral-800">{userAuth.inviteCount}</p>
                  <p className="text-[11px] text-neutral-400">已邀请好友</p>
                </div>
                <div className="p-3 bg-neutral-50 text-center">
                  <p className="text-2xl font-medium text-neutral-800">{userAuth.freeApiQuota}</p>
                  <p className="text-[11px] text-neutral-400">剩余免费额度</p>
                </div>
              </div>

              {/* Share button */}
              <button
                onClick={handleShare}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Share2 size={15} />
                {copied ? '已复制到剪贴板' : '分享邀请链接'}
              </button>
            </div>
          )}

          {/* ====== Friends Tab ====== */}
          {activeTab === 'friends' && (
            <div className="space-y-4">
              {/* Add Friend */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-neutral-200 focus-within:border-neutral-400 transition-colors">
                  <Users size={15} className="text-neutral-400" />
                  <input
                    type="text"
                    value={friendUsername}
                    onChange={e => { setFriendUsername(e.target.value); setFriendError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                    placeholder="输入用户名添加好友"
                    className="flex-1 text-sm bg-transparent outline-none"
                  />
                </div>
                <button
                  onClick={handleAddFriend}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {friendError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2">{friendError}</p>
              )}

              {/* Friends List */}
              <div className="space-y-2">
                <p className="text-xs text-neutral-500">
                  好友列表 ({userAuth.friends.length})
                </p>
                {userAuth.friends.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users size={32} className="mx-auto text-neutral-200 mb-2" />
                    <p className="text-sm text-neutral-400">还没有好友</p>
                    <p className="text-[11px] text-neutral-300">输入上方用户名添加好友</p>
                  </div>
                ) : (
                  userAuth.friends.map(friend => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center text-white text-xs font-medium"
                        >
                          {(friend.displayName || friend.username).charAt(0).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white
                            ${friend.status === 'online' ? 'bg-green-400' : 'bg-neutral-300'}
                          `}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-800 truncate">
                          {friend.displayName || friend.username}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {friend.status === 'online' ? '在线' : '离线'}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="删除好友"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
