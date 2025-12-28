import { useState } from "react";
import { Bell, ChevronLeft, MessageSquare, Check, X, Circle, AlertCircle, CheckCircle, Info, FileText, Users, TrendingUp, Calendar, Building2, Briefcase, User, Folder, File, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";

interface HeaderProps {
  activeView: "dashboard" | "deals" | "deal-detail";
  onViewChange: (view: "dashboard" | "deals" | "deal-detail") => void;
  selectedDeal: { id: string; name: string } | null;
  onBackToDeals: () => void;
  onChatToggle?: () => void;
  isChatOpen?: boolean;
}

interface Notification {
  id: string;
  type: "deal" | "document" | "task" | "mention" | "system";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: "low" | "medium" | "high";
  deal?: string;
  icon?: string;
}

// Global search data structures
interface SearchDealLibrary {
  id: string;
  name: string;
  type: string;
  dealCount: number;
  color: string;
}

interface SearchDeal {
  id: string;
  name: string;
  library: string;
  stage: string;
  value: string;
}

interface SearchPerson {
  id: string;
  name: string;
  role: string;
  company: string;
  initials: string;
}

interface SearchFile {
  id: string;
  name: string;
  type: "file" | "folder";
  dealId: string;
  dealName: string;
  path: string;
}

export function Header({ activeView, onViewChange, selectedDeal, onBackToDeals, onChatToggle, isChatOpen }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatNotificationCount, setChatNotificationCount] = useState(3);
  const [hasNotifications, setHasNotifications] = useState(true);
  
  // Global search data
  const dealLibraries: SearchDealLibrary[] = [
    { id: "lib-1", name: "Real Estate Capital Markets", type: "Venture Debt", dealCount: 12, color: "#3b82f6" },
    { id: "lib-2", name: "Healthcare Finance", type: "Growth Equity", dealCount: 8, color: "#10b981" },
    { id: "lib-3", name: "Technology Ventures", type: "Series A", dealCount: 15, color: "#8b5cf6" },
    { id: "lib-4", name: "Infrastructure Projects", type: "Project Finance", dealCount: 6, color: "#f59e0b" },
  ];

  const deals: SearchDeal[] = [
    { id: "deal-1", name: "Metro Office Tower", library: "Real Estate Capital Markets", stage: "Active", value: "$45M" },
    { id: "deal-2", name: "Downtown Retail Complex", library: "Real Estate Capital Markets", stage: "Due Diligence", value: "$125M" },
    { id: "deal-3", name: "Riverside Apartments", library: "Real Estate Capital Markets", stage: "Term Sheet", value: "$85M" },
    { id: "deal-4", name: "MedTech Innovations Inc", library: "Healthcare Finance", stage: "Underwriting", value: "$20M" },
    { id: "deal-5", name: "PharmaCorp Expansion", library: "Healthcare Finance", stage: "Active", value: "$55M" },
    { id: "deal-6", name: "CloudSync Technologies", library: "Technology Ventures", stage: "Due Diligence", value: "$35M" },
    { id: "deal-7", name: "AI Analytics Platform", library: "Technology Ventures", stage: "Term Sheet", value: "$15M" },
    { id: "deal-8", name: "Solar Energy Grid", library: "Infrastructure Projects", stage: "Active", value: "$200M" },
  ];

  const people: SearchPerson[] = [
    { id: "person-1", name: "Sarah Chen", role: "Senior Analyst", company: "Morgan Stanley", initials: "SC" },
    { id: "person-2", name: "Michael Rodriguez", role: "Portfolio Manager", company: "Goldman Sachs", initials: "MR" },
    { id: "person-3", name: "Emily Thompson", role: "Associate Director", company: "JPMorgan Chase", initials: "ET" },
    { id: "person-4", name: "David Park", role: "Vice President", company: "Blackstone", initials: "DP" },
    { id: "person-5", name: "Jennifer Williams", role: "Managing Director", company: "KKR", initials: "JW" },
    { id: "person-6", name: "Robert Kim", role: "Principal", company: "Carlyle Group", initials: "RK" },
  ];

  const filesAndFolders: SearchFile[] = [
    { id: "file-1", name: "Property Appraisal Report.pdf", type: "file", dealId: "deal-1", dealName: "Metro Office Tower", path: "/documents" },
    { id: "file-2", name: "Financial Statements Q3.xlsx", type: "file", dealId: "deal-2", dealName: "Downtown Retail Complex", path: "/financials" },
    { id: "file-3", name: "Term Sheet v2.docx", type: "file", dealId: "deal-3", dealName: "Riverside Apartments", path: "/legal" },
    { id: "folder-1", name: "Due Diligence", type: "folder", dealId: "deal-1", dealName: "Metro Office Tower", path: "/" },
    { id: "folder-2", name: "Site Photos", type: "folder", dealId: "deal-2", dealName: "Downtown Retail Complex", path: "/media" },
    { id: "file-4", name: "Clinical Trial Results.pdf", type: "file", dealId: "deal-4", dealName: "MedTech Innovations", path: "/research" },
    { id: "file-5", name: "Market Analysis.pptx", type: "file", dealId: "deal-6", dealName: "CloudSync Technologies", path: "/analysis" },
    { id: "folder-3", name: "Legal Documents", type: "folder", dealId: "deal-8", dealName: "Solar Energy Grid", path: "/" },
  ];

  // Filter search results
  const getSearchResults = () => {
    if (!searchQuery || searchQuery.length < 2) return null;
    
    const query = searchQuery.toLowerCase();
    
    const filteredLibraries = dealLibraries.filter(lib => 
      lib.name.toLowerCase().includes(query) || lib.type.toLowerCase().includes(query)
    );
    
    const filteredDeals = deals.filter(deal =>
      deal.name.toLowerCase().includes(query) || 
      deal.library.toLowerCase().includes(query) ||
      deal.stage.toLowerCase().includes(query)
    );
    
    const filteredPeople = people.filter(person =>
      person.name.toLowerCase().includes(query) ||
      person.role.toLowerCase().includes(query) ||
      person.company.toLowerCase().includes(query)
    );
    
    const filteredFiles = filesAndFolders.filter(file =>
      file.name.toLowerCase().includes(query) ||
      file.dealName.toLowerCase().includes(query)
    );
    
    return {
      libraries: filteredLibraries,
      deals: filteredDeals,
      people: filteredPeople,
      files: filteredFiles,
      hasResults: filteredLibraries.length > 0 || filteredDeals.length > 0 || 
                  filteredPeople.length > 0 || filteredFiles.length > 0
    };
  };

  const handleNavigate = (type: "library" | "deal" | "person" | "file", item: any) => {
    setSearchOpen(false);
    setSearchQuery("");
    
    switch (type) {
      case "library":
        // Navigate to deal library view
        onViewChange("deals");
        console.log(`Navigating to library: ${item.name}`);
        break;
      case "deal":
        // Navigate to specific deal room
        console.log(`Navigating to deal: ${item.name}`);
        break;
      case "person":
        // Open direct message chat
        onChatToggle?.();
        console.log(`Opening chat with: ${item.name}`);
        break;
      case "file":
        // Navigate to deal room and open file/folder
        console.log(`Opening ${item.type}: ${item.name} in ${item.dealName}`);
        break;
    }
  };
  
  // Notification state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread" | "deal" | "document" | "task">("all");
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "deal",
      title: "Credit Committee Approval",
      message: "Project Titan approved by credit committee",
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      read: false,
      priority: "high",
      deal: "Project Titan"
    },
    {
      id: "2",
      type: "document",
      title: "New Document Upload",
      message: "Term sheet v3.pdf added to Project Apollo",
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      read: false,
      priority: "medium",
      deal: "Project Apollo"
    },
    {
      id: "3",
      type: "task",
      title: "Due Date Approaching",
      message: "DD response due in 2 days for Project Neptune",
      timestamp: new Date(Date.now() - 1000 * 60 * 90),
      read: false,
      priority: "high",
      deal: "Project Neptune"
    },
    {
      id: "4",
      type: "mention",
      title: "You were mentioned",
      message: "@John mentioned you in Project Mercury discussion",
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      read: true,
      priority: "medium",
      deal: "Project Mercury"
    },
    {
      id: "5",
      type: "deal",
      title: "Stage Change",
      message: "Project Orion moved to Underwrite stage",
      timestamp: new Date(Date.now() - 1000 * 60 * 180),
      read: true,
      priority: "low",
      deal: "Project Orion"
    },
    {
      id: "6",
      type: "document",
      title: "Document Reviewed",
      message: "Financial model reviewed by Sarah Chen",
      timestamp: new Date(Date.now() - 1000 * 60 * 240),
      read: true,
      priority: "low",
      deal: "Project Hydra"
    },
    {
      id: "7",
      type: "system",
      title: "System Update",
      message: "Variable configuration templates updated",
      timestamp: new Date(Date.now() - 1000 * 60 * 300),
      read: true,
      priority: "low"
    },
    {
      id: "8",
      type: "task",
      title: "Task Completed",
      message: "Site visit checklist completed for Project Phoenix",
      timestamp: new Date(Date.now() - 1000 * 60 * 360),
      read: true,
      priority: "low",
      deal: "Project Phoenix"
    },
    {
      id: "9",
      type: "deal",
      title: "New Deal Created",
      message: "Project Atlas added to Venture Debt pipeline",
      timestamp: new Date(Date.now() - 1000 * 60 * 420),
      read: true,
      priority: "medium",
      deal: "Project Atlas"
    },
    {
      id: "10",
      type: "mention",
      title: "Comment Reply",
      message: "Mike replied to your comment on valuation model",
      timestamp: new Date(Date.now() - 1000 * 60 * 480),
      read: true,
      priority: "low",
      deal: "Project Titan"
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    if (notificationFilter === "unread") {
      filtered = filtered.filter(n => !n.read);
    } else if (notificationFilter !== "all") {
      filtered = filtered.filter(n => n.type === notificationFilter);
    }
    
    return filtered;
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "deal": return TrendingUp;
      case "document": return FileText;
      case "task": return Calendar;
      case "mention": return Users;
      case "system": return Info;
      default: return Circle;
    }
  };

  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "high": return "text-red-400";
      case "medium": return "text-orange-400";
      case "low": return "text-muted-foreground";
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <header className="flex items-center justify-between px-4 py-1.5 bg-[rgba(0,0,0,1)] border-b border-border/30 h-[52px] min-h-[52px] max-h-[52px]">
      {/* Left section: Logo and Navigation - Fixed width container for consistency */}
      <div className="flex items-center min-w-[280px] w-[280px]">
        <div className="flex items-center gap-3 w-full">
          {/* Primary Navigation - Consistent across all views */}
          <nav className="flex items-center gap-3 min-h-[32px]">
            <div className="flex items-center gap-3 h-[32px]">
              {/* Back Arrow - Only shows when in deal-detail view */}
              {activeView === "deal-detail" && (
                <button 
                  onClick={onBackToDeals}
                  className="flex items-center gap-1 px-1.5 py-1 text-sm text-muted-foreground hover:text-primary transition-colors h-[30px]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              
              {/* Dashboard Tab */}
              <button 
                onClick={() => onViewChange("dashboard")}
                className={`relative px-2 py-1 text-sm transition-colors h-[30px] flex items-center ${
                  activeView === "dashboard" 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                Dashboard
                {activeView === "dashboard" && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-primary"></div>
                )}
              </button>
              
              {/* Deals Tab */}
              <button 
                onClick={() => onViewChange("deals")}
                className={`relative px-2 py-1 text-sm transition-colors h-[30px] flex items-center ${
                  activeView === "deals" || activeView === "deal-detail"
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                Deals
                {(activeView === "deals" || activeView === "deal-detail") && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-primary"></div>
                )}
              </button>
              

              
              {/* Chat Button - Consistent across all views */}
              <button 
                onClick={() => {
                  if (hasNotifications) setHasNotifications(false);
                  onChatToggle?.();
                }}
                className={`relative flex items-center gap-1.5 px-2 py-1 text-sm transition-all duration-200 rounded-sm h-[30px] ml-2 ${
                  isChatOpen
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : hasNotifications
                    ? "bg-muted/80 text-foreground animate-pulse shadow-sm border border-red-500/20"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
                {hasNotifications && !isChatOpen && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-medium text-white leading-none">
                      {chatNotificationCount}
                    </span>
                  </div>
                )}
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Center section: Bloomberg-style search - Consistent spacing */}
      <div className="flex-1 max-w-md mx-5 min-w-[200px]">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <input
                type="text"
                placeholder={activeView === "deal-detail" && selectedDeal ? selectedDeal.name : "Search deals, files, entities..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className="w-full h-[30px] px-3 bg-muted/50 border border-border/50 rounded-sm text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors text-[13px] font-bold font-normal"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ⌘K
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[520px] p-0 mt-1 bg-[#0a0a0a] border-[#222222] shadow-2xl" 
            align="center"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {searchQuery.length < 2 ? (
              <div className="p-8 text-center">
                <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Type to search across deals, people, and files</p>
                <div className="flex items-center justify-center gap-3 mt-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" />
                    <span>Libraries</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3" />
                    <span>Deals</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    <span>People</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    <span>Files</span>
                  </div>
                </div>
              </div>
            ) : (() => {
              const results = getSearchResults();
              
              if (!results || !results.hasResults) {
                return (
                  <div className="p-8 text-center">
                    <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No results found for "{searchQuery}"</p>
                    <p className="text-xs text-gray-600 mt-2">Try different keywords</p>
                  </div>
                );
              }

              return (
                <ScrollArea className="max-h-[420px]">
                  <div className="p-2 max-h-[50vh] overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-800 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-700">
                    {/* Deal Libraries */}
                    {results.libraries.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500">
                          <Building2 className="w-3 h-3" />
                          <span>Deal Libraries</span>
                          <span className="ml-auto text-gray-600">{results.libraries.length}</span>
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {results.libraries.map((library) => (
                            <div
                              key={library.id}
                              onClick={() => handleNavigate("library", library)}
                              className="flex items-center gap-3 px-2 py-1 hover:bg-[#1a1a1a] rounded cursor-pointer group transition-colors"
                            >
                              <div 
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: library.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-200 group-hover:text-white truncate">
                                  {library.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {library.type} · {library.dealCount} deals
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronLeft className="w-3.5 h-3.5 text-gray-400 rotate-180" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deals */}
                    {results.deals.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500">
                          <Briefcase className="w-3 h-3" />
                          <span>Deals</span>
                          <span className="ml-auto text-gray-600">{results.deals.length}</span>
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {results.deals.slice(0, 5).map((deal) => (
                            <div
                              key={deal.id}
                              onClick={() => handleNavigate("deal", deal)}
                              className="flex items-center gap-3 px-2 py-1 hover:bg-[#1a1a1a] rounded cursor-pointer group transition-colors"
                            >
                              <div className="p-1.5 bg-blue-500/10 rounded flex-shrink-0">
                                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-200 group-hover:text-white truncate">
                                    {deal.name}
                                  </span>
                                  <span className="text-xs text-orange-400 flex-shrink-0">
                                    {deal.value}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span className="truncate">{deal.library}</span>
                                  <span>·</span>
                                  <span className="flex-shrink-0">{deal.stage}</span>
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronLeft className="w-3.5 h-3.5 text-gray-400 rotate-180" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* People */}
                    {results.people.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500">
                          <User className="w-3 h-3" />
                          <span>People</span>
                          <span className="ml-auto text-gray-600">{results.people.length}</span>
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {results.people.slice(0, 4).map((person) => (
                            <div
                              key={person.id}
                              onClick={() => handleNavigate("person", person)}
                              className="flex items-center gap-3 px-2 py-1 hover:bg-[#1a1a1a] rounded cursor-pointer group transition-colors"
                            >
                              <Avatar className="w-7 h-7 flex-shrink-0 border border-gray-700">
                                <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-300 text-xs">
                                  {person.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-200 group-hover:text-white truncate">
                                  {person.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {person.role} · {person.company}
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Files & Folders */}
                    {results.files.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500">
                          <FileText className="w-3 h-3" />
                          <span>Files & Folders</span>
                          <span className="ml-auto text-gray-600">{results.files.length}</span>
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {results.files.slice(0, 5).map((file) => (
                            <div
                              key={file.id}
                              onClick={() => handleNavigate("file", file)}
                              className="flex items-center gap-3 px-2 py-1 hover:bg-[#1a1a1a] rounded cursor-pointer group transition-colors"
                            >
                              <div className={`p-1.5 rounded flex-shrink-0 ${
                                file.type === "folder" 
                                  ? "bg-yellow-500/10" 
                                  : "bg-orange-500/10"
                              }`}>
                                {file.type === "folder" ? (
                                  <Folder className="w-3.5 h-3.5 text-yellow-400" />
                                ) : (
                                  <File className="w-3.5 h-3.5 text-orange-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-200 group-hover:text-white truncate">
                                  {file.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {file.dealName} · {file.path}
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronLeft className="w-3.5 h-3.5 text-gray-400 rotate-180" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              );
            })()}
          </PopoverContent>
        </Popover>
      </div>

      {/* Right section: User actions - Fixed width for consistency */}
      <div className="flex items-center gap-3 min-w-[80px] w-[80px] justify-end">
        {/* Notification bell */}
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <button className="relative p-1 hover:bg-accent/50 rounded-sm transition-colors w-6 h-6 flex items-center justify-center">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-destructive rounded-full"></div>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[500px] p-0 mr-4 bg-[#1a1a1a] border-[#2a2a2a] shadow-2xl" 
            align="end"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-gradient-to-b from-[#1f1f1f] to-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-400" />
                <h3 className="font-medium text-gray-100">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge className="h-5 px-2 text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-2.5 py-1.5 hover:bg-[#252525] rounded"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2.5 py-1.5 hover:bg-red-500/10 rounded"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[#2a2a2a] bg-[#1c1c1c]">
              {["all", "unread", "deal", "document", "task"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setNotificationFilter(filter as any)}
                  className={`px-2.5 py-1.5 text-xs rounded transition-all ${
                    notificationFilter === filter
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#252525] border border-transparent"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  {filter === "unread" && unreadCount > 0 && (
                    <span className="ml-1.5 text-blue-400">({unreadCount})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Notifications List - Terminal Style with Custom Scrollbar */}
            <div className="max-h-[520px] overflow-y-auto notification-scrollbar bg-[#1a1a1a]">
              {getFilteredNotifications().length === 0 ? (
                <div className="py-16 text-center">
                  <Bell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No notifications</p>
                </div>
              ) : (
                <div>
                  {getFilteredNotifications().map((notification, index) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <div
                        key={notification.id}
                        className={`group relative px-4 py-3 transition-all cursor-pointer border-b border-[#222222] ${
                          !notification.read 
                            ? "bg-gradient-to-r from-blue-500/5 to-transparent hover:from-blue-500/10" 
                            : "hover:bg-[#1f1f1f]"
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        {/* Terminal-style row */}
                        {/* Terminal-style row */}
                        <div className="flex items-start gap-3">
                          {/* Icon and status indicator */}
                          <div className="flex items-center gap-2 mt-0.5">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse shadow-lg shadow-blue-500/50"></div>
                            )}
                            <div className={`p-1.5 rounded ${
                              notification.priority === "high" 
                                ? "bg-red-500/10" 
                                : notification.priority === "medium"
                                ? "bg-orange-500/10"
                                : "bg-gray-500/10"
                            }`}>
                              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${getPriorityColor(notification.priority)}`} />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs ${
                                    !notification.read 
                                      ? "text-gray-100 font-medium" 
                                      : "text-gray-300"
                                  }`}>
                                    {notification.title}
                                  </span>
                                  {notification.deal && (
                                    <span className="text-[10px] text-gray-400 px-2 py-0.5 bg-[#252525] rounded border border-[#2a2a2a] flex-shrink-0">
                                      {notification.deal}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                  {notification.message}
                                </p>
                              </div>
                              
                              {/* Timestamp and actions */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] text-gray-500 whitespace-nowrap font-mono">
                                  {formatTimestamp(notification.timestamp)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                  title="Dismiss"
                                >
                                  <X className="w-3 h-3 text-gray-500 hover:text-red-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Priority indicator bar */}
                        {notification.priority === "high" && !notification.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600 shadow-lg shadow-red-500/50"></div>
                        )}
                        {notification.priority === "medium" && !notification.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-orange-600"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-[#2a2a2a] bg-gradient-to-t from-[#1f1f1f] to-[#1a1a1a]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {getFilteredNotifications().length} of {notifications.length} notifications
                  </span>
                  <button className="text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1">
                    View all activity
                    <ChevronLeft className="w-3 h-3 rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* User avatar */}
        <Avatar className="w-7 h-7 cursor-pointer hover:ring-1 hover:ring-ring transition-all">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            JD
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}