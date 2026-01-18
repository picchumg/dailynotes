# Quick Setup Guide

## Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works)

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (takes ~2 minutes)

### 3. Get Your Supabase Credentials
1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy your:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" > "anon public")

### 4. Set Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Set Up Database
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

### 6. Set Up Storage for Images
1. In Supabase dashboard, go to **Storage**
2. Click **Create a new bucket**
3. Name it: `note-images`
4. Make it **Public** (toggle on)
5. Click **Create bucket**

### 7. Run the App
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 8. Create Your First Account
1. Click "Sign up"
2. Enter your email and password
3. You'll be automatically logged in
4. Start creating notes!

## Troubleshooting

### "User not found" when adding friends
- Make sure your friend has created an account
- Use their username (not email) when adding them
- Usernames are case-sensitive

### Images not uploading
- Check that the `note-images` bucket exists in Supabase Storage
- Verify the bucket is set to Public
- Check browser console for errors

### Can't see shared notes
- Make sure you've accepted the friend request (or it's auto-accepted)
- Verify the note owner has shared the note with you
- Check that both users are friends

### Database errors
- Make sure you ran the entire `schema.sql` file
- Check that all tables were created in the Supabase dashboard
- Verify RLS policies are enabled

## Next Steps

- Customize the design in `app/globals.css`
- Add more features like note templates
- Set up email notifications (requires Supabase Pro)
- Deploy to Vercel or your preferred hosting

