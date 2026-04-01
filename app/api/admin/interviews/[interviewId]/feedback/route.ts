import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  const supabaseAuth = await createClient()
  const { data: { user: authUser } } = await supabaseAuth.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()

  // Verify user is staff
  const { data: staffUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!staffUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { interviewId } = await params
    const body = await request.json()
    const { rating_overall, ratings_json, comments, recommendation } = body

    const { error } = await (supabase.from('interview_feedback') as any).upsert({
      interview_id: interviewId,
      reviewer_id: authUser.id,
      rating_overall,
      ratings_json,
      comments,
      recommendation,
    })

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit feedback' }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  const supabaseAuth = await createClient()
  const { data: { user: authUser } } = await supabaseAuth.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { interviewId } = await params

  const { data: interview, error } = await supabase
    .from('interviews')
    .select('*, applications(*, job_postings(*), applicants(*))')
    .eq('id', interviewId)
    .single()

  if (error || !interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  return NextResponse.json(interview)
}
