import { NextRequest } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'
import { analyzeCv, analyzeCvFromImage, type SupportedMimeType } from '@/lib/llm-cv'

const adminStorage = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_ANALYSES_PER_DAY = 2
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const
type AcceptedType = typeof ACCEPTED_TYPES[number]

async function extractTextWithOcr(buffer: Buffer): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('filename', 'cv.pdf')
    formData.append('filetype', 'PDF')
    formData.append('language', 'fre') // French language
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' })
    formData.append('file', blob)

    console.log('[OCR] Sending request to OCR.space (free tier), blob size:', blob.size)
    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    })

    console.log('[OCR] Response status:', res.status)
    const result = await res.json()
    console.log('[OCR] Response keys:', Object.keys(result))

    if (!result.IsErroredOnProcessing && result.ParsedText) {
      const text = result.ParsedText.replace(/\s+/g, ' ').trim()
      console.log('[OCR] Success, text length:', text.length)
      return text
    }
    console.log('[OCR] Failed:', result.ErrorMessage || result.ErrorDetails || `IsErrored: ${result.IsErroredOnProcessing}`)
    return ''
  } catch (error) {
    console.error('[OCR] Exception:', error instanceof Error ? error.message : error)
    return ''
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true, cvAnalysisCount: true, cvAnalysisAt: true, postesRecherches: true },
    })
    if (!user) return errorResponse(getErrorMessage(ERROR_CODES.USER_NOT_FOUND), requestId, 404)

    // Rate limit: 2 analyses per day, reset after 24h
    const now = new Date()
    const analysisAge = user.cvAnalysisAt ? now.getTime() - user.cvAnalysisAt.getTime() : Infinity
    const count = analysisAge > 24 * 60 * 60 * 1000 ? 0 : user.cvAnalysisCount
    if (count >= MAX_ANALYSES_PER_DAY) {
      return errorResponse('Limite atteinte (2 analyses/jour)', requestId, 429)
    }

    const formData = await request.formData()
    const file = formData.get('cv') as File | null
    if (!file) return errorResponse('Fichier manquant', requestId, 400)
    if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
      return errorResponse('Format invalide — PDF, JPG, PNG ou WebP uniquement', requestId, 400)
    }
    if (file.size > MAX_FILE_SIZE) return errorResponse('Fichier > 5 MB', requestId, 400)

    const buffer = Buffer.from(await file.arrayBuffer())
    const isImage = file.type !== 'application/pdf'
    const postes = Array.isArray(user.postesRecherches) ? user.postesRecherches as string[] : []

    // Upload to Supabase Storage
    const ext = isImage ? file.type.split('/')[1] : 'pdf'
    const storagePath = `${authUser.id}/cv.${ext}`
    const { error: uploadError } = await adminStorage.storage
      .from('cvs')
      .upload(storagePath, buffer, { contentType: file.type, upsert: true })
    if (uploadError) {
      console.error('[profile/cv POST] storage upload', uploadError.message)
      return errorResponse('Erreur upload', requestId, 500)
    }

    let analysis
    let cvText = ''

    if (isImage) {
      // Image → GPT-4-Vision
      const base64 = buffer.toString('base64')
      analysis = await analyzeCvFromImage(base64, file.type as SupportedMimeType, postes, user.id)
    } else {
      // PDF → try text extraction
      try {
        const parsed = await pdfParse(buffer)
        cvText = (parsed.text ?? '').replace(/\s+/g, ' ').trim()
        console.log('[profile/cv POST] extracted text length:', cvText.length)
      } catch (error) {
        console.error('[profile/cv POST] pdf-parse error:', error instanceof Error ? error.message : error)
      }

      if (cvText.length === 0) {
        return errorResponse(
          'Ce PDF ne contient pas de texte extractible. Exportez votre CV en PDF natif (depuis Word, Canva…) ou téléchargez une image (JPG/PNG).',
          requestId, 400
        )
      }
      if (cvText.length < 50) {
        return errorResponse('PDF trop court — au minimum 50 caractères requis', requestId, 400)
      }

      analysis = await analyzeCv(cvText, postes, user.id)
    }

    // Save to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        cvUrl: storagePath,
        cvText: cvText || null,
        cvAnalysis: analysis as unknown as import('@prisma/client').Prisma.InputJsonValue,
        cvAnalysisAt: now,
        cvAnalysisCount: analysisAge > 24 * 60 * 60 * 1000 ? 1 : count + 1,
      },
    })

    return successResponse({ analysis }, requestId)
  } catch (error) {
    console.error('[profile/cv POST]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
