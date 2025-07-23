-- First, check if RLS is enabled on the table
ALTER TABLE public.photobooth_logo ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they're causing issues
DROP POLICY IF EXISTS photobooth_logo_select_policy ON public.photobooth_logo;
DROP POLICY IF EXISTS photobooth_logo_insert_policy ON public.photobooth_logo;
DROP POLICY IF EXISTS photobooth_logo_update_policy ON public.photobooth_logo;
DROP POLICY IF EXISTS photobooth_logo_delete_policy ON public.photobooth_logo;

-- Create a more permissive select policy
CREATE POLICY photobooth_logo_select_policy ON public.photobooth_logo
FOR SELECT USING (TRUE);  -- Allow anyone to read

-- Create an insert policy that allows authenticated users to insert
CREATE POLICY photobooth_logo_insert_policy ON public.photobooth_logo
FOR INSERT WITH CHECK (
  -- Allow inserts if the user is authenticated and the project exists
  auth.role() = 'authenticated' OR 
  -- Or if the project_id exists in the projects table (regardless of user)
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id)
);

-- Create an update policy for project owners
CREATE POLICY photobooth_logo_update_policy ON public.photobooth_logo
FOR UPDATE USING (
  -- Check if the user is the project owner
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = photobooth_logo.project_id
    AND (projects.created_by = auth.uid() OR auth.role() = 'service_role')
  )
);

-- Create a delete policy for project owners
CREATE POLICY photobooth_logo_delete_policy ON public.photobooth_logo
FOR DELETE USING (
  -- Check if the user is the project owner
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = photobooth_logo.project_id
    AND (projects.created_by = auth.uid() OR auth.role() = 'service_role')
  )
);
