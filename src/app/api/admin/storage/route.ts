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

    // List root — entries with id=null are folders (user UUIDs), entries with id are files
    const { data: folders, error } = await adminStorage.storage
      .from('cvs')
      .list('', { limit: 1000 })

    if (error) {
      console.error('[admin/storage GET]', error.message)
      return errorResponse('Erreur accès storage', requestId, 500)
    }

    let totalSize = 0
    let fileCount = 0

    for (const entry of folders ?? []) {
      if (entry.id) {
        // File at root level (shouldn't happen but handle anyway)
        fileCount++
        totalSize += entry.metadata?.size ?? 0
      } else {
        // Folder (id = null) — list files inside
        const { data: files } = await adminStorage.storage
          .from('cvs')
          .list(entry.name, { limit: 100 })

        for (const file of files ?? []) {
          if (!file.id) continue // skip sub-folders
          fileCount++
          totalSize += file.metadata?.size ?? 0
        }
      }
    }

    return successResponse({ fileCount, totalSizeBytes: totalSize }, requestId)
  } catch (error) {
    console.error('[admin/storage GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
