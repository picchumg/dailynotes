import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ShareNoteForm from '@/components/ShareNoteForm'

export default async function ShareNotePage({ params }: { params: Promise<{ date: string }> | { date: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedParams = await params
  const { date } = resolvedParams

  // Get the note for this date
  const { data: note } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  if (!note) {
    redirect(`/notes/${date}`)
  }

  // Get user's friends
  const { data: friends } = await supabase
    .from('friends')
    .select(`
      friend_id,
      friend:friend_id (
        id,
        username,
        full_name
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'accepted')

  // Get already shared with
  const { data: sharedWith } = await supabase
    .from('shared_notes')
    .select('friend_id')
    .eq('note_id', note.id)

  const sharedFriendIds = sharedWith?.map(s => s.friend_id) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href={`/notes/${date}`} className="text-xl font-semibold text-gray-900">
              ← Back to Note
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900">Share Note</h2>
        
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <ShareNoteForm
            noteId={note.id}
            friends={friends || []}
            sharedFriendIds={sharedFriendIds}
          />
        </div>
      </main>
    </div>
  )
}

