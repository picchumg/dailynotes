'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FriendRequest {
  id: string
  user_id: string
  status: string
  user: {
    id: string
    username: string | null
    full_name: string | null
  }
}

interface FriendRequestsProps {
  userId: string
}

export default function FriendRequests({ userId }: FriendRequestsProps) {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadRequests()
  }, [userId])

  const loadRequests = async () => {
    try {
      // Get pending friend requests where friend_id = userId (requests sent to me)
      const { data, error } = await supabase
        .from('friends')
        .select('id, user_id, status')
        .eq('friend_id', userId)
        .eq('status', 'pending')

      if (error) {
        console.error('Error loading friend requests:', error)
        setLoading(false)
        return
      }


      if (data && data.length > 0) {
        // Fetch profile data for each requester
        const requesterIds = data.map(r => r.user_id)
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', requesterIds)

        if (profileError) {
          console.error('Error loading profiles:', profileError)
        }

        if (profiles) {
          const requestsWithProfiles = data.map(request => {
            const profile = profiles.find(p => p.id === request.user_id)
            return {
              id: request.id,
              user_id: request.user_id,
              status: request.status,
              user: profile || { id: request.user_id, username: null, full_name: null }
            }
          })
          setRequests(requestsWithProfiles)
        } else {
          setRequests([])
        }
      } else {
        setRequests([])
      }
    } catch (err) {
      console.error('Unexpected error loading friend requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const acceptRequest = async (requestId: string, requesterId: string) => {
    // Update the request to accepted
    await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId)

    // Create reverse friendship
    await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: requesterId,
        status: 'accepted',
      })

    loadRequests()
    // Refresh the page to show updated friends list
    window.location.reload()
  }

  const declineRequest = async (requestId: string) => {
    await supabase
      .from('friends')
      .delete()
      .eq('id', requestId)

    loadRequests()
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

  if (requests.length === 0) {
    return <div className="text-sm text-gray-500">No pending friend requests</div>
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center justify-between rounded-md border border-gray-200 p-3"
        >
          <div>
            <div className="font-medium text-gray-900">
              {request.user.full_name || request.user.username || 'Unknown'}
            </div>
            {request.user.username && (
              <div className="text-sm text-gray-500">@{request.user.username}</div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => acceptRequest(request.id, request.user_id)}
              className="rounded-md bg-gray-900 px-3 py-1 text-sm font-medium text-white hover:bg-gray-800"
            >
              Accept
            </button>
            <button
              onClick={() => declineRequest(request.id)}
              className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

