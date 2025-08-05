-- Ajouter les champs pour les images et vidéos verticales dans la table backgrounds
-- Date: 2025-08-05

-- Ajouter les nouveaux champs
ALTER TABLE backgrounds
ADD COLUMN image_url_vertical TEXT,
ADD COLUMN video_url_vertical TEXT,
ADD COLUMN storage_path_vertical TEXT,
ADD COLUMN storage_path_video TEXT,
ADD COLUMN storage_path_video_vertical TEXT;

-- Mettre à jour les commentaires pour documenter les nouveaux champs
COMMENT ON COLUMN backgrounds.image_url_vertical IS 'URL de l''image d''arrière-plan en orientation verticale';
COMMENT ON COLUMN backgrounds.video_url_vertical IS 'URL de la vidéo d''arrière-plan en orientation verticale';
COMMENT ON COLUMN backgrounds.storage_path_vertical IS 'Chemin de stockage de l''image verticale dans Supabase Storage';
COMMENT ON COLUMN backgrounds.storage_path_video IS 'Chemin de stockage de la vidéo horizontale dans Supabase Storage';
COMMENT ON COLUMN backgrounds.storage_path_video_vertical IS 'Chemin de stockage de la vidéo verticale dans Supabase Storage';

-- Optionnel: Ajouter des index pour améliorer les performances si nécessaire
-- CREATE INDEX idx_backgrounds_image_url_vertical ON backgrounds(image_url_vertical);
-- CREATE INDEX idx_backgrounds_video_url_vertical ON backgrounds(video_url_vertical);
