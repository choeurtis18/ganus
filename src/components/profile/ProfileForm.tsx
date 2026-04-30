'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import PostesInput from './PostesInput'
import { useToast } from '@/components/ui/toast'
import { DOMAINES, DOMAINE_LABELS, NIVEAUX } from '@/lib/profile-data'

interface ProfileData {
  nom: string
  prenom: string
  age: string
  domaine: string
  sousDomaine: string
  niveau: string
  postesRecherches: string[]
}

interface ProfileFormProps {
  initial: ProfileData
  onSaved?: () => void
}

export default function ProfileForm({ initial, onSaved }: ProfileFormProps) {
  const t = useTranslations('profile')
  const toast = useToast()
  const [form, setForm] = useState<ProfileData>(initial)
  const [saving, setSaving] = useState(false)
  const [openPersonal, setOpenPersonal] = useState(true)
  const [openProfessional, setOpenProfessional] = useState(true)

  const set = (key: keyof ProfileData) => (val: string) => {
    if (key === 'domaine') setForm((f) => ({ ...f, domaine: val, sousDomaine: '' }))
    else setForm((f) => ({ ...f, [key]: val }))
  }

  const sousDomaineOptions = form.domaine ? DOMAINES[form.domaine] ?? [] : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const age = form.age ? Number(form.age) : undefined
    if (form.age && (isNaN(age!) || age! < 18 || age! > 99)) {
      toast(t('errors.invalidAge'), 'error')
      setSaving(false)
      return
    }

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
      if (!res.ok) throw new Error(t('errors.saveFailed'))
      toast(t('profileSaved'), 'success')
      onSaved?.()
    } catch {
      toast(t('errors.saveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Personal info */}
      <Card padding="p-5">
        <button
          type="button"
          onClick={() => setOpenPersonal(!openPersonal)}
          className="flex items-center justify-between w-full hover:bg-bg rounded-lg px-2 py-1 transition-all"
        >
          <h2 className="text-lg font-semibold text-text-primary">{t('personalInfo')}</h2>
          <Icon name={openPersonal ? 'chevronDown' : 'chevronUp'} size={20} color="var(--text-secondary)" />
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            openPersonal ? 'max-h-96 mt-4 opacity-100' : 'max-h-0 mt-0 opacity-0'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('prenom')} value={form.prenom} onChange={set('prenom')} placeholder={t('prenomPlaceholder')} />
            <Input label={t('nom')} value={form.nom} onChange={set('nom')} placeholder={t('nomPlaceholder')} />
            <Input label={t('age')} value={form.age} onChange={set('age')} placeholder={t('agePlaceholder')} type="number" />
          </div>
        </div>
      </Card>

      {/* Professional profile */}
      <Card padding="p-5">
        <button
          type="button"
          onClick={() => setOpenProfessional(!openProfessional)}
          className="flex items-center justify-between w-full hover:bg-bg rounded-lg px-2 py-1 transition-all"
        >
          <h2 className="text-lg font-semibold text-text-primary">{t('professionalProfile')}</h2>
          <Icon name={openProfessional ? 'chevronDown' : 'chevronUp'} size={20} color="var(--text-secondary)" />
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            openProfessional ? 'max-h-96 mt-4 opacity-100' : 'max-h-0 mt-0 opacity-0'
          }`}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">{t('domaine')}</label>
              <select
                value={form.domaine}
                onChange={(e) => set('domaine')(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                <option value="">{t('selectDomaine')}</option>
                {Object.keys(DOMAINES).map((d) => (
                  <option key={d} value={d}>{DOMAINE_LABELS[d]}</option>
                ))}
              </select>
            </div>

            {sousDomaineOptions.length > 0 && (
              <div>
                <label className="text-xs text-text-secondary mb-1 block">{t('sousDomaine')}</label>
                <select
                  value={form.sousDomaine}
                  onChange={(e) => set('sousDomaine')(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                  <option value="">{t('selectSousDomaine')}</option>
                  {sousDomaineOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-text-secondary mb-1 block">{t('niveau')}</label>
              <select
                value={form.niveau}
                onChange={(e) => set('niveau')(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                <option value="">{t('selectNiveau')}</option>
                {NIVEAUX.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1 block">{t('targetedJobs')}</label>
              <PostesInput
                value={form.postesRecherches}
                onChange={(v) => setForm((f) => ({ ...f, postesRecherches: v }))}
              />
            </div>
          </div>
        </div>
      </Card>

      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? t('savingProfile') : t('saveProfile')}
      </Button>
    </form>
  )
}
