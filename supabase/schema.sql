-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Friends table (friendship relationships)
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- Daily notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  title TEXT,
  subtitle TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- Text blocks table (for Notion-like inline text blocks)
CREATE TABLE IF NOT EXISTS public.text_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- Note images table
CREATE TABLE IF NOT EXISTS public.note_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- Shared notes table (for friend collaboration)
CREATE TABLE IF NOT EXISTS public.shared_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(note_id, friend_id)
);

-- Note content history (to track who wrote what)
CREATE TABLE IF NOT EXISTS public.note_content_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('title', 'subtitle', 'content', 'todo', 'image')),
  field_id UUID, -- For todos and images, reference their id
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_user_date ON public.notes(user_id, date);
CREATE INDEX IF NOT EXISTS idx_todos_note_id ON public.todos(note_id);
CREATE INDEX IF NOT EXISTS idx_text_blocks_note_id ON public.text_blocks(note_id);
CREATE INDEX IF NOT EXISTS idx_note_images_note_id ON public.note_images(note_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_note_id ON public.shared_notes(note_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_friend_id ON public.shared_notes(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_content_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view other profiles for searching"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Friends policies
CREATE POLICY "Users can view their own friendships"
  ON public.friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friendships"
  ON public.friends FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friendships"
  ON public.friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Notes policies
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

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

CREATE POLICY "Users can create their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

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

-- Todos policies
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

-- Note images policies
CREATE POLICY "Users can view images for their notes"
  ON public.note_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_images.note_id
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

CREATE POLICY "Users can create images for their notes"
  ON public.note_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_images.note_id
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
    AND auth.uid() = note_images.user_id
  );

CREATE POLICY "Users can delete images for their notes"
  ON public.note_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_images.note_id
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

-- Shared notes policies
CREATE POLICY "Users can view shared notes"
  ON public.shared_notes FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can share their notes"
  ON public.shared_notes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = shared_notes.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- Note content history policies
CREATE POLICY "Users can view history for their notes"
  ON public.note_content_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_content_history.note_id
      AND (notes.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.shared_notes
        WHERE shared_notes.note_id = notes.id
        AND shared_notes.friend_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can create history entries"
  ON public.note_content_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_content_history.note_id
      AND (notes.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.shared_notes
        WHERE shared_notes.note_id = notes.id
        AND shared_notes.friend_id = auth.uid()
      ))
    )
    AND auth.uid() = note_content_history.user_id
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

