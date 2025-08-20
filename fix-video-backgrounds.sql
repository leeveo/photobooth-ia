-- Script SQL pour corriger show_animated sur tous les arrière-plans avec vidéos
-- À exécuter dans votre console Supabase ou interface SQL

-- 1. D'abord, voir l'état actuel des arrière-plans avec vidéos
SELECT 
    b.id,
    p.name as project_name,
    p.slug as project_slug,
    b.name as background_name,
    b.show_animated,
    CASE 
        WHEN b.video_url IS NOT NULL THEN 'Oui' 
        ELSE 'Non' 
    END as has_video_horizontal,
    CASE 
        WHEN b.video_url_vertical IS NOT NULL THEN 'Oui' 
        ELSE 'Non' 
    END as has_video_vertical,
    b.video_url,
    b.video_url_vertical
FROM backgrounds b
JOIN projects p ON b.project_id = p.id
WHERE b.is_active = true 
  AND (b.video_url IS NOT NULL OR b.video_url_vertical IS NOT NULL)
ORDER BY p.name, b.name;

-- 2. Corriger tous les arrière-plans avec vidéos pour show_animated = true
UPDATE backgrounds 
SET show_animated = true 
WHERE is_active = true 
  AND (video_url IS NOT NULL OR video_url_vertical IS NOT NULL)
  AND show_animated = false;

-- 3. Vérifier le résultat
SELECT 
    p.name as project_name,
    COUNT(*) as total_backgrounds_with_video,
    COUNT(CASE WHEN b.show_animated = true THEN 1 END) as animated_active,
    COUNT(CASE WHEN b.show_animated = false THEN 1 END) as animated_inactive
FROM backgrounds b
JOIN projects p ON b.project_id = p.id
WHERE b.is_active = true 
  AND (b.video_url IS NOT NULL OR b.video_url_vertical IS NOT NULL)
GROUP BY p.id, p.name
ORDER BY p.name;
