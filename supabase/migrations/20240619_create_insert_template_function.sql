CREATE OR REPLACE FUNCTION insert_layout_template(
  p_name TEXT,
  p_layout_name TEXT,
  p_description TEXT,
  p_category TEXT,
  p_elements JSONB,
  p_stage_size JSONB,
  p_is_public BOOLEAN,
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO layout_templates (
    name,
    layout_name,
    description,
    category,
    elements,
    stage_size,
    is_public,
    created_by
  ) VALUES (
    p_name,
    p_layout_name,
    p_description,
    p_category,
    p_elements,
    p_stage_size,
    p_is_public,
    p_created_by
  )
  RETURNING id INTO v_template_id;
  
  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql;
