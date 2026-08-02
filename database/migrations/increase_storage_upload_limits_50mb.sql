-- Max attachment size: 50 MB for task + personal storage buckets.
-- Apply in Supabase SQL editor if uploads fail with file size errors.

UPDATE storage.buckets
SET file_size_limit = 52428800 -- 50 MB
WHERE id IN ('uploads', 'task-attachments', 'personal-files');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('uploads', 'uploads', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    public = EXCLUDED.public;
