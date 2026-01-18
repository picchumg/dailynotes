-- Fix: Add DELETE policy for friends table
-- Run this in your Supabase SQL Editor if friend requests can't be declined

CREATE POLICY "Users can delete their own friendships"
  ON public.friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

