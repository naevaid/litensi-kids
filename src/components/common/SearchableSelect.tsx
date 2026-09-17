import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Plus } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export interface SearchableFilterDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  className?: string;
}

export const SearchableFilterDropdown: React.FC<SearchableFilterDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Cari...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setSearchTerm('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const selectedOption = options.find(o => o.value === value);
  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.sublabel && o.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div ref={containerRef} className={`relative ${className} ${isOpen ? 'z-50' : 'z-10'}`}>
      <div
        onClick={handleToggle}
        className={`px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
          isOpen ? 'ring-2 ring-indigo-500 border-transparent bg-white dark:bg-slate-900 shadow-xs' : 'hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <span className={selectedOption || value ? 'text-slate-800 dark:text-slate-100 font-bold' : 'text-slate-400 font-medium'}>
          {selectedOption ? selectedOption.label : (value || placeholder)}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 min-w-[180px] w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-medium py-1"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-center text-xs text-slate-400 font-medium italic">
                Data tidak ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-between ${
                    value === opt.value
                      ? 'bg-indigo-500 text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>{opt.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Cari...',
  disabled = false,
  allowClear = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setSearchTerm('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const selectedOption = options.find(o => o.value === value);
  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.sublabel && o.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-50' : 'z-10'}`}>
      <div
        onClick={handleToggle}
        className={`w-full px-3.5 py-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-between gap-2 border ${
          disabled
            ? 'bg-slate-100/60 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500 cursor-not-allowed select-none'
            : isOpen
            ? 'ring-2 ring-indigo-500 border-transparent bg-white dark:bg-slate-900 shadow-xs cursor-pointer'
            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
        }`}
      >
        <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
          <span className={disabled ? 'text-slate-400 dark:text-slate-500 font-medium truncate' : (selectedOption || value ? 'text-slate-800 dark:text-slate-100 font-bold truncate' : 'text-slate-400 font-medium truncate')}>
            {disabled ? placeholder : (selectedOption ? selectedOption.label : (value || placeholder))}
          </span>
          {selectedOption?.sublabel && (
            <span className="shrink-0 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold px-2 py-0.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/40">
              {selectedOption.sublabel}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 shrink-0 ${disabled ? 'text-slate-300 dark:text-slate-600' : isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
      </div>

      {!disabled && isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-medium py-1"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800/50">
            {allowClear && (
              <div
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 italic cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 ${
                  !value ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400' : ''
                }`}
              >
                {placeholder} (Kosongkan)
              </div>
            )}
            {filteredOptions.length === 0 ? (
              <div className="p-1 space-y-1">
                <div className="px-3 py-2 text-center text-xs text-slate-400 font-medium italic">
                  Data tidak ditemukan
                </div>
                {searchTerm.trim() && (
                  <div
                    onClick={() => {
                      onChange(searchTerm.trim());
                      setIsOpen(false);
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Gunakan "{searchTerm.trim()}"
                  </div>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                    value === opt.value
                      ? 'bg-indigo-500 text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className={`text-[10px] shrink-0 font-extrabold px-1.5 py-0.5 rounded ${
                      value === opt.value
                        ? 'bg-indigo-600/60 text-white'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40'
                    }`}>
                      {opt.sublabel}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
