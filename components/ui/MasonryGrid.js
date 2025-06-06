'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const MasonryGrid = ({ items, renderItem, columnWidth = 300, gap = 20 }) => {
  const containerRef = useRef(null);
  const [columns, setColumns] = useState(3);
  const [columnItems, setColumnItems] = useState([]);

  useEffect(() => {
    // Fonction pour calculer le nombre de colonnes en fonction de la largeur du conteneur
    const calculateColumns = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const columnsCount = Math.max(1, Math.floor(containerWidth / (columnWidth + gap)));
      setColumns(columnsCount);
    };

    // Calculer les colonnes initiales
    calculateColumns();
    
    // Ajouter un event listener pour recalculer lors du redimensionnement
    window.addEventListener('resize', calculateColumns);
    
    return () => {
      window.removeEventListener('resize', calculateColumns);
    };
  }, [columnWidth, gap]);

  useEffect(() => {
    // Distribuer les items dans les colonnes
    if (columns > 0 && items.length > 0) {
      // Initialiser les colonnes vides
      const newColumnItems = Array.from({ length: columns }, () => []);
      
      // Distribuer les items dans les colonnes (stratégie verticale)
      items.forEach((item, index) => {
        const columnIndex = index % columns;
        newColumnItems[columnIndex].push(item);
      });
      
      setColumnItems(newColumnItems);
    }
  }, [columns, items]);

  return (
    <div 
      ref={containerRef} 
      className="w-full"
      style={{ 
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridGap: `${gap}px`,
      }}
    >
      {columnItems.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-5">
          {column.map((item, itemIndex) => (
            <motion.div
              key={item.id || itemIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (columnIndex * 0.1) + (itemIndex * 0.05) }}
            >
              {renderItem(item)}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MasonryGrid;
