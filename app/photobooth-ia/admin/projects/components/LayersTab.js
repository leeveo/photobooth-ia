import React, { useRef } from 'react';

export default function LayersTab({ elements, moveElement, selectedId, setSelectedId }) {
  const dragItem = useRef();
  const dragOverItem = useRef();

  // Gestion du drag & drop
  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (
      dragItem.current !== undefined &&
      dragOverItem.current !== undefined &&
      dragItem.current !== dragOverItem.current
    ) {
      moveElement(dragItem.current, dragOverItem.current);
    }
    dragItem.current = undefined;
    dragOverItem.current = undefined;
  };

  return (
    <div>
      <div className="mb-2 text-xs text-gray-500">
        Faites glisser pour réorganiser l’ordre des calques (haut = dessus).
      </div>
      <ul className="divide-y divide-gray-200">
        {elements
          .map((el, idx) => (
            <li
              key={el.id}
              className={`flex items-center px-2 py-1 cursor-pointer bg-white rounded hover:bg-indigo-50 transition
                ${selectedId === el.id ? 'ring-2 ring-indigo-400' : ''}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onClick={() => setSelectedId(el.id)}
              style={{ opacity: selectedId === el.id ? 1 : 0.85 }}
            >
              <span className="mr-2 text-gray-400 cursor-move">☰</span>
              <span className="flex-1 truncate">
                {el.name || el.type} <span className="text-xs text-gray-400">({el.type})</span>
              </span>
              <span className="ml-2 text-xs text-gray-400">#{idx + 1}</span>
            </li>
          ))
          .reverse() // Pour afficher le haut du canvas en haut de la liste
        }
      </ul>
    </div>
  );
}
