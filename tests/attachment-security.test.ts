import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { isValidUUID } from '@/lib/utils/uuid'
import {
  setTestClientFactory,
  resetTestClientFactory,
} from '@/lib/actions/attachment-client'
import {
  deleteAttachment,
  reclassifyAttachment,
  processStorageCleanupQueue,
} from '@/lib/actions/attachments'
import { DELETE, PATCH } from '@/app/api/attachments/[id]/route'
import { GET as downloadGET } from '@/app/api/attachments/[id]/download/route'
import { NextRequest } from 'next/server'

describe('Security & Lifecycle Verification: Attachments & Database Migration', () => {
  beforeEach(() => {
    resetTestClientFactory()
  })

  // Helper to build flexible chainable mock query builder
  function createChainableBuilder(options: {
    data?: any
    error?: any
    onUpdate?: (fields: any) => void
  }) {
    const builder: any = {
      eq: () => builder,
      in: () => builder,
      lt: () => builder,
      order: () => builder,
      limit: async () => ({ data: options.data, error: options.error || null }),
      maybeSingle: async () => ({ data: options.data, error: options.error || null }),
      single: async () => ({ data: options.data, error: options.error || null }),
      select: () => builder,
      update: (fields: any) => {
        if (options.onUpdate) options.onUpdate(fields)
        return builder
      },
      delete: () => builder,
    }
    return builder
  }

  // =========================================================================
  // 1. UUID VALIDATION TESTS
  // =========================================================================
  describe('UUID Format Validation', () => {
    test('accepts valid RFC 4122 UUIDs', () => {
      assert.equal(isValidUUID('123e4567-e89b-12d3-a456-426614174000'), true)
      assert.equal(isValidUUID('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'), true)
      assert.equal(isValidUUID('A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11'), true)
    })

    test('rejects invalid or malicious IDs', () => {
      assert.equal(isValidUUID(''), false)
      assert.equal(isValidUUID('not-a-uuid'), false)
      assert.equal(isValidUUID('123e4567-e89b-12d3-a456'), false)
      assert.equal(isValidUUID('123e4567-e89b-12d3-a456-426614174000; DROP TABLE users;'), false)
      assert.equal(isValidUUID('../../../etc/passwd'), false)
      assert.equal(isValidUUID(null as any), false)
      assert.equal(isValidUUID(undefined as any), false)
    })
  })

  // =========================================================================
  // 2. RECLASSIFY ATTACHMENT TESTS (Public <-> Restricted & OCC)
  // =========================================================================
  describe('reclassifyAttachment: Confidentiality-First Flow & Concurrency', () => {
    const validId = '11111111-2222-3333-4444-555555555555'

    test('Case 1: Public -> Restricted - All steps succeed', async () => {
      let copyCalled = false
      let removePublicCalled = false
      let dbUpdated = false

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') {
            return createChainableBuilder({ data: { id: 'pub-1' } })
          }
          if (table === 'attachments') {
            const builder: any = {
              select: () => builder,
              eq: () => builder,
              maybeSingle: async () => ({
                data: {
                  id: validId,
                  file_name: 'lecture1.pdf',
                  access: 'public',
                  storage_bucket: 'attachments-public',
                  storage_path: 'c1/lecture1.pdf',
                  version: 1,
                },
                error: null,
              }),
              update: (fields: any) => {
                dbUpdated = true
                const updateBuilder: any = {
                  eq: () => updateBuilder,
                  select: () => updateBuilder,
                  maybeSingle: async () => ({
                    data: {
                      id: validId,
                      ...fields,
                    },
                    error: null,
                  }),
                  single: async () => ({
                    data: {
                      id: validId,
                      ...fields,
                    },
                    error: null,
                  }),
                }
                return updateBuilder
              },
            }
            return builder
          }
          return createChainableBuilder({})
        },
        storage: {
          from: (bucket: string) => ({
            list: async () => ({ data: [], error: null }),
            copy: async (src: string, dest: string, opts: any) => {
              if (bucket === 'attachments-public' && opts?.destinationBucket === 'attachments-restricted') {
                copyCalled = true
                return { data: { path: dest }, error: null }
              }
              return { data: null, error: new Error('Unexpected copy bucket') }
            },
            remove: async (paths: string[]) => {
              if (bucket === 'attachments-public' && paths[0] === 'c1/lecture1.pdf') {
                removePublicCalled = true
                return { data: paths, error: null }
              }
              return { data: null, error: new Error('Unexpected remove') }
            },
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const result = await reclassifyAttachment(validId, 'restricted')

      assert.equal(result.success, true)
      assert.equal(copyCalled, true, 'File should be replicated to restricted bucket')
      assert.equal(removePublicCalled, true, 'Public copy should be purged')
      assert.equal(dbUpdated, true, 'Database record should be updated')
      assert.equal(result.data?.access, 'restricted')
      assert.equal(result.data?.storage_bucket, 'attachments-restricted')
    })

    test('Case 2: Public -> Restricted - File copy failure aborts cleanly', async () => {
      let removePublicCalled = false
      let dbUpdated = false

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: validId,
                    file_name: 'lecture1.pdf',
                    access: 'public',
                    storage_bucket: 'attachments-public',
                    storage_path: 'c1/lecture1.pdf',
                    version: 1,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => {
              dbUpdated = true
              return createChainableBuilder({})
            },
          }
        },
        storage: {
          from: () => ({
            list: async () => ({ data: [], error: null }),
            copy: async () => ({ data: null, error: new Error('Storage quota exceeded') }),
            remove: async () => {
              removePublicCalled = true
              return { data: [], error: null }
            },
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const result = await reclassifyAttachment(validId, 'restricted')

      assert.equal(result.success, false)
      assert.equal(removePublicCalled, false, 'Public file must NOT be removed if replication fails')
      assert.equal(dbUpdated, false, 'Database must NOT be updated if copy fails')
      assert.match(result.error || '', /Failed to replicate file/)
    })

    test('Case 3: Public -> Restricted - Public delete failure prioritizes confidentiality', async () => {
      let cleanedRestrictedCopy = false
      let dbUpdated = false

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: validId,
                    file_name: 'lecture1.pdf',
                    access: 'public',
                    storage_bucket: 'attachments-public',
                    storage_path: 'c1/lecture1.pdf',
                    version: 1,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => {
              dbUpdated = true
              return createChainableBuilder({})
            },
          }
        },
        storage: {
          from: (bucket: string) => ({
            list: async () => ({ data: [], error: null }),
            copy: async () => ({ data: { path: 'c1/lecture1.pdf' }, error: null }),
            remove: async (paths: string[]) => {
              if (bucket === 'attachments-public') {
                return { data: null, error: new Error('Network timeout removing public file') }
              }
              if (bucket === 'attachments-restricted') {
                cleanedRestrictedCopy = true
                return { data: paths, error: null }
              }
              return { data: null, error: new Error('Unexpected bucket') }
            },
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const result = await reclassifyAttachment(validId, 'restricted')

      assert.equal(result.success, false)
      assert.equal(dbUpdated, false, 'CRITICAL: Database must NOT be marked restricted if public copy deletion failed')
      assert.equal(cleanedRestrictedCopy, true, 'Best-effort cleanup of restricted target copy should be attempted')
      assert.match(result.error || '', /Failed to remove public copy/)
      assert.match(result.error || '', /File was NOT marked as restricted to maintain confidentiality/)
    })

    test('Case 4: Public -> Restricted - DB update failure preserves confidentiality & allows retry', async () => {
      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: validId,
                    file_name: 'lecture1.pdf',
                    access: 'public',
                    storage_bucket: 'attachments-public',
                    storage_path: 'c1/lecture1.pdf',
                    version: 1,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => {
              const b: any = {
                eq: () => b,
                select: () => b,
                maybeSingle: async () => ({ data: null, error: new Error('Postgres connection timeout') }),
                single: async () => ({ data: null, error: new Error('Postgres connection timeout') }),
              }
              return b
            },
          }
        },
        storage: {
          from: () => ({
            list: async () => ({ data: [], error: null }),
            copy: async () => ({ data: { path: 'c1/lecture1.pdf' }, error: null }),
            remove: async (paths: string[]) => ({ data: paths, error: null }),
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const result = await reclassifyAttachment(validId, 'restricted')

      assert.equal(result.success, false)
      assert.match(result.error || '', /database record update failed/)
      assert.match(result.error || '', /Please retry to synchronize/)
    })

    test('Case 5: Restricted -> Public - DB update failure rolls back public file to prevent leak', async () => {
      let rollbackPublicCalled = false

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: validId,
                    file_name: 'exam_solution.pdf',
                    access: 'restricted',
                    storage_bucket: 'attachments-restricted',
                    storage_path: 'c1/exam_solution.pdf',
                    version: 1,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => {
              const b: any = {
                eq: () => b,
                select: () => b,
                maybeSingle: async () => ({ data: null, error: new Error('DB lock conflict') }),
                single: async () => ({ data: null, error: new Error('DB lock conflict') }),
              }
              return b
            },
          }
        },
        storage: {
          from: (bucket: string) => ({
            list: async () => ({ data: [], error: null }),
            copy: async () => ({ data: { path: 'c1/exam_solution.pdf' }, error: null }),
            remove: async (paths: string[]) => {
              if (bucket === 'attachments-public') {
                rollbackPublicCalled = true
              }
              return { data: paths, error: null }
            },
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const result = await reclassifyAttachment(validId, 'public')

      assert.equal(result.success, false)
      assert.equal(rollbackPublicCalled, true, 'Public copy must be revoked if DB update fails to avoid unauthorized public leak')
      assert.match(result.error || '', /Public copy revoked to maintain restriction/)
    })

    test('Case 6: OCC version conflict detects concurrent modification and aborts cleanly', async () => {
      let checkRowQueried = false

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          return {
            select: () => {
              const b: any = {
                eq: () => b,
                maybeSingle: async () => {
                  if (checkRowQueried) {
                    // Subsequent check returns newer version updated concurrently
                    return { data: { id: validId, version: 2 }, error: null }
                  }
                  return {
                    data: {
                      id: validId,
                      file_name: 'file.pdf',
                      access: 'public',
                      storage_bucket: 'attachments-public',
                      storage_path: 'c1/file.pdf',
                      version: 1,
                    },
                    error: null,
                  }
                },
              }
              return b
            },
            update: () => {
              checkRowQueried = true
              const b: any = {
                eq: () => b,
                select: () => b,
                maybeSingle: async () => ({ data: null, error: null }), // OCC mismatch: 0 rows returned
              }
              return b
            },
          }
        },
        storage: {
          from: () => ({
            list: async () => ({ data: [], error: null }),
            copy: async () => ({ data: { path: 'c1/file.pdf' }, error: null }),
            remove: async (paths: string[]) => ({ data: paths, error: null }),
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const result = await reclassifyAttachment(validId, 'restricted')

      assert.equal(result.success, false)
      assert.match(result.error || '', /Conflict: Attachment was modified concurrently/)
    })
  })

  // =========================================================================
  // 3. DELETE ATTACHMENT TESTS (DB-First Lifecycle & Queue Management)
  // =========================================================================
  describe('deleteAttachment: DB-First Lifecycle & Queue Management', () => {
    const validId = '22222222-3333-4444-5555-666666666666'

    test('Case 7: DB deletion failure preserves storage binary', async () => {
      let storageRemoveCalled = false

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: validId,
                    storage_bucket: 'attachments-public',
                    storage_path: 'c1/file.pdf',
                  },
                  error: null,
                }),
              }),
            }),
            delete: () => ({
              eq: async () => ({ error: new Error('Foreign key constraint violation') }),
            }),
          }
        },
        storage: {
          from: () => ({
            remove: async () => {
              storageRemoveCalled = true
              return { data: [], error: null }
            },
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const result = await deleteAttachment(validId)

      assert.equal(result.success, false)
      assert.equal(storageRemoveCalled, false, 'Storage API must NOT be called if database deletion fails')
      assert.match(result.error || '', /Database deletion failed/)
      assert.match(result.error || '', /File binary is preserved in storage/)
    })

    test('Case 8: DB succeeds and storage purge succeeds', async () => {
      let storageRemoveCalled = false
      let queueMarkedCompleted = false

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          if (table === 'attachments') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: validId,
                      storage_bucket: 'attachments-public',
                      storage_path: 'c1/file.pdf',
                    },
                    error: null,
                  }),
                }),
              }),
              delete: () => ({
                eq: async () => ({ error: null }),
              }),
            }
          }
          if (table === 'storage_cleanup_queue') {
            return createChainableBuilder({
              onUpdate: (fields) => {
                if (fields.status === 'completed') queueMarkedCompleted = true
              },
            })
          }
          return createChainableBuilder({})
        },
        storage: {
          from: () => ({
            remove: async (paths: string[]) => {
              storageRemoveCalled = true
              return { data: paths, error: null }
            },
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const result = await deleteAttachment(validId)

      assert.equal(result.success, true)
      assert.equal(result.data?.storageCleaned, true)
      assert.equal(storageRemoveCalled, true)
      assert.equal(queueMarkedCompleted, true)
    })

    test('Case 9: DB succeeds but storage purge fails -> tracked in queue, no false claims', async () => {
      let queueMarkedFailed = false

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          if (table === 'attachments') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: validId,
                      storage_bucket: 'attachments-public',
                      storage_path: 'c1/file.pdf',
                    },
                    error: null,
                  }),
                }),
              }),
              delete: () => ({
                eq: async () => ({ error: null }),
              }),
            }
          }
          if (table === 'storage_cleanup_queue') {
            return createChainableBuilder({
              onUpdate: (fields) => {
                if (fields.status === 'failed') queueMarkedFailed = true
              },
            })
          }
          return createChainableBuilder({})
        },
        storage: {
          from: () => ({
            remove: async () => ({ data: null, error: new Error('Storage service 503 unavailable') }),
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const result = await deleteAttachment(validId)

      assert.equal(result.success, true, 'Database record was successfully deleted')
      assert.equal(result.data?.storageCleaned, false, 'Must NOT falsely claim physical file was removed')
      assert.equal(queueMarkedFailed, true, 'Failure should be recorded in storage_cleanup_queue')
      assert.match(result.error || '', /File is queued for background cleanup/)
    })
  })

  // =========================================================================
  // 4. STORAGE CLEANUP QUEUE RETRY & ACTIVE FILE PROTECTION
  // =========================================================================
  describe('processStorageCleanupQueue: Retry Mechanism & Active Path Protection', () => {
    test('Case 10: Successfully retries and cleans pending queue items', async () => {
      const removedPaths: string[] = []
      let completedCount = 0

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') {
            return createChainableBuilder({ data: { id: 'pub-1' } })
          }
          if (table === 'attachments') {
            // No active attachments using these paths
            return createChainableBuilder({ data: null })
          }
          if (table === 'storage_cleanup_queue') {
            return {
              select: () => ({
                in: () => ({
                  lt: () => ({
                    order: () => ({
                      limit: async () => ({
                        data: [
                          {
                            id: 'q-1',
                            storage_bucket: 'attachments-public',
                            storage_path: 'c1/file1.pdf',
                            attempts: 1,
                          },
                          {
                            id: 'q-2',
                            storage_bucket: 'attachments-restricted',
                            storage_path: 'c2/file2.pdf',
                            attempts: 0,
                          },
                        ],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
              update: (fields: any) => ({
                eq: async () => {
                  if (fields.status === 'completed') completedCount++
                  return { data: null, error: null }
                },
              }),
            }
          }
          return createChainableBuilder({})
        },
        storage: {
          from: (bucket: string) => ({
            remove: async (paths: string[]) => {
              removedPaths.push(`${bucket}:${paths[0]}`)
              return { data: paths, error: null }
            },
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const summary = await processStorageCleanupQueue(10)

      assert.equal(summary.processed, 2)
      assert.equal(summary.succeeded, 2)
      assert.equal(summary.failed, 0)
      assert.equal(completedCount, 2)
      assert.deepEqual(removedPaths, [
        'attachments-public:c1/file1.pdf',
        'attachments-restricted:c2/file2.pdf',
      ])
    })

    test('Case 11: Skips storage purge if path is claimed by an active attachment', async () => {
      let storageRemoveCalled = false
      let completedSkipped = false

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          if (table === 'attachments') {
            // Simulate active attachment now using this path!
            return createChainableBuilder({ data: { id: 'active-attachment-999' } })
          }
          if (table === 'storage_cleanup_queue') {
            return {
              select: () => ({
                in: () => ({
                  lt: () => ({
                    order: () => ({
                      limit: async () => ({
                        data: [
                          {
                            id: 'q-active',
                            storage_bucket: 'attachments-public',
                            storage_path: 'c1/reused_file.pdf',
                            attempts: 0,
                          },
                        ],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
              update: (fields: any) => ({
                eq: async () => {
                  if (fields.status === 'completed' && fields.last_error?.includes('Skipped: Path is in use')) {
                    completedSkipped = true
                  }
                  return { data: null, error: null }
                },
              }),
            }
          }
          return createChainableBuilder({})
        },
        storage: {
          from: () => ({
            remove: async () => {
              storageRemoveCalled = true
              return { data: [], error: null }
            },
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const summary = await processStorageCleanupQueue(10)

      assert.equal(summary.processed, 1)
      assert.equal(summary.succeeded, 1)
      assert.equal(storageRemoveCalled, false, 'Storage removal must be SKIPPED to protect active data')
      assert.equal(completedSkipped, true, 'Queue record should be marked completed with a descriptive skip note')
    })
  })

  // =========================================================================
  // 5. API ROUTE HANDLER SECURITY TESTS
  // =========================================================================
  describe('API Route Handlers (/api/attachments/[id])', () => {
    test('Case 12: Rejects invalid UUID with 400', async () => {
      const req = new NextRequest('http://localhost/api/attachments/invalid-uuid', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: 'invalid-uuid' }) })
      const json = await res.json()

      assert.equal(res.status, 400)
      assert.match(json.error, /Must be a valid UUID/)
    })

    test('Case 13: Rejects unauthenticated request with 401', async () => {
      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: null }, error: new Error('No session') }),
        },
      }
      setTestClientFactory(async () => mockSupabase)

      const req = new NextRequest('http://localhost/api/attachments/11111111-1111-1111-1111-111111111111', {
        method: 'DELETE',
      })
      const res = await DELETE(req, { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) })
      const json = await res.json()

      assert.equal(res.status, 401)
      assert.match(json.error, /Authentication required/)
    })

    test('Case 14: Rejects non-publisher user with 403', async () => {
      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'normal-user' } }, error: null }),
        },
        from: () => createChainableBuilder({ data: null }),
      }
      setTestClientFactory(async () => mockSupabase)

      const req = new NextRequest('http://localhost/api/attachments/11111111-1111-1111-1111-111111111111', {
        method: 'DELETE',
      })
      const res = await DELETE(req, { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) })
      const json = await res.json()

      assert.equal(res.status, 403)
      assert.match(json.error, /Publisher permissions required/)
    })

    test('Case 15: PATCH rejects missing Content-Type with 415', async () => {
      const req = new NextRequest('http://localhost/api/attachments/11111111-1111-1111-1111-111111111111', {
        method: 'PATCH',
        body: 'plain-text',
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) })
      const json = await res.json()

      assert.equal(res.status, 415)
      assert.match(json.error, /application\/json/i)
    })

    test('Case 16: PATCH rejects malformed JSON with 400', async () => {
      const req = new NextRequest('http://localhost/api/attachments/11111111-1111-1111-1111-111111111111', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: 'invalid-json{',
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) })
      const json = await res.json()

      assert.equal(res.status, 400)
      assert.match(json.error, /Malformed JSON/)
    })

    test('Case 17: PATCH rejects invalid access value with 400', async () => {
      const req = new NextRequest('http://localhost/api/attachments/11111111-1111-1111-1111-111111111111', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ access: 'super-secret' }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) })
      const json = await res.json()

      assert.equal(res.status, 400)
      assert.match(json.error, /Invalid access value/)
    })

    test('Case 18: PATCH returns 409 Conflict when concurrent modification is detected', async () => {
      const validId = '33333333-4444-5444-a555-666666666666'
      let checkRowQueried = false

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          return {
            select: () => {
              const b: any = {
                eq: () => b,
                maybeSingle: async () => {
                  if (checkRowQueried) {
                    return { data: { id: validId, version: 2 }, error: null }
                  }
                  return {
                    data: {
                      id: validId,
                      access: 'public',
                      storage_bucket: 'attachments-public',
                      storage_path: 'c1/test.pdf',
                      version: 1,
                    },
                    error: null,
                  }
                },
              }
              return b
            },
            update: () => {
              checkRowQueried = true
              const b: any = {
                eq: () => b,
                select: () => b,
                maybeSingle: async () => ({ data: null, error: null }),
              }
              return b
            },
          }
        },
        storage: {
          from: () => ({
            list: async () => ({ data: [], error: null }),
            copy: async () => ({ data: { path: 'c1/test.pdf' }, error: null }),
            remove: async (paths: string[]) => ({ data: paths, error: null }),
          }),
        },
      }

      setTestClientFactory(async () => mockSupabase)

      const req = new NextRequest(`http://localhost/api/attachments/${validId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ access: 'restricted' }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: validId }) })
      const json = await res.json()

      assert.equal(res.status, 409, 'Should return HTTP 409 Conflict')
      assert.match(json.error, /Conflict: Attachment was modified concurrently/)
    })
  })

  // =========================================================================
  // 6. DOWNLOAD ROUTE SECURITY TESTS
  // =========================================================================
  describe('Download Route Handlers (/api/attachments/[id]/download)', () => {
    const validId = '44444444-5555-4555-8555-666666666666'

    test('Case 19: Rejects invalid UUID with 400', async () => {
      const req = new NextRequest('http://localhost/api/attachments/invalid-uuid/download')
      const res = await downloadGET(req, { params: Promise.resolve({ id: 'invalid-uuid' }) })
      const json = await res.json()

      assert.equal(res.status, 400)
      assert.match(json.error, /Must be a valid UUID/)
    })

    test('Case 20: Returns 404 if attachment is not found', async () => {
      const mockSupabase = {
        from: () => createChainableBuilder({ data: null }),
      }
      setTestClientFactory(async () => mockSupabase)

      const req = new NextRequest(`http://localhost/api/attachments/${validId}/download`)
      const res = await downloadGET(req, { params: Promise.resolve({ id: validId }) })
      const json = await res.json()

      assert.equal(res.status, 404)
      assert.match(json.error, /Attachment not found/)
    })

    test('Case 21: Restricted file rejects unauthenticated request with 401', async () => {
      const mockSupabase = {
        from: () =>
          createChainableBuilder({
            data: {
              id: validId,
              access: 'restricted',
              storage_bucket: 'attachments-restricted',
              storage_path: 'c1/exam.pdf',
              file_name: 'exam.pdf',
            },
          }),
        auth: {
          getUser: async () => ({ data: { user: null }, error: new Error('No session') }),
        },
      }
      setTestClientFactory(async () => mockSupabase)

      const req = new NextRequest(`http://localhost/api/attachments/${validId}/download`)
      const res = await downloadGET(req, { params: Promise.resolve({ id: validId }) })
      const json = await res.json()

      assert.equal(res.status, 401)
      assert.match(json.error, /Restricted attachment requires login/)
    })

    test('Case 22: Restricted file rejects non-publisher with 403', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: null })
          return createChainableBuilder({
            data: {
              id: validId,
              access: 'restricted',
              storage_bucket: 'attachments-restricted',
              storage_path: 'c1/exam.pdf',
              file_name: 'exam.pdf',
            },
          })
        },
        auth: {
          getUser: async () => ({ data: { user: { id: 'student-1' } }, error: null }),
        },
      }
      setTestClientFactory(async () => mockSupabase)

      const req = new NextRequest(`http://localhost/api/attachments/${validId}/download`)
      const res = await downloadGET(req, { params: Promise.resolve({ id: validId }) })
      const json = await res.json()

      assert.equal(res.status, 403)
      assert.match(json.error, /Access restricted to authorized publishers/)
    })

    test('Case 23: Restricted file redirects authorized publisher with signed URL', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'publishers') return createChainableBuilder({ data: { id: 'pub-1' } })
          return createChainableBuilder({
            data: {
              id: validId,
              access: 'restricted',
              storage_bucket: 'attachments-restricted',
              storage_path: 'c1/exam.pdf',
              file_name: 'exam.pdf',
            },
          })
        },
        auth: {
          getUser: async () => ({ data: { user: { id: 'pub-1' } }, error: null }),
        },
        storage: {
          from: (bucket: string) => ({
            createSignedUrl: async (filePath: string, expiresIn: number) => {
              assert.equal(bucket, 'attachments-restricted')
              assert.equal(filePath, 'c1/exam.pdf')
              assert.equal(expiresIn, 60)
              return { data: { signedUrl: 'https://storage.provider.com/signed-token-123' }, error: null }
            },
          }),
        },
      }
      setTestClientFactory(async () => mockSupabase)

      const req = new NextRequest(`http://localhost/api/attachments/${validId}/download`)
      const res = await downloadGET(req, { params: Promise.resolve({ id: validId }) })

      assert.equal(res.status, 307)
      assert.equal(res.headers.get('location'), 'https://storage.provider.com/signed-token-123')
    })

    test('Case 24: Public file redirects directly to public CDN URL', async () => {
      const mockSupabase = {
        from: () =>
          createChainableBuilder({
            data: {
              id: validId,
              access: 'public',
              storage_bucket: 'attachments-public',
              storage_path: 'c1/notes.pdf',
              file_name: 'notes.pdf',
            },
          }),
        storage: {
          from: (bucket: string) => ({
            getPublicUrl: (filePath: string) => {
              assert.equal(bucket, 'attachments-public')
              assert.equal(filePath, 'c1/notes.pdf')
              return { data: { publicUrl: 'https://storage.provider.com/public/c1/notes.pdf' } }
            },
          }),
        },
      }
      setTestClientFactory(async () => mockSupabase)

      const req = new NextRequest(`http://localhost/api/attachments/${validId}/download`)
      const res = await downloadGET(req, { params: Promise.resolve({ id: validId }) })

      assert.equal(res.status, 307)
      assert.equal(res.headers.get('location'), 'https://storage.provider.com/public/c1/notes.pdf')
    })

    test('Case 25: Public file rejects bucket mismatch configuration anomaly with 500', async () => {
      const mockSupabase = {
        from: () =>
          createChainableBuilder({
            data: {
              id: validId,
              access: 'public',
              storage_bucket: 'attachments-restricted', // Mismatch!
              storage_path: 'c1/notes.pdf',
              file_name: 'notes.pdf',
            },
          }),
      }
      setTestClientFactory(async () => mockSupabase)

      const req = new NextRequest(`http://localhost/api/attachments/${validId}/download`)
      const res = await downloadGET(req, { params: Promise.resolve({ id: validId }) })
      const json = await res.json()

      assert.equal(res.status, 500)
      assert.match(json.error, /Attachment configuration error/)
    })
  })

  // =========================================================================
  // 7. MIGRATION & RE-RUNNABILITY CHECKS
  // =========================================================================
  describe('Migration Re-runnability & Storage Queue Verification', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20261012000000_init_academic_platform.sql'
    )
    const migrationSql = fs.readFileSync(migrationPath, 'utf8')

    test('Migration contains idempotent block for uq_slots_schedule with duplicate detection', () => {
      assert.match(migrationSql, /uq_slots_schedule/, 'Constraint name must exist')
      assert.match(
        migrationSql,
        /having count\(\*\) > 1/i,
        'Must check for duplicate slots before adding constraint'
      )
      assert.match(
        migrationSql,
        /raise exception 'Cannot add unique constraint uq_slots_schedule/i,
        'Must raise clear exception on duplicate slots instead of silent deletion or merge'
      )
      assert.match(
        migrationSql,
        /alter table public\.slots\s+add constraint uq_slots_schedule unique \(course_id, weekday, start_time, room\)/i,
        'Constraint columns must match seed ON CONFLICT target exactly'
      )
    })

    test('Migration creates storage_cleanup_queue table with RLS and trigger', () => {
      assert.match(migrationSql, /create table if not exists public\.storage_cleanup_queue/i)
      assert.match(migrationSql, /alter table public\.storage_cleanup_queue enable row level security/i)
      assert.match(migrationSql, /enqueue_storage_cleanup\(\)/i)
      assert.match(migrationSql, /create trigger tr_delete_storage_attachment/i)
    })

    test('Migration removes direct delete on storage.objects and legacy function', () => {
      assert.doesNotMatch(
        migrationSql,
        /delete from storage\.objects\s+where bucket_id = old\.storage_bucket/i,
        'Trigger must not perform direct deletes on storage.objects'
      )
      assert.doesNotMatch(
        migrationSql,
        /when others then\s+-- Do not fail/i,
        'Trigger must not swallow storage deletion errors'
      )
      assert.match(
        migrationSql,
        /drop function if exists public\.handle_deleted_attachment\(\);/i,
        'Legacy handle_deleted_attachment must be dropped'
      )
    })

    test('Migration adds OCC version and updated_at idempotently to attachments', () => {
      assert.match(
        migrationSql,
        /column_name = 'version'/i,
        'Must check for version column before adding'
      )
      assert.match(
        migrationSql,
        /alter table public\.attachments add column version int not null default 1;/i,
        'Must add version column for OCC'
      )
      assert.match(
        migrationSql,
        /column_name = 'updated_at'/i,
        'Must check for updated_at column before adding'
      )
    })

    test('Simulated duplicate detection algorithm accurately identifies duplicates', () => {
      const slotsData = [
        { course_id: 'c1', weekday: 0, start_time: '08:30', room: 'Hall 2' },
        { course_id: 'c1', weekday: 0, start_time: '08:30', room: 'Hall 2' },
        { course_id: 'c2', weekday: 1, start_time: '10:30', room: 'Hall 2' },
      ]

      const counts = new Map<string, number>()
      for (const slot of slotsData) {
        const key = `${slot.course_id}|${slot.weekday}|${slot.start_time}|${slot.room}`
        counts.set(key, (counts.get(key) || 0) + 1)
      }

      const duplicates = Array.from(counts.entries()).filter(([_, count]) => count > 1)
      assert.equal(duplicates.length, 1)
      assert.equal(duplicates[0][0], 'c1|0|08:30|Hall 2')
      assert.equal(duplicates[0][1], 2)
    })
  })
})
