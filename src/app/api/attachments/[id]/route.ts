import { NextResponse, type NextRequest } from 'next/server'
import {
  deleteAttachment,
  reclassifyAttachment,
} from '@/lib/actions/attachments'
import { isValidUUID } from '@/lib/utils/uuid'

/**
 * DELETE /api/attachments/[id]
 * Securely deletes an attachment from database first, then purges storage.
 */
export async function DELETE(
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

  const result = await deleteAttachment(id)

  if (!result.success) {
    if (result.error?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (result.error?.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Forbidden: Publisher permissions required.' },
        { status: 403 }
      )
    }
    if (result.error?.includes('not found')) {
      return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 })
    }

    // Sanitize any internal database / storage error messages to prevent credential or schema leaks
    console.error(`[API DELETE /attachments/${id}] Deletion error:`, result.error)
    return NextResponse.json(
      { error: 'Failed to delete attachment. An internal server error occurred.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    id,
    storageCleaned: result.data?.storageCleaned ?? false,
    message: result.error || 'Attachment successfully deleted.',
  })
}

/**
 * PATCH /api/attachments/[id]
 * Securely reclassifies attachment access between 'public' and 'restricted'.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id || !isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid attachment ID format. Must be a valid UUID.' },
      { status: 400 }
    )
  }

  // Validate request Content-Type
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Invalid Content-Type. Must be application/json.' },
      { status: 415 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a valid JSON object.' },
      { status: 400 }
    )
  }

  const { access } = body as Record<string, unknown>
  if (access !== 'public' && access !== 'restricted') {
    return NextResponse.json(
      { error: 'Invalid access value. Allowed values are "public" or "restricted".' },
      { status: 400 }
    )
  }

  const result = await reclassifyAttachment(id, access)

  if (!result.success) {
    if (result.error?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (result.error?.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Forbidden: Publisher permissions required.' },
        { status: 403 }
      )
    }
    if (result.error?.includes('not found')) {
      return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 })
    }
    if (result.error?.includes('Conflict')) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    console.error(`[API PATCH /attachments/${id}] Reclassification error:`, result.error)

    // For operational security failures (confidentiality guarantee enforcement), return actionable message
    if (
      result.error?.includes('confidentiality') ||
      result.error?.includes('replicate') ||
      result.error?.includes('synchronize')
    ) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(
      { error: 'Failed to reclassify attachment. An internal server error occurred.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: result.data })
}
