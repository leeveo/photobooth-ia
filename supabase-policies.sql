-- Enable Row Level Security for photos table
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view photos of projects they own
CREATE POLICY "Admins can view photos of their projects" ON public.photos
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE created_by = auth.uid()
  )
);

-- Create policy for admins to insert photos to their projects
CREATE POLICY "Admins can insert photos to their projects" ON public.photos
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE created_by = auth.uid()
  )
);

-- Create policy for admins to update photos of their projects
CREATE POLICY "Admins can update photos of their projects" ON public.photos
FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE created_by = auth.uid()
  )
) 
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE created_by = auth.uid()
  )
);

-- Create policy for admins to delete photos from their projects
CREATE POLICY "Admins can delete photos from their projects" ON public.photos
FOR DELETE
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE created_by = auth.uid()
  )
);

-- Create policy for project participants to view photos
CREATE POLICY "Project participants can view photos" ON public.photos
FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.sessions 
    WHERE project_id = photos.project_id
  )
);

-- Create policy for project participants to insert photos
CREATE POLICY "Project participants can insert photos" ON public.photos
FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT id FROM public.sessions 
    WHERE project_id = photos.project_id
  )
);
