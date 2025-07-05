-- Modifier le champ rgpd_text pour qu'il soit de type boolean au lieu de text
alter table public.photobooth_datacapture 
drop column if exists rgpd_text;

alter table public.photobooth_datacapture 
add column rgpd_text boolean null default false;
