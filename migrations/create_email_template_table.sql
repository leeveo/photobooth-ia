CREATE TABLE IF NOT EXISTS photobooth_emailtemplate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_project UUID REFERENCES projects(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  template_html TEXT NOT NULL,
  template_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter un index pour accélérer les recherches par id_project
CREATE INDEX IF NOT EXISTS idx_emailtemplate_project ON photobooth_emailtemplate(id_project);

-- Configurer les politiques RLS
ALTER TABLE photobooth_emailtemplate ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre à l'utilisateur authentifié de lire ses propres templates
CREATE POLICY "Users can view their own email templates" ON photobooth_emailtemplate
  FOR SELECT USING (
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = id_project
    )
  );

-- Politique pour permettre à l'utilisateur authentifié de créer ses propres templates
CREATE POLICY "Users can create their own email templates" ON photobooth_emailtemplate
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = id_project
    )
  );

-- Politique pour permettre à l'utilisateur authentifié de mettre à jour ses propres templates
CREATE POLICY "Users can update their own email templates" ON photobooth_emailtemplate
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = id_project
    )
  );

-- Politique pour permettre à l'utilisateur authentifié de supprimer ses propres templates
CREATE POLICY "Users can delete their own email templates" ON photobooth_emailtemplate
  FOR DELETE USING (
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = id_project
    )
  );
