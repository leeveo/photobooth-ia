import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Ensures all necessary database tables and functions exist
 * To be called at app startup or before critical operations
 */
export async function ensureDatabaseSchema() {
  const supabase = createClientComponentClient();
  
  try {
    // Check if s3_images table exists
    const { data: hasTable, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 's3_images')
      .single();
    
    // If table doesn't exist, create it
    if (checkError || !hasTable) {
      console.log("Creating s3_images table...");
      
      await supabase.rpc('create_s3_images_table', {}, {
        count: 'exact'
      }).catch(() => {
        // If the RPC function doesn't exist, create it first
        return createS3ImagesTableDirectly(supabase);
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error ensuring database schema:", error);
    return false;
  }
}

/**
 * Create the s3_images table directly with SQL
 * Used as fallback if RPC method isn't available
 */
async function createS3ImagesTableDirectly(supabase) {
  try {
    // Create the table using raw SQL
    const { error } = await supabase.rpc(
      'exec_sql', 
      { 
        sql_string: `
          CREATE TABLE IF NOT EXISTS public.s3_images (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            storage_path TEXT,
            isModerated BOOLEAN DEFAULT FALSE,
            metadata JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS s3_images_project_id_idx ON public.s3_images(project_id);
          CREATE INDEX IF NOT EXISTS s3_images_is_moderated_idx ON public.s3_images(isModerated);
        `
      }
    );
    
    if (error) throw error;
    
    // Create an RPC function for future use
    await supabase.rpc(
      'exec_sql',
      {
        sql_string: `
          CREATE OR REPLACE FUNCTION create_s3_images_table()
          RETURNS VOID AS $$
          BEGIN
            CREATE TABLE IF NOT EXISTS public.s3_images (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
              image_url TEXT NOT NULL,
              storage_path TEXT,
              isModerated BOOLEAN DEFAULT FALSE,
              metadata JSONB,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS s3_images_project_id_idx ON public.s3_images(project_id);
            CREATE INDEX IF NOT EXISTS s3_images_is_moderated_idx ON public.s3_images(isModerated);
          END;
          $$ LANGUAGE plpgsql;
        `
      }
    );
    
    return true;
  } catch (error) {
    console.error("Error creating s3_images table directly:", error);
    throw error;
  }
}
