import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseClient, isTestMode } from '@/lib/actions/attachment-client'
import type { Tables } from '@/lib/supabase/types'
import { isValidUUID } from '@/lib/utils/uuid'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || !isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid attachment ID format. Must be a valid UUID.' },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isConfigured =
    Boolean(supabaseUrl && !supabaseUrl.includes('placeholder')) || isTestMode()

  if (isConfigured) {
    try {
      const supabase = await getSupabaseClient()

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

      // Public file - verify bucket consistency
      if (attachment.storage_bucket !== 'attachments-public') {
        console.error(
          `[Download API] Classification mismatch: access is public but storage_bucket is ${attachment.storage_bucket}`
        )
        return NextResponse.json(
          { error: 'Attachment configuration error' },
          { status: 500 }
        )
      }

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

  // Fallback if database service is not configured
  return NextResponse.json(
    { error: 'Database service is not configured.' },
    { status: 503 }
  )
}
