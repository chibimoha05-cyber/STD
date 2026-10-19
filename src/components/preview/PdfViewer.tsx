'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { FileIcon } from '@/components/ui/FileIcon'

interface PdfViewerProps {
  url: string
  fileName: string
  fileSize?: string
  access?: 'public' | 'restricted'
  onOpenExternal: () => void
  onDownload: () => void
}

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string }
      getDocument: (params: string | { url: string; withCredentials?: boolean }) => {
        promise: Promise<{
          numPages: number
          getPage: (pageNumber: number) => Promise<{
            getViewport: (params: { scale: number }) => { width: number; height: number }
            render: (params: {
              canvasContext: CanvasRenderingContext2D
              viewport: { width: number; height: number }
            }) => { promise: Promise<void> }
          }>
        }>
      }
    }
  }
}

export function PdfViewer({
  url,
  fileName,
  fileSize,
  access = 'public',
  onOpenExternal,
  onDownload,
}: PdfViewerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)
  const [loading, setLoading] = useState(true)
  const [renderError, setRenderError] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null)

  // Detect mobile user agent or small viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      const smallScreen = window.innerWidth < 768
      setIsMobile(mobileUA || smallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // On mobile: load PDF.js dynamically and render pages onto Canvas
  useEffect(() => {
    if (!isMobile) return

    let isMounted = true

    const initPdfJs = async () => {
      setLoading(true)
      setRenderError(false)
      try {
        if (!window.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById('pdfjs-script')
            if (existingScript) {
              existingScript.addEventListener('load', () => resolve())
              existingScript.addEventListener('error', () => reject())
              return
            }

            const script = document.createElement('script')
            script.id = 'pdfjs-script'
            script.src =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            script.async = true
            script.onload = () => {
              if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
                resolve()
              } else {
                reject(new Error('PDF.js failed to initialize'))
              }
            }
            script.onerror = () => reject(new Error('Failed to load PDF.js script'))
            document.head.appendChild(script)
          })
        } else if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        }

        if (!isMounted) return

        const loadingTask = window.pdfjsLib!.getDocument({
          url,
          withCredentials: true,
        })

        const pdf = await loadingTask.promise
        if (!isMounted) return

        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setPageNumber(1)
        setLoading(false)
      } catch (err) {
        console.warn('[PdfViewer] PDF.js rendering fell back:', err)
        if (isMounted) {
          setRenderError(true)
          setLoading(false)
        }
      }
    }

    initPdfJs()

    return () => {
      isMounted = false
    }
  }, [isMobile, url])

  // Render current page onto canvas
  useEffect(() => {
    if (!isMobile || !pdfDocRef.current || !canvasRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTask: any = null

    const renderPage = async () => {
      try {
        const page = await pdfDocRef.current.getPage(pageNumber)
        const canvas = canvasRef.current
        if (!canvas) return

        const context = canvas.getContext('2d')
        if (!context) return

        // Compute viewport scaled to device pixel ratio for maximum sharpness
        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const containerWidth =
          containerRef.current?.clientWidth || window.innerWidth - 32
        const fitScale = (containerWidth / unscaledViewport.width) * scale
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

        const viewport = page.getViewport({ scale: fitScale * dpr })

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${viewport.width / dpr}px`
        canvas.style.height = `${viewport.height / dpr}px`

        const renderContext = {
          canvasContext: context,
          viewport,
        }

        renderTask = page.render(renderContext)
        if (renderTask && renderTask.promise) {
          await renderTask.promise
        }
      } catch {
        // Render was cancelled or superseded
      }
    }

    renderPage()

    return () => {
      if (renderTask && renderTask.cancel) {
        renderTask.cancel()
      }
    }
  }, [isMobile, pageNumber, scale])

  // --------------------------------------------------------------------------
  // Mobile Render Mode
  // --------------------------------------------------------------------------
  if (isMobile) {
    if (renderError) {
      // Elegant mobile card if PDF.js is unavailable or blocked
      return (
        <div className="bg-sunken rounded-2xl p-6 text-center space-y-4 my-2 border border-line">
          <div className="size-16 rounded-2xl bg-surface border border-line grid place-items-center mx-auto shadow-sm">
            <FileIcon name={fileName} size="lg" />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-base text-ink" dir="ltr">
              {fileName}
            </h3>
            {fileSize && (
              <p className="text-xs text-muted">
                {fileSize} • {access === 'restricted' ? 'مقيّد' : 'عام'}
              </p>
            )}
          </div>

          <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
            المتصفحات في الهواتف تدعم فتح وقراءة ملفات PDF مباشرة بملء الشاشة مع التكبير السلس.
          </p>

          <div className="flex flex-col gap-2 pt-2 max-w-xs mx-auto">
            <Button
              variant="primary"
              size="md"
              icon="external"
              className="w-full justify-center shadow-sm"
              onClick={onOpenExternal}
            >
              فتح المستند بملء الشاشة
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon="download"
              className="w-full justify-center"
              onClick={onDownload}
            >
              تنزيل الملف
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div
        ref={containerRef}
        className="w-full flex flex-col items-center bg-sunken rounded-xl overflow-hidden border border-line"
      >
        {/* Mobile Toolbar */}
        <div className="w-full flex items-center justify-between px-3 py-2 bg-surface border-b border-line text-xs font-medium">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              icon="chevR"
              title="السابق"
              disabled={pageNumber <= 1 || loading}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              className="!px-2"
            />
            <span className="text-ink font-semibold px-1">
              {numPages > 0 ? `${pageNumber} / ${numPages}` : '—'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              icon="chevL"
              title="التالي"
              disabled={pageNumber >= numPages || loading}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              className="!px-2"
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              title="تصغير"
              disabled={scale <= 0.8 || loading}
              onClick={() => setScale((s) => Math.max(0.8, s - 0.2))}
              className="!px-2 font-mono text-sm"
            >
              -
            </Button>
            <span className="text-[11px] text-muted font-mono">
              {Math.round(scale * 100)}%
            </span>
            <Button
              size="sm"
              variant="ghost"
              title="تكبير"
              disabled={scale >= 2.0 || loading}
              onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
              className="!px-2 font-mono text-sm"
            >
              +
            </Button>
            <div className="w-px h-4 bg-line mx-1" />
            <Button
              size="sm"
              variant="ghost"
              icon="external"
              title="فتح بملء الشاشة"
              onClick={onOpenExternal}
              className="!px-2"
            />
          </div>
        </div>

        {/* Canvas Display */}
        <div className="w-full min-h-[50vh] max-h-[70vh] overflow-auto flex items-start justify-center p-2">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="size-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <p className="text-xs text-muted font-medium">جارٍ معالجة صفحات PDF…</p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`rounded shadow-md transition-opacity duration-200 ${
              loading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // Desktop Render Mode: Native Iframe Viewer
  // --------------------------------------------------------------------------
  return (
    <div className="w-full h-[65vh] sm:h-[75vh] rounded-xl overflow-hidden border border-line bg-surface shadow-inner relative">
      {!iframeLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface gap-3 z-10">
          <div className="size-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-xs text-muted font-medium">جارٍ تحميل الملف…</p>
        </div>
      )}
      <iframe
        src={`${url}#toolbar=1&navpanes=0`}
        className="w-full h-full border-0"
        title={fileName}
        onLoad={() => setIframeLoaded(true)}
        onError={() => setRenderError(true)}
      />
    </div>
  )
}
