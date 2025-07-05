-- Add datacapture field to projects table
alter table public.projects 
add column datacapture boolean null default false;
