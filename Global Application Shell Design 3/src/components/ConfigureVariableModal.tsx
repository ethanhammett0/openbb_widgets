import { useState, useEffect } from "react";
import { X, Search, Key, Link2, Plus, Tag, Check, CalendarIcon, Sparkles, Copy, CheckCircle, Users, Building2, FileText, DollarSign, BarChart3, Upload, Download, Trash2, ArrowUpDown, GripVertical, Edit2, CheckCheck, SplitSquareVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { VariableDataType, DataModelField, LibraryCategory, DATA_MODEL_FIELDS, LIBRARY_CATEGORIES } from "./types/TemplateBuilderTypes";
import { format } from "date-fns";
import { toast } from "sonner@2.0.3";

// Category icons mapping
const categoryIcons = {
  entity: Users,
  asset: Building2,
  contract: FileText,
  loan: DollarSign,
  quantitative: BarChart3,
};

// Dropdown preset templates
const DROPDOWN_PRESETS = [
  {
    id: 'sp-ratings',
    name: 'S&P Credit Ratings',
    options: ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-', 'CC', 'C', 'D']
  },
  {
    id: 'moodys-ratings',
    name: 'Moody\'s Credit Ratings',
    options: ['Aaa', 'Aa1', 'Aa2', 'Aa3', 'A1', 'A2', 'A3', 'Baa1', 'Baa2', 'Baa3', 'Ba1', 'Ba2', 'Ba3', 'B1', 'B2', 'B3', 'Caa1', 'Caa2', 'Caa3', 'Ca', 'C']
  },
  {
    id: 'property-types',
    name: 'Property Types',
    options: ['Office', 'Retail', 'Multifamily', 'Industrial', 'Hospitality', 'Mixed-Use', 'Healthcare', 'Student Housing', 'Self-Storage', 'Data Center', 'Life Science', 'Land']
  },
  {
    id: 'asset-class',
    name: 'Asset Classes',
    options: ['Class A', 'Class B', 'Class C', 'Class D', 'Trophy', 'Core', 'Core+', 'Value-Add', 'Opportunistic']
  },
  {
    id: 'us-states',
    name: 'US States',
    options: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming']
  },
  {
    id: 'deal-status',
    name: 'Deal Status',
    options: ['Pipeline', 'Under Review', 'Due Diligence', 'Negotiation', 'Approved', 'Closed', 'On Hold', 'Rejected', 'Terminated']
  },
  {
    id: 'priority',
    name: 'Priority Levels',
    options: ['Critical', 'High', 'Medium', 'Low']
  },
  {
    id: 'yes-no',
    name: 'Yes/No',
    options: ['Yes', 'No']
  },
  {
    id: 'yes-no-na',
    name: 'Yes/No/N/A',
    options: ['Yes', 'No', 'N/A']
  }
];

// Predefined system tags for categorization
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

interface ConfigureVariableModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: LibraryCategory;
  editingVariable?: {
    id: string;
    displayName: string;
    dataType: VariableDataType;
    systemTags?: string[];
    category: LibraryCategory;
    isRequired?: boolean;
    minValue?: number;
    maxValue?: number;
    decimalPlaces?: number;
    dropdownOptions?: string[];
    definition?: string;
    sourceOfTruth?: string[];
    sourceDetail?: string;
    tags?: string[];
  } | null;
  onSave: (variable: {
    displayName: string;
    dataType: VariableDataType;
    systemTags?: string[];
    category: LibraryCategory;
    // Validation rules
    isRequired?: boolean;
    minValue?: number;
    maxValue?: number;
    decimalPlaces?: number;
    dropdownOptions?: string[];
    // Documentation
    definition?: string;
    sourceOfTruth?: string[];
    sourceDetail?: string;
    tags?: string[];
  }) => void;
  onUpdate?: (id: string, variable: {
    displayName: string;
    dataType: VariableDataType;
    systemTags?: string[];
    category: LibraryCategory;
    isRequired?: boolean;
    minValue?: number;
    maxValue?: number;
    decimalPlaces?: number;
    dropdownOptions?: string[];
    definition?: string;
    sourceOfTruth?: string[];
    sourceDetail?: string;
    tags?: string[];
  }) => void;
}

export function ConfigureVariableModal({
  isOpen,
  onClose,
  category,
  editingVariable,
  onSave,
  onUpdate,
}: ConfigureVariableModalProps) {
  const isEditMode = !!editingVariable;
  const [activeTab, setActiveTab] = useState("general");
  
  // General tab state
  const [selectedCategory, setSelectedCategory] = useState<LibraryCategory>(category);
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [dataType, setDataType] = useState<VariableDataType>("Text");
  const [systemTags, setSystemTags] = useState<string[]>([]);
  const [tagSearchOpen, setTagSearchOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [customTags, setCustomTags] = useState<typeof SYSTEM_TAGS>([]);

  // Validation Rules tab state
  const [isRequired, setIsRequired] = useState(false);
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");
  const [decimalPlaces, setDecimalPlaces] = useState<string>("2");
  
  // Date validation state
  const [earliestDate, setEarliestDate] = useState<Date | undefined>(undefined);
  const [latestDate, setLatestDate] = useState<Date | undefined>(undefined);
  const [earliestDateOpen, setEarliestDateOpen] = useState(false);
  const [latestDateOpen, setLatestDateOpen] = useState(false);
  
  // Text validation state
  const [minCharLength, setMinCharLength] = useState<string>("");
  const [maxCharLength, setMaxCharLength] = useState<string>("");
  
  // Pattern matching state
  const [patternMode, setPatternMode] = useState<'common' | 'builder' | 'generate'>('common');
  const [commonFormat, setCommonFormat] = useState<string>("");
  const [builderStartsWith, setBuilderStartsWith] = useState<string>("");
  const [builderContains, setBuilderContains] = useState<string>("");
  const [builderEndsWith, setBuilderEndsWith] = useState<string>("");
  const [builderCharType, setBuilderCharType] = useState<string>("any");
  const [generateExamples, setGenerateExamples] = useState<string>("");
  const [generatedRegex, setGeneratedRegex] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Dropdown options state
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [newDropdownOption, setNewDropdownOption] = useState<string>("");
  const [delimiter, setDelimiter] = useState<string>('comma');
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [editingOptionValue, setEditingOptionValue] = useState<string>("");
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [bulkInputMode, setBulkInputMode] = useState(false);
  const [bulkInputText, setBulkInputText] = useState<string>("");

  // Documentation tab state
  const [definition, setDefinition] = useState("");
  const [sourceOfTruth, setSourceOfTruth] = useState<string[]>([]);
  const [sourceDetail, setSourceDetail] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newSource, setNewSource] = useState("");

  // Load editing variable data when modal opens
  useEffect(() => {
    if (isOpen && editingVariable) {
      setSelectedCategory(editingVariable.category);
      setDisplayName(editingVariable.displayName);
      setDataType(editingVariable.dataType);
      setSystemTags(editingVariable.systemTags || []);
      setIsRequired(editingVariable.isRequired || false);
      setMinValue(editingVariable.minValue?.toString() || "");
      setMaxValue(editingVariable.maxValue?.toString() || "");
      setDecimalPlaces(editingVariable.decimalPlaces?.toString() || "2");
      setDropdownOptions(editingVariable.dropdownOptions || []);
      setDefinition(editingVariable.definition || "");
      setSourceOfTruth(editingVariable.sourceOfTruth || []);
      setSourceDetail(editingVariable.sourceDetail || "");
      setTags(editingVariable.tags || []);
    } else if (isOpen && !editingVariable) {
      // Reset form for new variable
      setSelectedCategory(category);
      setDisplayName("");
      setDataType("Text");
      setSystemTags([]);
      setIsRequired(false);
      setMinValue("");
      setMaxValue("");
      setDecimalPlaces("2");
      setEarliestDate(undefined);
      setLatestDate(undefined);
      setMinCharLength("");
      setMaxCharLength("");
      setPatternMode("common");
      setCommonFormat("");
      setBuilderStartsWith("");
      setBuilderContains("");
      setBuilderEndsWith("");
      setBuilderCharType("any");
      setGenerateExamples("");
      setGeneratedRegex("");
      setDropdownOptions([]);
      setNewDropdownOption("");
      setDefinition("");
      setSourceOfTruth([]);
      setSourceDetail("");
      setTags([]);
      setNewTag("");
      setNewSource("");
      setCustomTags([]);
      setActiveTab("general");
    }
  }, [isOpen, editingVariable, category]);

  // Auto-generate API Key from display name
  useEffect(() => {
    if (displayName && !isEditMode) {
      const generated = displayName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 40);
      setApiKey(generated);
    } else if (displayName && isEditMode) {
      // Keep existing API key in edit mode, but update if displayName changes
      const generated = displayName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 40);
      setApiKey(generated);
    } else {
      setApiKey("");
    }
  }, [displayName, isEditMode]);

  const handleSave = () => {
    if (!displayName.trim()) return;

    const variableData = {
      displayName: displayName.trim(),
      dataType,
      systemTags: systemTags.length > 0 ? systemTags : undefined,
      category: selectedCategory,
      // Validation rules
      isRequired,
      minValue: minValue ? parseFloat(minValue) : undefined,
      maxValue: maxValue ? parseFloat(maxValue) : undefined,
      decimalPlaces: decimalPlaces ? parseInt(decimalPlaces) : undefined,
      dropdownOptions: dropdownOptions.length > 0 ? dropdownOptions : undefined,
      // Documentation
      definition: definition.trim() || undefined,
      sourceOfTruth: sourceOfTruth.length > 0 ? sourceOfTruth : undefined,
      sourceDetail: sourceDetail.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    if (isEditMode && editingVariable && onUpdate) {
      onUpdate(editingVariable.id, variableData);
    } else {
      onSave(variableData);
    }

    handleReset();
    onClose();
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedCategory(category);
    setDisplayName("");
    setApiKey("");
    setDataType("Text");
    setSystemTags([]);
    setTagSearchQuery("");
    setIsRequired(false);
    setMinValue("");
    setMaxValue("");
    setDecimalPlaces("2");
    setEarliestDate(undefined);
    setLatestDate(undefined);
    setEarliestDateOpen(false);
    setLatestDateOpen(false);
    setMinCharLength("");
    setMaxCharLength("");
    setPatternMode('common');
    setCommonFormat("");
    setBuilderStartsWith("");
    setBuilderContains("");
    setBuilderEndsWith("");
    setBuilderCharType("any");
    setGenerateExamples("");
    setGeneratedRegex("");
    setIsGenerating(false);
    setDropdownOptions([]);
    setNewDropdownOption("");
    setDelimiter('comma');
    setEditingOptionIndex(null);
    setEditingOptionValue("");
    setPresetMenuOpen(false);
    setBulkInputMode(false);
    setBulkInputText("");
    setDefinition("");
    setSourceOfTruth([]);
    setSourceDetail("");
    setTags([]);
    setNewTag("");
    setNewSource("");
    setActiveTab("general");
  };

  const toggleSystemTag = (tagId: string) => {
    if (systemTags.includes(tagId)) {
      setSystemTags(systemTags.filter(t => t !== tagId));
    } else {
      setSystemTags([...systemTags, tagId]);
    }
  };

  const removeSystemTag = (tagId: string) => {
    setSystemTags(systemTags.filter(t => t !== tagId));
  };

  // Generate random color for custom tags
  const generateRandomColor = () => {
    const colors = [
      "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "bg-green-500/20 text-green-400 border-green-500/30",
      "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      "bg-orange-500/20 text-orange-400 border-orange-500/30",
      "bg-pink-500/20 text-pink-400 border-pink-500/30",
      "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
      "bg-teal-500/20 text-teal-400 border-teal-500/30",
      "bg-rose-500/20 text-rose-400 border-rose-500/30",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const createCustomTag = (label: string) => {
    const newTagId = `custom-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const newTag = {
      id: newTagId,
      label: label,
      color: generateRandomColor()
    };
    setCustomTags([...customTags, newTag]);
    setSystemTags([...systemTags, newTagId]);
    setTagSearchQuery("");
    setTagSearchOpen(false);
  };

  // Combine system tags and custom tags for filtering
  const allTags = [...SYSTEM_TAGS, ...customTags];
  
  const filteredSystemTags = allTags.filter(tag => 
    tag.label.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  // Check if search query doesn't match any existing tags
  const canCreateNewTag = tagSearchQuery.trim().length > 0 && 
    !allTags.some(tag => tag.label.toLowerCase() === tagSearchQuery.toLowerCase());

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const addSource = () => {
    if (newSource.trim() && !sourceOfTruth.includes(newSource.trim())) {
      setSourceOfTruth([...sourceOfTruth, newSource.trim()]);
      setNewSource("");
    }
  };

  const removeSource = (source: string) => {
    setSourceOfTruth(sourceOfTruth.filter(s => s !== source));
  };

  const addDropdownOption = () => {
    if (newDropdownOption.trim() && !dropdownOptions.includes(newDropdownOption.trim())) {
      setDropdownOptions([...dropdownOptions, newDropdownOption.trim()]);
      setNewDropdownOption("");
    }
  };

  const removeDropdownOption = (option: string) => {
    setDropdownOptions(dropdownOptions.filter(o => o !== option));
  };

  const handleDropdownOptionKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDropdownOption();
    }
  };

  // Handle paste for multiple options with dynamic delimiter detection
  const handleDropdownPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Determine delimiter pattern
    let delimiterPattern: RegExp;
    switch(delimiter) {
      case 'comma':
        delimiterPattern = /[,]+/;
        break;
      case 'semicolon':
        delimiterPattern = /[;]+/;
        break;
      case 'pipe':
        delimiterPattern = /[|]+/;
        break;
      case 'tab':
        delimiterPattern = /[\t]+/;
        break;
      case 'newline':
        delimiterPattern = /[\n\r]+/;
        break;
      case 'auto':
      default:
        // Auto-detect: try multiple delimiters
        delimiterPattern = /[,;\n\r\t|]+/;
        break;
    }
    
    const options = pastedText
      .split(delimiterPattern)
      .map(option => option.trim())
      .filter(option => option.length > 0 && !dropdownOptions.includes(option));
    
    if (options.length > 0) {
      setDropdownOptions([...dropdownOptions, ...options]);
      setNewDropdownOption("");
      toast.success(`Pasted ${options.length} option${options.length !== 1 ? 's' : ''}`);
    } else {
      toast.info('No new options to add');
    }
  };

  // Bulk input processing
  const processBulkInput = () => {
    let delimiterPattern: RegExp;
    switch(delimiter) {
      case 'comma':
        delimiterPattern = /[,]+/;
        break;
      case 'semicolon':
        delimiterPattern = /[;]+/;
        break;
      case 'pipe':
        delimiterPattern = /[|]+/;
        break;
      case 'tab':
        delimiterPattern = /[\t]+/;
        break;
      case 'newline':
        delimiterPattern = /[\n\r]+/;
        break;
      case 'auto':
      default:
        delimiterPattern = /[,;\n\r\t|]+/;
        break;
    }
    
    const options = bulkInputText
      .split(delimiterPattern)
      .map(option => option.trim())
      .filter(option => option.length > 0);
    
    const newOptionsCount = options.filter(opt => !dropdownOptions.includes(opt)).length;
    
    // Remove duplicates and merge with existing
    const uniqueOptions = Array.from(new Set([...dropdownOptions, ...options]));
    setDropdownOptions(uniqueOptions);
    setBulkInputText("");
    setBulkInputMode(false);
    
    toast.success(`Added ${newOptionsCount} new option${newOptionsCount !== 1 ? 's' : ''}`);
  };

  // Clear all options
  const clearAllOptions = () => {
    const count = dropdownOptions.length;
    setDropdownOptions([]);
    toast.success(`Cleared ${count} option${count !== 1 ? 's' : ''}`);
  };

  // Sort options alphabetically
  const sortOptions = () => {
    setDropdownOptions([...dropdownOptions].sort((a, b) => a.localeCompare(b)));
    toast.success('Options sorted alphabetically');
  };

  // Remove duplicates
  const removeDuplicates = () => {
    const originalLength = dropdownOptions.length;
    const uniqueOptions = Array.from(new Set(dropdownOptions));
    setDropdownOptions(uniqueOptions);
    const removedCount = originalLength - uniqueOptions.length;
    if (removedCount > 0) {
      toast.success(`Removed ${removedCount} duplicate${removedCount !== 1 ? 's' : ''}`);
    } else {
      toast.info('No duplicates found');
    }
  };

  // Load preset template
  const loadPreset = (presetId: string) => {
    const preset = DROPDOWN_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const newOptionsCount = preset.options.filter(opt => !dropdownOptions.includes(opt)).length;
      // Merge with existing options and remove duplicates
      const uniqueOptions = Array.from(new Set([...dropdownOptions, ...preset.options]));
      setDropdownOptions(uniqueOptions);
      setPresetMenuOpen(false);
      toast.success(`Loaded "${preset.name}" (${newOptionsCount} new option${newOptionsCount !== 1 ? 's' : ''})`);
    }
  };

  // Export options to clipboard
  const exportToClipboard = () => {
    const exportText = dropdownOptions.join(delimiter === 'newline' ? '\n' : delimiter === 'tab' ? '\t' : delimiter === 'pipe' ? '|' : delimiter === 'semicolon' ? ';' : ',');
    navigator.clipboard.writeText(exportText);
    toast.success(`Copied ${dropdownOptions.length} option${dropdownOptions.length !== 1 ? 's' : ''} to clipboard`);
  };

  // Start editing an option
  const startEditingOption = (index: number) => {
    setEditingOptionIndex(index);
    setEditingOptionValue(dropdownOptions[index]);
  };

  // Save edited option
  const saveEditedOption = () => {
    if (editingOptionIndex !== null && editingOptionValue.trim()) {
      const oldValue = dropdownOptions[editingOptionIndex];
      const newOptions = [...dropdownOptions];
      newOptions[editingOptionIndex] = editingOptionValue.trim();
      setDropdownOptions(newOptions);
      setEditingOptionIndex(null);
      setEditingOptionValue("");
      toast.success(`Updated "${oldValue}" to "${editingOptionValue.trim()}"`);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingOptionIndex(null);
    setEditingOptionValue("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Variable' : 'Create New Variable'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the variable configuration, validation rules, and documentation' 
              : 'Define a new variable with validation rules and documentation'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="text-[11px]">General</TabsTrigger>
            <TabsTrigger value="validation" className="text-[11px]">Validation Rules</TabsTrigger>
            <TabsTrigger value="documentation" className="text-[11px]">Documentation</TabsTrigger>
          </TabsList>

          {/* GENERAL TAB */}
          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Category Selection */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Variable Category *</Label>
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as LibraryCategory)}>
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIBRARY_CATEGORIES.map((cat) => {
                    const Icon = categoryIcons[cat.id];
                    return (
                      <SelectItem key={cat.id} value={cat.id} className="text-[11px]">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Display Name *</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Sponsor Legal Name, Property Address"
                className="h-8 text-[11px]"
                autoFocus
              />
            </div>

            {/* API Key (auto-generated) */}
            <div className="space-y-1.5">
              <Label className="text-[11px] flex items-center gap-1">
                <Key className="h-3 w-3" />
                API Key (Auto-generated)
              </Label>
              <div className="relative">
                <Input
                  value={apiKey}
                  readOnly
                  className="h-8 text-[11px] font-mono bg-muted/30 text-muted-foreground pr-8"
                />
                <Key className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <p className="text-[9px] text-muted-foreground">
                This key is automatically generated from the display name
              </p>
            </div>

            {/* Data Type */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Data Type *</Label>
              <Select value={dataType} onValueChange={(value) => setDataType(value as VariableDataType)}>
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Text" className="text-[11px]">Text</SelectItem>
                  <SelectItem value="Date" className="text-[11px]">Date</SelectItem>
                  <SelectItem value="Currency" className="text-[11px]">Currency</SelectItem>
                  <SelectItem value="Dropdown" className="text-[11px]">Dropdown</SelectItem>
                  <SelectItem value="Lookup" className="text-[11px]">Lookup</SelectItem>
                  <SelectItem value="Array" className="text-[11px]">Array (Nested Table)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* System Tags (Multi-Select) */}
            <div className="space-y-1.5">
              <Label className="text-[11px] flex items-center gap-1">
                <Tag className="h-3 w-3" />
                System Tags (Optional)
              </Label>
              <Popover open={tagSearchOpen} onOpenChange={setTagSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-8 text-[11px]"
                  >
                    <span className={systemTags.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                      {systemTags.length > 0 
                        ? `${systemTags.length} tag${systemTags.length === 1 ? '' : 's'} selected` 
                        : "Add categorization tags..."}
                    </span>
                    <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search tags..." 
                      className="h-8 text-[11px]"
                      value={tagSearchQuery}
                      onValueChange={setTagSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty className="text-[11px] py-4">No tags found.</CommandEmpty>
                      <CommandGroup>
                        {filteredSystemTags.map((tag) => (
                          <CommandItem
                            key={tag.id}
                            value={tag.label}
                            onSelect={() => toggleSystemTag(tag.id)}
                            className="text-[11px] cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div className={`w-3 h-3 rounded-sm border ${systemTags.includes(tag.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30'} flex items-center justify-center`}>
                                {systemTags.includes(tag.id) && (
                                  <Check className="h-2 w-2 text-primary-foreground" />
                                )}
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] px-2 py-0.5 border ${tag.color}`}
                              >
                                {tag.label}
                              </Badge>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      
                      {/* Create New Tag Option */}
                      {canCreateNewTag && (
                        <CommandGroup>
                          <CommandItem
                            value={`create-${tagSearchQuery}`}
                            onSelect={() => createCustomTag(tagSearchQuery)}
                            className="text-[11px] cursor-pointer border-t border-border/50"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-3 h-3 rounded-sm border border-dashed border-primary/50 flex items-center justify-center">
                                <Plus className="h-2 w-2 text-primary" />
                              </div>
                              <span className="text-primary">Create "{tagSearchQuery}"</span>
                            </div>
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Selected Tags Display */}
              {systemTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-muted/30 rounded border border-border">
                  {systemTags.map((tagId) => {
                    const tag = allTags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <Badge
                        key={tagId}
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 gap-1 border ${tag.color}`}
                      >
                        {tag.label}
                        <X
                          className="h-2.5 w-2.5 cursor-pointer hover:text-destructive transition-colors ml-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            removeSystemTag(tagId);
                          }}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
              
              <p className="text-[9px] text-muted-foreground">
                Tags help group and filter variables across templates. Select multiple tags for better organization.
              </p>
            </div>
          </TabsContent>

          {/* VALIDATION RULES TAB */}
          <TabsContent value="validation" className="space-y-4 mt-4">
            {/* Required Field - Always visible */}
            <div className="flex items-center space-x-2 p-3 rounded border border-border bg-muted/10 transition-all duration-200 hover:bg-muted/20 hover:border-blue-500/20">
              <Checkbox
                id="required"
                checked={isRequired}
                onCheckedChange={(checked) => setIsRequired(checked as boolean)}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <Label htmlFor="required" className="text-[11px] cursor-pointer">
                  Required Field
                </Label>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  This field must have a value before saving
                </p>
              </div>
            </div>

            {/* DROPDOWN OPTIONS - For Dropdown data type */}
            {dataType === "Dropdown" && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <span className="text-[10px] text-muted-foreground px-2 font-medium">Dropdown Options</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>

                {/* Control Bar */}
                <div className="flex items-center gap-2">
                  {/* Delimiter Selection */}
                  <div className="flex-1">
                    <Select value={delimiter} onValueChange={setDelimiter}>
                      <SelectTrigger className="h-7 text-[10px]">
                        <SplitSquareVertical className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto" className="text-[10px]">Auto-detect</SelectItem>
                        <SelectItem value="comma" className="text-[10px]">Comma (,)</SelectItem>
                        <SelectItem value="semicolon" className="text-[10px]">Semicolon (;)</SelectItem>
                        <SelectItem value="pipe" className="text-[10px]">Pipe (|)</SelectItem>
                        <SelectItem value="tab" className="text-[10px]">Tab</SelectItem>
                        <SelectItem value="newline" className="text-[10px]">New Line</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preset Templates */}
                  <Popover open={presetMenuOpen} onOpenChange={setPresetMenuOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]">
                        <Upload className="h-3 w-3 mr-1" />
                        Templates
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-2" align="start">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground px-2 py-1">Load preset options:</p>
                        {DROPDOWN_PRESETS.map((preset) => (
                          <Button
                            key={preset.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-7 text-[10px] font-normal"
                            onClick={() => loadPreset(preset.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-2 text-muted-foreground" />
                            {preset.name}
                            <span className="ml-auto text-[9px] text-muted-foreground">
                              {preset.options.length}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Bulk Input Toggle */}
                  <Button
                    variant={bulkInputMode ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => setBulkInputMode(!bulkInputMode)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Bulk
                  </Button>
                </div>

                {/* Bulk Input Mode */}
                {bulkInputMode ? (
                  <div className="space-y-2 p-3 border border-blue-500/30 rounded-md bg-blue-500/5">
                    <Label className="text-[11px] text-blue-400">Bulk Input Mode</Label>
                    <Textarea
                      value={bulkInputText}
                      onChange={(e) => setBulkInputText(e.target.value)}
                      placeholder={`Paste or type multiple options separated by ${
                        delimiter === 'comma' ? 'commas' :
                        delimiter === 'semicolon' ? 'semicolons' :
                        delimiter === 'pipe' ? 'pipes' :
                        delimiter === 'tab' ? 'tabs' :
                        delimiter === 'newline' ? 'new lines' :
                        'any delimiter'
                      }...`}
                      className="text-[11px] min-h-[100px] font-mono"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={processBulkInput}
                        size="sm"
                        className="h-7 text-[10px] flex-1"
                        disabled={!bulkInputText.trim()}
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Process & Add
                      </Button>
                      <Button
                        onClick={() => {
                          setBulkInputMode(false);
                          setBulkInputText("");
                        }}
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      Duplicates will be automatically removed
                    </p>
                  </div>
                ) : (
                  /* Single Input Mode */
                  <div className="space-y-2">
                    <Label className="text-[11px]">Add Selection Options</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newDropdownOption}
                        onChange={(e) => setNewDropdownOption(e.target.value)}
                        onKeyPress={handleDropdownOptionKeyPress}
                        onPaste={handleDropdownPaste}
                        placeholder="Type option and press Enter (or paste multiple)"
                        className="h-8 text-[11px] flex-1"
                      />
                      <Button
                        onClick={addDropdownOption}
                        size="sm"
                        className="h-8 px-3 text-[11px]"
                        disabled={!newDropdownOption.trim()}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      Paste multiple options using the selected delimiter, or use Bulk mode for large lists
                    </p>
                  </div>
                )}

                {/* Display dropdown options */}
                {dropdownOptions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px]">
                        Options ({dropdownOptions.length})
                      </Label>
                      {/* Action Buttons */}
                      <div className="flex gap-1">
                        <Button
                          onClick={sortOptions}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[9px]"
                          title="Sort alphabetically"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={removeDuplicates}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[9px]"
                          title="Remove duplicates"
                        >
                          <CheckCheck className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={exportToClipboard}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[9px]"
                          title="Copy to clipboard"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={clearAllOptions}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[9px] text-red-400 hover:text-red-300"
                          title="Clear all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto border border-border rounded-md p-2 bg-muted/5">
                      <div className="flex flex-wrap gap-1.5">
                        {dropdownOptions.map((option, index) => (
                          <div key={index}>
                            {editingOptionIndex === index ? (
                              <div className="inline-flex items-center gap-1 px-2 py-1 border border-blue-500/50 bg-blue-500/10 rounded">
                                <Input
                                  value={editingOptionValue}
                                  onChange={(e) => setEditingOptionValue(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      saveEditedOption();
                                    } else if (e.key === 'Escape') {
                                      cancelEditing();
                                    }
                                  }}
                                  className="h-5 w-24 text-[10px] px-1 border-none bg-transparent focus-visible:ring-0"
                                  autoFocus
                                />
                                <Check
                                  className="h-3 w-3 cursor-pointer text-green-400 hover:text-green-300 transition-colors"
                                  onClick={saveEditedOption}
                                />
                                <X
                                  className="h-3 w-3 cursor-pointer text-red-400 hover:text-red-300 transition-colors"
                                  onClick={cancelEditing}
                                />
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-1 gap-1.5 border bg-orange-500/5 border-orange-500/20 text-orange-400 hover:bg-orange-500/10 transition-colors group"
                              >
                                {option}
                                <Edit2
                                  className="h-2.5 w-2.5 cursor-pointer opacity-0 group-hover:opacity-100 hover:text-blue-400 transition-all ml-0.5"
                                  onClick={() => startEditingOption(index)}
                                />
                                <X
                                  className="h-2.5 w-2.5 cursor-pointer hover:text-red-400 transition-colors"
                                  onClick={() => removeDropdownOption(option)}
                                />
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {dropdownOptions.length === 0 && (
                  <div className="p-4 rounded-md border border-dashed border-border/50 bg-muted/5 text-center">
                    <p className="text-[10px] text-muted-foreground">
                      No options added yet. Add options manually, paste from clipboard, use bulk mode, or load a template.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* NUMERIC RANGE - For Number, Currency, Percentage */}
            {(dataType === "Number" || dataType === "Currency" || dataType === "Percentage") && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <span className="text-[10px] text-muted-foreground px-2 font-medium">Numeric Range</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 group">
                    <Label className="text-[11px] transition-colors group-focus-within:text-blue-400">
                      Min Value
                    </Label>
                    <div className="relative">
                      {dataType === "Currency" && (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                          $
                        </span>
                      )}
                      <Input
                        type="number"
                        value={minValue}
                        onChange={(e) => setMinValue(e.target.value)}
                        placeholder={dataType === "Currency" ? "0.00" : dataType === "Percentage" ? "0" : "0"}
                        step={decimalPlaces === "0" ? "1" : `0.${"0".repeat(parseInt(decimalPlaces) - 1)}1`}
                        className={`h-8 text-[11px] transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 ${dataType === "Currency" ? "pl-6" : ""}`}
                      />
                      {dataType === "Percentage" && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                          %
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 group">
                    <Label className="text-[11px] transition-colors group-focus-within:text-blue-400">
                      Max Value
                    </Label>
                    <div className="relative">
                      {dataType === "Currency" && (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                          $
                        </span>
                      )}
                      <Input
                        type="number"
                        value={maxValue}
                        onChange={(e) => setMaxValue(e.target.value)}
                        placeholder={dataType === "Currency" ? "1,000,000.00" : dataType === "Percentage" ? "100" : "1000000"}
                        step={decimalPlaces === "0" ? "1" : `0.${"0".repeat(parseInt(decimalPlaces) - 1)}1`}
                        className={`h-8 text-[11px] transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 ${dataType === "Currency" ? "pl-6" : ""}`}
                      />
                      {dataType === "Percentage" && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                          %
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px]">Allowed Decimal Places</Label>
                  <Select value={decimalPlaces} onValueChange={setDecimalPlaces}>
                    <SelectTrigger className="h-8 text-[11px] transition-all duration-200 hover:border-blue-500/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" className="text-[11px]">0 (Whole numbers)</SelectItem>
                      <SelectItem value="2" className="text-[11px]">2 (Default)</SelectItem>
                      <SelectItem value="4" className="text-[11px]">4 (High precision)</SelectItem>
                      <SelectItem value="6" className="text-[11px]">6 (Very high precision)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground">
                    Number of decimal places to display and store
                  </p>
                </div>
              </div>
            )}

            {/* DATE RANGE - For Date */}
            {dataType === "Date" && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <span className="text-[10px] text-muted-foreground px-2 font-medium">Date Range</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Earliest Date</Label>
                    <Popover open={earliestDateOpen} onOpenChange={setEarliestDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-8 justify-start text-left text-[11px] transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/5"
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                          {earliestDate ? format(earliestDate, "MMM dd, yyyy") : <span className="text-muted-foreground">Select date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={earliestDate}
                          onSelect={(date) => {
                            setEarliestDate(date);
                            setEarliestDateOpen(false);
                          }}
                          disabled={(date) => latestDate ? date > latestDate : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Latest Date</Label>
                    <Popover open={latestDateOpen} onOpenChange={setLatestDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-8 justify-start text-left text-[11px] transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/5"
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                          {latestDate ? format(latestDate, "MMM dd, yyyy") : <span className="text-muted-foreground">Select date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={latestDate}
                          onSelect={(date) => {
                            setLatestDate(date);
                            setLatestDateOpen(false);
                          }}
                          disabled={(date) => earliestDate ? date < earliestDate : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}

            {/* CHARACTER RULES - For Text/String */}
            {dataType === "Text" && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <span className="text-[10px] text-muted-foreground px-2 font-medium">Character Rules</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Min Length</Label>
                    <Input
                      type="number"
                      value={minCharLength}
                      onChange={(e) => setMinCharLength(e.target.value)}
                      placeholder="e.g., 5"
                      min="0"
                      step="1"
                      className="h-8 text-[11px] transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Max Length</Label>
                    <Input
                      type="number"
                      value={maxCharLength}
                      onChange={(e) => setMaxCharLength(e.target.value)}
                      placeholder="e.g., 255"
                      min="0"
                      step="1"
                      className="h-8 text-[11px] transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Pattern Matching - AI-Powered */}
                <div className="space-y-3 p-3 border border-border/50 rounded bg-muted/5 transition-all duration-200">
                  <Label className="text-[11px] text-muted-foreground">Pattern Matching</Label>
                  
                  {/* Segmented Control */}
                  <div className="flex gap-1 p-1 bg-muted/30 rounded border border-border/30">
                    <button
                      type="button"
                      onClick={() => setPatternMode('common')}
                      className={`flex-1 px-3 py-1.5 text-[10px] rounded transition-all duration-200 ${
                        patternMode === 'common'
                          ? 'bg-background text-foreground shadow-sm border border-border/50'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                      }`}
                    >
                      Common
                    </button>
                    <button
                      type="button"
                      onClick={() => setPatternMode('builder')}
                      className={`flex-1 px-3 py-1.5 text-[10px] rounded transition-all duration-200 ${
                        patternMode === 'builder'
                          ? 'bg-background text-foreground shadow-sm border border-border/50'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                      }`}
                    >
                      Builder
                    </button>
                    <button
                      type="button"
                      onClick={() => setPatternMode('generate')}
                      className={`flex-1 px-3 py-1.5 text-[10px] rounded transition-all duration-200 flex items-center justify-center gap-1 ${
                        patternMode === 'generate'
                          ? 'bg-background text-foreground shadow-sm border border-border/50'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      Generate
                    </button>
                  </div>

                  {/* Common Mode */}
                  {patternMode === 'common' && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <Label className="text-[10px]">Format Template</Label>
                      <Select value={commonFormat} onValueChange={setCommonFormat}>
                        <SelectTrigger className="h-8 text-[10px] transition-all duration-200 focus:ring-2 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select a common format..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cusip" className="text-[10px]">
                            <div className="flex items-center justify-between w-full">
                              <span>CUSIP</span>
                              <span className="text-[9px] text-muted-foreground ml-4">9 characters</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="isin" className="text-[10px]">
                            <div className="flex items-center justify-between w-full">
                              <span>ISIN</span>
                              <span className="text-[9px] text-muted-foreground ml-4">12 characters</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ticker" className="text-[10px]">
                            <div className="flex items-center justify-between w-full">
                              <span>Ticker Symbol</span>
                              <span className="text-[9px] text-muted-foreground ml-4">1-5 uppercase</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="url" className="text-[10px]">
                            <div className="flex items-center justify-between w-full">
                              <span>URL</span>
                              <span className="text-[9px] text-muted-foreground ml-4">Valid web address</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="email" className="text-[10px]">
                            <div className="flex items-center justify-between w-full">
                              <span>Email Address</span>
                              <span className="text-[9px] text-muted-foreground ml-4">Standard format</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="phone" className="text-[10px]">
                            <div className="flex items-center justify-between w-full">
                              <span>Phone Number</span>
                              <span className="text-[9px] text-muted-foreground ml-4">US format</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {commonFormat && (
                        <p className="text-[9px] text-blue-400 bg-blue-500/5 border border-blue-500/20 rounded px-2 py-1 mt-2">
                          ✓ Template applied: {commonFormat.toUpperCase()} validation rules
                        </p>
                      )}
                    </div>
                  )}

                  {/* Builder Mode */}
                  {patternMode === 'builder' && (
                    <div className="space-y-3 animate-fadeIn">
                      <p className="text-[10px] text-muted-foreground">Construct a Rule</p>
                      
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Starts with...</Label>
                          <Input
                            value={builderStartsWith}
                            onChange={(e) => setBuilderStartsWith(e.target.value)}
                            placeholder="e.g., PROP-"
                            className="h-8 text-[10px] transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-[10px]">Contains...</Label>
                          <Input
                            value={builderContains}
                            onChange={(e) => setBuilderContains(e.target.value)}
                            placeholder="e.g., -2024-"
                            className="h-8 text-[10px] transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-[10px]">Ends with...</Label>
                          <Input
                            value={builderEndsWith}
                            onChange={(e) => setBuilderEndsWith(e.target.value)}
                            placeholder="e.g., -FINAL"
                            className="h-8 text-[10px] transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-[10px]">Character Type</Label>
                          <Select value={builderCharType} onValueChange={setBuilderCharType}>
                            <SelectTrigger className="h-8 text-[10px] transition-all duration-200 focus:ring-2 focus:ring-blue-500/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any" className="text-[10px]">Any</SelectItem>
                              <SelectItem value="alphanumeric" className="text-[10px]">Alphanumeric only</SelectItem>
                              <SelectItem value="letters" className="text-[10px]">Letters only</SelectItem>
                              <SelectItem value="numbers" className="text-[10px]">Numbers only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {(builderStartsWith || builderContains || builderEndsWith) && (
                        <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded">
                          <p className="text-[9px] text-muted-foreground mb-1">Preview Pattern:</p>
                          <code className="text-[9px] text-blue-400 font-mono">
                            {builderStartsWith && `^${builderStartsWith}`}
                            {builderContains && `.*${builderContains}.*`}
                            {builderEndsWith && `${builderEndsWith}$`}
                          </code>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Generate Mode */}
                  {patternMode === 'generate' && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                        <p className="text-[10px] text-muted-foreground">Generate Rule from Examples</p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-[10px]">
                          Paste at least 3-5 examples of the required data format, each on a new line.
                        </Label>
                        <Textarea
                          value={generateExamples}
                          onChange={(e) => setGenerateExamples(e.target.value)}
                          placeholder={"Example:\nPROP-2024-001-NYC\nPROP-2024-002-LAX\nPROP-2024-003-CHI"}
                          className="min-h-[100px] text-[10px] font-mono resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <p className="text-[9px] text-muted-foreground">
                          {generateExamples.split('\n').filter(line => line.trim()).length} examples provided
                        </p>
                      </div>
                      
                      <Button
                        type="button"
                        onClick={() => {
                          setIsGenerating(true);
                          // Simulate AI generation
                          setTimeout(() => {
                            // Generate a simple regex based on the examples
                            const lines = generateExamples.split('\n').filter(line => line.trim());
                            if (lines.length > 0) {
                              // Simple pattern detection - in production this would be an AI call
                              const firstLine = lines[0];
                              if (firstLine.match(/^[A-Z]{4}-\d{4}-\d{3}-[A-Z]{3}$/)) {
                                setGeneratedRegex('^[A-Z]{4}-\\d{4}-\\d{3}-[A-Z]{3}$');
                              } else {
                                setGeneratedRegex('^[A-Z0-9]{4,20}(-[A-Z0-9]+)*$');
                              }
                            }
                            setIsGenerating(false);
                          }, 1500);
                        }}
                        disabled={generateExamples.split('\n').filter(line => line.trim()).length < 3 || isGenerating}
                        className="w-full h-8 text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating ? (
                          <>
                            <Sparkles className="h-3 w-3 mr-1.5 animate-spin" />
                            Analyzing patterns...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-1.5" />
                            Generate Rule
                          </>
                        )}
                      </Button>
                      
                      {generatedRegex && (
                        <div className="space-y-2 p-3 bg-muted/30 border border-border/50 rounded animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] text-blue-400">Suggested Regex</Label>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedRegex);
                              }}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="relative">
                            <Input
                              value={generatedRegex}
                              readOnly
                              className="h-9 text-[10px] font-mono bg-background border-border/50 pr-20"
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                // Apply the generated regex
                                // In production, this would update the validation rules
                              }}
                              className="absolute right-1 top-1 h-7 px-2 text-[9px] bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Apply Rule
                            </Button>
                          </div>
                          <p className="text-[9px] text-muted-foreground">
                            This regex pattern was generated based on your examples. Test it before applying.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded transition-all duration-200 hover:bg-blue-500/10 hover:border-blue-500/30">
              <p className="text-[10px] text-blue-400">
                💡 Validation rules ensure data quality and consistency. Rules are applied based on the variable's selected data type.
              </p>
            </div>
          </TabsContent>

          {/* DOCUMENTATION TAB */}
          <TabsContent value="documentation" className="space-y-4 mt-4">
            {/* Definition */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Definition</Label>
              <Textarea
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="Provide a clear definition of this variable and its purpose..."
                className="min-h-[80px] text-[11px] resize-none"
              />
              <p className="text-[9px] text-muted-foreground">
                This helps team members understand when and how to use this field
              </p>
            </div>

            {/* Source of Truth */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Source of Truth</Label>
              <div className="flex gap-2">
                <Input
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSource())}
                  placeholder="e.g., Operating Agreement, Section 4.2"
                  className="h-8 text-[11px]"
                />
                <Button
                  type="button"
                  onClick={addSource}
                  size="sm"
                  className="h-8 px-3"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {sourceOfTruth.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded border border-border">
                  {sourceOfTruth.map((source, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-[10px] px-2 py-0.5 gap-1"
                    >
                      <Link2 className="h-2.5 w-2.5" />
                      {source}
                      <X
                        className="h-2.5 w-2.5 cursor-pointer hover:text-destructive transition-colors"
                        onClick={() => removeSource(source)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-[9px] text-muted-foreground">
                Document where this information should be sourced from
              </p>
            </div>

            {/* Additional Notes */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Additional Notes</Label>
              <Textarea
                value={sourceDetail}
                onChange={(e) => setSourceDetail(e.target.value)}
                placeholder="Add any additional context, edge cases, or special instructions..."
                className="min-h-[60px] text-[11px] resize-none"
              />
            </div>

            {/* Custom Tags */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Custom Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add custom tags for organization..."
                  className="h-8 text-[11px]"
                />
                <Button
                  type="button"
                  onClick={addTag}
                  size="sm"
                  className="h-8 px-3"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded border border-border">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-[10px] px-2 py-0.5 gap-1"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                      <X
                        className="h-2.5 w-2.5 cursor-pointer hover:text-destructive transition-colors"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-[9px] text-muted-foreground">
                Add custom tags for easier searching and filtering
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="h-8 text-[11px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!displayName.trim()}
            className="h-8 text-[11px]"
          >
            {isEditMode ? 'Update Variable' : 'Save Variable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
