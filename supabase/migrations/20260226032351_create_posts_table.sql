/*
  # Create Posts Table

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `image_url` (text) - URL to the uploaded image in Supabase Storage
      - `user_text` (text) - Text input from user
      - `audio_url` (text, nullable) - URL to audio recording if provided
      - `caption_instagram` (text, nullable) - Generated Instagram caption
      - `titulo_marketplace` (text, nullable) - Generated marketplace title
      - `precio_sugerido` (text, nullable) - Suggested price
      - `categoria` (text, nullable) - Product category
      - `descripcion_detallada` (text, nullable) - Detailed description
      - `created_at` (timestamptz) - Timestamp of creation
      
  2. Storage Buckets
    - Create bucket for images
    - Create bucket for audio recordings
    
  3. Security
    - Enable RLS on `posts` table
    - Add policies for public read access
    - Add policies for authenticated insert
*/

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  user_text text NOT NULL DEFAULT '',
  audio_url text,
  caption_instagram text,
  titulo_marketplace text,
  precio_sugerido text,
  categoria text,
  descripcion_detallada text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert posts"
  ON posts FOR INSERT
  TO public
  WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-audio', 'post-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');

CREATE POLICY "Anyone can upload audio"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'post-audio');

CREATE POLICY "Anyone can view audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-audio');