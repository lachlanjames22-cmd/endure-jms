/**
 * Jarvis tool executor — routes tool calls from the agentic loop to internal API endpoints.
 * All endpoints require the user's cookie for auth (RLS + session).
 */

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  origin: string,
  cookie: string,
): Promise<string> {
  try {
    const result = await routeTool(name, input, origin, cookie)
    return JSON.stringify(result.success
      ? { success: true, data: result.data }
      : { success: false, error: result.error }
    )
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: `Tool execution failed: ${e instanceof Error ? e.message : String(e)}`,
    })
  }
}

async function routeTool(
  name: string,
  input: Record<string, unknown>,
  origin: string,
  cookie: string,
): Promise<ToolResult> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    cookie,
  }

  switch (name) {
    case 'update_job': {
      const { job_id, updates } = input as { job_id: string; updates: Record<string, unknown> }
      const res = await fetch(`${origin}/api/jobs/${job_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        return { success: false, error: err.error ?? `HTTP ${res.status}` }
      }
      return { success: true, data: await res.json() }
    }

    case 'create_cashflow_event': {
      const res = await fetch(`${origin}/api/cashflow`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        return { success: false, error: err.error ?? `HTTP ${res.status}` }
      }
      return { success: true, data: await res.json() }
    }

    case 'update_cashflow_event': {
      const { id, updates } = input as { id: string; updates: Record<string, unknown> }
      const res = await fetch(`${origin}/api/cashflow`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id, ...updates }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        return { success: false, error: err.error ?? `HTTP ${res.status}` }
      }
      return { success: true, data: await res.json() }
    }

    case 'create_job': {
      const res = await fetch(`${origin}/api/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        return { success: false, error: err.error ?? `HTTP ${res.status}` }
      }
      return { success: true, data: await res.json() }
    }

    case 'run_quote_calculation': {
      const res = await fetch(`${origin}/api/quotes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        return { success: false, error: err.error ?? `HTTP ${res.status}` }
      }
      return { success: true, data: await res.json() }
    }

    case 'log_material_purchase': {
      const res = await fetch(`${origin}/api/material-actuals`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        return { success: false, error: err.error ?? `HTTP ${res.status}` }
      }
      return { success: true, data: await res.json() }
    }

    default:
      return { success: false, error: `Unknown tool: ${name}` }
  }
}
