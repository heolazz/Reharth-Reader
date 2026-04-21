import React from 'react';
import { motion } from 'framer-motion';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] bg-[#F9F7F2] flex flex-col items-center justify-center gap-6">
            {/* Animated Sprout — grows from flat to full */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={64}
                height={64}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3D3028"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {/* Ground line — fades in first */}
                <motion.path
                    d="M5 21h14"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                />

                {/* Stem and Leaves — grow upward from ground */}
                <motion.g
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{
                        scaleY: {
                            duration: 1.4,
                            delay: 0.4,
                            ease: [0.22, 1.0, 0.36, 1], // smooth overshoot
                        },
                        opacity: {
                            duration: 0.5,
                            delay: 0.4,
                        },
                    }}
                    style={{ originX: "12px", originY: "21px", transformBox: "fill-box" }}
                >
                    {/* Left Leaf */}
                    <motion.path
                        d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.0, delay: 1.0, ease: "easeOut" }}
                    />
                    {/* Stem & Right Leaf */}
                    <motion.path
                        d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                    />
                </motion.g>
            </svg>

            {/* App Name — fades in after sprout blooms */}
            <motion.h1
                className="font-serif text-2xl text-[#3D3028] tracking-wide"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.6, ease: "easeOut" }}
            >
                Reharth
            </motion.h1>
        </div>
    );
};
