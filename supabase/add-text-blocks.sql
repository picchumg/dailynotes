-- Add text blocks table for Notion-like inline text blocks
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.text_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_text_blocks_note_id ON public.text_blocks(note_id);

-- Enable RLS
ALTER TABLE public.text_blocks ENABLE ROW LEVEL SECURITY;

-- Text blocks policies
CREATE POLICY "Users can view text blocks for their notes"
  ON public.text_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = text_blocks.note_id
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

CREATE POLICY "Users can create text blocks for their notes"
  ON public.text_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = text_blocks.note_id
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
    AND auth.uid() = text_blocks.user_id
  );

CREATE POLICY "Users can update text blocks for their notes"
  ON public.text_blocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = text_blocks.note_id
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

CREATE POLICY "Users can delete text blocks for their notes"
  ON public.text_blocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = text_blocks.note_id
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

