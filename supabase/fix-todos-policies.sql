-- Fix: Ensure todos policies allow friends to see and edit todos from shared notes
-- Run this in your Supabase SQL Editor

-- Drop existing todos policies
DROP POLICY IF EXISTS "Users can view todos for their notes" ON public.todos;
DROP POLICY IF EXISTS "Users can create todos for their notes" ON public.todos;
DROP POLICY IF EXISTS "Users can update todos for their notes" ON public.todos;
DROP POLICY IF EXISTS "Users can delete todos for their notes" ON public.todos;

-- Recreate with friend access
CREATE POLICY "Users can view todos for their notes"
  ON public.todos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = todos.note_id
      AND (
        notes.user_id = auth.uid()
        OR EXISTS (
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
      )
    )
  );

CREATE POLICY "Users can create todos for their notes"
  ON public.todos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = todos.note_id
      AND (
        notes.user_id = auth.uid()
        OR EXISTS (
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
      )
    )
    AND auth.uid() = todos.user_id
  );

CREATE POLICY "Users can update todos for their notes"
  ON public.todos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = todos.note_id
      AND (
        notes.user_id = auth.uid()
        OR EXISTS (
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
      )
    )
  );

CREATE POLICY "Users can delete todos for their notes"
  ON public.todos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = todos.note_id
      AND (
        notes.user_id = auth.uid()
        OR EXISTS (
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
      )
    )
  );

