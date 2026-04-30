import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, AppState } from '../types';
import { SlidersHorizontal, ArrowUpDown, Tag, X, LayoutGrid, List, Search } from 'lucide-react';

interface LibrarySceneProps {
  books: Book[];
  selectedBookId: string | null;
  onSelectBook: (id: string | null) => void;
  appState: AppState;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  selectedCollectionId?: string | null;
  onClearCollection?: () => void;
  allCollections?: any[]; // Simplified for now since we just need names
}

type SortOption = 'title-asc' | 'title-desc' | 'author-asc' | 'author-desc' | 'date-added-desc' | 'date-added-asc' | 'progress-desc' | 'progress-asc';

export const LibraryScene: React.FC<LibrarySceneProps> = ({
  books,
  selectedBookId,
  onSelectBook,
  appState,
  searchQuery,
  onSearch,
  selectedCollectionId,
  onClearCollection
}) => {
  const [columns, setColumns] = useState(4);
  const [collectionName, setCollectionName] = useState<string | null>(null);

  // Fetch collection name if needed
  useEffect(() => {
    if (selectedCollectionId) {
      import('../utils/db').then(({ getAllCollections }) => {
        getAllCollections().then(cols => {
          const found = cols.find(c => c.id === selectedCollectionId);
          setCollectionName(found?.name || 'Collection');
        });
      });
    } else {
      setCollectionName(null);
    }
  }, [selectedCollectionId]);

  const [sortBy, setSortBy] = useState<SortOption>(() => (localStorage.getItem('library_sort') as SortOption) || 'date-added-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('library_view') as 'grid' | 'list') || 'grid');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Persist sort preference
  useEffect(() => {
    localStorage.setItem('library_sort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('library_view', viewMode);
  }, [viewMode]);

  // Responsive: Determine how many books per shelf row
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) setColumns(2);        // Mobile/Small Tablet -> 2
      else if (w < 1024) setColumns(3);  // Tablet (Mid) -> 3
      else setColumns(5);                // Desktop -> 5
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Extract all unique tags from books
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    books.forEach(book => {
      book.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [books]);

  // Filter and Sort books
  const processedBooks = useMemo(() => {
    let filtered = [...books];

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(book =>
        book.tags?.some(tag => selectedTags.includes(tag))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'author-asc':
          return a.author.localeCompare(b.author);
        case 'author-desc':
          return b.author.localeCompare(a.author);
        case 'date-added-desc':
          return (b.dateAdded || 0) - (a.dateAdded || 0);
        case 'date-added-asc':
          return (a.dateAdded || 0) - (b.dateAdded || 0);
        case 'progress-desc':
          return (b.progressPercent || 0) - (a.progressPercent || 0);
        case 'progress-asc':
          return (a.progressPercent || 0) - (b.progressPercent || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [books, sortBy, selectedTags]);

  // Group books into "Shelves" (Rows)
  const shelves = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < processedBooks.length; i += columns) {
      chunks.push(processedBooks.slice(i, i + columns));
    }
    if (chunks.length === 0) chunks.push([]); // Empty state
    return chunks;
  }, [processedBooks, columns]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
    { value: 'author-asc', label: 'Author (A-Z)' },
    { value: 'author-desc', label: 'Author (Z-A)' },
    { value: 'date-added-desc', label: 'Recently Added' },
    { value: 'date-added-asc', label: 'Oldest First' },
    { value: 'progress-desc', label: 'Most Progress' },
    { value: 'progress-asc', label: 'Least Progress' },
  ];

  return (
    <div className="w-full h-full min-h-screen bg-white overflow-y-auto overflow-x-hidden pt-32 pb-32 px-4 md:px-12">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header */}
        <div className="text-center space-y-4">
          {selectedCollectionId ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top duration-500">
              <button
                onClick={onClearCollection}
                className="text-xs font-bold uppercase tracking-[0.2em] text-[#3E2723]/30 hover:text-[#C6A87C] transition-colors flex items-center gap-2 mx-auto"
              >
                <span>← Back to Library</span>
              </button>
              <h2 className="font-serif text-5xl md:text-6xl text-[#3E2723] tracking-tight">{collectionName}</h2>
              <div className="flex items-center justify-center gap-3">
                <div className="h-[1px] w-8 bg-[#3E2723]/10" />
                <p className="text-sm font-serif italic text-[#3E2723]/40">Displaying curated selection from your archive</p>
                <div className="h-[1px] w-8 bg-[#3E2723]/10" />
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-4xl md:text-5xl text-[#3E2723] tracking-tight">Your Library</h2>
              <div className="w-12 h-1 bg-[#3E2723]/10 mx-auto rounded-full" />
            </>
          )}
        </div>

        {/* Search Bar */}
        {onSearch && (
          <div className="flex justify-center px-4">
            <div className="w-full max-w-md relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#3E2723]/40 group-focus-within:text-[#3E2723] transition-colors">
                <Search size={20} />
              </div>
              <input
                value={searchQuery || ''}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search title, author, or tag..."
                className="w-full bg-white/50 hover:bg-white/80 focus:bg-white border border-[#3E2723]/10 rounded-2xl py-3.5 pl-12 pr-4 text-lg text-[#3E2723] shadow-sm hover:shadow-md focus:shadow-xl transition-all outline-none placeholder-[#3E2723]/30"
              />
            </div>
          </div>
        )}

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 px-4">

          {/* Sort & View Options */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Sort Dropdown */}
            <div className="relative flex-1 md:flex-initial">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full md:w-auto px-4 py-2.5 pr-10 bg-white border border-[#3E2723]/10 rounded-xl text-sm font-medium text-[#3E2723] appearance-none cursor-pointer hover:border-[#3E2723]/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#3E2723]/20"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ArrowUpDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3E2723]/40 pointer-events-none" />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-[#F3F0EB] p-1 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#3E2723]' : 'text-[#3E2723]/40 hover:text-[#3E2723]/60'}`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#3E2723]' : 'text-[#3E2723]/40 hover:text-[#3E2723]/60'}`}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>
          </div>




          {/* Filter Toggle */}
          {allTags.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 justify-center ${showFilters || selectedTags.length > 0
                ? 'bg-[#3E2723] text-[#F3F0EB] shadow-md'
                : 'bg-white border border-[#3E2723]/10 text-[#3E2723] hover:border-[#3E2723]/20'
                }`}
            >
              <Tag size={16} />
              <span>Filter by Tags</span>
              {selectedTags.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {selectedTags.length}
                </span>
              )}
            </button>
          )}

          {/* Results Count */}
          <div className="hidden md:flex items-center gap-2 ml-auto text-sm text-[#3E2723]/60">
            <span className="font-medium">{processedBooks.length}</span>
            <span>book{processedBooks.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Tag Filter Panel */}
        <AnimatePresence>
          {showFilters && allTags.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-white border border-[#3E2723]/10 rounded-2xl p-6 mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg text-[#3E2723] font-medium">Filter by Tags</h3>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="text-xs text-[#3E2723]/60 hover:text-[#3E2723] transition-colors flex items-center gap-1"
                    >
                      <X size={14} />
                      Clear All
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition-all ${selectedTags.includes(tag)
                        ? 'bg-[#3E2723] text-[#F3F0EB] shadow-sm'
                        : 'bg-[#3E2723]/5 text-[#3E2723]/70 hover:bg-[#3E2723]/10'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        {viewMode === 'grid' ? (
          /* GRID VIEW (Shelves) */
          <div className="space-y-24">
            {shelves.map((shelfBooks, i) => (
              <div key={i} className="relative px-4 sm:px-8 md:px-12">

                {/* Books Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-0 gap-x-6 md:gap-x-8 items-end justify-items-center relative z-10 mx-auto">
                  {shelfBooks.map((book) => (
                    <motion.div
                      key={book.id}
                      layoutId={`book-cover-${book.id}`}
                      onClick={() => onSelectBook(book.id)}
                      whileHover={{
                        y: -10,
                        scale: 1.05,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="relative cursor-pointer group w-full flex justify-center"
                    >
                      {/* Book Body - Max Width Constraint */}
                      <div
                        className="relative w-full max-w-[150px] aspect-[2/3] rounded-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-white overflow-hidden transition-shadow group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)]"
                        style={{ backgroundColor: book.color }}
                      >
                        {/* Spine Hinge Detail */}
                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black/10 z-20" />

                        {/* Minimal Noise Texture - Always on top */}
                        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E')] mix-blend-overlay z-10 pointer-events-none" />

                        {book.coverImage ? (
                          <div className="absolute inset-0 z-0">
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />
                          </div>
                        ) : (
                          /* Title & Info only if no cover */
                          <div className="absolute inset-0 p-4 flex flex-col text-white justify-between text-center z-0">
                            <div className="flex-1 flex items-center justify-center">
                              <h3 className="font-serif text-base leading-tight line-clamp-3 opacity-95 text-shadow-sm">
                                {book.title}
                              </h3>
                            </div>
                            <div className="w-full border-t border-white/20 pt-2 mt-2">
                              <p className="text-[9px] uppercase tracking-widest opacity-75 truncate text-shadow-sm">
                                {book.author}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Progress Bar */}
                        {book.progressPercent !== undefined && book.progressPercent > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 z-20">
                            <div
                              className="h-full bg-white/90 transition-all duration-500 ease-out"
                              style={{ width: `${Math.round(book.progressPercent * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* The Shelf Plank */}
                <div className="absolute bottom-[-20px] left-0 right-0 h-[18px] bg-[#EAE5DD] rounded-full shadow-[0_4px_10px_rgba(61,48,40,0.06)] z-0 transform scale-x-[1.02]">
                  <div className="absolute inset-0 bg-white/30 rounded-full" />
                </div>

              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-4 px-4">
            {processedBooks.map((book) => (
              <motion.div
                key={book.id}
                layoutId={`book-row-${book.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectBook(book.id)}
                className="group flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-4 rounded-2xl bg-white border border-[#3E2723]/10 hover:border-[#3E2723]/30 hover:shadow-md transition-all cursor-pointer"
              >
                {/* Thumbnail */}
                <div
                  className="w-16 h-24 flex-shrink-0 rounded shadow-sm overflow-hidden relative"
                  style={{ backgroundColor: book.color }}
                >
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-1 text-center bg-black/10">
                      <span className="text-[8px] text-white font-serif leading-tight">{book.title}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 w-full md:w-auto">
                  <h3 className="font-serif text-lg font-bold text-[#3E2723] truncate md:line-clamp-2 md:whitespace-normal">
                    {book.title}
                  </h3>
                  <p className="text-sm text-[#3E2723]/60 truncate">{book.author}</p>

                  {/* Tags */}
                  {book.tags && book.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {book.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-[#3E2723]/5 rounded-full text-[#3E2723]/60 uppercase tracking-wide shrink-0">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop Meta (Date Added) */}
                <div className="hidden md:block w-32 text-right text-xs text-[#3E2723]/40">
                  {book.dateAdded ? new Date(book.dateAdded).toLocaleDateString() : ''}
                </div>

                {/* Progress */}
                <div className="w-full md:w-48 flex-shrink-0">
                  <div className="flex justify-between text-xs text-[#3E2723]/60 mb-1">
                    <span>{Math.round((book.progressPercent || 0) * 100)}% Complete</span>
                  </div>
                  <div className="h-2 bg-[#3E2723]/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3E2723] rounded-full"
                      style={{ width: `${(book.progressPercent || 0) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {processedBooks.length === 0 && books.length > 0 && (
          <div className="text-center py-12 opacity-60">
            <p className="font-serif italic text-lg text-[#3E2723]">No books match your filters.</p>
            <button
              onClick={() => setSelectedTags([])}
              className="mt-4 text-sm text-[#3E2723] underline hover:no-underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {books.length === 0 && (
          <div className="text-center py-12 opacity-40">
            {searchQuery ? (
              <p className="font-serif italic text-lg text-[#3E2723]">No books match "{searchQuery}"</p>
            ) : (
              <p className="font-serif italic text-lg text-[#3E2723]">Your shelves are waiting for stories.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};