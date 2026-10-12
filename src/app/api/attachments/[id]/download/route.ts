import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isLiveSupabase = supabaseUrl && !supabaseUrl.includes('placeholder')

  if (isLiveSupabase) {
    try {
      const supabase = await createClient()

      // Fetch attachment metadata from database
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      const attachment = data as Tables<'attachments'> | null

      if (error || !attachment) {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        )
      }

      // Check security classification
      if (attachment.access === 'restricted') {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return NextResponse.json(
            { error: 'Unauthorized: Restricted attachment requires login.' },
            { status: 401 }
          )
        }

        // Verify authorized publisher role
        const { data: publisher } = await supabase
          .from('publishers')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (!publisher) {
          return NextResponse.json(
            { error: 'Forbidden: Access restricted to authorized publishers.' },
            { status: 403 }
          )
        }

        // Generate short-lived signed URL (valid for 60 seconds)
        const { data: signedData, error: signError } = await supabase.storage
          .from(attachment.storage_bucket)
          .createSignedUrl(attachment.storage_path, 60, {
            download: attachment.file_name,
          })

        if (signError || !signedData?.signedUrl) {
          return NextResponse.json(
            { error: 'Failed to generate secure access token' },
            { status: 500 }
          )
        }

        return NextResponse.redirect(signedData.signedUrl)
      }

      // Public file
      const { data: publicData } = supabase.storage
        .from(attachment.storage_bucket)
        .getPublicUrl(attachment.storage_path, {
          download: attachment.file_name,
        })

      return NextResponse.redirect(publicData.publicUrl)
    } catch {
      return NextResponse.json(
        { error: 'Internal server error while processing attachment' },
        { status: 500 }
      )
    }
  }

  // Fallback for demo / preview environment before database provisioning
  const dummyPdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000108 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
178
%%EOF`

  return new NextResponse(dummyPdfContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="document-${id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
