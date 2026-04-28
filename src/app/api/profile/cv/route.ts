import { NextRequest } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'
import { analyzeCv } from '@/lib/llm-cv'

const adminStorage = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_ANALYSES_PER_DAY = 2

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
    if (file.type !== 'application/pdf') return errorResponse('PDF uniquement', requestId, 400)
    if (file.size > MAX_FILE_SIZE) return errorResponse('Fichier > 5 MB', requestId, 400)

    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract text from PDF
    let cvText = ''
    try {
      console.log('[profile/cv POST] buffer size:', buffer.length, 'bytes')
      const parsed = await pdfParse(buffer)
      console.log('[profile/cv POST] pdf-parse result keys:', Object.keys(parsed))
      const rawText = parsed.text ?? ''
      console.log('[profile/cv POST] raw text length:', rawText.length, 'chars')
      // Remove extra whitespace but preserve content
      cvText = rawText.replace(/\s+/g, ' ').trim()
      console.log('[profile/cv POST] cleaned text length:', cvText.length)
    } catch (error) {
      console.error('[profile/cv POST] pdf-parse error:', error instanceof Error ? error.message : error)
    }

    // If no meaningful text extracted, try OCR for scanned PDFs
    if (cvText.length === 0) {
      console.log('[profile/cv POST] no text content found, attempting OCR...')
      cvText = await extractTextWithOcr(buffer)
      console.log('[profile/cv POST] OCR extracted text length:', cvText.length)
    }

    if (cvText.length === 0) {
      return errorResponse('PDF sans contenu textuel. Vérifiez que votre PDF contient du texte ou des images claires.', requestId, 400)
    }
    if (cvText.length < 50) {
      return errorResponse('PDF trop court — au minimum 50 caractères requis pour analyser', requestId, 400)
    }

    // Upload to Supabase Storage (admin client bypasses RLS)
    const storagePath = `${authUser.id}/cv.pdf`
    const { error: uploadError } = await adminStorage.storage
      .from('cvs')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: true })
    if (uploadError) {
      console.error('[profile/cv POST] storage upload', uploadError.message)
      return errorResponse('Erreur upload', requestId, 500)
    }

    // Analyze with LLM
    const postes = Array.isArray(user.postesRecherches) ? user.postesRecherches as string[] : []
    const analysis = await analyzeCv(cvText, postes, user.id)

    // Save to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        cvUrl: storagePath, // authUser.id/cv.pdf
        cvText,
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
