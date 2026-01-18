-- Fix: Add policy to allow users to search for other profiles
-- Run this in your Supabase SQL Editor if search is not working

CREATE POLICY "Users can view other profiles for searching"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

