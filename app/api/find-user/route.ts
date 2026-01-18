import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchTerm } = await request.json()

  if (!searchTerm) {
    return NextResponse.json({ error: 'Search term required' }, { status: 400 })
  }

  // Search by username
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .ilike('username', `%${searchTerm}%`)
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: profile || [] })
}

