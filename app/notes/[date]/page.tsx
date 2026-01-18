import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NoteEditor from '@/components/NoteEditor'
import Link from 'next/link'

export default async function NotePage({ params }: { params: Promise<{ date: string }> | { date: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedParams = await params
  const { date } = resolvedParams

  // Get all friends (both directions)
  const { data: friendsIAdded } = await supabase
    .from('friends')
    .select('friend_id')
    .eq('user_id', user.id)
    .eq('status', 'accepted')

  const { data: friendsWhoAddedMe } = await supabase
    .from('friends')
    .select('user_id')
    .eq('friend_id', user.id)
    .eq('status', 'accepted')

  // Combine all friend IDs
  const friendIds = [
    ...(friendsIAdded?.map(f => f.friend_id) || []),
    ...(friendsWhoAddedMe?.map(f => f.user_id) || []),
    user.id // Include current user
  ]

  // Get all notes for this date from user and all friends
  const { data: allNotesData } = await supabase
    .from('notes')
    .select('*')
    .eq('date', date)
    .in('user_id', friendIds)
    .order('created_at', { ascending: true })

  // Get profiles for all note authors
  const noteUserIds = allNotesData?.map(n => n.user_id) || []
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .in('id', noteUserIds)

  // Combine notes with user profiles
  const allNotes = (allNotesData || []).map(note => ({
    ...note,
    user: profiles?.find(p => p.id === note.user_id) || { id: note.user_id, username: null, full_name: null }
  }))

  // Get user's own note (or create placeholder)
  const userNote = allNotes.find(n => n.user_id === user.id) || null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-semibold text-gray-900">
              ← Back to Calendar
            </Link>
          </div>
        </div>
      </nav>

      <main className="py-8">
        <NoteEditor date={date} userNote={userNote} allNotes={allNotes || []} userId={user.id} />
      </main>
    </div>
  )
}

