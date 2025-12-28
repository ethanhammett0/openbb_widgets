import { useState } from "react";
import { ChevronDown, Search, X, Lock, Unlock, Eye, Plus } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Badge } from "./ui/badge";

interface Option {
  value: string;
  label: string;
  description?: string;
  type?: string;
}

interface Entity {
  id: string;
  name: string;
  type: "sponsor" | "borrower" | "guarantor" | "servicer" | "lender";
  legalName: string;
  industry?: string;
  description?: string;
}

interface UniversalComboboxFieldProps {
  id: string;
  label: string;
  placeholder: string;
  
  // Selection mode
  isMultiSelect?: boolean;
  isEntityField?: boolean; // Whether this field deals with entities vs simple options
  
  // Data
  options?: Option[];
  entities?: Entity[];
  
  // Values
  value?: string | string[]; // Single value or array for multi-select
  selectedEntities?: Entity[]; // For entity fields
  
  // Callbacks
  onValueChange?: (value: string | string[]) => void;
  onEntitiesChange?: (entities: Entity[]) => void;
  onCreateEntity?: (fieldId: string) => void;
  
  // Lockable field functionality
  isLocked?: boolean;
  hasAIValue?: boolean;
  sources?: Array<{ document: string; location: string }>;
  onLockToggle?: () => void;
  onGoToNextSource?: () => void;
  
  // Additional props
  className?: string;
  disabled?: boolean;
}

export function UniversalComboboxField({
  id,
  label,
  placeholder,
  isMultiSelect = false,
  isEntityField = false,
  options = [],
  entities = [],
  value,
  selectedEntities = [],
  onValueChange,
  onEntitiesChange,
  onCreateEntity,
  isLocked = false,
  hasAIValue = false,
  sources = [],
  onLockToggle,
  onGoToNextSource,
  className = "",
  disabled = false
}: UniversalComboboxFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const showAIIndicator = hasAIValue && !isLocked;
  const hasSources = sources.length > 0;

  // Handle option selection
  const handleOptionSelect = (option: Option) => {
    if (isMultiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(option.value)
        ? currentValues.filter(v => v !== option.value)
        : [...currentValues, option.value];
      onValueChange?.(newValues);
    } else {
      onValueChange?.(option.value);
      setIsOpen(false);
    }
    setSearchQuery("");
  };

  // Handle entity selection
  const handleEntitySelect = (entity: Entity) => {
    if (isMultiSelect) {
      const currentEntities = selectedEntities || [];
      const exists = currentEntities.some(e => e.id === entity.id);
      const newEntities = exists
        ? currentEntities.filter(e => e.id !== entity.id)
        : [...currentEntities, entity];
      onEntitiesChange?.(newEntities);
    } else {
      onEntitiesChange?.([entity]);
      setIsOpen(false);
    }
    setSearchQuery("");
  };

  // Remove option/entity
  const handleRemoveOption = (optionValue: string) => {
    if (isMultiSelect && Array.isArray(value)) {
      const newValues = value.filter(v => v !== optionValue);
      onValueChange?.(newValues);
    }
  };

  const handleRemoveEntity = (entityId: string) => {
    if (isMultiSelect) {
      const newEntities = selectedEntities.filter(e => e.id !== entityId);
      onEntitiesChange?.(newEntities);
    }
  };

  // Filter options/entities based on search
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (option.description && option.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredEntities = entities.filter(entity =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entity.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entity.industry && entity.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get display data
  const getSelectedOptions = () => {
    if (!isMultiSelect) {
      return options.filter(opt => opt.value === value);
    }
    return options.filter(opt => Array.isArray(value) && value.includes(opt.value));
  };

  const getDisplayText = () => {
    if (isEntityField) {
      if (selectedEntities.length === 0) return placeholder;
      if (!isMultiSelect) return selectedEntities[0]?.name || placeholder;
      return `${selectedEntities.length} selected`;
    } else {
      const selected = getSelectedOptions();
      if (selected.length === 0) return placeholder;
      if (!isMultiSelect) return selected[0]?.label || placeholder;
      return `${selected.length} selected`;
    }
  };

  const renderSelectedPills = () => {
    if (!isMultiSelect) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {isEntityField ? (
          selectedEntities.map((entity) => (
            <Badge
              key={entity.id}
              variant="secondary"
              className="px-2 py-1 text-xs flex items-center gap-1"
            >
              <span className="truncate max-w-32">{entity.name}</span>
              {!isLocked && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveEntity(entity.id);
                  }}
                >
                  <X className="h-2 w-2" />
                </Button>
              )}
            </Badge>
          ))
        ) : (
          getSelectedOptions().map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="px-2 py-1 text-xs flex items-center gap-1"
            >
              <span className="truncate max-w-32">{option.label}</span>
              {!isLocked && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveOption(option.value);
                  }}
                >
                  <X className="h-2 w-2" />
                </Button>
              )}
            </Badge>
          ))
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      
      <div className="flex items-center gap-1 min-w-0">
        <div className="flex-1 relative min-w-0">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <div 
                className={`min-h-8 px-3 py-1 border-0 border-b border-border flex items-center cursor-text min-w-0 ${
                  showAIIndicator 
                    ? 'border-b-2 border-b-yellow-400 shadow-[0_2px_8px_rgba(251,191,36,0.3)] animate-pulse' 
                    : isLocked 
                    ? 'border-b-2 border-b-green-500/50' 
                    : ''
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && setIsOpen(true)}
              >
                <div className="flex-1 min-h-6 min-w-0 overflow-hidden">
                  <span className={`text-sm ${
                    (isEntityField ? selectedEntities.length === 0 : getSelectedOptions().length === 0)
                      ? 'text-muted-foreground' 
                      : ''
                  }`}>
                    {getDisplayText()}
                  </span>
                  {renderSelectedPills()}
                </div>
                <ChevronDown className="w-3 h-3 ml-2 text-muted-foreground flex-shrink-0" />
              </div>
            </PopoverTrigger>
            
            <PopoverContent className="w-80 p-0" align="start">
              {/* Search header */}
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${isEntityField ? 'entities' : 'options'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-7 border-0 bg-background"
                    autoFocus
                  />
                </div>
              </div>

              {/* Options/Entities list */}
              <div className="max-h-60 overflow-y-auto">
                {isEntityField ? (
                  <>
                    {filteredEntities.length > 0 ? (
                      filteredEntities.map((entity) => {
                        const isSelected = selectedEntities.some(e => e.id === entity.id);
                        return (
                          <div
                            key={entity.id}
                            className={`p-3 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border last:border-b-0 ${
                              isSelected ? 'bg-accent' : ''
                            }`}
                            onClick={() => handleEntitySelect(entity)}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">{entity.name}</div>
                                {isSelected && isMultiSelect && (
                                  <div className="w-2 h-2 bg-primary rounded-full" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{entity.legalName}</div>
                              {entity.industry && (
                                <div className="text-xs text-muted-foreground">
                                  {entity.industry} • {entity.type}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        <div className="text-sm">No entities found.</div>
                      </div>
                    )}
                    
                    {/* Create new entity option */}
                    {onCreateEntity && (
                      <div className="border-t border-border">
                        <div
                          className="p-3 hover:bg-accent/50 transition-colors cursor-pointer flex items-center gap-2 text-primary"
                          onClick={() => {
                            onCreateEntity(id);
                            setIsOpen(false);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          <span className="text-sm">Create new entity</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((option) => {
                        const isSelected = isMultiSelect 
                          ? Array.isArray(value) && value.includes(option.value)
                          : value === option.value;
                        
                        return (
                          <div
                            key={option.value}
                            className={`p-3 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border last:border-b-0 ${
                              isSelected ? 'bg-accent' : ''
                            }`}
                            onClick={() => handleOptionSelect(option)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{option.label}</div>
                                {option.description && (
                                  <div className="text-xs text-muted-foreground">{option.description}</div>
                                )}
                              </div>
                              {isSelected && isMultiSelect && (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        <div className="text-sm">No options found.</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Source Locator Eye Icon */}
        {hasSources && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
              >
                <Eye className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b border-border">
                <h4 className="text-sm font-medium">Source Documents</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  AI found this data in the following locations:
                </p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {sources.map((source, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border last:border-b-0"
                    onClick={() => {
                      console.log(`Navigate to: ${source.document} - ${source.location}`);
                    }}
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-medium truncate">{source.document}</div>
                      <div className="text-xs text-muted-foreground">{source.location}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border">
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={onGoToNextSource}
                >
                  Go to Next Source
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Verification Lock Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
                onClick={onLockToggle}
              >
                {isLocked ? (
                  <Lock className="w-3 h-3 text-green-500" />
                ) : (
                  <Unlock className="w-3 h-3 text-yellow-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {isLocked 
                  ? "Value verified and locked" 
                  : "Click to verify and lock this value"
                }
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}