-- Add is_public field to mosaic_settings table for public gallery feature
ALTER TABLE public.mosaic_settings 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN public.mosaic_settings.is_public IS 'Si true, la galerie est accessible publiquement via un lien direct';

-- Create index for better performance when querying public galleries
CREATE INDEX IF NOT EXISTS idx_mosaic_settings_is_public 
ON public.mosaic_settings(is_public) 
WHERE is_public = true;
