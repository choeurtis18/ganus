import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

function checkAdminSecret(request: NextRequest): boolean {
  return request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET
}

const adminStorage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    if (!checkAdminSecret(request)) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    // List all folders (one per user) in the cvs bucket
    const { data: folders, error } = await adminStorage.storage
      .from('cvs')
      .list('', { limit: 1000 })

    if (error) {
      console.error('[admin/storage GET]', error.message)
      return errorResponse('Erreur accès storage', requestId, 500)
    }

    // Folders are user UUIDs — list files inside each
    let totalSize = 0
    let fileCount = 0

    for (const folder of folders ?? []) {
      if (!folder.id) continue // skip non-folder items
      const { data: files } = await adminStorage.storage
        .from('cvs')
        .list(folder.name, { limit: 100 })

      for (const file of files ?? []) {
        fileCount++
        totalSize += file.metadata?.size ?? 0
      }
    }

    return successResponse({ fileCount, totalSizeBytes: totalSize }, requestId)
  } catch (error) {
    console.error('[admin/storage GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
