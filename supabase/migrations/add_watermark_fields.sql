ALTER TABLE projects 
ADD COLUMN watermark_enabled BOOLEAN DEFAULT false,
ADD COLUMN watermark_text TEXT,
ADD COLUMN watermark_logo_url TEXT,
ADD COLUMN watermark_position TEXT DEFAULT 'bottom-right',
ADD COLUMN watermark_text_color TEXT DEFAULT '#FFFFFF',
ADD COLUMN watermark_text_size INTEGER DEFAULT 24,
ADD COLUMN watermark_opacity FLOAT DEFAULT 0.8;
