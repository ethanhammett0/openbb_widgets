import { useState, useRef } from "react";
import { X, Folder, FolderOpen, Check, Download, Droplets, Mail, Users, FileText, Send as SendIcon, Globe, Settings2, MoreVertical, Plus, Pencil, Trash2, Sparkles, Search } from "lucide-react";
import { DistributionListEditorModal } from "./DistributionListEditorModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface FolderStructure {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: FolderStructure[];
  fileCount?: number;
}

interface DistributionList {
  id: string;
  name: string;
  description: string;
  recipientCount: number;
  emails: string[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface DocumentAttachment {
  id: string;
  name: string;
  type: "Term Sheet" | "Executive Summary" | "Marketing Teaser";
  size: string;
}

interface VDRConfig {
  selectedFolders: Set<string>;
  folderPermissions: Record<string, { allowDownloads: boolean; applyWatermark: boolean; customized?: boolean }>;
  recipients: string[];
  selectedDistributionLists: string[];
  emailTemplate: string;
  customSubject: string;
  customBody: string;
  attachedDocument: string;
  useGlobalPermissions: boolean;
  globalPermissions: { allowDownloads: boolean; applyWatermark: boolean };
}

interface VDRSyndicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealName: string;
}

const mockFolderStructure: FolderStructure[] = [
  {
    id: "diligence",
    name: "Due Diligence",
    type: "folder",
    fileCount: 45,
    children: [
      {
        id: "financials",
        name: "Financials",
        type: "folder",
        fileCount: 18,
        children: [
          { id: "audit", name: "Audited Statements", type: "folder", fileCount: 5 },
          { id: "qoe", name: "Quality of Earnings", type: "folder", fileCount: 3 },
          { id: "projections", name: "Management Projections", type: "folder", fileCount: 10 }
        ]
      },
      {
        id: "legal",
        name: "Legal Documents",
        type: "folder",
        fileCount: 27,
        children: [
          { id: "incorporation", name: "Incorporation Documents", type: "folder", fileCount: 8 },
          { id: "contracts", name: "Material Contracts", type: "folder", fileCount: 19 }
        ]
      }
    ]
  },
  {
    id: "marketing",
    name: "Marketing Materials",
    type: "folder",
    fileCount: 12,
    children: [
      { id: "presentations", name: "Management Presentations", type: "folder", fileCount: 5 },
      { id: "teaser", name: "Investment Teaser", type: "folder", fileCount: 2 },
      { id: "memo", name: "Investment Memorandum", type: "folder", fileCount: 5 }
    ]
  },
  {
    id: "commercial",
    name: "Commercial Diligence",
    type: "folder",
    fileCount: 23,
    children: [
      { id: "market", name: "Market Analysis", type: "folder", fileCount: 12 },
      { id: "customer", name: "Customer Analysis", type: "folder", fileCount: 11 }
    ]
  }
];

// Distribution lists are now managed as state in the component

const mockEmailTemplates: EmailTemplate[] = [
  {
    id: "initial-outreach",
    name: "Initial Outreach",
    subject: "Investment Opportunity: {{deal_name}}",
    body: "Dear {{recipient_first_name}},\n\nWe are pleased to present an exclusive investment opportunity in {{deal_name}}. Please find the secure data room link below with initial materials for your review.\n\nBest regards,\nThe Investment Team"
  },
  {
    id: "follow-up",
    name: "Follow-up",
    subject: "Re: {{deal_name}} - Additional Materials Available",
    body: "Dear {{recipient_first_name}},\n\nFollowing our previous communication regarding {{deal_name}}, we have updated the data room with additional materials for your continued review.\n\nPlease let us know if you have any questions.\n\nBest regards,\nThe Investment Team"
  },
  {
    id: "final-round",
    name: "Final Round",
    subject: "{{deal_name}} - Final Terms and Documentation",
    body: "Dear {{recipient_first_name}},\n\nWe are now in the final stages of the {{deal_name}} process. The data room has been updated with final terms and documentation.\n\nWe look forward to your response.\n\nBest regards,\nThe Investment Team"
  }
];

const mockAttachments: DocumentAttachment[] = [
  {
    id: "term-sheet-v4",
    name: "Term Sheet v4_Final.docx",
    type: "Term Sheet",
    size: "245 KB"
  },
  {
    id: "exec-summary",
    name: "Executive Summary.pdf",
    type: "Executive Summary", 
    size: "1.2 MB"
  },
  {
    id: "investment-teaser",
    name: "Investment Teaser.pdf",
    type: "Marketing Teaser",
    size: "890 KB"
  }
];

export function VDRSyndicationModal({ isOpen, onClose, dealName }: VDRSyndicationModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<VDRConfig>({
    selectedFolders: new Set(),
    folderPermissions: {},
    recipients: [],
    selectedDistributionLists: [],
    emailTemplate: "",
    customSubject: "",
    customBody: "",
    attachedDocument: "",
    useGlobalPermissions: true,
    globalPermissions: { allowDownloads: true, applyWatermark: true }
  });

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["diligence", "marketing", "commercial"]));
  const [newRecipient, setNewRecipient] = useState("");
  
  // Mock email suggestions from previous contacts
  const mockEmailSuggestions = [
    "john.smith@investor.com",
    "sarah.jones@capitalpartners.com",
    "michael.brown@ventures.com",
    "emily.davis@holdings.com",
    "robert.wilson@equity.com",
    "jennifer.taylor@funds.com",
    "david.anderson@investments.com",
    "lisa.martinez@capital.com",
    "james.thomas@privateequity.com",
    "patricia.garcia@ventures.io",
    "charles.rodriguez@growth.capital",
    "linda.martinez@fundmanager.com",
    "thomas.hernandez@investmentfirm.com",
    "barbara.lopez@assetmgmt.com",
    "daniel.gonzalez@dealflow.com",
    "nancy.wilson@capitalgroup.com",
    "paul.anderson@venturecap.com",
    "karen.thomas@investco.com",
    "mark.jackson@equityfund.com",
    "betty.white@partnercapital.com",
    "george.harris@institutional.com",
    "helen.martin@fundinggroup.com",
    "steven.thompson@investment.co",
    "sandra.garcia@capitalventures.com",
    "kenneth.martinez@dealmakers.com",
    "donna.robinson@privateequity.io",
    "joshua.clark@growthcapital.com",
    "carol.rodriguez@ventures.capital"
  ];
  
  // Distribution list management
  const [distributionLists, setDistributionLists] = useState<DistributionList[]>([
    {
      id: "tier1-lenders",
      name: "Tier 1 Lenders",
      description: "Primary institutional lenders",
      recipientCount: 8,
      emails: ["contact@kkr.com", "deals@blackstone.com", "investments@apollo.com", "info@carlyle.com", "deals@warburg.com", "contact@cerberus.com", "investments@fortress.com", "deals@oaktree.com"]
    },
    {
      id: "mezzanine-funds",
      name: "Mezzanine Funds",
      description: "Specialized mezzanine capital providers",
      recipientCount: 12,
      emails: ["deals@golubcapital.com", "investments@antares.com", "contact@ares.com", "deals@owl.com", "info@monroe.com", "investments@barings.com", "contact@crescent.com", "deals@varagon.com", "info@twin.com", "investments@whitehorse.com", "contact@kayne.com", "deals@pathway.com"]
    },
    {
      id: "family-offices",
      name: "Family Offices",
      description: "High net worth family office partners", 
      recipientCount: 15,
      emails: ["investments@family1.com", "deals@family2.com", "contact@family3.com", "info@family4.com", "deals@family5.com", "investments@family6.com", "contact@family7.com", "info@family8.com", "deals@family9.com", "investments@family10.com", "contact@family11.com", "info@family12.com", "deals@family13.com", "investments@family14.com", "contact@family15.com"]
    },
    {
      id: "real-estate-funds",
      name: "Real Estate Funds",
      description: "Commercial real estate investment funds",
      recipientCount: 10,
      emails: ["deals@brookfieldre.com", "investments@prologis.com", "contact@blackstonere.com", "info@starwood.com", "deals@grehousing.com", "investments@avalonbay.com", "contact@equity.com", "deals@simon.com", "info@ventas.com", "investments@wellstower.com"]
    },
    {
      id: "venture-capital",
      name: "Venture Capital Firms",
      description: "Early to growth stage venture investors",
      recipientCount: 18,
      emails: ["deals@sequoia.com", "investments@a16z.com", "contact@accel.com", "info@benchmark.com", "deals@greylock.com", "investments@kleiner.com", "contact@nea.com", "deals@lightspeed.com", "info@foundersf.com", "investments@index.com", "contact@gv.com", "deals@insight.com", "info@tiger.com", "investments@coatue.com", "contact@bessemer.com", "deals@battery.com", "info@spark.com", "investments@general.com"]
    },
    {
      id: "pension-funds",
      name: "Pension & Endowment Funds",
      description: "Large institutional pension and endowment investors",
      recipientCount: 7,
      emails: ["investments@calpers.com", "deals@calstrs.com", "contact@nyretire.com", "info@ontario.com", "deals@florida.com", "investments@texas.com", "contact@harvard.com"]
    },
    {
      id: "sovereign-wealth",
      name: "Sovereign Wealth Funds",
      description: "Government-backed investment vehicles",
      recipientCount: 6,
      emails: ["deals@adia.ae", "investments@gic.sg", "contact@nbim.no", "info@cic.cn", "deals@kia.kw", "investments@pif.sa"]
    },
    {
      id: "hedge-funds",
      name: "Hedge Fund Partners",
      description: "Alternative investment hedge funds",
      recipientCount: 14,
      emails: ["deals@bridgewater.com", "investments@renaissance.com", "contact@millennium.com", "info@citadel.com", "deals@elliott.com", "investments@twosigma.com", "contact@de.com", "deals@baupost.com", "info@pointstate.com", "investments@viking.com", "contact@appaloosa.com", "deals@anchorage.com", "info@third.com", "investments@farallon.com"]
    },
    {
      id: "corporate-investors",
      name: "Corporate Strategic Investors",
      description: "Corporate venture and strategic investment arms",
      recipientCount: 9,
      emails: ["ventures@google.com", "investments@intel.com", "deals@salesforce.com", "contact@qualcomm.com", "info@cisco.com", "investments@ge.com", "deals@samsung.com", "contact@microsoft.com", "info@amazon.com"]
    },
    {
      id: "opportunity-zone",
      name: "Opportunity Zone Funds",
      description: "Tax-advantaged opportunity zone investors",
      recipientCount: 5,
      emails: ["deals@ozfund1.com", "investments@ozpartners.com", "contact@opportunitycap.com", "info@revitalize.com", "deals@zoneinvest.com"]
    },
    {
      id: "debt-funds",
      name: "Debt Fund Managers",
      description: "Specialized debt and credit funds",
      recipientCount: 11,
      emails: ["deals@oaktreecap.com", "investments@arescredit.com", "contact@apollo.com", "info@gso.com", "deals@msdcredit.com", "investments@blackstone.com", "contact@brookfield.com", "deals@hps.com", "info@owl.com", "investments@blue.com", "contact@golub.com"]
    },
    {
      id: "insurance-companies",
      name: "Insurance Company Investors",
      description: "Life and property insurance investment divisions",
      recipientCount: 8,
      emails: ["investments@metlife.com", "deals@prudential.com", "contact@allianz.com", "info@axa.com", "deals@zurich.com", "investments@massmutual.com", "contact@nationwide.com", "info@principal.com"]
    },
    {
      id: "reit-investors",
      name: "REIT Institutional Buyers",
      description: "Real estate investment trust organizations",
      recipientCount: 13,
      emails: ["deals@american.com", "investments@prologis.com", "contact@publicstore.com", "info@welltower.com", "deals@equinix.com", "investments@ventas.com", "contact@digital.com", "deals@avalonbay.com", "info@equity.com", "investments@simon.com", "contact@realty.com", "deals@boston.com", "info@vornado.com"]
    },
    {
      id: "growth-equity",
      name: "Growth Equity Funds",
      description: "Late-stage growth equity investors",
      recipientCount: 10,
      emails: ["deals@general.com", "investments@summit.com", "contact@insight.com", "info@tiger.com", "deals@tpg.com", "investments@silver.com", "contact@vista.com", "deals@ta.com", "info@advent.com", "investments@warburg.com"]
    },
    {
      id: "impact-investors",
      name: "Impact Investment Funds",
      description: "ESG-focused and social impact investors",
      recipientCount: 6,
      emails: ["deals@tpgrise.com", "investments@bain.com", "contact@bridge.com", "info@omidyar.com", "deals@acumen.com", "investments@triodos.com"]
    },
    {
      id: "angel-networks",
      name: "Angel Investor Networks",
      description: "High net worth individual angel groups",
      recipientCount: 22,
      emails: ["contact@techcoast.com", "deals@bostonangels.com", "info@golden.com", "investments@ny.com", "deals@keiretsu.com", "contact@band.com", "info@launchpad.com", "deals@pipeline.com", "investments@spectrum.com", "contact@midwest.com", "deals@common.com", "info@seattle.com", "investments@houston.com", "contact@capitol.com", "deals@desert.com", "info@rockies.com", "investments@maple.com", "contact@oak.com", "deals@river.com", "info@gateway.com", "investments@sand.com", "contact@peak.com"]
    },
    {
      id: "secondary-buyers",
      name: "Secondary Market Buyers",
      description: "Funds specializing in secondary transactions",
      recipientCount: 7,
      emails: ["deals@lexington.com", "investments@coller.com", "contact@ardian.com", "info@pantheon.com", "deals@harbourvest.com", "investments@goldengate.com", "contact@partners.com"]
    }
  ]);
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingList, setEditingList] = useState<DistributionList | null>(null);
  
  // Search and browse states
  const [listSearchInput, setListSearchInput] = useState("");
  const [showListSuggestions, setShowListSuggestions] = useState(false);
  const [showListBrowseMenu, setShowListBrowseMenu] = useState(false);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [showEmailBrowseMenu, setShowEmailBrowseMenu] = useState(false);
  
  const listInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleFolderToggle = (folderId: string) => {
    const newSelected = new Set(config.selectedFolders);
    if (newSelected.has(folderId)) {
      newSelected.delete(folderId);
      // Remove permissions for deselected folder
      const newPermissions = { ...config.folderPermissions };
      delete newPermissions[folderId];
      setConfig(prev => ({ ...prev, selectedFolders: newSelected, folderPermissions: newPermissions }));
    } else {
      newSelected.add(folderId);
      // Use global permissions if enabled, otherwise default to all enabled
      const permissions = config.useGlobalPermissions 
        ? { ...config.globalPermissions, customized: false }
        : { allowDownloads: true, applyWatermark: true, customized: false };
      
      setConfig(prev => ({ 
        ...prev, 
        selectedFolders: newSelected,
        folderPermissions: {
          ...prev.folderPermissions,
          [folderId]: permissions
        }
      }));
    }
  };

  const handlePermissionChange = (folderId: string, permission: "allowDownloads" | "applyWatermark", value: boolean) => {
    setConfig(prev => ({
      ...prev,
      folderPermissions: {
        ...prev.folderPermissions,
        [folderId]: {
          ...prev.folderPermissions[folderId],
          [permission]: value,
          customized: true // Mark as customized when manually changed
        }
      }
    }));
  };

  const handleGlobalPermissionToggle = (enabled: boolean) => {
    if (enabled) {
      // Apply global permissions to all selected folders that aren't customized
      const updatedPermissions = { ...config.folderPermissions };
      Array.from(config.selectedFolders).forEach(folderId => {
        if (!updatedPermissions[folderId]?.customized) {
          updatedPermissions[folderId] = {
            ...config.globalPermissions,
            customized: false
          };
        }
      });
      
      setConfig(prev => ({
        ...prev,
        useGlobalPermissions: true,
        folderPermissions: updatedPermissions
      }));
    } else {
      setConfig(prev => ({ ...prev, useGlobalPermissions: false }));
    }
  };

  const handleGlobalPermissionChange = (permission: "allowDownloads" | "applyWatermark", value: boolean) => {
    const newGlobalPermissions = {
      ...config.globalPermissions,
      [permission]: value
    };

    // Update all non-customized folders with the new global setting
    const updatedPermissions = { ...config.folderPermissions };
    Array.from(config.selectedFolders).forEach(folderId => {
      if (!updatedPermissions[folderId]?.customized) {
        updatedPermissions[folderId] = {
          ...newGlobalPermissions,
          customized: false
        };
      }
    });

    setConfig(prev => ({
      ...prev,
      globalPermissions: newGlobalPermissions,
      folderPermissions: updatedPermissions
    }));
  };

  const resetFolderToGlobal = (folderId: string) => {
    setConfig(prev => ({
      ...prev,
      folderPermissions: {
        ...prev.folderPermissions,
        [folderId]: {
          ...prev.globalPermissions,
          customized: false
        }
      }
    }));
  };

  const toggleFolderExpansion = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !config.recipients.includes(newRecipient.trim())) {
      setConfig(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient.trim()]
      }));
      setNewRecipient("");
    }
  };

  const removeRecipient = (email: string) => {
    setConfig(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
  };

  const handleDistributionListToggle = (listId: string) => {
    const newSelected = config.selectedDistributionLists.includes(listId) 
      ? config.selectedDistributionLists.filter(id => id !== listId)
      : [...config.selectedDistributionLists, listId];
    
    setConfig(prev => ({ ...prev, selectedDistributionLists: newSelected }));
  };

  const handleCreateNewList = () => {
    setEditingList(null);
    setIsEditorOpen(true);
  };

  const handleEditList = (list: DistributionList) => {
    setEditingList(list);
    setIsEditorOpen(true);
  };

  const handleRemoveList = (listId: string) => {
    // Remove from selected lists
    setConfig(prev => ({
      ...prev,
      selectedDistributionLists: prev.selectedDistributionLists.filter(id => id !== listId)
    }));
    // Remove from available lists
    setDistributionLists(prev => prev.filter(list => list.id !== listId));
  };

  const handleSaveList = (list: DistributionList) => {
    if (editingList) {
      // Update existing list
      setDistributionLists(prev => 
        prev.map(l => l.id === list.id ? list : l)
      );
    } else {
      // Add new list
      setDistributionLists(prev => [...prev, list]);
      // Automatically select the new list
      setConfig(prev => ({
        ...prev,
        selectedDistributionLists: [...prev.selectedDistributionLists, list.id]
      }));
    }
  };

  // Search filtering logic
  const filteredDistributionLists = distributionLists
    .filter(list => !config.selectedDistributionLists.includes(list.id))
    .filter(list => 
      list.name.toLowerCase().includes(listSearchInput.toLowerCase()) ||
      list.description.toLowerCase().includes(listSearchInput.toLowerCase())
    );

  const filteredEmailSuggestions = mockEmailSuggestions
    .filter(email => !config.recipients.includes(email))
    .filter(email => email.toLowerCase().includes(newRecipient.toLowerCase()));

  // Handlers for adding from search
  const handleAddDistributionList = (listId: string) => {
    handleDistributionListToggle(listId);
    setListSearchInput("");
    listInputRef.current?.focus();
  };

  const handleAddEmailSuggestion = (email: string) => {
    setConfig(prev => ({
      ...prev,
      recipients: [...prev.recipients, email]
    }));
    setNewRecipient("");
    emailInputRef.current?.focus();
  };

  const handleListInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && listSearchInput && filteredDistributionLists.length > 0) {
      e.preventDefault();
      handleAddDistributionList(filteredDistributionLists[0].id);
    } else if (e.key === 'Backspace' && listSearchInput === '' && config.selectedDistributionLists.length > 0) {
      // Remove last pill on backspace
      const lastListId = config.selectedDistributionLists[config.selectedDistributionLists.length - 1];
      handleDistributionListToggle(lastListId);
    }
  };

  // AI Populate handlers
  const handlePopulateDistributionLists = () => {
    // AI would suggest most relevant distribution lists based on context
    const availableLists = distributionLists.filter(list => 
      !config.selectedDistributionLists.includes(list.id)
    );
    const suggestedLists = availableLists.slice(0, 2); // Take first 2 as suggestion
    suggestedLists.forEach(list => {
      handleDistributionListToggle(list.id);
    });
  };

  const handlePopulateRecipients = () => {
    // AI would suggest most likely email recipients based on context
    const suggestedEmails = filteredEmailSuggestions.slice(0, 3); // Take first 3 as suggestion
    setConfig(prev => ({
      ...prev,
      recipients: [...prev.recipients, ...suggestedEmails]
    }));
  };

  const handleTemplateChange = (templateId: string) => {
    const template = mockEmailTemplates.find(t => t.id === templateId);
    if (template) {
      setConfig(prev => ({
        ...prev,
        emailTemplate: templateId,
        customSubject: template.subject.replace('{{deal_name}}', dealName),
        customBody: template.body.replace('{{deal_name}}', dealName)
      }));
    }
  };

  const renderFolderTree = (folders: FolderStructure[], level = 0) => {
    return folders.map(folder => (
      <div key={folder.id} className="space-y-0.5">
        <div 
          className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/50 transition-colors ${level > 0 ? 'ml-6' : ''}`}
          style={{ 
            borderLeft: level > 0 ? '2px solid hsl(var(--border))' : undefined,
            marginLeft: level > 0 ? `${level * 20}px` : undefined,
            paddingLeft: level > 0 ? '12px' : undefined
          }}
        >
          <button
            onClick={() => toggleFolderExpansion(folder.id)}
            className="p-0.5 hover:bg-accent rounded flex-shrink-0"
          >
            {expandedFolders.has(folder.id) ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          <Checkbox
            checked={config.selectedFolders.has(folder.id)}
            onCheckedChange={() => handleFolderToggle(folder.id)}
            className="h-4 w-4 flex-shrink-0"
          />
          
          <span className="text-sm flex-1 min-w-0 truncate" title={folder.name}>{folder.name}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0 px-2 py-0.5 bg-muted/50 rounded">
            {folder.fileCount}
          </span>
        </div>

        {/* Render children if expanded */}
        {expandedFolders.has(folder.id) && folder.children && (
          <div className="space-y-0.5">
            {renderFolderTree(folder.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const getTotalRecipients = () => {
    const distributionListCount = config.selectedDistributionLists.reduce((total, listId) => {
      const list = distributionLists.find(l => l.id === listId);
      return total + (list?.recipientCount ?? 0);
    }, 0);
    return config.recipients.length + distributionListCount;
  };

  const getTotalFiles = () => {
    return Array.from(config.selectedFolders).reduce((total, folderId) => {
      const findFolder = (folders: FolderStructure[]): FolderStructure | null => {
        for (const folder of folders) {
          if (folder.id === folderId) return folder;
          if (folder.children) {
            const found = findFolder(folder.children);
            if (found) return found;
          }
        }
        return null;
      };
      const folder = findFolder(mockFolderStructure);
      return total + (folder?.fileCount ?? 0);
    }, 0);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-medium mb-1">Configure VDR Contents</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Select the folders and files you want to share with investors.
              </p>
            </div>

            <div className="border border-border rounded-lg p-2 max-h-[750px] overflow-y-auto bg-muted/5">
              {renderFolderTree(mockFolderStructure)}
            </div>
            
            {/* Custom permissions warning */}
            {(() => {
              const customizedCount = Array.from(config.selectedFolders).filter(
                folderId => config.folderPermissions[folderId]?.customized
              ).length;
              
              if (customizedCount > 0) {
                return (
                  <div className="px-3 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded text-[10px] text-amber-600 dark:text-amber-400">
                    <div className="flex items-center gap-1.5">
                      <Settings2 className="w-3 h-3" />
                      <span>
                        {customizedCount} {customizedCount === 1 ? 'folder has' : 'folders have'} custom permissions
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Select Recipients & Compose Invitation</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose your recipient list and customize the invitation email.
              </p>
            </div>

            {/* Distribution Lists - Pill-Based Combobox */}
            {/* Distribution Lists - Pill-Based Combobox with Search */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Distribution Lists</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handlePopulateDistributionLists}
                    disabled={distributionLists.filter(list => !config.selectedDistributionLists.includes(list.id)).length === 0}
                    className="h-7 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white border-0"
                  >
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    Populate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateNewList}
                    className="h-7 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    New List
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground mb-2">
                Search and select distribution lists to syndicate this deal room
              </div>

              <div className="relative">
                <div className="min-h-[42px] max-h-[120px] overflow-y-auto border border-border rounded-lg p-2 pr-8 flex flex-wrap gap-1.5 items-start bg-background focus-within:ring-2 focus-within:ring-ring/20 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50">
                  {/* Pills for selected distribution lists */}
                  {config.selectedDistributionLists.map((listId, index) => {
                    const list = distributionLists.find(l => l.id === listId);
                    if (!list) return null;
                    
                    const gradients = [
                      "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
                      "from-purple-500/20 to-pink-500/20 border-purple-500/30",
                      "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
                      "from-orange-500/20 to-red-500/20 border-orange-500/30",
                      "from-indigo-500/20 to-blue-500/20 border-indigo-500/30",
                      "from-rose-500/20 to-pink-500/20 border-rose-500/30"
                    ];
                    const gradient = gradients[index % gradients.length];
                    
                    return (
                      <Badge
                        key={listId}
                        variant="secondary"
                        className={`pl-2 pr-1 py-1 gap-1.5 bg-gradient-to-r ${gradient} border flex-shrink-0`}
                      >
                        <Users className="w-3 h-3" />
                        <span className="text-[11px]">{list.name}</span>
                        <span className="text-[10px] opacity-60">({list.recipientCount})</span>
                        
                        {/* Three-dot menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="ml-0.5 hover:bg-background/20 rounded p-0.5 transition-colors">
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleEditList(list)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              Edit List
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRemoveList(listId)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Badge>
                    );
                  })}
                  
                  {/* Input field for search */}
                  <input
                    ref={listInputRef}
                    type="text"
                    value={listSearchInput}
                    onChange={(e) => {
                      setListSearchInput(e.target.value);
                      setShowListSuggestions(true);
                    }}
                    onFocus={() => setShowListSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowListSuggestions(false), 200)}
                    onKeyDown={handleListInputKeyDown}
                    placeholder={config.selectedDistributionLists.length === 0 ? "Search for distribution lists..." : ""}
                    className="flex-1 min-w-[160px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
                  />
                  
                  {/* Magnifying glass icon */}
                  <button
                    type="button"
                    onClick={() => setShowListBrowseMenu(!showListBrowseMenu)}
                    onBlur={() => setTimeout(() => setShowListBrowseMenu(false), 200)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent/50 rounded transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Browse menu dropdown */}
                {showListBrowseMenu && distributionLists.filter(list => !config.selectedDistributionLists.includes(list.id)).length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover/95 backdrop-blur-xl border border-border rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50 animate-browse-menu-slide-in">
                    <div className="px-3 py-2 border-b border-border bg-muted/50 sticky top-0 backdrop-blur-sm z-10">
                      <span className="text-xs font-medium text-muted-foreground">All Distribution Lists ({distributionLists.filter(list => !config.selectedDistributionLists.includes(list.id)).length})</span>
                    </div>
                    {distributionLists.filter(list => !config.selectedDistributionLists.includes(list.id)).map((list, index) => (
                      <button
                        key={list.id}
                        onClick={() => {
                          handleAddDistributionList(list.id);
                          setShowListBrowseMenu(false);
                        }}
                        style={{ animationDelay: `${index * 20}ms` }}
                        className="w-full px-3 py-2 text-left hover:bg-accent/50 flex items-center justify-between gap-2 transition-all duration-200 hover:translate-x-1 animate-browse-menu-item-fade"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{list.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          {list.recipientCount}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggestions dropdown */}
                {showListSuggestions && listSearchInput && filteredDistributionLists.length > 0 && !showListBrowseMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50">
                    {filteredDistributionLists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => handleAddDistributionList(list.id)}
                        className="w-full px-3 py-2 text-left hover:bg-accent/50 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{list.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          {list.recipientCount}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-1.5">
                  Type to search lists, or click "New List" to create one
                </div>
              </div>
            </div>

            {/* Individual Recipients - Pill-Based Combobox with Search */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Individual Recipients</label>
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePopulateRecipients}
                  disabled={filteredEmailSuggestions.length === 0}
                  className="h-7 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white border-0"
                >
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  Populate
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Add individual email addresses outside of distribution lists
              </div>
              
              <div className="relative">
                <div className="min-h-[42px] max-h-[120px] overflow-y-auto border border-border rounded-lg p-2 pr-8 flex flex-wrap gap-1.5 items-start bg-background focus-within:ring-2 focus-within:ring-ring/20 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50">
                  {/* Pills for individual recipients */}
                  {config.recipients.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="pl-2 pr-1 py-1 gap-1.5 bg-gradient-to-r from-slate-500/20 to-gray-500/20 border border-slate-500/30 flex-shrink-0"
                    >
                      <Mail className="w-3 h-3" />
                      <span className="text-[11px]">{email}</span>
                      <button
                        onClick={() => removeRecipient(email)}
                        className="ml-0.5 hover:bg-background/20 rounded p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  
                  {/* Input field */}
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={newRecipient}
                    onChange={(e) => {
                      setNewRecipient(e.target.value);
                      setShowEmailSuggestions(true);
                    }}
                    onFocus={() => setShowEmailSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addRecipient();
                      } else if (e.key === 'Backspace' && newRecipient === '' && config.recipients.length > 0) {
                        // Remove last pill on backspace
                        removeRecipient(config.recipients[config.recipients.length - 1]);
                      }
                    }}
                    placeholder={config.recipients.length === 0 ? "Type email and press Enter..." : ""}
                    className="flex-1 min-w-[160px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
                  />
                  
                  {/* Magnifying glass icon */}
                  <button
                    type="button"
                    onClick={() => setShowEmailBrowseMenu(!showEmailBrowseMenu)}
                    onBlur={() => setTimeout(() => setShowEmailBrowseMenu(false), 200)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent/50 rounded transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Browse menu dropdown - showing all email suggestions */}
                {showEmailBrowseMenu && mockEmailSuggestions.filter(email => !config.recipients.includes(email)).length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover/95 backdrop-blur-xl border border-border rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50 animate-browse-menu-slide-in">
                    <div className="px-3 py-2 border-b border-border bg-muted/50 sticky top-0 backdrop-blur-sm z-10">
                      <span className="text-xs font-medium text-muted-foreground">Suggested Contacts ({mockEmailSuggestions.filter(email => !config.recipients.includes(email)).length})</span>
                    </div>
                    {mockEmailSuggestions.filter(email => !config.recipients.includes(email)).map((email, index) => (
                      <button
                        key={email}
                        onClick={() => {
                          handleAddEmailSuggestion(email);
                          setShowEmailBrowseMenu(false);
                        }}
                        style={{ animationDelay: `${index * 15}ms` }}
                        className="w-full px-3 py-2 text-left hover:bg-accent/50 flex items-center gap-2 transition-all duration-200 hover:translate-x-1 animate-browse-menu-item-fade"
                      >
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm">{email}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Email suggestions dropdown */}
                {showEmailSuggestions && newRecipient && filteredEmailSuggestions.length > 0 && !showEmailBrowseMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50">
                    {filteredEmailSuggestions.map((email) => (
                      <button
                        key={email}
                        onClick={() => handleAddEmailSuggestion(email)}
                        className="w-full px-3 py-2 text-left hover:bg-accent/50 flex items-center gap-2 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm">{email}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-1.5">
                  Press Enter or comma to add multiple emails
                </div>
              </div>
            </div>

            <Separator />

            {/* Email Template */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Email Template</label>
              <Select value={config.emailTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {mockEmailTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={config.customSubject}
                onChange={(e) => setConfig(prev => ({ ...prev, customSubject: e.target.value }))}
                placeholder="Email subject..."
              />
            </div>

            {/* Email Body */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={config.customBody}
                onChange={(e) => setConfig(prev => ({ ...prev, customBody: e.target.value }))}
                placeholder="Email message..."
                rows={6}
              />
            </div>

            {/* Attach Document */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Attach Deal Document</label>
              <Select value={config.attachedDocument} onValueChange={(value) => setConfig(prev => ({ ...prev, attachedDocument: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document to attach..." />
                </SelectTrigger>
                <SelectContent>
                  {mockAttachments.map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{doc.name}</span>
                        <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        const selectedDoc = mockAttachments.find(doc => doc.id === config.attachedDocument);
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Review & Send</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Review your VDR configuration before sending invitations.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border border-border rounded-lg">
                <div className="text-2xl font-medium text-primary">{config.selectedFolders.size}</div>
                <div className="text-sm text-muted-foreground">Folders Shared</div>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <div className="text-2xl font-medium text-primary">{getTotalFiles()}</div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <div className="text-2xl font-medium text-primary">{getTotalRecipients()}</div>
                <div className="text-sm text-muted-foreground">Recipients</div>
              </div>
            </div>

            {/* Configuration Details */}
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-3">VDR Contents</h4>
                <div className="space-y-2">
                  {Array.from(config.selectedFolders).map(folderId => {
                    const findFolder = (folders: FolderStructure[]): FolderStructure | null => {
                      for (const folder of folders) {
                        if (folder.id === folderId) return folder;
                        if (folder.children) {
                          const found = findFolder(folder.children);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    const folder = findFolder(mockFolderStructure);
                    const permissions = config.folderPermissions[folderId];
                    
                    return (
                      <div key={folderId} className="flex items-center justify-between text-sm">
                        <span>{folder?.name}</span>
                        <div className="flex items-center gap-2">
                          {permissions?.allowDownloads && (
                            <Badge variant="outline" className="text-xs">Downloads</Badge>
                          )}
                          {permissions?.applyWatermark && (
                            <Badge variant="outline" className="text-xs">Watermark</Badge>
                          )}
                          <span className="text-muted-foreground">{folder?.fileCount} files</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-3">Recipients</h4>
                <div className="space-y-2">
                  {config.selectedDistributionLists.map(listId => {
                    const list = distributionLists.find(l => l.id === listId);
                    return (
                      <div key={listId} className="flex items-center justify-between text-sm">
                        <span>{list?.name}</span>
                        <span className="text-muted-foreground">{list?.recipientCount} recipients</span>
                      </div>
                    );
                  })}
                  {config.recipients.map(email => (
                    <div key={email} className="flex items-center justify-between text-sm">
                      <span>{email}</span>
                      <span className="text-muted-foreground">Individual</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDoc && (
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-3">Attached Document</h4>
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{selectedDoc.name}</div>
                      <div className="text-xs text-muted-foreground">{selectedDoc.type} • {selectedDoc.size}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return config.selectedFolders.size > 0;
      case 2:
        return (config.recipients.length > 0 || config.selectedDistributionLists.length > 0) && 
               config.customSubject.trim() && config.customBody.trim();
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleSend = () => {
    // TODO: Implement actual VDR creation and sending logic
    console.log("Creating VDR with config:", config);
    onClose();
    // Reset form
    setCurrentStep(1);
    setConfig({
      selectedFolders: new Set(),
      folderPermissions: {},
      recipients: [],
      selectedDistributionLists: [],
      emailTemplate: "",
      customSubject: "",
      customBody: "",
      attachedDocument: "",
      useGlobalPermissions: true,
      globalPermissions: { allowDownloads: true, applyWatermark: true }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[85vw] !max-w-[85vw] h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <SendIcon className="w-5 h-5" />
                Create Secure VDR: {dealName}
              </DialogTitle>
              <DialogDescription>
                Configure and send secure virtual data room invitations to investors
              </DialogDescription>
            </div>
            
            {/* Compact Step Navigation */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    currentStep === step 
                      ? 'bg-primary text-primary-foreground' 
                      : currentStep > step 
                      ? 'bg-green-500 text-white' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {currentStep > step ? <Check className="w-3 h-3" /> : step}
                  </div>
                  {step < 3 && <div className="w-3 h-px bg-border" />}
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-1">
          {renderStepContent()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          {/* Stats and Permission Controls (Step 1 only) */}
          {currentStep === 1 && (
            <div className="flex items-center gap-4 px-3 py-2 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">{config.selectedFolders.size}</span>
                <span className="text-xs text-muted-foreground">folders</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{getTotalFiles()}</span>
                <span className="text-xs text-muted-foreground">files</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Button
                  variant={config.globalPermissions.allowDownloads ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleGlobalPermissionChange("allowDownloads", !config.globalPermissions.allowDownloads)}
                  className="h-7 text-xs"
                >
                  <Download className="w-3 h-3 mr-1.5" />
                  {config.globalPermissions.allowDownloads ? "Downloads On" : "Downloads Off"}
                </Button>
                <Button
                  variant={config.globalPermissions.applyWatermark ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleGlobalPermissionChange("applyWatermark", !config.globalPermissions.applyWatermark)}
                  className="h-7 text-xs"
                >
                  <Droplets className="w-3 h-3 mr-1.5" />
                  {config.globalPermissions.applyWatermark ? "Watermark On" : "Watermark Off"}
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Previous
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                <SendIcon className="w-4 h-4" />
                Send Secure Invitations
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Distribution List Editor Modal */}
      <DistributionListEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingList(null);
        }}
        onSave={handleSaveList}
        existingList={editingList}
        allLists={distributionLists}
      />
    </Dialog>
  );
}