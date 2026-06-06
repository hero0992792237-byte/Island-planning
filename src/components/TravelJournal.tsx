import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Plus,
  ArrowLeft,
  Camera,
  ImageIcon,
  Trash2,
  Calendar,
  X,
  Loader2,
} from 'lucide-react'
import type { JournalEntry, JournalCategory } from '../types'
import {
  type AlbumMeta,
  loadAlbumMeta,
  saveAlbumMeta,
  savePhoto,
  getPhoto,
  deletePhoto,
  deletePhotosByAlbum,
  compressImage,
  loadJournalEntries,
  saveJournalEntries,
  addJournalEntry,
  deleteJournalEntry,
  updateJournalEntry,
} from '../lib/journalDB'
import { useApp } from '../context/AppContext'
import {
  loadCloudJournalEntries,
  saveCloudJournalEntry,
  deleteCloudJournalEntry,
  loadCloudAlbums,
  saveCloudAlbum,
  deleteCloudAlbum,
} from '../services/supabase'

import JournalHeader from './travel/JournalHeader'
import PlanView from './travel/PlanView'
import MonthView from './travel/MonthView'
import AddEntryModal from './travel/AddEntryModal'
import MonthlyReportModal from './travel/MonthlyReportModal'
import { mockJournalEntries } from '../data/mockData'

// ===================== 相册列表 =====================
function AlbumList({
  albums,
  covers,
  onCreate,
  onOpen,
}: {
  albums: AlbumMeta[]
  covers: Record<string, string>
  onCreate: () => void
  onOpen: (id: string) => void
}) {
  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-headline text-xl text-on-surface">照片相册</h2>
          <p className="font-label text-xs text-outline mt-0.5">
            {albums.length} 个相册
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant/20 text-on-surface-variant text-xs font-medium font-label hover:bg-surface-container-low transition-colors rounded-lg"
        >
          <Plus size={12} />
          新建
        </button>
      </div>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Camera size={24} className="text-outline mb-2" />
          <p className="text-outline text-xs font-label">还没有相册</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => onOpen(album.id)}
              className="text-left group"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-container">
                {covers[album.id] ? (
                  <img
                    src={covers[album.id]}
                    alt={album.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <ImageIcon size={24} className="text-outline/40 mb-2" />
                    <span className="font-label text-[10px] text-outline">空相册</span>
                  </div>
                )}
                {album.photoIds.length > 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/20 backdrop-blur-md rounded text-[10px] text-white font-label">
                    {album.photoIds.length} 张
                  </div>
                )}
              </div>
              <p className="font-headline text-sm leading-tight mt-2 text-on-surface">{album.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ===================== 相册详情 =====================
function AlbumDetail({
  album,
  photoData,
  onBack,
  onUpdate,
}: {
  album: AlbumMeta
  photoData: Record<string, string>
  onBack: () => void
  onUpdate: (album: AlbumMeta) => void
}) {
  const [name, setName] = useState(album.name)
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleNameSave = useCallback(() => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== album.name) {
      onUpdate({ ...album, name: trimmed })
    }
    setIsEditing(false)
  }, [name, album, onUpdate])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      setUploading(true)
      const newIds: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue

        try {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
          const compressed = await compressImage(base64, 1280, 0.8)
          const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          await savePhoto(photoId, album.id, compressed)
          newIds.push(photoId)
        } catch {
          // skip failed
        }
      }

      if (newIds.length > 0) {
        const updated = { ...album, photoIds: [...album.photoIds, ...newIds] }
        onUpdate(updated)
      }

      setUploading(false)
      e.target.value = ''
    },
    [album, onUpdate]
  )

  const handleDeletePhoto = useCallback(
    async (index: number) => {
      const photoId = album.photoIds[index]
      await deletePhoto(photoId)
      const updatedIds = album.photoIds.filter((_, i) => i !== index)
      onUpdate({ ...album, photoIds: updatedIds })
    },
    [album, onUpdate]
  )

  const handleDeleteAlbum = useCallback(async () => {
    if (confirm('确定删除这个相册吗？照片将无法恢复。')) {
      await deletePhotosByAlbum(album.id)
      onUpdate({ ...album, photoIds: [], _deleted: true } as any)
      onBack()
    }
  }, [album, onUpdate, onBack])

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors rounded-lg"
        >
          <ArrowLeft size={18} />
        </button>

        {isEditing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave()
              if (e.key === 'Escape') {
                setName(album.name)
                setIsEditing(false)
              }
            }}
            onBlur={handleNameSave}
            autoFocus
            className="flex-1 px-3 py-1 font-headline text-base bg-surface-container-lowest border border-outline-variant/20 text-on-surface outline-none focus:border-primary/30 rounded-lg"
          />
        ) : (
          <h2
            onClick={() => setIsEditing(true)}
            className="flex-1 font-headline text-base font-semibold text-on-surface cursor-pointer hover:text-primary transition-colors truncate"
          >
            {album.name}
          </h2>
        )}

        <button
          onClick={handleDeleteAlbum}
          className="w-8 h-8 flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30 transition-colors rounded-lg"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-outline font-label">
        <span className="flex items-center gap-1">
          <Camera size={12} />
          {album.photoIds.length} 张照片
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {new Date(album.createdAt).toLocaleDateString('zh-CN')}
        </span>
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full py-3 mb-4 border-2 border-dashed border-outline-variant/20 flex flex-col items-center justify-center gap-1 text-outline hover:bg-surface-container-low transition-colors disabled:opacity-50 rounded-xl"
      >
        {uploading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Plus size={18} />
        )}
        <span className="font-label text-xs">{uploading ? '处理中...' : '上传照片'}</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {album.photoIds.length === 0 ? (
        <div className="text-center py-8">
          <ImageIcon size={32} className="text-outline/30 mx-auto mb-2" />
          <p className="text-outline text-xs font-label">还没有照片</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {album.photoIds.map((photoId, index) => (
            <div
              key={photoId}
              className="relative aspect-square overflow-hidden bg-surface-container rounded-lg group"
            >
              {photoData[photoId] ? (
                <img
                  src={photoData[photoId]}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 size={16} className="text-outline animate-spin" />
                </div>
              )}
              <button
                onClick={() => handleDeletePhoto(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity rounded"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===================== 新建相册弹窗 =====================
function CreateAlbumModal({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim()
    if (trimmed) {
      onCreate(trimmed)
    }
  }, [name, onCreate])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-surface-container-lowest p-6 shadow-2xl rounded-xl">
        <h3 className="font-headline text-base font-semibold text-on-surface mb-4">新建照片相册</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="给相册起个名字..."
          className="w-full px-4 py-3 text-sm bg-surface-container-low border border-outline-variant/20
            text-on-surface placeholder-outline/50
            outline-none focus:border-primary/30 rounded-lg"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-medium font-label text-on-surface-variant
              bg-surface-container-low hover:bg-surface-container transition-colors rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 py-2.5 text-xs font-medium font-label text-on-primary
              bg-primary hover:opacity-90 disabled:opacity-40 transition-colors rounded-lg"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  )
}

// ===================== 主组件 =====================
export default function TravelJournal() {
  // ---- 原有照片集状态 ----
  const [albums, setAlbums] = useState<AlbumMeta[]>(loadAlbumMeta)
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [photoData, setPhotoData] = useState<Record<string, string>>({})
  const [currentAlbumId, setCurrentAlbumId] = useState<string | null>(null)
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false)

  const currentAlbum = albums.find((a) => a.id === currentAlbumId) || null

  // ---- 云端同步：获取当前登录用户 ----
  const { state: appState } = useApp()
  const userId = appState.userAuth.user?.id || null

  // ---- 新状态 ----
  const [view, setView] = useState<'plan' | 'month'>('plan')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState<JournalEntry[]>(loadJournalEntries)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showAlbums, setShowAlbums] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<JournalCategory | null>(null)

  // ---- 监听灵动岛 QuickBar 的分类选择事件 ----
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<JournalCategory>
      setSelectedCategory(custom.detail)
      setShowAddModal(true)
    }
    window.addEventListener('island-add-category', handler)
    return () => window.removeEventListener('island-add-category', handler)
  }, [])

  // ---- 控制 body class 以调整 FloatingIsland 的 z-index ----
  useEffect(() => {
    if (showAddModal) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => document.body.classList.remove('modal-open')
  }, [showAddModal])

  // ---- 计算当前月份数据 ----
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const monthEntries = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.startTime)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  }, [entries, year, month])

  // ---- 月份切换 ----
  const handleChangeMonth = useCallback((delta: number) => {
    setCurrentDate((d) => {
      const nd = new Date(d)
      nd.setMonth(nd.getMonth() + delta)
      return nd
    })
  }, [])

  // ---- 添加行程（本地 + 云端） ----
  const handleAddEntry = useCallback((entry: JournalEntry) => {
    addJournalEntry(entry)
    setEntries(loadJournalEntries())
    setShowAddModal(false)
    // 同步到云端
    if (userId) {
      saveCloudJournalEntry(userId, entry).catch(() => {/* ignore */})
    }
  }, [userId])

  // ---- 删除行程（本地 + 云端） ----
  const handleDeleteEntry = useCallback((id: string) => {
    if (confirm('确定删除这条行程记录吗？')) {
      deleteJournalEntry(id)
      setEntries(loadJournalEntries())
      // 从云端删除
      if (userId) {
        deleteCloudJournalEntry(userId, id).catch(() => {/* ignore */})
      }
    }
  }, [userId])

  // ---- 更新行程（本地 + 云端） ----
  const handleUpdateEntry = useCallback((entry: JournalEntry) => {
    updateJournalEntry(entry)
    setEntries(loadJournalEntries())
    // 同步到云端
    if (userId) {
      saveCloudJournalEntry(userId, entry).catch(() => {/* ignore */})
    }
  }, [userId])

  // ---- 原有照片集逻辑 ----
  useEffect(() => {
    let cancelled = false
    async function loadCovers() {
      const map: Record<string, string> = {}
      for (const album of albums) {
        if (album.photoIds.length > 0) {
          const data = await getPhoto(album.photoIds[0])
          if (data) map[album.id] = data
        }
      }
      if (!cancelled) setCovers(map)
    }
    loadCovers()
    return () => { cancelled = true }
  }, [albums])

  useEffect(() => {
    let cancelled = false
    async function loadPhotos() {
      if (!currentAlbum) return
      const map: Record<string, string> = {}
      for (const photoId of currentAlbum.photoIds) {
        const data = await getPhoto(photoId)
        if (data) map[photoId] = data
      }
      if (!cancelled) setPhotoData(map)
    }
    loadPhotos()
    return () => { cancelled = true }
  }, [currentAlbum])

  const handleCreateAlbum = useCallback(
    (name: string) => {
      const newAlbum: AlbumMeta = {
        id: `album_${Date.now()}`,
        name,
        photoIds: [],
        createdAt: Date.now(),
      }
      const updated = [newAlbum, ...albums]
      setAlbums(updated)
      saveAlbumMeta(updated)
      setShowCreateAlbumModal(false)
      setCurrentAlbumId(newAlbum.id)
      // 同步到云端
      if (userId) {
        saveCloudAlbum(userId, newAlbum).catch(() => {/* ignore */})
      }
    },
    [albums, userId]
  )

  const handleUpdateAlbum = useCallback(
    (album: AlbumMeta) => {
      // @ts-ignore
      if (album._deleted) {
        const updated = albums.filter((a) => a.id !== album.id)
        setAlbums(updated)
        saveAlbumMeta(updated)
        // 从云端删除
        if (userId) {
          deleteCloudAlbum(userId, album.id).catch(() => {/* ignore */})
        }
        return
      }
      const updated = albums.map((a) => (a.id === album.id ? album : a))
      setAlbums(updated)
      saveAlbumMeta(updated)
      // 同步到云端
      if (userId) {
        saveCloudAlbum(userId, album).catch(() => {/* ignore */})
      }
    },
    [albums, userId]
  )

  // ---- 初始化mock数据（仅首次）----
  useEffect(() => {
    const existing = loadJournalEntries()
    if (existing.length === 0) {
      saveJournalEntries(mockJournalEntries)
      setEntries(mockJournalEntries)
    }
  }, [])

  // ---- 登录后从云端加载数据 ----
  useEffect(() => {
    const uid = userId
    if (!uid) return
    async function syncFromCloud() {
      if (!uid) return
      // 加载云端行程
      const { entries: cloudEntries, error: entryErr } = await loadCloudJournalEntries(uid)
      if (!entryErr && cloudEntries && cloudEntries.length > 0) {
        // 合并：云端 + 本地（去重）
        const local = loadJournalEntries()
        const merged = [...cloudEntries]
        local.forEach((e) => {
          if (!merged.find((ce) => ce.id === e.id)) {
            merged.push(e)
            // 把本地独有的同步到云端
            saveCloudJournalEntry(uid, e).catch(() => {/* ignore */})
          }
        })
        merged.sort((a, b) => b.createdAt - a.createdAt)
        saveJournalEntries(merged)
        setEntries(merged)
      } else if (!entryErr && cloudEntries?.length === 0) {
        // 云端无数据，把本地数据上传
        const local = loadJournalEntries()
        if (local.length > 0) {
          for (const e of local) {
            await saveCloudJournalEntry(uid, e)
          }
        }
      }
      // 加载云端相册
      const { albums: cloudAlbums, error: albumErr } = await loadCloudAlbums(uid)
      if (!albumErr && cloudAlbums && cloudAlbums.length > 0) {
        const local = loadAlbumMeta()
        const merged = [...cloudAlbums]
        local.forEach((a) => {
          if (!merged.find((ca) => ca.id === a.id)) {
            merged.push(a)
            saveCloudAlbum(uid, a).catch(() => {/* ignore */})
          }
        })
        saveAlbumMeta(merged)
        setAlbums(merged)
      } else if (!albumErr && cloudAlbums?.length === 0) {
        const local = loadAlbumMeta()
        if (local.length > 0) {
          for (const a of local) {
            await saveCloudAlbum(uid, a)
          }
        }
      }
    }
    syncFromCloud()
  }, [userId])

  // ---- 同步监听 ----
  useEffect(() => {
    const checkSync = () => {
      setEntries(loadJournalEntries())
    }
    const interval = setInterval(checkSync, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative min-h-[100dvh]">
      {currentAlbum ? (
        // 相册详情
        <AlbumDetail
          album={currentAlbum}
          photoData={photoData}
          onBack={() => setCurrentAlbumId(null)}
          onUpdate={handleUpdateAlbum}
        />
      ) : (
        <>
          {/* 头部 */}
          <div className="px-4 pt-5 pb-2">
            <JournalHeader
              year={year}
              month={month}
              onChangeMonth={handleChangeMonth}
              view={view}
              onChangeView={setView}
              onAddClick={() => setShowAddModal(true)}
              onReportClick={() => setShowReportModal(true)}
              entries={monthEntries}
            />
          </div>

          {/* 主内容区 */}
          <div className="px-4 pb-32">
            {view === 'plan' ? (
              <PlanView entries={monthEntries} onDeleteEntry={handleDeleteEntry} onUpdateEntry={handleUpdateEntry} />
            ) : (
              <MonthView entries={monthEntries} year={year} month={month} onDeleteEntry={handleDeleteEntry} />
            )}

            {/* 相册区域 - 仅在月度视图显示 */}
            {view === 'month' && (
            <section className="mt-10 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline text-lg text-[#1c1c1e]">照片相册</h3>
                <button
                  onClick={() => setShowAlbums(!showAlbums)}
                  className="flex items-center gap-1 text-[#8e8e93] hover:text-[#1c1c1e] transition-colors"
                >
                  <span className="font-label text-xs">
                    {showAlbums ? '收起' : `全部 ${albums.length}`}
                  </span>
                  <ArrowLeft
                    size={14}
                    className={`transition-transform ${showAlbums ? '-rotate-90' : 'rotate-180'}`}
                  />
                </button>
              </div>
              {showAlbums && (
                <AlbumList
                  albums={albums}
                  covers={covers}
                  onCreate={() => setShowCreateAlbumModal(true)}
                  onOpen={setCurrentAlbumId}
                />
              )}
              {!showAlbums && albums.length > 0 && (
                <AlbumList
                  albums={albums.slice(0, 4)}
                  covers={covers}
                  onCreate={() => setShowCreateAlbumModal(true)}
                  onOpen={setCurrentAlbumId}
                />
              )}
            </section>
            )}
          </div>
        </>
      )}

      {/* 弹窗 */}
      {showAddModal && (
        <AddEntryModal
          onSave={handleAddEntry}
          onCancel={() => {
            setShowAddModal(false)
            setSelectedCategory(null)
          }}
          initialCategory={selectedCategory}
        />
      )}

      {showReportModal && (
        <MonthlyReportModal
          entries={monthEntries}
          year={year}
          month={month}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showCreateAlbumModal && (
        <CreateAlbumModal
          onCreate={handleCreateAlbum}
          onCancel={() => setShowCreateAlbumModal(false)}
        />
      )}
    </div>
  )
}
