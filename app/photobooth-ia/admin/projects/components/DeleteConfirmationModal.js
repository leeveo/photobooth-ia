import { RiAlertLine, RiDeleteBin6Line } from 'react-icons/ri';

const DeleteConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  itemToDelete,
  onCancel, 
  onConfirm,
  isDeleting,
  dangerText,
  cancelText = "Annuler",
  confirmText = "Supprimer"
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn">
        <div className="flex items-center text-red-600 mb-4">
          <RiAlertLine className="w-6 h-6 mr-2" />
          <h3 className="text-lg font-medium">{title || "Confirmation de suppression"}</h3>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            {message || `Êtes-vous sûr de vouloir supprimer cet élément ?`}
          </p>
          
          {itemToDelete && itemToDelete.imageUrl && (
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 relative border border-gray-200 rounded-md overflow-hidden">
                <img
                  src={itemToDelete.imageUrl}
                  alt={itemToDelete.name || "Élément à supprimer"}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          )}
          
          {dangerText && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 text-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-orange-700">
                    {dangerText}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Suppression...
              </>
            ) : (
              <>
                <RiDeleteBin6Line className="w-4 h-4 mr-1" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
