'use client'

import React from 'react'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { FilePreviewModal } from '@/components/preview/FilePreviewModal'
import { ContentEditorModal } from '@/components/publisher/ContentEditorModal'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { initialCourses } from '@/lib/data/initialData'
import { useI18n } from '@/lib/i18n/context'

export function AppShell({ children }: { children: React.ReactNode }) {
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
    t,
    L,
    saveItem,
    removeItem,
  } = useI18n()

  const handleSave = (saved: any, isNew: boolean) => {
    saveItem(saved, isNew)
    setEditorTarget(null)
    showToast(t(isNew ? 'published' : 'saved'))
  }

  const handleDelete = () => {
    if (deletingItem) {
      removeItem(deletingItem)
    }
    setDeletingItem(null)
    showToast(t('deleted'))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DesktopSidebar />
      <MobileHeader />

      <main className="lg:ps-68 flex-1">
        {publisher && (
          <div className="hidden lg:flex items-center gap-2 bg-accent-soft text-accent-ink text-[13px] px-8 h-9 border-b border-warn-line font-medium">
            <Icon name="shield" className="size-4" />
            <span>
              {t('publisherMode')} — {t('prototypeNote')}
            </span>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-28 lg:pb-12">
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

      {/* Global Content Editor Modal */}
      {editorTarget && (
        <ContentEditorModal
          target={editorTarget as any}
          courses={initialCourses}
          onClose={() => setEditorTarget(null)}
          onSave={handleSave}
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
              t('confirmDeleteMsg', { t: L(deletingItem.item?.title) })}
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
