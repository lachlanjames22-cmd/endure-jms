import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/dashboard')

  const { data: settings } = await supabase.from('settings').select('*').order('key')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-['Georgia',serif] text-[#e8ddd0]">Settings</h1>
        <p className="text-sm text-[#444] mt-1">Business config and integrations</p>
      </div>

      {/* Environment variables status */}
      <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5">
        <h2 className="text-sm font-medium text-[#e8ddd0] mb-3">Integration Status</h2>
        <div className="space-y-2">
          {[
            { label: 'Anthropic API (Jarvis)', key: 'ANTHROPIC_API_KEY' },
            { label: 'Twilio (WhatsApp)', key: 'TWILIO_ACCOUNT_SID' },
            { label: 'GoHighLevel', key: 'GHL_API_KEY' },
            { label: 'Buildxact', key: 'BUILDXACT_CLIENT_ID' },
            { label: 'Google Ads', key: 'GOOGLE_ADS_DEVELOPER_TOKEN' },
            { label: 'Meta Ads', key: 'META_APP_ID' },
          ].map(({ label }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="text-[#444]">{label}</span>
              <span className="text-[#2a2a2a]">Configure in .env.local / Vercel</span>
            </div>
          ))}
        </div>
      </div>

      {/* Business settings */}
      <div className="rounded-lg border border-[#161616] bg-[#0c0c0c] p-5">
        <h2 className="text-sm font-medium text-[#e8ddd0] mb-3">Business Constants</h2>
        <div className="grid gap-1 max-h-96 overflow-y-auto">
          {settings?.map(s => (
            <div key={s.key} className="flex items-center justify-between text-xs py-1 border-b border-[#111]">
              <span className="text-[#444] font-mono">{s.key}</span>
              <span className="text-[#e8ddd0] font-mono truncate max-w-[200px]">
                {typeof s.value === 'object' ? JSON.stringify(s.value).slice(0, 40) + '…' : String(s.value)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#2a2a2a] mt-3">
          Edit constants via Supabase dashboard → Table Editor → settings, or ask Jarvis.
        </p>
      </div>
    </div>
  )
}
