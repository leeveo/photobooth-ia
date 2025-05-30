import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Creates the necessary tables for the application if they don't exist
 */
export async function ensureTables() {
  const supabase = createClientComponentClient();
  
  try {
    // Check if the s3_images table exists
    const { error: checkError } = await supabase.rpc('check_table_exists', { 
      table_name: 's3_images' 
    });
    
    // If the check function doesn't exist, create it first
    if (checkError && checkError.message.includes('function "check_table_exists" does not exist')) {
      // Create the helper function to check tables
      await supabase.rpc('create_check_table_function');
    }
    
    // Try checking again
    const { data: tableExists, error: checkError2 } = await supabase.rpc('check_table_exists', { 
      table_name: 's3_images' 
    });
    
    if (!tableExists || checkError2) {
      console.log('Creating s3_images table...');
      
      // Create the s3_images table
      const { error: createError } = await supabase.rpc('create_s3_images_table');
      
      if (createError) {
        throw createError;
      }
      
      console.log('s3_images table created successfully!');
    } else {
      console.log('s3_images table already exists.');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    return false;
  }
}

/**
 * Creates SQL functions needed for table checks
 */
export async function createHelperFunctions() {
  const supabase = createClientComponentClient();
  
  try {
    // Create the check_table_exists function
    await supabase.sql`
      CREATE OR REPLACE FUNCTION check_table_exists(table_name TEXT)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Create function to create the s3_images table
    await supabase.sql`
      CREATE OR REPLACE FUNCTION create_s3_images_table()
      RETURNS VOID AS $$
      BEGIN
        CREATE TABLE IF NOT EXISTS public.s3_images (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          storage_path TEXT,
          isModerated BOOLEAN DEFAULT FALSE,
          metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create index on project_id for faster queries
        CREATE INDEX IF NOT EXISTS s3_images_project_id_idx ON public.s3_images(project_id);
        
        -- Create index on isModerated for faster filtering
        CREATE INDEX IF NOT EXISTS s3_images_is_moderated_idx ON public.s3_images(isModerated);
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    return true;
  } catch (error) {
    console.error('Error creating helper functions:', error);
    return false;
  }
}
