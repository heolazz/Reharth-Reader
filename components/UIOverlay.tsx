import React, { useState, useRef } from 'react';
import { Plus, Upload, X, Check, ArrowRight, ArrowLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book } from '../types';
import { EARTHY_COLORS } from '../constants';
import { generateUUID } from '../utils/uuid';
import { Toast, useToast } from './Toast';
import { useAuthStore } from '../stores/useAuthStore';

interface UIOverlayProps {
  isVisible: boolean;
  onAddBook: (book: Book) => void;
  editingBook?: Book | null;
  onUpdateBook?: (book: Book) => void;
  onClose?: () => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  books?: Book[]; // For statistics
  onOpenProfile?: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ isVisible, onAddBook, editingBook, onUpdateBook, onClose, searchQuery, onSearch, books = [], onOpenProfile }) => {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const { toast, showToast, hideToast } = useToast();
  const { user } = useAuthStore();

  // Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(EARTHY_COLORS[0]);
  const [textContent, setTextContent] = useState('');
  const [epubData, setEpubData] = useState<ArrayBuffer | undefined>(undefined);
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [fileType, setFileType] = useState<'text' | 'epub'>('text');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with editingBook
  React.useEffect(() => {
    if (editingBook) {
      setTitle(editingBook.title);
      setAuthor(editingBook.author);
      setYear(editingBook.year || '');
      setSummary(editingBook.summary || '');
      setTags(editingBook.tags || []);
      setSelectedColor(editingBook.color);
      setTextContent(editingBook.content || '');
      setEpubData(editingBook.epubData);
      setCoverImage(editingBook.coverImage);
      setFileType(editingBook.fileType);
      setShowModal(true);
    }
  }, [editingBook]);

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setYear('');
    setSummary('');
    setTags([]);
    setTagInput('');
    setSelectedColor(EARTHY_COLORS[0]);
    setTextContent('');
    setEpubData(undefined);
    setCoverImage(undefined);
    setFileType('text');
    setUploadedFileName(null);
    setStep(1);
    setShowModal(false);
    if (onClose) onClose();
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!title) {
      showToast('Please enter a book title', 'error');
      return;
    }

    // Default tag logic
    const finalTags = tags.length > 0 ? tags : ['General'];

    const bookId = editingBook ? editingBook.id : generateUUID();

    try {
      showToast('Saving book...', 'loading');

      // Save EPUB/text file data to local IndexedDB (NOT to server)
      if (epubData && fileType === 'epub') {
        showToast('Caching EPUB locally...', 'loading');
        const { initDB } = await import('../utils/db');
        const db = await initDB();
        // Store the raw ArrayBuffer in a dedicated 'book-files' store
        const tx = db.transaction('books', 'readwrite');
        // We'll store epubData as part of the book object in IndexedDB
      }

      // For text content, we keep it in the book object directly (it's small)
      // For EPUB, we store the ArrayBuffer in the book object for IndexedDB
      // Cover stays as base64 string in the book object (local only)

      const newBook: Book = {
        id: bookId,
        title,
        author: author || 'Unknown',
        color: selectedColor,
        icon: 'feather',
        tags: finalTags,
        year: year || new Date().getFullYear().toString(),
        summary: summary || 'No summary available.',
        content: textContent || 'No content provided.',
        fileType: fileType,
        epubData: epubData, // Stored locally in IndexedDB, NOT uploaded to server
        coverImage: coverImage, // Kept as base64 locally, NOT uploaded to server
        coverUrl: coverImage, // Use same base64 for display
        fileUrl: undefined, // No server URL needed — file is local
        dateAdded: editingBook?.dateAdded || Date.now()
      };

      if (editingBook && onUpdateBook) {
        onUpdateBook(newBook);
      } else {
        onAddBook(newBook);
      }

      showToast(`"${title}" saved successfully!`, 'success');
      resetForm();
    } catch (error) {
      console.error('❌ Error saving book:', error);
      showToast(`Failed to save book: ${(error as any).message}`, 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.epub')) {
      try {
        showToast('Parsing EPUB file...', 'loading');
        const { parseEpub } = await import('../utils/epubParser');
        const metadata = await parseEpub(file);

        if (metadata.title) setTitle(metadata.title);
        if (metadata.author) setAuthor(metadata.author);
        if (metadata.summary) setSummary(metadata.summary);
        if (metadata.year) setYear(metadata.year);
        if (metadata.epubData) setEpubData(metadata.epubData);
        if (metadata.coverImage) setCoverImage(metadata.coverImage);
        setFileType('epub');
        setUploadedFileName(file.name);

        showToast('EPUB loaded successfully!', 'success');

        // Auto advance logic:
        // If we are in Step 2 (user clicked re-upload), we stay/are fine.
        // If we are in Step 1 (Quick Import), we STAY in Step 1 so user can review the autofilled metadata.
        // The "Next" button will now be enabled because 'title' is filled.
        if (step === 2) {
          // Optional: maybe flash success?
        }
      } catch (error) {
        console.error("Failed to parse epub", error);
        showToast("Failed to parse EPUB file", 'error');
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setTextContent(content);
        setFileType('text');
        if (!title) setTitle(file.name.replace('.txt', ''));
        setUploadedFileName(file.name);
        showToast('Text file loaded!', 'success');
      };
      reader.readAsText(file);
      // Auto advance for text files usually implies jumping to editing
      if (step === 1) setStep(2);
    }
  };

  return (
    <>
      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Floating Action Button & Header */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end p-6 pb-28 md:p-10 md:pb-10"
          >
            {/* Footer Actions */}
            <div className="flex justify-end pointer-events-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="group flex items-center gap-3 bg-[#3E2723] text-[#F3F0EB] px-5 py-3 md:px-6 md:py-4 rounded-full shadow-xl hover:shadow-2xl transition-all"
              >
                <Plus size={20} className="text-[#F3F0EB]" />
                <span className="font-medium font-serif text-lg tracking-wide hidden md:inline">Craft Book</span>
                <span className="font-medium font-serif text-lg tracking-wide md:hidden">Craft</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unique Add Book Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-[#3E2723]/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full md:max-w-5xl h-[85dvh] md:h-[85vh] bg-[#F3F0EB] rounded-t-[2rem] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >

              {/* LEFT PANE: Live Preview */}
              <div className="w-full md:w-5/12 bg-[#EAE5DD]/50 px-6 py-6 md:p-8 flex flex-row md:flex-col items-center justify-between md:justify-center gap-4 border-b md:border-b-0 md:border-r border-[#3E2723]/5 relative flex-shrink-0">

                {/* Mobile-only Close Button */}
                <button
                  onClick={resetForm}
                  className="absolute top-4 right-4 p-2 bg-white/50 rounded-full text-[#3E2723] md:hidden z-20 hover:bg-white transition-colors"
                >
                  <X size={20} />
                </button>

                {/* Desktop Label */}
                <div className="absolute top-4 left-6 md:top-6 md:left-6 text-[10px] md:text-xs font-sans font-bold uppercase tracking-widest text-[#3E2723]/40 hidden md:block">
                  Live Preview
                </div>

                {/* The Book Cover */}
                <motion.div
                  layout
                  className="relative flex-shrink-0 rounded-[2px] shadow-lg md:shadow-2xl flex flex-col overflow-hidden transition-colors duration-500"
                  style={{
                    backgroundColor: selectedColor,
                    width: typeof window !== 'undefined' && window.innerWidth < 768 ? '80px' : '220px',
                    height: typeof window !== 'undefined' && window.innerWidth < 768 ? '120px' : '330px',
                  }}
                >
                  {/* Spine Hinge - Always on top */}
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] md:w-[8px] bg-gradient-to-r from-black/40 via-black/10 to-transparent z-30" />

                  {/* Texture Overlay - Always on top */}
                  <div className="absolute inset-0 opacity-[0.1] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-20 pointer-events-none" />

                  {coverImage ? (
                    <img src={coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover z-10" />
                  ) : (
                    <div className="relative z-10 flex flex-col items-center justify-between h-full py-2 px-1 md:py-8 md:px-6 text-white">
                      <div className="flex-1 flex items-center justify-center w-full">
                        <h3 className="font-serif text-[8px] md:text-3xl leading-[1.1] text-center break-words w-full line-clamp-3 drop-shadow-md">
                          {title || "Untitled"}
                        </h3>
                      </div>
                      <div className="hidden md:flex w-full flex-col items-center gap-1 md:gap-2">
                        <div className="w-6 md:w-8 h-px bg-white/40" />
                        <p className="font-sans text-[10px] md:text-xs uppercase tracking-widest opacity-90 text-center line-clamp-1 drop-shadow-sm">
                          {author || "Author"}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Color Picker & Title on Mobile */}
                <div className="flex-1 flex flex-col justify-center md:items-center md:mt-12 md:w-full md:max-w-[280px]">

                  {/* Mobile Title display (since cover is small) */}
                  <div className="md:hidden mb-3 pr-8">
                    <h3 className="font-serif text-xl font-bold text-[#3E2723] leading-tight line-clamp-1">{title || "New Book"}</h3>
                    <p className="text-xs font-sans text-[#3E2723]/60 mt-0.5">{author || "Unknown Author"}</p>
                  </div>

                  <label className="text-[10px] md:text-xs font-sans font-bold uppercase tracking-widest text-[#3E2723]/40 mb-2 md:mb-3 block text-left md:text-center">
                    Cover Color
                  </label>

                  <div className="flex md:justify-center gap-3 overflow-x-auto pb-1 md:pb-0 md:flex-wrap scrollbar-hide">
                    {EARTHY_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`flex-shrink-0 w-8 h-8 md:w-8 md:h-8 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === c ? 'border-[#3E2723] scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT PANE: Inputs */}
              <div className="flex-1 flex flex-col bg-[#F3F0EB] overflow-hidden">
                {/* Desktop Close Button */}
                <div className="hidden md:flex justify-end p-6">
                  <button onClick={resetForm} className="p-2 hover:bg-[#3E2723]/5 rounded-full text-[#3E2723]/60 hover:text-[#3E2723] transition-colors">
                    <X size={24} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-24 md:pb-10 pt-6 md:pt-0">
                  <AnimatePresence mode="wait">
                    {step === 1 ? (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6 md:space-y-8 max-w-lg mx-auto pb-8"
                      >
                        <div className="space-y-1 md:space-y-2 block">
                          <h2 className="text-2xl md:text-3xl font-serif text-[#3E2723]">{editingBook ? 'Edit Book' : 'Book Details'}</h2>
                          <div className="flex items-center justify-between">
                            <p className="text-[#3E2723]/50 text-sm">Step 1 of 2</p>
                            {/* QUICK IMPORT BUTTON */}
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#3E2723] bg-[#3E2723]/10 hover:bg-[#3E2723]/20 px-3 py-2 rounded-lg transition-colors"
                            >
                              <Upload size={14} /> Import EPUB
                            </div>
                            {/* Hidden Input for Quick Import */}
                            <input
                              type="file"
                              accept=".epub"
                              ref={fileInputRef}
                              className="hidden"
                              onChange={handleFileUpload}
                            />
                          </div>
                        </div>

                        {/* File Indicator if Uploaded */}
                        {uploadedFileName && (
                          <div className="bg-[#3E2723]/5 border border-[#3E2723]/10 rounded-xl p-3 flex items-center gap-3">
                            <div className="bg-[#3E2723] text-white p-2 rounded-lg">
                              <Check size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold uppercase tracking-widest text-[#3E2723]/60">File Ready</p>
                              <p className="text-sm font-medium text-[#3E2723] truncate">{uploadedFileName}</p>
                            </div>
                            <button
                              onClick={() => {
                                setUploadedFileName(null);
                                setEpubData(undefined);
                                setFileType('text');
                              }}
                              className="p-2 hover:bg-[#3E2723]/10 rounded-full text-[#3E2723]/40 hover:text-[#3E2723] transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}

                        <div className="space-y-5 md:space-y-6">
                          <div className="group">
                            <label className="block text-xs font-bold uppercase tracking-widest text-[#3E2723]/40 mb-1 md:mb-2 group-focus-within:text-[#3E2723] transition-colors">Title</label>
                            <input
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              className="w-full bg-transparent border-b-2 border-[#3E2723]/10 py-2 text-xl md:text-2xl font-serif text-[#3E2723] placeholder-[#3E2723]/20 focus:outline-none focus:border-[#3E2723] transition-colors"
                              placeholder="The Great Gatsby"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4 md:gap-6">
                            <div className="group">
                              <label className="block text-xs font-bold uppercase tracking-widest text-[#3E2723]/40 mb-1 md:mb-2 group-focus-within:text-[#3E2723] transition-colors">Author</label>
                              <input
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                className="w-full bg-transparent border-b border-[#3E2723]/10 py-2 text-base md:text-lg font-sans text-[#3E2723] placeholder-[#3E2723]/20 focus:outline-none focus:border-[#3E2723] transition-colors"
                                placeholder="Fitzgerald"
                              />
                            </div>
                            <div className="group">
                              <label className="block text-xs font-bold uppercase tracking-widest text-[#3E2723]/40 mb-1 md:mb-2 group-focus-within:text-[#3E2723] transition-colors">Year</label>
                              <input
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="w-full bg-transparent border-b border-[#3E2723]/10 py-2 text-base md:text-lg font-sans text-[#3E2723] placeholder-[#3E2723]/20 focus:outline-none focus:border-[#3E2723] transition-colors"
                                placeholder="1925"
                              />
                            </div>
                          </div>

                          <div className="group">
                            <label className="block text-xs font-bold uppercase tracking-widest text-[#3E2723]/40 mb-1 md:mb-2 group-focus-within:text-[#3E2723] transition-colors">Summary (Optional)</label>
                            <textarea
                              value={summary}
                              onChange={(e) => setSummary(e.target.value)}
                              className="w-full bg-[#EAE5DD]/30 rounded-xl p-3 md:p-4 text-sm font-sans text-[#3E2723] placeholder-[#3E2723]/20 focus:outline-none focus:ring-1 focus:ring-[#3E2723] transition-all resize-none h-20 md:h-24"
                              placeholder="A brief overview..."
                            />
                          </div>

                          <div className="group">
                            <label className="block text-xs font-bold uppercase tracking-widest text-[#3E2723]/40 mb-1 md:mb-2 group-focus-within:text-[#3E2723] transition-colors">Tags</label>

                            <div className="flex flex-wrap gap-2 mb-2">
                              {tags.map(tag => (
                                <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#3E2723]/10 text-[#3E2723]">
                                  {tag}
                                  <button onClick={() => removeTag(tag)} className="ml-2 hover:text-red-500">
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>

                            <input
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={handleAddTag}
                              className="w-full bg-transparent border-b border-[#3E2723]/10 py-2 text-base md:text-lg font-sans text-[#3E2723] placeholder-[#3E2723]/20 focus:outline-none focus:border-[#3E2723] transition-colors"
                              placeholder="Type and press Enter to add tags..."
                            />
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6 h-full flex flex-col pb-8"
                      >
                        <div className="space-y-2 block">
                          <h2 className="text-2xl md:text-3xl font-serif text-[#3E2723]">Add Content</h2>
                          <p className="text-[#3E2723]/50 text-sm">Step 2 of 2</p>
                        </div>

                        <div className="flex-1 flex flex-col gap-4 min-h-0">
                          <div
                            onClick={() => !uploadedFileName && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-4 transition-all ${uploadedFileName
                              ? 'border-[#3E2723] bg-[#3E2723]/5 cursor-default'
                              : 'border-[#3E2723]/10 text-[#3E2723]/60 hover:bg-[#3E2723]/5 hover:text-[#3E2723] hover:border-[#3E2723]/30 cursor-pointer'
                              }`}
                          >
                            {uploadedFileName ? (
                              <>
                                <Check size={20} className="text-[#3E2723]" />
                                <span className="text-sm font-medium text-[#3E2723]">
                                  Using: {uploadedFileName}
                                </span>
                              </>
                            ) : (
                              <>
                                <Upload size={20} />
                                <span className="text-sm font-medium">Upload .txt or .epub</span>
                                <input
                                  type="file"
                                  accept=".txt,.epub"
                                  ref={fileInputRef}
                                  className="hidden"
                                  onChange={handleFileUpload}
                                />
                              </>
                            )}
                          </div>

                          <textarea
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            placeholder="Or paste your text here..."
                            className="flex-1 w-full bg-[#fff] border border-[#3E2723]/10 rounded-xl p-4 md:p-6 text-sm md:text-base font-serif text-[#3E2723] placeholder-[#3E2723]/20 focus:outline-none focus:border-[#3E2723]/30 focus:shadow-inner transition-all resize-none leading-relaxed"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer Navigation - Fixed at bottom on mobile */}
                <div className="p-4 md:p-8 border-t border-[#3E2723]/5 flex justify-between items-center bg-[#F3F0EB] absolute bottom-0 left-0 right-0 z-30 md:static safe-area-pb">
                  {step === 2 ? (
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 text-[#3E2723]/60 hover:text-[#3E2723] font-medium text-sm transition-colors px-2"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                  ) : (
                    <div /> // Spacer
                  )}

                  {step === 1 ? (
                    <button
                      onClick={() => title && setStep(2)}
                      disabled={!title}
                      className="bg-[#3E2723] text-[#F3F0EB] px-6 py-3 md:px-8 md:py-3 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-[#2C1B17] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95"
                    >
                      Next <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      className="bg-[#3E2723] text-[#F3F0EB] px-6 py-3 md:px-8 md:py-3 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-[#2C1B17] transition-all shadow-lg hover:shadow-xl active:scale-95"
                    >
                      <Check size={16} /> {editingBook ? 'Save Changes' : 'Finish'}
                    </button>
                  )}
                </div>

              </div>
            </motion.div >
          </div >
        )}
      </AnimatePresence >
    </>
  );
};