import Anthropic from '@anthropic-ai/sdk'

export const JARVIS_TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_job',
    description: `Update a job's status or fields in the system. Use this when the owner says things like:
- "Mark the Smith job as won"
- "Set job XYZ to lost"
- "Move the Cottesloe job to in progress"
- "Update the client name / suburb / tier on a job"

The job_id must be the UUID from the business context job list. Confirm what changed in your reply.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        job_id: {
          type: 'string',
          description: 'The UUID of the job to update (from the jobs list in business context)',
        },
        updates: {
          type: 'object',
          description: 'Fields to update. Only include fields that need to change.',
          properties: {
            status: {
              type: 'string',
              enum: ['quoted', 'won', 'lost', 'in_progress', 'on_hold', 'complete'],
              description: 'New job status',
            },
            client_name: { type: 'string', description: 'Customer name' },
            suburb: { type: 'string', description: 'Job location suburb' },
            jw_tier: {
              type: 'string',
              enum: ['red', 'black', 'blue'],
              description: 'Job tier',
            },
            gross_quote: { type: 'number', description: 'Quoted amount ex GST' },
            sqm: { type: 'number', description: 'Square metres' },
          },
          additionalProperties: false,
        },
      },
      required: ['job_id', 'updates'],
      additionalProperties: false,
    },
  },

  {
    name: 'create_cashflow_event',
    description: `Create a cashflow event — an upcoming or confirmed inflow (customer payment) or outflow (expense). Use when the owner wants to:
- Log a deposit, progress payment, or final payment from a client
- Record a planned material purchase, supplier payment, or operating expense
- Schedule any future money movement

Always confirm the amount, date, and label in your reply.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['inflow', 'outflow'],
          description: 'Whether money is coming in (inflow) or going out (outflow)',
        },
        category: {
          type: 'string',
          enum: ['materials', 'labour', 'admin', 'invoice', 'deposit', 'final_payment', 'other'],
          description: 'Category of this cashflow event',
        },
        label: {
          type: 'string',
          description: 'Clear description, e.g. "Deposit — Johnson Deck, Applecross" or "Modwood order — Smith job"',
        },
        amount: {
          type: 'number',
          description: 'Amount in AUD',
        },
        scheduled_date: {
          type: 'string',
          description: 'Expected date in YYYY-MM-DD format',
        },
        job_id: {
          type: 'string',
          description: 'UUID of the related job (optional but recommended)',
        },
        paid_date: {
          type: 'string',
          description: 'Actual date paid in YYYY-MM-DD format — only set if already paid/received',
        },
      },
      required: ['type', 'category', 'label', 'amount', 'scheduled_date'],
      additionalProperties: false,
    },
  },

  {
    name: 'update_cashflow_event',
    description: `Update an existing cashflow event. Use when the owner wants to:
- Mark a payment as received/paid (set paid_date)
- Change the amount, date, or label of a scheduled event
- Correct an entry

The cashflow event ID must come from the cashflow list in the business context.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'UUID of the cashflow event to update (from cashflow list in business context)',
        },
        updates: {
          type: 'object',
          description: 'Fields to update.',
          properties: {
            label: { type: 'string' },
            amount: { type: 'number' },
            scheduled_date: { type: 'string', description: 'YYYY-MM-DD' },
            paid_date: { type: 'string', description: 'YYYY-MM-DD — set to mark as paid/received' },
            category: {
              type: 'string',
              enum: ['materials', 'labour', 'admin', 'invoice', 'deposit', 'final_payment', 'other'],
            },
          },
          additionalProperties: false,
        },
      },
      required: ['id', 'updates'],
      additionalProperties: false,
    },
  },

  {
    name: 'create_job',
    description: `Create a new job record in the system. Use when the owner wants to add a new prospect, lead, or confirmed job.

After creating, confirm the job was added and suggest next steps (e.g. running a quote calculation).`,
    input_schema: {
      type: 'object' as const,
      properties: {
        client_name: { type: 'string', description: 'Customer full name' },
        suburb: { type: 'string', description: 'Job site suburb, e.g. "Cottesloe"' },
        status: {
          type: 'string',
          enum: ['quoted', 'won', 'in_progress'],
          description: 'Initial job status',
        },
        jw_tier: {
          type: 'string',
          enum: ['red', 'black', 'blue'],
          description: 'Job tier — red=standard, black=premium (+20%), blue=luxury',
        },
        gross_quote: {
          type: 'number',
          description: 'Gross quoted amount ex GST in AUD (if known)',
        },
        install_type: {
          type: 'string',
          enum: ['fullSubframe', 'overConcrete', 'redeck'],
          description: 'Installation method',
        },
        sqm: {
          type: 'number',
          description: 'Square metres of decking',
        },
      },
      required: ['client_name', 'suburb', 'status'],
      additionalProperties: false,
    },
  },

  {
    name: 'run_quote_calculation',
    description: `Calculate a detailed quote for a decking job and return full pricing breakdown. Use when the owner asks:
- "What would we quote for 45sqm full subframe at Red tier?"
- "Run me a quote for X sqm"
- "What's the GP on a job like this?"

Returns: gross quote total (ex/inc GST), GP amount, GP%, revenue per hour, and traffic light status.

For the product field, use rates from the product catalog in the business context if available.
Typical Modwood 137 rates as fallback: cost_per_m2=85, rate_full_subframe=285, rate_over_concrete=240, rate_redeck=210.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        sqm: {
          type: 'number',
          description: 'Square metres of decking',
        },
        install_type: {
          type: 'string',
          enum: ['fullSubframe', 'overConcrete', 'redeck'],
          description: 'Installation type',
        },
        jw_tier: {
          type: 'string',
          enum: ['red', 'black', 'blue'],
          description: 'Job tier',
        },
        use_h4: {
          type: 'boolean',
          description: 'Use H4 subframe (higher durability, adds $20/m²). Default false.',
        },
        product: {
          type: 'object',
          description: 'Product cost and charge-out rates per m²',
          properties: {
            cost_per_m2: { type: 'number', description: 'Material cost per m² ex GST' },
            rate_full_subframe: { type: 'number', description: 'All-in charge rate for full subframe install' },
            rate_over_concrete: { type: 'number', description: 'All-in charge rate for over concrete install' },
            rate_redeck: { type: 'number', description: 'All-in charge rate for redeck install' },
          },
          required: ['cost_per_m2', 'rate_full_subframe', 'rate_over_concrete', 'rate_redeck'],
          additionalProperties: false,
        },
        complexity_stairs: { type: 'number', description: 'Number of stair flights (black tier only)' },
        complexity_handrail_lm: { type: 'number', description: 'Handrail lineal metres (black tier only)' },
        complexity_curve_hrs: { type: 'number', description: 'Extra hours for curved sections (black tier only)' },
        complexity_other_hrs: { type: 'number', description: 'Other complexity hours (black tier only)' },
      },
      required: ['sqm', 'install_type', 'jw_tier'],
      additionalProperties: false,
    },
  },

  {
    name: 'update_opening_balance',
    description: `Update the opening cash balance — the baseline figure the cash projection builds from.

Use this when the owner wants to:
- Reconcile the system balance against their actual bank balance
- Correct the starting balance after a bank statement
- Set a fresh baseline (e.g. "our balance is actually $X today")

After updating, confirm the new balance and note that all future projections will build from this figure.
Do NOT use this for regular payments — use create_cashflow_event for those.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        opening_balance: {
          type: 'number',
          description: 'The new opening/baseline cash balance in AUD',
        },
        reason: {
          type: 'string',
          description: 'Brief reason for the update, e.g. "bank reconciliation" or "correcting opening figure"',
        },
      },
      required: ['opening_balance'],
      additionalProperties: false,
    },
  },

  {
    name: 'log_material_purchase',
    description: `Log a material purchase against a job. Use when the owner says materials have been ordered or paid for.
Automatically creates a corresponding cashflow outflow event.

Confirm what was logged and update the owner on the job's total material spend if relevant.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        job_id: {
          type: 'string',
          description: 'UUID of the job these materials are for (from the jobs list in business context)',
        },
        description: {
          type: 'string',
          description: 'What was purchased, e.g. "Modwood Teak 137 boards — 50m²"',
        },
        supplier: {
          type: 'string',
          description: 'Supplier name, e.g. "Modwood", "Bunnings", "Reece"',
        },
        actual_amount: {
          type: 'number',
          description: 'Total cost in AUD (inc GST)',
        },
        purchase_date: {
          type: 'string',
          description: 'Date of purchase in YYYY-MM-DD format',
        },
      },
      required: ['job_id', 'description', 'supplier', 'actual_amount', 'purchase_date'],
      additionalProperties: false,
    },
  },
]
