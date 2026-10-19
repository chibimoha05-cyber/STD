/**
 * Generates an S3/Supabase-Storage-safe ASCII object key for a file upload.
 * Supabase Storage S3 backend rejects non-ASCII Unicode characters (such as Arabic)
 * with HTTP 400 (InvalidKey).
 *
 * This helper produces a clean ASCII key: `${access}/${uuid}_${safeAsciiSlug}.${ext}`
 * while the original Unicode/Arabic filename is preserved in the database `attachments.file_name`.
 */
export function generateSafeStoragePath(
  fileName: string,
  access: 'public' | 'restricted' = 'public'
): string {
  const parts = fileName.split('.')
  const ext =
    parts.length > 1
      ? parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
      : 'bin'

  const rawBase = parts.join('.')
  const asciiSlug = rawBase
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)

  const safeName = asciiSlug ? `${asciiSlug}.${ext || 'bin'}` : `file.${ext || 'bin'}`

  const fileUUID =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `f_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  return `${access}/${fileUUID}_${safeName}`
}
