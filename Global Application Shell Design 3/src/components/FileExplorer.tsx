import { useState, useEffect, useRef } from "react";
import { Upload, Folder, FolderOpen, File, FileText, FileSpreadsheet, MessageCircle, CheckCircle, AlertCircle, Clock, CloudUpload, ChevronLeft, Inbox, Star, Filter, X, Mail, Phone, Calendar, Users, MessageSquare, Search, ChevronDown, RefreshCw, Cloud } from "lucide-react";
import { Button } from "./ui/button";
import { InboundItemsModal } from "./InboundItemsModal";
import { FileContextMenu } from "./FileContextMenu";
import { AIInsightTooltip } from "./AIInsightTooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { toast } from "sonner@2.0.3";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Switch } from "./ui/switch";

interface FileNode {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: FileNode[];
  fileType?: string;
  status?: "verified" | "needs-review" | "discrepancies";
  commentCount?: number;
  level?: number;
  isLocked?: boolean;
  isHidden?: boolean;
  isFavorite?: boolean;
  dataRichness?: number;
}

interface SearchFilters {
  status: string[];
  hasComments: boolean;
  isFavorite: boolean;
  fileType: string[];
  dataRichness: string[];
}

interface CommunicationThread {
  id: string;
  type: "email" | "chat" | "call" | "meeting";
  subject: string;
  lastSender: string;
  timestamp: string;
  isUnread: boolean;
  messageCount: number;
}

interface FileExplorerProps {
  dealName: string;
  onFileSelect?: (fileId: string) => void;
  onCommunicationSelect?: (communicationId: string, communicationData: CommunicationThread) => void;
  onCollapse?: () => void;
  highlightedTerms?: string[];
}

export function FileExplorer({ dealName, onFileSelect, onCommunicationSelect, onCollapse, highlightedTerms }: FileExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"files" | "communications">("files");
  const [activeFilter, setActiveFilter] = useState<"folder" | "status" | "type">("folder");
  const [activeCommunicationFilter, setActiveCommunicationFilter] = useState<"thread" | "sender" | "date">("thread");
  const [selectedCommunication, setSelectedCommunication] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root", "financial-docs", "legal-docs", "property-info"]));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // For communication groups
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(300); // Track container width for responsive behavior
  const [vdrMode, setVdrMode] = useState(false); // VDR Mode toggle
  const [vdrSyncedFiles, setVdrSyncedFiles] = useState<Set<string>>(new Set([
    "financial-statements-2024",
    "tax-returns-2024",
    "purchase-agreement",
    "title-report",
    "environmental-phase1",
    "financial-docs" // Example synced folder
  ])); // Track synced files and folders
  const [syncingFiles, setSyncingFiles] = useState<Set<string>>(new Set()); // Track files/folders currently syncing
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    status: [],
    hasComments: false,
    isFavorite: false,
    fileType: [],
    dataRichness: []
  });
  
  // Enhanced file data with additional properties
  const [fileMetadata, setFileMetadata] = useState<Record<string, Partial<FileNode>>>({
    // Financial Documents
    "financial-statements-2024": { isFavorite: true, isLocked: false, dataRichness: 95 },
    "financial-statements-2023": { isFavorite: false, isLocked: false, dataRichness: 92 },
    "financial-statements-2022": { isFavorite: false, isLocked: false, dataRichness: 88 },
    "tax-returns-2024": { isFavorite: false, isLocked: true, dataRichness: 90 },
    "tax-returns-2023": { isFavorite: false, isLocked: true, dataRichness: 88 },
    "cash-flow-projections": { isFavorite: true, isLocked: false, dataRichness: 85 },
    "rent-roll-current": { isFavorite: true, isLocked: false, dataRichness: 93 },
    "rent-roll-historical": { isFavorite: false, isLocked: false, dataRichness: 87 },
    "operating-statements": { isFavorite: true, isLocked: false, dataRichness: 91 },
    "budget-2025": { isFavorite: false, isLocked: false, dataRichness: 78 },
    
    // Legal Documents
    "purchase-agreement": { isFavorite: true, isLocked: false, dataRichness: 95 },
    "title-report": { isFavorite: true, isLocked: false, dataRichness: 88 },
    "title-insurance": { isFavorite: false, isLocked: false, dataRichness: 82 },
    "survey-boundary": { isFavorite: false, isLocked: false, dataRichness: 85 },
    "survey-topographic": { isFavorite: false, isLocked: false, dataRichness: 80 },
    "environmental-phase1": { isFavorite: true, isLocked: false, dataRichness: 92 },
    "environmental-phase2": { isFavorite: false, isLocked: false, dataRichness: 87 },
    "zoning-letter": { isFavorite: false, isLocked: false, dataRichness: 75 },
    "use-permit": { isFavorite: false, isLocked: false, dataRichness: 72 },
    
    // Property Information
    "appraisal-report": { isFavorite: true, isLocked: false, dataRichness: 94 },
    "property-condition": { isFavorite: true, isLocked: false, dataRichness: 89 },
    "roof-inspection": { isFavorite: false, isLocked: false, dataRichness: 81 },
    "hvac-inspection": { isFavorite: false, isLocked: false, dataRichness: 79 },
    "site-plan": { isFavorite: false, isLocked: false, dataRichness: 86 },
    "floor-plans": { isFavorite: false, isLocked: false, dataRichness: 83 },
    "tenant-improvement": { isFavorite: false, isLocked: false, dataRichness: 77 },
    
    // Tenant Documents
    "lease-abstract-anchor": { isFavorite: true, isLocked: false, dataRichness: 90 },
    "lease-abstract-retail": { isFavorite: false, isLocked: false, dataRichness: 85 },
    "tenant-roster": { isFavorite: true, isLocked: false, dataRichness: 88 },
    "estoppel-certificates": { isFavorite: false, isLocked: false, dataRichness: 86 },
    
    // Financing
    "term-sheet": { isFavorite: true, isLocked: false, dataRichness: 93 },
    "commitment-letter": { isFavorite: true, isLocked: false, dataRichness: 91 },
    "loan-application": { isFavorite: false, isLocked: true, dataRichness: 87 },
    "debt-schedule": { isFavorite: false, isLocked: false, dataRichness: 84 }
  });

  // Mock pending items count for notification badge
  const [pendingImportCount, setPendingImportCount] = useState(3);

  // Ref for the main container to measure width
  const containerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver to track container width changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setContainerWidth(width);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Mock rich file structure with metadata - Comprehensive Commercial Real Estate Deal
  const fileStructure: FileNode = {
    id: "root",
    name: dealName,
    type: "folder",
    children: [
      {
        id: "financial-docs",
        name: "Financial Documents",
        type: "folder",
        level: 0,
        children: [
          {
            id: "financial-statements-2024",
            name: "Financial Statements 2024 Q1-Q3.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 8,
            level: 1
          },
          {
            id: "financial-statements-2023",
            name: "Financial Statements 2023 Annual.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 4,
            level: 1
          },
          {
            id: "financial-statements-2022",
            name: "Financial Statements 2022 Annual.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 2,
            level: 1
          },
          {
            id: "tax-returns-2024",
            name: "Tax Returns 2024.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 3,
            level: 1
          },
          {
            id: "tax-returns-2023",
            name: "Tax Returns 2023.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 1,
            level: 1
          },
          {
            id: "cash-flow-projections",
            name: "5-Year Cash Flow Projections.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "needs-review",
            commentCount: 15,
            level: 1
          },
          {
            id: "rent-roll-current",
            name: "Current Rent Roll December 2024.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "discrepancies",
            commentCount: 18,
            level: 1
          },
          {
            id: "rent-roll-historical",
            name: "Historical Rent Roll 2022-2024.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "verified",
            commentCount: 5,
            level: 1
          },
          {
            id: "operating-statements",
            name: "Operating Statements 3-Year.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "verified",
            commentCount: 9,
            level: 1
          },
          {
            id: "budget-2025",
            name: "2025 Operating Budget.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "needs-review",
            commentCount: 6,
            level: 1
          }
        ]
      },
      {
        id: "legal-docs",
        name: "Legal Documents",
        type: "folder",
        level: 0,
        children: [
          {
            id: "purchase-agreement",
            name: "Purchase & Sale Agreement.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 24,
            level: 1
          },
          {
            id: "title-report",
            name: "Preliminary Title Report.pdf",
            type: "file",
            fileType: "pdf",
            status: "needs-review",
            commentCount: 11,
            level: 1
          },
          {
            id: "title-insurance",
            name: "Title Insurance Commitment.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 3,
            level: 1
          },
          {
            id: "survey-boundary",
            name: "Boundary Survey.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 2,
            level: 1
          },
          {
            id: "survey-topographic",
            name: "Topographic Survey.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 1,
            level: 1
          },
          {
            id: "environmental-phase1",
            name: "Phase I Environmental Assessment.pdf",
            type: "file",
            fileType: "pdf",
            status: "needs-review",
            commentCount: 14,
            level: 1
          },
          {
            id: "environmental-phase2",
            name: "Phase II Environmental Report.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 7,
            level: 1
          },
          {
            id: "zoning-letter",
            name: "Zoning Compliance Letter.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 2,
            level: 1
          },
          {
            id: "use-permit",
            name: "Conditional Use Permit.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 1,
            level: 1
          }
        ]
      },
      {
        id: "property-info",
        name: "Property Information",
        type: "folder",
        level: 0,
        children: [
          {
            id: "appraisal-report",
            name: "MAI Appraisal Report.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 16,
            level: 1
          },
          {
            id: "property-condition",
            name: "Property Condition Assessment.pdf",
            type: "file",
            fileType: "pdf",
            status: "needs-review",
            commentCount: 22,
            level: 1
          },
          {
            id: "roof-inspection",
            name: "Roof Inspection Report.pdf",
            type: "file",
            fileType: "pdf",
            status: "discrepancies",
            commentCount: 9,
            level: 1
          },
          {
            id: "hvac-inspection",
            name: "HVAC Systems Inspection.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 4,
            level: 1
          },
          {
            id: "electrical-inspection",
            name: "Electrical Systems Report.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 2,
            level: 1
          },
          {
            id: "plumbing-inspection",
            name: "Plumbing Inspection Report.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 1,
            level: 1
          },
          {
            id: "site-plan",
            name: "Site Plan & Parking Layout.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 3,
            level: 1
          },
          {
            id: "floor-plans",
            name: "As-Built Floor Plans.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 5,
            level: 1
          },
          {
            id: "property-photos",
            name: "Property Photos (32 images)",
            type: "file",
            fileType: "zip",
            status: "verified",
            commentCount: 0,
            level: 1
          },
          {
            id: "aerial-images",
            name: "Aerial & Drone Photography.zip",
            type: "file",
            fileType: "zip",
            status: "verified",
            commentCount: 2,
            level: 1
          }
        ]
      },
      {
        id: "tenant-docs",
        name: "Tenant Documents",
        type: "folder",
        level: 0,
        children: [
          {
            id: "lease-abstract-anchor",
            name: "Lease Abstract - Anchor Tenant.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 12,
            level: 1
          },
          {
            id: "lease-abstract-retail",
            name: "Lease Abstracts - Retail Tenants.pdf",
            type: "file",
            fileType: "pdf",
            status: "needs-review",
            commentCount: 19,
            level: 1
          },
          {
            id: "tenant-roster",
            name: "Tenant Roster & Contact Info.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "verified",
            commentCount: 7,
            level: 1
          },
          {
            id: "estoppel-certificates",
            name: "Tenant Estoppel Certificates.pdf",
            type: "file",
            fileType: "pdf",
            status: "needs-review",
            commentCount: 13,
            level: 1
          },
          {
            id: "tenant-improvement",
            name: "TI Allowances & Schedules.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "verified",
            commentCount: 4,
            level: 1
          },
          {
            id: "sublease-agreements",
            name: "Sublease Agreements.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 2,
            level: 1
          }
        ]
      },
      {
        id: "financing",
        name: "Financing",
        type: "folder",
        level: 0,
        children: [
          {
            id: "term-sheet",
            name: "Lender Term Sheet v3.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 21,
            level: 1
          },
          {
            id: "commitment-letter",
            name: "Loan Commitment Letter.pdf",
            type: "file",
            fileType: "pdf",
            status: "needs-review",
            commentCount: 17,
            level: 1
          },
          {
            id: "loan-application",
            name: "Loan Application Package.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 8,
            level: 1
          },
          {
            id: "debt-schedule",
            name: "Debt Schedule & Amortization.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "verified",
            commentCount: 5,
            level: 1
          },
          {
            id: "equity-structure",
            name: "Equity Structure & Waterfall.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "needs-review",
            commentCount: 11,
            level: 1
          },
          {
            id: "credit-memo",
            name: "Credit Committee Memo.docx",
            type: "file",
            fileType: "docx",
            status: "verified",
            commentCount: 6,
            level: 1
          }
        ]
      },
      {
        id: "marketing",
        name: "Marketing Materials",
        type: "folder",
        level: 0,
        children: [
          {
            id: "offering-memo",
            name: "Offering Memorandum.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 9,
            level: 1
          },
          {
            id: "property-brochure",
            name: "Property Brochure.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 3,
            level: 1
          },
          {
            id: "market-analysis",
            name: "Market Analysis Report.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 7,
            level: 1
          },
          {
            id: "comp-analysis",
            name: "Comparable Sales Analysis.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "verified",
            commentCount: 4,
            level: 1
          },
          {
            id: "demographic-report",
            name: "Demographic & Trade Area Report.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 2,
            level: 1
          }
        ]
      },
      {
        id: "closing-docs",
        name: "Closing Documents",
        type: "folder",
        level: 0,
        children: [
          {
            id: "closing-checklist",
            name: "Closing Checklist.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "needs-review",
            commentCount: 14,
            level: 1
          },
          {
            id: "settlement-statement",
            name: "Estimated Settlement Statement.xlsx",
            type: "file",
            fileType: "xlsx",
            status: "needs-review",
            commentCount: 10,
            level: 1
          },
          {
            id: "deed-draft",
            name: "Grant Deed (Draft).docx",
            type: "file",
            fileType: "docx",
            status: "needs-review",
            commentCount: 5,
            level: 1
          },
          {
            id: "assignment-leases",
            name: "Assignment of Leases.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 3,
            level: 1
          },
          {
            id: "bill-of-sale",
            name: "Bill of Sale.pdf",
            type: "file",
            fileType: "pdf",
            status: "verified",
            commentCount: 1,
            level: 1
          }
        ]
      }
    ]
  };

  // Track container width for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector('[data-file-explorer]');
      if (container) {
        setContainerWidth(container.clientWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFile(fileId);
    onFileSelect?.(fileId);
  };

  const handleCommunicationSelect = (communicationId: string) => {
    setSelectedCommunication(communicationId);
    // Find the communication data
    const communicationData = communicationsData.find(comm => comm.id === communicationId);
    if (communicationData) {
      onCommunicationSelect?.(communicationId, communicationData);
    }
  };

  // Helper function to get all file/folder IDs within a folder (recursively)
  const getAllDescendantIds = (node: FileNode): string[] => {
    const ids = [node.id];
    if (node.children) {
      node.children.forEach(child => {
        ids.push(...getAllDescendantIds(child));
      });
    }
    return ids;
  };

  // Find a node by ID in the file tree
  const findNodeById = (nodeId: string, tree: FileNode = fileStructure): FileNode | null => {
    if (tree.id === nodeId) return tree;
    if (tree.children) {
      for (const child of tree.children) {
        const found = findNodeById(nodeId, child);
        if (found) return found;
      }
    }
    return null;
  };

  const handleVdrSync = (nodeId: string, isFolder: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Get all IDs to sync (for folders, include all descendants)
    let idsToSync: string[] = [nodeId];
    if (isFolder) {
      const node = findNodeById(nodeId);
      if (node) {
        idsToSync = getAllDescendantIds(node);
      }
    }
    
    // Mark all as syncing
    setSyncingFiles(prev => {
      const newSet = new Set(prev);
      idsToSync.forEach(id => newSet.add(id));
      return newSet;
    });
    
    // Simulate sync process
    setTimeout(() => {
      setVdrSyncedFiles(prev => {
        const newSet = new Set(prev);
        idsToSync.forEach(id => newSet.add(id));
        return newSet;
      });
      setSyncingFiles(prev => {
        const newSet = new Set(prev);
        idsToSync.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      if (isFolder) {
        const fileCount = idsToSync.filter(id => {
          const node = findNodeById(id);
          return node?.type === "file";
        }).length;
        toast.success(`Folder synced to VDR (${fileCount} ${fileCount === 1 ? 'file' : 'files'})`);
      } else {
        toast.success("File synced to VDR");
      }
    }, 1200);
  };

  const getFileIcon = (node: FileNode) => {
    if (node.type === "folder") {
      return expandedFolders.has(node.id) ? 
        <FolderOpen className="w-4 h-4 text-blue-400" /> : 
        <Folder className="w-4 h-4 text-muted-foreground" />;
    }
    
    switch (node.fileType) {
      case "pdf":
        return <FileText className="w-4 h-4 text-red-400" />;
      case "xlsx":
        return <FileSpreadsheet className="w-4 h-4 text-green-400" />;
      default:
        return <File className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusIndicator = (status?: string) => {
    switch (status) {
      case "verified":
        return <div className="w-2 h-2 rounded-full bg-green-500"></div>;
      case "needs-review":
        return <div className="w-2 h-2 rounded-full bg-yellow-500"></div>;
      case "discrepancies":
        return <div className="w-2 h-2 rounded-full bg-red-500"></div>;
      default:
        return null;
    }
  };

  const renderFileTree = (node: FileNode, level = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const metadata = fileMetadata[node.id] || {};
    const mergedNode = { ...node, ...metadata };
    const isSynced = vdrSyncedFiles.has(node.id);
    const isSyncing = syncingFiles.has(node.id);
    
    return (
      <div key={node.id}>
        <FileContextMenu file={mergedNode} onAction={handleContextAction}>
          <div 
            className={`flex items-center gap-2 py-2 px-2 rounded cursor-pointer transition-all duration-200 group hover:bg-accent/50 ${
              selectedFile === node.id ? 'bg-accent' : ''
            } ${highlightedTerms?.some(term => node.name.toLowerCase().includes(term.toLowerCase())) ? 'ring-1 ring-blue-400/50 bg-blue-400/10' : ''}`}
            style={{ paddingLeft: vdrMode ? `${level * 16 + 8}px` : `${level * 16 + 8}px` }}
            onClick={() => {
              if (node.type === "folder") {
                toggleFolder(node.id);
              } else {
                handleFileSelect(node.id);
              }
            }}
          >
            {/* VDR Sync Column */}
            {vdrMode && (
              <div 
                className="flex-shrink-0 w-5 flex items-center justify-center transition-all duration-200"
                style={{ 
                  opacity: vdrMode ? 1 : 0,
                  transform: vdrMode ? 'translateX(0)' : 'translateX(-10px)'
                }}
              >
                {isSynced ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 transition-all duration-200" />
                ) : isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                ) : (
                  <button
                    onClick={(e) => handleVdrSync(node.id, node.type === "folder", e)}
                    className="hover:bg-accent rounded p-0.5 transition-colors"
                    title={node.type === "folder" ? "Sync folder to VDR" : "Sync to VDR"}
                  >
                    <Upload className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-500 transition-colors" />
                  </button>
                )}
              </div>
            )}
            
            {/* File Type Icon */}
            <div className="flex-shrink-0">
              {getFileIcon(node)}
            </div>
            
            {/* Filename */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm truncate block text-[12px]">{node.name}</span>
              {mergedNode.isFavorite && (
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
              )}
              {mergedNode.isLocked && (
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" title="Locked" />
              )}
            </div>
            
            {/* Enterprise Features - AI Insights and Status */}
            {node.type === "file" && (
              <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <AIInsightTooltip 
                  fileId={node.id} 
                  fileName={node.name} 
                  status={node.status} 
                />
              </div>
            )}
            
            {/* Collaboration Indicator */}
            {node.type === "file" && node.commentCount && node.commentCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageCircle className="w-3 h-3" />
                <span className="text-xs">{node.commentCount}</span>
              </div>
            )}
          </div>
        </FileContextMenu>
        
        {/* Children with connecting lines */}
        {node.type === "folder" && isExpanded && node.children && (
          <div className="relative">
            {level > 0 && (
              <div 
                className="absolute left-4 top-0 bottom-0 w-px bg-border"
                style={{ left: `${level * 16 + 16}px` }}
              ></div>
            )}
            {node.children.map(child => renderFileTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Handler for context menu actions
  const handleContextAction = (action: string, fileId: string, data?: any) => {
    switch (action) {
      case 'rename':
        toast.info(`Renaming ${fileId}...`);
        break;
      case 'delete':
        toast.error(`Deleting ${fileId}...`);
        break;
      case 'download':
        toast.success(`Downloading ${fileId}...`);
        break;
      case 'move':
        toast.info(`Moving ${fileId} to ${data}...`);
        break;
      case 'toggle-favorite':
        setFileMetadata(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], isFavorite: !prev[fileId]?.isFavorite }
        }));
        toast.success(`${fileMetadata[fileId]?.isFavorite ? 'Removed from' : 'Added to'} favorites`);
        break;
      case 'toggle-lock':
        setFileMetadata(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], isLocked: !prev[fileId]?.isLocked }
        }));
        toast.info(`File ${fileMetadata[fileId]?.isLocked ? 'unlocked' : 'locked'}`);
        break;
      case 'view-history':
        toast.info(`Opening version history for ${fileId}...`);
        break;
      case 'compare-versions':
        toast.info(`Opening version comparison for ${fileId}...`);
        break;
      case 'rerun-ai':
        toast.info(`Re-running AI analysis for ${fileId}...`);
        break;
    }
  };

  // Filter files based on search and filters
  const filterFiles = (nodes: FileNode[]): FileNode[] => {
    if (!searchQuery && !hasActiveFilters()) return nodes;

    return nodes.filter(node => {
      if (node.type === "folder") {
        // For folders, check if any children match
        const filteredChildren = node.children ? filterFiles(node.children) : [];
        return filteredChildren.length > 0;
      }

      // Apply search filter
      if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      const metadata = fileMetadata[node.id] || {};

      // Apply status filter
      if (filters.status.length > 0 && !filters.status.includes(node.status || "")) {
        return false;
      }

      // Apply file type filter
      if (filters.fileType.length > 0 && !filters.fileType.includes(node.fileType || "")) {
        return false;
      }

      // Apply comments filter
      if (filters.hasComments && (!node.commentCount || node.commentCount === 0)) {
        return false;
      }

      // Apply favorites filter
      if (filters.isFavorite && !metadata.isFavorite) {
        return false;
      }

      // Apply data richness filter
      if (filters.dataRichness.length > 0) {
        const richness = metadata.dataRichness || 0;
        const matchesRichness = filters.dataRichness.some(range => {
          switch (range) {
            case "high": return richness >= 80;
            case "medium": return richness >= 50 && richness < 80;
            case "low": return richness < 50;
            default: return false;
          }
        });
        if (!matchesRichness) return false;
      }

      return true;
    }).map(node => {
      if (node.type === "folder" && node.children) {
        return { ...node, children: filterFiles(node.children) };
      }
      return node;
    });
  };

  const hasActiveFilters = () => {
    return filters.status.length > 0 || 
           filters.fileType.length > 0 || 
           filters.dataRichness.length > 0 || 
           filters.hasComments || 
           filters.isFavorite;
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      hasComments: false,
      isFavorite: false,
      fileType: [],
      dataRichness: []
    });
    setSearchQuery("");
    // Reset sorting to default values
    setActiveFilter("folder");
    setActiveCommunicationFilter("thread");
  };

  // Filter handler functions for the popover
  const handleStatusFilter = (status: string, checked: boolean) => {
    const newStatus = checked 
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    
    setFilters({ ...filters, status: newStatus });
  };

  const handleFileTypeFilter = (type: string, checked: boolean) => {
    const newTypes = checked 
      ? [...filters.fileType, type]
      : filters.fileType.filter(t => t !== type);
    
    setFilters({ ...filters, fileType: newTypes });
  };

  const handleDataRichnessFilter = (range: string, checked: boolean) => {
    const newRanges = checked 
      ? [...filters.dataRichness, range]
      : filters.dataRichness.filter(r => r !== range);
    
    setFilters({ ...filters, dataRichness: newRanges });
  };

  const getActiveFilterCount = () => {
    return (
      filters.status.length +
      filters.fileType.length +
      filters.dataRichness.length +
      (filters.hasComments ? 1 : 0) +
      (filters.isFavorite ? 1 : 0) +
      1 // Always count 1 for the active sorting option (activeFilter or activeCommunicationFilter)
    );
  };

  const activeFilterCount = getActiveFilterCount();

  // Get filtered file structure
  const filteredFileStructure = {
    ...fileStructure,
    children: fileStructure.children ? filterFiles(fileStructure.children) : []
  };

  // Count filtered results
  const countFiles = (nodes: FileNode[]): number => {
    return nodes.reduce((count, node) => {
      if (node.type === "file") return count + 1;
      if (node.children) return count + countFiles(node.children);
      return count;
    }, 0);
  };

  const filteredResultCount = countFiles(filteredFileStructure.children || []);

  // Mock communications data
  const communicationsData: CommunicationThread[] = [
    {
      id: "comm-001",
      type: "email",
      subject: "Q3 Financial Statements - Review Required",
      lastSender: "John Smith",
      timestamp: "3 days ago",
      isUnread: true,
      messageCount: 20
    }
  ];

  // Communication helper functions
  const getCommunicationIcon = (type: CommunicationThread["type"]) => {
    switch (type) {
      case "email":
        return <Mail className="w-4 h-4 text-muted-foreground" />;
      case "chat":
        return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
      case "call":
        return <Phone className="w-4 h-4 text-muted-foreground" />;
      case "meeting":
        return <Users className="w-4 h-4 text-muted-foreground" />;
      default:
        return <MessageCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };



  // Communication sorting and grouping functions
  const parseTimestamp = (timestamp: string): Date => {
    const now = new Date();
    if (timestamp.includes('hour')) {
      const hours = parseInt(timestamp.split(' ')[0]);
      return new Date(now.getTime() - hours * 60 * 60 * 1000);
    } else if (timestamp.includes('day')) {
      const days = parseInt(timestamp.split(' ')[0]);
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    } else if (timestamp.includes('week')) {
      const weeks = parseInt(timestamp.split(' ')[0]);
      return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    }
    return now; // Default to now for parsing issues
  };

  const getDateGroupKey = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    if (date >= lastWeek) return 'This Week';
    return 'Older';
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Initialize all groups as expanded when view changes
  useEffect(() => {
    if (activeCommunicationFilter === 'sender') {
      const senders = [...new Set(communicationsData.map(c => c.lastSender))];
      setExpandedGroups(new Set(senders));
    } else if (activeCommunicationFilter === 'date') {
      const dateGroups = ['Today', 'Yesterday', 'This Week', 'Older'];
      setExpandedGroups(new Set(dateGroups));
    } else {
      setExpandedGroups(new Set());
    }
  }, [activeCommunicationFilter]);

  const getOrganizedCommunications = () => {
    let filteredComms = communicationsData;
    
    // Apply search filter if present
    if (searchQuery) {
      filteredComms = communicationsData.filter(comm => 
        comm.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comm.lastSender.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (activeCommunicationFilter) {
      case 'sender':
        // Group by sender
        const bySender = filteredComms.reduce((groups, comm) => {
          const sender = comm.lastSender;
          if (!groups[sender]) groups[sender] = [];
          groups[sender].push(comm);
          return groups;
        }, {} as Record<string, CommunicationThread[]>);
        
        // Sort senders by latest communication and sort communications within each group
        return Object.entries(bySender)
          .map(([sender, comms]) => ({
            groupKey: sender,
            communications: comms.sort((a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()).reverse()
          }))
          .sort((a, b) => parseTimestamp(a.communications[0].timestamp).getTime() - parseTimestamp(b.communications[0].timestamp).getTime()).reverse();

      case 'date':
        // Group by date ranges
        const byDate = filteredComms.reduce((groups, comm) => {
          const date = parseTimestamp(comm.timestamp);
          const groupKey = getDateGroupKey(date);
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(comm);
          return groups;
        }, {} as Record<string, CommunicationThread[]>);
        
        // Define group order and sort communications within each group
        const groupOrder = ['Today', 'Yesterday', 'This Week', 'Older'];
        return groupOrder
          .filter(groupKey => byDate[groupKey])
          .map(groupKey => ({
            groupKey,
            communications: byDate[groupKey].sort((a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()).reverse()
          }));

      default: // 'thread'
        // Flat list sorted by timestamp
        return [{
          groupKey: 'all',
          communications: filteredComms.sort((a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()).reverse()
        }];
    }
  };

  const renderCommunicationItem = (communication: CommunicationThread) => (
    <div
      key={communication.id}
      className={`flex items-center gap-3 py-3 px-3 rounded cursor-pointer transition-colors group hover:bg-accent/50 ${
        selectedCommunication === communication.id ? 'bg-accent' : ''
      }`}
      onClick={() => handleCommunicationSelect(communication.id)}
    >
      {/* Type Icon */}
      <div className="flex-shrink-0">
        {getCommunicationIcon(communication.type)}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Subject/Title */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm truncate block text-foreground">
            {communication.subject}
          </span>
          {communication.isUnread && (
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          )}
        </div>
        
        {/* Metadata Line */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>From: {communication.lastSender}</span>
          <span>•</span>
          <span>{communication.timestamp}</span>
          {communication.messageCount > 1 && (
            <>
              <span>•</span>
              <span>{communication.messageCount} messages</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderGroupHeader = (groupKey: string, communications: CommunicationThread[]) => {
    const isExpanded = expandedGroups.has(groupKey);
    const unreadCount = communications.filter(c => c.isUnread).length;
    const totalCount = communications.length;

    return (
      <div
        className="flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors hover:bg-accent/30 border-b border-border/50"
        onClick={() => toggleGroup(groupKey)}
      >
        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-400" />
          ) : (
            <Folder className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        
        {/* Group Name */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-foreground">{groupKey}</span>
        </div>
        
        {/* Counts */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {unreadCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
              {unreadCount} new
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>
    );
  };

  // Check if buttons should show as icons only based on available width
  // Show labels when there's enough space for all three buttons with text (~280px)
  const isCompact = containerWidth < 280;

  return (
    <div ref={containerRef} className="h-full flex flex-col border-r border-border" data-file-explorer>
      {/* Header with Combined Navigation Ribbon and Filter Buttons */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center justify-between">
          {/* Left side: Enhanced navigation ribbon (30% larger) */}
          <div className="flex bg-muted rounded-lg p-1">
            <div className="flex items-center">
              <button
                className={`px-3 py-1.5 text-sm rounded-l transition-colors flex items-center gap-2 ${
                  activeView === "files" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveView("files")}
              >
                <File className="w-4 h-4" />
                {!isCompact && <span>Documents</span>}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`px-1 py-1.5 text-sm rounded-r transition-colors flex items-center ${
                      activeView === "files" 
                        ? "bg-background text-foreground shadow-sm hover:bg-accent" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs">VDR Mode</span>
                      </div>
                      <Switch
                        checked={vdrMode}
                        onCheckedChange={setVdrMode}
                        className="scale-75"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 ml-5">
                      Show VDR sync status
                    </p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <button
              className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-2 ${
                activeView === "communications" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveView("communications")}
            >
              <MessageSquare className="w-4 h-4" />
              {!isCompact && <span className="text-[13px]">Communications</span>}
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground relative"
              onClick={() => setIsInboundModalOpen(true)}
            >
              <Inbox className="w-4 h-4" />
              {!isCompact && <span>Import</span>}
              {pendingImportCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1.5 bg-red-500 text-white text-xs leading-tight rounded-full flex items-center justify-center">
                  {pendingImportCount}
                </div>
              )}
            </button>
          </div>

          {/* Right side: Filter buttons and collapse button */}
          <div className="flex items-center gap-2">

            
            {/* Collapse button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1 h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              onClick={onCollapse}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar with Filter */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-xs bg-muted/50 border-border/50"
            />
          </div>
          
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs border-border/50 relative"
              >
                <Filter className="w-3 h-3" />
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                      Clear All
                    </Button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {/* View Sorting Options */}
                  <div>
                    <h5 className="text-xs font-medium mb-2">
                      {activeView === "files" ? "Sort Files By" : "Sort Communications By"}
                    </h5>
                    <div className="space-y-2">
                      {activeView === "files" ? (
                        <>
                          {["folder", "status", "type"].map((filterType) => (
                            <div key={filterType} className="flex items-center space-x-2">
                              <Checkbox
                                id={`sort-${filterType}`}
                                checked={activeFilter === filterType}
                                onCheckedChange={(checked) => {
                                  if (checked) setActiveFilter(filterType as "folder" | "status" | "type");
                                }}
                              />
                              <label htmlFor={`sort-${filterType}`} className="text-xs capitalize">
                                {filterType === "folder" ? "Folder" : filterType === "status" ? "Status" : "Type"}
                              </label>
                            </div>
                          ))}
                        </>
                      ) : (
                        <>
                          {[
                            { key: "thread", label: "Thread" },
                            { key: "sender", label: "Sender" },
                            { key: "date", label: "Date" }
                          ].map((filter) => (
                            <div key={filter.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`sort-${filter.key}`}
                                checked={activeCommunicationFilter === filter.key}
                                onCheckedChange={(checked) => {
                                  if (checked) setActiveCommunicationFilter(filter.key as "thread" | "sender" | "date");
                                }}
                              />
                              <label htmlFor={`sort-${filter.key}`} className="text-xs">
                                {filter.label}
                              </label>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {activeView === "files" && (
                    <>
                      <Separator />

                      {/* Status Filter */}
                      <div>
                        <h5 className="text-xs font-medium mb-2">Status</h5>
                        <div className="space-y-2">
                          {["verified", "needs-review", "discrepancies"].map((status) => (
                            <div key={status} className="flex items-center space-x-2">
                              <Checkbox
                                id={`status-${status}`}
                                checked={filters.status.includes(status)}
                                onCheckedChange={(checked) => handleStatusFilter(status, checked as boolean)}
                              />
                              <label htmlFor={`status-${status}`} className="text-xs capitalize">
                                {status.replace('-', ' ')}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* File Type Filter */}
                      <div>
                        <h5 className="text-xs font-medium mb-2">File Type</h5>
                        <div className="space-y-2">
                          {["pdf", "xlsx", "docx"].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={`type-${type}`}
                                checked={filters.fileType.includes(type)}
                                onCheckedChange={(checked) => handleFileTypeFilter(type, checked as boolean)}
                              />
                              <label htmlFor={`type-${type}`} className="text-xs uppercase">
                                {type}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Other Filters */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="has-comments"
                            checked={filters.hasComments}
                            onCheckedChange={(checked) => setFilters({ ...filters, hasComments: checked as boolean })}
                          />
                          <label htmlFor="has-comments" className="text-xs">Has Comments</label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="is-favorite"
                            checked={filters.isFavorite}
                            onCheckedChange={(checked) => setFilters({ ...filters, isFavorite: checked as boolean })}
                          />
                          <label htmlFor="is-favorite" className="text-xs">Favorites Only</label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Conditional Content Based on Active View */}
      {activeView === "files" ? (
        <>
          {/* File Tree */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredFileStructure.children && filteredFileStructure.children.length > 0 ? (
              <div className="space-y-1">
                {filteredFileStructure.children.map(child => renderFileTree(child))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                {searchQuery || hasActiveFilters() ? 'No files match your filters' : 'No files found'}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Communications List */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1 p-2">
              {getOrganizedCommunications().map(({ groupKey, communications }) => (
                <div key={groupKey}>
                  {activeCommunicationFilter !== 'thread' && (
                    <>
                      {renderGroupHeader(groupKey, communications)}
                      {expandedGroups.has(groupKey) && (
                        <div className="ml-4 space-y-1">
                          {communications.map(renderCommunicationItem)}
                        </div>
                      )}
                    </>
                  )}
                  {activeCommunicationFilter === 'thread' && communications.map(renderCommunicationItem)}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Inbound Items Modal */}
      <InboundItemsModal 
        isOpen={isInboundModalOpen} 
        onClose={() => setIsInboundModalOpen(false)} 
      />
    </div>
  );
}