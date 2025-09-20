-- Migration pour ajouter le champ grand_public à la table projects
-- Ce champ détermine si le photobooth est destiné au grand public
-- Si TRUE : masque les boutons de redirection vers les pages spécifiques dans la popup QR

-- Ajouter la colonne grand_public avec valeur par défaut FALSE
ALTER TABLE projects 
ADD COLUMN grand_public BOOLEAN DEFAULT FALSE;

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN projects.grand_public IS 'Détermine si le photobooth est destiné au grand public. Si TRUE, masque les boutons de redirection dans la popup QR.';

-- Optionnel: mettre à jour les projets existants pour être explicite
UPDATE projects SET grand_public = FALSE WHERE grand_public IS NULL;

-- Optionnel: créer un index si nécessaire pour optimiser les requêtes
-- CREATE INDEX idx_projects_grand_public ON projects(grand_public);

-- Vérification que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'grand_public';