import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

interface ToastProps {
    message: string;
    type: ToastType;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
    message,
    type,
    isVisible,
    onClose,
    duration = 3000
}) => {
    useEffect(() => {
        if (isVisible && type !== 'loading') {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, type, duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-[18px] h-[18px] text-emerald-500 shrink-0" />;
            case 'error':
                return <XCircle className="w-[18px] h-[18px] text-red-500 shrink-0" />;
            case 'info':
                return <AlertCircle className="w-[18px] h-[18px] text-sky-500 shrink-0" />;
            case 'loading':
                return <Loader className="w-[18px] h-[18px] text-[#8B7355] animate-spin shrink-0" />;
        }
    };

    const getStyle = () => {
        switch (type) {
            case 'success':
                return 'bg-white border-emerald-200/60 shadow-emerald-100/40';
            case 'error':
                return 'bg-white border-red-200/60 shadow-red-100/40';
            case 'info':
                return 'bg-white border-sky-200/60 shadow-sky-100/40';
            case 'loading':
                return 'bg-white border-[#8B7355]/10 shadow-[#8B7355]/10';
        }
    };

    // Render via portal to document.body to escape all stacking contexts
    return ReactDOM.createPortal(
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.96 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                    className="fixed top-14 md:top-[72px] left-1/2 -translate-x-1/2 z-[99999] w-auto max-w-[92vw] md:max-w-md pointer-events-auto"
                >
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-lg ${getStyle()}`}>
                        {getIcon()}
                        <span className="text-sm font-medium text-[#3D3028] leading-snug">{message}</span>
                    </div>

                    {/* Auto-dismiss progress bar */}
                    {type !== 'loading' && (
                        <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full overflow-hidden opacity-30">
                            <motion.div
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: duration / 1000, ease: 'linear' }}
                                className={`h-full rounded-full ${
                                    type === 'success' ? 'bg-emerald-500' :
                                    type === 'error' ? 'bg-red-500' : 'bg-sky-500'
                                }`}
                            />
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// Hook for managing toast
export const useToast = () => {
    const [toast, setToast] = React.useState<{
        message: string;
        type: ToastType;
        isVisible: boolean;
    }>({
        message: '',
        type: 'info',
        isVisible: false,
    });

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type, isVisible: true });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    return {
        toast,
        showToast,
        hideToast,
    };
};
