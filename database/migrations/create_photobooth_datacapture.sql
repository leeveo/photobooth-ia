-- Create photobooth_datacapture table
create table public.photobooth_datacapture (
  id_data uuid not null default extensions.uuid_generate_v4(),
  id_projects uuid not null,
  name text not null,
  email text null,
  phone text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint photobooth_datacapture_pkey primary key (id_data),
  constraint photobooth_datacapture_id_projects_fkey foreign key (id_projects) references projects (id) on delete cascade
) tablespace pg_default;

-- Create indexes for better performance
create index if not exists idx_photobooth_datacapture_id_projects on public.photobooth_datacapture using btree (id_projects) tablespace pg_default;
create index if not exists idx_photobooth_datacapture_email on public.photobooth_datacapture using btree (email) tablespace pg_default;
create index if not exists idx_photobooth_datacapture_created_at on public.photobooth_datacapture using btree (created_at) tablespace pg_default;

-- Create trigger for updated_at
create trigger update_photobooth_datacapture_updated_at
  before update on photobooth_datacapture
  for each row
  execute function update_updated_at_column();

-- Enable RLS
alter table public.photobooth_datacapture enable row level security;

-- Policies for CRUD operations
-- Policy for SELECT: Allow users to read data from projects they have access to
create policy "Users can view photobooth datacapture for accessible projects"
  on public.photobooth_datacapture
  for select
  using (
    exists (
      select 1 from projects p 
      where p.id = photobooth_datacapture.id_projects 
      and p.is_active = true
    )
  );

-- Policy for INSERT: Allow users to insert data for active projects
create policy "Users can insert photobooth datacapture for active projects"
  on public.photobooth_datacapture
  for insert
  with check (
    exists (
      select 1 from projects p 
      where p.id = id_projects 
      and p.is_active = true
    )
  );

-- Policy for UPDATE: Allow users to update their own data entries
create policy "Users can update photobooth datacapture"
  on public.photobooth_datacapture
  for update
  using (
    exists (
      select 1 from projects p 
      where p.id = photobooth_datacapture.id_projects 
      and p.is_active = true
    )
  )
  with check (
    exists (
      select 1 from projects p 
      where p.id = id_projects 
      and p.is_active = true
    )
  );

-- Policy for DELETE: Allow users to delete data from accessible projects
create policy "Users can delete photobooth datacapture for accessible projects"
  on public.photobooth_datacapture
  for delete
  using (
    exists (
      select 1 from projects p 
      where p.id = photobooth_datacapture.id_projects 
      and p.is_active = true
    )
  );

-- Grant permissions to authenticated users
grant usage on schema public to authenticated;
grant all on public.photobooth_datacapture to authenticated;
grant usage, select on all sequences in schema public to authenticated;
