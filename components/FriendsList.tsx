'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Friend {
  id: string
  friend_id: string
  status: string
  friend: {
    id: string
    username: string | null
    full_name: string | null
  }
}

interface FriendsListProps {
  userId: string
}

export default function FriendsList({ userId }: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadFriends()
  }, [userId])

  const loadFriends = async () => {
    // Get friends where user_id = userId (friends I added)
    const { data: friendsIAdded } = await supabase
      .from('friends')
      .select(`
        id,
        friend_id,
        status,
        friend:friend_id (
          id,
          username,
          full_name
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted')

    // Get friends where friend_id = userId (friends who added me)
    // We need to query profiles directly since we can't easily reverse the foreign key
    const { data: friendsWhoAddedMe } = await supabase
      .from('friends')
      .select('id, user_id, status')
      .eq('friend_id', userId)
      .eq('status', 'accepted')

    // Fetch profile data for friends who added me
    let allFriends: Friend[] = []
    
    if (friendsIAdded) {
      allFriends.push(...(friendsIAdded as Friend[]))
    }
    
    if (friendsWhoAddedMe && friendsWhoAddedMe.length > 0) {
      const requesterIds = friendsWhoAddedMe.map(f => f.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', requesterIds)

      if (profiles) {
        const transformed = friendsWhoAddedMe.map(f => {
          const profile = profiles.find(p => p.id === f.user_id)
          return {
            id: f.id,
            friend_id: f.user_id,
            status: f.status,
            friend: profile || { id: f.user_id, username: null, full_name: null }
          }
        })
        allFriends.push(...transformed)
      }
    }

    setFriends(allFriends)
    setLoading(false)
  }

  const removeFriend = async (friendId: string) => {
    await supabase
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId)
    
    await supabase
      .from('friends')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', userId)
    
    loadFriends()
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

  if (friends.length === 0) {
    return <div className="text-sm text-gray-500">No friends yet. Add one above!</div>
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => (
        <div
          key={friend.id}
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
            onClick={() => removeFriend(friend.friend_id)}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}

