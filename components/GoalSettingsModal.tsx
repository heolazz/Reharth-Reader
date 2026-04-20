import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Target } from 'lucide-react';

interface GoalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTarget: number;
    onSave: (minutes: number) => void;
}

export const GoalSettingsModal: React.FC<GoalSettingsModalProps> = ({ isOpen, onClose, currentTarget, onSave }) => {
    const [target, setTarget] = useState(currentTarget);

    const handleSave = () => {
        if (target > 0) {
            onSave(target);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#3E2723]/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-[#3E2723]/10"
                    >
                        <div className="absolute top-0 right-0 p-6">
                            <button onClick={onClose} className="text-[#3E2723]/20 hover:text-[#3E2723] transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 md:p-10 text-center">
                            <h3 className="font-serif text-3xl text-[#3E2723] mb-3 font-medium">Daily Goal</h3>
                            <p className="text-[#3E2723]/50 text-base mb-10 leading-relaxed font-sans">
                                Set a realistic reading target. Consistency beats intensity.
                            </p>

                            <div className="flex items-center justify-center gap-6 mb-10">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setTarget(Math.max(5, target - 5))}
                                    className="w-12 h-12 rounded-full border border-[#3E2723]/10 text-[#3E2723] hover:bg-[#F3F0EB] hover:border-[#3E2723]/0 flex items-center justify-center transition-all shadow-sm"
                                >
                                    <span className="text-2xl font-light mb-1">-</span>
                                </motion.button>

                                <div className="flex flex-col items-center w-24">
                                    <span className="text-[#3E2723] font-serif text-5xl tabular-nums font-medium tracking-tight">
                                        {target}
                                    </span>
                                    <span className="text-xs uppercase tracking-widest text-[#3E2723]/40 font-bold mt-1">Minutes</span>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setTarget(target + 5)}
                                    className="w-12 h-12 rounded-full border border-[#3E2723]/10 text-[#3E2723] hover:bg-[#F3F0EB] hover:border-[#3E2723]/0 flex items-center justify-center transition-all shadow-sm"
                                >
                                    <span className="text-2xl font-light mb-1">+</span>
                                </motion.button>
                            </div>

                            <div className="flex flex-col gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSave}
                                    className="w-full py-4 rounded-xl bg-[#6B8E6D] text-[#F3F0EB] font-medium hover:bg-[#5a7a5c] transition-all shadow-lg hover:shadow-[#6B8E6D]/20 flex items-center justify-center gap-2 group"
                                >
                                    <span>Save Target</span>
                                </motion.button>

                                <button
                                    onClick={onClose}
                                    className="w-full py-3 rounded-xl text-[#3E2723]/40 font-medium hover:text-[#3E2723] transition-colors text-sm"
                                >
                                    Maybe later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
