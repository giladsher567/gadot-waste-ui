import React, { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

// Input Component
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}
export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => (
    <div className={`form-group ${className || ''}`}>
        <label htmlFor={props.id || props.name}>{label}</label>
        <input {...props} className={error ? 'error' : ''} />
        {error && <div className="text-error">{error}</div>}
    </div>
);

// Select Component
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: { value: string; label: string }[];
    error?: string;
}
export const Select: React.FC<SelectProps> = ({ label, options, error, className, ...props }) => (
    <div className={`form-group ${className || ''}`}>
        <label htmlFor={props.id || props.name}>{label}</label>
        <select {...props} className={error ? 'error' : ''}>
            <option value="">בחר...</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        {error && <div className="text-error">{error}</div>}
    </div>
);

// Textarea Component
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
}
export const Textarea: React.FC<TextareaProps> = ({ label, error, className, ...props }) => (
    <div className={`form-group ${className || ''}`}>
        <label htmlFor={props.id || props.name}>{label}</label>
        <textarea {...props} className={error ? 'error' : ''} />
        {error && <div className="text-error">{error}</div>}
    </div>
);

// Checkbox Component
interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
}
export const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...props }) => (
    <div className={`form-group flex items-center gap-sm ${className || ''}`} style={{ flexDirection: 'row' }}>
        <input type="checkbox" {...props} style={{ width: 'auto', margin: 0 }} />
        <label htmlFor={props.id || props.name} style={{ margin: 0 }}>{label}</label>
    </div>
);

// Drawer Component
interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}
export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="drawer-overlay" onClick={onClose}>
            <div className="drawer-content" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
                    <h2>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', padding: 0, color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};
