import { useState, useEffect, useRef } from "react";
import { Search, Filter, MessageCircle, Send, Check, ChevronDown, Plus, X, ChevronUp, Star, Cloud, GripVertical, MoreHorizontal, Settings } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { AIDocumentExplorer } from "./AIDocumentExplorer";
import { VDRSyndicationModal } from "./VDRSyndicationModal";
import { CloudDriveConnectionModal, CloudConnection } from "./CloudDriveConnectionModal";
import { BusinessProcessModal, BusinessProcess, Stage } from "./BusinessProcessModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Resizable } from "re-resizable";

interface LibraryDeal {
  id: string;
  name: string;
  stage: string;
  lastUpdate: string;
  businessUnit: string;
  sponsor?: string;
  nextDueDate?: string;
  nextDueType?: string;
}

interface DealSection {
  id: string;
  name: string;
  expanded: boolean;
  starred: boolean;
  order: number;
  createdAt: Date;
}

interface DealsDashboardProps {
  hasActiveDeals?: boolean;
  onDealSelect?: (deal: { id: string; name: string }) => void;
}

const businessUnits = [
  "Corporate Lending",
  "Venture Debt", 
  "Special Situations",
  "Growth Equity"
];

const mockDeals: LibraryDeal[] = [
  // Corporate Lending - 9 deals
  {
    id: "1",
    name: "Project Neptune",
    stage: "New Opportunity",
    lastUpdate: "1 day ago",
    businessUnit: "Corporate Lending",
    sponsor: "Apollo",
    nextDueDate: "Oct 12, 2025",
    nextDueType: "LOI"
  },
  {
    id: "2",
    name: "Project Atlas",
    stage: "Underwrite",
    lastUpdate: "4 hours ago",
    businessUnit: "Corporate Lending",
    sponsor: "Ares",
    nextDueDate: "Oct 6, 2025",
    nextDueType: "Model"
  },
  {
    id: "3",
    name: "Project Summit",
    stage: "Credit Committee",
    lastUpdate: "1 hour ago",
    businessUnit: "Corporate Lending",
    sponsor: "Oaktree",
    nextDueDate: "Oct 4, 2025",
    nextDueType: "Vote"
  },
  {
    id: "4",
    name: "Project Everest",
    stage: "Documentation",
    lastUpdate: "3 days ago",
    businessUnit: "Corporate Lending",
    sponsor: "KKR",
    nextDueDate: "Oct 18, 2025",
    nextDueType: "Docs"
  },
  {
    id: "5",
    name: "Project Cascade",
    stage: "Preliminary Screening",
    lastUpdate: "12 hours ago",
    businessUnit: "Corporate Lending",
    sponsor: "Blackstone",
    nextDueDate: "Oct 10, 2025",
    nextDueType: "CIM"
  },
  {
    id: "6",
    name: "Project Horizon",
    stage: "Term Sheet",
    lastUpdate: "8 hours ago",
    businessUnit: "Corporate Lending",
    sponsor: "Carlyle",
    nextDueDate: "Oct 9, 2025",
    nextDueType: "TS"
  },
  {
    id: "7",
    name: "Project Zenith",
    stage: "Opportunity Memo",
    lastUpdate: "2 days ago",
    businessUnit: "Corporate Lending",
    sponsor: "TPG",
    nextDueDate: "Oct 14, 2025",
    nextDueType: "IC"
  },
  {
    id: "8",
    name: "Project Pinnacle",
    stage: "Loan Closing",
    lastUpdate: "6 days ago",
    businessUnit: "Corporate Lending",
    sponsor: "Vista",
    nextDueDate: "Sep 30, 2025",
    nextDueType: "Close"
  },
  {
    id: "9",
    name: "Project Vanguard",
    stage: "Underwrite",
    lastUpdate: "15 hours ago",
    businessUnit: "Corporate Lending",
    sponsor: "Bain",
    nextDueDate: "Oct 11, 2025",
    nextDueType: "DD"
  },
  
  // Venture Debt - 9 deals
  {
    id: "10",
    name: "Project Titan",
    stage: "Underwrite",
    lastUpdate: "3 hours ago",
    businessUnit: "Venture Debt",
    sponsor: "KKR",
    nextDueDate: "Oct 5, 2025",
    nextDueType: "Bid"
  },
  {
    id: "11",
    name: "Project Apollo", 
    stage: "Credit Committee",
    lastUpdate: "5 hours ago",
    businessUnit: "Venture Debt",
    sponsor: "Blackstone",
    nextDueDate: "Oct 8, 2025",
    nextDueType: "DD"
  },
  {
    id: "12",
    name: "Project Hydra",
    stage: "Preliminary Screening",
    lastUpdate: "2 hours ago",
    businessUnit: "Venture Debt",
    sponsor: "Carlyle",
    nextDueDate: "Oct 3, 2025",
    nextDueType: "CIM"
  },
  {
    id: "13",
    name: "Project Phoenix",
    stage: "Credit Committee",
    lastUpdate: "4 hours ago",
    businessUnit: "Venture Debt",
    sponsor: "Vista",
    nextDueDate: "Oct 7, 2025",
    nextDueType: "Vote"
  },
  {
    id: "14",
    name: "Project Nova",
    stage: "New Opportunity",
    lastUpdate: "18 hours ago",
    businessUnit: "Venture Debt",
    sponsor: "Sequoia",
    nextDueDate: "Oct 16, 2025",
    nextDueType: "Pitch"
  },
  {
    id: "15",
    name: "Project Quantum",
    stage: "Term Sheet",
    lastUpdate: "7 hours ago",
    businessUnit: "Venture Debt",
    sponsor: "Lightspeed",
    nextDueDate: "Oct 13, 2025",
    nextDueType: "TS"
  },
  {
    id: "16",
    name: "Project Velocity",
    stage: "Documentation",
    lastUpdate: "4 days ago",
    businessUnit: "Venture Debt",
    sponsor: "Andreessen",
    nextDueDate: "Oct 20, 2025",
    nextDueType: "Legal"
  },
  {
    id: "17",
    name: "Project Nexus",
    stage: "Opportunity Memo",
    lastUpdate: "1 day ago",
    businessUnit: "Venture Debt",
    sponsor: "Accel",
    nextDueDate: "Oct 15, 2025",
    nextDueType: "IC"
  },
  {
    id: "18",
    name: "Project Stellar",
    stage: "Loan Closing",
    lastUpdate: "5 days ago",
    businessUnit: "Venture Debt",
    sponsor: "Greylock",
    nextDueDate: "Oct 1, 2025",
    nextDueType: "Close"
  },
  
  // Special Situations - 9 deals
  {
    id: "19",
    name: "Project Orion",
    stage: "Underwrite",
    lastUpdate: "6 hours ago",
    businessUnit: "Special Situations",
    sponsor: "Bain",
    nextDueDate: "Oct 15, 2025",
    nextDueType: "Mgmt"
  },
  {
    id: "20",
    name: "Project Catalyst",
    stage: "New Opportunity",
    lastUpdate: "9 hours ago",
    businessUnit: "Special Situations",
    sponsor: "Elliott",
    nextDueDate: "Oct 17, 2025",
    nextDueType: "NDA"
  },
  {
    id: "21",
    name: "Project Revival",
    stage: "Credit Committee",
    lastUpdate: "14 hours ago",
    businessUnit: "Special Situations",
    sponsor: "Apollo",
    nextDueDate: "Oct 6, 2025",
    nextDueType: "Vote"
  },
  {
    id: "22",
    name: "Project Turnaround",
    stage: "Preliminary Screening",
    lastUpdate: "20 hours ago",
    businessUnit: "Special Situations",
    sponsor: "Oaktree",
    nextDueDate: "Oct 11, 2025",
    nextDueType: "CIM"
  },
  {
    id: "23",
    name: "Project Restructure",
    stage: "Documentation",
    lastUpdate: "3 days ago",
    businessUnit: "Special Situations",
    sponsor: "Cerberus",
    nextDueDate: "Oct 19, 2025",
    nextDueType: "Docs"
  },
  {
    id: "24",
    name: "Project Rescue",
    stage: "Term Sheet",
    lastUpdate: "11 hours ago",
    businessUnit: "Special Situations",
    sponsor: "Ares",
    nextDueDate: "Oct 8, 2025",
    nextDueType: "TS"
  },
  {
    id: "25",
    name: "Project Redeploy",
    stage: "Opportunity Memo",
    lastUpdate: "2 days ago",
    businessUnit: "Special Situations",
    sponsor: "Blackstone",
    nextDueDate: "Oct 13, 2025",
    nextDueType: "IC"
  },
  {
    id: "26",
    name: "Project Recapitalize",
    stage: "Loan Closing",
    lastUpdate: "7 days ago",
    businessUnit: "Special Situations",
    sponsor: "KKR",
    nextDueDate: "Sep 29, 2025",
    nextDueType: "Close"
  },
  {
    id: "27",
    name: "Project Rebound",
    stage: "Underwrite",
    lastUpdate: "16 hours ago",
    businessUnit: "Special Situations",
    sponsor: "TPG",
    nextDueDate: "Oct 12, 2025",
    nextDueType: "Model"
  },
  
  // Growth Equity - 8 deals
  {
    id: "28",
    name: "Project Mercury",
    stage: "Loan Closing", 
    lastUpdate: "2 days ago",
    businessUnit: "Growth Equity",
    sponsor: "TPG",
    nextDueDate: "Sep 28, 2025",
    nextDueType: "Close"
  },
  {
    id: "29",
    name: "Project Expansion",
    stage: "New Opportunity",
    lastUpdate: "10 hours ago",
    businessUnit: "Growth Equity",
    sponsor: "General Atlantic",
    nextDueDate: "Oct 18, 2025",
    nextDueType: "Pitch"
  },
  {
    id: "30",
    name: "Project Momentum",
    stage: "Preliminary Screening",
    lastUpdate: "13 hours ago",
    businessUnit: "Growth Equity",
    sponsor: "Insight Partners",
    nextDueDate: "Oct 9, 2025",
    nextDueType: "CIM"
  },
  {
    id: "31",
    name: "Project Accelerate",
    stage: "Opportunity Memo",
    lastUpdate: "1 day ago",
    businessUnit: "Growth Equity",
    sponsor: "Summit Partners",
    nextDueDate: "Oct 14, 2025",
    nextDueType: "IC"
  },
  {
    id: "32",
    name: "Project Scale",
    stage: "Term Sheet",
    lastUpdate: "8 hours ago",
    businessUnit: "Growth Equity",
    sponsor: "Warburg Pincus",
    nextDueDate: "Oct 7, 2025",
    nextDueType: "TS"
  },
  {
    id: "33",
    name: "Project Uplift",
    stage: "Underwrite",
    lastUpdate: "5 hours ago",
    businessUnit: "Growth Equity",
    sponsor: "TA Associates",
    nextDueDate: "Oct 10, 2025",
    nextDueType: "DD"
  },
  {
    id: "34",
    name: "Project Propel",
    stage: "Credit Committee",
    lastUpdate: "3 hours ago",
    businessUnit: "Growth Equity",
    sponsor: "Bain Capital",
    nextDueDate: "Oct 5, 2025",
    nextDueType: "Vote"
  },
  {
    id: "35",
    name: "Project Ascend",
    stage: "Documentation",
    lastUpdate: "4 days ago",
    businessUnit: "Growth Equity",
    sponsor: "Vista Equity",
    nextDueDate: "Oct 21, 2025",
    nextDueType: "Legal"
  }
];

// Default business processes
const defaultBusinessProcesses: BusinessProcess[] = [
  {
    id: "default",
    name: "Default Deal Process",
    description: "Standard deal flow process",
    stages: [
      { id: "s1", name: "New Opportunity", order: 0, parties: [], description: "", tasks: [] },
      { id: "s2", name: "Preliminary Screening", order: 1, parties: [], description: "", tasks: [] },
      { id: "s3", name: "Opportunity Memo", order: 2, parties: [], description: "", tasks: [] },
      { id: "s4", name: "Term Sheet", order: 3, parties: [], description: "", tasks: [] },
      { id: "s5", name: "Underwrite", order: 4, parties: [], description: "", tasks: [] },
      { id: "s6", name: "Credit Committee", order: 5, parties: [], description: "", tasks: [] },
      { id: "s7", name: "Documentation", order: 6, parties: [], description: "", tasks: [] },
      { id: "s8", name: "Loan Closing", order: 7, parties: [], description: "", tasks: [] },
    ],
    createdAt: new Date("2025-01-15"),
    lastModified: new Date("2025-10-20"),
  },
  {
    id: "corporate-lending",
    name: "Corporate Lending Process",
    description: "For corporate loan origination",
    stages: [
      { id: "s1", name: "Initial Contact", order: 0, parties: [], description: "", tasks: [] },
      { id: "s2", name: "Business Review", order: 1, parties: [], description: "", tasks: [] },
      { id: "s3", name: "Financial Analysis", order: 2, parties: [], description: "", tasks: [] },
      { id: "s4", name: "Proposal", order: 3, parties: [], description: "", tasks: [] },
      { id: "s5", name: "Credit Approval", order: 4, parties: [], description: "", tasks: [] },
      { id: "s6", name: "Legal Documentation", order: 5, parties: [], description: "", tasks: [] },
      { id: "s7", name: "Funding", order: 6, parties: [], description: "", tasks: [] },
    ],
    createdAt: new Date("2025-02-10"),
    lastModified: new Date("2025-10-18"),
  },
  {
    id: "real-estate",
    name: "Real Estate Acquisition",
    description: "Commercial real estate deals",
    stages: [
      { id: "s1", name: "Deal Sourcing", order: 0, parties: [], description: "", tasks: [] },
      { id: "s2", name: "Initial Screening", order: 1, parties: [], description: "", tasks: [] },
      { id: "s3", name: "LOI Submission", order: 2, parties: [], description: "", tasks: [] },
      { id: "s4", name: "Due Diligence", order: 3, parties: [], description: "", tasks: [] },
      { id: "s5", name: "Investment Committee", order: 4, parties: [], description: "", tasks: [] },
      { id: "s6", name: "Purchase Agreement", order: 5, parties: [], description: "", tasks: [] },
      { id: "s7", name: "Closing", order: 6, parties: [], description: "", tasks: [] },
    ],
    createdAt: new Date("2025-03-05"),
    lastModified: new Date("2025-10-15"),
  },
];

// Color palette for stage pills
const stageColorPalette = [
  "bg-slate-500/10 text-slate-400 border-slate-500/20",
  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "bg-green-500/10 text-green-400 border-green-500/20",
  "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "bg-rose-500/10 text-rose-400 border-rose-500/20",
];

const getStageColor = (stageName: string, stages: Stage[]) => {
  const stageIndex = stages.findIndex(s => s.name === stageName);
  if (stageIndex === -1) return "bg-muted text-muted-foreground";
  return stageColorPalette[stageIndex % stageColorPalette.length];
};

export function DealsDashboard({ hasActiveDeals = true, onDealSelect }: DealsDashboardProps) {
  const [activeBusinessUnit, setActiveBusinessUnit] = useState("Venture Debt");
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);
  const [vdrModalOpen, setVdrModalOpen] = useState(false);
  const [selectedDealForVDR, setSelectedDealForVDR] = useState<LibraryDeal | null>(null);
  const [deals, setDeals] = useState<LibraryDeal[]>(mockDeals);
  const [openStageDropdown, setOpenStageDropdown] = useState<string | null>(null);

  // Deal Section state management
  const [dealSections, setDealSections] = useState<DealSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  
  // Library management modals
  const [newLibraryModalOpen, setNewLibraryModalOpen] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [editingLibrary, setEditingLibrary] = useState<DealSection | null>(null);
  const [renameLibraryName, setRenameLibraryName] = useState('');
  const [openDealLibraryMenu, setOpenDealLibraryMenu] = useState<string | null>(null);

  // Cloud Drive Connection state
  const [cloudDriveModalOpen, setCloudDriveModalOpen] = useState(false);
  const [cloudConnection, setCloudConnection] = useState<CloudConnection | null>(null);
  
  // Business Process Modal state
  const [businessProcessModalOpen, setBusinessProcessModalOpen] = useState(false);
  const [selectedBusinessProcess, setSelectedBusinessProcess] = useState<BusinessProcess>(defaultBusinessProcesses[0]);
  const [stageFilter, setStageFilter] = useState<string>("all");
  
  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(224); // 224px = w-56

  // Initialize deal sections
  useEffect(() => {
    const savedSections = localStorage.getItem('idr-deal-sections');
    
    if (savedSections) {
      setDealSections(JSON.parse(savedSections));
    } else {
      // Initialize with default sections based on business units
      const defaultSections: DealSection[] = businessUnits.map((unit, index) => ({
        id: `section-${unit.toLowerCase().replace(/\s+/g, '-')}`,
        name: unit,
        expanded: index === 1, // Expand "Venture Debt" by default
        starred: false,
        order: index,
        createdAt: new Date()
      }));
      
      setDealSections(defaultSections);
      setActiveSectionId(defaultSections[1].id); // Set Venture Debt as active
    }
  }, []);

  // Initialize default bookmarks and groups


  // Save deal sections to localStorage
  useEffect(() => {
    if (dealSections.length > 0) {
      localStorage.setItem('idr-deal-sections', JSON.stringify(dealSections));
    }
  }, [dealSections]);

  // Load cloud connection from localStorage
  useEffect(() => {
    const savedConnection = localStorage.getItem('idr-cloud-connection');
    if (savedConnection) {
      setCloudConnection(JSON.parse(savedConnection));
    }
  }, []);

  // Save cloud connection to localStorage
  useEffect(() => {
    if (cloudConnection) {
      localStorage.setItem('idr-cloud-connection', JSON.stringify(cloudConnection));
    }
  }, [cloudConnection]);

  // Handle cloud connection success
  const handleCloudConnectionSuccess = (connection: CloudConnection) => {
    setCloudConnection(connection);
  };

  // Handle cloud disconnection
  const handleCloudDisconnect = () => {
    setCloudConnection(null);
    localStorage.removeItem('idr-cloud-connection');
  };

  // Deal Section CRUD operations
  const addDealSection = (name: string) => {
    if (!name.trim()) return;
    
    const newSection: DealSection = {
      id: `section-${Date.now()}`,
      name: name.trim(),
      expanded: true,
      starred: false,
      order: dealSections.length,
      createdAt: new Date()
    };
    
    setDealSections(prev => [...prev, newSection]);
    setActiveSectionId(newSection.id);
    setNewLibraryModalOpen(false);
    setNewLibraryName('');
  };

  const renameSection = (sectionId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const oldName = dealSections.find(s => s.id === sectionId)?.name;
    
    setDealSections(prev => prev.map(section =>
      section.id === sectionId ? { ...section, name: newName.trim() } : section
    ));
    
    // Update all deals that were in this library
    if (oldName) {
      setDeals(prev => prev.map(deal =>
        deal.businessUnit === oldName ? { ...deal, businessUnit: newName.trim() } : deal
      ));
    }
    
    setEditingLibrary(null);
    setRenameLibraryName('');
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setDealSections(prev => prev.map(section =>
      section.id === sectionId ? { ...section, expanded: !section.expanded } : section
    ));
  };

  const toggleSectionStarred = (sectionId: string) => {
    setDealSections(prev => prev.map(section =>
      section.id === sectionId ? { ...section, starred: !section.starred } : section
    ));
  };

  const moveSectionUp = (sectionId: string) => {
    setDealSections(prev => {
      const sections = [...prev];
      const index = sections.findIndex(s => s.id === sectionId);
      if (index > 0) {
        // Swap with previous section
        [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
        // Update order values
        return sections.map((s, i) => ({ ...s, order: i }));
      }
      return sections;
    });
  };

  const moveSectionDown = (sectionId: string) => {
    setDealSections(prev => {
      const sections = [...prev];
      const index = sections.findIndex(s => s.id === sectionId);
      if (index < sections.length - 1) {
        // Swap with next section
        [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
        // Update order values
        return sections.map((s, i) => ({ ...s, order: i }));
      }
      return sections;
    });
  };

  const deleteSection = (sectionId: string) => {
    const sectionToDelete = dealSections.find(s => s.id === sectionId);
    if (!sectionToDelete) return;
    
    // Move deals from deleted library to the first available library
    const remainingSections = dealSections.filter(s => s.id !== sectionId);
    if (remainingSections.length > 0 && sectionToDelete.name) {
      const targetLibrary = remainingSections[0].name;
      setDeals(prev => prev.map(deal =>
        deal.businessUnit === sectionToDelete.name 
          ? { ...deal, businessUnit: targetLibrary } 
          : deal
      ));
    }
    
    setDealSections(prev => prev.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i })));
    if (activeSectionId === sectionId) {
      setActiveSectionId(remainingSections[0]?.id || null);
    }
  };

  const moveDealToLibrary = (dealId: string, newLibraryName: string) => {
    setDeals(prev => prev.map(deal =>
      deal.id === dealId ? { ...deal, businessUnit: newLibraryName } : deal
    ));
    setOpenDealLibraryMenu(null);
  };

  // Drag and drop reordering
  const moveSectionByDrag = (dragId: string, hoverId: string) => {
    setDealSections(prev => {
      const sections = [...prev];
      const dragIndex = sections.findIndex(s => s.id === dragId);
      const hoverIndex = sections.findIndex(s => s.id === hoverId);
      
      if (dragIndex === -1 || hoverIndex === -1) return sections;
      
      // Remove dragged item and insert at new position
      const [draggedSection] = sections.splice(dragIndex, 1);
      sections.splice(hoverIndex, 0, draggedSection);
      
      // Update order values
      return sections.map((s, i) => ({ ...s, order: i }));
    });
  };

  // Get deals for active section
  const activeSection = dealSections.find(s => s.id === activeSectionId);
  const filteredDeals = activeSection 
    ? deals.filter(deal => {
        const matchesLibrary = deal.businessUnit === activeSection.name;
        const matchesStage = stageFilter === "all" || deal.stage === stageFilter;
        return matchesLibrary && matchesStage;
      })
    : [];

  const handleDealClick = (dealId: string) => {
    setExpandedDealId(expandedDealId === dealId ? null : dealId);
  };

  const handleDealRowClick = (deal: LibraryDeal) => {
    if (onDealSelect) {
      onDealSelect({ id: deal.id, name: deal.name });
    }
  };

  const handleOpenVDRModal = (deal: LibraryDeal) => {
    setSelectedDealForVDR(deal);
    setVdrModalOpen(true);
  };

  const handleCloseVDRModal = () => {
    setVdrModalOpen(false);
    setSelectedDealForVDR(null);
  };

  const handleStageChange = (dealId: string, newStage: string) => {
    setDeals(prevDeals => 
      prevDeals.map(deal => 
        deal.id === dealId ? { ...deal, stage: newStage } : deal
      )
    );
    setOpenStageDropdown(null);
  };

  // Stage Selector Component
  const StageSelector = ({ deal }: { deal: LibraryDeal }) => {
    const isOpen = openStageDropdown === deal.id;
    const stages = selectedBusinessProcess.stages;
    
    return (
      <Popover open={isOpen} onOpenChange={(open) => setOpenStageDropdown(open ? deal.id : null)}>
        <PopoverTrigger asChild>
          <button
            className={`${getStageColor(deal.stage, stages)} border text-xs h-5 px-2 rounded-full inline-flex items-center gap-1 hover:bg-opacity-80 transition-colors group`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenStageDropdown(isOpen ? null : deal.id);
            }}
          >
            <span>{deal.stage}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start" side="bottom">
          <div className="space-y-1">
            {stages.map((stage) => (
              <button
                key={stage.id}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-accent transition-colors text-left ${
                  stage.name === deal.stage ? 'bg-accent' : ''
                }`}
                onClick={() => handleStageChange(deal.id, stage.name)}
              >
                <span>{stage.name}</span>
                {stage.name === deal.stage && (
                  <Check className="w-3 h-3 text-primary" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Draggable Library Item Component
  interface DraggableLibraryItemProps {
    section: DealSection;
    index: number;
    isActive: boolean;
    dealCount: number;
    onSelect: () => void;
    onToggleStar: () => void;
    onDelete: () => void;
  }

  const DraggableLibraryItem = ({ 
    section, 
    index, 
    isActive, 
    dealCount,
    onSelect, 
    onToggleStar, 
    onDelete 
  }: DraggableLibraryItemProps) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag, preview] = useDrag({
      type: 'LIBRARY_SECTION',
      item: { id: section.id, index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const [{ isOver }, drop] = useDrop({
      accept: 'LIBRARY_SECTION',
      hover: (item: { id: string; index: number }) => {
        if (item.id !== section.id) {
          moveSectionByDrag(item.id, section.id);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    // Combine drag and drop refs
    drag(drop(ref));

    return (
      <div
        ref={preview}
        className={`flex items-center justify-between px-3 py-2 transition-all group cursor-pointer ${
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
        } ${isDragging ? 'opacity-40' : 'opacity-100'} ${
          isOver ? 'border-t-2 border-primary' : ''
        }`}
        onClick={onSelect}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          <div
            ref={ref}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          
          <span className="text-xs font-medium truncate text-[12px]">{section.name}</span>
          {section.starred && (
            <Star className="h-3 w-3 fill-orange-400 text-orange-400 flex-shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className="h-4 px-1.5 text-[10px] bg-muted/50 text-muted-foreground border-muted flex-shrink-0 whitespace-nowrap">
            {dealCount}
          </Badge>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar();
              }}
              className={`p-1 rounded transition-colors ${
                section.starred 
                  ? 'text-orange-400 hover:text-orange-300' 
                  : 'hover:text-foreground'
              }`}
              title={section.starred ? "Unpin library" : "Pin library"}
            >
              <Star className={`h-3 w-3 ${section.starred ? 'fill-current' : ''}`} />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="p-1 hover:text-foreground transition-colors"
                  title="More options"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="end">
                <div className="space-y-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLibrary(section);
                      setRenameLibraryName(section.name);
                    }}
                    className="w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors text-left"
                  >
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-destructive/10 text-destructive transition-colors text-left"
                  >
                    Delete
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full">
        {/* Left Navigation Panel */}
      <Resizable
        size={{ width: leftPanelWidth, height: '100%' }}
        onResizeStop={(e, direction, ref, d) => {
          setLeftPanelWidth(leftPanelWidth + d.width);
        }}
        minWidth={200}
        maxWidth={480}
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
        className="border-r border-border/50 flex flex-col bg-card flex-shrink-0 overflow-hidden deals-dashboard-panel"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border/30 bg-[rgba(0,0,0,1)] overflow-hidden flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium text-muted-foreground tracking-wider text-[12px]">DEAL LIBRARIES</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search libraries..."
                className="h-7 pl-7 text-xs bg-muted/30 border-muted"
              />
            </div>
            <button
              onClick={() => setNewLibraryModalOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent/50"
              title="Create new library"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        
        {/* Navigation List */}
        <div className="flex-1 py-2 overflow-y-auto overflow-x-hidden bg-[rgba(0,0,0,1)]">
          {/* Pinned Deal Libraries - Simple rows with star */}
          {dealSections.filter(s => s.starred).length > 0 && (
            <>
              <div className="px-3 py-1 mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pinned</span>
              </div>
              <div className="space-y-0.5 mb-3">
                {dealSections
                  .filter(s => s.starred)
                  .sort((a, b) => a.order - b.order)
                  .map((section, index) => (
                    <DraggableLibraryItem
                      key={section.id}
                      section={section}
                      index={index}
                      isActive={activeSectionId === section.id}
                      dealCount={deals.filter(d => d.businessUnit === section.name).length}
                      onSelect={() => setActiveSectionId(section.id)}
                      onToggleStar={() => toggleSectionStarred(section.id)}
                      onDelete={() => {
                        if (confirm(`Delete library "${section.name}"?`)) {
                          deleteSection(section.id);
                        }
                      }}
                    />
                  ))}
              </div>
            </>
          )}



          {/* All Deal Libraries Section */}
          <div>
            <div className="flex items-center justify-between px-3 py-1 mb-2 text-[20px]">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-[12px]">All Deal Libraries</span>
            </div>

            {/* All Deal Libraries List */}
            <div className="space-y-0.5 bg-[rgba(0,0,0,1)]">
              {dealSections
                .sort((a, b) => {
                  // Starred sections come first
                  if (a.starred && !b.starred) return -1;
                  if (!a.starred && b.starred) return 1;
                  // Then sort by order
                  return a.order - b.order;
                })
                .map((section, index) => (
                  <DraggableLibraryItem
                    key={section.id}
                    section={section}
                    index={index}
                    isActive={activeSectionId === section.id}
                    dealCount={deals.filter(d => d.businessUnit === section.name).length}
                    onSelect={() => setActiveSectionId(section.id)}
                    onToggleStar={() => toggleSectionStarred(section.id)}
                    onDelete={() => {
                      if (confirm(`Delete library "${section.name}"?`)) {
                        deleteSection(section.id);
                      }
                    }}
                  />
                ))}
            </div>
          </div>
        </div>
      </Resizable>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-[rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium tracking-wide">DEAL LIBRARY: {activeSection?.name.toUpperCase() || 'SELECT A SECTION'}</h2>
            {cloudConnection && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-colors"
                      onClick={() => setCloudDriveModalOpen(true)}
                    >
                      <Cloud className="w-2.5 h-2.5 mr-1" />
                      {cloudConnection.provider === 'microsoft' ? 'OneDrive' : 'Google Drive'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <div className="space-y-1">
                      <div className="font-medium">Connected to {cloudConnection.folderName}</div>
                      <div className="text-muted-foreground">{cloudConnection.email}</div>
                      <div className="text-muted-foreground">{cloudConnection.folderPath}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {!cloudConnection && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCloudDriveModalOpen(true)}
                      className="h-8 px-3 text-xs border-border/50 hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-400 transition-all"
                    >
                      <Cloud className="w-3.5 h-3.5 mr-1.5" />
                      Connect Drive
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Connect Microsoft OneDrive/SharePoint or Google Drive
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search deals..." 
                className="pl-9 w-48 h-8 text-sm bg-muted/50 border-border/50"
              />
            </div>
            
            <div className="relative flex items-center">
              {/* Orange Settings Tab */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setBusinessProcessModalOpen(true)}
                      className="h-8 px-2 bg-orange-500 hover:bg-orange-600 text-white rounded-l-md border border-orange-500 hover:border-orange-600 transition-all flex items-center justify-center z-10"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <div className="space-y-1">
                      <div className="font-medium">Manage Business Processes</div>
                      <div className="text-[10px] text-muted-foreground">Current: {selectedBusinessProcess.name}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Stage Select */}
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-28 gap-2 h-8 text-sm border-border/50 rounded-l-none -ml-px">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All Stages</SelectItem>
                  {selectedBusinessProcess.stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.name} className="text-sm">
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 bg-[rgba(0,0,0,1)]">
          {filteredDeals.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {filteredDeals.map((deal) => (
                <div key={deal.id}>
                  {/* Deal Row */}
                  <div 
                    className={`flex items-center justify-between py-2 px-3 transition-colors h-9 cursor-pointer ${
                      expandedDealId === deal.id 
                        ? 'bg-blue-500/10 hover:bg-blue-500/15' 
                        : 'hover:bg-accent/30'
                    }`}
                    onClick={() => handleDealRowClick(deal)}
                  >
                    {/* Column 1: Deal Name */}
                    <div className="flex-1 min-w-0 max-w-[180px]">
                      <h3 className="text-sm font-medium truncate">{deal.name}</h3>
                    </div>
                    
                    {/* Column 2: Stage */}
                    <div className="flex-shrink-0 mx-3 flex justify-center items-center min-w-[140px]">
                      <StageSelector deal={deal} />
                    </div>
                    
                    {/* Column 3: Sponsor */}
                    <div className="flex-shrink-0 min-w-[100px] mx-3 flex justify-center items-center">
                      <span className="text-sm text-muted-foreground text-center">
                        {deal.sponsor || 'KKR'}
                      </span>
                    </div>
                    
                    {/* Column 4: Next Due Date */}
                    <div className="flex-shrink-0 min-w-[180px] flex justify-center items-center">
                      <span className="text-sm text-muted-foreground text-center">
                        {deal.nextDueDate || 'Oct 5, 2025'} <span className="text-xs">({deal.nextDueType || 'Bid'})</span>
                      </span>
                    </div>
                    
                    {/* Column 5: Action Buttons */}
                    <div className="flex-shrink-0 ml-3 flex items-center gap-1">
                      {/* Move to Library Button */}
                      <Popover open={openDealLibraryMenu === deal.id} onOpenChange={(open) => setOpenDealLibraryMenu(open ? deal.id : null)}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            title="Move to library"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="end">
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mb-1">
                            Move to library
                          </div>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {dealSections.map((section) => (
                              <button
                                key={section.id}
                                className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors text-left ${
                                  section.name === deal.businessUnit ? 'bg-accent' : ''
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveDealToLibrary(deal.id, section.name);
                                }}
                              >
                                <span>{section.name}</span>
                                {section.name === deal.businessUnit && (
                                  <Check className="w-3 h-3 text-primary" />
                                )}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      {/* Syndication Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVDRModal(deal);
                          console.log(`Opening VDR syndication for deal: ${deal.name}`);
                        }}
                        title={`Create VDR for ${deal.name}`}
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                      
                      {/* Chat Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 transition-colors ${
                          expandedDealId === deal.id
                            ? 'text-blue-400 bg-blue-500/20 hover:bg-blue-500/30'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDealClick(deal.id);
                        }}
                        title="AI Document Explorer"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* AI Document Explorer Sub-Panel */}
                  {expandedDealId === deal.id && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <AIDocumentExplorer dealName={deal.name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground text-sm">
                {activeSection ? `No deals found in ${activeSection.name}` : 'Select a section to view deals'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VDR Syndication Modal */}
      {selectedDealForVDR && (
        <VDRSyndicationModal
          isOpen={vdrModalOpen}
          onClose={handleCloseVDRModal}
          dealName={selectedDealForVDR.name}
        />
      )}

      {/* Cloud Drive Connection Modal */}
      <CloudDriveConnectionModal
        isOpen={cloudDriveModalOpen}
        onClose={() => setCloudDriveModalOpen(false)}
        onConnectionSuccess={handleCloudConnectionSuccess}
        existingConnection={cloudConnection}
        onDisconnect={handleCloudDisconnect}
      />

      {/* Business Process Modal */}
      <BusinessProcessModal
        isOpen={businessProcessModalOpen}
        onClose={() => setBusinessProcessModalOpen(false)}
        onSelectProcess={(process) => {
          setSelectedBusinessProcess(process);
          setStageFilter("all"); // Reset filter when process changes
        }}
        selectedProcessId={selectedBusinessProcess.id}
      />

      {/* New Library Modal */}
      <Dialog open={newLibraryModalOpen} onOpenChange={setNewLibraryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Library</DialogTitle>
            <DialogDescription>
              Create a custom deal library to organize your deals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="library-name">Library Name</Label>
              <Input
                id="library-name"
                placeholder="e.g., Real Estate, Healthcare, Tech"
                value={newLibraryName}
                onChange={(e) => setNewLibraryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLibraryName.trim()) {
                    addDealSection(newLibraryName);
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewLibraryModalOpen(false);
                setNewLibraryName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => addDealSection(newLibraryName)}
              disabled={!newLibraryName.trim()}
            >
              Create Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Library Modal */}
      <Dialog open={editingLibrary !== null} onOpenChange={(open) => {
        if (!open) {
          setEditingLibrary(null);
          setRenameLibraryName('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Library</DialogTitle>
            <DialogDescription>
              Change the name of this deal library. All associated deals will be updated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-library">Library Name</Label>
              <Input
                id="rename-library"
                placeholder="Enter new name"
                value={renameLibraryName}
                onChange={(e) => setRenameLibraryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameLibraryName.trim() && editingLibrary) {
                    renameSection(editingLibrary.id, renameLibraryName);
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingLibrary(null);
                setRenameLibraryName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingLibrary) {
                  renameSection(editingLibrary.id, renameLibraryName);
                }
              }}
              disabled={!renameLibraryName.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DndProvider>
  );
}