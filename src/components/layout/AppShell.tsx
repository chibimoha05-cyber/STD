'use client'

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { FilePreviewModal } from '@/components/preview/FilePreviewModal'
import { ContentEditorModal, type ContentEditorTarget } from '@/components/publisher/ContentEditorModal'
import { SlotEditorModal } from '@/components/publisher/SlotEditorModal'
import { CourseEditorModal } from '@/components/publisher/CourseEditorModal'
import { ScheduleExceptionModal } from '@/components/publisher/ScheduleExceptionModal'
import { UrgentBanner } from '@/components/layout/UrgentBanner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useI18n, type SaveItemPayload } from '@/lib/i18n/context'
import type { Slot, Course, ScheduleException } from '@/lib/data/initialData'

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPageBuffering, setIsPageBuffering] = useState(false)
  const [bufferProgress, setBufferProgress] = useState(0)

  const {
    publisher,
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
    t,
    L,
    lang,
    loadingData,
    saveItem,
    removeItem,
  } = useI18n()

  // Reset buffering state on route change
  React.useEffect(() => {
    setIsPageBuffering(false)
    setBufferProgress(0)
  }, [pathname])

  // Universal navigation throttle: intercepts internal link hops and introduces excruciating 3.5s buffering
  const handleGlobalLinkCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return

    // Exempt mobile bottom nav (handled with 3-tap accumulator)
    if (anchor.closest('[data-mobile-nav="true"]')) return

    const href = anchor.getAttribute('href')
    if (
      !href ||
      !href.startsWith('/') ||
      href.startsWith('#') ||
      href.startsWith('/api') ||
      href.startsWith('mailto:') ||
      href === pathname
    ) {
      return
    }

    if (isPageBuffering) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    e.preventDefault()
    e.stopPropagation()

    setIsPageBuffering(true)
    setBufferProgress(14)

    setTimeout(() => setBufferProgress(36), 700)
    setTimeout(() => setBufferProgress(62), 1700)
    setTimeout(() => setBufferProgress(88), 2600) // Stalls at 88%
    setTimeout(() => {
      setBufferProgress(100)
      setTimeout(() => {
        setIsPageBuffering(false)
        setBufferProgress(0)
        router.push(href)
      }, 350)
    }, 3500)
  }

  const handleSave = async (saved: SaveItemPayload, isNew: boolean) => {
    const res = await saveItem(saved, isNew)
    if (res.success) {
      setEditorTarget(null)
      showToast(t(isNew ? 'published' : 'saved'))
    } else {
      showToast(res.error || t('failed'))
    }
  }

  const handleDelete = async () => {
    if (deletingItem) {
      const res = await removeItem(deletingItem)
      if (res.success) {
        showToast(t('deleted'))
      } else {
        showToast(res.error || t('failed'))
      }
    }
    setDeletingItem(null)
  }

  return (
    <div
      className="min-h-screen flex flex-col relative"
      onClickCapture={handleGlobalLinkCapture}
    >
      {/* Top Crawling Progress Bar */}
      {isPageBuffering && (
        <div className="fixed top-0 inset-x-0 z-[100] h-1.5 bg-black/10 dark:bg-white/10 overflow-hidden pointer-events-none">
          <div
            className="h-full bg-brand transition-all ease-out duration-700 shadow-sm shadow-brand/50"
            style={{ width: `${bufferProgress}%` }}
          />
        </div>
      )}

      {/* Agonizing Initial Boot Overlay */}
      {loadingData && (
        <div className="fixed inset-0 z-[95] bg-surface/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 transition-opacity duration-300 select-none">
          <div className="size-10 border-3 border-brand border-t-transparent rounded-full animate-spin" />
          <div className="text-center space-y-1.5 px-4">
            <p className="text-sm font-semibold text-ink">{t('appName')}</p>
            <p className="text-xs text-muted animate-pulse">
              {lang === 'ar'
                ? 'جاري مزامنة قاعدة البيانات الأكاديمية...'
                : 'Synchronizing academic database pool...'}
            </p>
          </div>
        </div>
      )}

      <DesktopSidebar />
      <MobileHeader />

      <main
        className={`lg:ps-68 flex-1 flex flex-col transition-opacity duration-300 ${
          isPageBuffering ? 'opacity-30 pointer-events-none cursor-wait' : ''
        }`}
      >
        <UrgentBanner />

        {publisher && (
          <div className="hidden lg:flex items-center gap-2 bg-accent-soft text-accent-ink text-[13px] px-8 h-9 border-b border-warn-line font-medium">
            <Icon name="shield" className="size-4" />
            <span>{t('publisherMode')}</span>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-28 lg:pb-12 flex-1 w-full">
          {children}
        </div>
      </main>

      <MobileBottomNav />

      {/* Global Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        isPublisher={publisher}
      />

      {/* Global Content Editor Modal (Resources, Activities, Reports) */}
      {editorTarget &&
        (editorTarget.kind === 'resource' ||
          editorTarget.kind === 'activity' ||
          editorTarget.kind === 'report') && (
          <ContentEditorModal
            target={editorTarget as ContentEditorTarget}
            courses={courses}
            onClose={() => setEditorTarget(null)}
            onSave={handleSave}
          />
        )}

      {/* Global Slot Editor Modal */}
      {editorTarget && editorTarget.kind === 'slot' && (
        <SlotEditorModal
          slot={editorTarget.item as Slot | undefined}
          initialCourseId={editorTarget.courseId}
          courses={courses}
          onClose={() => setEditorTarget(null)}
          onSaved={() => setEditorTarget(null)}
        />
      )}

      {/* Global Course Editor Modal */}
      {editorTarget && editorTarget.kind === 'course' && (
        <CourseEditorModal
          course={editorTarget.item as Course | undefined}
          onClose={() => setEditorTarget(null)}
          onSaved={() => setEditorTarget(null)}
        />
      )}

      {/* Global Schedule Exception Modal */}
      {editorTarget && editorTarget.kind === 'exception' && (
        <ScheduleExceptionModal
          slot={
            editorTarget.item
              ? slots.find((s) => s.id === (editorTarget.item as ScheduleException).slotId) ||
                slots[0]
              : slots.find((s) => s.id === editorTarget.slotId) || slots[0]
          }
          course={courses.find(
            (c) =>
              c.id ===
              (slots.find((s) => s.id === editorTarget.slotId)?.courseId ||
                slots[0]?.courseId)
          )}
          exception={editorTarget.item as ScheduleException | undefined}
          onClose={() => setEditorTarget(null)}
          onSaved={() => setEditorTarget(null)}
        />
      )}

      {/* Global Delete Confirmation Modal */}
      <Modal
        open={!!deletingItem}
        size="sm"
        onClose={() => setDeletingItem(null)}
        title={t('confirmDelete')}
        footer={
          <>
            <Button onClick={() => setDeletingItem(null)}>{t('cancel')}</Button>
            <Button variant="danger" icon="trash" onClick={handleDelete}>
              {t('delete')}
            </Button>
          </>
        }
      >
        <div className="flex gap-4">
          <span className="grid place-items-center size-11 rounded-2xl bg-danger-soft text-danger shrink-0">
            <Icon name="alert" className="size-6" />
          </span>
          <p className="text-sm text-muted leading-relaxed">
            {deletingItem &&
              t('confirmDeleteMsg', {
                t:
                  'title' in deletingItem.item
                    ? L(deletingItem.item.title)
                    : 'name' in deletingItem.item
                    ? L(deletingItem.item.name)
                    : 'room' in deletingItem.item
                    ? `${deletingItem.item.room} (${deletingItem.item.start})`
                    : '',
              })}
          </p>
        </div>
      </Modal>

      {/* Global Toast */}
      {toastMsg && (
        <div className="rise fixed z-[60] bottom-20 lg:bottom-6 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 bg-ink text-paper text-sm font-semibold px-4 h-11 rounded-xl shadow-2xl inline-flex items-center gap-2.5 border border-white/10">
          <Icon name="check" className="size-4 text-success" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}
