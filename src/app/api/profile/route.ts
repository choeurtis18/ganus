import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'
import { DOMAINES, NIVEAUX } from '@/lib/profile-data'

const VALID_DOMAINES = Object.keys(DOMAINES)
const VALID_NIVEAUX = NIVEAUX.map((n) => n.value)

export async function GET() {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        nom: true,
        prenom: true,
        age: true,
        domaine: true,
        sousDomaine: true,
        niveau: true,
        postesRecherches: true,
        profileCompletedAt: true,
        cvUrl: true,
        cvAnalysis: true,
        cvAnalysisAt: true,
        cvAnalysisCount: true,
      },
    })

    if (!user) {
      return errorResponse(getErrorMessage(ERROR_CODES.USER_NOT_FOUND), requestId, 404)
    }

    const chatCount = await prisma.chatSession.count({
      where: { userId: user.id, deletedAt: null },
    })

    return successResponse({ ...user, chatCount }, requestId)
  } catch (error) {
    console.error('[profile GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const body = await request.json() as Record<string, unknown>

    // Password update
    if ('password' in body) {
      const { password } = body
      if (!password || typeof password !== 'string' || password.length < 8) {
        return errorResponse(getErrorMessage(ERROR_CODES.INVALID_PASSWORD), requestId, 400)
      }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        return errorResponse(error.message || getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 400)
      }
      return successResponse({ updated: true }, requestId)
    }

    // Profile fields update
    const { nom, prenom, age, domaine, sousDomaine, niveau, postesRecherches } = body as {
      nom?: string; prenom?: string; age?: number
      domaine?: string; sousDomaine?: string; niveau?: string
      postesRecherches?: string[]
    }

    if (age !== undefined && (typeof age !== 'number' || age < 18 || age > 99)) {
      return errorResponse('Âge invalide (18–99)', requestId, 400)
    }
    if (domaine && !VALID_DOMAINES.includes(domaine)) {
      return errorResponse('Domaine invalide', requestId, 400)
    }
    if (niveau && !VALID_NIVEAUX.includes(niveau)) {
      return errorResponse('Niveau invalide', requestId, 400)
    }
    if (postesRecherches && (!Array.isArray(postesRecherches) || postesRecherches.length > 5)) {
      return errorResponse('Maximum 5 postes', requestId, 400)
    }

    const data: Record<string, unknown> = {}
    if (nom !== undefined) data.nom = nom || null
    if (prenom !== undefined) data.prenom = prenom || null
    if (age !== undefined) data.age = age || null
    if (domaine !== undefined) { data.domaine = domaine || null; data.sousDomaine = null }
    if (sousDomaine !== undefined) data.sousDomaine = sousDomaine || null
    if (niveau !== undefined) data.niveau = niveau || null
    if (postesRecherches !== undefined) data.postesRecherches = postesRecherches

    const hasProfile = nom || prenom || domaine || niveau || postesRecherches?.length
    if (hasProfile) data.profileCompletedAt = new Date()

    await prisma.user.update({
      where: { supabaseId: authUser.id },
      data,
    })

    return successResponse({ updated: true }, requestId)
  } catch (error) {
    console.error('[profile PATCH]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
