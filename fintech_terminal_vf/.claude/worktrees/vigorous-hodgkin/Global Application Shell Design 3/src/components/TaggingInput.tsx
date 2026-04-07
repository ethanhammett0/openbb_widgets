import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Building2, File, Folder, User, Hash, CheckSquare } from "lucide-react";

interface TaggingInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
}

interface TagItem {
  type: "deal" | "file" | "folder" | "person" | "topic" | "task";
  name: string;
  id: string;
  subtitle?: string;
}

// Mock data for all tag types
const MOCK_DEALS: TagItem[] = [
  { type: "deal", name: "Project Northstar", id: "d1", subtitle: "Venture Debt" },
  { type: "deal", name: "Riverside Apartments", id: "d2", subtitle: "Real Estate" },
  { type: "deal", name: "Metro Office Tower", id: "d3", subtitle: "Corporate Lending" },
  { type: "deal", name: "Phoenix Tech Acquisition", id: "d4", subtitle: "Growth Equity" },
  { type: "deal", name: "Sierra Energy Project", id: "d5", subtitle: "Infrastructure" },
];

const MOCK_FILES: TagItem[] = [
  { type: "file", name: "Financial_Model.xlsx", id: "f1" },
  { type: "file", name: "Property_Photos.zip", id: "f2" },
  { type: "file", name: "Lease_Agreement.pdf", id: "f3" },
  { type: "file", name: "Investment_Memo.docx", id: "f4" },
  { type: "file", name: "Due_Diligence_Report.pdf", id: "f5" },
];

const MOCK_FOLDERS: TagItem[] = [
  { type: "folder", name: "Due Diligence", id: "fo1" },
  { type: "folder", name: "Financial Reports", id: "fo2" },
  { type: "folder", name: "Legal Documents", id: "fo3" },
  { type: "folder", name: "Market Research", id: "fo4" },
];

const MOCK_PEOPLE: TagItem[] = [
  { type: "person", name: "Sarah Chen", id: "p1", subtitle: "Investment Director" },
  { type: "person", name: "Michael Rodriguez", id: "p2", subtitle: "Asset Manager" },
  { type: "person", name: "Emily Zhang", id: "p3", subtitle: "Analyst" },
  { type: "person", name: "David Thompson", id: "p4", subtitle: "Legal Counsel" },
  { type: "person", name: "Jennifer Walsh", id: "p5", subtitle: "Portfolio Manager" },
  { type: "person", name: "Robert Kim", id: "p6", subtitle: "Development Manager" },
];

const MOCK_TOPICS: TagItem[] = [
  { type: "topic", name: "due-diligence", id: "t1" },
  { type: "topic", name: "financing", id: "t2" },
  { type: "topic", name: "legal-review", id: "t3" },
  { type: "topic", name: "construction", id: "t4" },
  { type: "topic", name: "valuation", id: "t5" },
  { type: "topic", name: "risk-assessment", id: "t6" },
];

const MOCK_TASKS: TagItem[] = [
  { type: "task", name: "Initial Review", id: "task1", subtitle: "Preliminary Screening" },
  { type: "task", name: "Financial Analysis", id: "task2", subtitle: "Underwrite" },
  { type: "task", name: "Site Visit", id: "task3", subtitle: "Due Diligence" },
  { type: "task", name: "Legal Review", id: "task4", subtitle: "Documentation" },
  { type: "task", name: "Term Sheet Negotiation", id: "task5", subtitle: "Term Sheet" },
];

// Parse text to identify pills
// Format: [+Deal:Name], [+File:Name], [+Folder:Name], [@Person:Name], [#Topic:Name], [<Task:Name]
function parseTextWithPills(text: string): Array<{ 
  type: 'text' | 'pill'; 
  content: string; 
  pillType?: 'deal' | 'file' | 'folder' | 'person' | 'topic' | 'task';
  pillName?: string;
}> {
  const parts: Array<{ 
    type: 'text' | 'pill'; 
    content: string; 
    pillType?: 'deal' | 'file' | 'folder' | 'person' | 'topic' | 'task';
    pillName?: string;
  }> = [];
  
  const regex = /\[([+@#<])(Deal|File|Folder|Person|Topic|Task):([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the pill
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    // Add the pill
    const prefix = match[1];
    const category = match[2];
    const name = match[3];
    
    let pillType: 'deal' | 'file' | 'folder' | 'person' | 'topic' | 'task' = 'deal';
    
    if (category === 'Deal') pillType = 'deal';
    else if (category === 'File') pillType = 'file';
    else if (category === 'Folder') pillType = 'folder';
    else if (category === 'Person') pillType = 'person';
    else if (category === 'Topic') pillType = 'topic';
    else if (category === 'Task') pillType = 'task';

    parts.push({ 
      type: 'pill', 
      content: match[0],
      pillType,
      pillName: name
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}

export function TaggingInput({
  placeholder,
  value,
  onChange,
  onKeyDown,
  className = "",
  minHeight = 40,
  maxHeight = 100
}: TaggingInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [triggerChar, setTriggerChar] = useState<"+" | "@" | "#" | "<" | null>(null);
  const [searchText, setSearchText] = useState("");
  const [triggerIndex, setTriggerIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  // Get items based on trigger character
  const getItemsForTrigger = useCallback((trigger: "+" | "@" | "#" | "<"): TagItem[] => {
    switch (trigger) {
      case "+":
        return [...MOCK_DEALS, ...MOCK_FILES, ...MOCK_FOLDERS];
      case "@":
        return MOCK_PEOPLE;
      case "#":
        return MOCK_TOPICS;
      case "<":
        return MOCK_TASKS;
      default:
        return [];
    }
  }, []);

  const filteredItems = triggerChar 
    ? getItemsForTrigger(triggerChar).filter(item => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        return item.name.toLowerCase().includes(search) || 
               (item.subtitle && item.subtitle.toLowerCase().includes(search));
      })
    : [];

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart;
    
    onChange(newValue);
    
    // Find last trigger character before cursor
    const beforeCursor = newValue.slice(0, cursor);
    const lastPlus = beforeCursor.lastIndexOf("+");
    const lastAt = beforeCursor.lastIndexOf("@");
    const lastHash = beforeCursor.lastIndexOf("#");
    const lastLt = beforeCursor.lastIndexOf("<");
    
    const triggers = [
      { char: "+" as const, index: lastPlus },
      { char: "@" as const, index: lastAt },
      { char: "#" as const, index: lastHash },
      { char: "<" as const, index: lastLt }
    ];
    
    const mostRecent = triggers.reduce((prev, curr) => 
      curr.index > prev.index ? curr : prev
    );
    
    if (mostRecent.index >= 0 && textareaRef.current) {
      const afterTrigger = beforeCursor.slice(mostRecent.index + 1);
      
      // Only show if no spaces/newlines after trigger, and not inside a pill
      const beforeTrigger = beforeCursor.slice(0, mostRecent.index);
      const lastOpenBracket = beforeTrigger.lastIndexOf('[');
      const lastCloseBracket = beforeTrigger.lastIndexOf(']');
      const isInsidePill = lastOpenBracket > lastCloseBracket;
      
      if (!isInsidePill && !/[\s\n]/.test(afterTrigger)) {
        // Calculate dropdown position - positioned above the textarea
        const rect = textareaRef.current.getBoundingClientRect();
        const dropdownHeight = 240;
        setDropdownPos({
          x: rect.left,
          y: rect.top - dropdownHeight - 8
        });
        
        setTriggerChar(mostRecent.char);
        setSearchText(afterTrigger);
        setTriggerIndex(mostRecent.index);
        setSelectedIndex(0);
        setShowDropdown(true);
        return;
      }
    }
    
    setShowDropdown(false);
  }, [onChange]);

  const insertTag = useCallback((item: TagItem) => {
    if (!textareaRef.current || triggerChar === null) return;
    
    const textarea = textareaRef.current;
    const cursor = textarea.selectionStart;
    
    // Create the tag syntax based on item type
    let tagText = "";
    if (item.type === "deal") tagText = `[+Deal:${item.name}]`;
    else if (item.type === "file") tagText = `[+File:${item.name}]`;
    else if (item.type === "folder") tagText = `[+Folder:${item.name}]`;
    else if (item.type === "person") tagText = `[@Person:${item.name}]`;
    else if (item.type === "topic") tagText = `[#Topic:${item.name}]`;
    else if (item.type === "task") tagText = `[<Task:${item.name}]`;
    
    const before = value.slice(0, triggerIndex);
    const after = value.slice(cursor);
    const newValue = before + tagText + " " + after;
    
    onChange(newValue);
    setShowDropdown(false);
    setTriggerChar(null);
    
    setTimeout(() => {
      const newCursor = before.length + tagText.length + 1;
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  }, [value, triggerIndex, triggerChar, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        insertTag(filteredItems[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowDropdown(false);
        setTriggerChar(null);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        insertTag(filteredItems[selectedIndex]);
        return;
      }
    }
    
    onKeyDown?.(e);
  }, [showDropdown, filteredItems, selectedIndex, insertTag, onKeyDown]);

  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tagging-dropdown') && !target.closest('.tagging-input-wrapper')) {
        setShowDropdown(false);
        setTriggerChar(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const getIcon = (type: TagItem['type']) => {
    switch (type) {
      case "deal": return <Building2 className="h-3 w-3 text-blue-400" />;
      case "file": return <File className="h-3 w-3 text-green-400" />;
      case "folder": return <Folder className="h-3 w-3 text-yellow-400" />;
      case "person": return <User className="h-3 w-3 text-purple-400" />;
      case "topic": return <Hash className="h-3 w-3 text-orange-400" />;
      case "task": return <CheckSquare className="h-3 w-3 text-cyan-400" />;
    }
  };

  const handlePillClick = (pillName: string, pillType: 'deal' | 'file' | 'folder' | 'person' | 'topic' | 'task') => {
    console.log(`Clicked ${pillType}: ${pillName}`);
  };

  const getPillStyles = (pillType: 'deal' | 'file' | 'folder' | 'person' | 'topic' | 'task') => {
    switch (pillType) {
      case 'deal':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30';
      case 'file':
        return 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30';
      case 'folder':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30';
      case 'person':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30';
      case 'topic':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30';
      case 'task':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30';
    }
  };

  const getTypeLabel = (type: TagItem['type']): string => {
    switch (type) {
      case 'deal': return 'Deal';
      case 'file': return 'File';
      case 'folder': return 'Folder';
      case 'person': return 'Person';
      case 'topic': return 'Topic';
      case 'task': return 'Task';
    }
  };

  // Render content with pills for display layer
  const renderDisplayContent = () => {
    if (!value && !isFocused) {
      return <span className="text-muted-foreground pointer-events-none">{placeholder}</span>;
    }
    
    if (!value) return null;
    
    const parts = parseTextWithPills(value);
    
    return parts.map((part, index) => {
      if (part.type === 'text') {
        return part.content.split('\n').map((line, lineIndex, arr) => (
          <span key={`${index}-${lineIndex}`}>
            {line}
            {lineIndex < arr.length - 1 && <br />}
          </span>
        ));
      } else {
        // Render pill
        return (
          <span
            key={index}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (part.pillName && part.pillType) {
                handlePillClick(part.pillName, part.pillType);
              }
            }}
            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border cursor-pointer transition-all duration-200 text-[10px] leading-none align-middle ${getPillStyles(part.pillType!)}`}
            style={{ 
              verticalAlign: 'baseline',
              userSelect: 'none',
              marginLeft: '1px',
              marginRight: '1px'
            }}
          >
            {part.pillType === 'deal' && <Building2 className="h-2 w-2" />}
            {part.pillType === 'file' && <File className="h-2 w-2" />}
            {part.pillType === 'folder' && <Folder className="h-2 w-2" />}
            {part.pillType === 'person' && <User className="h-2 w-2" />}
            {part.pillType === 'topic' && <Hash className="h-2 w-2" />}
            {part.pillType === 'task' && <CheckSquare className="h-2 w-2" />}
            <span className="font-medium whitespace-nowrap">{part.pillName}</span>
          </span>
        );
      }
    });
  };

  return (
    <>
      <div className="relative w-full tagging-input-wrapper">
        {/* Display layer with pills - positioned behind textarea */}
        <div
          ref={displayRef}
          onClick={() => textareaRef.current?.focus()}
          className={`absolute inset-0 w-full rounded-md border border-muted bg-card px-3 py-2 text-foreground overflow-hidden pointer-events-none ${className}`}
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
            fontSize: '13px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            zIndex: 1
          }}
        >
          <div className="pointer-events-auto" style={{ cursor: 'text' }}>
            {renderDisplayContent()}
          </div>
        </div>

        {/* Actual textarea - made transparent to show display layer behind */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`relative w-full resize-none rounded-md border border-muted bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'transparent',
            caretColor: 'var(--foreground)',
            zIndex: 2
          }}
        />
      </div>
      
      {showDropdown && filteredItems.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          className="tagging-dropdown fixed bg-[#0a0a0a]/95 backdrop-blur-xl border border-zinc-800 rounded-md shadow-2xl overflow-hidden animate-browse-menu-slide-in"
          style={{
            left: `${dropdownPos.x}px`,
            top: `${dropdownPos.y}px`,
            zIndex: 9999,
            minWidth: '280px',
            maxWidth: '360px',
            maxHeight: '240px',
            transformOrigin: 'bottom center'
          }}
        >
          <div className="px-2 py-1.5 border-b border-zinc-800 bg-zinc-900/50">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
              {triggerChar === '+' && 'Deals, Files & Folders'}
              {triggerChar === '@' && 'People'}
              {triggerChar === '#' && 'Topics'}
              {triggerChar === '<' && 'Tasks'}
            </div>
          </div>
          <div className="overflow-y-auto max-h-[200px] py-1">
            {filteredItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => insertTag(item)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-900 transition-colors animate-browse-menu-item-fade ${
                  index === selectedIndex ? 'bg-zinc-900' : ''
                }`}
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="flex-shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-200 truncate font-medium">{item.name}</div>
                  {item.subtitle && (
                    <div className="text-[10px] text-zinc-500 truncate">{item.subtitle}</div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wider">
                    {getTypeLabel(item.type)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
