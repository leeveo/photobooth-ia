'use client';

import { useState, useEffect } from 'react';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import Image from 'next/image';

export default function S3Check() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [path, setPath] = useState('kiabi/style');
  const [s3Region] = useState('eu-west-3');
  const [s3Bucket] = useState('leeveostockage');

  const s3Client = new S3Client({
    region: s3Region,
    credentials: {
      accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    },
  });

  async function listS3Files() {
    setLoading(true);
    setError(null);
    
    try {
      const command = new ListObjectsV2Command({
        Bucket: s3Bucket,
        Prefix: path,
        MaxKeys: 100,
      });
      
      console.log('Listing files with prefix:', path);
      const response = await s3Client.send(command);
      
      if (response.Contents) {
        console.log(`Found ${response.Contents.length} files`);
        const fileList = response.Contents.map(item => ({
          key: item.Key,
          lastModified: item.LastModified,
          size: item.Size,
          url: `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${item.Key}`
        }));
        
        setFiles(fileList);
      } else {
        console.log('No files found');
        setFiles([]);
      }
    } catch (err) {
      console.error('Error listing S3 files:', err);
      setError(`Erreur lors de la liste des fichiers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Vérification des fichiers AWS S3</h1>
      
      <div className="mb-6 flex space-x-4 items-end">
        <div className="flex-grow">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chemin S3 à vérifier
          </label>
          <input 
            type="text" 
            value={path} 
            onChange={(e) => setPath(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="exemple: kiabi/style"
          />
        </div>
        <button
          onClick={listS3Files}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Vérifier
        </button>
      </div>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-medium mb-4">
            {files.length} fichiers trouvés dans {path}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <div key={file.key} className="border rounded-lg overflow-hidden">
                <div className="aspect-square relative bg-gray-100">
                  {file.key.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <Image 
                      src={file.url}
                      alt={file.key}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{file.key.split('/').pop()}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium mb-2">Détails des chemins</h3>
          <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-64">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {files.map((file) => (
                <li key={file.key}>
                  <span className="font-mono">{file.key}</span>
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    Ouvrir
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
