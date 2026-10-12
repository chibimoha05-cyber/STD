'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react'
import { dict, locale, tr, type Key, type Lang } from './dict'
import type {
  FileItem,
  Resource,
  Activity,
  Report,
  ScheduleException,
} from '@/lib/data/initialData'
import {
  initialResources,
  initialActivities,
  initialReports,
  initialExceptions,
} from '@/lib/data/initialData'

export type LocalizedString = { ar: string; en: string }

export type EditableItem =
  | { kind: 'resource'; item: Resource }
  | { kind: 'activity'; item: Activity }
  | { kind: 'report'; item: Report }

export type EditorTarget = {
  kind: 'resource' | 'activity' | 'report'
  item?: any
  courseId?: string
}

interface I18nContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: Key, vars?: Record<string, string | number>) => string
  L: (obj?: LocalizedString | null) => string
  dark: boolean
  setDark: (d: boolean) => void
  toggleTheme: () => void
  locale: string
  publisher: boolean
  setPublisher: (p: boolean) => void
  previewFile: FileItem | null
  setPreviewFile: (f: FileItem | null) => void
  editorTarget: EditorTarget | null
  setEditorTarget: (target: EditorTarget | null) => void
  deletingItem: EditableItem | null
  setDeletingItem: (item: EditableItem | null) => void
  toastMsg: string | null
  showToast: (m: string) => void

  // Central platform content state
  resources: Resource[]
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>
  activities: Activity[]
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>
  reports: Report[]
  setReports: React.Dispatch<React.SetStateAction<Report[]>>
  exceptions: ScheduleException[]
  setExceptions: React.Dispatch<React.SetStateAction<ScheduleException[]>>

  saveItem: (entry: { kind: 'resource' | 'activity' | 'report'; item: any }, isNew: boolean) => void
  removeItem: (entry: EditableItem) => void
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({
  children,
  initialLang = 'ar',
}: {
  children: React.ReactNode
  initialLang?: Lang
}) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const [dark, setDarkState] = useState(false)
  const [publisher, setPublisherState] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null)
  const [deletingItem, setDeletingItem] = useState<EditableItem | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Real items state initialized empty (zero dummy content)
  const [resources, setResources] = useState<Resource[]>(initialResources)
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [exceptions, setExceptions] = useState<ScheduleException[]>(initialExceptions)

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.setTimeout(() => setToastMsg(null), 2600)
  }, [])

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang | null
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      setLangState(savedLang)
    }

    const savedTheme = localStorage.getItem('app_theme')
    if (savedTheme) {
      setDarkState(savedTheme === 'dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setDarkState(prefersDark)
    }

    const savedPub = localStorage.getItem('app_publisher')
    if (savedPub === 'true') {
      setPublisherState(true)
    }

    // Load real persistent resources / activities / reports from localStorage
    try {
      const r = localStorage.getItem('app_real_resources')
      if (r) setResources(JSON.parse(r))
      const a = localStorage.getItem('app_real_activities')
      if (a) setActivities(JSON.parse(a))
      const rep = localStorage.getItem('app_real_reports')
      if (rep) setReports(JSON.parse(rep))
      const ex = localStorage.getItem('app_real_exceptions')
      if (ex) setExceptions(JSON.parse(ex))
    } catch (_) {}

    // Clean up any legacy dummy keys if present
    localStorage.removeItem('app_dummy_seeded')

    setMounted(true)
  }, [])

  // Persist real items on changes
  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem('app_real_resources', JSON.stringify(resources))
    } catch (_) {}
  }, [resources, mounted])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem('app_real_activities', JSON.stringify(activities))
    } catch (_) {}
  }, [activities, mounted])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem('app_real_reports', JSON.stringify(reports))
    } catch (_) {}
  }, [reports, mounted])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem('app_real_exceptions', JSON.stringify(exceptions))
    } catch (_) {}
  }, [exceptions, mounted])

  const saveItem = useCallback(
    (entry: { kind: 'resource' | 'activity' | 'report'; item: any }, isNew: boolean) => {
      if (entry.kind === 'resource') {
        setResources((prev) =>
          isNew
            ? [entry.item, ...prev]
            : prev.map((x) => (x.id === entry.item.id ? entry.item : x))
        )
      } else if (entry.kind === 'activity') {
        setActivities((prev) =>
          isNew
            ? [entry.item, ...prev]
            : prev.map((x) => (x.id === entry.item.id ? entry.item : x))
        )
      } else if (entry.kind === 'report') {
        setReports((prev) =>
          isNew
            ? [entry.item, ...prev]
            : prev.map((x) => (x.id === entry.item.id ? entry.item : x))
        )
      }
    },
    []
  )

  const removeItem = useCallback((entry: EditableItem) => {
    if (entry.kind === 'resource') {
      setResources((prev) => prev.filter((x) => x.id !== entry.item.id))
    } else if (entry.kind === 'activity') {
      setActivities((prev) => prev.filter((x) => x.id !== entry.item.id))
    } else if (entry.kind === 'report') {
      setReports((prev) => prev.filter((x) => x.id !== entry.item.id))
    }
  }, [])

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem('app_lang', newLang)
    document.documentElement.lang = newLang
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
  }, [])

  const setDark = useCallback((isDark: boolean) => {
    setDarkState(isDark)
    localStorage.setItem('app_theme', isDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const setPublisher = useCallback((p: boolean) => {
    setPublisherState(p)
    localStorage.setItem('app_publisher', p ? 'true' : 'false')
  }, [])

  const toggleTheme = useCallback(() => {
    setDark(!dark)
  }, [dark, setDark])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.classList.toggle('dark', dark)
  }, [lang, dark, mounted])

  const t = useCallback(
    (k: Key, vars?: Record<string, string | number>) => {
      return tr(lang, k, vars)
    },
    [lang]
  )

  const L = useCallback(
    (obj?: LocalizedString | null) => {
      if (!obj) return ''
      return obj[lang] || obj.ar || obj.en || ''
    },
    [lang]
  )

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      L,
      dark,
      setDark,
      toggleTheme,
      locale: locale(lang),
      publisher,
      setPublisher,
      previewFile,
      setPreviewFile,
      editorTarget,
      setEditorTarget,
      deletingItem,
      setDeletingItem,
      toastMsg,
      showToast,
      resources,
      setResources,
      activities,
      setActivities,
      reports,
      setReports,
      exceptions,
      setExceptions,
      saveItem,
      removeItem,
    }),
    [
      lang,
      setLang,
      t,
      L,
      dark,
      setDark,
      toggleTheme,
      publisher,
      setPublisher,
      previewFile,
      setPreviewFile,
      editorTarget,
      setEditorTarget,
      deletingItem,
      setDeletingItem,
      toastMsg,
      showToast,
      resources,
      activities,
      reports,
      exceptions,
      saveItem,
      removeItem,
    ]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
