'use client'
import React from 'react'

type FieldOption = {
  label: string
  value: string
}

type FieldMeta = {
  id: string
  name: string
  label?: string
  blockType: string
  required?: boolean
  placeholder?: string
  options?: FieldOption[]
}

type FormMeta = {
  id: string
  name?: string
  fields: FieldMeta[]
}

type SubmitResult = {
  successMessage?: string
  fieldErrors?: Record<string, string>
  error?: string
}

type FormComponentProps = {
  formId: string
  /**
   * Optional submit handler provided by the host page.
   * If supplied, it receives the collected values and should
   * return a SubmitResult or void. If not supplied the component
   * will POST to `/fapi/forms/${formId}/submit` itself.
   */
  onSubmit?: (values: Record<string, unknown>) => Promise<SubmitResult | void>
}

const CampaignForm: React.FC<FormComponentProps> = ({ formId }) => {
  const [meta, setMeta] = React.useState<FormMeta | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [values, setValues] = React.useState<Record<string, unknown>>({})
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    let mounted = true
    const fetchMeta = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/forms/${encodeURIComponent(formId)}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`Failed to load form: ${res.status}`)
        const data = await res.json()
        if (!mounted) return
        // Expecting { id, name, fields: [...] }
        setMeta(data)
        // initialize values
        const initial: Record<string, unknown> = {}
        ;(data.fields || []).forEach((f: FieldMeta) => {
          initial[f.name] = ''
        })
        setValues(initial)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchMeta()
    return () => {
      mounted = false
    }
  }, [formId])

  const handleChange = (name: string, v: unknown) => {
    setValues((s) => ({ ...s, [name]: v }))
    setFieldErrors((s) => ({ ...s, [name]: '' }))
  }

  const validate = (): boolean => {
    if (!meta) return false
    const errs: Record<string, string> = {}
    for (const f of meta.fields || []) {
      const val = values[f.name]
      if (f.required && (val === undefined || val === null || String(val).trim() === '')) {
        errs[f.name] = 'This field is required.'
      }
      // additional validation could be added here (pattern, email, min/max etc.)
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      // If host provided a submit handler, call it and allow it to control
      // the network/response handling. The handler may return field errors
      // or a success message.

      // Default behavior: POST to the built-in endpoint
      const payload = { data: values }
      const res = await fetch(`/api/forms/${encodeURIComponent(formId)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Submit failed: ${res.status} ${text}`)
      }
      const body = await res.json()
      setSuccessMessage(body?.message || 'Form submitted successfully')
      // clear values
      const cleared: Record<string, unknown> = {}
      ;(meta?.fields || []).forEach((f) => (cleared[f.name] = ''))
      setValues(cleared)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Loading form…</div>
  //if (error) return <div className="text-red-600">Error loading form: {error}</div>
  if (!meta) return null

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full sm:w-11/12 md:w-2/3 lg:w-1/3">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {meta.name && <h3 className="text-lg font-semibold">{meta.name}</h3>}
            {meta.fields.map((f) => {
              const val = values[f.name] ?? ''
              const err = fieldErrors[f.name]
              switch (f.blockType) {
                case 'textarea':
                  return (
                    <div key={f.id}>
                      {f.label && (
                        <label className="block text-sm font-medium mb-1">
                          {f.label}
                          {f.required ? ' *' : ''}
                        </label>
                      )}
                      <textarea
                        rows={4}
                        name={f.name}
                        placeholder={f.placeholder}
                        value={String(val ?? '')}
                        onChange={(e) => handleChange(f.name, e.target.value)}
                        className="w-full rounded border px-3 py-2"
                      />
                      {err && <div className="text-red-600 text-sm mt-1">{err}</div>}
                    </div>
                  )
                case 'select':
                  return (
                    <div key={f.id}>
                      {f.label && (
                        <label className="block text-sm font-medium mb-1">
                          {f.label}
                          {f.required ? ' *' : ''}
                        </label>
                      )}
                      <select
                        name={f.name}
                        value={String(val ?? '')}
                        onChange={(e) => handleChange(f.name, e.target.value)}
                        className="w-full rounded border px-3 py-2"
                      >
                        <option value="">Select…</option>
                        {(f.options || []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {err && <div className="text-red-600 text-sm mt-1">{err}</div>}
                    </div>
                  )
                case 'checkbox':
                  return (
                    <div key={f.id} className="flex items-center gap-2">
                      <input
                        id={f.id}
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={(e) => handleChange(f.name, e.target.checked)}
                      />
                      {f.label && <label htmlFor={f.id}>{f.label}</label>}
                      {err && <div className="text-red-600 text-sm mt-1">{err}</div>}
                    </div>
                  )
                default:
                  return (
                    <div key={f.id}>
                      {f.label && (
                        <label className="block text-sm font-medium mb-1">
                          {f.label}
                          {f.required ? ' *' : ''}
                        </label>
                      )}
                      <input
                        type={f.blockType || 'text'}
                        name={f.name}
                        placeholder={f.placeholder}
                        value={String(val ?? '')}
                        onChange={(e) => handleChange(f.name, e.target.value)}
                        className="w-full rounded border px-3 py-2"
                      />
                      {err && <div className="text-red-600 text-sm mt-1">{err}</div>}
                    </div>
                  )
              }
            })}

            {error && <div className="text-red-600">{error}</div>}
            {successMessage && <div className="text-green-600">{successMessage}</div>}

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 rounded bg-primary text-white disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export { CampaignForm }
