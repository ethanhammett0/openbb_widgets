import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Plus, Users, Building2, FileText, DollarSign, BarChart3, Search, X, CheckCircle2, Hash, Type, Filter, Combine, Split } from "lucide-react";
import { createPortal } from "react-dom";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { VariablePill } from "./VariablePill";
import { TemplatePill } from "./TemplatePill";
import { ConfigureVariableModal } from "./ConfigureVariableModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { useTemplateBuilder } from "./contexts/TemplateBuilderContext";
import { LibraryCategory, LIBRARY_CATEGORIES, VariableDataType } from "./types/TemplateBuilderTypes";

const categoryIcons = {
  entity: Users,
  asset: Building2,
  contract: FileText,
  loan: DollarSign,
  quantitative: BarChart3,
};

// System tags for filtering
const SYSTEM_TAGS = [
  { id: "real-estate", label: "Real Estate", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "financial", label: "Financial", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { id: "legal", label: "Legal", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { id: "tax", label: "Tax", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { id: "operations", label: "Operations", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { id: "esg", label: "ESG", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { id: "compliance", label: "Compliance", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { id: "investment", label: "Investment", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  { id: "valuation", label: "Valuation", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { id: "property-management", label: "Property Management", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { id: "construction", label: "Construction", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { id: "leasing", label: "Leasing", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  { id: "debt", label: "Debt", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  { id: "equity", label: "Equity", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  { id: "reporting", label: "Reporting", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
];

const DATA_TYPES: VariableDataType[] = ["Text", "Date", "Currency", "Number", "Percentage", "Dropdown", "Lookup", "Array"];

interface FilterPill {
  id: string;
  type: "datatype" | "tag" | "required" | "category";
  label: string;
  value: string;
  color?: string;
}

export function VariableLibraryPanel() {
  const {
    addLibraryVariable,
    updateLibraryVariable,
    deleteLibraryVariable,
    configuration,
    createNewTemplate,
    templateLibrary,
    getTemplateLibraryItemsByCategory,
  } = useTemplateBuilder();

  const [activeCategory, setActiveCategory] = useState<LibraryCategory | null>(null);
  const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  
  // View mode: "variables", "templates", "all"
  const [viewMode, setViewMode] = useState<"variables" | "templates" | "all">("variables");

  // Simple search state
  const [searchQuery, setSearchQuery] = useState("");

  // Filter popup states
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [filterPills, setFilterPills] = useState<FilterPill[]>([]);
  const [filterInputValue, setFilterInputValue] = useState("");
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [filterMode, setFilterMode] = useState<"AND" | "OR">("OR"); // Default to OR mode
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const handleNewFieldClick = () => {
    // Skip category selection and go directly to configuration with default category
    setActiveCategory("entity"); // Default to "entity" category
    setIsDefinitionModalOpen(true);
  };

  const handleCategorySelect = (category: LibraryCategory) => {
    setActiveCategory(category);
    setIsCategorySelectionOpen(false);
    setIsDefinitionModalOpen(true);
  };

  const handleSaveVariable = (variable: {
    displayName: string;
    dataType: any;
    systemTags?: string[];
    category: LibraryCategory;
  }) => {
    addLibraryVariable(variable);
  };

  const handleEditVariable = (id: string) => {
    const variable = configuration.libraryVariables.find(v => v.id === id);
    if (variable) {
      setEditingVariableId(id);
      setActiveCategory(variable.category);
      setIsDefinitionModalOpen(true);
    }
  };

  const handleUpdateVariable = (id: string, updates: any) => {
    updateLibraryVariable(id, updates);
  };

  const handleLinkVariable = (id: string) => {
    // TODO: Implement linking functionality
    console.log("Link variable:", id);
  };

  // Add filter pill
  const addFilterPill = useCallback((type: FilterPill["type"], label: string, value: string, color?: string) => {
    const id = `${type}-${value}-${Date.now()}`;
    const newPill: FilterPill = { id, type, label, value, color };
    
    // Prevent duplicates
    const exists = filterPills.some(p => p.type === type && p.value === value);
    if (!exists) {
      setFilterPills(prev => [...prev, newPill]);
    }
    
    setFilterInputValue("");
  }, [filterPills]);

  // Remove filter pill
  const removeFilterPill = useCallback((id: string) => {
    setFilterPills(prev => prev.filter(p => p.id !== id));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilterPills([]);
    setFilterInputValue("");
  }, []);

  // Get available dropdown options based on input
  const getDropdownOptions = useMemo(() => {
    const query = filterInputValue.toLowerCase().trim();
    const options: Array<{
      type: "datatype" | "tag" | "required" | "category";
      label: string;
      value: string;
      color?: string;
      icon?: any;
    }> = [];

    // Data types
    DATA_TYPES.forEach(dataType => {
      if (!query || dataType.toLowerCase().includes(query)) {
        if (!filterPills.some(p => p.type === "datatype" && p.value === dataType)) {
          options.push({
            type: "datatype",
            label: dataType,
            value: dataType,
            icon: Type
          });
        }
      }
    });

    // Field categories
    LIBRARY_CATEGORIES.forEach(category => {
      if (!query || category.name.toLowerCase().includes(query)) {
        if (!filterPills.some(p => p.type === "category" && p.value === category.id)) {
          const Icon = categoryIcons[category.id];
          options.push({
            type: "category",
            label: category.name,
            value: category.id,
            icon: Icon,
            color: "bg-purple-500/20 text-purple-400 border-purple-500/30"
          });
        }
      }
    });

    // System tags
    SYSTEM_TAGS.forEach(tag => {
      if (!query || tag.label.toLowerCase().includes(query)) {
        if (!filterPills.some(p => p.type === "tag" && p.value === tag.id)) {
          options.push({
            type: "tag",
            label: tag.label,
            value: tag.id,
            color: tag.color,
            icon: Hash
          });
        }
      }
    });

    // Required field
    if (!query || "required".includes(query)) {
      if (!filterPills.some(p => p.type === "required")) {
        options.push({
          type: "required",
          label: "Required Only",
          value: "true",
          icon: CheckCircle2
        });
      }
    }

    return options;
  }, [filterInputValue, filterPills]);

  // Filtered variables computation - works on ALL variables with AND/OR logic
  const getFilteredVariables = useCallback(() => {
    let variables = configuration.libraryVariables;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      variables = variables.filter(v => 
        v.displayName.toLowerCase().includes(query)
      );
    }

    // Group filters by type
    const tagFilters = filterPills.filter(p => p.type === "tag");
    const datatypeFilters = filterPills.filter(p => p.type === "datatype");
    const categoryFilters = filterPills.filter(p => p.type === "category");
    const requiredFilters = filterPills.filter(p => p.type === "required");

    // Apply filters based on mode
    if (filterMode === "AND") {
      // AND mode: variable must match ALL filters
      
      // Data type filter (AND within same type)
      if (datatypeFilters.length > 0) {
        variables = variables.filter(v => 
          datatypeFilters.some(f => v.dataType === f.value)
        );
      }

      // Category filter (AND within same type)
      if (categoryFilters.length > 0) {
        variables = variables.filter(v => 
          categoryFilters.some(f => v.category === f.value)
        );
      }

      // Tag filters (AND - must have ALL selected tags)
      if (tagFilters.length > 0) {
        variables = variables.filter(v => {
          const varTags = (v as any).systemTags || [];
          return tagFilters.every(f => varTags.includes(f.value));
        });
      }

      // Required filter
      if (requiredFilters.length > 0) {
        variables = variables.filter(v => (v as any).isRequired === true);
      }
    } else {
      // OR mode: variable can match ANY filter
      if (filterPills.length > 0) {
        variables = variables.filter(v => {
          return filterPills.some(pill => {
            if (pill.type === "datatype") {
              return v.dataType === pill.value;
            } else if (pill.type === "category") {
              return v.category === pill.value;
            } else if (pill.type === "tag") {
              const varTags = (v as any).systemTags || [];
              return varTags.includes(pill.value);
            } else if (pill.type === "required") {
              return (v as any).isRequired === true;
            }
            return false;
          });
        });
      }
    }

    return variables;
  }, [filterPills, searchQuery, configuration.libraryVariables, filterMode]);

  // Handle filter input change
  const handleFilterInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilterInputValue(value);
    setSelectedDropdownIndex(0);
  }, []);

  // Handle filter popup open
  const handleFilterButtonClick = useCallback(() => {
    setIsFilterPopupOpen(true);
    setTimeout(() => {
      filterInputRef.current?.focus();
    }, 100);
  }, []);

  // Handle filter popup close
  const handleFilterPopupClose = useCallback(() => {
    setIsFilterPopupOpen(false);
    setFilterInputValue("");
  }, []);

  // Handle keyboard navigation in filter popup
  const handleFilterKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (getDropdownOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedDropdownIndex(prev => 
          prev < getDropdownOptions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedDropdownIndex(prev => 
          prev > 0 ? prev - 1 : getDropdownOptions.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (getDropdownOptions[selectedDropdownIndex]) {
          const option = getDropdownOptions[selectedDropdownIndex];
          addFilterPill(option.type, option.label, option.value, option.color);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleFilterPopupClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleFilterPopupClose();
    } else if (e.key === "Backspace" && !filterInputValue && filterPills.length > 0) {
      e.preventDefault();
      // Remove last pill
      removeFilterPill(filterPills[filterPills.length - 1].id);
    }
  }, [getDropdownOptions, selectedDropdownIndex, filterInputValue, filterPills, addFilterPill, removeFilterPill, handleFilterPopupClose]);

  // Update dropdown position for filter popup
  useEffect(() => {
    if (isFilterPopupOpen && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        x: rect.right - 400, // Align right side of popup with button
        y: rect.bottom + 8
      });
    }
  }, [isFilterPopupOpen, filterPills]);

  // Scroll selected option into view
  useEffect(() => {
    if (isFilterPopupOpen && filterDropdownRef.current) {
      const selectedElement = filterDropdownRef.current.querySelector(`[data-index="${selectedDropdownIndex}"]`);
      selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedDropdownIndex, isFilterPopupOpen]);

  const filteredVariables = getFilteredVariables();
  
  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templateLibrary;
    
    const query = searchQuery.toLowerCase();
    return templateLibrary.filter(t =>
      t.name.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  }, [templateLibrary, searchQuery]);
  
  // Determine what to show based on viewMode
  const shouldShowVariables = viewMode === "variables" || viewMode === "all";
  const shouldShowTemplates = viewMode === "templates" || viewMode === "all";
  
  // Handlers for templates
  const handleEditTemplate = (id: string) => {
    // TODO: Implement template editing
    console.log("Edit template:", id);
  };
  
  const handleLinkTemplate = (id: string) => {
    // TODO: Implement template linking
    console.log("Link template:", id);
  };
  
  const handleDeleteTemplate = (id: string) => {
    const template = templateLibrary.find(t => t.id === id);
    if (template && confirm(`Delete template "${template.name}"? This will remove it from the library.`)) {
      // TODO: Add deleteTemplateLibraryItem function call when implementing delete
      console.log("Delete template:", id);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-muted/5 border-r border-border">
        {/* Header with Search and Action Buttons */}
        <div className="flex-shrink-0 border-b border-border bg-muted/20">
          <div className="px-3 py-2.5 space-y-2">
            {/* Search bar with buttons */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search variables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-8 text-[11px] bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              
              {/* Three-state view toggle */}
              <div className="flex items-center rounded-md border border-border overflow-hidden bg-background">
                <button
                  onClick={() => setViewMode("variables")}
                  className={`h-8 px-2.5 text-[10px] transition-all duration-200 border-r border-border ${
                    viewMode === "variables"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Variables
                </button>
                <button
                  onClick={() => setViewMode("templates")}
                  className={`h-8 px-2.5 text-[10px] transition-all duration-200 border-r border-border ${
                    viewMode === "templates"
                      ? "bg-purple-500/10 text-purple-400"
                      : "bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Templates
                </button>
                <button
                  onClick={() => setViewMode("all")}
                  className={`h-8 px-2.5 text-[10px] transition-all duration-200 ${
                    viewMode === "all"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  All
                </button>
              </div>
              
              <Button
                ref={filterButtonRef}
                onClick={handleFilterButtonClick}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 relative"
              >
                <Filter className="h-3.5 w-3.5" />
                {filterPills.length > 0 && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center">
                    {filterPills.length}
                  </div>
                )}
              </Button>
            </div>

            {/* Active filters display */}
            {filterPills.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap animate-fadeIn">
                {filterPills.map((pill) => {
                  const getPillStyle = () => {
                    if (pill.type === "datatype") {
                      return "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25";
                    } else if (pill.type === "category") {
                      return pill.color ? `border ${pill.color} hover:opacity-80` : "bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25";
                    } else if (pill.type === "tag") {
                      return pill.color ? `border ${pill.color} hover:opacity-80` : "bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25";
                    } else if (pill.type === "required") {
                      return "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25";
                    } else {
                      return "bg-muted/50 text-foreground border-border hover:bg-muted";
                    }
                  };

                  return (
                    <Badge
                      key={pill.id}
                      variant="outline"
                      className={`h-5 px-1.5 text-[10px] cursor-pointer transition-all duration-200 group variable-filter-pill ${getPillStyle()}`}
                      onClick={() => removeFilterPill(pill.id)}
                    >
                      {pill.label}
                      <X className="h-2.5 w-2.5 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </Badge>
                  );
                })}
                <button
                  onClick={clearAllFilters}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Flat Variable List */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col h-full">
            <div className="p-3 pb-2 flex-shrink-0">
              {/* Action buttons header */}
              <div className="flex items-center gap-2 mb-3 px-2">
                <Button
                  onClick={handleNewFieldClick}
                  size="sm"
                  className="h-7 px-2.5 text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-1"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New Field
                </Button>
                <Button
                  onClick={() => createNewTemplate()}
                  size="sm"
                  className="h-7 px-2.5 text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 flex-1"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New Template
                </Button>
              </div>

              {/* Count sub-header */}
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] text-muted-foreground">
                  {viewMode === "variables" && `${filteredVariables.length} variable${filteredVariables.length !== 1 ? 's' : ''}`}
                  {viewMode === "templates" && `${filteredTemplates.length} template${filteredTemplates.length !== 1 ? 's' : ''}`}
                  {viewMode === "all" && `${filteredVariables.length + filteredTemplates.length} item${(filteredVariables.length + filteredTemplates.length) !== 1 ? 's' : ''}`}
                  {(searchQuery || filterPills.length > 0) && viewMode === "variables" && ` (filtered from ${configuration.libraryVariables.length})`}
                  {(searchQuery) && viewMode === "templates" && ` (filtered from ${templateLibrary.length})`}
                </span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-3 pb-3">
                {/* Variables section */}
                {shouldShowVariables && filteredVariables.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {viewMode === "all" && (
                      <div className="px-2 mb-2">
                        <h3 className="text-[10px] font-medium text-blue-400">Variables</h3>
                      </div>
                    )}
                    <div className="space-y-1 variable-library-content">
                      {filteredVariables.map((variable, index) => (
                        <div
                          key={variable.id}
                          className="variable-pill-wrapper"
                          style={{
                            animationDelay: `${index * 20}ms`,
                            '--pill-index': index
                          } as React.CSSProperties}
                        >
                          <VariablePill
                            variable={variable}
                            onEdit={handleEditVariable}
                            onLink={handleLinkVariable}
                            onDelete={(id) => {
                              if (confirm(`Delete variable "${variable.displayName}"? This will remove it from all templates.`)) {
                                deleteLibraryVariable(id);
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Templates section */}
                {shouldShowTemplates && filteredTemplates.length > 0 && (
                  <div className="space-y-2">
                    {viewMode === "all" && (
                      <div className="px-2 mb-2">
                        <h3 className="text-[10px] font-medium text-purple-400">Templates</h3>
                      </div>
                    )}
                    <div className="space-y-1">
                      {filteredTemplates.map((template, index) => (
                        <div
                          key={template.id}
                          className="variable-pill-wrapper"
                          style={{
                            animationDelay: `${index * 20}ms`,
                            '--pill-index': index
                          } as React.CSSProperties}
                        >
                          <TemplatePill
                            template={template}
                            onEdit={handleEditTemplate}
                            onLink={handleLinkTemplate}
                            onDelete={handleDeleteTemplate}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty states */}
                {((viewMode === "variables" && filteredVariables.length === 0) ||
                  (viewMode === "templates" && filteredTemplates.length === 0) ||
                  (viewMode === "all" && filteredVariables.length === 0 && filteredTemplates.length === 0)) && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="font-medium text-sm mb-1">
                      {searchQuery || filterPills.length > 0
                        ? `No ${viewMode === "variables" ? "variables" : viewMode === "templates" ? "templates" : "items"} found`
                        : `No ${viewMode === "variables" ? "variables" : viewMode === "templates" ? "templates" : "items"} yet`}
                    </h3>
                    <p className="text-[10px] text-muted-foreground text-center max-w-[200px] mb-4">
                      {searchQuery || filterPills.length > 0
                        ? `No ${viewMode === "variables" ? "variables" : viewMode === "templates" ? "templates" : "items"} match your search or filters. Try adjusting your criteria.`
                        : `Get started by creating your first ${viewMode === "variables" ? "variable" : viewMode === "templates" ? "template" : "variable or template"}.`}
                    </p>
                    {(searchQuery || filterPills.length > 0) && (
                      <Button
                        onClick={() => {
                          setSearchQuery("");
                          clearAllFilters();
                        }}
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-[10px] hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 transition-all duration-200"
                      >
                        <X className="h-3 w-3 mr-1.5" />
                        Clear All
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ScrollArea>
      </div>

      {/* Filter Popup Portal */}
      {isFilterPopupOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[99998]" 
            onClick={handleFilterPopupClose}
            style={{ pointerEvents: 'auto' }}
          />
          
          {/* Filter Popup */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[99999] w-[400px] flex flex-col rounded-md border border-border bg-popover shadow-lg variable-filter-panel variable-filter-dropdown"
            style={{
              left: `${dropdownPosition.x}px`,
              top: `${dropdownPosition.y}px`,
              pointerEvents: 'auto',
            }}
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-3 pb-2 border-b border-border/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-medium">Filter Variables</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFilterPopupClose();
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted/50 rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Filter Mode Toggle */}
              {filterPills.length > 1 && (
                <div className="mb-2 flex items-center gap-2 p-1.5 rounded bg-muted/20 border border-border/50">
                  <span className="text-[9px] text-muted-foreground">Match:</span>
                  <div className="flex gap-1 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterMode("OR");
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[9px] transition-all duration-200 ${
                        filterMode === "OR"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Split className="h-3 w-3" />
                      <span>ANY</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterMode("AND");
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[9px] transition-all duration-200 ${
                        filterMode === "AND"
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Combine className="h-3 w-3" />
                      <span>ALL</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Filter Mode Description */}
              {filterPills.length > 1 && (
                <div className="mb-2 px-2 py-1.5 rounded bg-muted/10 border border-border/30">
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    {filterMode === "OR" ? (
                      <>Show variables that match <span className="text-blue-400 font-medium">any</span> of the selected filters</>
                    ) : (
                      <>Show variables that match <span className="text-purple-400 font-medium">all</span> selected filters</>
                    )}
                  </p>
                </div>
              )}

              {/* Active filter pills in popup */}
              {filterPills.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap p-2 rounded bg-muted/30">
                  {filterPills.map((pill) => {
                    const getPillStyle = () => {
                      if (pill.type === "datatype") {
                        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
                      } else if (pill.type === "category") {
                        return pill.color ? `border ${pill.color}` : "bg-purple-500/15 text-purple-400 border-purple-500/30";
                      } else if (pill.type === "tag") {
                        return pill.color ? `border ${pill.color}` : "bg-purple-500/15 text-purple-400 border-purple-500/30";
                      } else if (pill.type === "required") {
                        return "bg-green-500/15 text-green-400 border-green-500/30";
                      }
                      return "bg-muted/50 text-foreground border-border";
                    };

                    return (
                      <Badge
                        key={pill.id}
                        variant="outline"
                        className={`h-5 px-1.5 text-[10px] cursor-pointer transition-all duration-200 group ${getPillStyle()}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFilterPill(pill.id);
                        }}
                      >
                        {pill.label}
                        <X className="h-2.5 w-2.5 ml-1 opacity-60 group-hover:opacity-100" />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Search Input - Fixed */}
            <div className="flex-shrink-0 px-3 pt-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  ref={filterInputRef}
                  type="text"
                  placeholder="Search filters..."
                  value={filterInputValue}
                  onChange={handleFilterInputChange}
                  onKeyDown={handleFilterKeyDown}
                  className="h-8 pl-8 text-[11px] bg-background"
                />
              </div>
            </div>

            {/* Filter options - Scrollable with max height */}
            <div className="overflow-hidden px-3 pb-2 max-h-[240px]" ref={filterDropdownRef}>
              <ScrollArea className="h-full max-h-[240px]">
                <div className="space-y-0.5 pr-3">
                  {getDropdownOptions.map((option, index) => {
                    const Icon = option.icon;
                    const isSelected = index === selectedDropdownIndex;
                    
                    return (
                      <div
                        key={`${option.type}-${option.value}`}
                        data-index={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          addFilterPill(option.type, option.label, option.value, option.color);
                        }}
                        className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-all duration-200 variable-filter-option ${
                          isSelected ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-muted/50'
                        }`}
                      >
                        {Icon && (
                          <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-muted-foreground'}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          {option.color ? (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${option.color}`}>
                              {option.label}
                            </Badge>
                          ) : (
                            <span className={`text-[11px] ${isSelected ? 'text-blue-400 font-medium' : 'text-foreground'}`}>
                              {option.label}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50 flex-shrink-0">
                          {option.type === "datatype" ? "Type" : option.type === "category" ? "Category" : option.type === "tag" ? "Tag" : "Filter"}
                        </div>
                      </div>
                    );
                  })}
                  
                  {getDropdownOptions.length === 0 && (
                    <div className="px-2 py-4 text-center">
                      <p className="text-[11px] text-muted-foreground">No more filters available</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Footer with keyboard hints - Fixed */}
            <div className="flex-shrink-0 px-3 py-2 border-t border-border/50">
              <p className="text-[9px] text-muted-foreground">
                <kbd className="px-1 py-0.5 rounded bg-muted text-[8px]">↑↓</kbd> Navigate • 
                <kbd className="px-1 py-0.5 rounded bg-muted text-[8px] ml-1">Enter</kbd> Select • 
                <kbd className="px-1 py-0.5 rounded bg-muted text-[8px] ml-1">Esc</kbd> Close
              </p>
            </div>
          </div>
        </>,
        document.body
      )}



      {/* Configure Variable Modal */}
      {activeCategory && (
        <ConfigureVariableModal
          isOpen={isDefinitionModalOpen}
          onClose={() => {
            setIsDefinitionModalOpen(false);
            setActiveCategory(null);
            setEditingVariableId(null);
          }}
          category={activeCategory}
          editingVariable={editingVariableId ? configuration.libraryVariables.find(v => v.id === editingVariableId) : null}
          onSave={handleSaveVariable}
          onUpdate={handleUpdateVariable}
        />
      )}
    </>
  );
}