import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarView from '@/components/Calendar'
import Link from 'next/link'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

  // Combine all friend IDs (including current user)
  const friendIds = [
    ...(friendsIAdded?.map(f => f.friend_id) || []),
    ...(friendsWhoAddedMe?.map(f => f.user_id) || []),
    user.id
  ]

  // Get all notes dates from user and all friends
  const { data: allNotes } = await supabase
    .from('notes')
    .select('date')
    .in('user_id', friendIds)
    .order('date', { ascending: false })

  // Get unique dates
  const notesDates = Array.from(new Set(allNotes?.map(n => n.date) || []))

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/friends"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Friends
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <CalendarView notesDates={notesDates} />
        </div>
      </main>
    </div>
  )
}

