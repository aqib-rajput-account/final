import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { getFeedUploadRule } from '@/lib/feed/media'

export async function POST(request: NextRequest) {
  try {
    await createClient()
    const userId = await resolveAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const uploadRule = getFeedUploadRule(file.type)
    if (!uploadRule) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload an image, video, PDF, document, or text file.' },
        { status: 400 }
      )
    }

    if (file.size > uploadRule.maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${Math.floor(uploadRule.maxSize / (1024 * 1024))}MB.` },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabaseAdmin.storage.createBucket('attachments', {
      public: true,
      fileSizeLimit: uploadRule.maxSize,
    }).catch(() => {})

    const timestamp = Date.now()
    const extension = file.name.includes('.') ? file.name.split('.').pop() : undefined
    const safeExtension = extension ? `.${extension}` : ''
    const filename = `${userId}/${timestamp}${safeExtension}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('attachments')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload to storage: ' + uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('attachments')
      .getPublicUrl(uploadData.path)

    return NextResponse.json({
      url: publicUrl,
      pathname: uploadData.path,
      attachment: {
        url: publicUrl,
        pathname: uploadData.path,
        kind: uploadRule.kind,
        mimeType: file.type,
        name: file.name,
        size: file.size,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
