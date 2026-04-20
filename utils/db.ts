import { openDB, DBSchema } from 'idb';
import { Book, Highlight, Bookmark, Collection } from '../types';

interface ReharthDB extends DBSchema {
    books: {
        key: string;
        value: Book;
        indexes: { 'by-title': string };
    };
    highlights: {
        key: string;
        value: Highlight;
        indexes: { 'by-bookId': string };
    };
    bookmarks: {
        key: string;
        value: Bookmark;
        indexes: { 'by-bookId': string };
    };
    collections: {
        key: string;
        value: Collection;
        indexes: { 'by-name': string };
    };
}

const DB_NAME = 'reharth-db';
const BOOKS_STORE = 'books';
const HIGHLIGHTS_STORE = 'highlights';
const BOOKMARKS_STORE = 'bookmarks';
const COLLECTIONS_STORE = 'collections';

export const initDB = async () => {
    return openDB<ReharthDB>(DB_NAME, 3, {
        upgrade(db, oldVersion, newVersion, transaction) {
            // Version 1: Create Books Store
            if (!db.objectStoreNames.contains(BOOKS_STORE)) {
                const store = db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
                store.createIndex('by-title', 'title');
            }

            // Version 2: Create Highlights & Bookmarks Stores
            if (oldVersion < 2) {
                if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE)) {
                    const hStore = db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: 'id' });
                    hStore.createIndex('by-bookId', 'bookId');
                }
                if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
                    const bStore = db.createObjectStore(BOOKMARKS_STORE, { keyPath: 'id' });
                    bStore.createIndex('by-bookId', 'bookId');
                }
            }

            // Version 3: Create Collections Store
            if (oldVersion < 3) {
                if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
                    const cStore = db.createObjectStore(COLLECTIONS_STORE, { keyPath: 'id' });
                    cStore.createIndex('by-name', 'name');
                }
            }
        },
    });
};

// --- BOOKS ---
export const saveBook = async (book: Book) => {
    const db = await initDB();
    return db.put(BOOKS_STORE, book);
};

export const getAllBooks = async (): Promise<Book[]> => {
    const db = await initDB();
    return db.getAll(BOOKS_STORE);
};

export const deleteBook = async (id: string) => {
    const db = await initDB();
    // Start transaction to delete related items too (optional but good practice)
    // For now simple delete.
    return db.delete(BOOKS_STORE, id);
};

// --- HIGHLIGHTS ---
export const saveHighlight = async (highlight: Highlight) => {
    const db = await initDB();
    return db.put(HIGHLIGHTS_STORE, highlight);
};

export const getHighlightsByBook = async (bookId: string): Promise<Highlight[]> => {
    const db = await initDB();
    return db.getAllFromIndex(HIGHLIGHTS_STORE, 'by-bookId', bookId);
};

export const deleteHighlight = async (id: string) => {
    const db = await initDB();
    return db.delete(HIGHLIGHTS_STORE, id);
};

export const getAllHighlights = async (): Promise<Highlight[]> => {
    const db = await initDB();
    return db.getAll(HIGHLIGHTS_STORE);
};

// --- BOOKMARKS ---
export const saveBookmark = async (bookmark: Bookmark) => {
    const db = await initDB();
    return db.put(BOOKMARKS_STORE, bookmark);
};

export const getBookmarksByBook = async (bookId: string): Promise<Bookmark[]> => {
    const db = await initDB();
    return db.getAllFromIndex(BOOKMARKS_STORE, 'by-bookId', bookId);
};

export const deleteBookmark = async (id: string) => {
    const db = await initDB();
    return db.delete(BOOKMARKS_STORE, id);
};

// --- COLLECTIONS ---
export const saveCollection = async (collection: Collection) => {
    const db = await initDB();
    return db.put(COLLECTIONS_STORE, collection);
};

export const getAllCollections = async (): Promise<Collection[]> => {
    const db = await initDB();
    return db.getAll(COLLECTIONS_STORE);
};

export const deleteCollection = async (id: string) => {
    const db = await initDB();
    return db.delete(COLLECTIONS_STORE, id);
};

export const getCollection = async (id: string): Promise<Collection | undefined> => {
    const db = await initDB();
    return db.get(COLLECTIONS_STORE, id);
};
