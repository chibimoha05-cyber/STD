'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react'
import { useRouter } from 'next/navigation'
import { locale, tr, type Key, type Lang } from './dict'
import type {
  Course,
  Slot,
  FileItem,
  Resource,
  Activity,
  Report,
  ScheduleException,
} from '@/lib/data/initialData'
import {
  initialCourses,
  initialSlots,
} from '@/lib/data/initialData'
import {
  fetchFullPlatformData,
} from '@/lib/data/academic'
import {
  saveResourceAction,
  deleteResourceAction,
  saveActivityAction,
  deleteActivityAction,
  saveReportAction,
  deleteReportAction,
  saveSlotAction,
  deleteSlotAction,
  saveCourseAction,
  deleteCourseAction,
  saveScheduleExceptionAction,
  deleteScheduleExceptionAction,
  type SaveSlotInput,
  type SaveCourseInput,
  type SaveScheduleExceptionInput,
} from '@/lib/actions/academic'
import { createClient } from '@/lib/supabase/client'

export type LocalizedString = { ar: string; en: string }

export type EditableItem =
  | { kind: 'resource'; item: Resource }
  | { kind: 'activity'; item: Activity }
  | { kind: 'report'; item: Report }
  | { kind: 'slot'; item: Slot }
  | { kind: 'course'; item: Course }
  | { kind: 'exception'; item: ScheduleException }

export type EditorTarget = {
  kind: 'resource' | 'activity' | 'report' | 'slot' | 'course' | 'exception'
  item?: Resource | Activity | Report | Slot | Course | ScheduleException
  courseId?: string
  slotId?: string
}

export interface SaveItemPayload {
  kind: 'resource' | 'activity' | 'report'
  item: {
    id?: string
    courseId: string
    title: { ar: string; en: string }
    type?: string
    kind?: string
    category?: string
    due?: number
    time?: string
    place?: { ar: string; en: string }
    desc?: { ar: string; en: string }
    author?: { ar: string; en: string }
    files?: FileItem[]
  }
  attachmentIds?: string[]
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
  logout: () => Promise<void>
  previewFile: FileItem | null
  setPreviewFile: (f: FileItem | null) => void
  editorTarget: EditorTarget | null
  setEditorTarget: (target: EditorTarget | null) => void
  deletingItem: EditableItem | null
  setDeletingItem: (item: EditableItem | null) => void
  toastMsg: string | null
  showToast: (m: string) => void

  // Platform content state
  courses: Course[]
  slots: Slot[]
  resources: Resource[]
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>
  activities: Activity[]
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>
  reports: Report[]
  setReports: React.Dispatch<React.SetStateAction<Report[]>>
  exceptions: ScheduleException[]
  setExceptions: React.Dispatch<React.SetStateAction<ScheduleException[]>>

  loadingData: boolean
  refreshData: () => Promise<void>

  saveItem: (entry: SaveItemPayload, isNew: boolean) => Promise<{ success: boolean; error?: string }>
  removeItem: (entry: EditableItem) => Promise<{ success: boolean; error?: string }>
  saveSlot: (input: SaveSlotInput) => Promise<{ success: boolean; error?: string }>
  removeSlot: (id: string) => Promise<{ success: boolean; error?: string }>
  saveCourse: (input: SaveCourseInput) => Promise<{ success: boolean; error?: string }>
  removeCourse: (id: string) => Promise<{ success: boolean; error?: string }>
  saveException: (input: SaveScheduleExceptionInput) => Promise<{ success: boolean; error?: string }>
  removeException: (id: string) => Promise<{ success: boolean; error?: string }>
}


const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({
  children,
  initialLang = 'ar',
}: {
  children: React.ReactNode
  initialLang?: Lang
}) {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('app_lang') as Lang | null
      if (savedLang === 'ar' || savedLang === 'en') {
        return savedLang
      }
    }
    return initialLang
  })
  const [dark, setDarkState] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('app_theme')
      if (savedTheme) {
        return savedTheme === 'dark'
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const [publisher, setPublisherState] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null)
  const [deletingItem, setDeletingItem] = useState<EditableItem | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Real database items state
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [resources, setResources] = useState<Resource[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [exceptions, setExceptions] = useState<ScheduleException[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.setTimeout(() => setToastMsg(null), 2600)
  }, [])

  const refreshData = useCallback(async () => {
    try {
      const data = await fetchFullPlatformData()
      if (data.courses.length > 0) setCourses(data.courses)
      if (data.slots.length > 0) setSlots(data.slots)
      setResources(data.resources)
      setActivities(data.activities)
      setReports(data.reports)
      setExceptions(data.exceptions)
    } catch (err) {
      console.error('[I18nProvider] Failed to refresh academic data:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  // Check publisher authentication status from Supabase
  const checkPublisherStatus = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setPublisherState(false)
        return
      }

      const { data: pubData, error } = await supabase
        .from('publishers')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!error && pubData) {
        setPublisherState(true)
      } else {
        setPublisherState(false)
      }
    } catch {
      setPublisherState(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setPublisherState(false)
      showToast(tr(lang, 'visitor'))
      router.push('/')
    } catch (err) {
      console.error('[I18nProvider] SignOut error:', err)
    }
  }, [lang, router, showToast])

  useEffect(() => {
    let active = true

    const loadInitialState = async () => {
      try {
        const data = await fetchFullPlatformData()
        if (active) {
          if (data.courses.length > 0) setCourses(data.courses)
          if (data.slots.length > 0) setSlots(data.slots)
          setResources(data.resources)
          setActivities(data.activities)
          setReports(data.reports)
          setExceptions(data.exceptions)
          setLoadingData(false)
        }
      } catch (err) {
        console.error('[I18nProvider] Initial load error:', err)
      }

      if (active) {
        await checkPublisherStatus()
      }
    }

    void loadInitialState()

    // Listen to Supabase auth state changes
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkPublisherStatus()
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [checkPublisherStatus])

  const saveItem = useCallback(
    async (
      entry: SaveItemPayload,
      isNew: boolean
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const attachmentIds = entry.attachmentIds || entry.item.files?.map((f) => f.id) || []

        if (entry.kind === 'resource') {
          const res = await saveResourceAction({
            id: isNew ? undefined : entry.item.id,
            courseId: entry.item.courseId,
            type: (entry.item.type as Resource['type']) || 'notes',
            titleAr: entry.item.title.ar,
            titleEn: entry.item.title.en,
            attachmentIds,
          })

          if (!res.success) {
            return { success: false, error: res.error }
          }
        } else if (entry.kind === 'activity') {
          const today = new Date()
          const dueOffsetDays = entry.item.due ?? 3
          const dueDateObj = new Date(today.getTime() + dueOffsetDays * 86400000)
          const dueDateStr = dueDateObj.toISOString().split('T')[0]

          const res = await saveActivityAction({
            id: isNew ? undefined : entry.item.id,
            courseId: entry.item.courseId,
            kind: (entry.item.kind as Activity['kind']) || 'exam',
            titleAr: entry.item.title.ar,
            titleEn: entry.item.title.en,
            dueDate: dueDateStr,
            dueTime: entry.item.time || '23:59',
            placeAr: entry.item.place?.ar,
            placeEn: entry.item.place?.en,
            descAr: entry.item.desc?.ar,
            descEn: entry.item.desc?.en,
            attachmentIds,
          })

          if (!res.success) {
            return { success: false, error: res.error }
          }
        } else if (entry.kind === 'report') {
          const res = await saveReportAction({
            id: isNew ? undefined : entry.item.id,
            courseId: entry.item.courseId,
            category: (entry.item.category as Report['category']) || 'course',
            titleAr: entry.item.title.ar,
            titleEn: entry.item.title.en,
            authorAr: entry.item.author?.ar,
            authorEn: entry.item.author?.en,
            attachmentIds,
          })

          if (!res.success) {
            return { success: false, error: res.error }
          }
        }

        await refreshData()
        return { success: true }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown save error'
        return { success: false, error: errorMsg }
      }
    },
    [refreshData]
  )

  const removeItem = useCallback(
    async (entry: EditableItem): Promise<{ success: boolean; error?: string }> => {
      try {
        if (entry.kind === 'resource') {
          const res = await deleteResourceAction(entry.item.id)
          if (!res.success) return { success: false, error: res.error }
        } else if (entry.kind === 'activity') {
          const res = await deleteActivityAction(entry.item.id)
          if (!res.success) return { success: false, error: res.error }
        } else if (entry.kind === 'report') {
          const res = await deleteReportAction(entry.item.id)
          if (!res.success) return { success: false, error: res.error }
        } else if (entry.kind === 'slot') {
          const res = await deleteSlotAction(entry.item.id)
          if (!res.success) return { success: false, error: res.error }
        } else if (entry.kind === 'course') {
          const res = await deleteCourseAction(entry.item.id)
          if (!res.success) return { success: false, error: res.error }
        } else if (entry.kind === 'exception') {
          const res = await deleteScheduleExceptionAction(entry.item.id)
          if (!res.success) return { success: false, error: res.error }
        }

        await refreshData()
        return { success: true }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown delete error'
        return { success: false, error: errorMsg }
      }
    },
    [refreshData]
  )

  const saveSlot = useCallback(
    async (input: SaveSlotInput): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await saveSlotAction(input)
        if (!res.success) return { success: false, error: res.error }
        await refreshData()
        return { success: true }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to save slot'
        return { success: false, error: errorMsg }
      }
    },
    [refreshData]
  )

  const removeSlot = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await deleteSlotAction(id)
        if (!res.success) return { success: false, error: res.error }
        await refreshData()
        return { success: true }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete slot'
        return { success: false, error: errorMsg }
      }
    },
    [refreshData]
  )

  const saveCourse = useCallback(
    async (input: SaveCourseInput): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await saveCourseAction(input)
        if (!res.success) return { success: false, error: res.error }
        await refreshData()
        return { success: true }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to save course'
        return { success: false, error: errorMsg }
      }
    },
    [refreshData]
  )

  const removeCourse = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await deleteCourseAction(id)
        if (!res.success) return { success: false, error: res.error }
        await refreshData()
        return { success: true }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete course'
        return { success: false, error: errorMsg }
      }
    },
    [refreshData]
  )

  const saveException = useCallback(
    async (input: SaveScheduleExceptionInput): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await saveScheduleExceptionAction(input)
        if (!res.success) return { success: false, error: res.error }
        await refreshData()
        return { success: true }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to save exception'
        return { success: false, error: errorMsg }
      }
    },
    [refreshData]
  )

  const removeException = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await deleteScheduleExceptionAction(id)
        if (!res.success) return { success: false, error: res.error }
        await refreshData()
        return { success: true }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete exception'
        return { success: false, error: errorMsg }
      }
    },
    [refreshData]
  )

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
  }, [])

  const toggleTheme = useCallback(() => {
    setDark(!dark)
  }, [dark, setDark])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.classList.toggle('dark', dark)
  }, [lang, dark])

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
      logout,
      previewFile,
      setPreviewFile,
      editorTarget,
      setEditorTarget,
      deletingItem,
      setDeletingItem,
      toastMsg,
      showToast,
      courses,
      slots,
      resources,
      setResources,
      activities,
      setActivities,
      reports,
      setReports,
      exceptions,
      setExceptions,
      loadingData,
      refreshData,
      saveItem,
      removeItem,
      saveSlot,
      removeSlot,
      saveCourse,
      removeCourse,
      saveException,
      removeException,
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
      logout,
      previewFile,
      setPreviewFile,
      editorTarget,
      setEditorTarget,
      deletingItem,
      setDeletingItem,
      toastMsg,
      showToast,
      courses,
      slots,
      resources,
      activities,
      reports,
      exceptions,
      loadingData,
      refreshData,
      saveItem,
      removeItem,
      saveSlot,
      removeSlot,
      saveCourse,
      removeCourse,
      saveException,
      removeException,
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
