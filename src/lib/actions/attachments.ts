'use server'

import type { Tables } from '@/lib/supabase/types'
import { isValidUUID } from '@/lib/utils/uuid'
import {
  getSupabaseClient,
  type SupabaseServerClient,
} from '@/lib/actions/attachment-client'

export type AttachmentResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

interface DbQueryBuilder<T = unknown> {
  eq: (col: string, val: unknown) => DbQueryBuilder<T>
  in: (col: string, vals: unknown[]) => DbQueryBuilder<T>
  lt: (col: string, val: unknown) => DbQueryBuilder<T>
  order: (col: string, opts?: { ascending?: boolean }) => DbQueryBuilder<T>
  limit: (count: number) => Promise<{ data: Tables<'storage_cleanup_queue'>[] | null; error: { message: string } | null }>
  select: (cols?: string) => DbQueryBuilder<T>
  maybeSingle: () => Promise<{ data: T | null; error: { message: string } | null }>
  then: <T1 = unknown, T2 = never>(
    onfulfilled?: ((value: { data: T | null; error: { message: string } | null }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ) => Promise<T1 | T2>
}

interface AttachmentDb {
  from: (table: string) => {
    select: (cols?: string) => DbQueryBuilder<Tables<'attachments'>>
    insert: (data: unknown) => Promise<{ error: { message: string } | null }>
    update: (data: unknown) => DbQueryBuilder<Tables<'attachments'>>
    delete: () => {
      eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
    }
  }
}

/**
 * In-memory per-attachment mutex to serialize operations on the same attachment ID
 * within the server process, eliminating local race conditions.
 */
const attachmentLocks = new Map<string, Promise<void>>()

async function withAttachmentLock<T>(
  attachmentId: string,
  action: () => Promise<T>
): Promise<T> {
  while (attachmentLocks.has(attachmentId)) {
    try {
      await attachmentLocks.get(attachmentId)
    } catch {
      // Ignore errors from preceding operations in queue
    }
  }

  let releaseLock!: () => void
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve
  })
  attachmentLocks.set(attachmentId, lockPromise)

  try {
    return await action()
  } finally {
    attachmentLocks.delete(attachmentId)
    releaseLock()
  }
}

/**
 * Verifies that the active caller is an authenticated publisher.
 */
export async function verifyPublisherAuth() {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { authorized: false, error: 'Unauthorized: Authentication required.' }
  }

  const { data: publisher, error: pubError } = await supabase
    .from('publishers')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (pubError || !publisher) {
    return { authorized: false, error: 'Forbidden: Publisher permissions required.' }
  }

  return { authorized: true, user, supabase }
}

/**
 * Helper to inspect if an object exists in a storage bucket using the Storage API.
 */
async function checkObjectExists(
  supabase: SupabaseServerClient,
  bucket: string,
  storagePath: string
): Promise<boolean> {
  const pathParts = storagePath.split('/')
  const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : ''
  const fileName = pathParts[pathParts.length - 1]

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, { search: fileName })

  if (error || !data) return false
  return data.some((item: { name: string }) => item.name === fileName)
}

/**
 * Safely deletes an attachment from database first, then purges physical storage.
 * 
 * Design Principles:
 * 1. PostgreSQL and Supabase Storage are independent systems; atomicity is not assumed.
 * 2. Deleting the database record FIRST prevents irreversible binary loss if database
 *    deletion fails.
 * 3. The PostgreSQL trigger 'tr_delete_storage_attachment' atomically enqueues the file
 *    into 'storage_cleanup_queue' upon row deletion.
 * 4. Operations on the same attachmentId are serialized via in-memory mutex to prevent races.
 * 5. Immediate physical purge is attempted via the official Storage API. If it succeeds,
 *    the queue record is marked 'completed'. If it fails, the queue record tracks the failure
 *    for background retry, and the caller is informed that physical cleanup is queued.
 */
export async function deleteAttachment(
  attachmentId: string
): Promise<AttachmentResult<{ id: string; storageCleaned: boolean }>> {
  if (!attachmentId || !isValidUUID(attachmentId)) {
    return { success: false, error: 'Invalid attachment ID. Must be a valid UUID.' }
  }

  return await withAttachmentLock(attachmentId, async () => {
    const authCheck = await verifyPublisherAuth()
    if (!authCheck.authorized || !authCheck.supabase) {
      return { success: false, error: authCheck.error }
    }

    const { supabase } = authCheck
    const db = supabase as unknown as AttachmentDb

    // 1. Fetch target attachment metadata to know bucket and path
    const { data: attachment, error: fetchError } = await db
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .maybeSingle()

    if (fetchError || !attachment) {
      return { success: false, error: 'Attachment not found or already deleted.' }
    }

    const targetAttachment = attachment as Tables<'attachments'>
    const { storage_bucket, storage_path } = targetAttachment

    // 2. Delete database record FIRST.
    // The PostgreSQL trigger 'tr_delete_storage_attachment' records the cleanup job in
    // 'storage_cleanup_queue' within the same database transaction.
    const { error: dbDeleteError } = await db
      .from('attachments')
      .delete()
      .eq('id', attachmentId)

    if (dbDeleteError) {
      return {
        success: false,
        error: `Database deletion failed: ${dbDeleteError.message}. File binary is preserved in storage.`,
      }
    }

    // 3. Attempt immediate physical storage deletion via official Storage API
    const { error: storageError } = await supabase.storage
      .from(storage_bucket)
      .remove([storage_path])

    if (storageError) {
      // Record failure in queue for retry worker
      try {
        await db
          .from('storage_cleanup_queue')
          .update({
            status: 'failed',
            attempts: 1,
            last_error: storageError.message,
          })
          .eq('attachment_id', attachmentId)
          .eq('status', 'pending')
      } catch {
        // Best-effort queue status tracking
      }

      return {
        success: true,
        data: { id: attachmentId, storageCleaned: false },
        error: `Attachment record deleted from database, but physical storage purge failed (${storageError.message}). File is queued for background cleanup.`,
      }
    }

    // Mark queue record completed
    try {
      await db
        .from('storage_cleanup_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('attachment_id', attachmentId)
        .eq('status', 'pending')
    } catch {
      // Best-effort queue status tracking
    }

    return {
      success: true,
      data: { id: attachmentId, storageCleaned: true },
    }
  })
}

/**
 * Safely reclassifies an attachment between 'public' and 'restricted'.
 * 
 * Concurrency and Confidentiality Guarantees:
 * 1. Serialized per attachmentId via in-memory mutex to prevent in-process races.
 * 2. Uses Optimistic Concurrency Control (OCC) via the 'version' column to detect and
 *    safely abort multi-instance concurrent modifications without corrupting files.
 * 3. Priority: Confidentiality strictly prioritized over availability:
 *    - The database MUST NEVER claim a file is restricted while an active public copy remains in 'attachments-public'.
 *    - If deleting the public copy fails, the reclassification aborts with an error, the database remains 'public',
 *      and unverified rollbacks are NOT relied upon for security guarantees.
 *    - If database update fails or conflicts, the copied file is cleaned up (or public copy is restored if transitioning
 *      from restricted) to prevent unauthorized leaks.
 */
export async function reclassifyAttachment(
  attachmentId: string,
  newAccess: 'public' | 'restricted'
): Promise<AttachmentResult<Tables<'attachments'>>> {
  if (!attachmentId || !isValidUUID(attachmentId)) {
    return { success: false, error: 'Invalid attachment ID. Must be a valid UUID.' }
  }

  if (newAccess !== 'public' && newAccess !== 'restricted') {
    return { success: false, error: 'Access classification must be "public" or "restricted".' }
  }

  return await withAttachmentLock(attachmentId, async () => {
    const authCheck = await verifyPublisherAuth()
    if (!authCheck.authorized || !authCheck.supabase) {
      return { success: false, error: authCheck.error }
    }

    const { supabase } = authCheck
    const db = supabase as unknown as AttachmentDb

    // 1. Fetch current attachment metadata including OCC version
    const { data: attachment, error: fetchError } = await db
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .maybeSingle()

    if (fetchError || !attachment) {
      return { success: false, error: 'Attachment not found.' }
    }

    const currentAttachment = attachment as Tables<'attachments'>

    if (currentAttachment.access === newAccess) {
      return { success: true, data: currentAttachment }
    }

    const currentVersion = currentAttachment.version ?? 1
    const sourceBucket = currentAttachment.storage_bucket
    const targetBucket: 'attachments-public' | 'attachments-restricted' =
      newAccess === 'public' ? 'attachments-public' : 'attachments-restricted'
    const filePath = currentAttachment.storage_path

    // =========================================================================
    // TRANSITION: public -> restricted
    // Priority: Confidentiality over availability.
    // =========================================================================
    if (newAccess === 'restricted') {
      // Phase 1: Ensure target copy exists in restricted bucket (supports idempotent resume)
      const targetExists = await checkObjectExists(supabase, targetBucket, filePath)
      if (!targetExists) {
        const { error: copyError } = await supabase.storage
          .from(sourceBucket)
          .copy(filePath, filePath, { destinationBucket: targetBucket })

        if (copyError) {
          return {
            success: false,
            error: `Failed to replicate file to restricted storage: ${copyError.message}. Database remains unchanged.`,
          }
        }
      }

      // Phase 2: Purge public copy from attachments-public
      // If public removal fails, we CANNOT guarantee secrecy, so we MUST NOT mark DB as restricted.
      const { error: removePublicError } = await supabase.storage
        .from(sourceBucket)
        .remove([filePath])

      if (removePublicError) {
        // Best-effort cleanup of target copy; do NOT mark DB as restricted
        await supabase.storage.from(targetBucket).remove([filePath]).catch(() => {})

        return {
          success: false,
          error: `Failed to remove public copy from ${sourceBucket}: ${removePublicError.message}. File was NOT marked as restricted to maintain confidentiality guarantees. Please retry.`,
        }
      }

      // Phase 3: Public copy successfully purged. Update database record with OCC check.
      const { data: updatedAttachment, error: updateError } = await db
        .from('attachments')
        .update({
          access: 'restricted',
          storage_bucket: targetBucket,
          version: currentVersion + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', attachmentId)
        .eq('version', currentVersion)
        .select()
        .maybeSingle()

      if (updateError || !updatedAttachment) {
        // Check if an OCC concurrency conflict occurred
        const { data: checkRow } = await db
          .from('attachments')
          .select('id, version')
          .eq('id', attachmentId)
          .maybeSingle()

        if (checkRow && checkRow.version !== currentVersion) {
          return {
            success: false,
            error: 'Conflict: Attachment was modified concurrently by another operation. Please reload and retry.',
          }
        }

        // Public copy was purged (no public leak), but DB sync failed.
        return {
          success: false,
          error: `Public copy removed from CDN, but database record update failed (${updateError?.message}). Please retry to synchronize database record.`,
        }
      }

      return { success: true, data: updatedAttachment as Tables<'attachments'> }
    }

    // =========================================================================
    // TRANSITION: restricted -> public
    // Priority: Do not expose restricted data publicly unless DB update succeeds.
    // =========================================================================
    else {
      // Phase 1: Replicate file into public bucket
      const targetExists = await checkObjectExists(supabase, targetBucket, filePath)
      if (!targetExists) {
        const { error: copyError } = await supabase.storage
          .from(sourceBucket)
          .copy(filePath, filePath, { destinationBucket: targetBucket })

        if (copyError) {
          return {
            success: false,
            error: `Failed to replicate file to public storage: ${copyError.message}. Attachment remains restricted.`,
          }
        }
      }

      // Phase 2: Update database record to public with OCC check
      const { data: updatedAttachment, error: updateError } = await db
        .from('attachments')
        .update({
          access: 'public',
          storage_bucket: targetBucket,
          version: currentVersion + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', attachmentId)
        .eq('version', currentVersion)
        .select()
        .maybeSingle()

      if (updateError || !updatedAttachment) {
        // Rollback: immediately delete copied public file so confidential data is not exposed
        await supabase.storage.from(targetBucket).remove([filePath]).catch(() => {})

        // Check if an OCC concurrency conflict occurred
        const { data: checkRow } = await db
          .from('attachments')
          .select('id, version')
          .eq('id', attachmentId)
          .maybeSingle()

        if (checkRow && checkRow.version !== currentVersion) {
          return {
            success: false,
            error: 'Conflict: Attachment was modified concurrently by another operation. Please reload and retry.',
          }
        }

        return {
          success: false,
          error: `Database update failed: ${updateError?.message}. Public copy revoked to maintain restriction.`,
        }
      }

      // Phase 3: Purge old copy from restricted bucket
      const { error: purgeError } = await supabase.storage
        .from(sourceBucket)
        .remove([filePath])

      if (purgeError) {
        // Enqueue to storage cleanup queue for background retry
        try {
          await db.from('storage_cleanup_queue').insert({
            attachment_id: attachmentId,
            storage_bucket: sourceBucket,
            storage_path: filePath,
            status: 'pending',
            last_error: `Reclassification cleanup: ${purgeError.message}`,
          })
        } catch {
          // Best-effort enqueue
        }
      }

      return { success: true, data: updatedAttachment as Tables<'attachments'> }
    }
  })
}

/**
 * Background retry worker for storage cleanup queue.
 * Purges physical objects via official Storage API for records enqueued by DB triggers or actions.
 * 
 * Safety Guarantee:
 * Before removing any physical file from storage, it verifies that no active record
 * in 'attachments' is currently using the target storage_path and bucket. If an active
 * record is found, the job is marked as superseded/completed without deleting the file.
 */
export async function processStorageCleanupQueue(
  batchSize = 20
): Promise<{
  processed: number
  succeeded: number
  failed: number
  errors: Array<{ id: string; error: string }>
}> {
  const authCheck = await verifyPublisherAuth()
  if (!authCheck.authorized || !authCheck.supabase) {
    throw new Error(authCheck.error || 'Unauthorized')
  }

  const { supabase } = authCheck
  const db = supabase as unknown as AttachmentDb
  const safeLimit = Math.max(1, Math.min(100, Math.floor(batchSize)))

  const { data: queueItems, error: fetchError } = await db
    .from('storage_cleanup_queue')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('attempts', 5)
    .order('created_at', { ascending: true })
    .limit(safeLimit)

  if (fetchError || !queueItems || queueItems.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, errors: [] }
  }

  let succeeded = 0
  let failed = 0
  const errors: Array<{ id: string; error: string }> = []

  for (const item of queueItems) {
    await db
      .from('storage_cleanup_queue')
      .update({ status: 'processing' })
      .eq('id', item.id)

    // Active Attachment Safety Check: Ensure no active attachment is currently referencing this file
    const { data: activeAttachment } = await db
      .from('attachments')
      .select('id')
      .eq('storage_bucket', item.storage_bucket)
      .eq('storage_path', item.storage_path)
      .maybeSingle()

    if (activeAttachment) {
      // Path is claimed by an active attachment; skip deletion to protect active data!
      succeeded++
      await db
        .from('storage_cleanup_queue')
        .update({
          status: 'completed',
          last_error: `Skipped: Path is in use by active attachment ${activeAttachment.id}`,
          processed_at: new Date().toISOString(),
        })
        .eq('id', item.id)
      continue
    }

    const { error: storageError } = await supabase.storage
      .from(item.storage_bucket)
      .remove([item.storage_path])

    if (storageError) {
      failed++
      errors.push({ id: item.id, error: storageError.message })
      await db
        .from('storage_cleanup_queue')
        .update({
          status: 'failed',
          attempts: (item.attempts || 0) + 1,
          last_error: storageError.message,
        })
        .eq('id', item.id)
    } else {
      succeeded++
      await db
        .from('storage_cleanup_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', item.id)
    }
  }

  return {
    processed: queueItems.length,
    succeeded,
    failed,
    errors,
  }
}
