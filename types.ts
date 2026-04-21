
export interface Book {
  id: string;
  title: string;
  author: string;
  color: string;
  fileType: 'text' | 'epub';
  content?: string;
  epubData?: ArrayBuffer; // For storing raw EPUB binary
  tags?: string[]; // Array of categories/tags
  icon?: string; // Icon name for the cover
  coverImage?: string; // Base64 or URL for the book cover visual
  coverUrl?: string; // URL to cover image in Supabase Storage
  fileUrl?: string; // URL to EPUB file in Supabase Storage
  height?: number;
  thickness?: number;
  year?: string;
  summary?: string;
  lastLocation?: string; // Stores EPUB CFI or Scroll Position
  progressPercent?: number; // 0-100 for visual progress bar
  timeRead?: number; // Total reading time in seconds
  lastReadDate?: number; // Timestamp
  dateAdded?: number; // Timestamp when book was added to library
  collectionIds?: string[]; // IDs of collections this book belongs to
  isFavorite?: boolean; // Mark as favorite
  isArchived?: boolean; // Archive book
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: number;
  bookCount?: number; // Computed field
}

export interface Highlight {
  id: string;
  bookId: string;
  cfiRange: string;
  color: string; // e.g. 'yellow', 'green', 'pink' or hex
  text?: string; // The selected text content
  chapterLabel?: string; // e.g. "Chapter 1"
  page?: number;
  note?: string; // Optional user note
  createdAt: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  cfi: string;
  label?: string; // Chapter title or user label
  textPreview?: string; // First few words of the line
  page?: number;
  note?: string; // User added note
  createdAt: number;
}

export interface ReadingGoal {
  dailyTargetMinutes: number; // e.g. 30
  dailyProgressSeconds: number; // e.g. 1200 (20 mins)
  lastReadDate: string; // YYYY-MM-DD used to check streak continuity
  currentStreak: number; // Days in a row meeting target
  longestStreak: number; // Record streak
  totalMinutesRead: number; // All time total
}

export type AppState = 'library' | 'reading';
export type Page = 'home' | 'library' | 'collections' | 'stats' | 'explore' | 'profile' | 'admin' | 'reading' | 'login' | 'register';

// Reader Types
export type ReaderTheme = 'paper' | 'clean' | 'dark';
export type FontFamily = 'serif' | 'sans' | 'mono';
export type ReadingMode = 'scroll' | 'paged';
export type PageLayout = 'single' | 'double';
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface LibraryStore {
  books: Book[];
  selectedBookId: string | null;
  appState: AppState;
  selectBook: (id: string | null) => void;
  setAppState: (state: AppState) => void;
  addBook: (book: Book) => void;
}