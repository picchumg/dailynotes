# Daily Notes

A minimal, mobile-first daily notes application built with Next.js and Supabase. One note per day, with the ability to share notes with friends and collaborate.

## Features

- 📅 **One note per day** - Each note is tied to a specific date
- 📆 **Calendar view** - Navigate through your notes using an interactive calendar
- ✏️ **Rich note editor** with:
  - Title and subtitle
  - Free text content
  - Todo list with checkboxes
  - Image uploads
- 👥 **Friend system** - Add friends and share notes with them
- 🔍 **Attribution** - See who wrote each part of a shared note
- 📱 **Mobile-first design** - Minimal, clean interface optimized for mobile devices

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Supabase** - Backend (PostgreSQL database, authentication, storage)
- **Tailwind CSS** - Styling
- **date-fns** - Date utilities
- **react-calendar** - Calendar component

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your:
   - Project URL
   - Anon/public key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Set up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Run the SQL script to create all tables, policies, and functions

### 5. Set up Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `note-images`
3. Set it to **Public** (or configure policies as needed)
4. Add the following policy:

```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-images');
```

Or for authenticated users only:

```sql
CREATE POLICY "Authenticated users can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-images' AND auth.role() = 'authenticated');
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── auth/          # Authentication routes
│   ├── friends/       # Friends management page
│   ├── login/         # Login page
│   ├── notes/         # Note pages
│   ├── signup/        # Signup page
│   └── layout.tsx     # Root layout
├── components/
│   ├── AddFriendForm.tsx
│   ├── Calendar.tsx
│   ├── FriendsList.tsx
│   ├── NoteEditor.tsx
│   └── ShareNoteForm.tsx
├── lib/
│   └── supabase/      # Supabase client utilities
├── supabase/
│   └── schema.sql     # Database schema
└── middleware.ts      # Auth middleware
```

## Usage

1. **Sign up** for an account
2. **Create your first note** by clicking "Create Today's Note"
3. **Add friends** by going to the Friends page and entering their username
4. **Share notes** by opening a note and clicking "Share Note"
5. **Collaborate** - Friends can edit shared notes, and you'll see who wrote what

## Notes

- Each user can have one note per day
- Notes are automatically saved as you type
- Images are stored in Supabase Storage
- Friend requests are automatically accepted (you can modify this to add a pending/accept flow)
- The calendar highlights dates that have notes

## Customization

The design is minimal and mobile-first. You can customize:
- Colors in `tailwind.config.js` or `globals.css`
- Calendar styling in `components/Calendar.tsx`
- Note editor layout in `components/NoteEditor.tsx`

## License

MIT
