'use client'
import React from 'react'
import Image from 'next/image'

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
  // allow file fields to accept multiple files when true
  multiple?: boolean
  // optional server-provided validation
  allowedMimeTypes?: string[]
  maxFileSize?: number
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
  const [previews, setPreviews] = React.useState<Record<string, string[]>>({})
  const fileInputsRef = React.useRef<Record<string, HTMLInputElement | null>>({})

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
          if (f.blockType === 'file') {
            initial[f.name] = f.multiple ? [] : null
          } else {
            initial[f.name] = ''
          }
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

  // cleanup preview object URLs on unmount or when previews change
  React.useEffect(() => {
    return () => {
      Object.values(previews)
        .flat()
        .forEach((u) => {
          try {
            URL.revokeObjectURL(u)
          } catch (_) {
            // ignore
          }
        })
    }
  }, [previews])

  const handleChange = (name: string, v: unknown) => {
    // Client-side validation for file inputs (if meta provides rules)
    if (v instanceof File) {
      const field = meta?.fields.find((f) => f.name === name)
      const fmeta = field as
        | (FieldMeta & { allowedMimeTypes?: string[]; maxFileSize?: number })
        | undefined
      const allowed = fmeta?.allowedMimeTypes ?? [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ]
      const maxSize = fmeta?.maxFileSize ?? 8 * 1024 * 1024
      if (!allowed.includes(v.type)) {
        setFieldErrors((s) => ({ ...s, [name]: 'Invalid file type' }))
        return
      }
      if (v.size > maxSize) {
        setFieldErrors((s) => ({ ...s, [name]: 'File is too large' }))
        return
      }
      // create preview
      const url = URL.createObjectURL(v)
      setPreviews((p) => ({ ...p, [name]: [url] }))
      setValues((s) => ({ ...s, [name]: v }))
      setFieldErrors((s) => ({ ...s, [name]: '' }))
      return
    }
    if (Array.isArray(v) && v.length > 0 && v[0] instanceof File) {
      const files = v as File[]
      const field = meta?.fields.find((f) => f.name === name)
      const fmeta = field as
        | (FieldMeta & { allowedMimeTypes?: string[]; maxFileSize?: number })
        | undefined
      const allowed = fmeta?.allowedMimeTypes ?? [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ]
      const maxSize = fmeta?.maxFileSize ?? 8 * 1024 * 1024
      const invalid = files.some((file) => !allowed.includes(file.type) || file.size > maxSize)
      if (invalid) {
        setFieldErrors((s) => ({ ...s, [name]: 'One or more files are invalid (type/size)' }))
        return
      }

      // Append to existing files when field supports multiple
      const existing = Array.isArray(values[name]) ? (values[name] as File[]) : []

      // dedupe by name+size+lastModified
      const combined = [...existing]
      for (const f of files) {
        const exists = combined.some(
          (e) =>
            (e as File).name === f.name &&
            (e as File).size === f.size &&
            (e as File).lastModified === f.lastModified,
        )
        if (!exists) combined.push(f)
      }

      const urls = combined.map((f) => URL.createObjectURL(f))
      setPreviews((p) => ({ ...p, [name]: urls }))
      setValues((s) => ({ ...s, [name]: combined }))
      setFieldErrors((s) => ({ ...s, [name]: '' }))

      // Reset input so the same file can be selected again from another dialog/location
      const input = fileInputsRef.current[name]
      if (input) input.value = ''

      return
    }

    setValues((s) => ({ ...s, [name]: v }))
    setFieldErrors((s) => ({ ...s, [name]: '' }))
  }

  const validate = (): boolean => {
    if (!meta) return false
    const errs: Record<string, string> = {}
    for (const f of meta.fields || []) {
      const val = values[f.name]
      if (f.required) {
        if (f.blockType === 'file') {
          if (f.multiple) {
            if (!Array.isArray(val) || (val as unknown[]).length === 0) {
              errs[f.name] = 'This field is required.'
            }
          } else {
            if (val === undefined || val === null) {
              errs[f.name] = 'This field is required.'
            }
          }
        } else if (val === undefined || val === null || String(val).trim() === '') {
          errs[f.name] = 'This field is required.'
        }
      }
      // additional validation could be added here (pattern, email, min/max etc.)
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const buildFormData = (values: Record<string, unknown>, fields: FieldMeta[]): FormData => {
    const fd = new FormData()
    for (const f of fields) {
      const v = values[f.name]
      if (f.blockType === 'file') {
        if (Array.isArray(v)) {
          for (const file of v as unknown[]) {
            if (file instanceof File) fd.append('images', file)
          }
        } else if (v instanceof File) {
          fd.append('images', v)
        }
      } else {
        if (v === undefined || v === null) {
          fd.append(f.name, '')
        } else if (typeof v === 'object') {
          fd.append(f.name, JSON.stringify(v))
        } else {
          fd.append(f.name, String(v))
        }
      }
    }
    return fd
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
      const hasFile = Object.values(values).some(
        (v) =>
          v instanceof File ||
          (Array.isArray(v) && (v as unknown[]).some((i) => i instanceof File)),
      )

      let res: Response
      if (hasFile) {
        const form = buildFormData(values, meta!.fields)
        res = await fetch(`/api/forms/${encodeURIComponent(formId)}/submit`, {
          method: 'POST',
          credentials: 'include',
          body: form,
        })
      } else {
        const payload = { data: values }
        res = await fetch(`/api/forms/${encodeURIComponent(formId)}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      }
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
                case 'file':
                  return (
                    <div key={f.id}>
                      {f.label && (
                        <label className="block text-sm font-medium mb-1">
                          {f.label}
                          {f.required ? ' *' : ''}
                        </label>
                      )}
                      <div className="flex gap-2 items-center">
                        <input
                          ref={(el) => {
                            fileInputsRef.current[f.name] = el
                          }}
                          type="file"
                          accept="image/*"
                          multiple={Boolean(f.multiple)}
                          onChange={(e) => {
                            const files = e.target.files
                            if (!files) return handleChange(f.name, f.multiple ? [] : null)
                            if (f.multiple) {
                              handleChange(f.name, Array.from(files))
                            } else {
                              handleChange(f.name, files[0] ?? null)
                            }
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          className="px-3 py-1 inline-flex items-center gap-2 rounded text-sm bg-white border shadow-sm hover:bg-gray-50"
                          onClick={() => fileInputsRef.current[f.name]?.click()}
                        >
                          {/* file icon */}
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect x="6" y="10" width="20" height="12" rx="3" fill="#ECF1F7" />
                            <path d="M10 22L16 14L22 22H10Z" fill="#3784C7" />
                            <circle cx="12.5" cy="14.5" r="2" fill="#62BD69" />
                            <circle cx="24" cy="13" r="2" fill="#F36565" />
                            <rect x="14" y="6" width="4" height="6" rx="1" fill="#556979" />
                            <rect x="13" y="8" width="6" height="2" rx="1" fill="#3784C7" />
                          </svg>

                          {/* <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7"
                            />
                            <path
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16 3v4a2 2 0 0 0 2 2h4"
                            />
                          </svg> */}
                          {Boolean(f.multiple) ? 'Add Images' : 'Add Image'}
                        </button>
                      </div>
                      {val instanceof File && <div className="text-sm mt-1">{val.name}</div>}

                      {/* previews with remove buttons */}
                      {previews[f.name] && previews[f.name].length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {previews[f.name].map((src, i) => (
                            <div key={i} className="relative">
                              <div
                                title={(() => {
                                  const current = values[f.name]
                                  let name = ''
                                  if (Array.isArray(current)) {
                                    const file = current[i] as File | undefined
                                    name = file?.name ?? ''
                                  } else if (current instanceof File) {
                                    name = current.name
                                  }
                                  return name
                                })()}
                              >
                                <Image
                                  src={src}
                                  alt={f.label ?? 'preview'}
                                  width={80}
                                  height={80}
                                  className="object-cover rounded"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  // remove file at index i
                                  const current = values[f.name]
                                  if (Array.isArray(current)) {
                                    const newFiles = (current as File[]).filter(
                                      (_, idx) => idx !== i,
                                    )
                                    setValues((s) => ({ ...s, [f.name]: newFiles }))
                                  } else if (current instanceof File && i === 0) {
                                    setValues((s) => ({ ...s, [f.name]: null }))
                                  }
                                  // revoke object URL and update previews
                                  setPreviews((p) => {
                                    const arr = p[f.name] ? [...p[f.name]] : []
                                    const [removed] = arr.splice(i, 1)
                                    try {
                                      URL.revokeObjectURL(removed)
                                    } catch (_) {}
                                    return { ...p, [f.name]: arr }
                                  })
                                }}
                                className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full w-7 h-7 text-xs flex items-center justify-center shadow-md hover:bg-red-600 hover:text-white transition"
                                aria-label={`Remove file ${i + 1}`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 6h18"
                                  />
                                  <path
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"
                                  />
                                  <path
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M10 11v6"
                                  />
                                  <path
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14 11v6"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {err && <div className="text-red-600 text-sm mt-1">{err}</div>}
                    </div>
                  )
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
