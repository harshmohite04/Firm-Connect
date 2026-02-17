import React, { useState } from 'react';

interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  validate?: (value: string) => string | null;
  className?: string;
  name?: string;
}

const CheckIcon = () => (
  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FormField: React.FC<FormFieldProps> = ({ label, type = 'text', value, onChange, placeholder, required, validate, className = '', name }) => {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBlur = () => {
    setTouched(true);
    if (validate) {
      setError(validate(value));
    } else if (required && !value.trim()) {
      setError(`${label} is required`);
    } else {
      setError(null);
    }
  };

  const isValid = touched && !error && value.trim().length > 0;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => {
            onChange(e);
            if (touched) {
              if (validate) {
                setError(validate(e.target.value));
              } else if (required && !e.target.value.trim()) {
                setError(`${label} is required`);
              } else {
                setError(null);
              }
            }
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          name={name}
          className={`w-full px-4 py-2.5 rounded-xl border transition-all text-sm
            ${error && touched
              ? 'border-red-300 dark:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
              : isValid
                ? 'border-emerald-300 dark:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                : 'border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            }
            bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none
          `}
        />
        {touched && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            {error ? <ErrorIcon /> : isValid ? <CheckIcon /> : null}
          </div>
        )}
      </div>
      {error && touched && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const getStrength = (): { level: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { level: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { level: 3, label: 'Good', color: 'bg-blue-500' };
    return { level: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  if (!password) return null;

  const { level, label, color } = getStrength();

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= level ? color : 'bg-slate-200 dark:bg-slate-600'}`} />
        ))}
      </div>
      <p className={`text-xs ${level <= 1 ? 'text-red-500' : level === 2 ? 'text-amber-500' : level === 3 ? 'text-blue-500' : 'text-emerald-500'}`}>
        {label}
      </p>
    </div>
  );
};

export default FormField;
