const PAYLOAD_BASE = process.env.PAYLOAD_BASE_URL || process.env.NEXT_PUBLIC_SERVER_URL || ''

export async function getFormConfig(formId: string) {
  const res = await fetch(`${PAYLOAD_BASE}/api/forms/${encodeURIComponent(formId)}`)
  if (!res.ok) throw new Error(`Failed to fetch form config: ${res.status}`)
  return res.json()
}

export default getFormConfig
