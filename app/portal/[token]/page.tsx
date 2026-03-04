import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

const STATUS_LABELS: Record<string, { label: string; step: number }> = {
  quoted:      { label: 'Quote Sent',      step: 1 },
  won:         { label: 'Job Confirmed',   step: 2 },
  scheduled:   { label: 'Scheduled',       step: 3 },
  in_progress: { label: 'In Progress',     step: 4 },
  complete:    { label: 'Complete',         step: 5 },
}

const PAYMENT_STEPS = [
  { key: 'deposit_paid_date',           label: 'Deposit' },
  { key: 'materials_claim_paid_date',   label: 'Materials Claim' },
  { key: 'subframe_claim_paid_date',    label: 'Subframe Claim' },
  { key: 'completion_paid_date',        label: 'Final Payment' },
]

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: job } = await admin
    .from('jobs')
    .select('*, products(name)')
    .eq('portal_token', token)
    .eq('portal_active', true)
    .single()

  if (!job) notFound()

  const { data: photos } = await admin
    .from('progress_photos')
    .select('id, photo_url, caption, created_at')
    .eq('job_id', job.id)
    .eq('sent_to_client', true)
    .order('created_at', { ascending: false })

  const currentStep = STATUS_LABELS[job.status]?.step ?? 1
  const steps = Object.entries(STATUS_LABELS)

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8ddd0]">
      {/* Header */}
      <header className="border-b border-[#161616] px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-[#b8935a] flex items-center justify-center shrink-0">
            <span className="text-[#080808] text-sm font-bold">E</span>
          </div>
          <div>
            <p className="text-sm font-medium text-[#e8ddd0]">Endure Decking</p>
            <p className="text-xs text-[#444]">Project Portal</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Job hero */}
        <div>
          <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">{job.name}</h1>
          <p className="text-sm text-[#444] mt-1">{job.address ?? job.suburb ?? 'Perth WA'}</p>
        </div>

        {/* Progress tracker */}
        <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5">
          <h2 className="text-xs font-medium text-[#444] uppercase tracking-wider mb-4">Job Progress</h2>
          <div className="relative">
            {/* Track line */}
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-[#161616]" />

            <div className="space-y-4">
              {steps.map(([status, { label, step }]) => {
                const done = step < currentStep
                const active = step === currentStep
                return (
                  <div key={status} className="flex items-center gap-4 relative">
                    <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                      done   ? 'border-[#b8935a] bg-[#b8935a]' :
                      active ? 'border-[#b8935a] bg-[#0c0c0c]' :
                               'border-[#222] bg-[#0c0c0c]'
                    }`}>
                      {done && (
                        <svg className="h-3 w-3 text-[#080808]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {active && <div className="h-2 w-2 rounded-full bg-[#b8935a]" />}
                    </div>
                    <span className={`text-sm ${
                      active ? 'text-[#b8935a] font-medium' :
                      done   ? 'text-[#e8ddd0]' :
                               'text-[#333]'
                    }`}>
                      {label}
                    </span>
                    {active && (
                      <span className="ml-auto text-xs text-[#b8935a] bg-[#b8935a]/10 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Key dates */}
        {(job.start_date || job.completion_date) && (
          <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5">
            <h2 className="text-xs font-medium text-[#444] uppercase tracking-wider mb-4">Schedule</h2>
            <div className="grid grid-cols-2 gap-4">
              {job.start_date && (
                <div>
                  <p className="text-xs text-[#444]">Start date</p>
                  <p className="text-sm text-[#e8ddd0] mt-0.5">
                    {new Date(job.start_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              )}
              {job.completion_date && (
                <div>
                  <p className="text-xs text-[#444]">Expected completion</p>
                  <p className="text-sm text-[#e8ddd0] mt-0.5">
                    {new Date(job.completion_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment schedule */}
        {job.quoted_total_value && (
          <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5">
            <h2 className="text-xs font-medium text-[#444] uppercase tracking-wider mb-4">Payment Schedule</h2>
            <div className="space-y-3">
              {PAYMENT_STEPS.map(({ key, label }) => {
                const paid = !!(job as Record<string, unknown>)[key]
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                        paid ? 'bg-green-400/20' : 'bg-[#111] border border-[#222]'
                      }`}>
                        {paid && (
                          <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm ${paid ? 'text-green-400' : 'text-[#e8ddd0]'}`}>{label}</span>
                    </div>
                    {paid && <span className="text-xs text-green-400">Received</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Progress photos */}
        {photos && photos.length > 0 && (
          <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5">
            <h2 className="text-xs font-medium text-[#444] uppercase tracking-wider mb-4">Progress Photos</h2>
            <div className="grid grid-cols-2 gap-3">
              {photos.map(photo => (
                <div key={photo.id} className="rounded-lg overflow-hidden bg-[#111]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.photo_url}
                    alt={photo.caption ?? 'Progress photo'}
                    className="w-full aspect-video object-cover"
                  />
                  {photo.caption && (
                    <p className="px-3 py-2 text-xs text-[#444]">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5 text-center">
          <p className="text-sm text-[#444]">Questions about your project?</p>
          <a
            href="tel:+61400000000"
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#b8935a] text-[#080808] text-sm font-medium hover:bg-[#c9a46a] transition-colors"
          >
            Call Endure Decking
          </a>
        </div>

        <p className="text-center text-xs text-[#2a2a2a] pb-4">
          Endure Decking · Perth WA · enduredecking.com.au
        </p>
      </div>
    </div>
  )
}
