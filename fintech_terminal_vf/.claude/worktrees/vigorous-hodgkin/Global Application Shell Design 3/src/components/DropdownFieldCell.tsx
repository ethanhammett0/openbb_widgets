import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Input } from "./ui/input";
import { TemplateColumnVariable } from "./types/TemplateBuilderTypes";
import { useTemplateBuilder } from "./contexts/TemplateBuilderContext";

interface DropdownFieldCellProps {
  column: TemplateColumnVariable;
  tableId: string;
}

export function DropdownFieldCell({ column, tableId }: DropdownFieldCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateColumnDropdownValue, addDropdownOption } = useTemplateBuilder();

  const options = column.dropdownOptions || [];
  const selectedValue = column.dropdownValue || "";

  useEffect(() => {
    if (isCreatingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingNew]);

  const handleSelectOption = (value: string) => {
    updateColumnDropdownValue(tableId, column.id, value);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setIsOpen(false);
  };

  const handleSaveNewOption = () => {
    if (newOptionValue.trim()) {
      addDropdownOption(tableId, column.id, newOptionValue.trim());
      setNewOptionValue("");
      setIsCreatingNew(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveNewOption();
    } else if (e.key === "Escape") {
      setIsCreatingNew(false);
      setNewOptionValue("");
    }
  };

  const handleBlur = () => {
    if (newOptionValue.trim()) {
      handleSaveNewOption();
    } else {
      setIsCreatingNew(false);
    }
  };

  if (isCreatingNew) {
    return (
      <div className="px-3 py-2">
        <Input
          ref={inputRef}
          value={newOptionValue}
          onChange={(e) => setNewOptionValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Type option and press Enter..."
          className="h-6 text-xs bg-background border-blue-500 focus:ring-blue-500"
        />
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="w-full h-full px-3 py-2 text-left hover:bg-muted/30 transition-colors group min-h-[32px] flex items-center">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`text-xs truncate ${selectedValue ? "" : "text-muted-foreground italic"}`}>
                {selectedValue || "Select option..."}
              </span>
              {!selectedValue && options.length > 0 && (
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  ({options.length} options)
                </span>
              )}
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search options..." className="h-8 text-xs" />
          <CommandList className="max-h-[200px]">
            <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
              No options found.
            </CommandEmpty>
            <CommandGroup>
              {options.map((option, index) => (
                <CommandItem
                  key={`${option}-${index}`}
                  value={option}
                  onSelect={() => handleSelectOption(option)}
                  className="text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center ${
                        selectedValue === option
                          ? "bg-orange-500 border-orange-500"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {selectedValue === option && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="flex-1">{option}</span>
                  </div>
                </CommandItem>
              ))}
              
              {/* Create New Option */}
              <CommandItem
                onSelect={handleCreateNew}
                className="text-xs cursor-pointer border-t border-border mt-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Create New Option</span>
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}