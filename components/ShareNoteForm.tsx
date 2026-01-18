'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Friend {
  friend_id: string
  friend: {
    id: string
    username: string | null
    full_name: string | null
  }
}

interface ShareNoteFormProps {
  noteId: string
  friends: Friend[]
  sharedFriendIds: string[]
}

export default function ShareNoteForm({ noteId, friends, sharedFriendIds }: ShareNoteFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const toggleShare = async (friendId: string, isShared: boolean) => {
    setLoading(true)
    setMessage(null)

    try {
      if (isShared) {
        // Unshare
        const { error } = await supabase
          .from('shared_notes')
          .delete()
          .eq('note_id', noteId)
          .eq('friend_id', friendId)

        if (error) throw error
        setMessage({ type: 'success', text: 'Note unshared' })
      } else {
        // Share
        const { data: note } = await supabase
          .from('notes')
          .select('user_id')
          .eq('id', noteId)
          .single()

        if (!note) throw new Error('Note not found')

        const { error } = await supabase
          .from('shared_notes')
          .insert({
            note_id: noteId,
            user_id: note.user_id,
            friend_id: friendId,
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Note shared!' })
      }
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update sharing' })
    } finally {
      setLoading(false)
    }
  }

  if (friends.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        You don't have any friends yet. <a href="/friends" className="text-gray-900 underline">Add some friends</a> to share notes with them.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
      <div className="space-y-2">
        {friends.map((friend) => {
          const isShared = sharedFriendIds.includes(friend.friend_id)
          return (
            <div
              key={friend.friend_id}
              className="flex items-center justify-between rounded-md border border-gray-200 p-3"
            >
              <div>
                <div className="font-medium text-gray-900">
                  {friend.friend.full_name || friend.friend.username || 'Unknown'}
                </div>
                {friend.friend.username && (
                  <div className="text-sm text-gray-500">@{friend.friend.username}</div>
                )}
              </div>
              <button
                onClick={() => toggleShare(friend.friend_id, isShared)}
                disabled={loading}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  isShared
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50`}
              >
                {isShared ? 'Unshare' : 'Share'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

