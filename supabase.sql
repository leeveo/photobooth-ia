CREATE TABLE photobooth_image_page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text,
  text1 text,
  text2 text,
  link_text text,
  link_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Policy: Allow INSERT for authenticated users
CREATE POLICY "Allow insert for authenticated users"
  ON photobooth_image_page_content
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow UPDATE for authenticated users
CREATE POLICY "Allow update for authenticated users"
  ON photobooth_image_page_content
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Allow DELETE for authenticated users
CREATE POLICY "Allow delete for authenticated users"
  ON photobooth_image_page_content
  FOR DELETE
  USING (auth.role() = 'authenticated');
