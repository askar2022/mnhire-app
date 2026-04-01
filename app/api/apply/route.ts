import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabaseAuth = await createClient()
  const { data: { user: authUser } } = await supabaseAuth.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const db = supabase as any

  try {
    const formData = await request.formData()

    const jobId = formData.get('jobId') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const zip = formData.get('zip') as string
    const yearsExperience = formData.get('yearsExperience') as string
    const certifications = formData.get('certifications') as string
    const source = (formData.get('source') as string) || 'Website'
    const answersRaw = formData.get('answers') as string
    const answers = answersRaw ? JSON.parse(answersRaw) : {}
    const resumeFile = formData.get('resume') as File | null
    const coverLetterFile = formData.get('coverLetter') as File | null

    if (!jobId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: job } = await db
      .from('job_postings')
      .select('id')
      .eq('id', jobId)
      .eq('posting_status', 'Published')
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found or not available' }, { status: 404 })
    }

    let applicantId: string

    const { data: existing } = await db
      .from('applicants')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      await db.from('applicants').update({
        first_name: firstName, last_name: lastName,
        phone, address, city, state, zip,
      }).eq('id', existing.id)
      applicantId = existing.id
    } else {
      const { data: newApplicant, error: applicantError } = await db
        .from('applicants')
        .insert({ first_name: firstName, last_name: lastName, email, phone, address, city, state, zip })
        .select('id')
        .single()

      if (applicantError) throw new Error(applicantError.message)
      applicantId = newApplicant.id
    }

    let resumeUrl: string | null = null
    let coverLetterUrl: string | null = null

    if (resumeFile && resumeFile.size > 0) {
      const fileExt = resumeFile.name.split('.').pop()
      const fileName = `${applicantId}/resume_${Date.now()}.${fileExt}`
      const fileBuffer = Buffer.from(await resumeFile.arrayBuffer())
      const { error: uploadError } = await supabase.storage
        .from('applications')
        .upload(fileName, fileBuffer, { contentType: resumeFile.type })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('applications').getPublicUrl(fileName)
      resumeUrl = urlData.publicUrl
    }

    if (coverLetterFile && coverLetterFile.size > 0) {
      const fileExt = coverLetterFile.name.split('.').pop()
      const fileName = `${applicantId}/cover_${Date.now()}.${fileExt}`
      const fileBuffer = Buffer.from(await coverLetterFile.arrayBuffer())
      const { error: uploadError } = await supabase.storage
        .from('applications')
        .upload(fileName, fileBuffer, { contentType: coverLetterFile.type })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('applications').getPublicUrl(fileName)
      coverLetterUrl = urlData.publicUrl
    }

    const { data: application, error: appError } = await db
      .from('applications')
      .insert({
        job_posting_id: jobId,
        applicant_id: applicantId,
        source,
        status: 'Submitted',
        resume_url: resumeUrl,
        cover_letter_url: coverLetterUrl,
        years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        certifications: certifications || null,
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (appError) throw new Error(appError.message)

    if (Object.keys(answers).length > 0) {
      const answerRows = Object.entries(answers).map(([question, answer]) => ({
        application_id: application.id, question, answer,
      }))
      await db.from('application_answers').insert(answerRows)
    }

    await db.from('application_stage_history').insert({
      application_id: application.id,
      to_status: 'Submitted',
      comment: 'Application submitted',
    })

    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://demo.mnhire.org'}/api/emails/application-submitted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: application.id }),
    }).catch(() => {})

    return NextResponse.json({ success: true, applicationId: application.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Submission failed' }, { status: 500 })
  }
}
