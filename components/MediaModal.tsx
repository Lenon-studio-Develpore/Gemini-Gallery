import React, { useState, useRef, useEffect } from 'react';
import { MediaItem, AppStatus } from '../types';
import { 
  X, Wand2, Loader2, Download, Play, 
  Edit2, Check, Sun, Contrast, Palette, Save, Folder 
} from './Icons';
import { editImageWithGemini, analyzeVideoWithGemini } from '../services/geminiService';

interface MediaModalProps {
  item: MediaItem;
  folders: string[];
  onClose: () => void;
  onSaveGenerated: (originalId: string, newUrl: string, name: string, mode: 'new' | 'overwrite') => void;
  onUpdateItem: (id: string, updates: Partial<MediaItem>) => void;
}

const PRESET_PROMPTS = [
  { label: 'Aydınlat', icon: Sun, prompt: 'Increase brightness and improve lighting of this image.' },
  { label: 'Kontrast', icon: Contrast, prompt: 'Adjust contrast to make details pop.' },
  { label: 'Siyah Beyaz', icon: Palette, prompt: 'Convert this image to artistic black and white.' },
  { label: 'Canlandır', icon: Wand2, prompt: 'Make the colors more vibrant and lively.' },
];

const MediaModal: React.FC<MediaModalProps> = ({ item, folders, onClose, onSaveGenerated, onUpdateItem }) => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [resultText, setResultText] = useState<string | null>(item.aiDescription || null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  
  // Editing Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(item.name);

  // Save Options State
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [saveName, setSaveName] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset state when item changes
  useEffect(() => {
    setPrompt('');
    setStatus(AppStatus.IDLE);
    setResultText(item.aiDescription || null);
    setGeneratedImageUrl(null);
    setTempName(item.name);
    setSaveName(`Edited-${item.name}`);
    setShowSaveOptions(false);
  }, [item]);

  const handleAction = async (customPrompt?: string) => {
    const promptToUse = customPrompt || prompt;
    if (!promptToUse.trim()) return;
    
    setStatus(AppStatus.PROCESSING);
    
    try {
      if (item.type === 'image') {
        const newImageUrl = await editImageWithGemini(item.file, promptToUse);
        setGeneratedImageUrl(newImageUrl);
        setResultText("Görsel başarıyla düzenlendi! Kaydetme seçenekleri için 'Kaydet' butonunu kullanın.");
      } else {
        const analysis = await analyzeVideoWithGemini(item.file, promptToUse);
        setResultText(analysis);
        onUpdateItem(item.id, { aiDescription: analysis });
      }
      setStatus(AppStatus.SUCCESS);
    } catch (error) {
      console.error(error);
      setResultText("Bir hata oluştu. Lütfen tekrar deneyin. (Dosya boyutu çok büyük olabilir)");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleRename = () => {
    if (tempName.trim()) {
      onUpdateItem(item.id, { name: tempName });
      setIsEditingName(false);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateItem(item.id, { folder: e.target.value });
  };

  const executeSave = (mode: 'new' | 'overwrite') => {
    if (generatedImageUrl && saveName.trim()) {
      onSaveGenerated(item.id, generatedImageUrl, saveName, mode);
      setShowSaveOptions(false);
      if (mode === 'overwrite') {
        // If overwrite, close modal or refresh view? 
        // Logic handled in parent, let's just close modal for better UX or stay.
        // Let's stay but reset generated view
        setGeneratedImageUrl(null);
        alert("Görsel güncellendi!");
      } else {
        alert("Yeni görsel galeriye eklendi!");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="relative w-full max-w-7xl h-[95vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-gray-800">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Media View Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative p-4 group overflow-hidden">
          
          {/* Compare View for Image Editing */}
          {generatedImageUrl ? (
             <div className="flex flex-col h-full w-full gap-4">
                <div className="flex-1 flex gap-4 min-h-0">
                  <div className="flex-1 relative bg-gray-900/50 rounded-lg overflow-hidden border border-gray-800">
                      <span className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-gray-300 z-10">Orijinal</span>
                      <img src={item.url} alt="Original" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 relative bg-gray-900/50 rounded-lg overflow-hidden border border-indigo-900/50">
                      <span className="absolute top-2 left-2 bg-indigo-600/80 px-2 py-1 rounded text-xs text-white z-10">Gemini AI</span>
                      <img src={generatedImageUrl} alt="Generated" className="w-full h-full object-contain" />
                  </div>
                </div>
                
                {/* Save Options Bar */}
                <div className="h-auto bg-gray-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-700">
                   {!showSaveOptions ? (
                      <div className="flex items-center gap-4 w-full justify-between">
                         <span className="text-gray-300 text-sm">Görseliniz hazır! Nasıl devam etmek istersiniz?</span>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => setGeneratedImageUrl(null)}
                             className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
                           >
                             İptal
                           </button>
                           <button 
                             onClick={() => setShowSaveOptions(true)}
                             className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-500/20 text-sm font-medium transition-all transform hover:scale-105"
                           >
                             <Save size={16} />
                             Kaydet
                           </button>
                         </div>
                      </div>
                   ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full animate-fade-in">
                        <div className="flex-1 w-full">
                          <label className="text-xs text-gray-400 block mb-1">Dosya Adı</label>
                          <input 
                            type="text" 
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                           <button 
                             onClick={() => executeSave('new')}
                             className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium transition-colors"
                           >
                             Yeni Olarak Kaydet
                           </button>
                           <button 
                             onClick={() => executeSave('overwrite')}
                             className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-medium transition-colors"
                           >
                             Üzerine Yaz
                           </button>
                        </div>
                      </div>
                   )}
                </div>
             </div>
          ) : (
            <>
              {item.type === 'image' ? (
                <img src={item.url} alt={item.name} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                   <video controls src={item.url} className="max-h-full max-w-full rounded-lg shadow-2xl" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar / Controls */}
        <div className="w-full md:w-[400px] bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 flex flex-col shrink-0">
          
          {/* Header Info */}
          <div className="p-6 border-b border-gray-800 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                 {isEditingName ? (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-lg font-bold focus:border-indigo-500 outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                      />
                      <button onClick={handleRename} className="p-2 bg-green-600/20 text-green-500 rounded hover:bg-green-600/30">
                        <Check size={18} />
                      </button>
                    </div>
                 ) : (
                    <div className="flex items-center gap-2 group/name">
                      <h2 className="text-xl font-bold text-white truncate" title={item.name}>{item.name}</h2>
                      <button 
                        onClick={() => setIsEditingName(true)} 
                        className="opacity-0 group-hover/name:opacity-100 p-1 text-gray-500 hover:text-white transition-opacity"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                 )}
                 <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium flex items-center gap-2">
                   {item.type === 'image' ? 'Fotoğraf' : 'Video'} • {new Date(item.timestamp).toLocaleDateString('tr-TR')}
                 </p>
              </div>
            </div>

            {/* Folder Selection */}
            <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg border border-gray-800">
               <Folder size={16} className="text-gray-400" />
               <select 
                 value={item.folder} 
                 onChange={handleFolderChange}
                 className="bg-transparent text-sm text-gray-300 focus:outline-none w-full cursor-pointer"
               >
                 {folders.map(f => (
                   <option key={f} value={f} className="bg-gray-900 text-white">{f}</option>
                 ))}
               </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
            {/* Conversation History / Result */}
            {resultText ? (
              <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-5 border border-gray-700 mb-6 animate-fade-in shadow-inner">
                 <div className="flex items-center gap-2 mb-3 text-indigo-400 pb-2 border-b border-gray-700/50">
                    <Wand2 size={16} />
                    <span className="text-xs font-bold uppercase tracking-wide">Gemini Analizi</span>
                 </div>
                 <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-sm font-light">
                   {resultText}
                 </p>
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center text-center text-gray-600 py-10 h-full">
                  <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                    <Wand2 size={32} className="opacity-20" />
                  </div>
                  {item.type === 'image' 
                    ? <p className="text-sm px-8">Fotoğrafı değiştirmek için yapay zekaya talimat verin veya aşağıdaki hazır ayarları kullanın.</p>
                    : <p className="text-sm px-8">Videodaki nesneleri, eylemleri veya içeriği analiz etmek için soru sorun.</p>
                  }
               </div>
            )}
          </div>

          <div className="p-6 bg-gray-900 border-t border-gray-800 space-y-4">
            
            {/* Presets (Only for Images) */}
            {item.type === 'image' && !status && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {PRESET_PROMPTS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleAction(preset.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full text-xs text-gray-300 whitespace-nowrap transition-colors"
                  >
                    <preset.icon size={12} />
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="mb-1">
                <label className="text-xs font-semibold text-gray-400 ml-1">
                  {item.type === 'image' ? 'Özel Komut' : 'Soru Sor'}
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                  placeholder={item.type === 'image' ? "Örn: Arka planı değiştir..." : "Örn: Bu videoda ne oluyor?"}
                  disabled={status === AppStatus.PROCESSING}
                  className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
                <button
                  onClick={() => handleAction()}
                  disabled={status === AppStatus.PROCESSING || !prompt.trim()}
                  className={`w-12 rounded-xl flex items-center justify-center transition-all ${
                    status === AppStatus.PROCESSING || !prompt.trim()
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  }`}
                >
                  {status === AppStatus.PROCESSING ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Wand2 size={20} />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] text-gray-600">
               <span>Gemini 2.5 Flash</span>
               {status === AppStatus.PROCESSING && <span className="animate-pulse text-indigo-400">İşleniyor...</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaModal;
