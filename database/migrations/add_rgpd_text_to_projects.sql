-- Add rgpd_text field to projects table
alter table public.projects 
add column rgpd_text text null;
