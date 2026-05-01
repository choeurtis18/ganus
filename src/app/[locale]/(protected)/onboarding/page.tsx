'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Icon } from '@/components/ui/icon'
import PostesInput from '@/components/profile/PostesInput'
import CVUploader from '@/components/cv/CVUploader'
import { useToast } from '@/components/ui/toast'
import { DOMAINES, DOMAINE_LABELS, NIVEAUX } from '@/lib/profile-data'
import type { CvAnalysis } from '@/lib/llm-cv'

type Step = 1 | 2 | 3

const FEATURES = [
  {
    icon: 'chat' as const,
    color: 'var(--emerald)',
    bg: 'bg-emerald/10',
    titleKey: 'features.chat.title',
    descKey: 'features.chat.desc',
  },
  {
    icon: 'upload' as const,
    color: 'var(--gold)',
    bg: 'bg-gold/10',
    titleKey: 'features.cv.title',
    descKey: 'features.cv.desc',
  },
  {
    icon: 'trendingUp' as const,
    color: 'var(--teal)',
    bg: 'bg-teal/10',
    titleKey: 'features.dashboard.title',
    descKey: 'features.dashboard.desc',
  },
]

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const toast = useToast()
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [showSkipModal, setShowSkipModal] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Profile form state
  const [form, setForm] = useState({
    prenom: '', nom: '', age: '',
    domaine: '', sousDomaine: '', niveau: '',
    postesRecherches: [] as string[],
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // CV state
  const [cvAnalyzed, setCvAnalyzed] = useState(false)
  const [hasExistingCv, setHasExistingCv] = useState(false)
  const [cvAnalysis, setCvAnalysis] = useState<CvAnalysis | null>(null)

  // Redirect if already onboarded + pre-fill profile
  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/profile').then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([statsBody, profileBody]) => {
      if (statsBody?.data?.onboardingCompletedAt) router.replace('/dashboard')
      if (!profileBody?.data) return
      const d = profileBody.data
      setForm({
        prenom: d.prenom ?? '',
        nom: d.nom ?? '',
        age: d.age != null ? String(d.age) : '',
        domaine: d.domaine ?? '',
        sousDomaine: d.sousDomaine ?? '',
        niveau: d.niveau ?? '',
        postesRecherches: Array.isArray(d.postesRecherches) ? d.postesRecherches : [],
      })
      if (d.cvAnalysis) {
        setCvAnalyzed(true)
        setHasExistingCv(true)
        setCvAnalysis(d.cvAnalysis as CvAnalysis)
      }
    }).catch(() => {})
  }, [router])

  const set = (key: keyof typeof form) => (val: string) => {
    if (key === 'domaine') setForm((f) => ({ ...f, domaine: val, sousDomaine: '' }))
    else setForm((f) => ({ ...f, [key]: val }))
  }

  const sousDomaineOptions = form.domaine ? DOMAINES[form.domaine] ?? [] : []

  const completeOnboarding = async () => {
    setCompleting(true)
    await fetch('/api/onboarding', { method: 'POST' })
    router.replace('/dashboard')
  }

  const handleProfileNext = async () => {
    const age = form.age ? Number(form.age) : undefined
    if (form.age && (isNaN(age!) || age! < 18 || age! > 99)) {
      toast(t('errors.invalidAge'), 'error')
      return
    }
    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom || null,
          prenom: form.prenom || null,
          age: age ?? null,
          domaine: form.domaine || null,
          sousDomaine: form.sousDomaine || null,
          niveau: form.niveau || null,
          postesRecherches: form.postesRecherches,
        }),
      })
      if (!res.ok) throw new Error()
      setStep(2)
    } catch {
      toast(t('errors.saveFailed'), 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const selectClass = 'w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-gold/50'

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-border shrink-0 bg-bg">
         <Link href="/" className="flex-shrink-0">
         <Image src="/Logo-long-Ganus.png" alt="Ganus" width={120} height={32} className="h-8 w-auto" />
         </Link>
        <button
          onClick={() => setShowSkipModal(true)}
          className="text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          {t('skip')}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto w-full">
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col">

        {/* Step progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                step === s
                  ? 'bg-navy text-white'
                  : step > s
                    ? 'bg-emerald text-white'
                    : 'bg-border text-text-muted'
              }`}>
                {step > s ? <Icon name="check" size={14} /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 rounded-full transition-colors ${step > s ? 'bg-emerald' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1 — Profile */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary">{t('step1.title')}</h1>
              <p className="text-sm text-text-secondary mt-1">{t('step1.subtitle')}</p>
            </div>

            <div className="flex flex-col gap-5">
              {/* Personal info */}
              <div className="bg-bg-card rounded-xl border border-border p-5">
                <h2 className="text-sm font-semibold text-text-primary mb-4">{t('step1.personalInfo')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={t('step1.prenom')} value={form.prenom} onChange={set('prenom')} placeholder="Alice" />
                  <Input label={t('step1.nom')} value={form.nom} onChange={set('nom')} placeholder="Dupont" />
                  <Input label={t('step1.age')} value={form.age} onChange={set('age')} placeholder="22" type="number" />
                </div>
              </div>

              {/* Professional info */}
              <div className="bg-bg-card rounded-xl border border-border p-5">
                <h2 className="text-sm font-semibold text-text-primary mb-4">{t('step1.professionalInfo')}</h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs text-text-secondary mb-1 block">{t('step1.domaine')}</label>
                    <select value={form.domaine} onChange={(e) => set('domaine')(e.target.value)} className={selectClass}>
                      <option value="">{t('step1.selectDomaine')}</option>
                      {Object.keys(DOMAINES).map((d) => (
                        <option key={d} value={d}>{DOMAINE_LABELS[d]}</option>
                      ))}
                    </select>
                  </div>

                  {sousDomaineOptions.length > 0 && (
                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">{t('step1.sousDomaine')}</label>
                      <select value={form.sousDomaine} onChange={(e) => set('sousDomaine')(e.target.value)} className={selectClass}>
                        <option value="">{t('step1.selectSousDomaine')}</option>
                        {sousDomaineOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-text-secondary mb-1 block">{t('step1.niveau')}</label>
                    <select value={form.niveau} onChange={(e) => set('niveau')(e.target.value)} className={selectClass}>
                      <option value="">{t('step1.selectNiveau')}</option>
                      {NIVEAUX.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-text-secondary mb-1 block">{t('step1.postes')}</label>
                    <PostesInput
                      value={form.postesRecherches}
                      onChange={(v) => setForm((f) => ({ ...f, postesRecherches: v }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onClick={handleProfileNext} disabled={savingProfile} icon="chevronRight">
                {savingProfile ? t('saving') : t('next')}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2 — CV */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary">{t('step2.title')}</h1>
              <p className="text-sm text-text-secondary mt-1">{t('step2.subtitle')}</p>
            </div>

            <div className="bg-bg-card rounded-xl border border-border p-5">
              <CVUploader
                hasExisting={hasExistingCv}
                onAnalyzed={(analysis) => { setCvAnalyzed(true); setHasExistingCv(true); setCvAnalysis(analysis) }}
              />
            </div>

            {cvAnalysis && (
              <div className="bg-bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-secondary">{t('step2.analyzed')}</p>
                  <p className={`text-2xl font-bold font-display ${cvAnalysis.score >= 80 ? 'text-emerald' : cvAnalysis.score >= 60 ? 'text-gold' : 'text-orange'}`}>
                    {cvAnalysis.score}<span className="text-sm font-normal text-text-muted">/100</span>
                  </p>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cvAnalysis.score >= 80 ? 'bg-emerald' : cvAnalysis.score >= 60 ? 'bg-gold' : 'bg-orange'}`}
                    style={{ width: `${cvAnalysis.score}%` }}
                  />
                </div>
                {cvAnalysis.summary && (
                  <p className="text-sm text-text-secondary leading-relaxed">{cvAnalysis.summary}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <Icon name="chevronLeft" size={16} color="var(--text-secondary)" />
                {t('back')}
              </button>
              <div className="flex items-center gap-3">
                {!cvAnalyzed && (
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {t('step2.skip')}
                  </button>
                )}
                <Button variant="primary" onClick={() => setStep(3)} icon="chevronRight">
                  {t('next')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Features */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary">{t('step3.title')}</h1>
              <p className="text-sm text-text-secondary mt-1">{t('step3.subtitle')}</p>
            </div>

            <div className="flex flex-col gap-3">
              {FEATURES.map((f) => (
                <div key={f.titleKey} className="bg-bg-card rounded-xl border border-border p-4 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center shrink-0`}>
                    <Icon name={f.icon} size={20} color={f.color} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-0.5">{t(f.titleKey)}</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{t(f.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-navy/10 border border-navy/20 rounded-xl p-4 flex items-start gap-3">
              <Icon name="sparkles" size={18} color="var(--navy)" />
              <p className="text-xs text-text-secondary leading-relaxed">{t('step3.tip')}</p>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <Icon name="chevronLeft" size={16} color="var(--text-secondary)" />
                {t('back')}
              </button>
              <Button variant="primary" onClick={completeOnboarding} disabled={completing}>
                {completing ? t('starting') : t('step3.cta')}
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Skip confirmation modal */}
      {showSkipModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-xl p-6 max-w-md w-full shadow-xl border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange/10 flex items-center justify-center shrink-0">
                <Icon name="zap" size={20} color="var(--orange)" />
              </div>
              <h3 className="text-base font-semibold text-text-primary">{t('skipModal.title')}</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">{t('skipModal.message')}</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setShowSkipModal(false)} fullWidth>
                {t('skipModal.cancel')}
              </Button>
              <Button variant="danger" onClick={completeOnboarding} disabled={completing} fullWidth>
                {completing ? t('starting') : t('skipModal.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
