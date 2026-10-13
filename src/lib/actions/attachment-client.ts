import { createClient } from '@/lib/supabase/server'

let clientFactory = createClient

export async function getSupabaseClient() {
  return await clientFactory()
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export function setTestClientFactory(factory: () => Promise<unknown>) {
  clientFactory = factory as () => Promise<SupabaseServerClient>
}

export function resetTestClientFactory() {
  clientFactory = createClient
}

export function isTestMode(): boolean {
  return clientFactory !== createClient
}
