import { useState } from "react";
import { X, Mail, FileText, Clock, User, Import, Calendar, Paperclip, Building, Search, Filter, Upload, FolderPlus, CheckCircle, History, Undo2, ChevronDown, Check, File as FileIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface InboundItem {
  id: string;
  type: "email" | "file";
  source: string;
  timestamp: string;
  preview: string;
  attachments?: string[];
  sender?: string;
  subject?: string;
  filename?: string;
}

interface ImportHistoryEntry {
  itemId: string;
  importedTo: string; // Deal name or "New Deal: {name}"
  library: string;
  timestamp: Date;
  action: "import-to-deal" | "new-deal";
}

interface InboundItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealName: string;
}

// Available deal libraries (business units)
const DEAL_LIBRARIES = [
  "Corporate Lending",
  "Venture Debt",
  "Special Situations",
  "Growth Equity"
];

// Mock existing deals for selection
const EXISTING_DEALS = [
  { id: "1", name: "Sunset Tower Acquisition", library: "Corporate Lending" },
  { id: "2", name: "TechCorp Series C", library: "Venture Debt" },
  { id: "3", name: "Retail Portfolio Refinance", library: "Corporate Lending" },
  { id: "4", name: "GreenEnergy Expansion", library: "Growth Equity" },
  { id: "5", name: "Healthcare REIT Merger", library: "Special Situations" },
];

export function InboundItemsModal({ isOpen, onClose, dealName }: InboundItemsModalProps) {
  const [importingItems, setImportingItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "email" | "file" | "imported">("all");
  
  // Multi-select state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Import history tracking
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([]);
  
  // Import to Existing Deal state
  const [showImportDealDialog, setShowImportDealDialog] = useState(false);
  const [selectedDealsForImport, setSelectedDealsForImport] = useState<string[]>([]);
  const [isImportingToDeal, setIsImportingToDeal] = useState(false);
  const [dealSearchOpen, setDealSearchOpen] = useState(false);
  const [dealSearchQuery, setDealSearchQuery] = useState("");
  
  // New Deal import state
  const [showNewDealDialog, setShowNewDealDialog] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<string>(DEAL_LIBRARIES[0]);
  const [newDealName, setNewDealName] = useState("");
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);

  // Mock inbound items data - Expanded for better demo
  const inboundItems: InboundItem[] = [
    {
      id: "1",
      type: "email",
      source: "jane.doe@kkr.com",
      timestamp: "Sep 21, 2025, 5:45 PM",
      preview: "RE: Updated Financial Model",
      sender: "Jane Doe",
      subject: "RE: Updated Financial Model",
      attachments: ["Q3_Financial_Model_v2.xlsx", "Cash_Flow_Projections.pdf"]
    },
    {
      id: "2",
      type: "email", 
      source: "legal@bakermckenzie.com",
      timestamp: "Sep 21, 2025, 3:22 PM",
      preview: "Due Diligence Document Review",
      sender: "Sarah Chen",
      subject: "Due Diligence Document Review",
      attachments: ["DD_Checklist_Updated.pdf", "Legal_Opinion_Draft.docx"]
    },
    {
      id: "3",
      type: "file",
      source: "michael.torres@company.com",
      timestamp: "Sep 21, 2025, 2:15 PM", 
      preview: "Environmental_Assessment_Report.pdf",
      filename: "Environmental_Assessment_Report.pdf"
    },
    {
      id: "4",
      type: "email",
      source: "accounting@targetcompany.com",
      timestamp: "Sep 21, 2025, 11:30 AM",
      preview: "Monthly Financial Statements - August 2025",
      sender: "Robert Kim", 
      subject: "Monthly Financial Statements - August 2025",
      attachments: ["Aug_2025_P&L.xlsx", "Aug_2025_Balance_Sheet.xlsx", "Aug_2025_Cash_Flow.xlsx"]
    },
    {
      id: "5",
      type: "email",
      source: "broker@commercialre.com", 
      timestamp: "Sep 21, 2025, 9:45 AM",
      preview: "Property Inspection Report and Photos",
      sender: "Lisa Wang",
      subject: "Property Inspection Report and Photos", 
      attachments: ["Inspection_Report_Final.pdf", "Property_Photos.zip"]
    },
    {
      id: "6",
      type: "email",
      source: "compliance@regulatorygroup.com",
      timestamp: "Sep 21, 2025, 8:15 AM",
      preview: "Q3 Compliance Audit Results",
      sender: "David Martinez",
      subject: "Q3 Compliance Audit Results",
      attachments: ["Compliance_Report_Q3.pdf", "Audit_Findings.xlsx", "Remediation_Plan.docx"]
    },
    {
      id: "7",
      type: "file",
      source: "engineering@techstartup.io",
      timestamp: "Sep 20, 2025, 11:45 PM",
      preview: "Technical_Architecture_Diagram.pdf",
      filename: "Technical_Architecture_Diagram.pdf"
    },
    {
      id: "8",
      type: "email",
      source: "hr@acquisitiontarget.com",
      timestamp: "Sep 20, 2025, 4:30 PM",
      preview: "Employee Census and Benefits Overview",
      sender: "Amanda Foster",
      subject: "Employee Census and Benefits Overview",
      attachments: ["Employee_Census_2025.xlsx", "Benefits_Summary.pdf"]
    },
    {
      id: "9",
      type: "email",
      source: "tax@deloitte.com",
      timestamp: "Sep 20, 2025, 2:10 PM",
      preview: "FW: Tax Structure Analysis",
      sender: "James O'Connor",
      subject: "FW: Tax Structure Analysis",
      attachments: ["Tax_Structure_Memo.pdf", "IRC_409A_Valuation.pdf", "State_Tax_Implications.xlsx"]
    },
    {
      id: "10",
      type: "file",
      source: "cfo@growthcompany.com",
      timestamp: "Sep 20, 2025, 1:20 PM",
      preview: "Cap_Table_Current.xlsx",
      filename: "Cap_Table_Current.xlsx"
    },
    {
      id: "11",
      type: "email",
      source: "marketing@targetfirm.com",
      timestamp: "Sep 20, 2025, 10:55 AM",
      preview: "RE: Customer Acquisition Metrics & Pipeline",
      sender: "Emily Rodriguez",
      subject: "RE: Customer Acquisition Metrics & Pipeline",
      attachments: ["CAC_LTV_Analysis.xlsx", "Sales_Pipeline_Q3.pdf"]
    },
    {
      id: "12",
      type: "email",
      source: "insurance@marsh.com",
      timestamp: "Sep 20, 2025, 9:30 AM",
      preview: "D&O Insurance Renewal Quote",
      sender: "Patricia Lee",
      subject: "D&O Insurance Renewal Quote",
      attachments: ["D&O_Quote_2025.pdf", "Coverage_Comparison.xlsx"]
    },
    {
      id: "13",
      type: "file",
      source: "operations@manufacturing.com",
      timestamp: "Sep 19, 2025, 6:45 PM",
      preview: "Supply_Chain_Analysis_2025.pdf",
      filename: "Supply_Chain_Analysis_2025.pdf"
    },
    {
      id: "14",
      type: "email",
      source: "investors@sequoia.com",
      timestamp: "Sep 19, 2025, 3:15 PM",
      preview: "Term Sheet Discussion Points",
      sender: "Michael Zhang",
      subject: "Term Sheet Discussion Points",
      attachments: ["Term_Sheet_Draft_v3.pdf", "Valuation_Summary.xlsx"]
    },
    {
      id: "15",
      type: "email",
      source: "cybersecurity@mandiant.com",
      timestamp: "Sep 19, 2025, 1:40 PM",
      preview: "Security Assessment & Penetration Test Results",
      sender: "Alex Kumar",
      subject: "Security Assessment & Penetration Test Results",
      attachments: ["Pentest_Report.pdf", "Vulnerability_Matrix.xlsx", "Remediation_Roadmap.pdf"]
    },
    {
      id: "16",
      type: "file",
      source: "product@saascompany.com",
      timestamp: "Sep 19, 2025, 11:20 AM",
      preview: "Product_Roadmap_2025_2026.pdf",
      filename: "Product_Roadmap_2025_2026.pdf"
    },
    {
      id: "17",
      type: "email",
      source: "landlord@realestate.com",
      timestamp: "Sep 19, 2025, 9:05 AM",
      preview: "Lease Agreement Renewal - Office Space",
      sender: "Thomas Grant",
      subject: "Lease Agreement Renewal - Office Space",
      attachments: ["Lease_Renewal_Terms.pdf", "Property_Tax_Statement.pdf"]
    },
    {
      id: "18",
      type: "email",
      source: "consultant@bcg.com",
      timestamp: "Sep 18, 2025, 5:30 PM",
      preview: "Market Analysis & Competitive Landscape Report",
      sender: "Victoria Chen",
      subject: "Market Analysis & Competitive Landscape Report",
      attachments: ["Market_Analysis_Final.pdf", "Competitor_Benchmarking.xlsx", "Growth_Projections.xlsx"]
    }
  ];

  // Filter and search functionality
  const filteredItems = inboundItems.filter(item => {
    // If showing imported items, only show items in import history
    if (filterType === "imported") {
      return importHistory.some(h => h.itemId === item.id);
    }
    
    // Otherwise, exclude imported items from the regular views
    const isImported = importHistory.some(h => h.itemId === item.id);
    if (isImported) return false;
    
    const matchesSearch = searchQuery === "" || 
      item.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sender && item.sender.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.subject && item.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.filename && item.filename.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.attachments && item.attachments.some(att => att.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesFilter = filterType === "all" || item.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const handleOpenImportDealDialog = () => {
    setSelectedDealsForImport([]);
    setShowImportDealDialog(true);
  };

  const handleConfirmImportToDeal = async () => {
    if (selectedItems.length === 0 || selectedDealsForImport.length === 0) return;
    
    setIsImportingToDeal(true);
    
    // Simulate import process
    setTimeout(() => {
      const selectedDeals = EXISTING_DEALS.filter(d => selectedDealsForImport.includes(d.id));
      
      // Add to import history
      setImportHistory(prev => [...prev, ...selectedDeals.map(deal => ({
        itemId: selectedItems[0],
        importedTo: deal.name,
        library: deal.library,
        timestamp: new Date(),
        action: "import-to-deal"
      }))]);
      
      console.log(`Imported item ${selectedItems[0]} to deals: ${selectedDeals.map(deal => deal.name).join(", ")}`);
      setIsImportingToDeal(false);
      setShowImportDealDialog(false);
      setSelectedItems([]);
    }, 2000);
  };

  const handleCancelImportToDeal = () => {
    setShowImportDealDialog(false);
    setSelectedItems([]);
  };

  const handleImportAsNewDeal = (itemId: string) => {
    const item = inboundItems.find(i => i.id === itemId);
    setSelectedItems([itemId]);
    // Pre-fill new deal name with email subject or filename
    if (item) {
      const suggestedName = item.type === "email" 
        ? item.subject?.replace(/^RE:\s*/i, '').replace(/^FW:\s*/i, '') || "New Deal"
        : item.filename?.replace(/\.[^/.]+$/, '') || "New Deal";
      setNewDealName(suggestedName);
    }
    setShowNewDealDialog(true);
  };

  const handleConfirmNewDeal = async () => {
    if (!newDealName.trim() || selectedItems.length === 0) return;
    
    setIsCreatingDeal(true);
    
    // Simulate creating deal and importing
    setTimeout(() => {
      // Add to import history
      setImportHistory(prev => [...prev, {
        itemId: selectedItems[0],
        importedTo: `New Deal: ${newDealName}`,
        library: selectedLibrary,
        timestamp: new Date(),
        action: "new-deal"
      }]);
      
      console.log(`Created new deal "${newDealName}" in library "${selectedLibrary}" with item ${selectedItems[0]}`);
      setIsCreatingDeal(false);
      setShowNewDealDialog(false);
      setSelectedItems([]);
      setNewDealName("");
    }, 2000);
  };
  
  const handleUndoImport = (itemId: string) => {
    // Remove from import history
    setImportHistory(prev => prev.filter(h => h.itemId !== itemId));
    console.log(`Undid import for item ${itemId}`);
  };

  const handleCancelNewDeal = () => {
    setShowNewDealDialog(false);
    setSelectedItems([]);
    setNewDealName("");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return timestamp;
    }
  };

  const renderItemIcon = (item: InboundItem) => {
    if (item.type === "email") {
      return <Mail className="w-5 h-5 text-blue-400" />;
    } else {
      return <FileText className="w-5 h-5 text-green-400" />;
    }
  };

  const renderItemPreview = (item: InboundItem) => {
    if (item.type === "email") {
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{item.subject}</p>
            <p className="text-xs text-muted-foreground">From: {item.sender}</p>
          </div>
          {item.attachments && item.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.attachments.map((attachment, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {attachment}
                </Badge>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{item.filename}</p>
          <p className="text-xs text-muted-foreground">Uploaded by: {item.source}</p>
        </div>
      );
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[75vw] !max-w-[75vw] h-[85vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-4 py-1.5 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="px-[0px] py-[4px]">
              <DialogTitle>
                Import New Items: {dealName}
              </DialogTitle>
              <DialogDescription className="mt-0">
                Review and import emails, documents, and files into your deal folder
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search and Filter Bar - Pinned */}
        <div className="flex-shrink-0 py-1.5 px-4 border-b border-border bg-background/95 backdrop-blur-sm bg-[rgba(255,255,255,0.95)]">
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search items, senders, attachments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 text-[rgb(0,0,0)]"
              />
            </div>
            
            {/* Filter Buttons */}
            <div className="flex items-center gap-0.5 bg-muted/30 p-0.5 rounded-md">
              <Button
                variant={filterType === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType("all")}
                className="h-6 px-2 text-xs"
              >
                All ({inboundItems.filter(item => !importHistory.some(h => h.itemId === item.id)).length})
              </Button>
              <Button
                variant={filterType === "email" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType("email")}
                className="h-6 px-2 text-xs"
              >
                <Mail className="w-2.5 h-2.5 mr-1" />
                Emails ({inboundItems.filter(item => item.type === "email" && !importHistory.some(h => h.itemId === item.id)).length})
              </Button>
              <Button
                variant={filterType === "file" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType("file")}
                className="h-6 px-2 text-xs"
              >
                <Upload className="w-2.5 h-2.5 mr-1" />
                Files ({inboundItems.filter(item => item.type === "file" && !importHistory.some(h => h.itemId === item.id)).length})
              </Button>
              <Button
                variant={filterType === "imported" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType("imported")}
                className="h-6 px-2 text-xs"
              >
                <History className="w-2.5 h-2.5 mr-1" />
                Imported ({importHistory.length})
              </Button>
            </div>
          </div>
        </div>

        {/* Premium Scrollable Items List */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {filteredItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center text-muted-foreground">
                {searchQuery || filterType !== "all" ? (
                  <>
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No items match your search criteria</p>
                    <p className="text-xs mt-1">Try adjusting your search or filter settings</p>
                  </>
                ) : (
                  <>
                    <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No new items to import</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto inbound-items-scroll-container">
              <style>{`
                .inbound-items-scroll-container {
                  scroll-behavior: smooth;
                  -webkit-overflow-scrolling: touch;
                  scrollbar-width: thin;
                  scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
                }
                
                .inbound-items-scroll-container::-webkit-scrollbar {
                  width: 8px;
                }
                
                .inbound-items-scroll-container::-webkit-scrollbar-track {
                  background: transparent;
                  margin: 8px 0;
                }
                
                .inbound-items-scroll-container::-webkit-scrollbar-thumb {
                  background: linear-gradient(180deg, rgba(59, 130, 246, 0.3), rgba(168, 85, 247, 0.25));
                  border-radius: 10px;
                  border: 2px solid transparent;
                  background-clip: padding-box;
                  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
                }
                
                .inbound-items-scroll-container::-webkit-scrollbar-thumb:hover {
                  background: linear-gradient(180deg, rgba(59, 130, 246, 0.5), rgba(168, 85, 247, 0.4));
                  transform: scaleX(1.2);
                }
                
                .inbound-items-scroll-container::-webkit-scrollbar-thumb:active {
                  background: linear-gradient(180deg, rgba(59, 130, 246, 0.7), rgba(168, 85, 247, 0.6));
                }
                
                .inbound-item-row {
                  position: relative;
                  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
                  animation: inboundItemFadeIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards;
                }
                
                .inbound-item-row:hover {
                  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.05), transparent);
                  transform: translateX(2px);
                }
                
                .inbound-item-row::before {
                  content: '';
                  position: absolute;
                  left: 0;
                  top: 0;
                  bottom: 0;
                  width: 2px;
                  background: linear-gradient(180deg, rgba(59, 130, 246, 0.5), rgba(168, 85, 247, 0.3));
                  opacity: 0;
                  transition: opacity 0.3s ease;
                }
                
                .inbound-item-row:hover::before {
                  opacity: 1;
                }
                
                @keyframes inboundItemFadeIn {
                  from {
                    opacity: 0;
                    transform: translateX(-8px);
                  }
                  to {
                    opacity: 1;
                    transform: translateX(0);
                  }
                }
              `}</style>
              
              <div className="px-4 py-2">
                {filteredItems.map((item, index) => {
                  const isImporting = importingItems.has(item.id);
                  const historyEntry = importHistory.find(h => h.itemId === item.id);
                  const isImported = filterType === "imported";
                  const isSelected = selectedItems.includes(item.id);
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`inbound-item-row flex gap-2 px-3 py-1.5 group cursor-pointer border-b border-border/40 ${isSelected ? 'bg-blue-500/5' : ''}`}
                      style={{ animationDelay: `${index * 0.03}s` }}
                      onClick={() => {
                        if (!isImported) {
                          setSelectedItems(prev => 
                            prev.includes(item.id) 
                              ? prev.filter(id => id !== item.id)
                              : [...prev, item.id]
                          );
                        }
                      }}
                    >
                      {/* Checkbox for selection */}
                      {!isImported && (
                        <div className="flex-shrink-0 pt-0.5">
                          <div 
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                              isSelected 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'border-border bg-background group-hover:border-blue-400'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      )}

                      {/* Type Icon */}
                      <div className="flex-shrink-0 pt-0.5">
                        {isImported ? (
                          <History className="w-3.5 h-3.5 text-purple-400 transition-transform duration-200 group-hover:scale-110" />
                        ) : item.type === "email" ? (
                          <Mail className="w-3.5 h-3.5 text-blue-400 transition-transform duration-200 group-hover:scale-110" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-green-400 transition-transform duration-200 group-hover:scale-110" />
                        )}
                      </div>

                      {/* Main Content - Compact & Dense */}
                      <div className="flex-1 min-w-0 flex items-start gap-2">
                        <div className="flex-1 min-w-0 space-y-0.5">
                          {/* Title/Subject - Single line */}
                          <div className="text-xs font-medium text-foreground truncate" title={item.type === "email" ? item.subject : item.filename}>
                            {item.type === "email" ? item.subject : item.filename}
                          </div>
                          
                          {/* Compact metadata row */}
                          {isImported && historyEntry ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <div className="flex items-center gap-1 text-green-400">
                                <CheckCircle className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[200px]" title={historyEntry.importedTo}>{historyEntry.importedTo}</span>
                              </div>
                              <span className="text-muted-foreground/50">·</span>
                              <Badge variant="secondary" className="h-3.5 px-1 text-xs">{historyEntry.library}</Badge>
                              <span className="text-muted-foreground/50">·</span>
                              <div className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{formatTimestamp(historyEntry.timestamp.toString())}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <div className="flex items-center gap-0.5 truncate max-w-[180px]">
                                <User className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate" title={item.type === "email" && item.sender ? item.sender : item.source}>
                                  {item.type === "email" && item.sender ? item.sender : item.source}
                                </span>
                              </div>
                              <span className="text-muted-foreground/50">·</span>
                              <Badge variant="secondary" className="h-3.5 px-1 text-xs uppercase">{item.type}</Badge>
                              <span className="text-muted-foreground/50">·</span>
                              <div className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{formatTimestamp(item.timestamp)}</span>
                              </div>
                              {item.type === "email" && item.attachments && item.attachments.length > 0 && (
                                <>
                                  <span className="text-muted-foreground/50">·</span>
                                  <div className="flex items-center gap-0.5">
                                    <Paperclip className="w-2.5 h-2.5" />
                                    <span>{item.attachments.length}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* Attachments - Compact inline pills */}
                          {item.type === "email" && item.attachments && item.attachments.length > 0 && !isImported && (
                            <div className="flex gap-1 flex-wrap">
                              {item.attachments.slice(0, 3).map((attachment, index) => (
                                <span 
                                  key={index}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted/40 rounded text-xs border border-border/30 transition-all duration-200 hover:bg-muted/60 hover:border-border/50"
                                  title={attachment}
                                >
                                  <FileText className="w-2.5 h-2.5" />
                                  <span className="max-w-[140px] truncate">{attachment}</span>
                                </span>
                              ))}
                              {item.attachments.length > 3 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-xs text-muted-foreground/70">
                                  +{item.attachments.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons - Only Undo for imported items */}
                        {isImported && historyEntry && (
                          <div className="flex-shrink-0 flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUndoImport(item.id);
                              }}
                              className="h-5 px-2 text-xs opacity-80 group-hover:opacity-100 transition-all duration-200 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/30 hover:shadow-sm"
                            >
                              <Undo2 className="w-2.5 h-2.5 mr-1" />
                              <span>Undo</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedItems.length > 0 && filterType !== "imported" && (
          <div className="flex-shrink-0 border-t border-border bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 backdrop-blur-sm">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              {/* Selection count */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-medium">
                    {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItems([])}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenImportDealDialog()}
                  className="h-8 px-3 text-xs hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30 transition-all"
                >
                  <Import className="w-3.5 h-3.5 mr-1.5" />
                  Import to Deal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedItems.length > 0) {
                      handleImportAsNewDeal(selectedItems[0]);
                    }
                  }}
                  className="h-8 px-3 text-xs hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 transition-all"
                >
                  <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                  New Deal
                </Button>
              </div>
            </div>
          </div>
        )}

        </DialogContent>
      </Dialog>

      {/* Import to Existing Deal Dialog */}
      <Dialog open={showImportDealDialog} onOpenChange={handleCancelImportToDeal}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">Import to Existing Deal</DialogTitle>
            <DialogDescription className="text-sm">
              Select one or multiple deals to import this item. The item and all associated attachments will be imported to the selected deal folders.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-6">
            {/* Deal Selection - Pill-based Combobox */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Select Target Deals</Label>
                {selectedDealsForImport.length > 0 && (
                  <Badge variant="secondary" className="h-6 px-2">
                    {selectedDealsForImport.length} deal{selectedDealsForImport.length !== 1 ? 's' : ''} selected
                  </Badge>
                )}
              </div>
              
              {/* Searchable Combobox Button with Integrated Pills */}
              <Popover open={dealSearchOpen} onOpenChange={setDealSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={dealSearchOpen}
                    className="w-full justify-between h-auto min-h-[3.5rem] py-3 hover:bg-muted/50"
                  >
                    <div className="flex flex-wrap gap-2 flex-1 items-center">
                      {selectedDealsForImport.length === 0 ? (
                        <span className="text-muted-foreground">
                          Search and select deals...
                        </span>
                      ) : (
                        <>
                          {selectedDealsForImport.map((dealId) => {
                            const deal = EXISTING_DEALS.find(d => d.id === dealId);
                            if (!deal) return null;
                            return (
                              <div
                                key={dealId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-600 rounded-full border border-orange-500/30 transition-all hover:bg-orange-500/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <Building className="w-3.5 h-3.5" />
                                <span className="font-medium">{deal.name}</span>
                                <Badge variant="secondary" className="h-4 px-1.5 text-xs ml-1">
                                  {deal.library}
                                </Badge>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDealsForImport(prev => prev.filter(id => id !== dealId));
                                  }}
                                  className="hover:bg-orange-500/30 rounded-full p-0.5 transition-colors cursor-pointer ml-1"
                                >
                                  <X className="w-3 h-3" />
                                </span>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search by deal name or library..." 
                      value={dealSearchQuery}
                      onValueChange={setDealSearchQuery}
                    />
                    <CommandEmpty>No deals found matching your search.</CommandEmpty>
                    <CommandList className="max-h-[400px]">
                      <CommandGroup heading={`Available Deals (${EXISTING_DEALS.length})`}>
                        {EXISTING_DEALS
                          .filter(deal => 
                            dealSearchQuery === "" ||
                            deal.name.toLowerCase().includes(dealSearchQuery.toLowerCase()) ||
                            deal.library.toLowerCase().includes(dealSearchQuery.toLowerCase())
                          )
                          .map((deal) => {
                            const isSelected = selectedDealsForImport.includes(deal.id);
                            return (
                              <CommandItem
                                key={deal.id}
                                value={`${deal.name} ${deal.library}`}
                                onSelect={() => {
                                  setSelectedDealsForImport(prev =>
                                    isSelected
                                      ? prev.filter(id => id !== deal.id)
                                      : [...prev, deal.id]
                                  );
                                }}
                                className="flex items-center gap-3 cursor-pointer py-3"
                              >
                                <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                                  isSelected ? 'bg-orange-500 border-orange-500' : 'border-input'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className="flex-1 flex flex-col gap-1">
                                  <span className="font-medium">{deal.name}</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Building className="w-3 h-3" />
                                    {deal.library}
                                  </span>
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Selected items will be imported to all chosen deals. Each deal will receive a copy of the item and all associated attachments.
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Import Preview</span>
              </div>
            </div>

            {/* Preview of what will be imported - Enhanced */}
            {selectedItems.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Item to be Imported</Label>
                <div className="p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border border-border">
                  {(() => {
                    const item = inboundItems.find(i => i.id === selectedItems[0]);
                    if (!item) return null;
                    return (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-background border border-border">
                            {item.type === "email" ? (
                              <Mail className="w-5 h-5 text-blue-500" />
                            ) : (
                              <FileText className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <p className="font-semibold text-foreground">
                                {item.type === "email" ? item.subject : item.filename}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs uppercase">
                                  {item.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {item.type === "email" && item.sender ? item.sender : item.source}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {item.timestamp}
                                </span>
                              </div>
                            </div>
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                  <Paperclip className="w-3 h-3" />
                                  {item.attachments.length} Attachment{item.attachments.length > 1 ? 's' : ''}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.attachments.map((attachment, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs font-normal">
                                      <FileIcon className="w-2.5 h-2.5 mr-1" />
                                      {attachment}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Import Summary */}
            {selectedDealsForImport.length > 0 && selectedItems.length > 0 && (
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Import className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Import Summary</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This item will be imported to <span className="font-medium text-foreground">{selectedDealsForImport.length}</span> deal{selectedDealsForImport.length !== 1 ? 's' : ''}:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {selectedDealsForImport.map((dealId) => {
                        const deal = EXISTING_DEALS.find(d => d.id === dealId);
                        if (!deal) return null;
                        return (
                          <li key={dealId} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {deal.name} <span className="text-xs">({deal.library})</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              {selectedDealsForImport.length === 0 ? (
                "Select at least one deal to proceed"
              ) : (
                <span className="text-foreground font-medium">
                  Ready to import to {selectedDealsForImport.length} deal{selectedDealsForImport.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCancelImportToDeal}
                disabled={isImportingToDeal}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImportToDeal}
                disabled={isImportingToDeal || selectedDealsForImport.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
              >
                {isImportingToDeal ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Importing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Import className="w-4 h-4" />
                    <span>Import to Deal</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Deal Creation Dialog */}
      <Dialog open={showNewDealDialog} onOpenChange={handleCancelNewDeal}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">Import as New Deal</DialogTitle>
            <DialogDescription className="text-sm">
              Create a new deal folder and import this item with all associated attachments into it
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-6">
            {/* Deal Configuration */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Deal Configuration</Label>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Deal Library Selection */}
                <div className="space-y-2">
                  <Label htmlFor="deal-library" className="text-sm font-medium">
                    Deal Library / Business Unit
                  </Label>
                  <Select value={selectedLibrary} onValueChange={setSelectedLibrary}>
                    <SelectTrigger id="deal-library" className="w-full h-11">
                      <SelectValue placeholder="Select deal library" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_LIBRARIES.map((library) => (
                        <SelectItem key={library} value={library} className="py-3">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            {library}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Organizational unit for this deal
                  </p>
                </div>

                {/* Deal Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="deal-name" className="text-sm font-medium">
                    Deal Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="deal-name"
                    value={newDealName}
                    onChange={(e) => setNewDealName(e.target.value)}
                    placeholder="Enter deal name"
                    className="w-full h-11"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    {newDealName.trim() ? `"${newDealName.trim()}"` : "A unique identifier for this deal"}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Item to Import</span>
              </div>
            </div>

            {/* Preview of what will be imported - Enhanced */}
            {selectedItems.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Item to be Imported</Label>
                <div className="p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border border-border">
                  {(() => {
                    const item = inboundItems.find(i => i.id === selectedItems[0]);
                    if (!item) return null;
                    return (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-background border border-border">
                            {item.type === "email" ? (
                              <Mail className="w-5 h-5 text-blue-500" />
                            ) : (
                              <FileText className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <p className="font-semibold text-foreground">
                                {item.type === "email" ? item.subject : item.filename}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs uppercase">
                                  {item.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {item.type === "email" && item.sender ? item.sender : item.source}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {item.timestamp}
                                </span>
                              </div>
                            </div>
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                  <Paperclip className="w-3 h-3" />
                                  {item.attachments.length} Attachment{item.attachments.length > 1 ? 's' : ''}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.attachments.map((attachment, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs font-normal">
                                      <FileIcon className="w-2.5 h-2.5 mr-1" />
                                      {attachment}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* New Deal Summary */}
            {newDealName.trim() && selectedItems.length > 0 && (
              <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <FolderPlus className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">New Deal Summary</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Deal Name:</span>
                        <span className="font-medium text-foreground">"{newDealName.trim()}"</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Library:</span>
                        <Badge variant="secondary" className="h-5">
                          <Building className="w-3 h-3 mr-1" />
                          {selectedLibrary}
                        </Badge>
                      </div>
                      <div className="flex items-start gap-2 text-sm mt-2 pt-2 border-t border-green-500/20">
                        <span className="text-muted-foreground">Will import:</span>
                        <div className="flex-1">
                          {(() => {
                            const item = inboundItems.find(i => i.id === selectedItems[0]);
                            if (!item) return null;
                            return (
                              <div className="space-y-0.5">
                                <p className="font-medium text-foreground text-xs">
                                  {item.type === "email" ? item.subject : item.filename}
                                </p>
                                {item.attachments && item.attachments.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    + {item.attachments.length} attachment{item.attachments.length > 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              {!newDealName.trim() ? (
                "Enter a deal name to proceed"
              ) : (
                <span className="text-foreground font-medium">
                  Ready to create "{newDealName.trim()}" in {selectedLibrary}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCancelNewDeal}
                disabled={isCreatingDeal}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmNewDeal}
                disabled={!newDealName.trim() || isCreatingDeal}
                className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
              >
                {isCreatingDeal ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Create & Import</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}