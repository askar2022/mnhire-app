import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { formatDate, formatDateTime } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { ApplicationActions } from '@/components/admin/ApplicationActions'

export default async function ApplicationReviewPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const user = await requireRole(['HR', 'Admin', 'Principal', 'HiringManager',
    'AcademicDirector', 'SPEDDirector', 'OperationManager', 'AssistantPrincipal', 'ITSupport', 'ExecutiveDirector'])
  const supabase = await createClient()

  // Get application with all related data
  const { data: application } = await (supabase as any)
    .from('applications')
    .select(`
      *,
      job_postings (*),
      applicants (*),
      application_stage_history (
        *,
        users (name, role)
      ),
      interviews (
        *,
        interview_feedback (
          *,
          users (name)
        )
      ),
      offers (*),
      application_answers (*)
    `)
    .eq('id', applicationId)
    .single()

  if (!application) {
    notFound()
  }

  // Check access
  if (!['HR', 'Admin'].includes(user.role)) {
    const { data: job } = await supabase
      .from('job_postings')
      .select('hiring_manager_id')
      .eq('id', application.job_posting_id)
      .single()

    if (job?.hiring_manager_id !== user.id) {
      notFound()
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <a
            href="/admin/jobs"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium mb-4 inline-block"
          >
            ← Back to Jobs
          </a>
          <h1 className="text-3xl font-bold text-gray-900">
            Application Review: {application.applicants?.first_name} {application.applicants?.last_name}
          </h1>
          <p className="text-gray-600 mt-2">
            {application.job_postings?.title} • {application.job_postings?.school_site}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Applicant Information</h2>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {application.applicants?.first_name} {application.applicants?.last_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{application.applicants?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {application.applicants?.phone || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Years of Experience</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {application.years_experience || 'N/A'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Certifications</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {application.certifications || 'None listed'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Documents */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
              <div className="space-y-3">
                {application.resume_url && (
                  <a
                    href={application.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary-600 hover:text-primary-700"
                  >
                    📄 View Resume →
                  </a>
                )}
                {application.cover_letter_url && (
                  <a
                    href={application.cover_letter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary-600 hover:text-primary-700"
                  >
                    📄 View Cover Letter →
                  </a>
                )}
              </div>
            </div>

            {/* Application Answers */}
            {application.application_answers && application.application_answers.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Questions</h2>
                <div className="space-y-4">
                  {application.application_answers.map((answer: any) => (
                    <div key={answer.id}>
                      <h3 className="font-medium text-gray-900 mb-1">{answer.question}</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{answer.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {application.application_stage_history && application.application_stage_history.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline</h2>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {application.application_stage_history
                      .sort((a: any, b: any) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
                      .map((history: any, idx: number) => (
                        <li key={history.id}>
                          <div className="relative pb-8">
                            {idx !== application.application_stage_history.length - 1 && (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            )}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center ring-8 ring-white">
                                  <span className="h-2 w-2 rounded-full bg-white"></span>
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Status changed to <span className="font-medium">{history.to_status}</span>
                                  </p>
                                  {history.comment && (
                                    <p className="text-sm text-gray-400 mt-1">{history.comment}</p>
                                  )}
                                  {history.users && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      by {history.users.name} ({history.users.role})
                                    </p>
                                  )}
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  {formatDateTime(history.changed_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Interviews */}
            {application.interviews && application.interviews.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Interviews</h2>
                <div className="space-y-4">
                  {application.interviews.map((interview: any) => (
                    <div key={interview.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{interview.stage}</h3>
                        <span className="text-sm text-gray-500">{interview.status}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Scheduled: {formatDateTime(interview.scheduled_at)}
                      </p>
                      {interview.location && (
                        <p className="text-sm text-gray-600">Location: {interview.location}</p>
                      )}
                      {interview.interview_feedback && interview.interview_feedback.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-medium text-gray-900">Feedback:</h4>
                          {interview.interview_feedback.map((feedback: any) => (
                            <div key={feedback.id} className="text-sm text-gray-700">
                              <p className="font-medium">{feedback.users?.name}</p>
                              <p>Rating: {feedback.rating_overall}/5</p>
                              <p>Recommendation: {feedback.recommendation}</p>
                              {feedback.comments && <p className="mt-1">{feedback.comments}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ApplicationActions application={application} currentUser={user} />
          </div>
        </div>
      </div>
    </div>
  )
}

