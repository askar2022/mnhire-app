import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabaseAuth = await createClient()
  const { data: { user: authUser } } = await supabaseAuth.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: staffUser } = await (supabase.from('users') as any)
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!staffUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const { application_id, stage, scheduled_at, location, join_link, participants } = body

    if (!application_id || !stage || !scheduled_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: interview, error: interviewError } = await (supabase.from('interviews') as any)
      .insert({
        application_id,
        stage,
        scheduled_at,
        location: location || null,
        join_link: join_link || null,
        created_by: authUser.id,
      })
      .select()
      .single()

    if (interviewError) throw new Error(interviewError.message)

    if (participants && participants.length > 0) {
      const participantRows = participants.map((userId: string) => ({
        interview_id: interview.id,
        user_id: userId,
      }))
      await (supabase.from('interview_participants') as any).insert(participantRows)
    }

    const newStatus = stage === 'Phone Screen' ? 'Phone Screen' : 'Interview'
    await (supabase.from('applications') as any)
      .update({ status: newStatus })
      .eq('id', application_id)

    await (supabase.from('application_stage_history') as any).insert({
      application_id,
      to_status: newStatus,
      changed_by: authUser.id,
      comment: `Interview scheduled: ${stage}`,
    })

    const { data: applicationData } = await (supabase.from('applications') as any)
      .select('applicants!inner(first_name, last_name, email), job_postings!inner(title)')
      .eq('id', application_id)
      .single()

    if (applicationData?.applicants && applicationData?.job_postings) {
      const applicant = Array.isArray(applicationData.applicants)
        ? applicationData.applicants[0]
        : applicationData.applicants
      const jobPosting = Array.isArray(applicationData.job_postings)
        ? applicationData.job_postings[0]
        : applicationData.job_postings

      if (applicant && jobPosting) {
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://demo.mnhire.org').replace(/\/$/, '')
        fetch(`${appUrl}/api/emails/interview-scheduled`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicantEmail: applicant.email,
            applicantName: `${applicant.first_name} ${applicant.last_name}`,
            jobTitle: jobPosting.title,
            interviewDetails: { stage, scheduled_at, location, join_link },
          }),
        }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, interviewId: interview.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to schedule interview' }, { status: 500 })
  }
}

export async function GET() {
  const supabaseAuth = await createClient()
  const { data: { user: authUser } } = await supabaseAuth.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: users } = await (supabase.from('users') as any)
    .select('id, name, email, role')
    .in('role', ['HR', 'Admin', 'Principal', 'HiringManager', 'Interviewer',
      'AcademicDirector', 'SPEDDirector', 'OperationManager', 'AssistantPrincipal', 'ITSupport', 'ExecutiveDirector'])

  return NextResponse.json(users ?? [])
}
