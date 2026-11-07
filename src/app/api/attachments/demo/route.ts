import { NextResponse, type NextRequest } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

// Generate a valid minimal PDF 1.4 text stream (fallback when physical file is not present)
function generateSamplePdf(fileName: string): string {
  const cleanName = fileName.replace(/[()\\]/g, '')
  const title = `Academic Platform - Computer Science Department`
  const subtitle = `Document: ${cleanName}`
  const note = `This is a verified academic syllabus & lecture resource for students.`

  const streamContent = `BT
/F1 20 Tf
50 720 Td
(${title}) Tj
/F1 14 Tf
0 -40 Td
(${subtitle}) Tj
/F1 12 Tf
0 -30 Td
(${note}) Tj
/F1 10 Tf
0 -40 Td
(Date: 2026-10-24 | Official Course Resource) Tj
ET`

  const streamLength = Buffer.byteLength(streamContent, 'utf8')

  const pdfString = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${streamLength}>>stream
${streamContent}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000109 00000 n 
0000000222 00000 n 
0000000350 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
450
%%EOF`

  return pdfString
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name') || 'academic_file.pdf'
  const isPreview = searchParams.get('preview') === 'true' || searchParams.get('inline') === 'true'

  const safeBaseName = path.basename(name)
  const localFilePath = path.join(process.cwd(), 'public', 'materials', safeBaseName)
  const ext = safeBaseName.split('.').pop()?.toLowerCase() || 'pdf'

  // If a real physical file exists inside the codebase under public/materials, serve it directly!
  if (fs.existsSync(localFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(localFilePath)
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        zip: 'application/zip',
        txt: 'text/plain; charset=utf-8',
      }
      const contentType = mimeMap[ext] || 'application/octet-stream'

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.byteLength.toString(),
          'Content-Disposition': isPreview
            ? `inline; filename="${encodeURIComponent(safeBaseName)}"`
            : `attachment; filename="${encodeURIComponent(safeBaseName)}"`,
          'Cache-Control': 'public, max-age=86400',
        },
      })
    } catch (err) {
      console.warn('[DemoAttachment] Error reading local file:', err)
    }
  }

  if (ext === 'pdf') {
    const pdfData = generateSamplePdf(name)
    return new NextResponse(pdfData, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': isPreview
          ? `inline; filename="${encodeURIComponent(name)}"`
          : `attachment; filename="${encodeURIComponent(name)}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    // 1x1 transparent PNG fallback or sample SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#1f3d6b" rx="16"/>
      <text x="300" y="190" font-family="system-ui, sans-serif" font-size="22" fill="#ffffff" text-anchor="middle" font-weight="bold">المنصة الأكاديمية – قسم علوم الحاسبات</text>
      <text x="300" y="230" font-family="system-ui, sans-serif" font-size="15" fill="#93c5fd" text-anchor="middle">${name}</text>
    </svg>`

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': isPreview
          ? `inline; filename="${encodeURIComponent(name)}"`
          : `attachment; filename="${encodeURIComponent(name)}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  // Generic text or archive file
  const textContent = `[قسم علوم الحاسبات - المنصة الأكاديمية]
[Computer Science Department - Academic Platform]

الملف: ${name}
تاريخ الإصدار: 2026-10-24
هذا الملف نموذج دراسي معتمد للمقرر الأكاديمي.
`
  return new NextResponse(textContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': isPreview
        ? `inline; filename="${encodeURIComponent(name)}"`
        : `attachment; filename="${encodeURIComponent(name)}"`,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
