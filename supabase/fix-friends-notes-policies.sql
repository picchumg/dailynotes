-- Fix: Update RLS policies to allow friends to view and edit each other's notes
-- Run this in your Supabase SQL Editor

-- Drop old policies
DROP POLICY IF EXISTS "Users can view shared notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update shared notes" ON public.notes;

-- Add new policies for friends to view and edit each other's notes
CREATE POLICY "Users can view friends' notes"
  ON public.notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friends
      WHERE friends.user_id = notes.user_id
      AND friends.friend_id = auth.uid()
      AND friends.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM public.friends
      WHERE friends.friend_id = notes.user_id
      AND friends.user_id = auth.uid()
      AND friends.status = 'accepted'
    )
  );

CREATE POLICY "Users can update friends' notes"
  ON public.notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.friends
      WHERE friends.user_id = notes.user_id
      AND friends.friend_id = auth.uid()
      AND friends.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM public.friends
      WHERE friends.friend_id = notes.user_id
      AND friends.user_id = auth.uid()
      AND friends.status = 'accepted'
    )
  );

