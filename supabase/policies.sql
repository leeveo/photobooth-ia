-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Fonction pour vérifier si un utilisateur est administrateur
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politiques pour profiles
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Les administrateurs peuvent tout faire avec les profils" ON public.profiles
    FOR ALL TO authenticated USING (is_admin());

-- Politiques pour backgrounds
CREATE POLICY "Tout le monde peut voir les arrière-plans actifs" ON public.backgrounds
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Les administrateurs peuvent tout faire avec les arrière-plans" ON public.backgrounds
    FOR ALL TO authenticated USING (is_admin());

-- Politiques pour styles
CREATE POLICY "Tout le monde peut voir les styles actifs" ON public.styles
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Les administrateurs peuvent tout faire avec les styles" ON public.styles
    FOR ALL TO authenticated USING (is_admin());

-- Politiques pour settings
CREATE POLICY "Tout le monde peut voir les paramètres" ON public.settings
    FOR SELECT USING (true);

CREATE POLICY "Les administrateurs peuvent modifier les paramètres" ON public.settings
    FOR UPDATE TO authenticated USING (is_admin());

-- Politiques pour sessions
CREATE POLICY "Les sessions sont visibles pour les administrateurs" ON public.sessions
    FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Les sessions peuvent être créées par n'importe qui" ON public.sessions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Les sessions peuvent être créées par des anonymes" ON public.sessions
    FOR INSERT TO anon WITH CHECK (true);
