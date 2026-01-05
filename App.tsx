import React, { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MediaItem, MediaType } from './types';
import { 
  Upload, ImageIcon, VideoIcon, Play, 
  Folder, FolderPlus, Search, Filter, Plus, Trash2, Loader2 
} from './components/Icons';
import MediaModal from './components/MediaModal';

// Helper to check if file is image or video
const getFileType = (file: File): MediaType | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
};

// Helper for Base64 conversion
const base64ToBlob = async (base64: string): Promise<Blob> => {
  const res = await fetch(base64);
  return res.blob();
};

const DEFAULT_FOLDER = "Genel";

const App: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // New States for requested features
  const [folders, setFolders] = useState<string[]>([DEFAULT_FOLDER, "Favoriler", "İş", "Tatil"]);
  const [currentFolder, setCurrentFolder] = useState<string>(DEFAULT_FOLDER);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // Handle Drag Events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [currentFolder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    setIsUploading(true);
    
    // Simulate a small delay for better UI feedback
    await new Promise(resolve => setTimeout(resolve, 600));

    const newItems: MediaItem[] = [];
    
    Array.from(files).forEach((file) => {
      const type = getFileType(file);
      if (type) {
        const url = URL.createObjectURL(file);
        newItems.push({
          id: uuidv4(),
          type,
          url,
          file,
          name: file.name,
          timestamp: Date.now(),
          folder: currentFolder // Assign to current active folder
        });
      }
    });

    setMediaItems((prev) => [...newItems, ...prev]);
    setIsUploading(false);
  };

  const handleSaveGenerated = async (originalId: string, base64Url: string, name: string, mode: 'new' | 'overwrite') => {
    try {
      const blob = await base64ToBlob(base64Url);
      const file = new File([blob], `${name}.png`, { type: 'image/png' });
      const url = URL.createObjectURL(blob); 

      if (mode === 'overwrite') {
        setMediaItems(prev => prev.map(item => {
          if (item.id === originalId) {
            return {
              ...item,
              url: url,
              file: file,
              name: name,
              isGenerated: true,
              timestamp: Date.now() // Update timestamp to show as recent?
            };
          }
          return item;
        }));
        // Update selected item in modal as well
        setSelectedItem(prev => prev ? { ...prev, url, file, name, isGenerated: true } : null);
      } else {
        const originalItem = mediaItems.find(i => i.id === originalId);
        const newItem: MediaItem = {
          id: uuidv4(),
          type: 'image',
          url: url,
          file: file,
          name: name,
          timestamp: Date.now(),
          isGenerated: true,
          folder: originalItem ? originalItem.folder : currentFolder
        };
        setMediaItems((prev) => [newItem, ...prev]);
      }
    } catch (e) {
      console.error("Failed to save generated image", e);
    }
  };

  const handleUpdateItem = (id: string, updates: Partial<MediaItem>) => {
    setMediaItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    // Update selected item if it's the one being modified
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const addFolder = () => {
    if (newFolderInput.trim() && !folders.includes(newFolderInput.trim())) {
      setFolders([...folders, newFolderInput.trim()]);
      setNewFolderInput('');
      setShowNewFolderInput(false);
    }
  };

  // Filter Logic
  const filteredItems = useMemo(() => {
    return mediaItems.filter(item => {
      const matchesFolder = item.folder === currentFolder;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFolder && matchesType && matchesSearch;
    });
  }, [mediaItems, currentFolder, typeFilter, searchQuery]);

  return (
    <div className="flex h-screen bg-gray-950 text-white selection:bg-indigo-500 selection:text-white overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col hidden md:flex shrink-0">
        <div className="p-6 flex items-center gap-2 border-b border-gray-800">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <ImageIcon className="text-white" size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Gemini Gallery</h1>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
            Klasörler
          </div>
          <div className="space-y-1">
            {folders.map(folder => (
              <button
                key={folder}
                onClick={() => setCurrentFolder(folder)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentFolder === folder 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder size={16} />
                  <span className="truncate max-w-[140px]">{folder}</span>
                </div>
                <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">
                  {mediaItems.filter(i => i.folder === folder).length}
                </span>
              </button>
            ))}
          </div>

          {/* Add Folder Input */}
          {showNewFolderInput ? (
            <div className="mt-2 px-2 flex gap-1">
              <input 
                autoFocus
                className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                value={newFolderInput}
                onChange={(e) => setNewFolderInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFolder()}
                onBlur={() => !newFolderInput && setShowNewFolderInput(false)}
                placeholder="Klasör adı..."
              />
              <button onClick={addFolder} className="bg-gray-800 p-1 rounded hover:bg-gray-700">
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowNewFolderInput(true)}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-white transition-colors"
            >
              <FolderPlus size={16} />
              <span>Yeni Klasör</span>
            </button>
          )}
        </div>

        <div className="p-4 border-t border-gray-800">
           <div className="bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-xs text-gray-400">Depolama</span>
                 <span className="text-xs text-indigo-400 font-bold">{mediaItems.length} dosya</span>
              </div>
              <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(mediaItems.length * 2, 100)}%` }}></div>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Top Header / Mobile Nav */}
        <header className="h-16 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
          <div className="md:hidden flex items-center gap-2">
             {/* Mobile simplified header */}
             <ImageIcon className="text-indigo-500" size={24} />
             <span className="font-bold">Galeri</span>
          </div>

          {/* Search & Filter */}
          <div className="flex-1 max-w-2xl mx-auto flex items-center gap-4">
             <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Görsellerde veya videolarda ara..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600"
                />
             </div>
             <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
                <button 
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${typeFilter === 'all' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  Tümü
                </button>
                <button 
                  onClick={() => setTypeFilter('image')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${typeFilter === 'image' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  Resim
                </button>
                <button 
                  onClick={() => setTypeFilter('video')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${typeFilter === 'video' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  Video
                </button>
             </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          
          {/* Header Info */}
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {currentFolder}
                <span className="text-sm font-normal text-gray-500 bg-gray-900 px-2 py-1 rounded-full">{filteredItems.length}</span>
             </h2>
          </div>

          {/* Upload Area */}
          <div 
            className={`relative group rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out mb-8 min-h-[160px] flex flex-col items-center justify-center
              ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-800 bg-gray-900/30 hover:border-gray-600'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isUploading ? (
               <div className="flex flex-col items-center animate-pulse">
                  <Loader2 size={32} className="text-indigo-500 animate-spin mb-3" />
                  <p className="text-sm text-gray-400">Dosyalar işleniyor...</p>
               </div>
            ) : (
              <>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,video/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleChange}
                />
                <div className="p-3 rounded-full bg-gray-800 mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={24} className="text-gray-400 group-hover:text-indigo-400 transition-colors" />
                </div>
                <p className="text-sm text-gray-300 font-medium">Dosyaları buraya bırakın</p>
                <p className="text-xs text-gray-500 mt-1">veya seçmek için tıklayın</p>
              </>
            )}
          </div>

          {/* Gallery Grid */}
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4">
                 <Filter size={24} className="text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium">Bu klasörde veya filtrede dosya yok.</p>
              <p className="text-xs text-gray-600 mt-1">Dosya yükleyerek başlayın.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedItem(item)}
                  className="relative group cursor-pointer aspect-square rounded-xl bg-gray-900 overflow-hidden border border-gray-800 hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/10"
                >
                  {item.type === 'image' ? (
                    <img 
                      src={item.url} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full relative">
                      <video 
                        src={item.url} 
                        className="w-full h-full object-cover opacity-80"
                        muted 
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                          <Play size={16} className="text-white ml-1" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <div className="flex items-center gap-1.5 text-white mb-0.5">
                      {item.type === 'image' ? <ImageIcon size={12} /> : <VideoIcon size={12} />}
                      <span className="text-xs font-medium truncate w-full">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-gray-400 truncate">{item.folder}</span>
                       {item.isGenerated && (
                        <span className="text-[9px] text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded ml-auto">
                          AI
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {selectedItem && (
        <MediaModal 
          item={selectedItem} 
          folders={folders}
          onClose={() => setSelectedItem(null)} 
          onSaveGenerated={handleSaveGenerated}
          onUpdateItem={handleUpdateItem}
        />
      )}

    </div>
  );
};

export default App;