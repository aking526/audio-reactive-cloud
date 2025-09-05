# Supabase Manual Configuration Instructions

After running the SQL migration (`supabase-migration.sql`), you need to complete the following manual steps in your Supabase dashboard.

## 1. Storage Buckets Setup

### Create Storage Buckets

1. Go to **Storage** in your Supabase dashboard
2. Create the following buckets:

**Bucket 1: `audio-files-original`**
- Name: `audio-files-original`
- Public: `false` (private bucket)
- File size limit: `100 MB` (or adjust based on your needs)
- Allowed MIME types: `audio/*`

**Bucket 2: `audio-files-processed`**
- Name: `audio-files-processed`  
- Public: `false` (private bucket)
- File size limit: `100 MB` (or adjust based on your needs)
- Allowed MIME types: `audio/*`

**Bucket 3: `sample-songs`**
- Name: `sample-songs`
- Public: `true` (public bucket for sample songs)
- File size limit: `100 MB` (or adjust based on your needs)
- Allowed MIME types: `audio/*`

### Configure Storage Policies

For each bucket, you need to create RLS policies. Go to **Storage** → **Policies** and create the following:

#### For `audio-files-original` bucket:

**Policy 1: "Users can upload their own files"**
```sql
CREATE POLICY "Users can upload original files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio-files-original' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 2: "Users can view their own files"**
```sql
CREATE POLICY "Users can view their original files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'audio-files-original' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 3: "Users can delete their own files"**
```sql
CREATE POLICY "Users can delete their original files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio-files-original' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### For `audio-files-processed` bucket:

**Policy 1: "Users can upload processed files"**
```sql
CREATE POLICY "Users can upload processed files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio-files-processed' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 2: "Users can view their processed files"**
```sql
CREATE POLICY "Users can view their processed files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'audio-files-processed' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 3: "Users can update processed files"**
```sql
CREATE POLICY "Users can update processed files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'audio-files-processed' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 4: "Users can delete processed files"**
```sql
CREATE POLICY "Users can delete processed files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio-files-processed' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### For `sample-songs` bucket:

**Policy 1: "Public read access for sample songs"**
```sql
CREATE POLICY "Public read access for sample songs" ON storage.objects
FOR SELECT USING (bucket_id = 'sample-songs');
```

## 2. File Organization Structure

Files will be organized in storage with the following structure:
```
audio-files-original/
├── {user_id}/
│   ├── {project_id}_original.{extension}
│   └── ...

audio-files-processed/
├── {user_id}/
│   ├── {project_id}_processed.{extension}
│   └── ...

sample-songs/
├── song1.mp3
├── song2.wav
├── song3.m4a
└── ...
```

## 3. Verify Database Tables

After running the migration, verify these tables were created:
- `public.audio_projects`
- `public.audio_effects` 
- `public.project_sharing`
- `public.audio_projects_with_effects` (view)

## 4. Test RLS Policies

You can test the Row Level Security policies by:

1. Creating a test user account
2. Inserting a test project record
3. Verifying the user can only see their own projects
4. Testing file upload/download permissions

## 5. Environment Variables

Make sure your `.env.local` file contains:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 6. Optional: Enable Realtime (for future features)

If you want realtime updates for collaborative features:

1. Go to **Database** → **Replication** 
2. Enable replication for:
   - `public.audio_projects`
   - `public.project_sharing`

## 7. Database Indexes (Already included in migration)

The following indexes are automatically created:
- `idx_audio_projects_user_id`
- `idx_audio_projects_created_at` 
- `idx_audio_projects_user_created`
- `idx_project_sharing_project_id`
- `idx_project_sharing_shared_with`
- `idx_project_sharing_public`

## Next Steps

After completing these manual steps:

1. Test the storage bucket access from your application
2. Verify RLS policies work correctly
3. Implement the frontend components to use these tables
4. Test the complete flow: upload → process → save → retrieve

## Troubleshooting

**Common Issues:**

1. **Storage policies not working**: Make sure the bucket names match exactly and the folder structure uses the user ID as the first folder level.

2. **RLS policies blocking access**: Check that your JWT token contains the correct user ID and that it matches the `auth.uid()` function.

3. **File upload failures**: Verify MIME type restrictions and file size limits in both the bucket settings and your application code.

4. **CORS issues**: If uploading from the browser, make sure CORS is properly configured for your domain in the Supabase settings.
