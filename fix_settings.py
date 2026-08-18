import re

with open('src/components/shopkeeper/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'import SetupWizard' not in content:
    content = re.sub(
        r'(import \{[\s\S]*?\} from "lucide-react";)', 
        r'\1\nimport SetupWizard from "./SetupWizard";', 
        content
    )

# Add state
if 'isSetupWizardOpen' not in content:
    content = re.sub(
        r'(const \[activeTab[^;]+;)', 
        r'\1\n  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);\n  const [editRackId, setEditRackId] = useState<string | null>(null);\n  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, type: \'rack\' | \'shelf\' | \'tray\', id: string, name: string, code?: string } | null>(null);', 
        content
    )

# Add confirmDelete
if 'const confirmDelete' not in content:
    del_logic = '''
  const handleDeleteEntity = (type: "rack" | "shelf" | "tray", id: string, name: string) => {
    setDeleteModal({ isOpen: true, type, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    const { type, id } = deleteModal;
    try {
      if (type === "rack") {
        await api.delete(`/partner/settings/racks/${id}`);
      } else if (type === "shelf") {
        await api.delete(`/partner/settings/shelves/${id}`);
      } else if (type === "tray") {
        await api.delete(`/partner/settings/trays/${id}`);
      }
      setDeleteModal(null);
      fetchLayout();
    } catch (err: any) {
      console.error("Error deleting", type, err);
      alert(`Failed to delete ${type}. It might not be empty.`);
    }
  };
'''
    # Find handleCreateRack to insert before it
    content = re.sub(
        r'(\s*const handleCreateRack = async)',
        del_logic + r'\1',
        content,
        count=1
    )

# Add rendering block
if '<SetupWizard' not in content:
    render_block = '''  if (isSetupWizardOpen) {
    return (
      <SetupWizard 
        onClose={() => {
          setIsSetupWizardOpen(false);
          setEditRackId(null);
        }} 
        api={api as any} 
        fetchLayout={fetchLayout} 
        racks={racks}
        editRackId={editRackId}
      />
    );
  }

'''
    content = re.sub(
        r'(  return \(\n    <div className="w-full bg-\[\#F5F7FA\])',
        render_block + r'\1',
        content
    )

# Map Storage Setup Button
content = re.sub(
        r'(<button\s+)(className="bg-\[\#00891D\] [^"]*"[^>]*>\s*Storage Setup\s*</button>)',
        r'\1onClick={() => setIsSetupWizardOpen(true)}\n            \2',
        content
)

# Map Edit and Delete icons
content = re.sub(
    r'<button className="p-1\.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm">\s*<Edit2 size=\{14\} />\s*</button>',
    '''<button 
                              onClick={() => {
                                setEditRackId(rack.id);
                                setIsSetupWizardOpen(true);
                              }}
                              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm">
                              <Edit2 size={14} />
                            </button>''',
    content
)

# Replace handleDeleteEntity with onClick for Trash
content = re.sub(
    r'<button\s+onClick=\{[^}]*\}\s+className="p-1\.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"\s*>\s*<Trash2 size=\{14\} />\s*</button>',
    '''<button 
                              onClick={() => handleDeleteEntity("rack", rack.id, rack.name)}
                              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                            >
                              <Trash2 size={14} />
                            </button>''',
    content
)

# Add Delete Modal at the bottom
if 'Delete Modal' not in content:
    modal_ui = '''        {/* Delete Modal */}
        {deleteModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal(null)}></div>
            <div className="bg-white rounded-3xl p-8 max-w-[400px] w-full mx-4 relative z-10 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-5">
                <AlertTriangle size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete {deleteModal.type === 'rack' ? 'Rack' : deleteModal.type === 'shelf' ? 'Shelf' : 'Tray'}?</h3>
              <p className="text-sm text-gray-600 mb-2">
                Are you sure you want to remove {deleteModal.type.charAt(0).toUpperCase() + deleteModal.type.slice(1)} <span className="font-bold text-gray-900">{deleteModal.name}</span> {deleteModal.code && <span className="font-bold text-gray-900">({deleteModal.code})</span>} from {deleteModal.type}s?
              </p>
              <p className="text-[13px] text-gray-400 font-medium mb-8">This action cannot be undone.</p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#FF0000] text-white font-bold hover:bg-red-700 transition-colors"
                >
                  Delete {deleteModal.type === 'rack' ? 'Rack' : deleteModal.type === 'shelf' ? 'Shelf' : 'Tray'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}'''
    content = re.sub(
        r'      </div>\s*</div>\s*\);\s*\}',
        modal_ui,
        content
    )

with open('src/components/shopkeeper/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
