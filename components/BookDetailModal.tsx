import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Calendar, Trash2, PenLine, AlertTriangle, Library } from 'lucide-react';
import { Book } from '../types';
import { CollectionsManager } from './CollectionsManager';

interface BookDetailModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onRead: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (book: Book) => void;
  onUpdateBook?: (book: Book) => void;
  allBooks?: Book[];
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({ book, isOpen, onClose, onRead, onDelete, onEdit, onUpdateBook, allBooks = [] }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showCollections, setShowCollections] = useState(false);

  // Reset states when modal closes or book changes
  React.useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
      setIsExpanded(false);
    }
  }, [isOpen, book]);

  if (!book) return null;

  // Use the summary if available, otherwise fallback to start of content
  const description = book.summary || (book.content ? book.content.split('\n')[0].substring(0, 150) + '...' : 'No description available.');

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-8">

            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-[#3E2723]/30 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
              className="relative w-full md:max-w-4xl h-full md:h-auto md:max-h-[90vh] bg-white md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row ring-1 ring-[#3E2723]/5"
            >
              {/* Action Buttons (Top Right) */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                {/* Edit Button */}
                {onEdit && (
                  <button
                    onClick={() => onEdit(book)}
                    className="p-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full transition-all text-[#3E2723]/60 hover:text-[#3E2723] shadow-sm ring-1 ring-[#3E2723]/5"
                    title="Edit Book"
                  >
                    <PenLine size={18} />
                  </button>
                )}

                {/* Collections Button */}
                {onUpdateBook && (
                  <button
                    onClick={() => setShowCollections(true)}
                    className="p-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full transition-all text-[#3E2723]/60 hover:text-[#3E2723] shadow-sm ring-1 ring-[#3E2723]/5"
                    title="Manage Collections"
                  >
                    <Library size={18} />
                  </button>
                )}

                {/* Delete Button */}
                {onDelete && !isDeleting && (
                  <button
                    onClick={() => setIsDeleting(true)}
                    className="p-2 bg-white/80 hover:bg-red-50 backdrop-blur-sm rounded-full transition-all text-[#3E2723]/40 hover:text-red-500 shadow-sm ring-1 ring-[#3E2723]/5"
                    title="Delete Book"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full transition-all text-[#3E2723]/60 hover:text-[#3E2723] shadow-sm ring-1 ring-[#3E2723]/5"
                >
                  <X size={20} />
                </button>
              </div>

              {/* DELETE CONFIRMATION OVERLAY */}
              <AnimatePresence>
                {isDeleting && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm flex items-center justify-center p-8"
                  >
                    <div className="text-center max-w-sm space-y-6">
                      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} />
                      </div>
                      <h3 className="font-serif text-2xl text-[#3E2723] font-bold">Remove this book?</h3>
                      <p className="text-[#3E2723]/60">
                        Are you sure you want to delete <span className="font-bold italic text-[#3E2723]">"{book.title}"</span>? This action cannot be undone.
                      </p>
                      <div className="flex gap-4 justify-center pt-2">
                        <button
                          onClick={() => setIsDeleting(false)}
                          className="px-6 py-3 rounded-full border border-[#3E2723]/20 text-[#3E2723]/60 font-medium hover:bg-[#F3F0EB] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => onDelete && onDelete(book.id)}
                          className="px-6 py-3 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Left Side: Visual/Cover Area (Adjusted for mobile) */}
              <div className="w-full md:w-5/12 bg-[#F3F0EB] border-r border-[#3E2723]/10 flex items-center justify-center p-8 md:p-12 relative overflow-hidden min-h-[300px] md:min-h-0 flex-shrink-0">
                {/* Background blob for atmosphere */}
                <div
                  className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-10 blur-3xl rounded-full pointer-events-none"
                  style={{ backgroundColor: book.color }}
                />

                {/* Book Cover Representation */}
                <motion.div
                  layoutId={`book-cover-${book.id}`}
                  className="relative shadow-2xl flex flex-col overflow-hidden transform"
                  // Adjust dimensions and rotation for tablets
                  style={{
                    backgroundColor: book.color,
                    width: 'clamp(180px, 40vw, 240px)', // Responsive clamp
                    aspectRatio: '2/3',
                    rotate: '-2deg'
                  }}
                >
                  {/* Spine Hinge */}
                  <div className="absolute left-0 top-0 bottom-0 w-[12px] bg-gradient-to-r from-black/30 via-black/10 to-transparent z-20" />

                  {/* Texture & Gradient Overlay */}
                  <div className="absolute inset-0 opacity-[0.15] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-0" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 z-0" />
                  <div className="absolute inset-0 border-[0.5px] border-white/20 z-20 pointer-events-none" />

                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} className="absolute inset-0 w-full h-full object-cover z-10" />
                  ) : (
                    <div className="relative z-10 flex flex-col items-center justify-between h-full py-8 px-6 md:py-10 md:px-8 text-white">
                      {/* Title - Centered */}
                      <div className="flex-1 flex items-center justify-center w-full px-2 overflow-hidden">
                        <h3 className={`font-serif leading-[1.15] tracking-tight text-center break-words w-full drop-shadow-md
                        ${book.title.length < 15 ? 'text-3xl md:text-4xl lg:text-5xl' :
                            book.title.length < 40 ? 'text-2xl md:text-3xl lg:text-4xl' :
                              book.title.length < 80 ? 'text-xl md:text-2xl lg:text-3xl line-clamp-5' :
                                'text-lg md:text-xl lg:text-2xl line-clamp-6'}
                      `}>
                          {book.title}
                        </h3>
                      </div>

                      {/* Bottom: Author & Year */}
                      <div className="w-full flex flex-col items-center gap-2 md:gap-3">
                        <div className="w-8 md:w-10 h-px bg-white/40" />
                        <div className="text-center">
                          <p className="font-sans text-xs md:text-sm uppercase tracking-widest font-medium opacity-90">{book.author}</p>
                          {book.year && (
                            <p className="font-serif italic text-xs md:text-sm opacity-80 mt-1">{book.year}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Right Side: Details */}
              <div className="flex-1 p-6 md:p-12 flex flex-col min-h-0 bg-white overflow-y-auto custom-scrollbar text-[#3E2723]">

                <div className="space-y-6">
                  <div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className={`font-serif font-medium leading-[1.1] mb-3 break-words text-[#3E2723]
                      ${book.title.length < 20 ? 'text-3xl md:text-5xl' :
                          book.title.length < 50 ? 'text-2xl md:text-4xl' :
                            'text-xl md:text-3xl'}
                    `}
                    >
                      {book.title}
                    </motion.h2>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-base md:text-lg text-[#3E2723]/60 font-serif italic"
                    >
                      <span>by {book.author}</span>
                      {book.year && (
                        <>
                          <span className="hidden md:inline text-[#3E2723]/30">•</span>
                          <span className="flex items-center gap-1 text-xs md:text-sm not-italic opacity-80 font-sans">
                            <Calendar size={14} /> {book.year}
                          </span>
                        </>
                      )}
                    </motion.div>
                  </div>

                  {/* Tags */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap gap-2"
                  >
                    {book.tags?.map((tag, i) => (
                      <span key={i} className="px-3 py-1 border border-[#3E2723]/10 rounded-full text-xs uppercase tracking-wider font-medium text-[#3E2723]/60">
                        {tag}
                      </span>
                    ))}
                  </motion.div>

                  {/* Description Section with Read More */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="prose prose-stone max-w-none relative"
                  >
                    <p className={`text-base md:text-lg text-[#3E2723]/80 leading-relaxed font-serif text-justify md:text-left transition-all duration-300 ${!isExpanded ? 'line-clamp-[8] md:line-clamp-6' : ''}`}>
                      {description}
                    </p>

                    {description.length > 300 && (
                      <div className={`mt-2 ${!isExpanded ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/80 to-transparent pt-8 flex justify-center' : ''}`}>
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="text-xs md:text-sm font-sans font-bold uppercase tracking-widest text-[#3E2723] border-b border-[#3E2723]/20 hover:border-[#3E2723] transition-colors pb-0.5"
                        >
                          {isExpanded ? "Show Less" : "Read More"}
                        </button>
                      </div>
                    )}
                  </motion.div>

                  {/* Reading Stats */}
                  {(book.timeRead || book.lastReadDate) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.45 }}
                      className="flex items-center gap-6 py-4 border-t border-b border-[#3E2723]/5 my-2"
                    >
                      {book.timeRead && (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-widest text-[#3E2723]/40 font-sans font-bold">Time Read</span>
                          <span className="text-xl font-serif text-[#3E2723] mt-0.5">
                            {book.timeRead < 60 ? '1m' : `${Math.floor(book.timeRead / 60)}m`}
                          </span>
                        </div>
                      )}
                      {book.lastReadDate && (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-widest text-[#3E2723]/40 font-sans font-bold">Last Read</span>
                          <span className="text-xl font-serif text-[#3E2723] mt-0.5">
                            {new Date(book.lastReadDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Action */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="pt-6 md:pt-4 md:pb-0 pb-20"
                  >
                    <button
                      onClick={onRead}
                      className="w-full md:w-auto group flex items-center justify-center gap-3 px-8 py-4 rounded-full text-white transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl active:scale-95"
                      style={{ backgroundColor: book.color }}
                    >
                      <span className="text-lg font-medium tracking-wide">Start Reading</span>
                      <Play size={18} fill="currentColor" className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CollectionsManager
        isOpen={showCollections}
        onClose={() => setShowCollections(false)}
        books={allBooks}
        onUpdateBook={onUpdateBook || (() => { })}
        selectedBook={book}
      />
    </>
  );
};