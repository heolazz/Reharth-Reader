import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowLeft, Settings2, ChevronLeft, ChevronRight, LayoutTemplate, ScrollText, BookOpen, FileText, Bookmark as BookmarkIcon, Trash2, Highlighter, List, Search } from 'lucide-react';
import ePub, { Rendition } from 'epubjs';
import { ReaderSettings } from './ReaderSettings';
import { ReaderSidebar } from './ReaderSidebar';
import { Book, Highlight, Bookmark, ReaderTheme, FontFamily, ReadingMode, PageLayout, HighlightColor } from '../types';
import { generateUUID } from '../utils/uuid';
import { getHighlightsByBook, saveHighlight, deleteHighlight, getBookmarksByBook, saveBookmark, deleteBookmark } from '../utils/db';
import { HIGHLIGHT_COLORS } from '../constants';
import { useAuthStore } from '../stores/useAuthStore';

interface ReaderInterfaceProps {
  book: Book | null;
  isVisible: boolean;
  onClose: () => void;
  onUpdateProgress: (bookId: string, location: string, percentage: number, timeRead?: number) => void;
  initialLocation?: string;
}


export const ReaderInterface: React.FC<ReaderInterfaceProps> = ({ book, isVisible, onClose, onUpdateProgress, initialLocation }) => {
  const { isAuthenticated } = useAuthStore();

  // Appearance State (Persisted)
  const [theme, setTheme] = useState<ReaderTheme>(() => (localStorage.getItem('reader_theme') as ReaderTheme) || 'paper');
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => (localStorage.getItem('reader_font') as FontFamily) || 'serif');
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('reader_fontSize');
    return saved ? parseInt(saved, 10) : 20;
  });
  const [lineHeight, setLineHeight] = useState<number>(() => {
    const saved = localStorage.getItem('reader_lineHeight');
    return saved ? parseFloat(saved) : 1.8;
  });
  const [letterSpacing, setLetterSpacing] = useState<number>(() => {
    const saved = localStorage.getItem('reader_letterSpacing');
    return saved ? parseFloat(saved) : 0;
  });

  // View State (Persisted)
  const [readingMode, setReadingMode] = useState<ReadingMode>(() => {
    const saved = localStorage.getItem('reader_mode') as ReadingMode;
    if (saved) return saved;
    // Default: Scroll for mobile, Paged for desktop
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'scroll' : 'paged';
    }
    return 'paged';
  });
  const [pageLayout, setPageLayout] = useState<PageLayout>(() => (localStorage.getItem('reader_layout') as PageLayout) || 'single');

  // Stats State
  const [sessionTime, setSessionTime] = useState(0); // Seconds in current session
  const startReadTimeRef = useRef(0); // Track initial time read to avoid double counting updates

  // Persist Settings
  useEffect(() => {
    localStorage.setItem('reader_theme', theme);
    localStorage.setItem('reader_font', fontFamily);
    localStorage.setItem('reader_fontSize', fontSize.toString());
    localStorage.setItem('reader_mode', readingMode);
    localStorage.setItem('reader_layout', pageLayout);
    localStorage.setItem('reader_lineHeight', lineHeight.toString());
    localStorage.setItem('reader_letterSpacing', letterSpacing.toString());
  }, [theme, fontFamily, fontSize, readingMode, pageLayout, lineHeight, letterSpacing]);

  // Sync sessionTime to Ref for cleanup access
  const sessionTimeRef = useRef(sessionTime);
  useEffect(() => {
    sessionTimeRef.current = sessionTime;
  }, [sessionTime]);

  // Reading Timer
  useEffect(() => {
    if (!isVisible || !book) return;

    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, book?.id]);

  // Helper to save progress
  const saveProgress = () => {
    if (!book || sessionTimeRef.current === 0) return;

    const currentLoc = renditionRef.current?.location?.start?.cfi || book.lastLocation || "";
    const currentPct = renditionRef.current?.location?.start?.percentage || book.progressPercent || 0;

    // Calculate Total Time
    const totalTime = startReadTimeRef.current + sessionTimeRef.current;

    onUpdateProgress(book.id, currentLoc, currentPct, totalTime);
  };

  // Periodic Save (every 30s)
  useEffect(() => {
    if (!isVisible || !book) return;
    const saveInterval = setInterval(saveProgress, 30000);
    return () => clearInterval(saveInterval);
  }, [isVisible, book?.id, onUpdateProgress]);

  // Save on Close/Unmount
  useEffect(() => {
    return () => {
      // Only save if we have accumulated time and are visible (or were visible)
      if (isVisible && sessionTimeRef.current > 0) {
        saveProgress();
      }
    };
  }, [isVisible, book?.id]); // Run cleanup when visibility toggles or book changes

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // UI State
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<any[]>([]);
  const [activeChapterHref, setActiveChapterHref] = useState<string>("");

  // Bookmarks & Highlights State
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeTab, setActiveTab] = useState<'chapters' | 'bookmarks' | 'highlights'>('chapters');

  // Search State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ cfi: string; excerpt: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [returnLocation, setReturnLocation] = useState<string | null>(null);

  // Selection / Highlight Menu State
  const [selectionRange, setSelectionRange] = useState<string | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number, y: number } | null>(null); // For positioning menu


  const [progressLabel, setProgressLabel] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [selectionText, setSelectionText] = useState("");


  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const epubContainerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);

  // State Refs (to avoid re-init of EPUB on UI toggle)
  const stateRef = useRef({ showSettings, showToc, showSearch, selectionRange });
  const onCloseRef = useRef(onClose);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  // Helper
  const truncate = (str: string, max: number) => {
    return str.length > max ? str.substring(0, max - 1) + '…' : str;
  };

  useEffect(() => {
    stateRef.current = { showSettings, showToc, showSearch, selectionRange };
    onCloseRef.current = onClose;
  }, [showSettings, showToc, showSearch, selectionRange, onClose]);


  // Progress Bar & Parallax (Scroll Mode Only)
  const { scrollY, scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const backgroundY = useTransform(scrollY, [0, 2000], [0, 200]);

  // Handle Resize & Page Calculation
  useEffect(() => {
    const handleResize = () => {
      // Auto-switch to single page on small screens if in double mode
      if (window.innerWidth < 768 && pageLayout === 'double') {
        setPageLayout('single');
      }
      calculatePages();
    };

    window.addEventListener('resize', handleResize);
    // Initial check
    if (window.innerWidth < 768 && pageLayout === 'double') {
      setPageLayout('single');
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [pageLayout, readingMode]);

  useEffect(() => {
    setIsReady(false);
    // Load User Data
    if (book?.id) {
      loadUserData(book.id);
      // Initialize start time for session
      startReadTimeRef.current = book.timeRead || 0;
      setSessionTime(0);
    }
  }, [book?.id]);

  const loadUserData = async (bookId: string) => {
    try {
      let h: Highlight[] = [];
      let b: Bookmark[] = [];

      if (isAuthenticated) {
        try {
          const { getHighlightsFromSupabase, getBookmarksFromSupabase } = await import('../lib/supabaseDb');
          [h, b] = await Promise.all([
            getHighlightsFromSupabase(bookId),
            getBookmarksFromSupabase(bookId)
          ]);
        } catch (err) {
          console.error('Failed to load user data from cloud, falling back to local', err);
          // Fallback to local
          [h, b] = await Promise.all([getHighlightsByBook(bookId), getBookmarksByBook(bookId)]);
        }
      } else {
        [h, b] = await Promise.all([getHighlightsByBook(bookId), getBookmarksByBook(bookId)]);
      }

      setHighlights(h);
      setBookmarks(b);

      // Load text content from cloud if needed
      if (book?.fileType === 'text' && book.fileUrl && !book.content) {
        try {
          const { downloadTextContent } = await import('../lib/supabaseStorage');
          const textContent = await downloadTextContent(book.fileUrl);
          // Update book content in memory
          if (book) {
            book.content = textContent;
          }
        } catch (error) {
          console.error('Failed to load text content:', error);
        }
      }
    } catch (e) {
      console.error("Failed to load user data", e);
    }
  };




  // Calculate Pages
  const calculatePages = () => {
    if (readingMode === 'paged' && contentRef.current && containerRef.current && book?.fileType !== 'epub') {
      setTimeout(() => {
        if (!contentRef.current || !containerRef.current) return;

        const scrollWidth = contentRef.current.scrollWidth;
        const containerWidth = containerRef.current.clientWidth;
        const gap = pageLayout === 'double' ? 80 : 60; // Must match CSS gap

        // Stride is roughly (containerWidth + gap).
        const stride = containerWidth + gap;
        const pages = Math.ceil(scrollWidth / stride);

        setTotalPages(Math.max(1, pages));

        // Restore progress if exists (Text Mode)
        if (book?.progressPercent && !isReady) {
          const targetPage = Math.floor(book.progressPercent * (Math.max(1, pages)));
          setCurrentPage(Math.min(targetPage, Math.max(1, pages) - 1));
        }

        setIsReady(true);
      }, 100);
    }
  };



  useEffect(() => {
    // Only calc pages for Text books
    if (book?.fileType === 'text') {
      calculatePages();
    }
  }, [readingMode, pageLayout, fontSize, fontFamily, book?.id]);

  // Save Page Progress (Text Paged)
  useEffect(() => {
    if (readingMode === 'paged' && book?.fileType === 'text' && isReady) {
      const percent = totalPages > 1 ? currentPage / (totalPages - 1) : 0;
      onUpdateProgress(book.id, `page:${currentPage}`, percent);
    }
  }, [currentPage, readingMode, isReady]);

  // EPUB Initialization
  useEffect(() => {
    const initEpub = async () => {
      console.log('📖 initEpub called', {
        fileType: book?.fileType,
        hasContainer: !!epubContainerRef.current,
        hasEpubData: !!book?.epubData,
        hasFileUrl: !!book?.fileUrl
      });

      if (book?.fileType !== 'epub' || !epubContainerRef.current) {
        console.log('⏭️ Skipping EPUB init - not epub or no container');
        return;
      }

      // Clear previous
      epubContainerRef.current.innerHTML = '';

      let epubDataToUse = book.epubData;

      // If no epubData in memory but we have a fileUrl, download it
      if (!epubDataToUse && book.fileUrl) {
        console.log('⬇️ Downloading EPUB from:', book.fileUrl);
        try {
          const { downloadBookFile } = await import('../lib/supabaseStorage');
          epubDataToUse = await downloadBookFile(book.fileUrl);
          console.log('✅ EPUB downloaded successfully, size:', epubDataToUse.byteLength, 'bytes');

          // Cache it locally to IndexedDB for offline reading later
          if (book.id) {
            const { saveBook } = await import('../utils/db');
            const updatedBook = { ...book, epubData: epubDataToUse };
            await saveBook(updatedBook);
            console.log('💾 EPUB cached to local IndexedDB for offline use');

            // Also update the in-memory book object so it doesn't re-download if modal is closed and reopened in the same session
            book.epubData = epubDataToUse;
          }
        } catch (error) {
          console.error('❌ Failed to download EPUB file:', error);
          alert('Failed to load book. Please try again.');
          return;
        }
      }

      if (!epubDataToUse) {
        console.error('❌ No EPUB data available');
        return;
      }

      console.log('📚 Creating EPUB book instance...');
      const epubBook = ePub(epubDataToUse);

      // Hybrid Scroll: 'scrolled' (per chapter) vs 'paginated'
      const flowMode = readingMode === 'scroll' ? 'scrolled' : 'paginated';
      const manager = 'default'; // Always use default to manage one spine item at a time

      const rendition = epubBook.renderTo(epubContainerRef.current, {
        width: '100%',
        height: '100%',
        flow: flowMode,
        manager: manager,
        allowScriptedContent: true, // Allow scripts to fix sandbox error
      });

      renditionRef.current = rendition;

      // Use initialLocation from props if provided (e.g. from highlight click), otherwise use book's last location
      const startLocation = initialLocation || book.lastLocation || undefined;
      rendition.display(startLocation).then(() => {
        // Apply styles
        const mappedFont = fontFamily === 'sans' ? 'sans-serif' : fontFamily === 'mono' ? 'monospace' : 'serif';
        rendition.themes.fontSize(`${fontSize}px`);
        rendition.themes.font(mappedFont);
        setIsReady(true);

        // Apply theme colors
        if (theme === 'dark') {
          rendition.themes.override('color', '#F3F0EB');
          rendition.themes.override('background', '#1a1614');
        } else if (theme === 'clean') {
          rendition.themes.override('color', '#000000');
          rendition.themes.override('background', '#FFFFFF');
        } else {
          rendition.themes.override('color', '#3D3028');
          rendition.themes.override('background', '#F8F5F1');
        }

        // Apply spacing overrides
        rendition.themes.override('line-height', `${lineHeight}`);
        rendition.themes.override('letter-spacing', `${letterSpacing}em`);
      });

      // Load TOC
      epubBook.loaded.navigation.then((nav) => {
        setToc(nav.toc);
      });

      // Dynamic Page Number Generation (Approximate "1 Screen = 1 Page")
      const generateLocations = () => {
        // Standard: 1000 chars per 'page' (industry standard for consistency)
        epubBook.ready.then(() => {
          epubBook.locations.generate(1000).then(() => {
            try {
              // @ts-ignore
              const currentCfi = renditionRef.current?.location?.start?.cfi;
              if (currentCfi) {
                const page = epubBook.locations.locationFromCfi(currentCfi);
                // @ts-ignore
                const total = epubBook.locations.total;
                setProgressLabel(`Page ${page} of ${total}`);
              }
            } catch (e) { /* ignore */ }
          });
        });
      };

      // Initial Generation
      generateLocations();

      // Update location logic
      rendition.on('relocated', (location: any) => {
        let label = "Loading...";
        const percent = location.start.percentage;
        const currentHref = location.start.href;

        // Determine active chapter
        // We look for a TOC item that matches the start of the current href
        if (epubBook.navigation) {
          const chapter = epubBook.navigation.toc.find((item: any) => currentHref.includes(item.href) || item.href.includes(currentHref));
          if (chapter) setActiveChapterHref(chapter.href);
        }

        // Verify if locations are generated
        if (epubBook.locations.length() > 0 && readingMode === 'paged') {
          const page = epubBook.locations.locationFromCfi(location.start.cfi);
          // @ts-ignore
          const total = epubBook.locations.total;
          label = `Page ${page} of ${total}`;
        } else {
          // Fallback / Scroll Mode
          // If in scroll mode, prioritize Chapter info
          if (readingMode === 'scroll' && epubBook.navigation) {
            const chapter = epubBook.navigation.toc.find((item: any) => currentHref.includes(item.href) || item.href.includes(currentHref));
            if (chapter) {
              label = truncate(chapter.label, 25);
              // Maybe add percentage within chapter if possible? Hard without locations.
              if (percent) label += ` (${Math.round(percent * 100)}%)`;
            } else {
              label = percent ? `${Math.round(percent * 100)}%` : 'Beginning';
            }
          } else {
            label = percent ? `${Math.round(percent * 100)}%` : 'Beginning';
          }
        }

        setProgressLabel(label);

        // Hide selection menu on turn
        setSelectionRange(null);

        if (book && isVisible) {
          onUpdateProgress(book.id, location.start.cfi, percent || 0);
        }
      });

      // Handle Selection
      rendition.on('selected', (cfiRange: string, contents: any) => {
        setSelectionRange(cfiRange);

        // Capture text
        try {
          const range = rendition.getRange(cfiRange);
          if (range) setSelectionText(range.toString());
        } catch (e) {
          console.error("Could not capture text", e);
          setSelectionText(""); // Fallback
        }

        // Capture selection position for menu placement
        try {
          const selection = contents.window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const selRange = selection.getRangeAt(0);
            const rect = selRange.getBoundingClientRect();

            // Get iframe position relative to viewport
            const iframe = contents.document.defaultView.frameElement;
            const iframeRect = iframe ? iframe.getBoundingClientRect() : { left: 0, top: 0 };

            // Calculate absolute position
            setSelectionRect({
              x: iframeRect.left + rect.left + (rect.width / 2),
              y: iframeRect.top + rect.bottom + 8 // 8px below selection
            });
          }
        } catch (e) {
          console.error("Could not capture selection position", e);
          setSelectionRect(null);
        }
      });

      // Handle Keyboard in Iframe (Directly call Actions)
      rendition.on('keydown', (e: any) => {
        if (e.key === 'Escape') {
          const s = stateRef.current;
          if (s.showSettings) setShowSettings(false);
          else if (s.showToc) setShowToc(false);
          else if (s.showSearch) setShowSearch(false);
          else if (onCloseRef.current) onCloseRef.current();
          e.preventDefault();
          return;
        }

        if (readingMode === 'paged') {
          if (e.key === 'ArrowRight' || e.key === ' ') {
            rendition.next();
            e.preventDefault();
          } else if (e.key === 'ArrowLeft') {
            rendition.prev();
            e.preventDefault();
          }
        }
      });

      // Clear selection on click
      // rendition.on('click', () => setSelectionRange(null)); 

      // Handle Gestures (Swipe)
      let touchStartX = 0;
      let touchStartY = 0;
      const minSwipeDistance = 50;

      rendition.on('touchstart', (e: any) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      });

      rendition.on('touchend', (e: any) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Horizontal Swipe Check
        if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < Math.abs(deltaX)) {
          if (readingMode === 'paged') {
            if (deltaX < 0) rendition.next(); // Left Swipe -> Next Page
            else rendition.prev(); // Right Swipe -> Prev Page
          }
        }
      });

      // Tap to Toggle Navbar & Dismiss Selection (EPUB)
      rendition.on('click', (e: any) => {
        const s = stateRef.current;

        // 1. Dismiss Selection Menu if Open
        if (s.selectionRange) {
          setSelectionRange(null);
          // Also clear browser selection to visual feedback
          e.view.document.getSelection()?.removeAllRanges();
          return;
        }

        // 2. Handle Tap Zones (if no selection)
        // 2. Handle Tap Zones (if no selection)
        const sel = e.view.document.getSelection();
        if (!sel || sel.isCollapsed) {
          const width = e.view.innerWidth;
          const x = e.clientX;

          // Only enable tap zones on mobile devices
          const isMobile = window.innerWidth < 768;

          if (isMobile) {
            if (x < width * 0.2) {
              rendition.prev();
            } else if (x > width * 0.8) {
              rendition.next();
            } else {
              setShowControls(prev => !prev);
            }
          } else {
            // On desktop, click anywhere toggles controls
            setShowControls(prev => !prev);
          }
        }
      });

      return () => {
        if (renditionRef.current) {
          renditionRef.current.destroy();
          renditionRef.current = null;
        }
      };
    };

    initEpub();
  }, [book?.id, book?.epubData, book?.fileUrl, readingMode, isVisible]);

  // Hook to re-apply highlights when they change or rendition is ready
  useEffect(() => {
    if (!renditionRef.current || !isReady) return;

    // Clear existing to avoid dupes? annotations.remove() needs ID?
    // renditionRef.current.annotations.remove(...) - difficult without tracking IDs in epubjs instance
    // For now, let's just add them. If they exist, epubjs might handle it or we might double up visually.
    // Ideally we track rendered IDs. 

    // Simplest approach: Just add new ones. Efficiency concern is low for < 100 highlights.

    highlights.forEach(h => {
      renditionRef.current?.annotations.add('highlight', h.cfiRange, {}, (e: any) => {
        // Click handler for existing highlight (e.g. to delete)
        console.log("Clicked highlight", h.id);
        const confirmDelete = window.confirm("Delete this highlight?");
        if (confirmDelete) removeHighlight(h.id);
      }, `highlight-${h.color}`);
    });

    // Inject styles
    renditionRef.current.themes.default({
      '.highlight-yellow': { 'fill': HIGHLIGHT_COLORS.yellow, 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' },
      '.highlight-green': { 'fill': HIGHLIGHT_COLORS.green, 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' },
      '.highlight-blue': { 'fill': HIGHLIGHT_COLORS.blue, 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' },
      '.highlight-pink': { 'fill': HIGHLIGHT_COLORS.pink, 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' },
    });

  }, [highlights, isReady]);

  // Actions
  const addHighlight = async (color: HighlightColor) => {
    if (!selectionRange || !book) return;

    let pageNum = undefined;
    let chapterLabel = undefined;
    let textContent = selectionText;

    try {
      // Ensure text is captured
      // @ts-ignore
      const range = await renditionRef.current?.getRange(selectionRange);
      if (range) textContent = range.toString();

      // @ts-ignore
      pageNum = renditionRef.current?.book?.locations?.locationFromCfi(selectionRange);
      // @ts-ignore
      const spineItem = await renditionRef.current?.book.spine.get(selectionRange);
      if (spineItem) {
        const found = toc.find(t => t.href.indexOf(spineItem.href) >= 0);
        if (found) chapterLabel = found.label;
      }
    } catch (e) { }

    const newHighlight: Highlight = {
      id: generateUUID(),
      bookId: book.id,
      cfiRange: selectionRange,
      color,
      text: textContent,
      page: pageNum,
      chapterLabel: chapterLabel,
      createdAt: Date.now(),
    };

    // Optimistic UI
    setHighlights(prev => [...prev, newHighlight]);
    setSelectionRange(null);

    // Clear selection in browser
    // @ts-ignore
    renditionRef.current?.getContents().forEach((c: any) => c.window.getSelection().removeAllRanges());

    if (isAuthenticated) {
      try {
        const { saveHighlightToSupabase } = await import('../lib/supabaseDb');
        await saveHighlightToSupabase(newHighlight);
      } catch (err) {
        console.error('Failed to save highlight to cloud', err);
        saveHighlight(newHighlight); // Fallback
      }
    } else {
      await saveHighlight(newHighlight);
    }

    // Visual Add
    renditionRef.current?.annotations.add('highlight', newHighlight.cfiRange, {}, (e: any) => {
      const confirmDelete = window.confirm("Delete this highlight?");
      if (confirmDelete) removeHighlight(newHighlight.id);
    }, `highlight-${color}`);
  };

  const removeHighlight = async (id: string) => {
    // Optimistic Update
    setHighlights(prev => prev.filter(h => h.id !== id));

    // Remove from UI
    const h = highlights.find(x => x.id === id);
    if (h) {
      renditionRef.current?.annotations.remove(h.cfiRange, 'highlight');
    }

    if (isAuthenticated) {
      try {
        const { deleteHighlightFromSupabase } = await import('../lib/supabaseDb');
        await deleteHighlightFromSupabase(id);
      } catch (err) {
        console.error('Failed to delete highlight from cloud', err);
        await deleteHighlight(id);
      }
    } else {
      await deleteHighlight(id);
    }
  };

  const addBookmark = async () => {
    if (!book || !renditionRef.current) return;

    // Get current location
    // @ts-ignore
    const currentCfi = renditionRef.current.location.start.cfi;

    if (!currentCfi) return;

    // Get Meta Info
    let label = `Bookmark at ${new Date().toLocaleTimeString()}`;
    let textPreview = "";
    let pageNum = undefined;

    try {
      // Text Preview
      // @ts-ignore
      const range = await renditionRef.current?.getRange(currentCfi);
      if (range) {
        textPreview = range.toString().substring(0, 60) + "...";
      }

      // Page Num
      // @ts-ignore
      pageNum = renditionRef.current?.book?.locations?.locationFromCfi(currentCfi);

      // Chapter Label
      // @ts-ignore
      const spineItem = renditionRef.current?.book?.spine?.get(currentCfi);
      if (spineItem) {
        const found = toc.find(t => t.href.indexOf(spineItem.href) >= 0);
        if (found) label = found.label;
      }
    } catch (e) { console.error(e); }

    const note = prompt("Enter a note for this bookmark (optional):") || undefined;

    const newBookmark: Bookmark = {
      id: generateUUID(),
      bookId: book.id,
      cfi: currentCfi,
      label,
      textPreview,
      page: pageNum,
      note,
      createdAt: Date.now()
    };

    setBookmarks(prev => [...prev, newBookmark]);

    if (isAuthenticated) {
      try {
        const { saveBookmarkToSupabase } = await import('../lib/supabaseDb');
        await saveBookmarkToSupabase(newBookmark);
      } catch (err) {
        console.error('Failed to save bookmark to cloud', err);
        await saveBookmark(newBookmark);
      }
    } else {
      await saveBookmark(newBookmark);
    }
  };

  const removeBookmark = async (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));

    if (isAuthenticated) {
      try {
        const { deleteBookmarkFromSupabase } = await import('../lib/supabaseDb');
        await deleteBookmarkFromSupabase(id);
      } catch (err) {
        console.error('Failed to delete bookmark from cloud', err);
        await deleteBookmark(id);
      }
    } else {
      await deleteBookmark(id);
    }
  };

  const handleSearch = async (q: string) => {
    if (!q || q.length < 3 || !renditionRef.current) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      // @ts-ignore
      const book = renditionRef.current.book;
      const results: any[] = [];
      // @ts-ignore
      const spine = book.spine;

      // Iterate via spine length
      // @ts-ignore
      for (let i = 0; i < spine.length; i++) {
        const item = spine.get(i);
        try {
          // Load the chapter/section
          await item.load(book.load.bind(book));

          // Try native find first (returns {cfi: string, excerpt: string}[])
          // @ts-ignore
          const found = await item.find(q);

          if (found && found.length > 0) {
            found.forEach((f: any) => {
              // Ensure excerpt is highlighted
              const excerpt = f.excerpt.replace(new RegExp(q, 'gi'), (m: string) => `**${m}**`);
              results.push({
                cfi: f.cfi,
                excerpt: excerpt
              });
            });
          }
          // Fallback if find returns nothing but we suspect text exists (or find not supported)
          else {
            const doc = item.document;
            const text = doc.body.innerText;
            const lowerText = text.toLowerCase();
            const lowerQ = q.toLowerCase();

            let index = lowerText.indexOf(lowerQ);
            while (index >= 0) {
              const start = Math.max(0, index - 40);
              const end = Math.min(text.length, index + q.length + 40);
              const excerpt = text.substring(start, end);

              results.push({
                cfi: item.href, // Navigate to chapter start as fallback
                excerpt: excerpt.replace(new RegExp(q, 'gi'), (m: string) => `**${m}**`)
              });

              if (results.filter(r => r.cfi === item.href).length > 3) break;
              index = lowerText.indexOf(lowerQ, index + 1);
            }
          }

        } catch (e) { console.error(e); }
        finally {
          // Unload unless it's the current one? 
          // Unloading might cause flicker if we are viewing it.
          // But purely for search, we should unload to save memory.
          // Ideally we check if it is current before unloading.
          try {
            // @ts-ignore
            if (renditionRef.current.location.start.href !== item.href) {
              await item.unload();
            }
          } catch (e) { item.unload(); }
        }
      }

      setSearchResults(results);

    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  // Swipe Handlers for Text Mode
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

    // Horizontal Swipe
    if (Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx)) {
      if (dx < 0) nextPage();
      else prevPage();
    }
    touchStartRef.current = null;
  };

  // Update EPUB Styles when settings change
  useEffect(() => {
    if (!renditionRef.current) return;

    // Use a small debounce to prevent iframe crashing when dragging sliders
    const timeout = setTimeout(() => {
      if (!renditionRef.current) return;

      const mappedFont = fontFamily === 'sans' ? 'sans-serif' : fontFamily === 'mono' ? 'monospace' : 'serif';

      try {
        // Apply font and size
        renditionRef.current.themes.fontSize(`${fontSize}px`);
        renditionRef.current.themes.font(mappedFont);

        // Apply theme colors via override (no register/select — prevents iframe desync)
        if (theme === 'dark') {
          renditionRef.current.themes.override('color', '#F3F0EB');
          renditionRef.current.themes.override('background', '#1a1614');
        } else if (theme === 'clean') {
          renditionRef.current.themes.override('color', '#000000');
          renditionRef.current.themes.override('background', '#FFFFFF');
        } else {
          renditionRef.current.themes.override('color', '#3D3028');
          renditionRef.current.themes.override('background', '#F8F5F1');
        }

        // Apply spacing overrides
        renditionRef.current.themes.override('line-height', `${lineHeight}`);
        renditionRef.current.themes.override('letter-spacing', `${letterSpacing}em`);
      } catch (err) {
        console.error('Error applying theme in EPUB.js', err);
      }
    }, 80);

    return () => clearTimeout(timeout);
  }, [fontSize, fontFamily, theme, lineHeight, letterSpacing]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Close on Escape
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        else if (showToc) setShowToc(false);
        else if (showSearch) setShowSearch(false);
        else onClose();
        return;
      }

      // 2. Navigation
      if (readingMode === 'paged') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          // e.preventDefault(); // Optional: prevent scrolling background
          nextPage();
        } else if (e.key === 'ArrowLeft') {
          prevPage();
        }
      } else {
        // Scroll mode usually handles arrows natively, but we can add shortcuts if needed.
        // For now, let default browser behavior handle Up/Down/Space for scroll.
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingMode, currentPage, totalPages, showSettings, showToc, showSearch,
    // Important: Add dependencies that nextPage/prevPage rely on if they are not stable.
    // nextPage/prevPage depend on book.fileType and currentPage. 
    // Ideally wrapping them in useCallback would be better, but adding deps here works.
    book, onClose
  ]);

  const nextPage = () => {
    if (book.fileType === 'epub') {
      renditionRef.current?.next();
    } else {
      if (currentPage < totalPages - 1) {
        setCurrentPage(p => p + 1);
      }
    }
  };

  const prevPage = () => {
    if (book.fileType === 'epub') {
      renditionRef.current?.prev();
    } else {
      if (currentPage > 0) {
        setCurrentPage(p => p - 1);
      }
    }
  };

  // Auto-hide controls
  useEffect(() => {
    if (!isVisible) return;
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 3000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('click', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('click', resetTimer);
      clearTimeout(timeout);
    };
  }, [isVisible]);

  if (!book) return null;

  // Theme Config
  const themeStyles = {
    paper: { bg: 'bg-[#F9F7F5]', text: 'text-[#3D3028]', accent: 'text-[#5d4037]', bar: 'bg-[#3D3028]', border: 'border-[#3D3028]/10' },
    clean: { bg: 'bg-[#FFFFFF]', text: 'text-[#1a1a1a]', accent: 'text-[#4a4a4a]', bar: 'bg-[#000]', border: 'border-black/5' },
    dark: { bg: 'bg-[#111111]', text: 'text-[#e5e5e5]', accent: 'text-[#a3a3a3]', bar: 'bg-[#e5e5e5]', border: 'border-white/10' },
  };

  const activeTheme = themeStyles[theme];

  // High Contrast Toggle Theme
  // This ensures text is always visible against the toggle background
  // Modern Soft Segmented Control Theme
  const toggleTheme = {
    paper: {
      container: 'bg-[#3D3028]/5',
      active: 'bg-white text-[#3D3028] shadow-sm ring-1 ring-[#3D3028]/5 font-medium',
      inactive: 'text-[#3D3028]/60 hover:text-[#3D3028] hover:bg-[#3D3028]/5'
    },
    clean: {
      container: 'bg-black/5',
      active: 'bg-white text-black shadow-sm ring-1 ring-black/5 font-medium',
      inactive: 'text-black/60 hover:text-black hover:bg-black/5'
    },
    dark: {
      container: 'bg-white/10',
      active: 'bg-[#404040] text-white shadow-sm ring-1 ring-white/10 font-medium',
      inactive: 'text-white/60 hover:text-white hover:bg-white/5'
    }
  };

  const tStyle = toggleTheme[theme];

  // Helper for Top-Right Settings Button Contrast
  const getSettingsBtnStyle = (isOpen: boolean) => {
    if (isOpen) {
      // Soft Active State
      if (theme === 'paper') return 'bg-[#3D3028]/10 text-[#3D3028]';
      if (theme === 'clean') return 'bg-black/5 text-black';
      if (theme === 'dark') return 'bg-white/10 text-white';
    }

    // Explicit Inactive & Hover States to prevent inheritance issues
    if (theme === 'paper') return 'text-[#3D3028]/70 hover:text-[#3D3028] hover:bg-[#3D3028]/5';
    if (theme === 'clean') return 'text-black/70 hover:text-black hover:bg-black/5';
    if (theme === 'dark') return 'text-white/70 hover:text-white hover:bg-white/10';

    return 'opacity-70 hover:opacity-100';
  };

  // Helper for Sidebar Tabs styling
  const getTabStyle = (active: boolean) => {
    if (active) {
      if (theme === 'dark') return 'bg-white text-black shadow-sm';
      return 'bg-[#3D3028] text-[#F8F5F1] shadow-sm'; // Earthy Active State
    }
    // Inactive
    return 'opacity-50 hover:opacity-100 hover:bg-[#3D3028]/5';
  };

  // Font Config
  const fontStyles = {
    serif: 'font-serif', // EB Garamond
    sans: 'font-sans',   // Instrument Sans
    mono: 'font-mono'    // System Mono
  };

  // Paged Layout Dynamic Styles
  const getPagedStyles = (): React.CSSProperties => {
    if (readingMode !== 'paged') return {};

    const gap = pageLayout === 'double' ? 80 : 60;
    const cols = pageLayout === 'double' ? 2 : 1;

    return {
      height: 'calc(100vh - 200px)', // Fixed content viewport
      columnCount: cols,
      columnGap: `${gap}px`,
      columnFill: 'auto',
      width: '100%',

      // The Transform
      // We shift by (100% of the container + the gap)
      transform: `translateX(calc(-${currentPage} * (100% + ${gap}px)))`,
      transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',

      // Column Rule for Book Feel in Double Mode
      columnRule: pageLayout === 'double' ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}` : 'none',
    };
  };

  // Hover Styles for Menu Items
  const menuItemClass = theme === 'dark'
    ? 'text-white/70 hover:bg-white/10 hover:text-white transition-colors'
    : 'text-[#3D3028]/80 hover:bg-[#3D3028] hover:text-[#F8F5F1] transition-colors'; // Brown Bg + Cream Text on Hover

  const bookmarkItemClass = theme === 'dark'
    ? 'bg-white/5 hover:bg-white/10 text-white/90'
    : 'bg-[#3D3028]/5 hover:bg-[#3D3028] hover:text-[#F8F5F1] text-[#3D3028]';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className={`fixed inset-0 z-50 flex flex-col transition-colors duration-700 ${activeTheme.bg} ${activeTheme.text}`}
        >
          {/* Progress Bar (Scroll Mode) */}
          {readingMode === 'scroll' && (
            <motion.div
              className={`fixed top-0 left-0 right-0 h-1 z-[60] origin-left ${activeTheme.bar}`}
              style={{ scaleX }}
            />
          )}

          {/* Progress Bar (Paged Mode) */}
          {readingMode === 'paged' && (
            <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-current opacity-5">
              <motion.div
                className={`h-full ${activeTheme.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {/* Top Controls */}
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: showControls ? 0 : -80, opacity: showControls ? 1 : 0 }}
            className={`fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-4 flex items-center justify-between transition-all duration-300 ${theme === 'dark' ? 'bg-[#111111]/90' : 'bg-white/95'
              } backdrop-blur-md border-b ${activeTheme.border}`}
          >
            {/* Left: Back */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${getSettingsBtnStyle(false)}`}
              >
                <ArrowLeft size={22} strokeWidth={1.5} />
              </button>

              {/* Sidebar Toggle (EPUB Only) */}
              {book.fileType === 'epub' && ( // Allow sidebar for any epub, even without TOC, for bookmarks
                <button
                  onClick={() => setShowToc(true)}
                  className={`p-2 rounded-full transition-colors ${getSettingsBtnStyle(false)}`}
                >
                  <List size={20} strokeWidth={1.5} />
                </button>
              )}

              {/* Add Bookmark Button */}
              {book.fileType === 'epub' && (
                <button
                  onClick={addBookmark}
                  className={`p-2 rounded-full transition-colors ${getSettingsBtnStyle(false)}`}
                >
                  <BookmarkIcon size={20} strokeWidth={1.5} />
                </button>
              )}
            </div>

            {/* Center: Title */}
            <span className="font-serif italic text-sm opacity-60 truncate max-w-[200px] md:max-w-md hidden md:block">
              {book.title}
            </span>

            {/* Right: Settings Toggle */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${getSettingsBtnStyle(showSettings)}`}
              >
                <span className="text-xs font-bold tracking-widest uppercase">Aa</span>
                <Settings2 size={18} strokeWidth={1.5} />
              </button>

              {/* Settings Dropdown Panel */}
              <ReaderSettings
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                theme={theme}
                setTheme={setTheme}
                fontFamily={fontFamily}
                setFontFamily={setFontFamily}
                fontSize={fontSize}
                setFontSize={setFontSize}
                lineHeight={lineHeight}
                setLineHeight={setLineHeight}
                letterSpacing={letterSpacing}
                setLetterSpacing={setLetterSpacing}
                readingMode={readingMode}
                setReadingMode={setReadingMode}
                pageLayout={pageLayout}
                setPageLayout={setPageLayout}
                getTabStyle={getTabStyle}
              />
            </div>
          </motion.div>

          {/* Sidebar (TOC / Bookmarks / Highlights) */}
          {/* Sidebar */}
          <ReaderSidebar
            isOpen={showToc}
            onClose={() => setShowToc(false)}
            theme={theme}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearching={isSearching}
            searchResults={searchResults}
            handleSearch={handleSearch}
            toc={toc}
            bookmarks={bookmarks}
            highlights={highlights}
            activeChapterHref={activeChapterHref}
            onNavigate={(cfi) => renditionRef.current?.display(cfi)}
            onSearchResultClick={(cfi) => {
              // @ts-ignore
              const currentCfi = renditionRef.current?.location?.start?.cfi;
              if (currentCfi) setReturnLocation(currentCfi);
              renditionRef.current?.display(cfi);
            }}
            onRemoveBookmark={removeBookmark}
            onRemoveHighlight={removeHighlight}
            getTabStyle={getTabStyle}
            menuItemClass={menuItemClass}
            bookmarkItemClass={bookmarkItemClass}
          />

          {/* Floating Highlight Menu */}
          <AnimatePresence>
            {selectionRange && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={{ type: "spring", bounce: 0.3 }}
                className={`fixed z-[70] px-3 py-1.5 rounded-full shadow-lg flex items-center justify-center gap-1.5 backdrop-blur-md max-w-[90vw] border ${theme === 'dark' ? 'bg-[#1a1a1a]/95 border-white/10 text-white' : 'bg-white/95 border-black/5 text-gray-800'}`}
                style={{
                  left: selectionRect ? `${selectionRect.x}px` : '50%',
                  top: selectionRect ? `${selectionRect.y}px` : 'auto',
                  bottom: selectionRect ? 'auto' : '5rem',
                  transform: 'translateX(-50%)'
                }}
              >
                {/* Compact Colors */}
                <div className="flex items-center gap-1.5 justify-center">
                  {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map(color => (
                    <button
                      key={color}
                      onClick={() => addHighlight(color)}
                      className="w-7 h-7 rounded-full transition-transform transform active:scale-90 shadow-sm"
                      style={{ backgroundColor: HIGHLIGHT_COLORS[color] }}
                      title={`Highlight ${color}`}
                    />
                  ))}
                </div>
              </motion.div>
            )}



          </AnimatePresence>

          {/* Return to Reading Button (Search Navigation) */}
          <AnimatePresence>
            {returnLocation && !showToc && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] bg-black/80 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-4 backdrop-blur-md"
              >
                <button
                  onClick={() => {
                    renditionRef.current?.display(returnLocation);
                    setReturnLocation(null);
                  }}
                  className="text-xs font-bold uppercase tracking-widest hover:text-blue-300 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft size={14} /> Return to Reading
                </button>
                <div className="w-px h-4 bg-white/20" />
                <button
                  onClick={() => setReturnLocation(null)}
                  className="opacity-60 hover:opacity-100 hover:text-red-300 transition-colors text-xs font-medium"
                >
                  Stay here
                </button>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Parallax Background Texture (Only visible in Paper Mode & Scroll) */}
          {
            theme === 'paper' && (
              <motion.div

                style={{ y: readingMode === 'scroll' ? backgroundY : 0 }}
                className="fixed inset-[-100px] pointer-events-none opacity-[0.04] z-[40] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"
              />
            )
          }

          {/* === READER CONTENT AREA === */}

          {/* SCROLL MODE */}
          {
            readingMode === 'scroll' && book.fileType === 'text' && (
              <div className="reader-scroll overflow-y-auto w-full h-full pt-32 pb-32">
                <div className="relative z-0 flex-1 w-full max-w-4xl mx-auto px-4 md:px-8">
                  <header className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-6xl font-medium leading-[1.1] tracking-tight">{book.title}</h1>
                    <p className={`text-sm md:text-base uppercase tracking-widest font-medium opacity-60 ${activeTheme.accent}`}>{book.author}</p>
                  </header>

                  <div className="w-12 h-1 bg-current opacity-10 mx-auto mb-16 rounded-full" />

                  <div
                    style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight, letterSpacing: `${letterSpacing}em` }}
                    className={`antialiased leading-relaxed ${fontStyles[fontFamily]}`}
                  >
                    {book.content.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-6 indent-8 opacity-90 text-justify">
                        {paragraph || <br />}
                      </p>
                    ))}
                  </div>

                  <div className="mt-24 mb-12 flex justify-center">
                    <span className="w-2 h-2 rounded-full bg-current opacity-20" />
                  </div>
                  <div className="text-center opacity-40 text-xs uppercase tracking-widest">End of Preview</div>
                </div>
              </div>
            )
          }

          {/* EPUB CONTAINER */}
          {
            book.fileType === 'epub' && (
              <div className={`w-full h-full pt-20 pb-10 flex flex-col relative transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'} ${readingMode === 'scroll' ? 'overflow-auto' : 'overflow-hidden'}`}>
                {/* Nav Buttons Overlay for EPUB */}
                {/* Show toggle buttons even in scroll mode to switch chapters */}
                {(readingMode === 'paged' || readingMode === 'scroll') && (
                  <>
                    <button
                      onClick={prevPage}
                      className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full text-current opacity-40 hover:opacity-100 hover:bg-current hover:bg-opacity-5 transition-all"
                    >
                      <ChevronLeft size={32} />
                    </button>
                    <button
                      onClick={nextPage}
                      className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full text-current opacity-40 hover:opacity-100 hover:bg-current hover:bg-opacity-5 transition-all"
                    >
                      <ChevronRight size={32} />
                    </button>
                  </>
                )}

                <div
                  ref={epubContainerRef}
                  className={`flex-1 w-full max-w-6xl mx-auto px-2 md:px-6 ${readingMode === 'paged' ? 'my-auto' : ''}`}
                  style={{
                    // EPUBJS injects iframes, we want them to respect the container
                  }}
                />

                {/* EPUB Progress Bar/Footer */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center pointer-events-none">
                  <div className={`px-4 py-2 rounded-full text-xs font-mono font-medium backdrop-blur-md shadow-sm pointer-events-auto ${theme === 'dark' ? 'bg-white/10 text-white/80' : 'bg-black/5 text-black/60'
                    }`}>
                    {progressLabel || "Loading..."}
                  </div>
                </div>
              </div>
            )
          }

          {/* PAGED MODE (Text) */}
          {
            readingMode === 'paged' && book.fileType === 'text' && (
              <div
                className={`w-full h-full flex flex-col justify-center items-center overflow-hidden relative transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={(e) => {
                  const width = window.innerWidth;
                  const x = e.clientX;

                  if (x < width * 0.2) {
                    prevPage();
                  } else if (x > width * 0.8) {
                    nextPage();
                  } else {
                    setShowControls(prev => !prev);
                  }
                }}
              >

                {/* Previous Button (Desktop) */}
                <button
                  onClick={(e) => { e.stopPropagation(); prevPage(); }}
                  disabled={currentPage === 0}
                  className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full hover:bg-current hover:bg-opacity-5 disabled:opacity-0 transition-all text-current opacity-40 hover:opacity-100"
                >
                  <ChevronLeft size={32} />
                </button>

                {/* Next Button (Desktop) */}
                <button
                  onClick={(e) => { e.stopPropagation(); nextPage(); }}
                  disabled={currentPage >= totalPages - 1}
                  className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full hover:bg-current hover:bg-opacity-5 disabled:opacity-0 transition-all text-current opacity-40 hover:opacity-100"
                >
                  <ChevronRight size={32} />
                </button>

                {/* Content Window */}
                <div
                  ref={containerRef}
                  className={`relative overflow-hidden h-[calc(100vh-200px)] mt-16 transition-all duration-300 ease-in-out
                  ${pageLayout === 'double'
                      ? 'w-full max-w-7xl px-4 md:px-8'
                      : 'w-full max-w-4xl px-4 md:px-8'
                    }
                `}
                >
                  {/* The Sliding Content Track */}
                  <div
                    ref={contentRef}
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: lineHeight,
                      letterSpacing: `${letterSpacing}em`,
                      ...getPagedStyles()
                    }}
                    className={`antialiased leading-relaxed h-full ${fontStyles[fontFamily]}`}
                  >
                    <div className="mb-8 font-serif italic opacity-60 text-2xl text-center block w-full">{book.title}</div>
                    {book.content.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4 indent-8 opacity-90 text-justify break-inside-avoid">
                        {paragraph || <br />}
                      </p>
                    ))}
                    <div className="mt-12 text-center opacity-40 text-xs uppercase tracking-widest w-full block">End of Preview</div>
                  </div>
                </div>

                {/* Page Indicator (Bottom) */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4 text-xs font-mono opacity-50">
                  {/* Mobile Nav Controls */}
                  <button onClick={(e) => { e.stopPropagation(); prevPage(); }} disabled={currentPage === 0} className="md:hidden p-3 bg-current bg-opacity-5 rounded-full"><ChevronLeft size={20} /></button>
                  <span>{currentPage + 1} / {totalPages}</span>
                  <button onClick={(e) => { e.stopPropagation(); nextPage(); }} disabled={currentPage >= totalPages - 1} className="md:hidden p-3 bg-current bg-opacity-5 rounded-full"><ChevronRight size={20} /></button>
                </div>

              </div>
            )
          }

        </motion.div >
      )}
    </AnimatePresence >
  );
};