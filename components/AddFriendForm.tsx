'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AddFriendFormProps {
  userId: string
}

interface SearchResult {
  id: string
  username: string | null
  full_name: string | null
}

export default function AddFriendForm({ userId }: AddFriendFormProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch(searchTerm.trim())
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const performSearch = async (term: string) => {
    if (term.length < 2) return

    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .ilike('username', `%${term}%`)
        .neq('id', userId) // Exclude current user
        .limit(10)

      if (error) {
        console.error('Search error:', error)
        setMessage({ type: 'error', text: `Search failed: ${error.message}` })
        setSearchResults([])
        return
      }

      setSearchResults(data || [])
      setShowResults(true)
    } catch (error: any) {
      console.error('Search error:', error)
      setMessage({ type: 'error', text: `Search failed: ${error.message || 'Unknown error'}` })
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddFriend = async (friendId: string, friendName: string) => {
    setLoading(true)
    setMessage(null)
    setShowResults(false)
    setSearchTerm('')

    try {
      if (friendId === userId) {
        setMessage({ type: 'error', text: 'You cannot add yourself' })
        setLoading(false)
        return
      }

      // Check if already friends
      const { data: existing } = await supabase
        .from('friends')
        .select('id, status')
        .eq('user_id', userId)
        .eq('friend_id', friendId)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'accepted') {
          setMessage({ type: 'error', text: 'You are already friends' })
        } else {
          setMessage({ type: 'error', text: 'Friend request already sent' })
        }
        setLoading(false)
        return
      }

      // Create friendship request (pending status)
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: userId,
          friend_id: friendId,
          status: 'pending',
        })

      if (error) {
        if (error.code === '23505') {
          setMessage({ type: 'error', text: 'Friend request already sent or already friends' })
        } else {
          setMessage({ type: 'error', text: error.message })
        }
      } else {
        setMessage({ type: 'success', text: `Friend request sent to ${friendName}!` })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add friend' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative" ref={searchRef}>
        <input
          type="text"
          placeholder="Start typing to search for friends..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
        {searching && (
          <div className="absolute right-3 top-2.5 text-gray-400 text-xs">Searching...</div>
        )}
        
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleAddFriend(user.id, user.full_name || user.username || 'User')}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">
                  {user.full_name || user.username || 'Unknown'}
                </div>
                {user.username && (
                  <div className="text-sm text-gray-500">@{user.username}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {showResults && searchTerm.length >= 2 && searchResults.length === 0 && !searching && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg px-4 py-3 text-sm text-gray-500">
            No users found
          </div>
        )}
      </div>

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

      {loading && (
        <div className="text-sm text-gray-500">Adding friend...</div>
      )}
    </div>
  )
}

