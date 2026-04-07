import { useState, useEffect, useCallback, useRef } from "react";
import { X, GripVertical, MessageSquare, Users, Building2, Hash, Send, ChevronRight, ChevronDown, ArrowLeft, ArrowDown, Search, Plus, User, Filter, MoreVertical, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { TaggingInput } from "./TaggingInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { NewConversationModal } from "./NewConversationModal";
import { Resizable } from "re-resizable";
import { MessageWithPills } from "./MessageWithPills";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";

interface FloatingChatWindowProps {
  onClose: () => void;
  onNavigateToDealRoom?: () => void;
  onNavigateToPeople?: () => void;
  onNavigateToTopics?: () => void;
}

interface Deal {
  id: string;
  name: string;
  unreadCount: number;
  people: Person[];
  topics: Topic[];
  library: string;
  stage: string;
}

interface Person {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: "online" | "offline" | "away";
}

interface Topic {
  id: string;
  name: string;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: "text" | "file" | "system";
}

interface Conversation {
  id: string;
  type: "dm" | "group";
  name?: string; // For group chats
  participants: Person[];
  messages: ConversationMessage[];
  unreadCount: number;
  lastMessageTime: Date;
}

interface ConversationMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

export function FloatingChatWindow({ 
  onClose, 
  onNavigateToDealRoom,
  onNavigateToPeople,
  onNavigateToTopics 
}: FloatingChatWindowProps) {
  const [sidebarTab, setSidebarTab] = useState<"deals" | "people" | "topics">("deals");
  const [activeTab, setActiveTab] = useState("deal-room");
  const [messageInput, setMessageInput] = useState("");
  const [selectedDeal, setSelectedDeal] = useState("northstar");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  // Messaging state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const conversationScrollRef = useRef<HTMLDivElement>(null);
  
  // People tab split-pane state
  const [peopleLeftPanelWidth, setPeopleLeftPanelWidth] = useState(320);
  
  // Universal filter state (context-aware based on active tab)
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Person[]>([]);
  const [selectedDeals, setSelectedDeals] = useState<Deal[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  
  // Deal library and stage filter state
  const [isDealFilterOpen, setIsDealFilterOpen] = useState(false);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Window position and size state
  const [position, setPosition] = useState(() => {
    // Center the window on initial load
    const width = 800;
    const height = 600;
    return {
      x: Math.max(20, (window.innerWidth - width) / 2),
      y: Math.max(80, (window.innerHeight - height) / 3)
    };
  });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  
  // Scroll tracking state
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const dealRoomScrollRef = useRef<HTMLDivElement>(null);
  const topicScrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    const scrollElement = activeTab === "topic-room" && selectedTopic 
      ? topicScrollRef.current 
      : dealRoomScrollRef.current;
    
    if (scrollElement) {
      const viewport = scrollElement.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    }
  }, [activeTab, selectedTopic]);

  // Check if user is at bottom of scroll
  const checkIfAtBottom = useCallback((element: HTMLElement) => {
    const threshold = 100; // pixels from bottom to consider "at bottom"
    const isBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
    setIsAtBottom(isBottom);
    setShowScrollButton(!isBottom);
  }, []);

  // Handle scroll events
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    checkIfAtBottom(target);
  }, [checkIfAtBottom]);

  // Auto-scroll when switching tabs or topics
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom(false);
      setIsAtBottom(true);
    }, 100);
  }, [activeTab, selectedTopic, scrollToBottom]);

  // Attach scroll listeners
  useEffect(() => {
    const scrollElement = activeTab === "topic-room" && selectedTopic 
      ? topicScrollRef.current 
      : dealRoomScrollRef.current;
    
    if (scrollElement) {
      const viewport = scrollElement.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.addEventListener('scroll', handleScroll);
        return () => viewport.removeEventListener('scroll', handleScroll);
      }
    }
  }, [activeTab, selectedTopic, handleScroll]);

  // Simulate typing indicators
  useEffect(() => {
    const simulateTyping = () => {
      const users = ["Sarah Chen", "Michael Rodriguez"];
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      if (Math.random() > 0.7) {
        setTypingUsers([randomUser]);
        setTimeout(() => setTypingUsers([]), 3000);
      }
    };

    const interval = setInterval(simulateTyping, 10000);
    return () => clearInterval(interval);
  }, []);
  
  // Mock data - deal libraries and stages
  const dealLibraries = [
    "Corporate Lending",
    "Venture Debt",
    "Special Situations",
    "Growth Equity",
    "Real Estate",
    "Infrastructure"
  ];

  const dealStages = [
    "New Opportunity",
    "Preliminary Screening",
    "Opportunity Memo",
    "Term Sheet",
    "Underwrite",
    "Credit Committee",
    "Documentation",
    "Loan Closing"
  ];

  // Mock data
  const deals: Deal[] = [
    {
      id: "northstar",
      name: "Project Northstar",
      unreadCount: 5,
      library: "Venture Debt",
      stage: "Underwrite",
      people: [
        { id: "1", name: "Sarah Chen", initials: "SC", role: "Investment Director", status: "online" },
        { id: "2", name: "Michael Rodriguez", initials: "MR", role: "Asset Manager", status: "online" },
        { id: "3", name: "Emily Zhang", initials: "EZ", role: "Analyst", status: "away" },
        { id: "4", name: "David Thompson", initials: "DT", role: "Legal Counsel", status: "offline" }
      ],
      topics: [
        { id: "1", name: "due-diligence", unreadCount: 3 },
        { id: "2", name: "financing", unreadCount: 1 },
        { id: "3", name: "legal-review", unreadCount: 0 }
      ]
    },
    {
      id: "riverside",
      name: "Riverside Apartments",
      unreadCount: 2,
      library: "Real Estate",
      stage: "Credit Committee",
      people: [
        { id: "5", name: "Jennifer Walsh", initials: "JW", role: "Portfolio Manager", status: "online" },
        { id: "6", name: "Robert Kim", initials: "RK", role: "Development Manager", status: "offline" }
      ],
      topics: [
        { id: "4", name: "construction", unreadCount: 2 },
        { id: "5", name: "permits", unreadCount: 0 }
      ]
    },
    {
      id: "metro",
      name: "Metro Office Tower",
      unreadCount: 0,
      library: "Corporate Lending",
      stage: "Documentation",
      people: [
        { id: "7", name: "Amanda Foster", initials: "AF", role: "Senior Associate", status: "away" }
      ],
      topics: [
        { id: "6", name: "tenant-relations", unreadCount: 0 }
      ]
    },
    {
      id: "phoenix",
      name: "Phoenix Tech Acquisition",
      unreadCount: 3,
      library: "Growth Equity",
      stage: "Term Sheet",
      people: [
        { id: "8", name: "Marcus Chen", initials: "MC", role: "VP Investments", status: "online" }
      ],
      topics: [
        { id: "7", name: "valuation", unreadCount: 1 }
      ]
    },
    {
      id: "sierra",
      name: "Sierra Energy Project",
      unreadCount: 0,
      library: "Infrastructure",
      stage: "Preliminary Screening",
      people: [
        { id: "9", name: "Lisa Park", initials: "LP", role: "Project Lead", status: "offline" }
      ],
      topics: [
        { id: "8", name: "technical-review", unreadCount: 0 }
      ]
    },
    {
      id: "coastal",
      name: "Coastal Manufacturing",
      unreadCount: 7,
      library: "Special Situations",
      stage: "New Opportunity",
      people: [
        { id: "10", name: "Tom Wilson", initials: "TW", role: "Deal Lead", status: "online" }
      ],
      topics: [
        { id: "9", name: "restructuring", unreadCount: 5 }
      ]
    }
  ];

  const dealRoomMessages: Message[] = [
    {
      id: "1",
      senderId: "1",
      senderName: "Sarah Chen",
      content: "The latest property appraisal came in at $127M, which is within our expected range. Ready to move forward with financing discussions.",
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      type: "text"
    },
    {
      id: "2",
      senderId: "2",
      senderName: "Michael Rodriguez",
      content: "Great news! I've reviewed [+File:Financial_Model.xlsx] and the cash flow projections look solid. Cap rate analysis supports the valuation.",
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      type: "text"
    },
    {
      id: "3",
      senderId: "3",
      senderName: "Emily Zhang",
      content: "Environmental due diligence report is complete in [#Folder:Due Diligence]. No major issues found, just minor remediation items totaling ~$45K.",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      type: "text"
    },
    {
      id: "4",
      senderId: "4",
      senderName: "David Kim",
      content: "I uploaded the final contract to [@Deal:Northridge Plaza] in the [+File:Purchase_Agreement.pdf] - please review the [#Folder:Legal Documents] folder for supporting docs.",
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      type: "text"
    }
  ];

  // Topic discussion messages
  const topicDiscussions: Record<string, Message[]> = {
    "1": [ // due-diligence
      {
        id: "topic-1-1",
        senderId: "1",
        senderName: "Sarah Chen",
        content: "We need to address the HVAC system concerns raised in the engineering report. The estimated replacement cost is higher than originally budgeted.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        type: "text"
      },
      {
        id: "topic-1-2",
        senderId: "3",
        senderName: "Emily Zhang",
        content: "I've been in touch with three HVAC contractors. The quotes are in [+File:HVAC_Quotes.pdf] and range from $280K to $340K. Should we negotiate this as a seller credit?",
        timestamp: new Date(Date.now() - 90 * 60 * 1000),
        type: "text"
      },
      {
        id: "topic-1-3",
        senderId: "2",
        senderName: "Michael Rodriguez",
        content: "Given the 15-year remaining useful life, I think we should proceed with seller covering 75% of the cost. This keeps our returns on target.",
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        type: "text"
      }
    ],
    "2": [ // financing
      {
        id: "topic-2-1",
        senderId: "1",
        senderName: "Sarah Chen",
        content: "Bank of America came back with 4.85% on the permanent loan. Wells Fargo is at 4.92%. Both are 10-year terms with 25-year amortization.",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        type: "text"
      },
      {
        id: "topic-2-2",
        senderId: "4",
        senderName: "David Thompson",
        content: "I've reviewed both term sheets. BofA has better prepayment flexibility. Recommend we move forward with them.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        type: "text"
      }
    ],
    "3": [ // legal-review
      {
        id: "topic-3-1",
        senderId: "4",
        senderName: "David Thompson",
        content: "Title review is clean. One small easement issue that doesn't impact our intended use. Environmental indemnity language looks standard.",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        type: "text"
      }
    ]
  };

  const currentDeal = deals.find(d => d.id === selectedDeal);

  // Search functionality - comprehensive across all chat types
  const getSearchResults = useCallback(() => {
    if (!searchQuery.trim() || !currentDeal) return { people: [], messages: [], topics: [], conversations: [] };

    const query = searchQuery.toLowerCase();

    // Search people
    const peopleResults = currentDeal.people.filter(person => 
      person.name.toLowerCase().includes(query) || 
      person.role.toLowerCase().includes(query)
    );

    // Search deal room messages
    const messageResults = dealRoomMessages.filter(message =>
      message.content.toLowerCase().includes(query) ||
      message.senderName.toLowerCase().includes(query)
    );

    // Search topics and their messages
    const topicResults = currentDeal.topics.filter(topic => {
      const topicNameMatch = topic.name.toLowerCase().includes(query);
      const topicMessagesMatch = topicDiscussions[topic.id]?.some(msg =>
        msg.content.toLowerCase().includes(query) ||
        msg.senderName.toLowerCase().includes(query)
      );
      return topicNameMatch || topicMessagesMatch;
    });

    // Search conversations (direct messages and group chats)
    const conversationResults = conversations.filter(conv => {
      const nameMatch = conv.name?.toLowerCase().includes(query);
      const participantMatch = conv.participants.some(p => 
        p.name.toLowerCase().includes(query) || 
        p.role.toLowerCase().includes(query)
      );
      const messageMatch = conv.messages.some(msg =>
        msg.content.toLowerCase().includes(query) ||
        msg.senderName.toLowerCase().includes(query)
      );
      return nameMatch || participantMatch || messageMatch;
    });

    return {
      people: peopleResults,
      messages: messageResults.slice(0, 5), // Limit to 5 messages
      topics: topicResults,
      conversations: conversationResults.slice(0, 5) // Limit to 5 conversations
    };
  }, [searchQuery, currentDeal, dealRoomMessages, topicDiscussions, conversations]);

  const searchResults = getSearchResults();
  const hasResults = searchResults.people.length > 0 || 
                     searchResults.messages.length > 0 || 
                     searchResults.topics.length > 0 ||
                     searchResults.conversations.length > 0;

  // Handle search result click
  const handleSearchResultClick = (type: 'person' | 'message' | 'topic' | 'conversation', id?: string) => {
    if (type === 'person') {
      setSidebarTab('people');
    } else if (type === 'message') {
      setSidebarTab('deals');
      setActiveTab('deal-room');
    } else if (type === 'topic' && id) {
      setSidebarTab('topics');
      setActiveTab('topic-room');
      setSelectedTopic(id);
    } else if (type === 'conversation' && id) {
      setSidebarTab('people');
      setActiveConversation(id);
    }
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is outside both the input and the dropdown
      const searchContainer = searchInputRef.current?.parentElement?.parentElement;
      if (searchContainer && !searchContainer.contains(target)) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSearchOpen]);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      // Escape to close search
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
      // Escape to close filter dropdown
      if (e.key === 'Escape' && isFilterDropdownOpen) {
        setIsFilterDropdownOpen(false);
        setFilterQuery('');
        filterInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isFilterDropdownOpen]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const searchContainer = filterInputRef.current?.parentElement?.parentElement;
      if (searchContainer && !searchContainer.contains(target)) {
        setIsFilterDropdownOpen(false);
      }
    };

    if (isFilterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFilterDropdownOpen]);

  // Drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Allow dragging from anywhere in the header
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragStart.y));
      setPosition({ x: newX, y: newY });
    } else if (isResizing && resizeHandle) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      let newWidth = initialSize.width;
      let newHeight = initialSize.height;
      let newX = initialPosition.x;
      let newY = initialPosition.y;
      
      if (resizeHandle.includes('right')) {
        newWidth = Math.max(400, initialSize.width + deltaX);
      }
      if (resizeHandle.includes('left')) {
        const widthChange = initialSize.width - deltaX;
        newWidth = Math.max(400, widthChange);
        newX = initialPosition.x + (initialSize.width - newWidth);
      }
      if (resizeHandle.includes('bottom')) {
        newHeight = Math.max(300, initialSize.height + deltaY);
      }
      if (resizeHandle.includes('top')) {
        const heightChange = initialSize.height - deltaY;
        newHeight = Math.max(300, heightChange);
        newY = initialPosition.y + (initialSize.height - newHeight);
      }
      
      // Ensure window stays within viewport
      newX = Math.max(0, Math.min(window.innerWidth - newWidth, newX));
      newY = Math.max(0, Math.min(window.innerHeight - newHeight, newY));
      
      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging, isResizing, resizeHandle, dragStart, initialSize, initialPosition, size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // Resize handle mouse down
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSize(size);
    setInitialPosition(position);
  }, [size, position]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // Handle message sending logic here
    setMessageInput("");
    
    // Auto-scroll to bottom after sending message
    setTimeout(() => scrollToBottom(true), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status: Person["status"]) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "offline": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  // Get all unique people from deals
  const allPeople = deals.flatMap(deal => deal.people).filter((person, index, self) => 
    index === self.findIndex(p => p.id === person.id)
  );

  // Create new conversation
  const handleCreateConversation = (participants: Person[], conversationName?: string) => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      type: participants.length > 1 ? "group" : "dm",
      name: conversationName,
      participants,
      messages: [],
      unreadCount: 0,
      lastMessageTime: new Date()
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversation(newConversation.id);
  };

  // Send message in conversation
  const handleSendConversationMessage = () => {
    if (!messageInput.trim() || !activeConversation) return;

    const conversation = conversations.find(c => c.id === activeConversation);
    if (!conversation) return;

    const newMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      senderId: "current-user",
      senderName: "You",
      content: messageInput.trim(),
      timestamp: new Date()
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversation) {
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessageTime: new Date()
        };
      }
      return conv;
    }));

    setMessageInput("");
    
    // Auto-scroll to bottom after sending message
    setTimeout(() => {
      const scrollElement = conversationScrollRef.current;
      if (scrollElement) {
        const viewport = scrollElement.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }, 50);
  };

  // Get conversation display name
  const getConversationName = (conversation: Conversation): string => {
    if (conversation.type === "group" && conversation.name) {
      return conversation.name;
    }
    if (conversation.type === "dm" && conversation.participants.length > 0) {
      return conversation.participants[0].name;
    }
    return conversation.participants.map(p => p.name).join(", ");
  };

  // Get conversation display initials
  const getConversationInitials = (conversation: Conversation): string => {
    if (conversation.type === "group") {
      return conversation.participants.slice(0, 2).map(p => p.initials[0]).join("");
    }
    return conversation.participants[0]?.initials || "??";
  };

  // Dynamic filter helpers - context-aware based on active tab
  const handleAddFilterItem = (item: Person | Deal | { id: string; name: string; dealName?: string }) => {
    if (sidebarTab === "people") {
      const person = item as Person;
      if (!selectedContacts.some(p => p.id === person.id)) {
        setSelectedContacts(prev => [...prev, person]);
      }
    } else if (sidebarTab === "deals") {
      const deal = item as Deal;
      if (!selectedDeals.some(d => d.id === deal.id)) {
        setSelectedDeals(prev => [...prev, deal]);
      }
    } else if (sidebarTab === "topics") {
      const topic = item as Topic;
      if (!selectedTopics.some(t => t.id === topic.id)) {
        setSelectedTopics(prev => [...prev, topic]);
      }
    }
    setFilterQuery("");
    setIsFilterDropdownOpen(false);
  };

  const handleRemoveFilterItem = (itemId: string) => {
    if (sidebarTab === "people") {
      setSelectedContacts(prev => prev.filter(p => p.id !== itemId));
    } else if (sidebarTab === "deals") {
      setSelectedDeals(prev => prev.filter(d => d.id !== itemId));
    } else if (sidebarTab === "topics") {
      setSelectedTopics(prev => prev.filter(t => t.id !== itemId));
    }
  };

  const handlePlusButtonClick = () => {
    if (sidebarTab === "people") {
      if (selectedContacts.length === 0) {
        setIsCreatingConversation(true);
      } else {
        handleCreateConversation(selectedContacts);
        setSelectedContacts([]);
      }
    } else if (sidebarTab === "deals") {
      // Future: Handle creating new deal
      console.log("Create new deal");
    } else if (sidebarTab === "topics") {
      // Future: Handle creating new topic
      console.log("Create new topic");
    }
  };

  // Filter conversations based on selected contacts
  const filteredConversations = selectedContacts.length === 0
    ? conversations
    : conversations.filter(conv => {
        return selectedContacts.every(selectedPerson =>
          conv.participants.some(participant => participant.id === selectedPerson.id)
        );
      });

  // Filter deals based on library and stage selections
  const filteredDeals = deals.filter(deal => {
    const matchesLibrary = selectedLibraries.length === 0 || selectedLibraries.includes(deal.library);
    const matchesStage = selectedStages.length === 0 || selectedStages.includes(deal.stage);
    return matchesLibrary && matchesStage;
  });

  // Deal filter handlers
  const handleToggleLibrary = (library: string) => {
    setSelectedLibraries(prev => 
      prev.includes(library) 
        ? prev.filter(l => l !== library)
        : [...prev, library]
    );
  };

  const handleToggleStage = (stage: string) => {
    setSelectedStages(prev =>
      prev.includes(stage)
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
  };

  const clearDealFilters = () => {
    setSelectedLibraries([]);
    setSelectedStages([]);
  };

  // Dynamic filter results based on active tab
  const getFilterResults = () => {
    if (!filterQuery.trim()) return [];
    const query = filterQuery.toLowerCase().replace('@', '').replace('#', '');

    if (sidebarTab === "people") {
      return allPeople.filter(person => {
        const alreadySelected = selectedContacts.some(p => p.id === person.id);
        return !alreadySelected && (
          person.name.toLowerCase().includes(query) ||
          person.role.toLowerCase().includes(query)
        );
      });
    } else if (sidebarTab === "deals") {
      return deals.filter(deal => {
        const alreadySelected = selectedDeals.some(d => d.id === deal.id);
        return !alreadySelected && deal.name.toLowerCase().includes(query);
      });
    } else if (sidebarTab === "topics") {
      const allTopicsWithDeal = deals.flatMap(deal =>
        deal.topics.map(topic => ({
          ...topic,
          dealName: deal.name
        }))
      );
      return allTopicsWithDeal.filter(topic => {
        const alreadySelected = selectedTopics.some(t => t.id === topic.id);
        return !alreadySelected && (
          topic.name.toLowerCase().includes(query) ||
          topic.dealName?.toLowerCase().includes(query)
        );
      });
    }
    return [];
  };

  const filterResults = getFilterResults();

  // Get placeholder text based on active tab
  const getPlaceholderText = () => {
    if (sidebarTab === "people") return "@mention to filter...";
    if (sidebarTab === "deals") return "Search deals...";
    if (sidebarTab === "topics") return "#topic to filter...";
    return "Search...";
  };

  // Get button title based on active tab
  const getButtonTitle = () => {
    if (sidebarTab === "people") return "New conversation";
    if (sidebarTab === "deals") return "New deal";
    if (sidebarTab === "topics") return "New topic";
    return "Create new";
  };

  // Clear filter query when switching tabs
  useEffect(() => {
    setFilterQuery("");
    setIsFilterDropdownOpen(false);
  }, [sidebarTab]);

  // Initialize dummy conversations
  useEffect(() => {
    if (conversations.length === 0 && allPeople.length > 0) {
      const dummyConversations: Conversation[] = [
        {
          id: "conv-1",
          type: "dm",
          participants: [allPeople[0]], // Sarah Chen
          messages: [
            {
              id: "msg-1",
              senderId: allPeople[0].id,
              senderName: allPeople[0].name,
              content: "Hi! I've reviewed the latest financials for Project Northstar. The numbers look solid.",
              timestamp: new Date(Date.now() - 25 * 60 * 1000)
            },
            {
              id: "msg-2",
              senderId: "current-user",
              senderName: "You",
              content: "Great! Can you send over the updated proforma?",
              timestamp: new Date(Date.now() - 20 * 60 * 1000)
            },
            {
              id: "msg-3",
              senderId: allPeople[0].id,
              senderName: allPeople[0].name,
              content: "Just uploaded [+File:Updated_Proforma.xlsx] to [@Deal:Northridge Plaza]. Check the [#Folder:Financial Analysis] folder.",
              timestamp: new Date(Date.now() - 15 * 60 * 1000)
            }
          ],
          unreadCount: 0,
          lastMessageTime: new Date(Date.now() - 15 * 60 * 1000)
        },
        {
          id: "conv-2",
          type: "dm",
          participants: [allPeople[1]], // Michael Rodriguez
          messages: [
            {
              id: "msg-4",
              senderId: allPeople[1].id,
              senderName: allPeople[1].name,
              content: "Quick question about the cap rate assumptions - are we using 6.5% or 7%?",
              timestamp: new Date(Date.now() - 45 * 60 * 1000)
            }
          ],
          unreadCount: 1,
          lastMessageTime: new Date(Date.now() - 45 * 60 * 1000)
        },
        {
          id: "conv-3",
          type: "group",
          name: "Due Diligence Team",
          participants: [allPeople[0], allPeople[2], allPeople[3]], // Sarah, Emily, David
          messages: [
            {
              id: "msg-5",
              senderId: allPeople[2].id,
              senderName: allPeople[2].name,
              content: "Environmental report just came in - no major issues!",
              timestamp: new Date(Date.now() - 120 * 60 * 1000)
            },
            {
              id: "msg-6",
              senderId: allPeople[3].id,
              senderName: allPeople[3].name,
              content: "Perfect. I'll start drafting the purchase agreement.",
              timestamp: new Date(Date.now() - 115 * 60 * 1000)
            }
          ],
          unreadCount: 2,
          lastMessageTime: new Date(Date.now() - 115 * 60 * 1000)
        }
      ];
      setConversations(dummyConversations);
    }
  }, [allPeople, conversations.length]);

  return (
    <div 
      ref={windowRef}
      className={`bg-card border border-border rounded-lg shadow-2xl flex flex-col relative backdrop-blur-sm transition-all duration-200 ease-out ${
        isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.3)] scale-[1.02] cursor-grabbing' : 'hover:shadow-[0_15px_50px_rgba(0,0,0,0.2)]'
      } ${
        isResizing ? 'shadow-[0_25px_70px_rgba(0,0,0,0.4)] ring-2 ring-primary/30' : ''
      }`}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 50,
        transform: `translate3d(0, 0, 0)`, // Enable hardware acceleration
        willChange: isDragging || isResizing ? 'transform, box-shadow' : 'auto'
      }}
    >
      {/* Enhanced Resize Handles */}
      {/* Top */}
      <div 
        className={`absolute top-0 left-4 right-4 h-2 cursor-ns-resize transition-all duration-200 ${
          !isDragging && !isResizing ? 'hover:bg-primary/30 hover:h-3 hover:-top-0.5' : ''
        } ${isResizing && resizeHandle?.includes('top') ? 'bg-primary/40 h-3 -top-0.5' : ''}`}
        onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
      />
      {/* Bottom */}
      <div 
        className={`absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize transition-all duration-200 ${
          !isDragging && !isResizing ? 'hover:bg-primary/30 hover:h-3 hover:-bottom-0.5' : ''
        } ${isResizing && resizeHandle?.includes('bottom') ? 'bg-primary/40 h-3 -bottom-0.5' : ''}`}
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
      />
      {/* Left */}
      <div 
        className={`absolute left-0 top-4 bottom-4 w-2 cursor-ew-resize transition-all duration-200 ${
          !isDragging && !isResizing ? 'hover:bg-primary/30 hover:w-3 hover:-left-0.5' : ''
        } ${isResizing && resizeHandle?.includes('left') ? 'bg-primary/40 w-3 -left-0.5' : ''}`}
        onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
      />
      {/* Right */}
      <div 
        className={`absolute right-0 top-4 bottom-4 w-2 cursor-ew-resize transition-all duration-200 ${
          !isDragging && !isResizing ? 'hover:bg-primary/30 hover:w-3 hover:-right-0.5' : ''
        } ${isResizing && resizeHandle?.includes('right') ? 'bg-primary/40 w-3 -right-0.5' : ''}`}
        onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
      />
      {/* Enhanced Corner Handles */}
      <div 
        className={`absolute top-0 left-0 w-4 h-4 cursor-nw-resize transition-all duration-200 rounded-tl-lg ${
          !isDragging && !isResizing ? 'hover:bg-primary/30 hover:w-5 hover:h-5 hover:-top-0.5 hover:-left-0.5' : ''
        } ${isResizing && resizeHandle === 'top-left' ? 'bg-primary/40 w-5 h-5 -top-0.5 -left-0.5' : ''}`}
        onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')}
      />
      <div 
        className={`absolute top-0 right-0 w-4 h-4 cursor-ne-resize transition-all duration-200 rounded-tr-lg ${
          !isDragging && !isResizing ? 'hover:bg-primary/30 hover:w-5 hover:h-5 hover:-top-0.5 hover:-right-0.5' : ''
        } ${isResizing && resizeHandle === 'top-right' ? 'bg-primary/40 w-5 h-5 -top-0.5 -right-0.5' : ''}`}
        onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
      />
      <div 
        className={`absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize transition-all duration-200 rounded-bl-lg ${
          !isDragging && !isResizing ? 'hover:bg-primary/30 hover:w-5 hover:h-5 hover:-bottom-0.5 hover:-left-0.5' : ''
        } ${isResizing && resizeHandle === 'bottom-left' ? 'bg-primary/40 w-5 h-5 -bottom-0.5 -left-0.5' : ''}`}
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
      />
      <div 
        className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize transition-all duration-200 rounded-br-lg ${
          !isDragging && !isResizing ? 'hover:bg-primary/30 hover:w-5 hover:h-5 hover:-bottom-0.5 hover:-right-0.5' : ''
        } ${isResizing && resizeHandle === 'bottom-right' ? 'bg-primary/40 w-5 h-5 -bottom-0.5 -right-0.5' : ''}`}
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
      />

      {/* Header with Search */}
      <div 
        className={`flex items-center justify-between gap-3 p-3 border-b border-border bg-card/50 select-none transition-all duration-200 ${
          isDragging ? 'cursor-grabbing bg-card/70' : 'cursor-move hover:bg-card/60'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`p-1 rounded transition-colors duration-200 ${
            isDragging ? 'bg-primary/20' : 'hover:bg-muted/50'
          }`}>
            <GripVertical className={`w-4 h-4 transition-colors duration-200 ${
              isDragging ? 'text-primary' : 'text-muted-foreground'
            }`} />
          </div>
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="font-medium">Chat</h3>
        </div>
        
        {/* Search Bar */}
        <div 
          className="flex-1 max-w-md relative"
          onMouseDown={(e) => e.stopPropagation()} // Prevent dragging when interacting with search
        >
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search messages, people, topics... (⌘K)"
              className="w-full h-7 pl-8 pr-3 bg-muted/30 border border-border/50 rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all chat-header-search"
            />
          </div>
          
          {/* Search Results Dropdown */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-2xl max-h-[400px] overflow-y-auto z-[300] chat-search-results">
              {hasResults ? (
                <div className="p-2">
                  {/* Deal Room Messages */}
                  {searchResults.messages.length > 0 && (
                    <div className="mb-3">
                      <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 sticky top-0 bg-popover/90 backdrop-blur-sm search-category-header">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Deal Room ({searchResults.messages.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.messages.map((message, index) => (
                          <button
                            key={message.id}
                            onClick={() => handleSearchResultClick('message')}
                            className="w-full p-2.5 hover:bg-accent/50 rounded-md transition-all text-left group search-result-item animate-browse-menu-item-fade"
                            style={{ animationDelay: `${index * 0.03}s` }}
                          >
                            <div className="flex items-start gap-2">
                              <Avatar className="w-6 h-6 mt-0.5 flex-shrink-0">
                                <AvatarFallback className="text-[10px]">
                                  {message.senderName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-foreground/90 mb-0.5">{message.senderName}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2">{message.content}</div>
                                <div className="text-[10px] text-muted-foreground/60 mt-1">
                                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* People/Conversations */}
                  {searchResults.conversations.length > 0 && (
                    <div className="mb-3">
                      <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 sticky top-0 bg-popover/90 backdrop-blur-sm search-category-header">
                        <Users className="w-3.5 h-3.5 text-green-400" />
                        <span>Conversations ({searchResults.conversations.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.conversations.map((conv, index) => (
                          <button
                            key={conv.id}
                            onClick={() => handleSearchResultClick('conversation', conv.id)}
                            className="w-full flex items-center gap-2.5 p-2.5 hover:bg-accent/50 rounded-md transition-all text-left search-result-item animate-browse-menu-item-fade"
                            style={{ animationDelay: `${(searchResults.messages.length + index) * 0.03}s` }}
                          >
                            <div className="relative flex-shrink-0">
                              {conv.type === "dm" ? (
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="text-xs bg-muted">
                                    {conv.participants[0]?.initials || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-border">
                                  <Users className="w-3.5 h-3.5 text-purple-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-xs font-medium truncate">
                                  {conv.type === "dm" 
                                    ? conv.participants[0]?.name 
                                    : conv.name}
                                </span>
                                {conv.type === "group" && (
                                  <Badge variant="outline" className="h-3.5 px-1 text-[9px] border-purple-500/30 text-purple-400">
                                    {conv.participants.length}
                                  </Badge>
                                )}
                              </div>
                              {conv.messages.length > 0 && (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {conv.messages[conv.messages.length - 1].content}
                                </div>
                              )}
                            </div>
                            {conv.unreadCount > 0 && (
                              <Badge className="h-4 min-w-4 px-1 text-[9px] bg-green-500 text-white flex-shrink-0">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Topics */}
                  {searchResults.topics.length > 0 && (
                    <div>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 sticky top-0 bg-popover/90 backdrop-blur-sm search-category-header">
                        <Hash className="w-3.5 h-3.5 text-orange-400" />
                        <span>Topics ({searchResults.topics.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.topics.map((topic, index) => (
                          <button
                            key={topic.id}
                            onClick={() => handleSearchResultClick('topic', topic.id)}
                            className="w-full flex items-center justify-between p-2.5 hover:bg-accent/50 rounded-md transition-all text-left search-result-item animate-browse-menu-item-fade"
                            style={{ animationDelay: `${(searchResults.messages.length + searchResults.conversations.length + index) * 0.03}s` }}
                          >
                            <div className="flex items-center gap-2">
                              <Hash className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                              <span className="text-sm">#{topic.name}</span>
                            </div>
                            {topic.unreadCount > 0 && (
                              <Badge className="h-4 px-1.5 bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs flex-shrink-0">
                                {topic.unreadCount}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* People (Direct Access) */}
                  {searchResults.people.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 sticky top-0 bg-popover/90 backdrop-blur-sm search-category-header">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span>People ({searchResults.people.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.people.map((person, index) => (
                          <button
                            key={person.id}
                            onClick={() => handleSearchResultClick('person')}
                            className="w-full flex items-center gap-2.5 p-2.5 hover:bg-accent/50 rounded-md transition-all text-left search-result-item animate-browse-menu-item-fade"
                            style={{ animationDelay: `${(searchResults.messages.length + searchResults.conversations.length + searchResults.topics.length + index) * 0.03}s` }}
                          >
                            <Avatar className="w-7 h-7 flex-shrink-0">
                              <AvatarFallback className="text-xs">{person.initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{person.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{person.role}</div>
                            </div>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              person.status === 'online' ? 'bg-green-500' :
                              person.status === 'away' ? 'bg-yellow-500' : 'bg-muted-foreground'
                            }`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center search-empty-state">
                  <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <div className="text-sm text-muted-foreground mb-1">No results found</div>
                  <div className="text-xs text-muted-foreground/60">
                    Try searching for people, messages, or topics
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()} // Prevent dragging when clicking close
          className="w-6 h-6 p-0 hover:bg-muted/50 flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Resizable Left Navigation Pane */}
        <Resizable
          size={{ width: peopleLeftPanelWidth, height: '100%' }}
          onResizeStop={(e, direction, ref, d) => {
            setPeopleLeftPanelWidth(peopleLeftPanelWidth + d.width);
          }}
          minWidth={240}
          maxWidth={520}
          enable={{ 
            top: false, 
            right: true, 
            bottom: false, 
            left: false, 
            topRight: false, 
            bottomRight: false, 
            bottomLeft: false, 
            topLeft: false 
          }}
          handleStyles={{
            right: {
              width: '6px',
              right: '-3px',
              cursor: 'col-resize',
              zIndex: 10,
            }
          }}
          handleClasses={{
            right: 'hover:bg-primary/40 active:bg-primary/60 transition-colors duration-150'
          }}
          className="border-r border-border bg-muted/20 flex-shrink-0 bg-[rgba(38,38,38,0.64)] flex flex-col overflow-hidden"
        >
          {/* Tab Buttons */}
          <div className="flex border-b border-border bg-muted/10">
            <button
              onClick={() => setSidebarTab("deals")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                sidebarTab === "deals"
                  ? "border-blue-400 text-foreground bg-muted/20"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10"
              }`}
            >
              Deals
            </button>
            <button
              onClick={() => setSidebarTab("people")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                sidebarTab === "people"
                  ? "border-green-400 text-foreground bg-muted/20"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10"
              }`}
            >
              People
            </button>
            <button
              onClick={() => setSidebarTab("topics")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                sidebarTab === "topics"
                  ? "border-orange-400 text-foreground bg-muted/20"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10"
              }`}
            >
              Topics
            </button>
          </div>

          {/* Persistent Search/Filter Bar - Shared across all tabs */}
          <div className="px-3 py-2.5 border-b border-border/50 bg-muted/10 flex-shrink-0">
            <div className="relative flex items-center gap-2">
              <div className="flex-1 min-h-[32px] p-1.5 bg-muted/30 border border-border/50 rounded-md flex flex-wrap items-center gap-1">
                {/* Selected filter pills - dynamic based on tab */}
                {sidebarTab === "people" && selectedContacts.map((contact) => (
                  <Badge
                    key={contact.id}
                    variant="secondary"
                    className="pl-0.5 pr-1.5 py-0.5 gap-1 bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 h-5"
                  >
                    <Avatar className="w-3.5 h-3.5">
                      <AvatarFallback className="text-[8px] bg-green-500/20">
                        {contact.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px]">{contact.name}</span>
                    <button
                      onClick={() => handleRemoveFilterItem(contact.id)}
                      className="ml-0.5 hover:text-foreground transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}

                {sidebarTab === "deals" && selectedDeals.map((deal) => (
                  <Badge
                    key={deal.id}
                    variant="secondary"
                    className="pl-0.5 pr-1.5 py-0.5 gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 h-5"
                  >
                    <Building2 className="w-3 h-3" />
                    <span className="text-[10px]">{deal.name}</span>
                    <button
                      onClick={() => handleRemoveFilterItem(deal.id)}
                      className="ml-0.5 hover:text-foreground transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}

                {sidebarTab === "topics" && selectedTopics.map((topic) => (
                  <Badge
                    key={topic.id}
                    variant="secondary"
                    className="pl-0.5 pr-1.5 py-0.5 gap-1 bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 h-5"
                  >
                    <Hash className="w-3 h-3" />
                    <span className="text-[10px]">{topic.name}</span>
                    <button
                      onClick={() => handleRemoveFilterItem(topic.id)}
                      className="ml-0.5 hover:text-foreground transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}

                {/* Dynamic search input */}
                <input
                  ref={filterInputRef}
                  type="text"
                  placeholder={getPlaceholderText()}
                  value={filterQuery}
                  onChange={(e) => {
                    setFilterQuery(e.target.value);
                    setIsFilterDropdownOpen(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => {
                    if (filterQuery.trim()) {
                      setIsFilterDropdownOpen(true);
                    }
                  }}
                  className="flex-1 min-w-[100px] h-5 bg-transparent border-0 text-xs placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Deal Filter Button (only visible on deals tab) */}
              {sidebarTab === "deals" && (
                <Popover open={isDealFilterOpen} onOpenChange={setIsDealFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-8 w-8 p-0 flex-shrink-0 rounded-[3px] ${
                        selectedLibraries.length > 0 || selectedStages.length > 0
                          ? "bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30"
                          : ""
                      }`}
                      title="Filter by library and stage"
                    >
                      <Filter className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="end" side="bottom">
                    <div className="flex flex-col max-h-[400px]">
                      {/* Header */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                        <span className="text-xs font-medium">Filter Deals</span>
                        {(selectedLibraries.length > 0 || selectedStages.length > 0) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearDealFilters}
                            className="h-6 px-2 text-xs"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>

                      {/* Libraries Section */}
                      <div className="border-b border-border/50">
                        <div className="px-3 py-2 bg-muted/30">
                          <span className="text-xs font-medium text-muted-foreground">Deal Libraries</span>
                        </div>
                        <ScrollArea className="h-[140px]">
                          <div className="px-3 py-2 space-y-2">
                            {dealLibraries.map((library) => (
                              <div key={library} className="flex items-center gap-2">
                                <Checkbox
                                  id={`library-${library}`}
                                  checked={selectedLibraries.includes(library)}
                                  onCheckedChange={() => handleToggleLibrary(library)}
                                />
                                <label
                                  htmlFor={`library-${library}`}
                                  className="text-xs cursor-pointer flex-1"
                                >
                                  {library}
                                </label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Stages Section */}
                      <div>
                        <div className="px-3 py-2 bg-muted/30">
                          <span className="text-xs font-medium text-muted-foreground">Stages</span>
                        </div>
                        <ScrollArea className="h-[140px]">
                          <div className="px-3 py-2 space-y-2">
                            {dealStages.map((stage) => (
                              <div key={stage} className="flex items-center gap-2">
                                <Checkbox
                                  id={`stage-${stage}`}
                                  checked={selectedStages.includes(stage)}
                                  onCheckedChange={() => handleToggleStage(stage)}
                                />
                                <label
                                  htmlFor={`stage-${stage}`}
                                  className="text-xs cursor-pointer flex-1"
                                >
                                  {stage}
                                </label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Dynamic + button */}
              <Button
                size="sm"
                className={`h-8 w-8 p-0 flex-shrink-0 rounded-[3px] ${
                  sidebarTab === "people" 
                    ? "bg-green-600 hover:bg-green-700" 
                    : sidebarTab === "deals"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
                onClick={handlePlusButtonClick}
                title={getButtonTitle()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>

              {/* Dynamic filter suggestions dropdown */}
              {isFilterDropdownOpen && filterResults.length > 0 && (
                <div className="absolute top-full left-0 right-12 mt-1 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-[300] animate-browse-menu-slide-in">
                  <div className="p-1 space-y-0.5">
                    {sidebarTab === "people" && filterResults.map((person: any, index) => (
                      <button
                        key={person.id}
                        onClick={() => handleAddFilterItem(person)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors text-xs animate-browse-menu-item-fade"
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <div className="relative">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-[9px] bg-muted">
                              {person.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background ${getStatusColor(person.status)}`} />
                        </div>
                        
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-xs truncate">{person.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {person.role}
                          </div>
                        </div>
                      </button>
                    ))}

                    {sidebarTab === "deals" && filterResults.map((deal: any, index) => (
                      <button
                        key={deal.id}
                        onClick={() => handleAddFilterItem(deal)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors text-xs animate-browse-menu-item-fade"
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-xs truncate">{deal.name}</div>
                          {deal.unreadCount > 0 && (
                            <Badge className="h-3 px-1 text-[8px] bg-primary/20 text-primary border-primary/30 mt-0.5">
                              {deal.unreadCount} unread
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}

                    {sidebarTab === "topics" && filterResults.map((topic: any, index) => (
                      <button
                        key={topic.id}
                        onClick={() => handleAddFilterItem(topic)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors text-xs animate-browse-menu-item-fade"
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <Hash className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-xs truncate">{topic.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {topic.dealName}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Deals Tab Content */}
          {sidebarTab === "deals" && (
            <ScrollArea className="flex-1 overflow-hidden">
              {filteredDeals.length === 0 ? (
                <div className="py-12 px-3 text-center">
                  <Building2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground mb-3">
                    {selectedLibraries.length > 0 || selectedStages.length > 0 
                      ? "No deals match the selected filters"
                      : "No deals available"}
                  </p>
                  {(selectedLibraries.length > 0 || selectedStages.length > 0) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearDealFilters}
                      className="h-7 text-xs"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <Accordion type="single" collapsible value={selectedDeal} onValueChange={setSelectedDeal} className="overflow-hidden">
                  {filteredDeals.map((deal) => (
                  <AccordionItem key={deal.id} value={deal.id} className="border-none overflow-hidden">
                    <AccordionTrigger className="px-3 py-2 hover:bg-muted/50 data-[state=open]:bg-muted/50 overflow-hidden">
                      <div className="flex items-center justify-between w-full mr-2 overflow-hidden">
                        <span className="text-sm font-medium truncate">{deal.name}</span>
                        {deal.unreadCount > 0 && (
                          <Badge className="h-4 px-1.5 bg-primary/20 text-primary border-primary/30">
                            {deal.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0 overflow-hidden">
                      <div className="space-y-1 px-3 pb-2 overflow-hidden">
                        <button 
                          onClick={() => {
                            setActiveTab('deal-room');
                            setSearchQuery('');
                            setIsSearchOpen(false);
                            onNavigateToDealRoom?.();
                          }}
                          className="w-full text-left px-2 py-1 text-xs hover:bg-muted/30 rounded flex items-center gap-2"
                        >
                          <Building2 className="w-3 h-3 text-blue-400" />
                          Deal Room
                          {deal.unreadCount > 0 && (
                            <Badge className="h-3 px-1 text-[10px] bg-primary/20 text-primary border-primary/30 ml-auto">
                              {deal.unreadCount}
                            </Badge>
                          )}
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('people');
                            setSearchQuery('');
                            setIsSearchOpen(false);
                            onNavigateToPeople?.();
                          }}
                          className="w-full text-left px-2 py-1 text-xs hover:bg-muted/30 rounded flex items-center gap-2"
                        >
                          <Users className="w-3 h-3 text-green-400" />
                          People
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('topic-room');
                            setSearchQuery('');
                            setIsSearchOpen(false);
                            onNavigateToTopics?.();
                          }}
                          className="w-full text-left px-2 py-1 text-xs hover:bg-muted/30 rounded flex items-center gap-2"
                        >
                          <Hash className="w-3 h-3 text-orange-400" />
                          Topics
                        </button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
                </Accordion>
              )}
            </ScrollArea>
          )}

          {/* People Tab Content - Conversations Navigation */}
          {sidebarTab === "people" && (
            <ScrollArea className="flex-1 overflow-hidden">
                <div className="p-2 min-w-0 w-full">
                  {conversations.length === 0 ? (
                    <div className="py-12 px-3 text-center">
                      <MessageSquare className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground mb-3">No conversations yet</p>
                      <p className="text-[10px] text-muted-foreground/60">
                        Click the + button above to start a conversation
                      </p>
                    </div>
                  ) : filteredConversations.length === 0 && selectedContacts.length > 0 ? (
                    <div className="py-12 px-3 text-center">
                      <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground mb-3">
                        No conversations with {selectedContacts.map(c => c.name).join(", ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        Click the + button above to start a new conversation
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 min-w-0 w-full">
                      {filteredConversations
                        .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime())
                        .map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => setActiveConversation(conversation.id)}
                          className={`w-full min-w-0 flex items-center gap-1 px-1.5 py-1.5 rounded transition-colors text-left ${
                            activeConversation === conversation.id
                              ? "bg-green-500/10 border border-green-500/30"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            {conversation.type === "dm" ? (
                              <Avatar className="w-6 h-6 flex-shrink-0">
                                <AvatarFallback className="text-[9px] bg-muted">
                                  {getConversationInitials(conversation)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-6 h-6 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-500/20 to-green-500/20 flex items-center justify-center border border-border">
                                <Users className="w-3 h-3 text-purple-400" />
                              </div>
                            )}
                            {conversation.type === "dm" && conversation.participants[0] && (
                              <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 ${getStatusColor(conversation.participants[0].status)} rounded-full border border-background`} />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-1 mb-0.5 min-w-0 overflow-hidden">
                              <span className="text-xs font-medium truncate flex-shrink">
                                {getConversationName(conversation)}
                              </span>
                              {conversation.type === "group" && (
                                <Badge variant="outline" className="h-3 px-1 text-[8px] border-purple-500/30 text-purple-400 flex-shrink-0">
                                  {conversation.participants.length}
                                </Badge>
                              )}
                            </div>
                            {conversation.messages.length > 0 ? (
                              <div className="text-[10px] text-muted-foreground truncate overflow-hidden">
                                {conversation.messages[conversation.messages.length - 1].content}
                              </div>
                            ) : (
                              <div className="text-[10px] text-muted-foreground/50 italic truncate">
                                No messages
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0 min-w-[32px]">
                            {conversation.messages.length > 0 && (
                              <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                                {conversation.lastMessageTime.toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            )}
                            {conversation.unreadCount > 0 && (
                              <Badge className="h-3.5 min-w-3.5 px-1 text-[8px] bg-green-500 text-white">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
          )}

          {/* Topics Tab Content */}
          {sidebarTab === "topics" && (
            <ScrollArea className="flex-1 overflow-hidden">
              <div className="p-3 overflow-hidden">
                <div className="space-y-2 overflow-hidden">
                  {deals.flatMap(deal => 
                    deal.topics.map(topic => ({
                      ...topic,
                      dealName: deal.name
                    }))
                  ).map((topic) => (
                    <button
                      key={topic.id}
                      className="w-full flex items-center gap-2 p-2 hover:bg-muted/30 rounded transition-colors text-left"
                    >
                      <Hash className="w-3 h-3 text-orange-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{topic.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{topic.dealName}</div>
                      </div>
                      {topic.unreadCount > 0 && (
                        <Badge className="h-3 px-1 text-[10px] bg-primary/20 text-primary border-primary/30">
                          {topic.unreadCount}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </Resizable>

        {/* Main Chat View */}
        <div className="flex-1 flex flex-col bg-[rgba(42,42,42,0.5)]">
          {/* Contextual Header Bar */}
          {(sidebarTab === "deals" || (sidebarTab === "people" && activeConversation) || sidebarTab === "topics") && (
            <div className="border-b border-border bg-card/30 backdrop-blur-sm px-4 py-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                {sidebarTab === "deals" && selectedDeal && (
                  <>
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-sm">
                      {deals.find(d => d.id === selectedDeal)?.name || "Deal"}
                    </span>
                    <span className="text-muted-foreground">:</span>
                    <span className="text-sm text-muted-foreground">
                      {activeTab === "deal-room" ? "Deal Room" : activeTab === "topic-room" ? "Topics" : "People"}
                    </span>
                  </>
                )}
                {sidebarTab === "people" && activeConversation && (() => {
                  const conversation = conversations.find(c => c.id === activeConversation);
                  return conversation ? (
                    <>
                      {conversation.type === "dm" ? (
                        <User className="w-4 h-4 text-green-400" />
                      ) : (
                        <Users className="w-4 h-4 text-purple-400" />
                      )}
                      <span className="font-medium text-sm">{getConversationName(conversation)}</span>
                      {conversation.type === "group" && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-purple-500/30 text-purple-400">
                          {conversation.participants.length} members
                        </Badge>
                      )}
                    </>
                  ) : null;
                })()}
                {sidebarTab === "topics" && selectedTopic && (() => {
                  const topic = deals.flatMap(d => d.topics.map(t => ({ ...t, dealName: d.name }))).find(t => t.id === selectedTopic);
                  return topic ? (
                    <>
                      <Hash className="w-4 h-4 text-orange-400" />
                      <span className="font-medium text-sm">{topic.name}</span>
                      <span className="text-muted-foreground">:</span>
                      <span className="text-sm text-muted-foreground">{topic.dealName}</span>
                    </>
                  ) : null;
                })()}
              </div>
            </div>
          )}
          
          {/* People Tab: Direct chat view (conversation list is in left sidebar) */}
          {sidebarTab === "people" ? (
            <div className="flex flex-col h-full">
              {activeConversation ? (
                (() => {
                  const conversation = conversations.find(c => c.id === activeConversation);
                  if (!conversation) return null;
                  
                  return (
                    <div className="flex flex-col h-full">
                      {/* Messages Area */}
                      <ScrollArea ref={conversationScrollRef} className="flex-1 p-4 chat-scroll-container">
                        <div className="space-y-3">
                          {conversation.messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center py-12">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground">
                                  No messages yet
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                  Start the conversation by sending a message below
                                </p>
                              </div>
                            </div>
                          ) : (
                            conversation.messages.map((message) => (
                              <div key={message.id} className="group hover:bg-muted/10 rounded-lg p-2 -m-2 transition-all duration-150">
                                <div className="flex gap-3">
                                  <Avatar className="w-7 h-7 mt-0.5">
                                    <AvatarFallback className="text-xs">
                                      {message.senderName.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-medium text-sm">{message.senderName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <div className="text-sm leading-relaxed text-foreground/90">
                                      <MessageWithPills content={message.content} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>

                      {/* Message Input */}
                      <div className="border-t border-border bg-card/30 backdrop-blur-sm p-4 flex-shrink-0">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 min-w-0">
                            <TaggingInput
                              value={messageInput}
                              onChange={setMessageInput}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendConversationMessage();
                                }
                              }}
                              placeholder={`Message ${getConversationName(conversation)}... (+ for deals/files/folders, @ for people, # for topics, < for tasks)`}
                              className="w-full"
                            />
                          </div>
                          <Button
                            onClick={handleSendConversationMessage}
                            disabled={!messageInput.trim()}
                            size="sm"
                            className="h-9 px-3 bg-green-600 hover:bg-green-700 flex-shrink-0"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Select a conversation
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Choose a conversation from the list or create a new one
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Original tabs view for deals and topics */
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="w-full grid grid-cols-3 bg-card/30 backdrop-blur-sm border-b border-border h-10 rounded-none">
                <TabsTrigger value="deal-room" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none">
                  Deal Room
                </TabsTrigger>
                <TabsTrigger value="people-room" className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-400 data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none">
                  People
                </TabsTrigger>
                <TabsTrigger value="topic-room" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none">
                  Topics
                </TabsTrigger>
              </TabsList>

            <TabsContent value="deal-room" className="flex-1 flex flex-col m-0 relative">
              <ScrollArea ref={dealRoomScrollRef} className="flex-1 p-4 chat-scroll-container">
                <div className="space-y-3">
                  {dealRoomMessages.map((message) => (
                    <div key={message.id} className="group hover:bg-muted/10 rounded-lg p-2 -m-2 transition-all duration-150 ease-out">
                      <div className="flex gap-3">
                        <Avatar className="w-7 h-7 mt-0.5 transition-transform duration-150 group-hover:scale-105">
                          <AvatarFallback className="text-xs">
                            {message.senderName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm">{message.senderName}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              <span className="inline-flex items-center gap-1 opacity-70">
                                <span className="hover:bg-muted/30 px-1 py-0.5 rounded cursor-pointer transition-colors" title="2 reactions">👍2</span>
                                <span className="hover:bg-muted/30 px-1 py-0.5 rounded cursor-pointer transition-colors" title="1 reaction">💡1</span>
                              </span>
                            </span>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 hover:bg-muted/50 hover:scale-110 transition-all duration-150"
                                title="Add reaction"
                              >
                                <span className="text-xs">👍</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 hover:bg-muted/50 hover:scale-110 transition-all duration-150"
                                title="Reply"
                              >
                                <ChevronRight className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm leading-relaxed text-foreground/90">
                            <MessageWithPills content={message.content} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing Indicator */}
                  {typingUsers.length > 0 && activeTab === "deal-room" && (
                    <div className="flex gap-3 items-center px-2 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">
                          {typingUsers[0].split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{typingUsers[0]} is typing</span>
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Jump to Bottom Button */}
              {showScrollButton && activeTab === "deal-room" && (
                <Button
                  onClick={() => scrollToBottom(true)}
                  size="sm"
                  className="absolute bottom-20 right-4 h-8 w-8 p-0 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200"
                  title="Jump to latest message"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              )}

              {/* Message Input */}
              <div className="border-t border-border bg-card/30 backdrop-blur-sm p-4 flex-shrink-0">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <TaggingInput
                      value={messageInput}
                      onChange={setMessageInput}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Message the deal room... (+ for deals/files/folders, @ for people, # for topics, < for tasks)"
                      className="w-full"
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    size="sm"
                    className="h-9 px-3 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="topic-room" className="flex-1 flex flex-col m-0 relative">
              {!selectedTopic ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Hash className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Select a topic to view messages</p>
                  </div>
                </div>
              ) : (
                <>
                  <ScrollArea ref={topicScrollRef} className="flex-1 p-4 chat-scroll-container">
                    <div className="space-y-3">
                      {topicRoomMessages.map((message) => (
                        <div key={message.id} className="group hover:bg-muted/10 rounded-lg p-2 -m-2 transition-all duration-150 ease-out">
                          <div className="flex gap-3">
                            <Avatar className="w-7 h-7 mt-0.5 transition-transform duration-150 group-hover:scale-105">
                              <AvatarFallback className="text-xs">
                                {message.senderName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium text-sm">{message.senderName}</span>
                                <span className="text-xs text-muted-foreground">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="text-sm leading-relaxed text-foreground/90">
                                <MessageWithPills content={message.content} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Typing Indicator */}
                      {typingUsers.length > 0 && activeTab === "topic-room" && (
                        <div className="flex gap-3 items-center px-2 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs">
                              {typingUsers[0].split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{typingUsers[0]} is typing</span>
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Jump to Bottom Button */}
                  {showScrollButton && activeTab === "topic-room" && (
                    <Button
                      onClick={() => scrollToBottom(true)}
                      size="sm"
                      className="absolute bottom-20 right-4 h-8 w-8 p-0 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200"
                      title="Jump to latest message"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Message Input */}
                  <div className="border-t border-border bg-card/30 backdrop-blur-sm p-4 flex-shrink-0">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 min-w-0">
                        <TaggingInput
                          value={messageInput}
                          onChange={setMessageInput}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Message this topic... (+ for deals/files/folders, @ for people, # for topics, < for tasks)"
                          className="w-full"
                        />
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                        size="sm"
                        className="h-9 px-3 bg-orange-600 hover:bg-orange-700 flex-shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="people-room" className="flex-1 flex flex-col m-0">
              <div className="flex flex-col h-full">
                {/* Header with Search and Add Button */}
                <div className="border-b border-border bg-card/30 backdrop-blur-sm px-4 py-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Filter by name or role..."
                        className="h-8 bg-background/50 border-border/60 text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-8 px-3 bg-muted hover:bg-muted/80 text-foreground"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Add Team Member
                    </Button>
                  </div>
                </div>

                {/* Team Members Table */}
                <ScrollArea className="flex-1">
                  <div className="px-4 py-3">
                    <div className="border border-border/40 rounded-lg overflow-hidden bg-card/20">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/40 bg-muted/30">
                            <th className="text-left px-4 py-2.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                              Name
                            </th>
                            <th className="text-left px-4 py-2.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                              Role
                            </th>
                            <th className="text-left px-4 py-2.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                              Deal Permissions
                            </th>
                            <th className="text-left px-4 py-2.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                              Status
                            </th>
                            <th className="text-right px-4 py-2.5 text-[11px] tracking-wide text-muted-foreground uppercase w-12">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* John Doe */}
                          <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="text-[10px] bg-blue-500/20 text-blue-400">
                                    JD
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">John Doe</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">VP</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-red-500/40 text-red-400 bg-red-500/10 text-[10px] px-2">
                                Admin
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-green-500/40 text-green-400 bg-green-500/10 text-[10px] px-2">
                                Active
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs">Edit Permissions</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs text-red-400">Remove from Deal</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>

                          {/* Jane Smith */}
                          <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="text-[10px] bg-purple-500/20 text-purple-400">
                                    JS
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">Jane Smith</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">Analyst</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/10 text-[10px] px-2">
                                Read/Write
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-green-500/40 text-green-400 bg-green-500/10 text-[10px] px-2">
                                Active
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs">Edit Permissions</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs text-red-400">Remove from Deal</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>

                          {/* Michael Chen */}
                          <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="text-[10px] bg-green-500/20 text-green-400">
                                    MC
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">Michael Chen</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">Associate</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/10 text-[10px] px-2">
                                Read/Write
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-green-500/40 text-green-400 bg-green-500/10 text-[10px] px-2">
                                Active
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs">Edit Permissions</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs text-red-400">Remove from Deal</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>

                          {/* Sarah Jenkins */}
                          <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="text-[10px] bg-orange-500/20 text-orange-400">
                                    SJ
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">Sarah Jenkins</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">Managing Director</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-red-500/40 text-red-400 bg-red-500/10 text-[10px] px-2">
                                Admin
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-green-500/40 text-green-400 bg-green-500/10 text-[10px] px-2">
                                Active
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs">Edit Permissions</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs text-red-400">Remove from Deal</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>

                          {/* David Lee */}
                          <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="text-[10px] bg-cyan-500/20 text-cyan-400">
                                    DL
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">David Lee</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">VP</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-yellow-500/40 text-yellow-400 bg-yellow-500/10 text-[10px] px-2">
                                Read-Only
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-green-500/40 text-green-400 bg-green-500/10 text-[10px] px-2">
                                Active
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs">Edit Permissions</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs text-red-400">Remove from Deal</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>

                          {/* Emily White */}
                          <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="text-[10px] bg-pink-500/20 text-pink-400">
                                    EW
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">Emily White</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">Analyst</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/10 text-[10px] px-2">
                                Read/Write
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-green-500/40 text-green-400 bg-green-500/10 text-[10px] px-2">
                                Active
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs">Edit Permissions</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs text-red-400">Remove from Deal</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>

                          {/* Robert Vance */}
                          <tr className="hover:bg-muted/10 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="text-[10px] bg-indigo-500/20 text-indigo-400">
                                    RV
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">Robert Vance</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">CIO</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-yellow-500/40 text-yellow-400 bg-yellow-500/10 text-[10px] px-2">
                                Read-Only
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px] px-2">
                                Invited
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs">Edit Permissions</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs text-red-400">Remove from Deal</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        open={isCreatingConversation}
        onOpenChange={setIsCreatingConversation}
        onCreateConversation={handleCreateConversation}
        availablePeople={allPeople}
      />
    </div>
  );
}