import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import uploadFilesToPayload from '@/util/uploadToPayload'
import getFormConfig from '@/util/getFormConfig'
import util from 'util'

type Json = Record<string, unknown>

export async function POST(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  console.log('Form submission for formId:', formId)
  // Only support the campaign form proxy for now
  if (formId !== '2') {
    return NextResponse.json({ success: false, error: 'Unsupported form' }, { status: 400 })
  }

  // Read the server-side httpOnly cookie
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get('donorapi-accesstoken-jwt')
  if (!tokenCookie || !tokenCookie.value) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  const token = tokenCookie.value

  let body: Json = {}
  const contentType = (req.headers.get('content-type') || '').toLowerCase()
  const isMultipart = contentType.includes('multipart/form-data')

  try {
    if (!isMultipart) {
      body = await req.json()
      if (body && typeof body.data === 'object' && body.data !== null) {
        const data = body.data as { amountRequired?: unknown }
        data.amountRequired = Number(data.amountRequired) || 0
        body.data = data
      }
      console.log('Received form data:', body)
    } else {
      console.log('Received multipart/form-data request')
    }
  } catch (_e) {
    // ignore parse errors
    console.log('Failed to parse request body', _e)
  }

  try {
    const apiUrl = 'http://api.salmanhome.com/api/v1/campaigns'

    console.log('Received form data:', JSON.stringify(body?.data ?? body))

    let forwardResp: Response
    if (isMultipart) {
      // Fetch form config to decide storage target for file fields
      const formConfig = await getFormConfig(formId).catch(() => null)

      const form = await req.formData()

      // Group files by field name from form data
      const filesByField: Record<string, File[]> = {}
      for (const [k, v] of form.entries()) {
        // v may be a string or a File
        if (v instanceof File) {
          filesByField[k] = filesByField[k] || []
          filesByField[k].push(v)
        }
      }

      type FieldConfig = {
        name: string
        blockType?: string
        storageTarget?: string
        allowedMimeTypes?: string[]
        maxFileSize?: number
        multiple?: boolean
      }

      const fieldsConfig: FieldConfig[] = (formConfig?.fields as FieldConfig[]) ?? []
      const fileFields = fieldsConfig.filter((f) => f.blockType === 'file')
      const shouldUsePayload = fileFields.some(
        (f) => (f.storageTarget || 'donornest') === 'payload',
      )

      console.log('File fields in form:', util.inspect(fileFields, { depth: null }))
      console.log('Should use Payload for file uploads:', shouldUsePayload)

      if (shouldUsePayload) {
        // Build submissionData and upload files to Payload
        const submissionData: { field: string; value: string }[] = []

        for (const f of fieldsConfig) {
          if (f.blockType === 'file') {
            const files = filesByField[f.name] ?? []
            if (files.length === 0) {
              submissionData.push({ field: f.name, value: '' })
              continue
            }

            const allowed =
              f.allowedMimeTypes && f.allowedMimeTypes.length > 0
                ? f.allowedMimeTypes
                : (process.env.UPLOAD_ALLOWED_MIME_TYPES || '').split(',').filter(Boolean)
            const maxSize = f.maxFileSize ?? Number(process.env.UPLOAD_MAX_FILE_SIZE || 5242880)

            for (const file of files) {
              const mime = file.type || ''
              if (allowed.length > 0 && !allowed.includes(mime)) {
                return NextResponse.json(
                  { success: false, error: `Invalid file type: ${mime}` },
                  { status: 400 },
                )
              }
              const size = Number(file.size || 0)
              if (size > maxSize) {
                return NextResponse.json(
                  { success: false, error: `File too large: ${file.name || 'file'}` },
                  { status: 400 },
                )
              }
            }

            const uploaded = await uploadFilesToPayload(files)
            if (f.multiple) {
              submissionData.push({
                field: f.name,
                value: JSON.stringify(uploaded.map((u) => u.url)),
              })
            } else {
              submissionData.push({ field: f.name, value: uploaded[0]?.url ?? '' })
            }
          } else {
            const val = form.get(f.name)
            submissionData.push({
              field: f.name,
              value: val === undefined || val === null ? '' : String(val),
            })
          }
        }

        const payloadBase = process.env.PAYLOAD_BASE_URL || process.env.NEXT_PUBLIC_SERVER_URL || ''
        const payloadToken = process.env.PAYLOAD_API_TOKEN || process.env.PAYLOAD_SECRET || ''

        const createRes = await fetch(`${payloadBase}/api/form-submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${payloadToken}`,
          },
          body: JSON.stringify({ form: Number(formId) || formId, submissionData }),
        })

        if (!createRes.ok) {
          const text = await createRes.text()
          return NextResponse.json(
            { success: false, error: `Failed to create submission: ${createRes.status} ${text}` },
            { status: 502 },
          )
        }

        const created = await createRes.json()
        return NextResponse.json({ success: true, data: created })
      }

      // Fallback: forward FormData to DonorNest API
      const formToForward = form
      forwardResp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formToForward as unknown as BodyInit,
      })
    } else {
      forwardResp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body?.data ?? body),
      })
    }

    const text = await forwardResp.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch (_) {
      // not JSON
    }

    if (!forwardResp.ok) {
      return NextResponse.json(
        { success: false, error: data ?? forwardResp.statusText },
        { status: forwardResp.status },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
