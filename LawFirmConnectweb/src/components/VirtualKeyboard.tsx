import React, { useState, useRef, useEffect } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import layout from 'simple-keyboard-layouts/build/layouts/hindi';

interface VirtualKeyboardProps {
    onChange: (input: string) => void;
    onKeyPress?: (button: string) => void;
    language: 'en' | 'hi' | 'mr';
    className?: string;
    inputName?: string;
    value?: string;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ 
    onChange, 
    onKeyPress, 
    language,
    className,
    inputName = "default",
    value
}) => {
    const [layoutName, setLayoutName] = useState('default');
    const keyboardRef = useRef<any>(null);

    // Dynamic layout loading
    // Simple-keyboard-layouts exports an object, but sometimes we might need to define custom
    // For now, let's use standard QWERTY for EN, and the imported `hindi` for HI/MR
    // MR (Marathi) uses Devanagari, same as Hindi.
    
    const getLayout = () => {
        if (language === 'hi' || language === 'mr') {
            // simple-keyboard-layouts exports { layout: { default, shift } }
            // react-simple-keyboard expects { default: [...], shift: [...] }
            return layout.layout;
        }
        // Default English layout is built-in
        return {
            default: [
                "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
                "{tab} q w e r t y u i o p [ ] \\",
                "{lock} a s d f g h j k l ; ' {enter}",
                "{shift} z x c v b n m , . / {shift}",
                ".com @ {space}"
            ],
            shift: [
                "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
                "{tab} Q W E R T Y U I O P { } |",
                "{lock} A S D F G H J K L : \" {enter}",
                "{shift} Z X C V B N M < > ? {shift}",
                ".com @ {space}"
            ]
        };
    };

    const handleShift = () => {
        const newLayoutName = layoutName === 'default' ? 'shift' : 'default';
        setLayoutName(newLayoutName);
    };

    const onKeyPressInternal = (button: string) => {
        if (button === "{shift}" || button === "{lock}") {
            handleShift();
        }
        if (onKeyPress) {
            onKeyPress(button);
        }
    };

    useEffect(() => {
        // Reset layout when language changes if needed
        setLayoutName('default');
    }, [language]);

    useEffect(() => {
        if (keyboardRef.current) {
            keyboardRef.current.setInput(value || "");
        }
    }, [value]);

    return (
        <div className={`virtual-keyboard-wrapper ${className || ''} bg-slate-100 p-2 rounded-lg shadow-inner`}>
            {/* Custom Styles for better visibility */}
            <style>{`
                .hg-theme-default {
                    background-color: transparent;
                }
                .hg-button {
                    font-weight: bold;
                }
            `}</style>
            
            <Keyboard
                keyboardRef={r => (keyboardRef.current = r)}
                layoutName={layoutName}
                layout={getLayout() as any}
                onChange={onChange}
                onKeyPress={onKeyPressInternal}
                inputName={inputName}
                display={{
                    "{bksp}": "⌫",
                    "{enter}": "↵",
                    "{shift}": "⇧",
                    "{lock}": "Caps",
                    "{tab}": "Tab",
                    "{space}": "Space"
                }}
            />
        </div>
    );
};

export default VirtualKeyboard;
