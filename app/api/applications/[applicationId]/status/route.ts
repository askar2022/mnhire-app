import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { sendStatusUpdateEmail, sendJobOfferEmail, sendWelcomeEmail, sendHRStatusUpdateEmail } from '@/lib/email'

export async function POST(
  request: Request,
  { params }: { params: { applicationId: string } }
) {
  try {
    const user = await requireRole(['HR', 'Admin', 'Principal', 'HiringManager'])
    const supabase = await createClient()
    const db = supabase as any
    const { status, comment } = await request.json()

    const { data: application } = await db
      .from('applications')
      .select('status, job_posting_id')
      .eq('id', params.applicationId)
      .single()

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (!['HR', 'Admin'].includes(user.role)) {
      const { data: job } = await db
        .from('job_postings')
        .select('hiring_manager_id')
        .eq('id', application.job_posting_id)
        .single()

      if (job?.hiring_manager_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const { error: updateError } = await db
      .from('applications')
      .update({ status })
      .eq('id', params.applicationId)

    if (updateError) throw updateError

    await db.from('application_stage_history').insert({
      application_id: params.applicationId,
      from_status: application.status,
      to_status: status,
      changed_by: user.id,
      comment: comment || null,
    })

    db
      .from('applications')
      .select('applicant_id, job_posting_id, applicants!inner(first_name, last_name, email), job_postings!inner(title, school_site)')
      .eq('id', params.applicationId)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.applicants && data?.job_postings) {
          const applicant = Array.isArray(data.applicants) ? data.applicants[0] : data.applicants
          const jobPosting = Array.isArray(data.job_postings) ? data.job_postings[0] : data.job_postings

          if (applicant && jobPosting) {
            const applicantName = `${applicant.first_name} ${applicant.last_name}`

            if (status === 'Offer') {
              sendJobOfferEmail(applicant.email, applicantName, jobPosting.title, jobPosting.school_site, comment || 'To be determined')
                .catch(() => {})
            } else if (status === 'Hired') {
              sendWelcomeEmail(applicant.email, applicantName, jobPosting.title, jobPosting.school_site, comment || 'To be determined')
                .catch(() => {})
            } else {
              sendStatusUpdateEmail(applicant.email, applicantName, jobPosting.title, status, comment)
                .catch(() => {})
            }

            sendHRStatusUpdateEmail(applicantName, applicant.email, jobPosting.title, jobPosting.school_site, status, comment, params.applicationId)
              .catch(() => {})
          }
        }
      })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
