-- Add rgpd_text field to photobooth_datacapture table
alter table public.photobooth_datacapture 
add column rgpd_text text null;
