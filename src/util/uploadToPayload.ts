const PAYLOAD_BASE = process.env.PAYLOAD_BASE_URL || process.env.NEXT_PUBLIC_SERVER_URL || ''
const PAYLOAD_TOKEN = process.env.PAYLOAD_API_TOKEN || process.env.PAYLOAD_SECRET || ''

export type UploadedMedia = {
  id: string
  url: string
  filename?: string
}

export async function uploadFilesToPayload(
  files: Array<File | (Blob & { name?: string })>,
): Promise<UploadedMedia[]> {
  const uploaded: UploadedMedia[] = []

  for (const f of files) {
    const fd = new FormData()
    // File may be a web File or a Blob with name
    const filename = ((f as File & { name?: string }).name as string) || 'upload'
    fd.append('file', f as Blob, filename)

    const res = await fetch(`${PAYLOAD_BASE}/api/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYLOAD_TOKEN}`,
      },
      body: fd as unknown as BodyInit,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Upload to Payload failed: ${res.status} ${text}`)
    }

    const body = await res.json()
    uploaded.push({
      id: String(body?.id ?? body?.doc?.id ?? ''),
      url: String(body?.url ?? body?.doc?.url ?? ''),
      filename,
    })
  }

  return uploaded
}

export default uploadFilesToPayload
