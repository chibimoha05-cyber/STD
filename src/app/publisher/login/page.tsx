'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'

export default function PublisherLoginPage() {
  const router = useRouter()
  const { t } = useI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setErrorMsg(t('loginError'))
        setLoading(false)
        return
      }

      if (data.user) {
        // Verify user is registered in publishers table
        const { data: publisherData, error: pubError } = await supabase
          .from('publishers')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle()

        if (pubError || !publisherData) {
          // Sign out immediately if user is not in publishers table
          await supabase.auth.signOut()
          setErrorMsg(t('unauthorizedNotice'))
          setLoading(false)
          return
        }

        router.push('/publisher')
        router.refresh()
      }
    } catch {
      setErrorMsg(t('loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6 shadow-xl border border-line">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="grid place-items-center size-12 rounded-2xl bg-brand text-white mx-auto shadow-sm">
            <Icon name="shield" className="size-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            {t('publisherLogin')}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            {t('appSub')}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-danger-soft border border-danger-line text-danger text-sm">
            <Icon name="alert" className="size-5 shrink-0" />
            <p className="leading-snug">{errorMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              {t('email')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="publisher@department.edu"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              {t('password')}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full h-11 text-base mt-2"
          >
            {loading ? t('signingIn') : t('login')}
          </Button>
        </form>

        <div className="pt-4 border-t border-line text-center">
          <Link href="/">
            <Button size="sm" variant="ghost">
              <Icon name="chevL" className="size-4" />
              <span>{t('backToSite')}</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
