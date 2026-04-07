import { useState, useRef, useEffect } from "react";
import { FileText, StickyNote, Settings, X, Plus, GripVertical, ChevronRight, ChevronDown, Lock, Unlock, Eye, Search, ChevronUp, ChevronLeft, Reply, MessageSquareMore, Send, MoreVertical, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Avatar, AvatarContent, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { UniversalComboboxField } from "./UniversalComboboxField";
import { TaggingInput } from "./TaggingInput";
import { VariableConfigurationModal } from "./VariableConfigurationModal";
import { TemplateBuilderProvider } from "./contexts/TemplateBuilderContext";

interface AnalysisPanelProps {
  dealName: string;
  onCollapse?: () => void;
  onSendMessage?: (message: string) => void;
  chatMessages?: ChatMessage[];
  isAITyping?: boolean;
}

interface Variable {
  id: string;
  name: string;
  visible: boolean;
  definition?: string;
  analyticalConsiderations?: string;
  dataType?: string;
  semanticType?: string;
  formatting?: string;
  systemKey?: string;
}

interface VariableGroup {
  id: string;
  name: string;
  variables: Variable[];
}

// Entity interfaces for intelligent combobox
interface Entity {
  id: string;
  name: string;
  type: "sponsor" | "borrower" | "guarantor" | "servicer" | "lender";
  legalName: string;
  industry?: string;
  description?: string;
}

// Comment Thread interface
interface CommentThread {
  id: string;
  quotedText?: string | null;
  initialComment: string;
  author: {
    name: string;
    initials: string;
    avatar: string | null;
  };
  timestamp: string;
  replyCount: number;
  mentions: string[];
}

// Chat Message interface
interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  capabilities?: string[];
  data?: {
    currentLTV: string;
    marketAverage: string;
    assessment: string;
  };
}

// Note interface for accordion-based notes
interface Note {
  id: string;
  author: string;
  avatar: string;
  title: string;
  content: string;
  category: string;
  categoryColor: string;
  timestamp: string;
  replies: NoteReply[];
}

interface NoteReply {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
}

export function AnalysisPanel({ 
  dealName, 
  onCollapse, 
  onSendMessage: externalOnSendMessage,
  chatMessages: externalChatMessages = [],
  isAITyping: externalIsAITyping = false
}: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState("deal-info");
  const [selectedVertical, setSelectedVertical] = useState<string>("real-estate");
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<VariableGroup | null>(null);
  const [variableConfigModalOpen, setVariableConfigModalOpen] = useState(false);
  const [editPromptModalOpen, setEditPromptModalOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const [promptDefinition, setPromptDefinition] = useState("");
  const [promptAnalyticalConsiderations, setPromptAnalyticalConsiderations] = useState("");
  const [expandedVariables, setExpandedVariables] = useState<Set<string>>(new Set(["asset-class"])); // Demo: show asset-class expanded
  
  // State for lockable input fields
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set(["sponsor", "global-loan-size"])); // Demo: sponsor and global-loan-size are locked
  
  // State for AI chat (use external if provided, otherwise internal)
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const [internalIsTyping, setInternalIsTyping] = useState(false);
  
  // State for AI chat input
  const [aiChatInput, setAIChatInput] = useState("");
  const aiChatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const messages = externalOnSendMessage ? externalChatMessages : internalMessages;
  const isTyping = externalOnSendMessage ? externalIsAITyping : internalIsTyping;

  // State for Notes
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("General");
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "note-1",
      author: "You",
      avatar: "YO",
      title: "Property Analysis",
      content: "The building's HVAC system needs updating, which could impact NOI projections. Estimated cost: $125K.",
      category: "General",
      categoryColor: "bg-blue-500",
      timestamp: "2h ago",
      replies: [
        {
          id: "reply-1-1",
          author: "Sarah M.",
          avatar: "SM",
          content: "Agreed on the HVAC concerns. Should we factor this into our term sheet negotiations?",
          timestamp: "30m ago"
        }
      ]
    },
    {
      id: "note-2",
      author: "You",
      avatar: "YO",
      title: "Cash Flow Concern",
      content: "Q3 occupancy dropped to 87%. Need to verify if this is seasonal or tenant-specific issue.",
      category: "Risk",
      categoryColor: "bg-red-500",
      timestamp: "3h ago",
      replies: []
    },
    {
      id: "note-3",
      author: "Mike R.",
      avatar: "MR",
      title: "Market comps look strong",
      content: "Market comps look strong. I think we can justify the current valuation.",
      category: "Financial",
      categoryColor: "bg-green-500",
      timestamp: "45m ago",
      replies: []
    },
    {
      id: "note-4",
      author: "You",
      avatar: "YO",
      title: "Market Comp Review",
      content: "Comparable sales in the area suggest strong value appreciation potential over next 3-5 years.",
      category: "Financial",
      categoryColor: "bg-green-500",
      timestamp: "4h ago",
      replies: []
    },
    {
      id: "note-5",
      author: "You",
      avatar: "YO",
      title: "Financing Structure",
      content: "Consider interest rate hedging strategy given current market volatility.",
      category: "General",
      categoryColor: "bg-blue-500",
      timestamp: "6h ago",
      replies: []
    },
    {
      id: "note-6",
      author: "John D.",
      avatar: "JD",
      title: "Site Visit Action Item",
      content: "Let's schedule a site visit before finalizing terms. Want to see the HVAC issues firsthand.",
      category: "Action Item",
      categoryColor: "bg-purple-500",
      timestamp: "1h ago",
      replies: []
    },
    {
      id: "note-7",
      author: "Anna L.",
      avatar: "AL",
      title: "Environmental Report Status",
      content: "Environmental report should be ready by Thursday. I'll share it as soon as it's available.",
      category: "Legal",
      categoryColor: "bg-yellow-500",
      timestamp: "2h ago",
      replies: []
    },
    {
      id: "note-8",
      author: "You",
      avatar: "YO",
      title: "Due Diligence",
      content: "Still waiting on Phase I environmental report. Expected delivery by EOW.",
      category: "Action Item",
      categoryColor: "bg-orange-500",
      timestamp: "1d ago",
      replies: []
    },
    {
      id: "note-9",
      author: "You",
      avatar: "YO",
      title: "Zoning Review",
      content: "Zoning allows for mixed-use development. Potential upside if market conditions improve.",
      category: "Legal",
      categoryColor: "bg-yellow-500",
      timestamp: "1d ago",
      replies: []
    }
  ]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
  const [resolvedNotes, setResolvedNotes] = useState<Set<string>>(new Set());
  const togglePreviewExpansion = (noteId: string) => { setExpandedPreviews(prev => { const newSet = new Set(prev); if (newSet.has(noteId)) { newSet.delete(noteId); } else { newSet.add(noteId); } return newSet; }); };
  const toggleResolveNote = (noteId: string) => { setResolvedNotes(prev => { const newSet = new Set(prev); if (newSet.has(noteId)) { newSet.delete(noteId); } else { newSet.add(noteId); } return newSet; }); };
  const [replyContent, setReplyContent] = useState("");

  // Handle adding a new note
  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;

    const categoryColors: { [key: string]: string } = {
      "General": "bg-blue-500",
      "Financial": "bg-green-500",
      "Legal": "bg-yellow-500",
      "Risk": "bg-red-500",
      "Action Item": "bg-purple-500"
    };

    const newNote: Note = {
      id: `note-${Date.now()}`,
      author: "You",
      avatar: "YO",
      title: newNoteContent.slice(0, 50) + (newNoteContent.length > 50 ? "..." : ""),
      content: newNoteContent,
      category: newNoteCategory,
      categoryColor: categoryColors[newNoteCategory] || "bg-gray-500",
      timestamp: "Just now",
      replies: []
    };

    setNotes([newNote, ...notes]);
    setNewNoteContent("");
  };

  // Handle adding a reply to a note
  const handleAddReply = (noteId: string) => {
    if (!replyContent.trim()) return;

    setNotes(notes.map(note => {
      if (note.id === noteId) {
        return {
          ...note,
          replies: [
            ...note.replies,
            {
              id: `reply-${Date.now()}`,
              author: "You",
              avatar: "YO",
              content: replyContent,
              timestamp: "Just now"
            }
          ]
        };
      }
      return note;
    }));

    setReplyContent("");
    setReplyingTo(null);
  };

  // AI response generation
  const generateAIResponse = (userMessage: string): ChatMessage => {
    const lowercaseMessage = userMessage.toLowerCase();
    
    if (lowercaseMessage.includes("ltv") || lowercaseMessage.includes("loan to value")) {
      return {
        id: `ai-${Date.now()}`,
        type: "ai",
        content: `Based on the current deal parameters for ${dealName}:`,
        timestamp: new Date(),
        data: {
          currentLTV: "68.5%",
          marketAverage: "65-75%",
          assessment: "Within Range"
        }
      };
    }
    
    if (lowercaseMessage.includes("debt yield")) {
      return {
        id: `ai-${Date.now()}`,
        type: "ai",
        content: `The debt yield of 8.2% for ${dealName} is above the typical market threshold of 7.5% for similar commercial real estate deals. This indicates strong cash flow coverage and reduced lender risk.`,
        timestamp: new Date()
      };
    }
    
    if (lowercaseMessage.includes("risk") || lowercaseMessage.includes("assessment")) {
      return {
        id: `ai-${Date.now()}`,
        type: "ai",
        content: `Key risk factors for ${dealName} include: Market concentration risk with 3 anchor tenants, environmental compliance costs, and interest rate sensitivity. Mitigation strategies include tenant diversification and rate hedging.`,
        timestamp: new Date()
      };
    }
    
    // Default response
    return {
      id: `ai-${Date.now()}`,
      type: "ai",
      content: `I can help you analyze various aspects of ${dealName}. I can provide insights on financial metrics, risk assessment, market comparisons, and more. What would you like to focus on?`,
      timestamp: new Date(),
      capabilities: [
        "Financial metrics analysis (LTV, DSCR, Debt Yield)",
        "Risk assessment and mitigation strategies", 
        "Market comparisons and valuations",
        "Cash flow projections and sensitivities"
      ]
    };
  };

  // Handle message sending
  const handleSendMessage = async (messageContent: string) => {
    if (externalOnSendMessage) {
      // Use external handler if provided (for floating input)
      externalOnSendMessage(messageContent);
      setActiveTab("ai-chat");
      return;
    }

    // Internal handling for tab-based chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: messageContent,
      timestamp: new Date()
    };

    setInternalMessages(prev => [...prev, userMessage]);
    setInternalIsTyping(true);

    // Switch to AI chat tab when a message is sent
    setActiveTab("ai-chat");

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    const aiResponse = generateAIResponse(messageContent);
    setInternalMessages(prev => [...prev, aiResponse]);
    setInternalIsTyping(false);
  };

  // AI Chat input handlers
  const handleAIChatSend = () => {
    if (!aiChatInput.trim() || isTyping) return;
    
    handleSendMessage(aiChatInput.trim());
    setAIChatInput("");
  };

  const handleAIChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAIChatSend();
    }
  };

  // Auto-scroll to bottom when messages change or typing status changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };

    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

  
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({
    "sponsor": "RedStone Capital Partners", // AI-suggested value that's been locked
    "borrower": "Metro Property Holdings LLC", // AI-suggested value (unlocked)
    "guarantors": "John Smith, RedStone Capital LLC", // AI-suggested value (unlocked)
    "deal-team": "@jdoe @msmith @alee", // AI-suggested value (unlocked)
    "business-vertical": "real-estate", // AI-suggested value (unlocked)
    "asset-class": "cre", // AI-suggested value (unlocked)
    "asset-sub-class": "non-qm", // AI-suggested value (unlocked)
    "global-loan-size": "$45,000,000", // AI-suggested value that's been locked
    "firms-expected-hold": "$12,500,000", // AI-suggested value (unlocked)
    "origination-date": "03/15/2024", // AI-suggested value (unlocked)
    "ltv": "75.5%", // AI-suggested value (unlocked)
    "ltc": "82.3%", // AI-suggested value (unlocked)
    "debt-yield": "8.2%", // AI-suggested value (unlocked)
  });

  // Document sources for Source Locator feature
  const documentSources: Record<string, Array<{ document: string; location: string }>> = {
    "sponsor": [
      { document: "Term Sheet - RedStone Capital.pdf", location: "Page 1, Line 3" },
      { document: "Investment Committee Memo.docx", location: "Page 2, Section 'Sponsor Overview'" }
    ],
    "borrower": [
      { document: "Term Sheet - RedStone Capital.pdf", location: "Page 1, Borrower Section" },
      { document: "Corporate Profile - Metro Property.pdf", location: "Page 1, Executive Summary" }
    ],
    "guarantors": [
      { document: "Personal Guaranty Agreement.pdf", location: "Page 1, Guarantor Information" },
      { document: "Financial Statements - Smith.pdf", location: "Page 1, Individual Profile" }
    ],
    "deal-team": [
      { document: "Internal Deal Assignment.docx", location: "Team Assignment Section" },
      { document: "Investment Committee Memo.docx", location: "Page 3, Deal Team" }
    ],
    "business-vertical": [
      { document: "Term Sheet - RedStone Capital.pdf", location: "Page 1, Asset Type" },
      { document: "Market Analysis Report.pdf", location: "Page 2, Industry Classification" }
    ],
    "asset-class": [
      { document: "Term Sheet - RedStone Capital.pdf", location: "Page 1, Asset Classification" },
      { document: "Property Appraisal.pdf", location: "Page 1, Property Type" }
    ],
    "asset-sub-class": [
      { document: "Property Appraisal.pdf", location: "Page 2, Sub-Classification" },
      { document: "Market Analysis Report.pdf", location: "Page 3, Asset Sub-Type" }
    ],
    "global-loan-size": [
      { document: "Term Sheet - RedStone Capital.pdf", location: "Page 1, Loan Amount Section" },
      { document: "Financial Model.xlsx", location: "Summary Tab, Cell B12" }
    ],
    "firms-expected-hold": [
      { document: "Term Sheet - RedStone Capital.pdf", location: "Page 2, Firm Allocation" },
      { document: "Investment Committee Memo.docx", location: "Page 4, Hold Amount" }
    ],
    "origination-date": [
      { document: "Term Sheet - RedStone Capital.pdf", location: "Page 1, Closing Date" },
      { document: "Timeline Document.pdf", location: "Milestone Schedule" }
    ],
    "ltv": [
      { document: "Property Appraisal.pdf", location: "Page 3, Loan-to-Value Calculation" },
      { document: "Financial Model.xlsx", location: "LTV Tab, Cell C5" }
    ],
    "ltc": [
      { document: "Construction Budget.xlsx", location: "Summary Tab, Total Cost" },
      { document: "Financial Model.xlsx", location: "LTC Tab, Cell D8" }
    ],
    "debt-yield": [
      { document: "Financial Model.xlsx", location: "Debt Yield Tab, Cell E12" },
      { document: "NOI Analysis.pdf", location: "Page 2, Debt Yield Calculation" }
    ]
  };

  // Helper function for source navigation
  const handleGoToNextSource = (fieldId: string) => {
    console.log(`Navigating to next source for field: ${fieldId}`);
    // Implementation would integrate with document viewer
  };

  // Entity combobox state management
  const [selectedEntities, setSelectedEntities] = useState<Record<string, Entity[]>>({
    sponsor: [{ id: "e1", name: "RedStone Capital Partners", type: "sponsor", legalName: "RedStone Capital Partners LLC", industry: "Real Estate Investment", description: "Private equity real estate sponsor" }],
    borrower: [{ id: "e2", name: "Metro Property Holdings", type: "borrower", legalName: "Metro Property Holdings LLC", industry: "Commercial Real Estate", description: "Commercial property investment company" }],
    guarantors: [
      { id: "e5", name: "John Smith", type: "guarantor", legalName: "John Michael Smith", industry: "Real Estate", description: "Individual guarantor" },
      { id: "e1", name: "RedStone Capital Partners", type: "sponsor", legalName: "RedStone Capital Partners LLC", industry: "Real Estate Investment", description: "Private equity real estate sponsor" }
    ]
  });

  // Entity creation modal state
  const [entityCreationModalOpen, setEntityCreationModalOpen] = useState(false);
  const [entityCreationContext, setEntityCreationContext] = useState<{ fieldId: string; fieldType: "single" | "multi" } | null>(null);
  const [newEntityForm, setNewEntityForm] = useState({
    name: "",
    legalName: "",
    type: "sponsor" as Entity["type"],
    industry: "",
    description: ""
  });
  const [entitySearchQuery, setEntitySearchQuery] = useState("");

  // Variable groups definition for configuration modal
  const [variableGroups, setVariableGroups] = useState<VariableGroup[]>([
    {
      id: "deal-classification",
      name: "Deal Classification",
      variables: [
        {
          id: "business-vertical",
          name: "Business Vertical",
          visible: true,
          definition: "The primary industry or sector that the deal operates within",
          analyticalConsiderations: "Consider the risk profile and market dynamics of the industry",
          dataType: "string",
          semanticType: "category",
          systemKey: "business_vertical"
        },
        {
          id: "asset-class",
          name: "Asset Class",
          visible: true,
          definition: "The category of asset being financed or invested in",
          analyticalConsiderations: "Analyze liquidity, volatility, and regulatory requirements",
          dataType: "string",
          semanticType: "category",
          systemKey: "asset_class"
        },
        {
          id: "asset-sub-class",
          name: "Asset Sub-Class",
          visible: true,
          definition: "More specific categorization within the asset class",
          analyticalConsiderations: "Review sub-market trends and performance metrics",
          dataType: "string",
          semanticType: "category",
          systemKey: "asset_sub_class"
        },
        {
          id: "deal-team",
          name: "Deal Team",
          visible: true,
          definition: "Internal team members assigned to this deal",
          analyticalConsiderations: "Ensure appropriate expertise and capacity allocation",
          dataType: "string",
          semanticType: "list",
          systemKey: "deal_team"
        }
      ]
    },
    {
      id: "entity-profiles",
      name: "Entity Profiles",
      variables: [
        {
          id: "sponsor",
          name: "Sponsor",
          visible: true,
          definition: "The primary sponsor or investment manager for the deal",
          analyticalConsiderations: "Evaluate track record, financial strength, and market reputation",
          dataType: "entity",
          semanticType: "sponsor",
          systemKey: "sponsor_entity"
        },
        {
          id: "borrower",
          name: "Borrower",
          visible: true,
          definition: "The entity requesting financing or investment",
          analyticalConsiderations: "Assess creditworthiness, business model, and repayment capacity",
          dataType: "entity",
          semanticType: "borrower",
          systemKey: "borrower_entity"
        },
        {
          id: "guarantors",
          name: "Guarantor(s)",
          visible: true,
          definition: "Entities providing guarantees for the obligation",
          analyticalConsiderations: "Review guarantee structure and guarantor financial capacity",
          dataType: "entity_list",
          semanticType: "guarantor",
          systemKey: "guarantor_entities"
        }
      ]
    },
    {
      id: "loan-request-details",
      name: "Loan Request Details",
      variables: [
        {
          id: "global-loan-size",
          name: "Global Loan Size",
          visible: true,
          definition: "Total size of the loan facility being requested",
          analyticalConsiderations: "Compare to market standards and sponsor capacity",
          dataType: "currency",
          semanticType: "amount",
          formatting: "currency_usd",
          systemKey: "global_loan_amount"
        },
        {
          id: "firms-expected-hold",
          name: "Firm's Expected Hold",
          visible: true,
          definition: "Expected portion of the loan to be held by our firm",
          analyticalConsiderations: "Evaluate concentration risk and portfolio impact",
          dataType: "currency",
          semanticType: "amount",
          formatting: "currency_usd",
          systemKey: "firm_hold_amount"
        },
        {
          id: "origination-date",
          name: "Origination Date",
          visible: true,
          definition: "Expected or actual date of loan origination",
          analyticalConsiderations: "Consider timing relative to market conditions",
          dataType: "date",
          semanticType: "date",
          formatting: "date_mdy",
          systemKey: "origination_date"
        }
      ]
    },
    {
      id: "vertical-specific-variables",
      name: "Vertical-Specific Variables",
      variables: [
        {
          id: "ltv",
          name: "Loan-to-Value (LTV) (%)",
          visible: true,
          definition: "Ratio of loan amount to appraised property value",
          analyticalConsiderations: "Higher LTV indicates greater leverage and risk",
          dataType: "percentage",
          semanticType: "ratio",
          formatting: "percentage_1dp",
          systemKey: "ltv_ratio"
        },
        {
          id: "ltc",
          name: "Loan-to-Cost (LTC) (%)",
          visible: true,
          definition: "Ratio of loan amount to total project cost",
          analyticalConsiderations: "Consider construction risk and cost overrun potential",
          dataType: "percentage",
          semanticType: "ratio",
          formatting: "percentage_1dp",
          systemKey: "ltc_ratio"
        },
        {
          id: "debt-yield",
          name: "Debt Yield (%)",
          visible: true,
          definition: "Net operating income divided by loan amount",
          analyticalConsiderations: "Higher debt yield indicates stronger cash flow coverage",
          dataType: "percentage",
          semanticType: "yield",
          formatting: "percentage_1dp",
          systemKey: "debt_yield"
        }
      ]
    }
  ]);

  // Helper component for lockable input fields
  const LockableInputField = ({ 
    id, 
    label, 
    placeholder, 
    value = "", 
    isLocked = false,
    hasAIValue = false 
  }: { 
    id: string; 
    label: string; 
    placeholder: string; 
    value?: string; 
    isLocked?: boolean;
    hasAIValue?: boolean;
  }) => {
    const handleLockToggle = () => {
      const newLockedFields = new Set(lockedFields);
      if (newLockedFields.has(id)) {
        newLockedFields.delete(id);
      } else {
        newLockedFields.add(id);
      }
      setLockedFields(newLockedFields);
    };

    const handleValueChange = (newValue: string) => {
      setFieldValues(prev => ({ ...prev, [id]: newValue }));
    };

    const locked = lockedFields.has(id);
    const currentValue = fieldValues[id] || value;
    const showAIIndicator = hasAIValue && !locked;
    const sources = documentSources[id] || [];
    const hasSources = sources.length > 0;

    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-xs">{label}</Label>
        <div className="flex items-center gap-1 min-w-0">
          <div className="flex-1 relative min-w-0">
            <Input 
              id={id} 
              placeholder={placeholder} 
              value={currentValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className={`h-8 border-0 border-b border-border w-full min-w-0 ${
                showAIIndicator 
                  ? 'border-b-2 border-b-yellow-400 shadow-[0_2px_8px_rgba(251,191,36,0.3)] animate-pulse' 
                  : locked 
                  ? 'border-b-2 border-b-green-500/50' 
                  : ''
              }`}
            />
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
                    onClick={() => handleGoToNextSource(id)}
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
                  onClick={handleLockToggle}
                >
                  {locked ? (
                    <Lock className="w-3 h-3 text-green-500" />
                  ) : (
                    <Unlock className="w-3 h-3 text-yellow-500" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {locked 
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
  };

  // Helper component for lockable select fields
  const LockableSelectField = ({ 
    id, 
    label, 
    placeholder,
    options,
    value = "", 
    hasAIValue = false,
    onValueChange 
  }: { 
    id: string; 
    label: string; 
    placeholder: string;
    options: { value: string; label: string }[];
    value?: string; 
    hasAIValue?: boolean;
    onValueChange?: (value: string) => void;
  }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const handleLockToggle = () => {
      const newLockedFields = new Set(lockedFields);
      if (newLockedFields.has(id)) {
        newLockedFields.delete(id);
      } else {
        newLockedFields.add(id);
      }
      setLockedFields(newLockedFields);
    };

    const handleValueChange = (newValue: string) => {
      setFieldValues(prev => ({ ...prev, [id]: newValue }));
      if (onValueChange) {
        onValueChange(newValue);
      }
    };

    const handleOptionSelect = (option: { value: string; label: string }) => {
      handleValueChange(option.value);
      setSearchQuery("");
      setIsOpen(false);
    };

    const locked = lockedFields.has(id);
    const currentValue = fieldValues[id] || value;
    const selectedOption = options.find(o => o.value === currentValue);
    const showAIIndicator = hasAIValue && !locked;
    const sources = documentSources[id] || [];
    const hasSources = sources.length > 0;

    // Filter options based on search query
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.value.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-xs">{label}</Label>
        <div className="flex items-center gap-1 min-w-0">
          <div className="flex-1 relative min-w-0">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <div 
                  className={`h-8 px-3 py-1 border-0 border-b border-border flex items-center cursor-text min-w-0 ${
                    showAIIndicator 
                      ? 'border-b-2 border-b-yellow-400 shadow-[0_2px_8px_rgba(251,191,36,0.3)] animate-pulse' 
                      : locked 
                      ? 'border-b-2 border-b-green-500/50' 
                      : ''
                  }`}
                  onClick={() => setIsOpen(true)}
                >
                  {selectedOption ? (
                    <span className="text-sm truncate flex-1 min-w-0">{selectedOption.label}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground flex-1 min-w-0">{placeholder}</span>
                  )}
                  <ChevronDown className="w-3 h-3 ml-auto flex-shrink-0 text-muted-foreground" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search options..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-7 border-0 bg-background"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                      <div
                        key={option.value}
                        className="p-3 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border last:border-b-0"
                        onClick={() => handleOptionSelect(option)}
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <div className="text-sm">No options found.</div>
                    </div>
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
                    onClick={() => handleGoToNextSource(id)}
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
                  onClick={handleLockToggle}
                >
                  {locked ? (
                    <Lock className="w-3 h-3 text-green-500" />
                  ) : (
                    <Unlock className="w-3 h-3 text-yellow-500" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {locked 
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
  };

  // Universal single-select combobox component for configuration fields
  const ConfigComboboxField = ({ 
    id, 
    label, 
    placeholder,
    options,
    value = "", 
    onValueChange
  }: { 
    id: string; 
    label: string; 
    placeholder: string;
    options: { value: string; label: string }[];
    value?: string; 
    onValueChange?: (value: string) => void;
  }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const handleOptionSelect = (option: { value: string; label: string }) => {
      if (onValueChange) {
        onValueChange(option.value);
      }
      setSearchQuery("");
      setIsOpen(false);
    };

    const selectedOption = options.find(o => o.value === value);

    // Filter options based on search query
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.value.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">{label}</Label>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div 
              className="h-8 px-3 py-1 border-0 border-b border-border flex items-center cursor-text"
              onClick={() => setIsOpen(true)}
            >
              {selectedOption ? (
                <span className="text-sm truncate">{selectedOption.label}</span>
              ) : (
                <span className="text-sm text-muted-foreground">{placeholder}</span>
              )}
              <ChevronDown className="w-3 h-3 ml-auto text-muted-foreground" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-7 border-0 bg-background"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className="p-3 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border last:border-b-0"
                    onClick={() => handleOptionSelect(option)}
                  >
                    <div className="text-sm font-medium">{option.label}</div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="text-sm">No options found.</div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  const toggleVariableExpansion = (variableId: string) => {
    const newExpanded = new Set(expandedVariables);
    if (newExpanded.has(variableId)) {
      newExpanded.delete(variableId);
    } else {
      newExpanded.add(variableId);
    }
    setExpandedVariables(newExpanded);
  };

  const updateVariableField = (variableId: string, field: keyof Variable, value: string) => {
    if (!selectedGroup) return;
    
    const updatedGroup = {
      ...selectedGroup,
      variables: selectedGroup.variables.map(v => 
        v.id === variableId ? { ...v, [field]: value } : v
      )
    };
    setSelectedGroup(updatedGroup);
  };

  // Variable handlers for configuration modal
  const handleEditVariable = (variable: Variable) => {
    setSelectedVariable(variable);
    setPromptDefinition(variable.definition || "");
    setPromptAnalyticalConsiderations(variable.analyticalConsiderations || "");
    setEditPromptModalOpen(true);
  };

  const handleSaveVariable = () => {
    if (!selectedVariable) return;
    
    setVariableGroups(prev => prev.map(group => ({
      ...group,
      variables: group.variables.map(v => 
        v.id === selectedVariable.id 
          ? {
              ...v,
              definition: promptDefinition,
              analyticalConsiderations: promptAnalyticalConsiderations
            }
          : v
      )
    })));
    
    setEditPromptModalOpen(false);
    setSelectedVariable(null);
    setPromptDefinition("");
    setPromptAnalyticalConsiderations("");
  };

  const handleToggleVariableVisibility = (groupId: string, variableId: string) => {
    setVariableGroups(prev => prev.map(group => 
      group.id === groupId 
        ? {
            ...group,
            variables: group.variables.map(v => 
              v.id === variableId ? { ...v, visible: !v.visible } : v
            )
          }
        : group
    ));
  };

  const handleConfigureGroup = (group: VariableGroup) => {
    setSelectedGroup(group);
    setConfigModalOpen(true);
  };





  // Mock data for comment threads
  const mockCommentThreads = [
    {
      id: "thread-1",
      quotedText: "the Borrower shall maintain a Debt Service Coverage Ratio of no less than 1.25x throughout the term of this Agreement",
      initialComment: "This DSCR requirement seems quite conservative. @Sarah Chen should we negotiate this down to 1.15x to give more flexibility?",
      author: {
        name: "John Doe",
        initials: "JD",
        avatar: null
      },
      timestamp: "5 minutes ago",
      replyCount: 2,
      mentions: ["Sarah Chen"]
    },
    {
      id: "thread-2",
      quotedText: null, // General topic, no quoted text
      initialComment: "Team, I've reviewed the financial projections and noticed some discrepancies in the Q4 revenue forecasts. @Mike Johnson can you verify the assumptions used in the model?",
      author: {
        name: "Sarah Chen",
        initials: "SC",
        avatar: null
      },
      timestamp: "1 hour ago",
      replyCount: 5,
      mentions: ["Mike Johnson"]
    },
    {
      id: "thread-3",
      quotedText: "Net Operating Income for the trailing twelve months ending December 31, 2023 was $8.2M",
      initialComment: "The NOI figure looks strong, but I want to double-check the expense allocations. Are property taxes and insurance properly accounted for here?",
      author: {
        name: "Alex Rivera",
        initials: "AR",
        avatar: null
      },
      timestamp: "3 hours ago",
      replyCount: 1,
      mentions: []
    }
  ];

  // Component for rendering @ mentions as pills
  const MentionPill = ({ mention }: { mention: string }) => (
    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-xs px-2 py-0.5">
      @{mention}
    </Badge>
  );

  // Component for rendering comment text with mentions
  const CommentText = ({ text, mentions }: { text: string; mentions: string[] }) => {
    if (mentions.length === 0) {
      return <p className="text-sm text-foreground leading-relaxed">{text}</p>;
    }

    let processedText = text;
    const elements: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    mentions.forEach((mention, index) => {
      const mentionPattern = new RegExp(`@${mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      const match = mentionPattern.exec(processedText);
      
      if (match) {
        // Add text before the mention
        if (match.index > lastIndex) {
          elements.push(processedText.slice(lastIndex, match.index));
        }
        
        // Add the mention pill
        elements.push(
          <MentionPill key={`mention-${index}`} mention={mention} />
        );
        
        lastIndex = match.index + match[0].length;
      }
    });

    // Add remaining text
    if (lastIndex < processedText.length) {
      elements.push(processedText.slice(lastIndex));
    }

    return (
      <p className="text-sm text-foreground leading-relaxed flex flex-wrap items-center gap-1">
        {elements.map((element, index) => (
          <span key={index}>{element}</span>
        ))}
      </p>
    );
  };

  // Comment Thread Component
  const CommentThread = ({ thread }: { thread: CommentThread }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyText, setReplyText] = useState("");

    const handleReply = () => {
      setShowReplyForm(!showReplyForm);
      if (showReplyForm) {
        setReplyText("");
      }
    };

    const handleSubmitReply = () => {
      if (replyText.trim()) {
        // Here you would normally add the reply to the thread
        console.log("Submitting reply:", replyText);
        setReplyText("");
        setShowReplyForm(false);
        // Could also auto-expand replies to show the new one
        setShowReplies(true);
      }
    };

    const toggleReplies = () => {
      setShowReplies(!showReplies);
    };

    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        {/* Quoted Source Text */}
        {thread.quotedText && (
          <blockquote className="border-l-4 border-primary bg-muted/50 pl-4 py-2 italic text-sm text-muted-foreground">
            "{thread.quotedText}"
          </blockquote>
        )}
        
        {/* Initial Comment */}
        <div className="space-y-2">
          <CommentText text={thread.initialComment} mentions={thread.mentions} />
        </div>
        
        {/* Author & Timestamp */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={thread.author.avatar || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {thread.author.initials}
            </AvatarFallback>
          </Avatar>
          <span>{thread.author.name}</span>
          <span>•</span>
          <span>{thread.timestamp}</span>
        </div>
        
        {/* Reply Functionality */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleReply}
          >
            <Reply className="h-3 w-3 mr-1" />
            Reply
          </Button>
          <div 
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={toggleReplies}
          >
            <MessageSquareMore className="h-3 w-3" />
            <span>{thread.replyCount} {thread.replyCount === 1 ? 'Reply' : 'Replies'}</span>
            {thread.replyCount > 0 && (
              <ChevronDown className={`h-3 w-3 transition-transform ${showReplies ? 'rotate-180' : ''}`} />
            )}
          </div>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="space-y-3 pt-3 border-t border-border">
            <TaggingInput
              placeholder="Write a reply... (+ for deals/files/folders, @ for people, # for topics, < for tasks)"
              value={replyText}
              onChange={setReplyText}
              className="resize-none text-sm"
              minHeight={60}
              maxHeight={120}
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleReply}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSubmitReply}
                disabled={!replyText.trim()}
              >
                Post Reply
              </Button>
            </div>
          </div>
        )}

        {/* Existing Replies */}
        {showReplies && thread.replyCount > 0 && (
          <div className="space-y-3 pt-3 border-t border-border">
            {/* Mock replies - you would map over actual reply data */}
            {[1, 2].slice(0, thread.replyCount).map((_, index) => (
              <div key={index} className="pl-4 border-l-2 border-muted space-y-2">
                <div className="text-sm">
                  This is a mock reply to demonstrate the functionality. In a real implementation, this would show the actual reply content.
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-xs bg-secondary/50 text-secondary-foreground">
                      {index === 0 ? 'JD' : 'SM'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{index === 0 ? 'John Doe' : 'Sarah Miller'}</span>
                  <span>•</span>
                  <span>{index === 0 ? '2 hours ago' : '1 hour ago'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <TemplateBuilderProvider>
      <TooltipProvider>
        <div className="h-full w-full flex flex-col overflow-hidden min-w-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex items-center justify-between pl-4 pr-3 py-2 border-b border-border">
          <div className="flex items-center gap-3 p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1.5 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 rounded-lg shadow-sm hover:shadow border border-border/40 hover:border-border/60 bg-background/50"
              onClick={() => {
                // Collapse functionality will be connected to FlexibleWorkspace
                if (onCollapse) {
                  onCollapse();
                }
              }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <TabsList className="grid w-auto grid-cols-3 h-9 bg-gradient-to-b from-muted/60 to-muted/40 rounded-lg border border-border/50 shadow-md">
              <TabsTrigger 
                value="deal-info" 
                className="text-xs px-4 py-1.5 rounded-md transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/50 hover:bg-background/60 hover:text-foreground"
              >
                Deal Info
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="text-xs px-4 py-1.5 rounded-md transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/50 hover:bg-background/60 hover:text-foreground"
              >
                Notes
              </TabsTrigger>
              <TabsTrigger 
                value="ai-chat" 
                className="text-xs px-4 py-1.5 rounded-md transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/50 hover:bg-background/60 hover:text-foreground"
              >
                AI Chat
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Variable Configuration Access Button */}
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1.5 h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10 transition-all duration-200 rounded-md border border-transparent hover:border-orange-500/20"
                    onClick={() => {
                      setVariableConfigModalOpen(true);
                    }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">
                  <p>Configure Variables</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-w-0">
          <TabsContent value="deal-info" className="h-full p-0 m-0 min-w-0">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <div className="space-y-6 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-12rem)] pr-3 pl-2 py-[2px]">
                <Accordion type="multiple" defaultValue={["deal-classification", "entity-profiles", "loan-request-details", "vertical-specific-variables"]} className="space-y-0 min-w-0">
                  {variableGroups.map((group, index) => (
                    <AccordionItem key={group.id} value={group.id} className={`group min-w-0 ${index < variableGroups.length - 1 ? 'border-b border-border' : ''}`}>
                      <AccordionTrigger className="pl-4 pr-3 py-3 hover:no-underline min-w-0">
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="text-sm font-medium">{group.name}</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500 hover:text-orange-600 flex items-center justify-center cursor-pointer rounded hover:bg-accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfigureGroup(group);
                              }}
                            >
                              <Settings className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-4 pr-3 pb-4 overflow-hidden">
                        {/* Fields based on group */}
                        {group.id === "deal-classification" && (
                          <div className="space-y-4 min-w-0">
                            <UniversalComboboxField
                              id="business-vertical"
                              label="Business Vertical"
                              placeholder="Select business vertical..."
                              options={[
                                { value: "real-estate", label: "Real Estate" },
                                { value: "healthcare", label: "Healthcare" },
                                { value: "technology", label: "Technology" },
                                { value: "manufacturing", label: "Manufacturing" },
                                { value: "retail", label: "Retail" },
                                { value: "energy", label: "Energy" }
                              ]}
                              value={fieldValues["business-vertical"]}
                              isLocked={lockedFields.has("business-vertical")}
                              hasAIValue={true}
                              sources={documentSources["business-vertical"]}
                              onValueChange={(value) => {
                                setFieldValues(prev => ({ ...prev, "business-vertical": value as string }));
                                setSelectedVertical(value as string);
                              }}
                              onLockToggle={() => {
                                const newLockedFields = new Set(lockedFields);
                                if (newLockedFields.has("business-vertical")) {
                                  newLockedFields.delete("business-vertical");
                                } else {
                                  newLockedFields.add("business-vertical");
                                }
                                setLockedFields(newLockedFields);
                              }}
                              onGoToNextSource={() => handleGoToNextSource("business-vertical")}
                            />

                            <UniversalComboboxField
                              id="asset-class"
                              label="Asset Class"
                              placeholder="Select asset class..."
                              options={[
                                { value: "cre", label: "Commercial Real Estate" },
                                { value: "multifamily", label: "Multifamily" },
                                { value: "office", label: "Office" },
                                { value: "retail-property", label: "Retail Property" },
                                { value: "industrial", label: "Industrial" },
                                { value: "hospitality", label: "Hospitality" }
                              ]}
                              value={fieldValues["asset-class"]}
                              isLocked={lockedFields.has("asset-class")}
                              hasAIValue={true}
                              sources={documentSources["asset-class"]}
                              onValueChange={(value) => {
                                setFieldValues(prev => ({ ...prev, "asset-class": value as string }));
                              }}
                              onLockToggle={() => {
                                const newLockedFields = new Set(lockedFields);
                                if (newLockedFields.has("asset-class")) {
                                  newLockedFields.delete("asset-class");
                                } else {
                                  newLockedFields.add("asset-class");
                                }
                                setLockedFields(newLockedFields);
                              }}
                              onGoToNextSource={() => handleGoToNextSource("asset-class")}
                            />

                            <UniversalComboboxField
                              id="asset-sub-class"
                              label="Asset Sub-Class"
                              placeholder="Select asset sub-class..."
                              isMultiSelect={true}
                              options={[
                                { value: "non-qm", label: "Non-QM" },
                                { value: "bridge", label: "Bridge" },
                                { value: "construction", label: "Construction" },
                                { value: "permanent", label: "Permanent" },
                                { value: "mezzanine", label: "Mezzanine" }
                              ]}
                              value={fieldValues["asset-sub-class"] ? [fieldValues["asset-sub-class"]] : []}
                              isLocked={lockedFields.has("asset-sub-class")}
                              hasAIValue={true}
                              sources={documentSources["asset-sub-class"]}
                              onValueChange={(value) => {
                                const valueArray = Array.isArray(value) ? value : [value];
                                setFieldValues(prev => ({ ...prev, "asset-sub-class": valueArray.join(", ") }));
                              }}
                              onLockToggle={() => {
                                const newLockedFields = new Set(lockedFields);
                                if (newLockedFields.has("asset-sub-class")) {
                                  newLockedFields.delete("asset-sub-class");
                                } else {
                                  newLockedFields.add("asset-sub-class");
                                }
                                setLockedFields(newLockedFields);
                              }}
                              onGoToNextSource={() => handleGoToNextSource("asset-sub-class")}
                            />

                            <LockableInputField
                              id="deal-team"
                              label="Deal Team"
                              placeholder="Enter team members..."
                              hasAIValue={true}
                            />
                          </div>
                        )}

                        {group.id === "entity-profiles" && (
                          <div className="space-y-4 min-w-0">
                            <UniversalComboboxField
                              id="sponsor"
                              label="Sponsor"
                              placeholder="Select or create sponsor..."
                              isEntityField={true}
                              entities={[
                                { id: "e1", name: "RedStone Capital Partners", type: "sponsor", legalName: "RedStone Capital Partners LLC", industry: "Real Estate Investment" },
                                { id: "e3", name: "BlackRock Real Estate", type: "sponsor", legalName: "BlackRock Real Estate Partners LLC", industry: "Asset Management" },
                                { id: "e4", name: "Starwood Capital", type: "sponsor", legalName: "Starwood Capital Group LLC", industry: "Private Equity" }
                              ]}
                              selectedEntities={selectedEntities["sponsor"] || []}
                              isLocked={lockedFields.has("sponsor")}
                              hasAIValue={true}
                              sources={documentSources["sponsor"]}
                              onEntitiesChange={(entities) => {
                                setSelectedEntities(prev => ({ ...prev, sponsor: entities }));
                              }}
                              onCreateEntity={(fieldId) => {
                                setEntityCreationContext({ fieldId, fieldType: "single" });
                                setEntityCreationModalOpen(true);
                              }}
                              onLockToggle={() => {
                                const newLockedFields = new Set(lockedFields);
                                if (newLockedFields.has("sponsor")) {
                                  newLockedFields.delete("sponsor");
                                } else {
                                  newLockedFields.add("sponsor");
                                }
                                setLockedFields(newLockedFields);
                              }}
                              onGoToNextSource={() => handleGoToNextSource("sponsor")}
                            />

                            <UniversalComboboxField
                              id="borrower"
                              label="Borrower"
                              placeholder="Select or create borrower..."
                              isEntityField={true}
                              entities={[
                                { id: "e2", name: "Metro Property Holdings", type: "borrower", legalName: "Metro Property Holdings LLC", industry: "Commercial Real Estate" },
                                { id: "e6", name: "Downtown Development Corp", type: "borrower", legalName: "Downtown Development Corporation", industry: "Real Estate Development" },
                                { id: "e7", name: "Citywide Properties", type: "borrower", legalName: "Citywide Properties Inc", industry: "Property Management" }
                              ]}
                              selectedEntities={selectedEntities["borrower"] || []}
                              isLocked={lockedFields.has("borrower")}
                              hasAIValue={true}
                              sources={documentSources["borrower"]}
                              onEntitiesChange={(entities) => {
                                setSelectedEntities(prev => ({ ...prev, borrower: entities }));
                              }}
                              onCreateEntity={(fieldId) => {
                                setEntityCreationContext({ fieldId, fieldType: "single" });
                                setEntityCreationModalOpen(true);
                              }}
                              onLockToggle={() => {
                                const newLockedFields = new Set(lockedFields);
                                if (newLockedFields.has("borrower")) {
                                  newLockedFields.delete("borrower");
                                } else {
                                  newLockedFields.add("borrower");
                                }
                                setLockedFields(newLockedFields);
                              }}
                              onGoToNextSource={() => handleGoToNextSource("borrower")}
                            />

                            <UniversalComboboxField
                              id="guarantors"
                              label="Guarantor(s)"
                              placeholder="Select or create guarantors..."
                              isMultiSelect={true}
                              isEntityField={true}
                              entities={[
                                { id: "e5", name: "John Smith", type: "guarantor", legalName: "John Michael Smith", industry: "Real Estate" },
                                { id: "e1", name: "RedStone Capital Partners", type: "guarantor", legalName: "RedStone Capital Partners LLC", industry: "Real Estate Investment" },
                                { id: "e8", name: "Sarah Johnson", type: "guarantor", legalName: "Sarah Elizabeth Johnson", industry: "Finance" },
                                { id: "e9", name: "Capital Guarantee Corp", type: "guarantor", legalName: "Capital Guarantee Corporation", industry: "Financial Services" }
                              ]}
                              selectedEntities={selectedEntities["guarantors"] || []}
                              isLocked={lockedFields.has("guarantors")}
                              hasAIValue={true}
                              sources={documentSources["guarantors"]}
                              onEntitiesChange={(entities) => {
                                setSelectedEntities(prev => ({ ...prev, guarantors: entities }));
                              }}
                              onCreateEntity={(fieldId) => {
                                setEntityCreationContext({ fieldId, fieldType: "multi" });
                                setEntityCreationModalOpen(true);
                              }}
                              onLockToggle={() => {
                                const newLockedFields = new Set(lockedFields);
                                if (newLockedFields.has("guarantors")) {
                                  newLockedFields.delete("guarantors");
                                } else {
                                  newLockedFields.add("guarantors");
                                }
                                setLockedFields(newLockedFields);
                              }}
                              onGoToNextSource={() => handleGoToNextSource("guarantors")}
                            />
                          </div>
                        )}

                        {group.id === "loan-request-details" && (
                          <div className="space-y-4 min-w-0">
                            <LockableInputField
                              id="global-loan-size"
                              label="Global Loan Size"
                              placeholder="Enter loan amount..."
                              hasAIValue={true}
                            />

                            <LockableInputField
                              id="firms-expected-hold"
                              label="Firm's Expected Hold"
                              placeholder="Enter hold amount..."
                              hasAIValue={true}
                            />

                            <LockableInputField
                              id="origination-date"
                              label="Origination Date"
                              placeholder="Enter date..."
                              hasAIValue={true}
                            />
                          </div>
                        )}

                        {group.id === "vertical-specific-variables" && selectedVertical === "real-estate" && (
                          <div className="space-y-4 min-w-0">
                            <LockableInputField
                              id="ltv"
                              label="Loan-to-Value (LTV) (%)"
                              placeholder="Enter LTV..."
                              hasAIValue={true}
                            />

                            <LockableInputField
                              id="ltc"
                              label="Loan-to-Cost (LTC) (%)"
                              placeholder="Enter LTC..."
                              hasAIValue={true}
                            />

                            <LockableInputField
                              id="debt-yield"
                              label="Debt Yield (%)"
                              placeholder="Enter debt yield..."
                              hasAIValue={true}
                            />
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="h-full p-0 m-0 min-w-0">
            <div className="h-full flex flex-col min-w-0 overflow-hidden">
              {/* Notes Header with Filters */}
              <div className="px-3 py-2 border-b border-border/50 bg-card/30 backdrop-blur-sm flex items-center justify-between gap-2 min-w-0 flex-shrink-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Input 
                    placeholder="Search notes..."
                    className="h-7 bg-background/50 border-border/50"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                        <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center">{notes.length}</Badge>
                        <span className="text-xs">All</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="end">
                      <div className="space-y-1">
                        <button className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded flex items-center justify-between">
                          <span>All Notes</span>
                          <Badge variant="secondary" className="h-4 px-1.5">{notes.length}</Badge>
                        </button>
                        <button className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded flex items-center justify-between">
                          <span>My Notes</span>
                          <Badge variant="secondary" className="h-4 px-1.5">{notes.filter(n => n.author === "You").length}</Badge>
                        </button>
                        <button className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded flex items-center justify-between">
                          <span>Team</span>
                          <Badge variant="secondary" className="h-4 px-1.5">{notes.filter(n => n.author !== "You").length}</Badge>
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Notes Feed - Sleek Accordion Bars with Threads */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-3 pr-4 py-3">
                  {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-center space-y-2 opacity-60">
                      <StickyNote className="w-8 h-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">No notes yet. Add one below.</p>
                    </div>
                  ) : (
                    <Accordion type="multiple" className="space-y-2">
                      {notes.map((note) => {
                        const isResolved = resolvedNotes.has(note.id);
                        const isPreviewExpanded = expandedPreviews.has(note.id);
                        
                        return (
                        <AccordionItem 
                          key={note.id} 
                          value={note.id}
                          className={`border-0 rounded-md transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
                            isResolved 
                              ? 'bg-green-500/10 hover:bg-green-500/15 opacity-70' 
                              : 'bg-card/40 hover:bg-card/60'
                          }`}
                        >
                          <div className="relative">
                            <AccordionTrigger className="px-3 py-2.5 hover:no-underline group [&[data-state=open]]:bg-card/70">
                              <div className="flex items-start gap-2.5 flex-1 text-left w-full min-w-0 pr-8">
                                <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5 ring-2 ring-background">
                                  <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                                    {note.avatar}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-foreground">{note.author}</span>
                                    <Badge className={`h-4 px-1.5 text-[9px] font-medium ${
                                      note.category === "General" ? "bg-blue-500/15 text-blue-600 border-blue-500/20" :
                                      note.category === "Financial" ? "bg-green-500/15 text-green-600 border-green-500/20" :
                                      note.category === "Legal" ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/20" :
                                      note.category === "Risk" ? "bg-red-500/15 text-red-600 border-red-500/20" :
                                      "bg-purple-500/15 text-purple-600 border-purple-500/20"
                                    }`}>
                                      {note.category}
                                    </Badge>
                                    {isResolved && (
                                      <Badge className="h-4 px-1.5 text-[9px] font-medium bg-green-500/20 text-green-700 border-green-500/30">
                                        <Check className="h-2.5 w-2.5 mr-0.5" />
                                        Resolved
                                      </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">{note.timestamp}</span>
                                  </div>
                                  <p className={`text-[11.5px] text-muted-foreground leading-[1.4] ${
                                    isPreviewExpanded ? '' : 'line-clamp-2'
                                  }`}>
                                    {note.content}
                                  </p>
                                  {note.replies.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <MessageSquareMore className="h-3 w-3 text-blue-500/70" />
                                      <span className="text-[10px] font-medium text-blue-600/80">
                                        {note.replies.length} {note.replies.length === 1 ? 'reply' : 'replies'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            
                            {/* Three-dot menu - positioned on the right */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-2.5 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-muted z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePreviewExpansion(note.id);
                              }}
                            >
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                          <AccordionContent className="px-3 pb-3 pt-1">
                            <div className="pl-9 space-y-3">
                              {/* Comment Thread - No duplicate parent note */}
                              {note.replies.length > 0 && (
                                <div className="space-y-2 pt-1">
                                  {note.replies.map((reply) => (
                                    <div key={reply.id} className="flex items-start gap-2 p-2.5 rounded-md bg-muted/30 border border-border/30 hover:bg-muted/40 transition-colors">
                                      <Avatar className="w-6 h-6 flex-shrink-0 ring-2 ring-background/50">
                                        <AvatarFallback className="text-[9px] bg-gradient-to-br from-green-500 to-blue-600 text-white font-medium">
                                          {reply.avatar}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                          <span className="text-[11px] font-semibold text-foreground">{reply.author}</span>
                                          <span className="text-[9px] text-muted-foreground whitespace-nowrap">{reply.timestamp}</span>
                                        </div>
                                        <p className="text-[11px] text-foreground/80 leading-relaxed">
                                          {reply.content}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reply Input */}
                              {replyingTo === note.id ? (
                                <div className="space-y-2 pt-1">
                                  <Textarea 
                                    placeholder="Write a comment..."
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    className="min-h-[70px] bg-background border-border/50 resize-none text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      size="sm" 
                                      className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                                      onClick={() => handleAddReply(note.id)}
                                      disabled={!replyContent.trim()}
                                    >
                                      <Send className="h-3 w-3 mr-1.5" />
                                      Comment
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      className="h-7 px-3 text-xs hover:bg-muted"
                                      onClick={() => {
                                        setReplyingTo(null);
                                        setReplyContent("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-7 px-3 text-xs border-border/50 hover:bg-muted/50 hover:border-blue-400/50"
                                    onClick={() => setReplyingTo(note.id)}
                                  >
                                    <Reply className="h-3 w-3 mr-1.5" />
                                    Add Comment
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant={isResolved ? "default" : "outline"}
                                    className={`h-7 px-3 text-xs ${
                                      isResolved 
                                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                                        : 'border-border/50 hover:bg-green-50 hover:border-green-400/50 hover:text-green-700'
                                    }`}
                                    onClick={() => toggleResolveNote(note.id)}
                                  >
                                    <Check className="h-3 w-3 mr-1.5" />
                                    {isResolved ? 'Resolved' : 'Mark Resolved'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                      })}
                    </Accordion>
                  )}
                </div>
              </ScrollArea>

              {/* Add Note Input - Pinned at Bottom */}
              <div className="border-t border-border/50 bg-card/40 backdrop-blur-sm flex-shrink-0">
                <div className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <Textarea 
                      placeholder="Add a note..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          handleAddNote();
                        }
                      }}
                      className="min-h-[70px] max-h-[120px] bg-background/80 border-border/50 resize-none text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    />
                    <div className="flex flex-col gap-1.5">
                      <Button 
                        size="sm" 
                        className="h-8 px-3 bg-blue-600 hover:bg-blue-700 shadow-sm"
                        onClick={handleAddNote}
                        disabled={!newNoteContent.trim()}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-2 border-border/50">
                            <Badge className={`h-4 w-4 p-0 rounded-full shadow-sm ${newNoteCategory === "General" ? "bg-blue-500" : newNoteCategory === "Financial" ? "bg-green-500" : newNoteCategory === "Legal" ? "bg-yellow-500" : newNoteCategory === "Risk" ? "bg-red-500" : "bg-purple-500"}`} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" align="end" side="top">
                          <div className="space-y-1">
                            <button 
                              onClick={() => setNewNoteCategory("General")}
                              className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded flex items-center gap-2"
                            >
                              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                              General
                            </button>
                            <button 
                              onClick={() => setNewNoteCategory("Financial")}
                              className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded flex items-center gap-2"
                            >
                              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                              Financial
                            </button>
                            <button 
                              onClick={() => setNewNoteCategory("Legal")}
                              className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded flex items-center gap-2"
                            >
                              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                              Legal
                            </button>
                            <button 
                              onClick={() => setNewNoteCategory("Risk")}
                              className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded flex items-center gap-2"
                            >
                              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                              Risk
                            </button>
                            <button 
                              onClick={() => setNewNoteCategory("Action Item")}
                              className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded flex items-center gap-2"
                            >
                              <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                              Action Item
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 ml-0.5">
                    <kbd className="px-1 py-0.5 text-[9px] bg-muted rounded border border-border/50">⌘</kbd> + 
                    <kbd className="px-1 py-0.5 text-[9px] bg-muted rounded border border-border/50 ml-0.5">Enter</kbd> to add
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai-chat" className="h-full p-0 m-0 min-w-0">
            <div className="h-full flex flex-col min-w-0 overflow-hidden">
              <ScrollArea className="flex-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50 scrollbar-thumb-rounded-full" ref={scrollAreaRef}>
                <div className="px-3 pr-4 py-3 space-y-3 min-h-full">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <MessageSquareMore className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium text-foreground">AI Analysis Ready</h3>
                        <p className="text-muted-foreground max-w-xs">
                          Ask questions about this deal, request analysis, or get insights.
                        </p>
                      </div>
                    </div>
                  )}

                  {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.type === "user" ? "justify-end" : ""
                    }`}
                  >
                    {message.type === "ai" && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <MessageSquareMore className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex-1 max-w-[85%] ${message.type === "user" ? "flex justify-end" : ""}`}>
                      <div
                        className={`inline-block rounded-lg px-3 py-2 transition-all duration-200 ${
                          message.type === "ai"
                            ? "bg-muted/90 border border-border text-foreground"
                            : "bg-primary text-primary-foreground ml-auto"
                        }`}
                      >
                        {message.type === "ai" && message.capabilities ? (
                          <div className="space-y-2">
                            <p className="leading-relaxed text-foreground">{message.content}</p>
                            <div className="space-y-1">
                              {message.capabilities.map((capability, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 bg-muted/40 rounded px-2 py-1"
                                >
                                  <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                                  <span className="text-muted-foreground text-xs">{capability}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : message.type === "ai" && message.data ? (
                          <div className="space-y-2">
                            <p className="leading-relaxed text-foreground">{message.content}</p>
                            <div className="bg-muted border border-border rounded p-2 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">Current LTV:</span>
                                <span className="text-orange-400 text-xs">{message.data.currentLTV}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">Market Average:</span>
                                <span className="text-foreground text-xs">{message.data.marketAverage}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">Assessment:</span>
                                <Badge className="h-4 px-1.5 bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                  {message.data.assessment}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="leading-relaxed text-xs">{message.content}</p>
                        )}
                      </div>
                      <div className={`text-muted-foreground mt-1 px-1 text-xs ${message.type === "user" ? "text-right" : ""}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {message.type === "user" && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="font-semibold text-primary-foreground text-xs">U</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <MessageSquareMore className="w-3 h-3 text-white animate-pulse" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="inline-block bg-muted/90 border border-border rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-muted-foreground text-xs">Analyzing...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </ScrollArea>
              
              {/* AI Chat Input */}
              <div className="border-t border-border p-3 min-w-0">
                <div className="relative min-w-0">
                  <TaggingInput
                    placeholder="Ask about this deal... (+ for deals/files/folders, @ for people, # for topics, < for tasks)"
                    value={aiChatInput}
                    onChange={setAIChatInput}
                    onKeyDown={handleAIChatKeyDown}
                    className="pr-12 resize-none border-border/50 bg-muted/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-lg"
                    minHeight={40}
                    maxHeight={100}
                  />
                  <Button
                    onClick={handleAIChatSend}
                    disabled={!aiChatInput.trim() || isTyping}
                    size="sm"
                    className="absolute right-2 bottom-2 h-7 w-7 p-0 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed z-20"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

        </div>
      </Tabs>

      {/* Variable Configuration Modal */}
      <Dialog open={editPromptModalOpen} onOpenChange={setEditPromptModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure '{selectedVariable?.name}' Variable</DialogTitle>
            <DialogDescription>
              Click on any variable to expand its advanced configuration options. Use drag handles to reorder and toggle switches to control visibility.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVariable && (
            <div className="space-y-6">
              {/* Basic Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <ConfigComboboxField
                  id="data-type"
                  label="Data Type"
                  placeholder="Select data type..."
                  options={[
                    { value: "string", label: "String" },
                    { value: "number", label: "Number" },
                    { value: "date", label: "Date" },
                    { value: "currency", label: "Currency" },
                    { value: "percentage", label: "Percentage" },
                    { value: "entity", label: "Entity" },
                    { value: "entity_list", label: "Entity List" }
                  ]}
                  value={selectedVariable.dataType}
                  onValueChange={(value) => setSelectedVariable({...selectedVariable, dataType: value})}
                />
                
                <ConfigComboboxField
                  id="semantic-type"
                  label="Semantic Type (AI Hint)"
                  placeholder="Select semantic type..."
                  options={[
                    { value: "category", label: "Category" },
                    { value: "amount", label: "Amount" },
                    { value: "ratio", label: "Ratio" },
                    { value: "yield", label: "Yield" },
                    { value: "date", label: "Date" },
                    { value: "sponsor", label: "Sponsor" },
                    { value: "borrower", label: "Borrower" },
                    { value: "guarantor", label: "Guarantor" },
                    { value: "list", label: "List" }
                  ]}
                  value={selectedVariable.semanticType}
                  onValueChange={(value) => setSelectedVariable({...selectedVariable, semanticType: value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">System / API Key</Label>
                <Input
                  placeholder="The AI will use this key to map extracted data. Format: snake_case"
                  value={selectedVariable.systemKey}
                  onChange={(e) => setSelectedVariable({...selectedVariable, systemKey: e.target.value})}
                  className="h-8 border-0 border-b border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Definition</Label>
                <Textarea
                  placeholder="The category of asset being financed or invested in"
                  value={promptDefinition}
                  onChange={(e) => setPromptDefinition(e.target.value)}
                  className="resize-none h-20"
                />
                <div className="text-xs text-muted-foreground">
                  This definition will be used by the AI to improve search and data extraction accuracy.
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Analytical Considerations</Label>
                <Textarea
                  placeholder="Add context, potential pitfalls, common validations, or specific instructions the AI should look for when analyzing this variable in a document."
                  value={promptAnalyticalConsiderations}
                  onChange={(e) => setPromptAnalyticalConsiderations(e.target.value)}
                  className="resize-none h-24"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditPromptModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveVariable}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Group Configuration Modal */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure '{selectedGroup?.name}' Variables</DialogTitle>
            <DialogDescription>
              Click on any variable to expand its advanced configuration options. Use drag handles to reorder and toggle switches to control visibility.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedGroup.variables.length} variables in this group
                </div>
                <Button size="sm" variant="outline">
                  <Plus className="w-3 h-3 mr-1" />
                  Add New Variable
                </Button>
              </div>

              <div className="space-y-2">
                {selectedGroup.variables.map((variable) => (
                  <div key={variable.id} className="border border-border rounded-lg">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <Switch
                          checked={variable.visible}
                          onCheckedChange={() => handleToggleVariableVisibility(selectedGroup.id, variable.id)}
                        />
                        <span className="text-sm font-medium">{variable.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newExpanded = new Set(expandedVariables);
                            if (newExpanded.has(variable.id)) {
                              newExpanded.delete(variable.id);
                            } else {
                              newExpanded.add(variable.id);
                            }
                            setExpandedVariables(newExpanded);
                          }}
                        >
                          {expandedVariables.has(variable.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {expandedVariables.has(variable.id) && (
                      <div className="border-t border-border p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <ConfigComboboxField
                            id={`${variable.id}-data-type`}
                            label="Data Type"
                            placeholder="Select data type..."
                            options={[
                              { value: "string", label: "String" },
                              { value: "number", label: "Number" },
                              { value: "date", label: "Date" },
                              { value: "currency", label: "Currency" },
                              { value: "percentage", label: "Percentage" },
                              { value: "entity", label: "Entity" },
                              { value: "entity_list", label: "Entity List" }
                            ]}
                            value={variable.dataType}
                          />
                          
                          <ConfigComboboxField
                            id={`${variable.id}-semantic-type`}
                            label="Semantic Type (AI Hint)"
                            placeholder="Select semantic type..."
                            options={[
                              { value: "category", label: "Category" },
                              { value: "amount", label: "Amount" },
                              { value: "ratio", label: "Ratio" },
                              { value: "yield", label: "Yield" },
                              { value: "date", label: "Date" },
                              { value: "sponsor", label: "Sponsor" },
                              { value: "borrower", label: "Borrower" },
                              { value: "guarantor", label: "Guarantor" },
                              { value: "list", label: "List" }
                            ]}
                            value={variable.semanticType}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium">System / API Key</Label>
                          <Input
                            placeholder="The AI will use this key to map extracted data. Format: snake_case"
                            value={variable.systemKey}
                            onChange={(e) => updateVariableField(variable.id, 'systemKey', e.target.value)}
                            className="h-8 border-0 border-b border-border"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Definition</Label>
                          <Textarea
                            placeholder="The category of asset being financed or invested in"
                            value={variable.definition || ""}
                            onChange={(e) => updateVariableField(variable.id, 'definition', e.target.value)}
                            className="resize-none h-20"
                          />
                          <div className="text-xs text-muted-foreground">
                            This definition will be used by the AI to improve search and data extraction accuracy.
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Analytical Considerations</Label>
                          <Textarea
                            placeholder="Add context, potential pitfalls, common validations, or specific instructions the AI should look for when analyzing this variable in a document."
                            value={variable.analyticalConsiderations || ""}
                            onChange={(e) => updateVariableField(variable.id, 'analyticalConsiderations', e.target.value)}
                            className="resize-none h-24"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setConfigModalOpen(false)}>
                  Cancel
                </Button>
                <Button>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


        {/* Variable Configuration Modal */}
        <VariableConfigurationModal
          isOpen={variableConfigModalOpen}
          onClose={() => setVariableConfigModalOpen(false)}
        />

        </div>
      </TooltipProvider>
    </TemplateBuilderProvider>
  );
}