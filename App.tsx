
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LibraryScene } from './components/LibraryScene';
import { ReaderInterface } from './components/ReaderInterface';
import { UIOverlay } from './components/UIOverlay';
import { NavBar } from './components/NavBar';

import { StatisticsPanel } from './components/StatisticsPanel';
import { CollectionsManager } from './components/CollectionsManager';
import { BookDetailModal } from './components/BookDetailModal';
import { GoalSettingsModal } from './components/GoalSettingsModal';
import { AuthPage } from './components/AuthPage';
import { ProfilePage } from './components/ProfilePage';
import { ExplorePage } from './components/ExplorePage';
import { AdminDashboard } from './components/AdminDashboard';
import { PublicBookDetailModal } from './components/PublicBookDetailModal';
import { LoadingScreen } from './components/LoadingScreen';
import { Toast, useToast } from './components/Toast';
import { Book, AppState, Page, ReadingGoal } from './types';
import { PublicBook, fetchPublicBookBySlug } from './lib/publicBooksApi';
import { INITIAL_BOOKS } from './constants';
import { saveBook, getAllBooks, deleteBook } from './utils/db';
import { useAuthStore } from './stores/useAuthStore';

// URL Helper
const slugify = (text: string) => {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

const INITIAL_GOAL: ReadingGoal = {
  dailyTargetMinutes: 30, // Default target
  dailyProgressSeconds: 0,
  lastReadDate: new Date().toDateString(),
  currentStreak: 0,
  longestStreak: 0,
  totalMinutesRead: 0
};

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedPublicBook, setSelectedPublicBook] = useState<PublicBook | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated, user, signIn, signOut, checkSession, loading } = useAuthStore();
  const { toast, showToast, hideToast } = useToast();

  // PWA install prompt — must listen globally before NavBar mounts
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Splash screen state
  const [showSplash, setShowSplash] = useState(true);
  const wasAuthenticated = React.useRef(false);

  // Show splash on initial page load (minimum 2.5s)
  useEffect(() => {
    checkSession();

    // Listen for PWA install prompt globally
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Show splash again after login/register transition
  useEffect(() => {
    if (!loading && isAuthenticated && !wasAuthenticated.current) {
      // User just logged in — show splash
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, loading]);

  const handleLogin = (email: string, password?: string) => {
    signIn(email, password);
  };

  const handleLogout = () => {
    signOut();
  };

  // Reading Goal State — lazy init from localStorage to avoid race condition
  const [readingGoal, setReadingGoal] = useState<ReadingGoal>(() => {
    const storedGoal = localStorage.getItem('reharth_reading_goal');
    if (storedGoal) {
      try {
        const parsed: ReadingGoal = JSON.parse(storedGoal);
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let newStreak = parsed.currentStreak;

        // Reset streak if last read was before yesterday (missed a day)
        if (parsed.lastReadDate !== today && parsed.lastReadDate !== yesterday.toDateString()) {
          newStreak = 0;
        }

        // Reset daily progress if new day
        if (parsed.lastReadDate !== today) {
          return {
            ...parsed,
            dailyProgressSeconds: 0,
            lastReadDate: today,
            currentStreak: newStreak
          };
        }
        return parsed;
      } catch (e) {
        console.error("Failed to parse reading goal", e);
      }
    }
    return INITIAL_GOAL;
  });

  // Navigation State mapped to React Router
  const getCurrentPage = (): Page => {
    const path = location.pathname;
    if (path.startsWith('/library')) return 'library';
    if (path.startsWith('/collections')) return 'collections';
    if (path.startsWith('/stats')) return 'stats';
    if (path.startsWith('/explore')) return 'explore';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/login')) return 'login';
    if (path.startsWith('/register')) return 'register';
    if (path.startsWith('/reading')) return 'reading';
    return 'home';
  };

  const currentPage = getCurrentPage();
  const setCurrentPage = (page: Page, param?: string) => {
    if (page === 'home') navigate('/');
    else if (param) navigate(`/${page}/${param}`);
    else navigate(`/${page}`);
  };

  const [mode, setMode] = useState<'library' | 'reading'>('library');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const prevPageRef = React.useRef<Page>('home'); // Track where user came from

  // Sync mode and book with URL for direct links / refresh
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/reading/')) {
      const parts = path.split('/');
      // Ensure we have the param and books are somewhat loaded
      if (parts.length >= 3 && parts[2] && books.length > 0) {
        const param = parts[2];
        // Try finding by slugified title first, or fallback to ID
        const foundBook = books.find(b => slugify(b.title) === param || b.id === param);

        if (foundBook) {
          if (selectedBookId !== foundBook.id) {
            setSelectedBookId(foundBook.id);
          }
          if (mode !== 'reading') {
            setMode('reading');
          }
        } else {
          // If books are loaded but book not found, redirect to library
          if (mode !== 'library') setMode('library');
          if (path !== '/library') navigate('/library', { replace: true });
        }
      }
    } else if (mode === 'reading') {
      setMode('library'); // User navigated away (e.g. back button)
    }
  }, [location.pathname, books.length]);

  // Deep-link support for /explore/:slug
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/explore/') && path.split('/').length >= 3) {
      const slug = path.split('/')[2];
      if (slug && !selectedPublicBook) {
        fetchPublicBookBySlug(slug).then(({ data }) => {
          if (data) setSelectedPublicBook(data);
        });
      }
    }
  }, [location.pathname]);

  // Deep-link support for /library/:slug (opens book detail modal)
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/library/') && path.split('/').length >= 3 && books.length > 0) {
      const slug = path.split('/')[2];
      if (slug && !isDetailOpen) {
        const foundBook = books.find(b => slugify(b.title) === slug);
        if (foundBook) {
          setSelectedBookId(foundBook.id);
          setIsDetailOpen(true);
        }
      }
    }
  }, [location.pathname, books.length]); // Depend on books.length so it resolves after DB loads

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  // Filter books based on search query only (collection filtering is now handled inside CollectionsManager)
  const filteredBooks = React.useMemo(() => {
    let result = books;

    // Filter by search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(book =>
        book.title.toLowerCase().includes(lowerQuery) ||
        book.author.toLowerCase().includes(lowerQuery)
      );
    }

    return result;
  }, [books, searchQuery]);

  // Load books from DB on mount
  useEffect(() => {
    const loadBooks = async () => {
      if (!isAuthenticated) return;

      try {
        // Load from Supabase if authenticated
        const { getAllBooksFromSupabase } = await import('./lib/supabaseDb');
        const supabaseBooks = await getAllBooksFromSupabase();
        
        try {
          const { getAllBooks } = await import('./utils/db');
          const localBooks = await getAllBooks();
          const mergedBooks = supabaseBooks.map(sb => {
            const local = localBooks.find(lb => lb.id === sb.id);
            if (local && local.collectionIds) {
              return { ...sb, collectionIds: local.collectionIds };
            }
            return sb;
          });
          setBooks(mergedBooks);
        } catch (e) {
          setBooks(supabaseBooks);
        }
      } catch (error) {
        console.error("Failed to load books from Supabase", error);
        // Fallback to local DB if Supabase fails
        try {
          const { getAllBooks } = await import('./utils/db');
          const dbBooks = await getAllBooks();
          setBooks([...INITIAL_BOOKS, ...dbBooks]);
        } catch (localError) {
          console.error("Failed to load books from local DB", error);
        }
      }
    };
    loadBooks();
  }, [isAuthenticated]);

  // Load Reading Goal from Supabase when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadGoalFromCloud = async () => {
      try {
        const { getReadingGoalFromSupabase } = await import('./lib/supabaseDb');
        const cloudGoal = await getReadingGoalFromSupabase();
        if (cloudGoal) {
          const today = new Date().toDateString();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          let newStreak = cloudGoal.currentStreak;
          if (cloudGoal.lastReadDate !== today && cloudGoal.lastReadDate !== yesterday.toDateString()) {
            newStreak = 0;
          }

          if (cloudGoal.lastReadDate !== today) {
            setReadingGoal({
              ...cloudGoal,
              dailyProgressSeconds: 0,
              lastReadDate: today,
              currentStreak: newStreak
            });
          } else {
            setReadingGoal(cloudGoal);
          }
        }
      } catch (err) {
        console.error('Failed to load reading goal from cloud, using local', err);
      }
    };
    loadGoalFromCloud();
  }, [isAuthenticated]);

  // Persist Goal changes (localStorage + Supabase)
  useEffect(() => {
    localStorage.setItem('reharth_reading_goal', JSON.stringify(readingGoal));

    // Also save to Supabase if authenticated (debounced)
    if (isAuthenticated) {
      const timeout = setTimeout(async () => {
        try {
          const { saveReadingGoalToSupabase } = await import('./lib/supabaseDb');
          await saveReadingGoalToSupabase(readingGoal);
        } catch (err) {
          console.error('Failed to save reading goal to cloud', err);
        }
      }, 2000); // 2s debounce to avoid spamming during active reading
      return () => clearTimeout(timeout);
    }
  }, [readingGoal, isAuthenticated]);


  // Helper to update goal progress
  const updateGoalProgress = (secondsRead: number) => {
    setReadingGoal(prev => {
      const today = new Date().toDateString();
      const targetSeconds = prev.dailyTargetMinutes * 60;
      const alreadyMetToday = prev.dailyProgressSeconds >= targetSeconds;

      const newDailyProgress = prev.dailyProgressSeconds + secondsRead;
      let newStreak = prev.currentStreak;
      let newLongest = prev.longestStreak;

      // Check if goal MET just now
      if (newDailyProgress >= targetSeconds && !alreadyMetToday) {
        newStreak += 1;
        if (newStreak > newLongest) newLongest = newStreak;
        // Trigger confetti or toast here?
      }

      return {
        ...prev,
        dailyProgressSeconds: newDailyProgress,
        currentStreak: newStreak,
        longestStreak: newLongest,
        totalMinutesRead: prev.totalMinutesRead + (secondsRead / 60),
        lastReadDate: today // Ensure date is today
      };
    });
  };

  // Find currently selected book object
  const currentBook = books.find(b => b.id === selectedBookId) || null;

  // Reader State
  const [targetLocation, setTargetLocation] = useState<string | undefined>(undefined);

  // Handle Book Click (Opens Modal)
  const handleSelectBook = (id: string | null) => {
    if (mode === 'reading') return;

    if (id) {
      setSelectedBookId(id);
      setIsDetailOpen(true);
      // Push URL for deep-linking
      const book = books.find(b => b.id === id);
      if (book) {
        navigate(`/library/${slugify(book.title)}`, { replace: false });
      }
    } else {
      setIsDetailOpen(false);
      // Revert URL
      if (location.pathname.startsWith('/library/')) {
        navigate('/library', { replace: true });
      }
      setTimeout(() => setSelectedBookId(null), 300);
    }
  };

  // Handle "Start Reading" from Modal
  const handleStartReading = () => {
    prevPageRef.current = currentPage; // Remember where we came from
    setIsDetailOpen(false);
    setTargetLocation(undefined);
    setTimeout(() => {
      setMode('reading');
      if (currentBook) {
        setCurrentPage('reading', slugify(currentBook.title));
      }
    }, 200);
  };

  // Handle Close Reader — go back to where user came from, not always library
  const handleCloseReader = () => {
    setMode('library');
    setSelectedBookId(null);
    setTargetLocation(undefined);
    setCurrentPage(prevPageRef.current || 'home');
  };

  // Handle Continue Reading (Direct from Stats)
  const handleContinueReading = (bookId: string, location?: string) => {
    setSelectedBookId(bookId);
    setTargetLocation(location); // Set specific target if provided (e.g. from highlight)
    setMode('reading');

    // Find book to get title for URL
    const book = books.find(b => b.id === bookId);
    if (book) {
      setCurrentPage('reading', slugify(book.title));
    }
  };

  // Handle Book Delete
  const handleDeleteBook = async (id: string) => {
    setIsDetailOpen(false);
    setSelectedBookId(null);

    try {
      if (isAuthenticated) {
        const { deleteBookFromSupabase } = await import('./lib/supabaseDb');
        await deleteBookFromSupabase(id);
      } else {
        const { deleteBook } = await import('./utils/db');
        await deleteBook(id);
      }
      // Update state only if deletion was successful
      setBooks(prev => prev.filter(b => b.id !== id));
      showToast('Book deleted successfully', 'success');
    } catch (error: any) {
      console.error("Failed to delete book:", error);
      showToast(`Failed to delete book: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  // Handle Update Book
  const handleUpdateBook = async (updatedBook: Book) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    setEditingBook(null); // Close edit mode

    try {
      const { saveBook } = await import('./utils/db');
      await saveBook(updatedBook); // Save locally for collectionIds

      const { saveBookToSupabase } = await import('./lib/supabaseDb');
      await saveBookToSupabase(updatedBook);
    } catch (error) {
      console.error("Failed to update book", error);
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setIsDetailOpen(false);
  };

  const handleAddBook = async (newBook: Book) => {
    setBooks(prev => [...prev, newBook]);
    try {
      const { saveBookToSupabase } = await import('./lib/supabaseDb');
      await saveBookToSupabase(newBook);
      // Success toast is already shown in UIOverlay
    } catch (error) {
      console.error("❌ Failed to save book to Supabase:", error);
      showToast(`Failed to sync "${newBook.title}" to cloud`, 'error');
    }
  };

  const handleUpdateProgress = async (bookId: string, location: string, percentage: number, timeRead?: number) => {
    // 0. Update Reading Goal (Calculate Delta)
    const oldBook = books.find(b => b.id === bookId);
    if (oldBook && timeRead !== undefined && oldBook.timeRead !== undefined) {
      const delta = timeRead - oldBook.timeRead;
      if (delta > 0) {
        updateGoalProgress(delta);
      }
    } else if (timeRead !== undefined && (!oldBook || oldBook.timeRead === undefined)) {
      // First time reading or undefined init
      updateGoalProgress(timeRead); // Assuming timeRead is total session or absolute? 
      // Logic in ReaderInterface usually sends TOTAL accumulated time.
      // If oldBook.timeRead is undefined, delta is effectively timeRead (starts at 0).
    }

    // 1. Update State (Optimistic)
    setBooks(prevBooks => prevBooks.map(b => {
      if (b.id === bookId) {
        return {
          ...b,
          lastLocation: location,
          progressPercent: percentage,
          timeRead: timeRead !== undefined ? timeRead : b.timeRead,
          lastReadDate: Date.now()
        };
      }
      return b;
    }));

    // 2. Persist to DB
    const bookToUpdate = books.find(b => b.id === bookId);
    if (bookToUpdate) {
      const updatedBook: Book = {
        ...bookToUpdate,
        lastLocation: location,
        progressPercent: percentage,
        timeRead: timeRead !== undefined ? timeRead : bookToUpdate.timeRead,
        lastReadDate: Date.now()
      };
      try {
        const { saveBookToSupabase } = await import('./lib/supabaseDb');
        await saveBookToSupabase(updatedBook);
      } catch (e) {
        console.error("Failed to save progress", e);
      }
    }
  };

  const handleUpdateGoalTarget = (minutes: number) => {
    setReadingGoal(prev => ({ ...prev, dailyTargetMinutes: minutes }));
  };

  if (loading || showSplash) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthPage onLogin={() => handleLogin('user@example.com')} />;
  }

  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* 2D Library View - Fade out when reading */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 transform ${mode === 'reading' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
          }`}
      >
        <LibraryScene
          books={filteredBooks}
          selectedBookId={selectedBookId}
          onSelectBook={handleSelectBook}
          appState={mode}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
        />
      </div>

      {/* Navigation Bar - Only visible when not reading */}
      {mode === 'library' && (
        <NavBar
          currentPage={currentPage}
          onNavigate={(page) => {
            setCurrentPage(page);
            setIsDetailOpen(false);
            setEditingBook(null);
            // Clear collection filter when leaving collections page
            if (page !== 'collections') setSelectedCollectionId(null);
          }}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onOpenProfile={() => setCurrentPage('profile')}
          installPrompt={installPrompt}
          onClearInstallPrompt={() => setInstallPrompt(null)}
        />
      )}

      {/* Pages Layer */}

      {/* 1. Home Page (Statistics) */}
      {currentPage === 'home' && mode === 'library' && (
        <StatisticsPanel
          books={books}
          readingGoal={readingGoal}
          onEditGoal={() => setIsGoalModalOpen(true)}
          onOpenBook={handleContinueReading}
        />
      )}

      {/* 2. Library Page UI (Add Button) */}
      <UIOverlay
        isVisible={mode === 'library' && currentPage === 'library' && !isDetailOpen}
        onAddBook={handleAddBook}
        editingBook={editingBook}
        onUpdateBook={handleUpdateBook}
        onClose={() => setEditingBook(null)}
        books={books}
        onOpenProfile={() => setCurrentPage('profile')}
      />

      {/* 3. Collections Page */}
      {currentPage === 'collections' && mode === 'library' && (
        <CollectionsManager
          isOpen={true}
          onClose={() => { }}
          books={books}
          onUpdateBook={handleUpdateBook}
          onSelectCollection={(id) => {
            setSelectedCollectionId(id);
          }}
          selectedCollectionId={selectedCollectionId}
          onClearCollection={() => setSelectedCollectionId(null)}
          onSelectBook={handleSelectBook}
        />
      )}

      {/* 4. Explore Page */}
      {currentPage === 'explore' && mode === 'library' && (
        <div className="absolute inset-0 z-30 overflow-y-auto bg-[#F9F7F2]">
          <ExplorePage 
            onOpenBook={(book) => {
              setSelectedPublicBook(book);
              // Push URL for deep-linking
              navigate(`/explore/${slugify(book.title)}`, { replace: false });
            }}
            onBooksAdded={(newBooks) => {
              setBooks(prev => {
                const updated = [...prev];
                newBooks.forEach(nb => {
                  const idx = updated.findIndex(b => b.id === nb.id);
                  if (idx >= 0) updated[idx] = nb;
                  else updated.push(nb);
                });
                return updated;
              });
            }}
          />
        </div>
      )}

      {/* 5. Admin Dashboard (Protected - Admin Only) */}
      {currentPage === 'admin' && mode === 'library' && user?.role === 'admin' && (
        <div className="absolute inset-0 z-30 overflow-y-auto bg-[#F9F7F2]">
          <AdminDashboard />
        </div>
      )}

      {/* Profile Page Overlay */}
      {currentPage === 'profile' && (
        <ProfilePage
          onBack={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              setCurrentPage('home');
            }
          }}
          onNavigate={(page) => {
            setCurrentPage(page);
          }}
        />
      )}

      {/* Book Detail Modal */}
      <BookDetailModal
        book={currentBook}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          // Revert URL when closing modal
          if (location.pathname.startsWith('/library/')) {
            navigate('/library', { replace: true });
          }
        }}
        onRead={handleStartReading}
        onDelete={handleDeleteBook}
        onEdit={handleEditBook}
        onUpdateBook={handleUpdateBook}
        allBooks={books}
      />

      <GoalSettingsModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        currentTarget={readingGoal.dailyTargetMinutes}
        onSave={handleUpdateGoalTarget}
      />

      {/* Reader Layer - Fades in */}
      <ReaderInterface
        book={currentBook}
        isVisible={mode === 'reading'}
        onClose={handleCloseReader}
        onUpdateProgress={handleUpdateProgress}
        initialLocation={targetLocation}
      />

      {/* Public Book Detail Modal */}
      <PublicBookDetailModal
        book={selectedPublicBook}
        isOpen={!!selectedPublicBook}
        onClose={() => {
          setSelectedPublicBook(null);
          // Go back to /explore (remove the slug)
          if (location.pathname.startsWith('/explore/')) {
            navigate('/explore', { replace: true });
          }
        }}
        onBookAdded={(newBook) => {
          setBooks(prev => [...prev, newBook]);
        }}
      />
    </div>
  );
};

export default App;
