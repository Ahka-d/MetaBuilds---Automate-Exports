/*
  # Harden RLS + Storage policies

  - Adds post ownership via `user_id`
  - Restricts `posts` read/write to authenticated users (owner-only)
  - Makes storage buckets private
  - Restricts storage upload/read to authenticated users (owner-only via `uid/` path prefix)
*/

-- Posts ownership
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE posts
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Replace permissive policies
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Anyone can insert posts" ON posts;

CREATE POLICY "Authenticated users can view own posts"
  ON posts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- (Optional) allow delete of own posts
CREATE POLICY "Authenticated users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Storage: make buckets private
UPDATE storage.buckets
SET public = false
WHERE id IN ('post-images', 'post-audio');

-- Replace permissive storage policies
DROP POLICY IF EXISTS "Anyone can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view audio" ON storage.objects;

-- Images: allow authenticated users to upload/read only their own files under `uid/...`
CREATE POLICY "Authenticated can upload own images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Authenticated can read own images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'post-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Audio: allow authenticated users to upload/read only their own files under `uid/...`
CREATE POLICY "Authenticated can upload own audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Authenticated can read own audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'post-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
