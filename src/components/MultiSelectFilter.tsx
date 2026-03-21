import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface MultiSelectFilterProps {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  width?: string;
}

export function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  width = "w-[220px]"
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return label;
    }
    if (selectedValues.length === 1) {
      return options.find((o) => o.value === selectedValues[0])?.label || label;
    }
    return `${selectedValues.length} selected`;
  };

  return (
    <div className={`relative ${width}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-200/60 text-slate-900 rounded-xl py-2.5 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-all duration-200 shadow-sm text-sm"
      >
        <span className="text-sm font-medium">{getDisplayText()}</span>
        <ChevronDown className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200/60 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className="px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <span className="text-sm text-slate-900 group-hover:text-blue-600 transition-colors font-medium">
                    {option.label}
                  </span>
                  {isSelected && (
                    <Check className="size-4 text-blue-500" />
                  )}
                </div>
              );
            })}
          </div>
          
          {selectedValues.length > 0 && (
            <div className="border-t border-slate-200/60 p-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                className="w-full text-xs text-slate-600 hover:text-slate-900 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}