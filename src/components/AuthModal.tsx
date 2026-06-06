import { useState, useCallback } from 'react'
import { X, User as UserIcon, Lock, Mail, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { signIn, signUp } from '../services/supabase'

interface Props {
  onClose: () => void
}

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const resetForm = useCallback(() => {
    setUsername('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }, [])

  const switchMode = useCallback(() => {
    setMode(prev => prev === 'login' ? 'register' : 'login')
    resetForm()
  }, [resetForm])

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error } = await signIn(email.trim(), password)

      // Supabase 常见错误翻译
      if (error) {
        const rawMsg = error.message
        const msg = rawMsg.includes('Invalid login credentials')
          ? '邮箱或密码错误'
          : rawMsg.includes('Email not confirmed')
          ? '邮箱未验证，请检查收件箱点击确认链接，或联系管理员'
          : rawMsg.includes('User not found')
          ? '该邮箱未注册'
          : rawMsg
        setError(msg)
        setLoading(false)
        return
      }

      // session 为空：可能是 Cookie 被拦截、redirect URL 不匹配等
      if (!data?.session) {
        setError('登录成功但会话获取失败，请刷新页面重试')
        setLoading(false)
        return
      }

      setLoading(false)
      onClose()
    } catch (e: any) {
      setError(e.message || '登录异常，请稍后重试')
      setLoading(false)
    }
  }, [email, password, onClose])

  const handleRegister = useCallback(async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('请填写所有必填项')
      return
    }
    if (password.length < 6) {
      setError('密码至少6位')
      return
    }
    if (password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }
    if (!email.includes('@')) {
      setError('请输入有效的邮箱地址')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error } = await signUp(email.trim(), password, username.trim())
      if (error) {
        setError(error.message)
        return
      }

      // signUp 成功：检查是否直接返回了 session（无需邮件确认）
      if (data?.session) {
        return
      }

      // 尝试直接登录
      await new Promise(r => setTimeout(r, 500))
      const { data: loginData, error: loginError } = await signIn(email.trim(), password)

      if (loginError) {
        setError(loginError.message || '注册成功！但自动登录失败，请前往邮箱确认后手动登录')
        setMode('login')
        return
      }

      if (!loginData?.session) {
        setError('注册成功！请前往邮箱完成验证后登录')
        setMode('login')
        return
      }

      // loginData?.session 为真 → 登录成功
    } catch (e: any) {
      setError(e.message || '注册异常，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [username, email, password, confirmPassword, onClose])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      handleLogin()
    } else {
      handleRegister()
    }
  }, [mode, handleLogin, handleRegister])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-[380px] max-w-[calc(100vw-32px)] bg-white border border-neutral-200 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            {mode === 'login' ? (
              <>
                <LogIn size={18} className="text-neutral-600" />
                <h3 className="text-sm font-medium text-neutral-900">登录</h3>
              </>
            ) : (
              <>
                <UserPlus size={18} className="text-neutral-600" />
                <h3 className="text-sm font-medium text-neutral-900">注册账号</h3>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* Username (register only) */}
          {mode === 'register' && (
            <div>
              <label className="text-xs text-neutral-500 mb-1.5 block">用户名</label>
              <div className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 focus-within:border-neutral-400 transition-colors">
                <UserIcon size={15} className="text-neutral-400 flex-shrink-0" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="设置用户名"
                  className="flex-1 text-sm bg-transparent outline-none text-neutral-800 placeholder:text-neutral-300"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-xs text-neutral-500 mb-1.5 block">邮箱</label>
            <div className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 focus-within:border-neutral-400 transition-colors">
              <Mail size={15} className="text-neutral-400 flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 text-sm bg-transparent outline-none text-neutral-800 placeholder:text-neutral-300"
                autoFocus={mode === 'login'}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-neutral-500 mb-1.5 block">密码</label>
            <div className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 focus-within:border-neutral-400 transition-colors">
              <Lock size={15} className="text-neutral-400 flex-shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'login' ? '输入密码' : '设置密码（至少6位）'}
                className="flex-1 text-sm bg-transparent outline-none text-neutral-800 placeholder:text-neutral-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (register only) */}
          {mode === 'register' && (
            <div>
              <label className="text-xs text-neutral-500 mb-1.5 block">确认密码</label>
              <div className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 focus-within:border-neutral-400 transition-colors">
                <Lock size={15} className="text-neutral-400 flex-shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="flex-1 text-sm bg-transparent outline-none text-neutral-800 placeholder:text-neutral-300"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        {/* Switch mode */}
        <div className="px-5 pb-5 text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            {mode === 'login' ? '还没有账号？点击注册' : '已有账号？点击登录'}
          </button>
        </div>
      </div>
    </div>
  )
}
