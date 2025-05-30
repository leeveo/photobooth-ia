/**
 * Script pour migrer les données existantes vers Supabase
 * 
 * Ce script récupère les styles et images existantes et les importe dans Supabase
 * Exécutez ce script après avoir configuré Supabase et créé un compte administrateur
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Configuration Supabase - À remplacer par vos propres valeurs
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Nécessite une clé de service avec accès admin
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Fonction pour télécharger une image à partir d'une URL
async function downloadImage(url, outputPath) {
  const response = await fetch(url);
  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
  console.log(`Image téléchargée: ${outputPath}`);
  return buffer;
}

// Fonction pour importer les styles existants
async function migrateStyles() {
  // Définir les catégories de styles 
  const genders = ['m', 'f', 'ag', 'af'];
  const styleKeys = ['s1', 's2', 's3', 's4', 's5', 's6'];
  
  // Parcourir chaque style et l'importer
  for (const gender of genders) {
    for (const styleKey of styleKeys) {
      try {
        // Construire l'URL source comme dans la fonction generateAI
        const variations = gender === 'f' && styleKey === 's2' ? 4 : 
                           gender === 'm' && styleKey === 's2' ? 4 : 
                           gender === 'm' && styleKey === 's4' ? 3 : 2;
        
        const previewUrl = `https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/${gender}-${styleKey}-1.jpeg`;
        const styleName = `Style ${styleKey.toUpperCase()} - ${gender === 'm' ? 'Homme' : 
                                                             gender === 'f' ? 'Femme' : 
                                                             gender === 'ag' ? 'Ado Garçon' : 'Ado Fille'}`;
        
        // Télécharger l'image de prévisualisation
        const tmpFilePath = path.join('/tmp', `${gender}-${styleKey}-preview.jpeg`);
        const imageBuffer = await downloadImage(previewUrl, tmpFilePath);
        
        // Télécharger l'image vers Supabase Storage
        const storagePath = `${gender}-${styleKey}-preview.jpeg`;
        const { error: uploadError } = await supabase.storage
          .from('styles')
          .upload(storagePath, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });
          
        if (uploadError) throw uploadError;
        
        // Obtenir l'URL publique
        const { data: urlData } = supabase.storage
          .from('styles')
          .getPublicUrl(storagePath);
          
        // Insérer le style dans la base de données
        const { data, error } = await supabase
          .from('styles')
          .insert({
            name: styleName,
            gender,
            style_key: styleKey,
            description: `Style ${styleKey.toUpperCase()} pour ${gender === 'm' ? 'Homme' : 
                                                               gender === 'f' ? 'Femme' : 
                                                               gender === 'ag' ? 'Ado Garçon' : 'Ado Fille'}`,
            preview_image: urlData.publicUrl,
            storage_path: storagePath,
            variations,
          });
          
        if (error) {
          console.error(`Erreur lors de l'importation du style ${gender}-${styleKey}:`, error);
        } else {
          console.log(`Style importé avec succès: ${styleName}`);
        }
        
        // Nettoyer le fichier temporaire
        fs.unlinkSync(tmpFilePath);
        
      } catch (error) {
        console.error(`Erreur lors du traitement du style ${gender}-${styleKey}:`, error);
      }
    }
  }
}

// Exécuter la migration
(async () => {
  try {
    console.log('Début de la migration des données...');
    await migrateStyles();
    console.log('Migration terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  }
})();
