import { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  Search, 
  Highlighter,
  MessageSquare,
  GitCompareArrows,
  MousePointer2,
  X,
  Download,
  Share2,
  Bookmark,
  Copy,
  Check,
  ChevronDown,
  ChevronsDown,
  Send,
  Lock,
  Unlock,
  Eye,
  MoreHorizontal,
  Reply,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Paperclip,
  Link2,
  File
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { motion, AnimatePresence } from "motion/react";
import { UniversalComboboxField } from "./UniversalComboboxField";
import { TaggingInput } from "./TaggingInput";

interface DocumentViewerProps {
  selectedFileId?: string | null;
  communicationData?: CommunicationThread | null;
  viewMode?: 'document' | 'communication';
}

interface CommunicationThread {
  id: string;
  subject: string;
  participants: string[];
  created: Date;
  updated: Date;
  messages: CommunicationMessage[];
}

interface CommunicationMessage {
  id: string;
  author: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  content: string;
  timestamp: Date;
  attachments?: Array<{
    id: string;
    name: string;
    size: string;
    type: string;
  }>;
  replies?: CommunicationMessage[];
  reactions?: Array<{
    type: 'like' | 'dislike';
    count: number;
    users: string[];
  }>;
  isEdited?: boolean;
  isPrivate?: boolean;
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface SmartSelectPopup {
  visible: boolean;
  x: number;
  y: number;
  extractedValue: string;
}

interface DocumentHighlight {
  id: string;
  startOffset: number;
  endOffset: number;
  text: string;
  color: string;
  type: 'highlight' | 'comment';
  x: number;
  y: number;
  width: number;
  height: number;
  elementId: string;
  comment?: {
    id: string;
    text: string;
    author: {
      name: string;
      initials: string;
      avatar?: string;
    };
    timestamp: string;
    mentions: string[];
  };
}

interface CommentPopup {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  commentText: string;
}

export function DocumentViewer({ 
  selectedFileId, 
  communicationData = null, 
  viewMode = 'document' 
}: DocumentViewerProps) {
  // Core state management
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeAnnotationTool, setActiveAnnotationTool] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Smart Select state management
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [popup, setPopup] = useState<SmartSelectPopup>({ visible: false, x: 0, y: 0, extractedValue: "" });
  const [selectedVariable, setSelectedVariable] = useState("");
  const [selectedVariableData, setSelectedVariableData] = useState<any>(null);
  const [variableSearch, setVariableSearch] = useState("");
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);
  const [showSuccessIndicator, setShowSuccessIndicator] = useState(false);
  const [successPosition, setSuccessPosition] = useState({ x: 0, y: 0 });
  const [popupState, setPopupState] = useState<'initial' | 'configured'>('initial');
  const [smartSelectValue, setSmartSelectValue] = useState<string | string[]>("");
  const [smartSelectEntities, setSmartSelectEntities] = useState<any[]>([]);
  const [isSmartSelectLocked, setIsSmartSelectLocked] = useState(false);

  // Communication thread state
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [newMessageText, setNewMessageText] = useState("");
  
  // Thread search state
  const [threadSearchQuery, setThreadSearchQuery] = useState("");
  const [threadSearchFilter, setThreadSearchFilter] = useState<'all' | 'text' | 'people' | 'files' | 'hashtags'>('all');

  // Mock communication data if none provided
  const mockCommunicationData: CommunicationThread = {
    id: "comm-001",
    subject: "Q3 Financial Statements - Review Required",
    participants: ["john.smith@company.com", "sarah.wilson@legal.com", "mike.chen@accounting.com", "anna.davis@company.com", "robert.johnson@bank.com"],
    created: new Date(2024, 8, 15, 10, 30),
    updated: new Date(2024, 8, 18, 16, 45),
    messages: [
      {
        id: "msg-001",
        author: {
          name: "John Smith",
          email: "john.smith@company.com",
          avatar: "",
          role: "Deal Manager"
        },
        content: "Team, I've uploaded the Q3 financial statements for review. Please focus on the cash flow projections and debt service coverage ratios. We need to validate these numbers before the credit committee presentation next week.",
        timestamp: new Date(2024, 8, 15, 10, 30),
        attachments: [
          { id: "att-001", name: "Q3_Financial_Statements.pdf", size: "2.4 MB", type: "application/pdf" },
          { id: "att-002", name: "Cash_Flow_Analysis.xlsx", size: "856 KB", type: "application/vnd.ms-excel" }
        ],
        reactions: [
          { type: "like", count: 5, users: ["sarah.wilson", "mike.chen", "anna.davis", "robert.johnson", "lisa.martinez"] }
        ],
        replies: [
          {
            id: "msg-002",
            author: {
              name: "Sarah Wilson",
              email: "sarah.wilson@legal.com",
              avatar: "",
              role: "Legal Counsel"
            },
            content: "Thanks John. I've reviewed the legal entity structure and found a few discrepancies in the subsidiary reporting. The Delaware LLC isn't properly consolidated in Schedule C.",
            timestamp: new Date(2024, 8, 15, 14, 15),
            reactions: [
              { type: "like", count: 3, users: ["john.smith", "mike.chen", "anna.davis"] }
            ],
            replies: [
              {
                id: "msg-003",
                author: {
                  name: "Mike Chen",
                  email: "mike.chen@accounting.com",
                  avatar: "",
                  role: "Senior Accountant"
                },
                content: "Good catch, Sarah. I'll need to rerun the consolidation with the corrected subsidiary data. This might affect our EBITDA calculations by 3-5%. Give me until tomorrow to revise.",
                timestamp: new Date(2024, 8, 15, 16, 45),
                reactions: [
                  { type: "like", count: 2, users: ["sarah.wilson", "john.smith"] }
                ],
                replies: [
                  {
                    id: "msg-004",
                    author: {
                      name: "Sarah Wilson",
                      email: "sarah.wilson@legal.com",
                      avatar: "",
                      role: "Legal Counsel"
                    },
                    content: "Perfect, Mike. Also, can you double-check the intercompany eliminations? I noticed some potential double-counting in the revenue recognition section.",
                    timestamp: new Date(2024, 8, 15, 17, 10),
                    reactions: [
                      { type: "like", count: 1, users: ["mike.chen"] }
                    ],
                    replies: [
                      {
                        id: "msg-005",
                        author: {
                          name: "Mike Chen",
                          email: "mike.chen@accounting.com",
                          avatar: "",
                          role: "Senior Accountant"
                        },
                        content: "Absolutely. I'll add that to my checklist. The intercompany transactions have been complex this quarter with the new subsidiary acquisitions.",
                        timestamp: new Date(2024, 8, 15, 17, 25),
                        reactions: [
                          { type: "like", count: 2, users: ["sarah.wilson", "john.smith"] }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                id: "msg-006",
                author: {
                  name: "John Smith",
                  email: "john.smith@company.com",
                  avatar: "",
                  role: "Deal Manager"
                },
                content: "Mike and Sarah - appreciate the detailed review. Let's schedule a 30-min call tomorrow at 2 PM to walk through the revisions together. I'll send a calendar invite.",
                timestamp: new Date(2024, 8, 15, 17, 30),
                reactions: [
                  { type: "like", count: 2, users: ["mike.chen", "sarah.wilson"] }
                ]
              }
            ]
          },
          {
            id: "msg-007",
            author: {
              name: "Anna Davis",
              email: "anna.davis@company.com",
              avatar: "",
              role: "Financial Analyst"
            },
            content: "I'm seeing some concerning trends in the operating expense ratios. Q3 shows a 12% increase over Q2, primarily driven by professional services and legal fees. Should we address this in the executive summary?",
            timestamp: new Date(2024, 8, 16, 9, 20),
            attachments: [
              { id: "att-003", name: "OpEx_Analysis_Q3.xlsx", size: "432 KB", type: "application/vnd.ms-excel" }
            ],
            reactions: [
              { type: "like", count: 2, users: ["john.smith", "robert.johnson"] }
            ],
            replies: [
              {
                id: "msg-008",
                author: {
                  name: "Robert Johnson",
                  email: "robert.johnson@bank.com",
                  avatar: "",
                  role: "Senior Underwriter"
                },
                content: "Anna, this is definitely something we need to explain in detail. The credit committee will ask about it. Can you prepare a one-pager showing the YoY trend and the primary drivers?",
                timestamp: new Date(2024, 8, 16, 10, 15),
                reactions: [
                  { type: "like", count: 1, users: ["anna.davis"] }
                ],
                replies: [
                  {
                    id: "msg-009",
                    author: {
                      name: "Anna Davis",
                      email: "anna.davis@company.com",
                      avatar: "",
                      role: "Financial Analyst"
                    },
                    content: "On it, Robert. I'll have a detailed breakdown by COD today. The legal fees spike is mainly from the two acquisitions we closed in August - should normalize in Q4.",
                    timestamp: new Date(2024, 8, 16, 10, 45),
                    reactions: [
                      { type: "like", count: 3, users: ["robert.johnson", "john.smith", "lisa.martinez"] }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "msg-010",
            author: {
              name: "Lisa Martinez",
              email: "lisa.martinez@company.com",
              avatar: "",
              role: "Tax Director"
            },
            content: "Quick question on the deferred tax assets - are we still expecting to realize the full $2.3M benefit this fiscal year? The timing might affect our effective tax rate calculations.",
            timestamp: new Date(2024, 8, 16, 11, 0),
            reactions: [
              { type: "like", count: 1, users: ["mike.chen"] }
            ],
            replies: [
              {
                id: "msg-011",
                author: {
                  name: "Mike Chen",
                  email: "mike.chen@accounting.com",
                  avatar: "",
                  role: "Senior Accountant"
                },
                content: "Lisa, based on our current projections, we should realize about $1.8M this year with the remaining $500K carrying into Q1 next year. I'll update Schedule M-1 accordingly.",
                timestamp: new Date(2024, 8, 16, 13, 20),
                reactions: [
                  { type: "like", count: 1, users: ["lisa.martinez"] }
                ],
                replies: [
                  {
                    id: "msg-012",
                    author: {
                      name: "Lisa Martinez",
                      email: "lisa.martinez@company.com",
                      avatar: "",
                      role: "Tax Director"
                    },
                    content: "Thanks Mike. That timing works better for our overall tax strategy anyway. I'll coordinate with our external tax advisors to confirm the treatment.",
                    timestamp: new Date(2024, 8, 16, 14, 5),
                    reactions: [
                      { type: "like", count: 1, users: ["mike.chen"] }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "msg-013",
        author: {
          name: "Robert Johnson",
          email: "robert.johnson@bank.com",
          avatar: "",
          role: "Senior Underwriter"
        },
        content: "Following up on the credit committee prep. We'll need these financials reconciled and validated by EOD Thursday. Any issues with the timeline?",
        timestamp: new Date(2024, 8, 16, 11, 30),
        isPrivate: true,
        reactions: [
          { type: "like", count: 2, users: ["john.smith", "mike.chen"] }
        ],
        replies: [
          {
            id: "msg-014",
            author: {
              name: "John Smith",
              email: "john.smith@company.com",
              avatar: "",
              role: "Deal Manager"
            },
            content: "Robert, Thursday EOD is tight but doable. Mike is rerunning the consolidation tonight, and we have the call tomorrow afternoon to review. I'll have a final package to you by Thursday 4 PM.",
            timestamp: new Date(2024, 8, 16, 12, 15),
            reactions: [
              { type: "like", count: 1, users: ["robert.johnson"] }
            ],
            replies: [
              {
                id: "msg-015",
                author: {
                  name: "Robert Johnson",
                  email: "robert.johnson@bank.com",
                  avatar: "",
                  role: "Senior Underwriter"
                },
                content: "Perfect. I'll need the final numbers by then to complete my underwriting memo. Also, make sure the debt service coverage ratio is calculated using the adjusted EBITDA - the committee has been scrutinizing that metric closely lately.",
                timestamp: new Date(2024, 8, 16, 13, 45),
                reactions: [
                  { type: "like", count: 2, users: ["john.smith", "mike.chen"] }
                ],
                replies: [
                  {
                    id: "msg-016",
                    author: {
                      name: "Mike Chen",
                      email: "mike.chen@accounting.com",
                      avatar: "",
                      role: "Senior Accountant"
                    },
                    content: "Noted, Robert. I'll make sure all covenant calculations use the adjusted EBITDA with the add-backs clearly documented. Do you want the normalized run-rate adjustments included as well?",
                    timestamp: new Date(2024, 8, 16, 14, 20),
                    reactions: [
                      { type: "like", count: 1, users: ["robert.johnson"] }
                    ],
                    replies: [
                      {
                        id: "msg-017",
                        author: {
                          name: "Robert Johnson",
                          email: "robert.johnson@bank.com",
                          avatar: "",
                          role: "Senior Underwriter"
                        },
                        content: "Yes, please include those but in a separate schedule with detailed justification for each adjustment. The committee chair has been pushing back on aggressive normalizations.",
                        timestamp: new Date(2024, 8, 16, 15, 10),
                        reactions: [
                          { type: "like", count: 1, users: ["mike.chen"] }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "msg-018",
        author: {
          name: "David Park",
          email: "david.park@company.com",
          avatar: "",
          role: "VP Finance"
        },
        content: "Team, excellent work on pulling this together. One additional request from our CFO - can we add a sensitivity analysis showing how a 10% revenue variance would impact our key covenants? He wants to present multiple scenarios to the board.",
        timestamp: new Date(2024, 8, 17, 9, 30),
        reactions: [
          { type: "like", count: 4, users: ["john.smith", "anna.davis", "mike.chen", "robert.johnson"] }
        ],
        replies: [
          {
            id: "msg-019",
            author: {
              name: "Anna Davis",
              email: "anna.davis@company.com",
              avatar: "",
              role: "Financial Analyst"
            },
            content: "David, I can run those scenarios this afternoon. I'll model both upside and downside cases with the corresponding covenant impacts. Should I include the liquidity projections as well?",
            timestamp: new Date(2024, 8, 17, 11, 15),
            reactions: [
              { type: "like", count: 2, users: ["david.park", "john.smith"] }
            ],
            replies: [
              {
                id: "msg-020",
                author: {
                  name: "David Park",
                  email: "david.park@company.com",
                  avatar: "",
                  role: "VP Finance"
                },
                content: "Yes please, Anna. The liquidity runway under each scenario would be very helpful. Also tie it to our revolver availability - that's always a key concern for the board.",
                timestamp: new Date(2024, 8, 17, 13, 40),
                reactions: [
                  { type: "like", count: 1, users: ["anna.davis"] }
                ],
                replies: [
                  {
                    id: "msg-021",
                    author: {
                      name: "Anna Davis",
                      email: "anna.davis@company.com",
                      avatar: "",
                      role: "Financial Analyst"
                    },
                    content: "Will do. I'll have the sensitivity analysis ready by tomorrow morning and include a waterfall chart showing the covenant cushion in each scenario.",
                    timestamp: new Date(2024, 8, 17, 15, 25),
                    attachments: [
                      { id: "att-004", name: "Sensitivity_Analysis_Draft.xlsx", size: "1.1 MB", type: "application/vnd.ms-excel" }
                    ],
                    reactions: [
                      { type: "like", count: 3, users: ["david.park", "john.smith", "robert.johnson"] }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "msg-022",
        author: {
          name: "John Smith",
          email: "john.smith@company.com",
          avatar: "",
          role: "Deal Manager"
        },
        content: "Update: Mike has completed the revised consolidation and all numbers are now reconciled. Sarah confirmed the legal entity structure is properly reflected. Final package will be ready for Robert by tomorrow afternoon as promised. Thanks everyone for the quick turnaround!",
        timestamp: new Date(2024, 8, 18, 16, 45),
        attachments: [
          { id: "att-005", name: "Q3_Financials_FINAL_v2.pdf", size: "3.1 MB", type: "application/pdf" },
          { id: "att-006", name: "Covenant_Calculations_Updated.xlsx", size: "982 KB", type: "application/vnd.ms-excel" }
        ],
        reactions: [
          { type: "like", count: 6, users: ["sarah.wilson", "mike.chen", "anna.davis", "robert.johnson", "lisa.martinez", "david.park"] }
        ],
        isEdited: true
      }
    ]
  };

  const currentCommunicationData = communicationData || mockCommunicationData;

  // Participant details mapping for tooltips
  const participantDetails: Record<string, { name: string; company: string; position: string }> = {
    "john.smith@company.com": { name: "John Smith", company: "RedStone Capital", position: "Deal Manager" },
    "sarah.wilson@legal.com": { name: "Sarah Wilson", company: "Wilson & Associates Legal", position: "Legal Counsel" },
    "mike.chen@accounting.com": { name: "Mike Chen", company: "Chen Accounting Group", position: "Senior Accountant" },
    "anna.davis@company.com": { name: "Anna Davis", company: "RedStone Capital", position: "Financial Analyst" },
    "robert.johnson@bank.com": { name: "Robert Johnson", company: "First National Bank", position: "Senior Underwriter" }
  };

  // Initialize expandedMessages with all message IDs so everything shows by default
  const getAllMessageIds = (messages: CommunicationMessage[]): string[] => {
    const ids: string[] = [];
    const collectIds = (msg: CommunicationMessage) => {
      ids.push(msg.id);
      if (msg.replies) {
        msg.replies.forEach(reply => collectIds(reply));
      }
    };
    messages.forEach(msg => collectIds(msg));
    return ids;
  };

  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(() => {
    return new Set(getAllMessageIds(currentCommunicationData.messages));
  });

  // Highlighting and commenting state
  const [highlights, setHighlights] = useState<DocumentHighlight[]>([]);
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [commentPopup, setCommentPopup] = useState<CommentPopup>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: "",
    commentText: ""
  });
  const [hoveredHighlight, setHoveredHighlight] = useState<string | null>(null);
  
  const documentRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const commentPopupRef = useRef<HTMLDivElement>(null);

  // Mock variables from Deal Info panel with type information
  const dealVariables = [
    { 
      id: "sponsor", 
      label: "Sponsor", 
      category: "Entity Profiles",
      type: "entity",
      isMultiSelect: false,
      entities: [
        { id: "e1", name: "RedStone Capital Partners", type: "sponsor", legalName: "RedStone Capital Partners LLC", industry: "Real Estate Investment" },
        { id: "e3", name: "BlackRock Real Estate", type: "sponsor", legalName: "BlackRock Real Estate Partners LLC", industry: "Asset Management" },
        { id: "e4", name: "Starwood Capital", type: "sponsor", legalName: "Starwood Capital Group LLC", industry: "Private Equity" }
      ]
    },
    { 
      id: "borrower", 
      label: "Borrower", 
      category: "Entity Profiles",
      type: "entity",
      isMultiSelect: false,
      entities: [
        { id: "e2", name: "Metro Property Holdings", type: "borrower", legalName: "Metro Property Holdings LLC", industry: "Commercial Real Estate" },
        { id: "e6", name: "Downtown Development Corp", type: "borrower", legalName: "Downtown Development Corporation", industry: "Real Estate Development" }
      ]
    },
    { 
      id: "guarantors", 
      label: "Guarantor(s)", 
      category: "Entity Profiles",
      type: "entity",
      isMultiSelect: true,
      entities: [
        { id: "e5", name: "John Smith", type: "guarantor", legalName: "John Michael Smith", industry: "Real Estate" },
        { id: "e8", name: "Sarah Johnson", type: "guarantor", legalName: "Sarah Elizabeth Johnson", industry: "Finance" }
      ]
    },
    { id: "revenue", label: "Total Revenue", category: "Financial Metrics", type: "currency" },
    { id: "ebitda", label: "EBITDA", category: "Financial Metrics", type: "currency" },
    { id: "net-income", label: "Net Income", category: "Financial Metrics", type: "currency" },
    { id: "ltv", label: "Loan-to-Value (LTV) (%)", category: "Property Metrics", type: "percentage" },
    { id: "ltc", label: "Loan-to-Cost (LTC) (%)", category: "Property Metrics", type: "percentage" },
    { id: "debt-yield", label: "Debt Yield (%)", category: "Property Metrics", type: "percentage" },
    { id: "occupancy-rate", label: "Occupancy Rate", category: "Property Metrics", type: "percentage" },
    { id: "avg-rent", label: "Average Rent per SF", category: "Property Metrics", type: "currency" },
    { id: "properties", label: "Total Properties", category: "Property Metrics", type: "number" },
    { id: "growth-rate", label: "YoY Growth Rate", category: "Financial Metrics", type: "percentage" },
    { id: "retention-rate", label: "Customer Retention", category: "Business Metrics", type: "percentage" }
  ];

  // Filter variables based on search
  const filteredVariables = dealVariables.filter(variable =>
    variable.label.toLowerCase().includes(variableSearch.toLowerCase()) ||
    variable.category.toLowerCase().includes(variableSearch.toLowerCase())
  );

  // Mock document data
  const mockDocument = {
    title: "Q3 2024 Financial Statements.pdf"
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in' && zoomLevel < 200) {
      setZoomLevel(prev => Math.min(prev + 25, 200));
    } else if (direction === 'out' && zoomLevel > 50) {
      setZoomLevel(prev => Math.max(prev - 25, 50));
    }
  };

  const handleAnnotationTool = (tool: string) => {
    const newTool = activeAnnotationTool === tool ? null : tool;
    setActiveAnnotationTool(newTool);
    
    // Reset any active selection state when switching tools
    if (tool !== 'smart-select') {
      setSelectionBox(null);
      setPopup({ visible: false, x: 0, y: 0, extractedValue: "" });
      setIsSelecting(false);
    }
    
    // Reset comment/highlight state when switching tools
    if (tool !== 'comment' && tool !== 'highlight') {
      setCommentPopup({ visible: false, x: 0, y: 0, selectedText: "", commentText: "" });
      setIsTextSelected(false);
      setSelectedText("");
    }
  };

  // Text selection handlers for highlighting and commenting
  const handleMouseUp = (e: React.MouseEvent) => {
    // Handle Smart Select first
    if (activeAnnotationTool === 'smart-select') {
      if (!isSelecting || !selectionBox || !documentRef.current) return;
      
      setIsSelecting(false);
      
      // Calculate selection area and extract mock data
      const width = Math.abs(selectionBox.endX - selectionBox.startX);
      const height = Math.abs(selectionBox.endY - selectionBox.startY);
      
      // Only show popup if selection is meaningful (minimum size)
      if (width > 10 && height > 10) {
        // Mock AI extraction based on selection area
        const mockExtractions = ["$24.7M", "94.2%", "127", "+12.3%", "$8.2M", "85%"];
        const extractedValue = mockExtractions[Math.floor(Math.random() * mockExtractions.length)];
        
        // Position popup near the selection
        const centerX = (selectionBox.startX + selectionBox.endX) / 2;
        const centerY = Math.min(selectionBox.startY, selectionBox.endY);
        
        setPopup({
          visible: true,
          x: centerX,
          y: centerY - 10, // Offset above selection
          extractedValue
        });
      } else {
        setSelectionBox(null);
      }
      return;
    }

    // Handle text selection for highlighting and commenting
    if (activeAnnotationTool === 'highlight' || activeAnnotationTool === 'comment') {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const selectedText = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const documentRect = documentRef.current?.getBoundingClientRect();
        
        if (documentRect) {
          const relativeX = rect.left - documentRect.left;
          const relativeY = rect.top - documentRect.top;
          
          if (activeAnnotationTool === 'highlight') {
            createHighlight(selectedText, range, relativeX, relativeY, rect.width, rect.height);
          } else if (activeAnnotationTool === 'comment') {
            setCommentPopup({
              visible: true,
              x: relativeX + rect.width / 2,
              y: relativeY - 10,
              selectedText,
              commentText: ""
            });
            setIsTextSelected(true);
            setSelectedText(selectedText);
          }
        }
        
        // Clear selection
        selection.removeAllRanges();
      }
    }
  };

  const createHighlight = (text: string, range: Range, x: number, y: number, width: number, height: number) => {
    const highlightId = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const highlight: DocumentHighlight = {
      id: highlightId,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      text,
      color: 'bg-yellow-200/30 border-yellow-400',
      type: 'highlight',
      x,
      y,
      width,
      height,
      elementId: `highlight-element-${highlightId}`
    };
    
    setHighlights(prev => [...prev, highlight]);
    
    // Show success indicator
    setSuccessPosition({ x: x + width / 2, y: y + height / 2 });
    setShowSuccessIndicator(true);
    setTimeout(() => setShowSuccessIndicator(false), 1500);
  };

  const createComment = () => {
    if (!commentPopup.selectedText.trim() || !commentPopup.commentText.trim()) return;
    
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const comment: DocumentHighlight = {
      id: commentId,
      startOffset: 0,
      endOffset: commentPopup.selectedText.length,
      text: commentPopup.selectedText,
      color: 'bg-blue-200/30 border-blue-400',
      type: 'comment',
      x: commentPopup.x - 100, // Center the highlight under the popup
      y: commentPopup.y + 40,
      width: 200,
      height: 20,
      elementId: `comment-element-${commentId}`,
      comment: {
        id: commentId,
        text: commentPopup.commentText,
        author: {
          name: "Current User",
          initials: "CU",
          avatar: undefined
        },
        timestamp: "Just now",
        mentions: extractMentions(commentPopup.commentText)
      }
    };
    
    setHighlights(prev => [...prev, comment]);
    
    // Reset comment popup
    setCommentPopup({ visible: false, x: 0, y: 0, selectedText: "", commentText: "" });
    setIsTextSelected(false);
    setSelectedText("");
    
    // Show success indicator
    setSuccessPosition({ x: comment.x + comment.width / 2, y: comment.y + comment.height / 2 });
    setShowSuccessIndicator(true);
    setTimeout(() => setShowSuccessIndicator(false), 1500);
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@([A-Za-z]+\s+[A-Za-z]+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  const deleteHighlight = (highlightId: string) => {
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
    setHoveredHighlight(null);
  };

  // Smart Select mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeAnnotationTool !== 'smart-select' || !documentRef.current) return;
    
    const rect = documentRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    setIsSelecting(true);
    setSelectionBox({ startX, startY, endX: startX, endY: startY });
    setPopup({ visible: false, x: 0, y: 0, extractedValue: "" });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionBox || !documentRef.current) return;
    
    const rect = documentRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    setSelectionBox({ ...selectionBox, endX, endY });
  };

  const handleVariableSelect = (variable: { id: string; label: string; type?: string; isMultiSelect?: boolean; entities?: any[] }) => {
    setSelectedVariable(variable.label);
    setSelectedVariableData(variable);
    setVariableSearch(variable.label);
    setShowVariableDropdown(false);
    
    // Transform popup to configured state
    setPopupState('configured');
    
    // Initialize value based on variable type
    if (variable.type === 'entity') {
      // For entities, create an entity based on extracted text
      const extractedEntity = {
        id: `extracted-${Date.now()}`,
        name: popup.extractedValue,
        type: variable.id,
        legalName: popup.extractedValue,
        industry: "Extracted from document"
      };
      
      if (variable.isMultiSelect) {
        setSmartSelectEntities([extractedEntity]);
        setSmartSelectValue([popup.extractedValue]);
      } else {
        setSmartSelectEntities([extractedEntity]);
        setSmartSelectValue(popup.extractedValue);
      }
    } else {
      // For other types, use the extracted value directly
      setSmartSelectValue(popup.extractedValue);
    }
  };

  const handleSmartSelectConfirm = () => {
    if (selectedVariableData && selectionBox) {
      // Hide popup
      setPopup({ visible: false, x: 0, y: 0, extractedValue: "" });
      
      // Show success indicator at selection center
      const centerX = (selectionBox.startX + selectionBox.endX) / 2;
      const centerY = (selectionBox.startY + selectionBox.endY) / 2;
      setSuccessPosition({ x: centerX, y: centerY });
      setShowSuccessIndicator(true);
      
      // Clear selection box and reset state
      setSelectionBox(null);
      
      // Hide success indicator after 2 seconds
      setTimeout(() => {
        setShowSuccessIndicator(false);
        setSelectedVariable("");
        setSelectedVariableData(null);
        setVariableSearch("");
        setPopupState('initial');
        setSmartSelectValue("");
        setSmartSelectEntities([]);
        setIsSmartSelectLocked(false);
      }, 2000);
    }
  };

  const handlePopupClose = () => {
    setPopup({ visible: false, x: 0, y: 0, extractedValue: "" });
    setSelectionBox(null);
    setSelectedVariable("");
    setSelectedVariableData(null);
    setVariableSearch("");
    setShowVariableDropdown(false);
    setPopupState('initial');
    setSmartSelectValue("");
    setSmartSelectEntities([]);
    setIsSmartSelectLocked(false);
  };

  const handleCommentPopupClose = () => {
    setCommentPopup({ visible: false, x: 0, y: 0, selectedText: "", commentText: "" });
    setIsTextSelected(false);
    setSelectedText("");
  };

  const handleSmartSelectLockToggle = () => {
    setIsSmartSelectLocked(!isSmartSelectLocked);
  };

  // Lockable Input Field for Smart Select
  const SmartSelectLockableInputField = ({ 
    label, 
    placeholder, 
    value, 
    type = "text"
  }: { 
    label: string; 
    placeholder: string; 
    value: string;
    type?: string;
  }) => {
    return (
      <div className="space-y-2">
        <Label className="text-xs">{label}</Label>
        <div className="flex items-center gap-1">
          <div className="flex-1 relative">
            <Input 
              placeholder={placeholder} 
              value={value}
              onChange={(e) => setSmartSelectValue(e.target.value)}
              className={`h-8 border-0 border-b border-border ${
                isSmartSelectLocked 
                  ? 'border-b-2 border-b-green-500/50' 
                  : 'border-b-2 border-b-yellow-400 shadow-[0_2px_8px_rgba(251,191,36,0.3)] animate-pulse'
              }`}
            />
          </div>
          
          {/* Source Locator Eye Icon */}
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
                  AI extracted this data from the current selection.
                </p>
              </div>
              <div className="p-3">
                <div className="text-sm font-medium">Current Document Selection</div>
                <div className="text-xs text-muted-foreground">Smart Select extraction area</div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Verification Lock Icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
                onClick={handleSmartSelectLockToggle}
              >
                {isSmartSelectLocked ? (
                  <Lock className="w-3 h-3 text-green-500" />
                ) : (
                  <Unlock className="w-3 h-3 text-yellow-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {isSmartSelectLocked 
                  ? "Value verified and locked" 
                  : "Click to verify and lock this value"
                }
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowVariableDropdown(false);
      }
      if (commentPopupRef.current && !commentPopupRef.current.contains(event.target as Node)) {
        handleCommentPopupClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Thread search and filter functions
  const searchMatchesMessage = (message: CommunicationMessage, query: string, filter: string): boolean => {
    if (!query.trim()) return true;
    
    const lowerQuery = query.toLowerCase();
    
    // Search in text content
    if (filter === 'all' || filter === 'text') {
      if (message.content.toLowerCase().includes(lowerQuery)) return true;
    }
    
    // Search in people names
    if (filter === 'all' || filter === 'people') {
      if (message.author.name.toLowerCase().includes(lowerQuery)) return true;
      if (message.author.email.toLowerCase().includes(lowerQuery)) return true;
    }
    
    // Search in files
    if (filter === 'all' || filter === 'files') {
      if (message.attachments?.some(att => att.name.toLowerCase().includes(lowerQuery))) return true;
    }
    
    // Search in hashtags (extract hashtags from content)
    if (filter === 'all' || filter === 'hashtags') {
      const hashtagRegex = /#(\w+)/g;
      const hashtags = message.content.match(hashtagRegex) || [];
      if (hashtags.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;
    }
    
    // Recursively search in replies
    if (message.replies) {
      return message.replies.some(reply => searchMatchesMessage(reply, query, filter));
    }
    
    return false;
  };

  const filterMessages = (messages: CommunicationMessage[]): CommunicationMessage[] => {
    if (!threadSearchQuery.trim()) return messages;
    
    return messages.filter(message => searchMatchesMessage(message, threadSearchQuery, threadSearchFilter));
  };

  const highlightSearchText = (text: string) => {
    if (!threadSearchQuery.trim() || threadSearchFilter === 'people' || threadSearchFilter === 'files' || threadSearchFilter === 'hashtags') {
      return text;
    }
    
    const regex = new RegExp(`(${threadSearchQuery})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200/50 text-foreground px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Communication thread helper functions
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const handleReplySubmit = (parentId: string) => {
    if (!replyText.trim()) return;
    
    // Here you would normally send the reply to your backend
    console.log(`Reply to ${parentId}:`, replyText);
    setReplyText("");
    setReplyingTo(null);
  };

  const toggleReplies = (messageId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedReplies(newExpanded);
  };

  const toggleMessage = (messageId: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      // When collapsing, also collapse all child messages
      const collapseChildren = (msg: CommunicationMessage) => {
        newExpanded.delete(msg.id);
        if (msg.replies) {
          msg.replies.forEach(reply => collapseChildren(reply));
        }
      };
      
      // Find the message in the data and collapse it and its children
      const findAndCollapse = (messages: CommunicationMessage[]) => {
        messages.forEach(msg => {
          if (msg.id === messageId) {
            collapseChildren(msg);
          } else if (msg.replies) {
            findAndCollapse(msg.replies);
          }
        });
      };
      
      findAndCollapse(currentCommunicationData.messages);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedMessages(newExpanded);
  };

  const expandAllNestedReplies = (message: CommunicationMessage) => {
    const newExpanded = new Set(expandedMessages);
    const newExpandedReplies = new Set(expandedReplies);
    
    const collectAllMessageIds = (msg: CommunicationMessage) => {
      newExpanded.add(msg.id);
      if (msg.replies && msg.replies.length > 0) {
        newExpandedReplies.add(msg.id);
        msg.replies.forEach(reply => collectAllMessageIds(reply));
      }
    };
    
    if (message.replies) {
      message.replies.forEach(reply => collectAllMessageIds(reply));
      newExpandedReplies.add(message.id);
    }
    
    setExpandedMessages(newExpanded);
    setExpandedReplies(newExpandedReplies);
  };

  const handleSendNewMessage = () => {
    if (!newMessageText.trim()) return;
    
    // Here you would normally send the message to your backend
    console.log('Sending new message:', newMessageText);
    
    // Clear the input
    setNewMessageText("");
  };

  const handleNewMessageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendNewMessage();
    }
  };

  // Helper function to collect all attachments and links from a message thread
  const collectThreadAttachments = (message: CommunicationMessage): { files: any[], links: string[] } => {
    const files: any[] = [];
    const links: string[] = [];
    
    // Collect from current message
    if (message.attachments) {
      message.attachments.forEach(att => {
        files.push(att);
      });
    }
    
    // Extract links from message content (simple regex for demonstration)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const foundLinks = message.content.match(urlRegex);
    if (foundLinks) {
      links.push(...foundLinks);
    }
    
    // Recursively collect from replies
    if (message.replies) {
      message.replies.forEach(reply => {
        const replyAttachments = collectThreadAttachments(reply);
        files.push(...replyAttachments.files);
        links.push(...replyAttachments.links);
      });
    }
    
    return { files, links };
  };

  // State for expanded pills
  const [expandedPills, setExpandedPills] = useState<{ [key: string]: { files: boolean, links: boolean } }>({});

  const togglePill = (messageId: string, pillType: 'files' | 'links') => {
    setExpandedPills(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        [pillType]: !prev[messageId]?.[pillType]
      }
    }));
  };

  const renderMessage = (message: CommunicationMessage, depth: number = 0) => {
    const hasReplies = message.replies && message.replies.length > 0;
    const isRepliesExpanded = expandedReplies.has(message.id);
    const isMessageExpanded = depth === 0 || expandedMessages.has(message.id); // Top-level always expanded
    const maxDepth = 6; // Limit nesting depth
    
    // Get attachments and links ONLY from this specific message (not from entire thread)
    const messageFiles = message.attachments || [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const messageLinks = message.content.match(urlRegex) || [];
    
    const hasFiles = messageFiles.length > 0;
    const hasLinks = messageLinks.length > 0;
    const filesExpanded = expandedPills[message.id]?.files || false;
    const linksExpanded = expandedPills[message.id]?.links || false;

    // For nested replies (depth > 0), show collapsed bar by default
    if (depth > 0 && !isMessageExpanded) {
      return (
        <div key={message.id} className={`communication-message is-reply ${depth > 0 ? 'ml-2' : ''}`}>
          <div 
            className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/20 cursor-pointer transition-all duration-200 group"
            onClick={(e) => {
              e.stopPropagation();
              toggleMessage(message.id);
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="w-5 h-5 shrink-0">
                <AvatarImage src={message.author.avatar} />
                <AvatarFallback className="text-[8px]">
                  {message.author.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate">{message.author.name}</span>
              <Badge variant="secondary" className="h-3.5 px-1 text-[8px] shrink-0">
                {message.author.role}
              </Badge>
              <span className="text-[9px] text-muted-foreground shrink-0">
                {formatTimestamp(message.timestamp)}
              </span>
              {hasReplies && (
                <Badge variant="outline" className="h-3.5 px-1 text-[8px] shrink-0 ml-auto">
                  {message.replies!.length} {message.replies!.length === 1 ? 'reply' : 'replies'}
                </Badge>
              )}
            </div>
            
            {/* Grey double chevron on the right */}
            <ChevronsDown className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
          </div>
        </div>
      );
    }

    // Expanded message view (same as before but with collapse for depth > 0)
    return (
      <div key={message.id} className={`communication-message ${depth > 0 ? 'is-reply' : ''}`}>
        <div 
          className={`border-l-2 transition-all ${depth > 0 ? 'cursor-pointer' : ''} ${
            depth === 0 
              ? 'border-primary/20 hover:border-primary/40' 
              : 'border-muted-foreground/10 hover:border-muted-foreground/30'
          } ${depth > 0 ? 'ml-2 pl-1.5' : 'pl-3'} py-2`}
          onClick={(e) => {
            if (depth > 0) {
              e.stopPropagation();
              toggleMessage(message.id);
            }
          }}
          title={depth > 0 ? "Click to collapse thread" : undefined}
        >
          
          {/* Message Header */}
          <div className="flex items-start gap-2">
            <Avatar className="w-6 h-6 shrink-0">
              <AvatarImage src={message.author.avatar} />
              <AvatarFallback className="text-[9px]">
                {message.author.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-xs font-medium">{message.author.name}</span>
                <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                  {message.author.role}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {formatTimestamp(message.timestamp)}
                </span>
                {message.isEdited && (
                  <span className="text-[9px] text-muted-foreground italic">edited</span>
                )}
                {message.isPrivate && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-amber-400/50 text-amber-500">
                    Private
                  </Badge>
                )}
              </div>
              
              {/* Message Content */}
              <div className="text-xs leading-snug text-foreground/90 mb-1.5">
                {highlightSearchText(message.content)}
              </div>
              
              {/* Message Actions & Attachments - Single Line */}
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                {/* More Actions */}
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-muted/50 rounded-full">
                  <MoreHorizontal className="w-2.5 h-2.5" />
                </Button>
                
                {/* Files Pill */}
                {hasFiles && (
                  <div className="inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePill(message.id, 'files');
                      }}
                      className="h-6 px-2 text-[10px] gap-1 rounded-full bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                    >
                      <File className="w-3 h-3" />
                      <span>Files ({messageFiles.length})</span>
                      <ChevronDown className={`w-2.5 h-2.5 transition-transform ${filesExpanded ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    <AnimatePresence>
                      {filesExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-1.5 space-y-1 overflow-hidden"
                        >
                          {messageFiles.map((attachment, idx) => (
                            <div key={`${attachment.id}-${idx}`} className={`flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded-full border border-border/50 w-fit max-w-full ${
                              threadSearchQuery && (threadSearchFilter === 'all' || threadSearchFilter === 'files') && 
                              attachment.name.toLowerCase().includes(threadSearchQuery.toLowerCase()) 
                                ? 'ring-2 ring-yellow-400/50' 
                                : ''
                            }`}>
                              <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-[10px] font-medium truncate">{attachment.name}</span>
                              <span className="text-[9px] text-muted-foreground shrink-0">({attachment.size})</span>
                              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full hover:bg-muted/50 shrink-0">
                                <Download className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                
                {/* Links Pill */}
                {hasLinks && (
                  <div className="inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePill(message.id, 'links');
                      }}
                      className="h-6 px-2 text-[10px] gap-1 rounded-full bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
                    >
                      <Link2 className="w-3 h-3" />
                      <span>Links ({messageLinks.length})</span>
                      <ChevronDown className={`w-2.5 h-2.5 transition-transform ${linksExpanded ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    <AnimatePresence>
                      {linksExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-1.5 space-y-1 overflow-hidden"
                        >
                          {messageLinks.map((link, idx) => (
                            <a
                              key={`link-${idx}`}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded-full border border-border/50 w-fit max-w-full hover:bg-muted/50 transition-colors group"
                            >
                              <Link2 className="w-3 h-3 text-purple-400 shrink-0" />
                              <span className="text-[10px] font-medium truncate max-w-[300px] group-hover:text-purple-400">{link}</span>
                            </a>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              
              {/* Reply Form */}
              {replyingTo === message.id && (
                <div className="mt-2 p-2 bg-muted/20 rounded-lg border border-border/50">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="text-xs resize-none mb-1.5 min-h-[60px]"
                    rows={2}
                  />
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 px-2 text-[10px] rounded-full"
                      onClick={() => setReplyingTo(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      className="h-6 px-2 text-[10px] rounded-full"
                      onClick={() => handleReplySubmit(message.id)}
                      disabled={!replyText.trim()}
                    >
                      <Send className="w-2.5 h-2.5 mr-1" />
                      Reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Replies Section - Direct render as collapsed bars */}
          {hasReplies && (
            <div className="mt-1.5 ml-4 space-y-0">
              {message.replies!.map((reply) => (
                depth < maxDepth 
                  ? renderMessage(reply, depth + 1)
                  : (
                    <div key={reply.id} className="ml-2 p-2 bg-muted/20 rounded-md">
                      <div className="text-[10px] text-muted-foreground">
                        Reply thread continues... 
                        <Button variant="link" className="h-auto p-0 text-[10px] ml-1">
                          View full thread
                        </Button>
                      </div>
                    </div>
                  )
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render communication thread view
  const renderCommunicationThread = () => {
    return (
      <div className="h-full flex flex-col communication-thread">
        {/* Thread Header */}
        <div className="border-b border-border bg-card/50 px-3 py-3 shrink-0 pr-16">
          {/* Subject Line and Members */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <h2 className="text-sm font-medium truncate">{currentCommunicationData.subject}</h2>
            
            {/* Member Avatars with Tooltips */}
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center -space-x-2">
                {currentCommunicationData.participants.map((email) => {
                  const details = participantDetails[email];
                  if (!details) return null;
                  
                  return (
                    <Tooltip key={email}>
                      <TooltipTrigger asChild>
                        <div className="inline-block">
                          <Avatar className="w-7 h-7 border-2 border-background cursor-pointer hover:z-10 hover:scale-110 transition-transform">
                            <AvatarFallback className="text-[9px] bg-gradient-to-br from-primary/20 to-primary/10">
                              {details.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="p-2">
                        <div className="text-xs space-y-0.5">
                          <div className="font-medium">{details.name}</div>
                          <div className="text-muted-foreground text-[10px]">{details.position}</div>
                          <div className="text-muted-foreground text-[10px]">{details.company}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>

          {/* Search Bar with Filters */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search messages, people, files, or hashtags..."
                value={threadSearchQuery}
                onChange={(e) => setThreadSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs"
              />
            </div>
            
            {/* Search Filter Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant={threadSearchFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2.5 text-[10px]"
                onClick={() => setThreadSearchFilter('all')}
              >
                All
              </Button>
              <Button
                variant={threadSearchFilter === 'text' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2.5 text-[10px]"
                onClick={() => setThreadSearchFilter('text')}
              >
                Text
              </Button>
              <Button
                variant={threadSearchFilter === 'people' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2.5 text-[10px]"
                onClick={() => setThreadSearchFilter('people')}
              >
                People
              </Button>
              <Button
                variant={threadSearchFilter === 'files' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2.5 text-[10px]"
                onClick={() => setThreadSearchFilter('files')}
              >
                Files
              </Button>
              <Button
                variant={threadSearchFilter === 'hashtags' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2.5 text-[10px]"
                onClick={() => setThreadSearchFilter('hashtags')}
              >
                #Tags
              </Button>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto document-scroll-container pr-16">
          <div className="max-w-[85%] mx-auto p-1 space-y-0">
            {filterMessages(currentCommunicationData.messages).length > 0 ? (
              filterMessages(currentCommunicationData.messages).map((message) => 
                renderMessage(message, 0)
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">No messages found</p>
                <p className="text-xs text-muted-foreground/70">
                  Try adjusting your search query or filter
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Reply Box */}
        <div className="border-t border-border bg-card/50 p-4 shrink-0">
          <div className="max-w-5xl mx-auto">
            <div className="relative">
              <TaggingInput
                placeholder="Add to this conversation... (+ for deals/files/folders, @ for people, # for topics, < for tasks)"
                value={newMessageText}
                onChange={setNewMessageText}
                onKeyDown={handleNewMessageKeyDown}
                className="resize-none text-xs min-h-[80px] bg-background/50 border-border/50"
                minHeight={80}
                maxHeight={200}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] rounded-full">
                  <Paperclip className="w-3 h-3 mr-1" />
                  Attach
                </Button>
                <span className="text-[9px] text-muted-foreground ml-2">
                  Cmd/Ctrl + Enter to send
                </span>
              </div>
              <Button 
                size="sm" 
                className="h-7 px-3 text-[10px] rounded-full"
                onClick={handleSendNewMessage}
                disabled={!newMessageText.trim()}
              >
                <Send className="w-3 h-3 mr-1" />
                Send Message
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Handle communication thread view
  if (viewMode === 'communication') {
    return renderCommunicationThread();
  }

  // Render empty state when no document is selected
  if (!selectedFileId) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 document-viewer-empty">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-muted-foreground max-w-md px-8"
        >
          <motion.div 
            className="mb-6 relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse-slow"></div>
              <FileText className="w-20 h-20 mx-auto text-muted-foreground/40 relative" />
            </div>
          </motion.div>
          <motion.h3 
            className="text-lg mb-3 font-medium text-foreground/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Pro Document Viewer
          </motion.h3>
          <motion.p 
            className="text-sm leading-relaxed text-muted-foreground/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Select a file from the explorer to begin viewing and analyzing documents. 
            The Pro Document Viewer provides enterprise-grade annotation, analysis, and collaboration tools.
          </motion.p>
          
          <motion.div 
            className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <Highlighter className="w-3.5 h-3.5" />
              <span>Annotations</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments</span>
            </div>
            <div className="flex items-center gap-2">
              <MousePointer2 className="w-3.5 h-3.5" />
              <span>Smart Select</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background document-viewer-container">
        {/* Unified Toolbar */}
        <div className="absolute top-0 left-0 right-0 document-viewer-toolbar pointer-events-none z-20">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur-md border border-border/50 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 pointer-events-auto"
          >
            {/* Left Scroll Arrow */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 flex-shrink-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110"
              onClick={() => {
                const container = document.getElementById('toolbar-content');
                if (container) {
                  container.scrollBy({ left: -200, behavior: 'smooth' });
                }
              }}
            >
              <ChevronDown className="h-3.5 w-3.5 rotate-90 transition-transform" />
            </Button>

            {/* Scrollable Content Container */}
            <div 
              id="toolbar-content"
              className="flex items-center gap-6 overflow-x-auto scrollbar-none flex-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Document Title & Status - Compact */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <h2 className="text-sm font-medium whitespace-nowrap text-[13px]">{mockDocument.title}</h2>
                {activeAnnotationTool && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 whitespace-nowrap">
                    {activeAnnotationTool === 'smart-select' ? 'Smart Select' : 
                     activeAnnotationTool.charAt(0).toUpperCase() + activeAnnotationTool.slice(1)}
                  </Badge>
                )}
              </div>

              <Separator orientation="vertical" className="h-6 flex-shrink-0" />

              {/* Core Tools - Compact */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleZoom('out')}
                        disabled={zoomLevel <= 50}
                        className="h-7 w-7 p-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110 disabled:hover:scale-100"
                      >
                        <ZoomOut className="h-3.5 w-3.5 transition-transform" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom out</TooltipContent>
                  </Tooltip>
                  
                  <span className="text-xs text-muted-foreground min-w-10 text-center whitespace-nowrap font-medium transition-colors text-[12px]">
                    {zoomLevel}%
                  </span>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleZoom('in')}
                        disabled={zoomLevel >= 200}
                        className="h-7 w-7 p-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110 disabled:hover:scale-100"
                      >
                        <ZoomIn className="h-3.5 w-3.5 transition-transform" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom in</TooltipContent>
                  </Tooltip>
                </div>

                {/* Search */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSearchOpen(!isSearchOpen)}
                      className="h-7 w-7 p-0 ml-1 hover:bg-accent/80 transition-all duration-200 hover:scale-110"
                    >
                      <Search className="h-3.5 w-3.5 transition-transform" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search document</TooltipContent>
                </Tooltip>

                {/* Annotation Tools */}
                <div className="flex items-center gap-1 ml-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeAnnotationTool === 'highlight' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleAnnotationTool('highlight')}
                        className="h-7 w-7 p-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110"
                      >
                        <Highlighter className="h-3.5 w-3.5 transition-transform" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Highlight text</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeAnnotationTool === 'comment' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleAnnotationTool('comment')}
                        className="h-7 w-7 p-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110"
                      >
                        <MessageSquare className="h-3.5 w-3.5 transition-transform" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add comment</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeAnnotationTool === 'smart-select' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleAnnotationTool('smart-select')}
                        className="h-7 w-7 p-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110"
                      >
                        <MousePointer2 className="h-3.5 w-3.5 transition-transform" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Smart select</TooltipContent>
                  </Tooltip>
                </div>

                {/* Version Control & Actions */}
                <div className="flex items-center gap-1 ml-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110">
                        <GitCompareArrows className="h-3.5 w-3.5 transition-transform" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Compare versions</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110">
                        <Download className="h-3.5 w-3.5 transition-transform" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110">
                        <Share2 className="h-3.5 w-3.5 transition-transform" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110">
                        <Bookmark className="h-3.5 w-3.5 transition-transform" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bookmark</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <Separator orientation="vertical" className="h-6 flex-shrink-0" />

              {/* Copy Action - Compact */}
              <div className="flex items-center flex-shrink-0">
                <Button variant="ghost" size="sm" className="h-7 px-3 whitespace-nowrap hover:bg-accent/80 transition-all duration-200 hover:scale-105">
                  <Copy className="h-3.5 w-3.5 mr-1.5 transition-transform" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Right Scroll Arrow */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 flex-shrink-0 hover:bg-accent/80 transition-all duration-200 hover:scale-110"
              onClick={() => {
                const container = document.getElementById('toolbar-content');
                if (container) {
                  container.scrollBy({ left: 200, behavior: 'smooth' });
                }
              }}
            >
              <ChevronDown className="h-3.5 w-3.5 -rotate-90 transition-transform" />
            </Button>
          </motion.div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-muted/20 via-muted/10 to-background p-8 document-scroll-container">
          <motion.div 
            className="max-w-4xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden relative document-page-wrapper"
            style={{ 
              transform: `scale(${zoomLevel / 100})`, 
              transformOrigin: 'top center'
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Document Page Content */}
            <div 
              ref={documentRef}
              className={`p-8 md:p-12 bg-white relative document-content-area ${
                activeAnnotationTool === 'smart-select' ? 'cursor-crosshair' : 
                activeAnnotationTool === 'highlight' || activeAnnotationTool === 'comment' ? 'cursor-text' : ''
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{ 
                cursor: activeAnnotationTool === 'smart-select' ? 'crosshair' : 
                       activeAnnotationTool === 'highlight' || activeAnnotationTool === 'comment' ? 'text' : 'default',
                userSelect: activeAnnotationTool === 'smart-select' ? 'none' : 'auto'
              }}
            >
              {/* Highlights Overlay */}
              {highlights.map((highlight) => (
                <motion.div
                  key={highlight.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: hoveredHighlight === highlight.id ? 1 : 0.7, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute pointer-events-auto cursor-pointer transition-all duration-300 ${highlight.color} hover:shadow-lg ${
                    hoveredHighlight === highlight.id ? 'opacity-100 scale-[1.02]' : 'opacity-70'
                  }`}
                  style={{
                    left: highlight.x,
                    top: highlight.y,
                    width: highlight.width,
                    height: highlight.height,
                    zIndex: 15
                  }}
                  onMouseEnter={() => setHoveredHighlight(highlight.id)}
                  onMouseLeave={() => setHoveredHighlight(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (highlight.type === 'comment' && highlight.comment) {
                      // Show comment details or edit
                      console.log('Show comment:', highlight.comment);
                    }
                  }}
                  title={highlight.type === 'comment' && highlight.comment ? highlight.comment.text : highlight.text}
                >
                  {highlight.type === 'comment' && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                      <MessageSquare className="w-2 h-2" />
                    </div>
                  )}
                  
                  {/* Delete button on hover */}
                  {hoveredHighlight === highlight.id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -left-2 w-4 h-4 p-0 rounded-full opacity-80 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHighlight(highlight.id);
                      }}
                    >
                      <X className="w-2 h-2" />
                    </Button>
                  )}
                </motion.div>
              ))}

              {/* Selection Rectangle Overlay */}
              <AnimatePresence>
                {selectionBox && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute border-2 border-primary bg-primary/10 pointer-events-none rounded-sm backdrop-blur-[1px]"
                    style={{
                      left: Math.min(selectionBox.startX, selectionBox.endX),
                      top: Math.min(selectionBox.startY, selectionBox.endY),
                      width: Math.abs(selectionBox.endX - selectionBox.startX),
                      height: Math.abs(selectionBox.endY - selectionBox.startY),
                      zIndex: 10,
                      boxShadow: '0 0 0 1px rgba(var(--primary), 0.1), 0 4px 12px rgba(var(--primary), 0.15)'
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Success Indicator */}
              <AnimatePresence>
                {showSuccessIndicator && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, rotate: -180 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0, rotate: 180 }}
                    transition={{ 
                      duration: 0.5, 
                      ease: [0.34, 1.56, 0.64, 1],
                      rotate: { duration: 0.6 }
                    }}
                    className="absolute bg-green-500 text-white rounded-full p-3 pointer-events-none shadow-2xl"
                    style={{
                      left: successPosition.x - 20,
                      top: successPosition.y - 20,
                      zIndex: 20,
                      boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.2), 0 8px 24px rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    <Check className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PAGE 1 */}
              <div className="prose max-w-none mb-16 pb-16 border-b-2 border-gray-300 page-break relative">
                <div className="text-right text-xs text-gray-400 mb-8">Page 1 of 5</div>
                
                <div className="text-center mb-12">
                  <h1 className="text-3xl font-bold mb-2">CONFIDENTIAL INVESTMENT MEMORANDUM</h1>
                  <h2 className="text-2xl font-semibold text-gray-700 mb-4">Northridge Plaza Acquisition</h2>
                  <p className="text-sm text-gray-600">Prepared for Institutional Investors</p>
                  <p className="text-xs text-gray-500 mt-2">October 9, 2025</p>
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 border-b-2 border-gray-200 pb-2">Executive Summary</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    This confidential investment memorandum presents a unique opportunity to acquire Northridge Plaza, 
                    a premier Class-A mixed-use commercial property located in the heart of downtown Seattle's Central 
                    Business District. The property comprises 487,000 square feet of prime office and retail space across 
                    a 24-story landmark building.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-6 my-6">
                    <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <h3 className="font-semibold mb-3 text-blue-900">Property Overview</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Location:</span>
                          <span className="font-medium">Seattle, WA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Total SF:</span>
                          <span className="font-medium">487,000 SF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Year Built:</span>
                          <span className="font-medium">2018</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Occupancy:</span>
                          <span className="font-medium text-green-600">96.4%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                      <h3 className="font-semibold mb-3 text-green-900">Investment Highlights</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Purchase Price:</span>
                          <span className="font-medium">$185.0M</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Cap Rate:</span>
                          <span className="font-medium">6.25%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">NOI (Year 1):</span>
                          <span className="font-medium">$11.6M</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">IRR (10-yr):</span>
                          <span className="font-medium text-green-600">14.2%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-700 leading-relaxed">
                    The investment thesis is underpinned by: (i) a strong and diversified tenant roster including 
                    three Fortune 500 anchor tenants with weighted average lease term (WALT) of 8.2 years; (ii) 
                    significant below-market rents presenting immediate mark-to-market opportunity of approximately 
                    $4.2M annually; (iii) strategic location in Seattle's most desirable office submarket with 
                    limited new supply pipeline; and (iv) value-add renovation program expected to enhance rental 
                    rates by 15-18% over a 24-month period.
                  </p>
                </div>

                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-4 border-b-2 border-gray-200 pb-2">Transaction Structure</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <tbody>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-3 font-medium w-1/3">Purchase Price</td>
                          <td className="border border-gray-300 p-3">$185,000,000</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-3 font-medium">Acquisition Costs (2.5%)</td>
                          <td className="border border-gray-300 p-3">$4,625,000</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-3 font-medium">Renovation Budget</td>
                          <td className="border border-gray-300 p-3">$12,500,000</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-3 font-medium">Working Capital Reserve</td>
                          <td className="border border-gray-300 p-3">$3,875,000</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-gray-300 p-3 font-semibold">Total Project Cost</td>
                          <td className="border border-gray-300 p-3 font-semibold">$206,000,000</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-3 font-medium">Senior Debt (65% LTV)</td>
                          <td className="border border-gray-300 p-3">$120,250,000</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-3 font-medium">Mezzanine Debt (10% LTV)</td>
                          <td className="border border-gray-300 p-3">$18,500,000</td>
                        </tr>
                        <tr className="bg-green-50">
                          <td className="border border-gray-300 p-3 font-semibold">Equity Requirement (25%)</td>
                          <td className="border border-gray-300 p-3 font-semibold">$67,250,000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* PAGE 2 */}
              <div className="prose max-w-none mb-16 pb-16 border-b-2 border-gray-300 page-break relative">
                <div className="text-right text-xs text-gray-400 mb-8">Page 2 of 5</div>

                <h2 className="text-xl font-semibold mb-4 border-b-2 border-gray-200 pb-2">Financial Analysis & Projections</h2>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-3">Historical Operating Performance</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-left">Line Item</th>
                          <th className="border border-gray-300 p-2 text-right">2022</th>
                          <th className="border border-gray-300 p-2 text-right">2023</th>
                          <th className="border border-gray-300 p-2 text-right">2024 (TTM)</th>
                          <th className="border border-gray-300 p-2 text-right">Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 p-2 font-medium">Gross Rental Income</td>
                          <td className="border border-gray-300 p-2 text-right">$18,245,000</td>
                          <td className="border border-gray-300 p-2 text-right">$19,127,000</td>
                          <td className="border border-gray-300 p-2 text-right">$20,156,000</td>
                          <td className="border border-gray-300 p-2 text-right text-green-600">+10.5%</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2">Other Income</td>
                          <td className="border border-gray-300 p-2 text-right">$1,125,000</td>
                          <td className="border border-gray-300 p-2 text-right">$1,247,000</td>
                          <td className="border border-gray-300 p-2 text-right">$1,389,000</td>
                          <td className="border border-gray-300 p-2 text-right text-green-600">+23.5%</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2">Less: Vacancy Loss</td>
                          <td className="border border-gray-300 p-2 text-right">($875,000)</td>
                          <td className="border border-gray-300 p-2 text-right">($725,000)</td>
                          <td className="border border-gray-300 p-2 text-right">($578,000)</td>
                          <td className="border border-gray-300 p-2 text-right text-green-600">-34.0%</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-gray-300 p-2 font-semibold">Effective Gross Income</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$18,495,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$19,649,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$20,967,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold text-green-600">+13.4%</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2">Operating Expenses</td>
                          <td className="border border-gray-300 p-2 text-right">($6,247,000)</td>
                          <td className="border border-gray-300 p-2 text-right">($6,589,000)</td>
                          <td className="border border-gray-300 p-2 text-right">($6,894,000)</td>
                          <td className="border border-gray-300 p-2 text-right text-red-600">+10.4%</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2">Property Taxes</td>
                          <td className="border border-gray-300 p-2 text-right">($2,145,000)</td>
                          <td className="border border-gray-300 p-2 text-right">($2,247,000)</td>
                          <td className="border border-gray-300 p-2 text-right">($2,389,000)</td>
                          <td className="border border-gray-300 p-2 text-right text-red-600">+11.4%</td>
                        </tr>
                        <tr className="bg-green-50">
                          <td className="border border-gray-300 p-2 font-semibold">Net Operating Income</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$10,103,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$10,813,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$11,684,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold text-green-600">+15.6%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-3">10-Year Cash Flow Projections</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-left">Year</th>
                          <th className="border border-gray-300 p-2 text-right">Gross Income</th>
                          <th className="border border-gray-300 p-2 text-right">Expenses</th>
                          <th className="border border-gray-300 p-2 text-right">NOI</th>
                          <th className="border border-gray-300 p-2 text-right">Debt Service</th>
                          <th className="border border-gray-300 p-2 text-right">Cash Flow</th>
                          <th className="border border-gray-300 p-2 text-right">Cash Yield</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 p-2 font-medium">Year 1</td>
                          <td className="border border-gray-300 p-2 text-right">$21,545,000</td>
                          <td className="border border-gray-300 p-2 text-right">$9,283,000</td>
                          <td className="border border-gray-300 p-2 text-right">$12,262,000</td>
                          <td className="border border-gray-300 p-2 text-right">$7,847,000</td>
                          <td className="border border-gray-300 p-2 text-right">$4,415,000</td>
                          <td className="border border-gray-300 p-2 text-right">6.57%</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2 font-medium">Year 2</td>
                          <td className="border border-gray-300 p-2 text-right">$22,591,000</td>
                          <td className="border border-gray-300 p-2 text-right">$9,562,000</td>
                          <td className="border border-gray-300 p-2 text-right">$13,029,000</td>
                          <td className="border border-gray-300 p-2 text-right">$7,847,000</td>
                          <td className="border border-gray-300 p-2 text-right">$5,182,000</td>
                          <td className="border border-gray-300 p-2 text-right">7.71%</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2 font-medium">Year 3</td>
                          <td className="border border-gray-300 p-2 text-right">$23,720,000</td>
                          <td className="border border-gray-300 p-2 text-right">$9,849,000</td>
                          <td className="border border-gray-300 p-2 text-right">$13,871,000</td>
                          <td className="border border-gray-300 p-2 text-right">$7,847,000</td>
                          <td className="border border-gray-300 p-2 text-right">$6,024,000</td>
                          <td className="border border-gray-300 p-2 text-right">8.96%</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2 font-medium">Year 4</td>
                          <td className="border border-gray-300 p-2 text-right">$24,906,000</td>
                          <td className="border border-gray-300 p-2 text-right">$10,144,000</td>
                          <td className="border border-gray-300 p-2 text-right">$14,762,000</td>
                          <td className="border border-gray-300 p-2 text-right">$7,847,000</td>
                          <td className="border border-gray-300 p-2 text-right">$6,915,000</td>
                          <td className="border border-gray-300 p-2 text-right">10.28%</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2 font-medium">Year 5</td>
                          <td className="border border-gray-300 p-2 text-right">$26,151,000</td>
                          <td className="border border-gray-300 p-2 text-right">$10,448,000</td>
                          <td className="border border-gray-300 p-2 text-right">$15,703,000</td>
                          <td className="border border-gray-300 p-2 text-right">$7,847,000</td>
                          <td className="border border-gray-300 p-2 text-right">$7,856,000</td>
                          <td className="border border-gray-300 p-2 text-right">11.68%</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-gray-300 p-2 font-semibold">5-Year Total</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$118,913,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$49,286,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$69,627,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$39,235,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$30,392,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">9.07%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">* Years 6-10 projections available in detailed financial model</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-semibold mb-3 text-purple-900">Investment Metrics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Going-in Cap Rate:</span>
                        <span className="font-medium">6.25%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Stabilized Cap Rate:</span>
                        <span className="font-medium">7.62%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Cash-on-Cash (Yr 1):</span>
                        <span className="font-medium">6.57%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Equity Multiple (10-yr):</span>
                        <span className="font-medium text-purple-600">2.47x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Levered IRR:</span>
                        <span className="font-medium text-purple-600">14.2%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h3 className="font-semibold mb-3 text-orange-900">Debt Structure</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Senior Loan Amount:</span>
                        <span className="font-medium">$120,250,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Interest Rate:</span>
                        <span className="font-medium">5.85%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">LTV Ratio:</span>
                        <span className="font-medium">65.0%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">DSCR:</span>
                        <span className="font-medium text-green-600">1.56x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Debt Yield:</span>
                        <span className="font-medium text-green-600">9.71%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAGE 3 */}
              <div className="prose max-w-none mb-16 pb-16 border-b-2 border-gray-300 page-break relative">
                <div className="text-right text-xs text-gray-400 mb-8">Page 3 of 5</div>

                <h2 className="text-xl font-semibold mb-4 border-b-2 border-gray-200 pb-2">Market Analysis & Competitive Positioning</h2>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-3">Seattle CBD Office Market Overview</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    The Seattle Central Business District continues to demonstrate resilience with strong fundamentals 
                    driven by technology sector expansion, limited new construction, and evolving workplace strategies. 
                    The CBD office market encompasses approximately 45.2 million square feet across 238 properties, 
                    with Class-A buildings representing 62% of inventory.
                  </p>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-blue-600">92.3%</p>
                      <p className="text-xs text-gray-600 mt-1">Market Occupancy</p>
                      <p className="text-[10px] text-gray-500 mt-1">+2.1% YoY</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-green-600">$48.75</p>
                      <p className="text-xs text-gray-600 mt-1">Avg Asking Rent/SF</p>
                      <p className="text-[10px] text-gray-500 mt-1">+6.8% YoY</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-purple-600">2.8M SF</p>
                      <p className="text-xs text-gray-600 mt-1">Under Construction</p>
                      <p className="text-[10px] text-gray-500 mt-1">6.2% of inventory</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-left">Submarket</th>
                          <th className="border border-gray-300 p-2 text-right">Total SF</th>
                          <th className="border border-gray-300 p-2 text-right">Occupancy</th>
                          <th className="border border-gray-300 p-2 text-right">Avg Rent/SF</th>
                          <th className="border border-gray-300 p-2 text-right">YoY Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-blue-50">
                          <td className="border border-gray-300 p-2 font-medium">Downtown Core</td>
                          <td className="border border-gray-300 p-2 text-right">18,245,000</td>
                          <td className="border border-gray-300 p-2 text-right">94.7%</td>
                          <td className="border border-gray-300 p-2 text-right">$52.50</td>
                          <td className="border border-gray-300 p-2 text-right text-green-600">+8.2%</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2">Waterfront</td>
                          <td className="border border-gray-300 p-2 text-right">8,125,000</td>
                          <td className="border border-gray-300 p-2 text-right">96.2%</td>
                          <td className="border border-gray-300 p-2 text-right">$58.75</td>
                          <td className="border border-gray-300 p-2 text-right text-green-600">+9.5%</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2">First Hill</td>
                          <td className="border border-gray-300 p-2 text-right">6,890,000</td>
                          <td className="border border-gray-300 p-2 text-right">91.8%</td>
                          <td className="border border-gray-300 p-2 text-right">$44.25</td>
                          <td className="border border-gray-300 p-2 text-right text-green-600">+5.3%</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2">South Lake Union</td>
                          <td className="border border-gray-300 p-2 text-right">11,940,000</td>
                          <td className="border border-gray-300 p-2 text-right">88.5%</td>
                          <td className="border border-gray-300 p-2 text-right">$46.00</td>
                          <td className="border border-gray-300 p-2 text-right text-green-600">+4.8%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-3">Tenant Profile & Lease Expiration Schedule</h3>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-left">Tenant Name</th>
                          <th className="border border-gray-300 p-2 text-left">Industry</th>
                          <th className="border border-gray-300 p-2 text-right">SF</th>
                          <th className="border border-gray-300 p-2 text-right">% of NRA</th>
                          <th className="border border-gray-300 p-2 text-right">Rent/SF</th>
                          <th className="border border-gray-300 p-2 text-center">Lease Exp.</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 p-2 font-medium">Amazon Web Services</td>
                          <td className="border border-gray-300 p-2">Technology</td>
                          <td className="border border-gray-300 p-2 text-right">125,000</td>
                          <td className="border border-gray-300 p-2 text-right">25.7%</td>
                          <td className="border border-gray-300 p-2 text-right">$42.50</td>
                          <td className="border border-gray-300 p-2 text-center">12/31/2033</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2 font-medium">Deloitte Consulting</td>
                          <td className="border border-gray-300 p-2">Professional Services</td>
                          <td className="border border-gray-300 p-2 text-right">87,500</td>
                          <td className="border border-gray-300 p-2 text-right">18.0%</td>
                          <td className="border border-gray-300 p-2 text-right">$45.00</td>
                          <td className="border border-gray-300 p-2 text-center">06/30/2032</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2 font-medium">Wells Fargo Securities</td>
                          <td className="border border-gray-300 p-2">Financial Services</td>
                          <td className="border border-gray-300 p-2 text-right">72,000</td>
                          <td className="border border-gray-300 p-2 text-right">14.8%</td>
                          <td className="border border-gray-300 p-2 text-right">$43.75</td>
                          <td className="border border-gray-300 p-2 text-center">03/31/2031</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2">Perkins Coie LLP</td>
                          <td className="border border-gray-300 p-2">Legal Services</td>
                          <td className="border border-gray-300 p-2 text-right">54,000</td>
                          <td className="border border-gray-300 p-2 text-right">11.1%</td>
                          <td className="border border-gray-300 p-2 text-right">$44.25</td>
                          <td className="border border-gray-300 p-2 text-center">09/30/2030</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2">Salesforce Inc.</td>
                          <td className="border border-gray-300 p-2">Technology</td>
                          <td className="border border-gray-300 p-2 text-right">48,000</td>
                          <td className="border border-gray-300 p-2 text-right">9.9%</td>
                          <td className="border border-gray-300 p-2 text-right">$46.50</td>
                          <td className="border border-gray-300 p-2 text-center">12/31/2029</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2">Other Tenants (12)</td>
                          <td className="border border-gray-300 p-2">Various</td>
                          <td className="border border-gray-300 p-2 text-right">83,000</td>
                          <td className="border border-gray-300 p-2 text-right">17.0%</td>
                          <td className="border border-gray-300 p-2 text-right">$41.80</td>
                          <td className="border border-gray-300 p-2 text-center">Various</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-gray-300 p-2 font-semibold" colSpan={2}>Total Occupied</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">469,500</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">96.4%</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$43.92</td>
                          <td className="border border-gray-300 p-2 text-center">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold mb-2 text-yellow-900">Mark-to-Market Opportunity</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      In-place weighted average rental rate of $43.92/SF is approximately 14.3% below current market 
                      rates of $51.25/SF for comparable Class-A space in Downtown Core submarket. This presents 
                      significant embedded value through lease rollovers and renewals.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="text-center p-2 bg-white rounded">
                        <p className="text-xs text-gray-600">Annual MTM Uplift Potential</p>
                        <p className="text-lg font-bold text-yellow-700">$3.44M</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <p className="text-xs text-gray-600">5-Year Cumulative Opportunity</p>
                        <p className="text-lg font-bold text-yellow-700">$12.7M</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAGE 4 */}
              <div className="prose max-w-none mb-16 pb-16 border-b-2 border-gray-300 page-break relative">
                <div className="text-right text-xs text-gray-400 mb-8">Page 4 of 5</div>

                <h2 className="text-xl font-semibold mb-4 border-b-2 border-gray-200 pb-2">Value-Add Business Plan & Capital Improvements</h2>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-3">Strategic Value Creation Initiatives</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    The investment sponsor has identified a comprehensive value-add program focused on four key pillars: 
                    (i) common area modernization; (ii) amenity enhancement; (iii) operational efficiency improvements; 
                    and (iv) active asset management to capture mark-to-market rent opportunities.
                  </p>

                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
                      <h4 className="font-semibold mb-2 text-blue-900">Phase I: Lobby & Common Area Renovation (Months 1-8)</h4>
                      <p className="text-sm text-gray-700 mb-2">Budget: $4.5M</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• Complete redesign of main lobby with contemporary finishes and digital wayfinding</li>
                        <li>• Installation of touchless entry systems and enhanced security protocols</li>
                        <li>• Elevator cab modernization and upgraded control systems</li>
                        <li>• Common corridor refresh with LED lighting upgrades (40% energy savings)</li>
                        <li>• New tenant lounge and collaboration spaces on floors 5, 12, and 18</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-l-4 border-green-500">
                      <h4 className="font-semibold mb-2 text-green-900">Phase II: Amenity Expansion (Months 6-14)</h4>
                      <p className="text-sm text-gray-700 mb-2">Budget: $3.8M</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• 8,500 SF rooftop terrace with outdoor workspace and event space</li>
                        <li>• Expansion of fitness center from 3,200 SF to 6,800 SF with premium equipment</li>
                        <li>• Full-service café and grab-and-go market in ground floor retail</li>
                        <li>• Conference center with state-of-the-art AV technology (seats 150)</li>
                        <li>• Secure bike storage for 200+ bikes with shower facilities</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border-l-4 border-purple-500">
                      <h4 className="font-semibold mb-2 text-purple-900">Phase III: Building Systems & Sustainability (Months 3-16)</h4>
                      <p className="text-sm text-gray-700 mb-2">Budget: $2.9M</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• HVAC optimization with smart building controls and air quality monitoring</li>
                        <li>• Installation of 250kW rooftop solar array (15% of building energy demand)</li>
                        <li>• Water conservation upgrades targeting 25% reduction in consumption</li>
                        <li>• LEED Gold certification process and implementation</li>
                        <li>• Implementation of tenant engagement platform and app</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border-l-4 border-orange-500">
                      <h4 className="font-semibold mb-2 text-orange-900">Phase IV: Retail Repositioning (Months 9-18)</h4>
                      <p className="text-sm text-gray-700 mb-2">Budget: $1.3M</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• Reconfiguration of ground floor retail from 4 units to 6 smaller format spaces</li>
                        <li>• Modernized storefront systems with floor-to-ceiling glass</li>
                        <li>• Enhanced outdoor seating and pedestrian plaza improvements</li>
                        <li>• Strategic tenant mix targeting service retail and food & beverage</li>
                      </ul>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-left">Capital Item</th>
                          <th className="border border-gray-300 p-2 text-right">Budget</th>
                          <th className="border border-gray-300 p-2 text-right">$/SF</th>
                          <th className="border border-gray-300 p-2 text-right">Timeline</th>
                          <th className="border border-gray-300 p-2 text-right">Expected Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 p-2">Common Area Renovation</td>
                          <td className="border border-gray-300 p-2 text-right">$4,500,000</td>
                          <td className="border border-gray-300 p-2 text-right">$9.24</td>
                          <td className="border border-gray-300 p-2 text-right">8 months</td>
                          <td className="border border-gray-300 p-2 text-right">$2.25/SF rent uplift</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2">Amenity Expansion</td>
                          <td className="border border-gray-300 p-2 text-right">$3,800,000</td>
                          <td className="border border-gray-300 p-2 text-right">$7.80</td>
                          <td className="border border-gray-300 p-2 text-right">14 months</td>
                          <td className="border border-gray-300 p-2 text-right">$1.85/SF rent uplift</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2">Building Systems</td>
                          <td className="border border-gray-300 p-2 text-right">$2,900,000</td>
                          <td className="border border-gray-300 p-2 text-right">$5.95</td>
                          <td className="border border-gray-300 p-2 text-right">16 months</td>
                          <td className="border border-gray-300 p-2 text-right">$425K annual OpEx savings</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2">Retail Repositioning</td>
                          <td className="border border-gray-300 p-2 text-right">$1,300,000</td>
                          <td className="border border-gray-300 p-2 text-right">$2.67</td>
                          <td className="border border-gray-300 p-2 text-right">18 months</td>
                          <td className="border border-gray-300 p-2 text-right">35% retail rent increase</td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="border border-gray-300 p-2 font-semibold">Total Capital Investment</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$12,500,000</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">$25.67</td>
                          <td className="border border-gray-300 p-2 text-right">24 months</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">18.5% yield on cost</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold mb-3">Post-Renovation Rent Projection</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Current In-Place Rent:</span>
                        <span className="font-medium">$43.92/SF</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Renovation Uplift:</span>
                        <span className="font-medium text-green-600">+$4.10/SF</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Market Rent Growth (2 yrs):</span>
                        <span className="font-medium text-green-600">+$3.23/SF</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                        <span className="text-gray-700 font-semibold">Stabilized Rent:</span>
                        <span className="font-bold text-lg">$51.25/SF</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Total Uplift:</span>
                        <span className="font-semibold">+16.7%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold mb-3">NOI Impact Analysis</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Current NOI:</span>
                        <span className="font-medium">$11,684,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Rental Income Increase:</span>
                        <span className="font-medium text-green-600">+$3,562,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">OpEx Savings:</span>
                        <span className="font-medium text-green-600">+$425,000</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                        <span className="text-gray-700 font-semibold">Stabilized NOI:</span>
                        <span className="font-bold text-lg">$15,671,000</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>NOI Growth:</span>
                        <span className="font-semibold">+34.1%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAGE 5 */}
              <div className="prose max-w-none mb-8 relative">
                <div className="text-right text-xs text-gray-400 mb-8">Page 5 of 5</div>

                <h2 className="text-xl font-semibold mb-4 border-b-2 border-gray-200 pb-2">Risk Factors & Mitigation Strategies</h2>

                <div className="mb-8">
                  <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500 mb-4">
                    <h4 className="font-semibold mb-2 text-red-900">Market & Economic Risks</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-red-800 mb-1">Risk: Economic Recession</p>
                        <p className="text-gray-700">Potential downturn affecting tenant demand and rental rates</p>
                        <p className="font-medium text-green-800 mt-2">Mitigation:</p>
                        <ul className="text-gray-700 text-xs ml-4">
                          <li>• Long WALT of 8.2 years provides income stability</li>
                          <li>• Diversified tenant base across multiple industries</li>
                          <li>• Conservative underwriting with 15% downside sensitivity</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-red-800 mb-1">Risk: Interest Rate Fluctuations</p>
                        <p className="text-gray-700">Rising rates could impact refinancing and exit cap rates</p>
                        <p className="font-medium text-green-800 mt-2">Mitigation:</p>
                        <ul className="text-gray-700 text-xs ml-4">
                          <li>• Fixed-rate debt locked for 10-year term</li>
                          <li>• Strong DSCR of 1.56x provides cushion</li>
                          <li>• Multiple exit strategies including hold-to-maturity</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500 mb-4">
                    <h4 className="font-semibold mb-2 text-orange-900">Operational & Property-Specific Risks</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-orange-800 mb-1">Risk: Tenant Rollover/Vacancy</p>
                        <p className="text-gray-700">Lease expirations may result in downtime and TI costs</p>
                        <p className="font-medium text-green-800 mt-2">Mitigation:</p>
                        <ul className="text-gray-700 text-xs ml-4">
                          <li>• Staggered lease maturity schedule</li>
                          <li>• $3.9M working capital reserve for TI/LC</li>
                          <li>• Early tenant engagement 18-24 months pre-expiration</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-orange-800 mb-1">Risk: Construction Cost Overruns</p>
                        <p className="text-gray-700">Capital improvement program may exceed budget</p>
                        <p className="font-medium text-green-800 mt-2">Mitigation:</p>
                        <ul className="text-gray-700 text-xs ml-4">
                          <li>• GMP contracts with reputable contractors</li>
                          <li>• 15% contingency built into renovation budget</li>
                          <li>• Phased approach allows for course correction</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500 mb-6">
                    <h4 className="font-semibold mb-2 text-yellow-900">Regulatory & Environmental Risks</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-yellow-800 mb-1">Risk: Regulatory Changes</p>
                        <p className="text-gray-700">Evolving building codes and environmental requirements</p>
                        <p className="font-medium text-green-800 mt-2">Mitigation:</p>
                        <ul className="text-gray-700 text-xs ml-4">
                          <li>• Proactive LEED Gold certification underway</li>
                          <li>• Building systems upgrades exceed current requirements</li>
                          <li>• Legal counsel monitoring regulatory landscape</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-yellow-800 mb-1">Risk: Climate & Sustainability</p>
                        <p className="text-gray-700">Increased focus on ESG compliance and carbon reduction</p>
                        <p className="font-medium text-green-800 mt-2">Mitigation:</p>
                        <ul className="text-gray-700 text-xs ml-4">
                          <li>• Solar installation and energy efficiency upgrades</li>
                          <li>• Water conservation measures reduce consumption 25%</li>
                          <li>• Annual sustainability reporting to stakeholders</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-3">Sensitivity Analysis - 10-Year Levered IRR</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-left">Exit Cap Rate →<br/>NOI Growth ↓</th>
                          <th className="border border-gray-300 p-2 text-center">5.50%</th>
                          <th className="border border-gray-300 p-2 text-center">6.00%</th>
                          <th className="border border-gray-300 p-2 text-center bg-blue-100">6.50%</th>
                          <th className="border border-gray-300 p-2 text-center">7.00%</th>
                          <th className="border border-gray-300 p-2 text-center">7.50%</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 p-2 font-medium">2.0% Annual</td>
                          <td className="border border-gray-300 p-2 text-center">17.8%</td>
                          <td className="border border-gray-300 p-2 text-center">15.9%</td>
                          <td className="border border-gray-300 p-2 text-center bg-blue-50">14.2%</td>
                          <td className="border border-gray-300 p-2 text-center">12.7%</td>
                          <td className="border border-gray-300 p-2 text-center">11.3%</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2 font-medium bg-blue-100">3.0% Annual</td>
                          <td className="border border-gray-300 p-2 text-center">19.5%</td>
                          <td className="border border-gray-300 p-2 text-center">17.4%</td>
                          <td className="border border-gray-300 p-2 text-center bg-blue-100 font-semibold">15.6%</td>
                          <td className="border border-gray-300 p-2 text-center">14.0%</td>
                          <td className="border border-gray-300 p-2 text-center">12.5%</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2 font-medium">4.0% Annual</td>
                          <td className="border border-gray-300 p-2 text-center">21.3%</td>
                          <td className="border border-gray-300 p-2 text-center">19.0%</td>
                          <td className="border border-gray-300 p-2 text-center bg-blue-50">17.1%</td>
                          <td className="border border-gray-300 p-2 text-center">15.4%</td>
                          <td className="border border-gray-300 p-2 text-center">13.8%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Base case assumptions: 3.0% annual NOI growth, 6.50% exit cap rate = 15.6% IRR</p>
                </div>

                <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                  <h3 className="text-lg font-semibold mb-3 text-center">Investment Recommendation</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Northridge Plaza represents a compelling core-plus investment opportunity combining stable cash flow, 
                    embedded value creation, and strong exit optionality. The property's exceptional location, high-quality 
                    tenant roster, and well-conceived value-add program position it to deliver risk-adjusted returns 
                    significantly above market averages for this asset class.
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1">Target Levered IRR</p>
                      <p className="text-xl font-bold text-blue-600">15.6%</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Equity Multiple</p>
                      <p className="text-xl font-bold text-green-600">2.47x</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-600 mb-1">Avg Cash Yield</p>
                      <p className="text-xl font-bold text-purple-600">9.2%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t-2 border-gray-300">
                  <p className="text-xs text-gray-500 italic">
                    This confidential investment memorandum has been prepared exclusively for institutional investors and 
                    accredited individuals. The information contained herein is confidential and proprietary. Distribution 
                    or reproduction without written consent is strictly prohibited.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    © 2025 Northridge Capital Partners LLC. All rights reserved.
                  </p>
                </div>
              </div>
            </div>

            {/* Comment Creation Popup */}
            <AnimatePresence>
              {commentPopup.visible && (
                <motion.div
                  ref={commentPopupRef}
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 10 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bg-popover border border-border rounded-lg shadow-2xl p-4 w-80 z-40 backdrop-blur-sm"
                  style={{
                    left: Math.max(10, Math.min(commentPopup.x - 160, (documentRef.current?.offsetWidth || 320) - 330)),
                    top: Math.max(10, commentPopup.y - 10)
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Add Comment</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCommentPopupClose}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Selected Text Preview */}
                    <div className="p-2 bg-muted rounded text-sm">
                      <div className="text-xs text-muted-foreground mb-1">Selected text:</div>
                      <div className="font-medium">"{commentPopup.selectedText}"</div>
                    </div>
                    
                    {/* Comment Input */}
                    <div>
                      <Textarea
                        placeholder="Add your comment... (use @Name to mention someone)"
                        value={commentPopup.commentText}
                        onChange={(e) => setCommentPopup(prev => ({ ...prev, commentText: e.target.value }))}
                        className="resize-none"
                        rows={3}
                        autoFocus
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={handleCommentPopupClose}>
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={createComment}
                        disabled={!commentPopup.commentText.trim()}
                        className="gap-1"
                      >
                        <Send className="h-3 w-3" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Link to Variable Popup */}
            <AnimatePresence>
              {popup.visible && (
                <motion.div
                  ref={popupRef}
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 10 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bg-popover border border-border rounded-lg shadow-2xl p-4 w-80 z-30 backdrop-blur-sm"
                  style={{
                    left: Math.max(10, Math.min(popup.x - 160, (documentRef.current?.offsetWidth || 320) - 330)),
                    top: Math.max(10, popup.y - 120)
                  }}
                >
                  {/* Close button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePopupClose}
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  <div className="space-y-4">
                    {popupState === 'initial' ? (
                      <>
                        <h3 className="text-sm font-medium">Link to Variable</h3>
                        
                        {/* Extracted Data Preview */}
                        <div>
                          <label className="text-xs text-muted-foreground">Extracted Value</label>
                          <div className="mt-1 p-2 bg-muted rounded text-sm font-mono">
                            {popup.extractedValue}
                          </div>
                        </div>

                        {/* Variable Selection */}
                        <div className="relative">
                          <label className="text-xs text-muted-foreground">Link to Variable...</label>
                          <div className="relative mt-1">
                            <Input
                              placeholder="Search variables..."
                              value={variableSearch}
                              onChange={(e) => {
                                setVariableSearch(e.target.value);
                                setShowVariableDropdown(true);
                              }}
                              onFocus={() => setShowVariableDropdown(true)}
                              className="pr-8"
                            />
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>

                          {/* Variable Dropdown */}
                          {showVariableDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto z-40">
                              {filteredVariables.length > 0 ? (
                                filteredVariables.map((variable) => (
                                  <div
                                    key={variable.id}
                                    onClick={() => handleVariableSelect(variable)}
                                    className="px-3 py-2 hover:bg-accent cursor-pointer"
                                  >
                                    <div className="text-sm">{variable.label}</div>
                                    <div className="text-xs text-muted-foreground">{variable.category}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  No variables found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-medium">Configure Variable: {selectedVariable}</h3>
                        
                        {/* Variable Configuration */}
                        {selectedVariableData?.type === 'entity' ? (
                          <UniversalComboboxField
                            label={selectedVariable}
                            placeholder={`Select or add ${selectedVariable.toLowerCase()}...`}
                            value={smartSelectValue}
                            onChange={setSmartSelectValue}
                            entities={smartSelectEntities}
                            onEntitiesChange={setSmartSelectEntities}
                            isMultiSelect={selectedVariableData.isMultiSelect}
                            entityType={selectedVariableData.id}
                            className="h-8"
                          />
                        ) : (
                          <SmartSelectLockableInputField
                            label={selectedVariable}
                            placeholder={`Enter ${selectedVariable.toLowerCase()}...`}
                            value={typeof smartSelectValue === 'string' ? smartSelectValue : ''}
                            type={selectedVariableData?.type || 'text'}
                          />
                        )}

                        {/* Action Button */}
                        <Button 
                          onClick={handleSmartSelectConfirm}
                          disabled={!smartSelectValue || (Array.isArray(smartSelectValue) && smartSelectValue.length === 0)}
                          className="w-full"
                        >
                          Confirm & Link
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}