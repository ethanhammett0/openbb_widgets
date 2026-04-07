import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, RefreshCw, Plus, X, Minus, Check, Trash2, Edit3, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarPicker } from "./ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { FileExplorer } from "./FileExplorer";
import { DocumentViewer } from "./DocumentViewer";
import { AnalysisPanel } from "./AnalysisPanel";
import { FlexibleWorkspace } from "./FlexibleWorkspace";

// Mock data for demonstration
const DEAL_STAGES = [
  { id: 1, name: "Initial Review", description: "First look at opportunity" },
  { id: 2, name: "Preliminary Analysis", description: "Basic financial review" },
  { id: 3, name: "Due Diligence", description: "Comprehensive analysis" },
  { id: 4, name: "Credit Committee", description: "Internal approval process" },
  { id: 5, name: "Term Sheet", description: "Proposal preparation" },
  { id: 6, name: "Documentation", description: "Legal documentation" },
  { id: 7, name: "Closing", description: "Final steps" },
  { id: 8, name: "Portfolio Management", description: "Ongoing monitoring" }
];

const DATE_TEMPLATES = [
  "Final Maturity Date",
  "First Amortization Date",
  "IO Period End Date",
  "Origination Date",
  "Term Sheet Due Date",
  "Due Diligence Start Date",
  "Documentation Date",
  "Closing Date",
  "First Payment Date",
  "Rate Reset Date",
  "Covenant Test Date",
  "Prepayment Period End"
];

interface KeyDate {
  id: number;
  name: string;
  date: Date | null;
  type: "deadline" | "meeting" | "milestone" | "closing";
}

interface AISuggestedDate {
  id: string;
  name: string;
  date: Date;
  type: "deadline" | "meeting" | "milestone" | "closing";
  confidence: number;
}

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

interface CommunicationThread {
  id: string;
  type: "email" | "chat" | "call" | "meeting";
  subject: string;
  lastSender: string;
  timestamp: string;
  isUnread: boolean;
  messageCount: number;
}

interface AnalysisZoneProps {
  dealName: string;
  onCollapse?: () => void;
  hasCollapsedPanel?: boolean;
  chatMessages?: ChatMessage[];
  isAITyping?: boolean;
  onSendMessage?: (message: string) => void;
  onBackToDeals?: () => void;
}

export function AnalysisZone({
  dealName,
  onCollapse,
  hasCollapsedPanel = false,
  chatMessages = [],
  isAITyping = false,
  onSendMessage,
  onBackToDeals
}: AnalysisZoneProps) {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedCommunicationId, setSelectedCommunicationId] = useState<string | null>(null);
  const [selectedCommunicationData, setSelectedCommunicationData] = useState<CommunicationThread | null>(null);
  const [isSyncedToCRM, setIsSyncedToCRM] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);
  const [isStageTransitioning, setIsStageTransitioning] = useState(false);
  const [stageTransitionError, setStageTransitionError] = useState<string | null>(null);
  
  // Panel collapse state
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  
  // Key dates state
  const [keyDates, setKeyDates] = useState<KeyDate[]>([
    { id: 1, name: "Due Diligence Start Date", date: new Date(2025, 2, 15), type: "deadline" },
    { id: 2, name: "Term Sheet Due Date", date: new Date(2025, 3, 1), type: "deadline" },
    { id: 3, name: "Closing Date", date: new Date(2025, 4, 15), type: "closing" }
  ]);
  const [keyDatesDisplay, setKeyDatesDisplay] = useState(2);
  const [editingDate, setEditingDate] = useState<number | null>(null);
  const [newDateName, setNewDateName] = useState("");
  
  // AI Suggested dates state
  const [aiSuggestedDates, setAiSuggestedDates] = useState<AISuggestedDate[]>([
    { id: "ai-1", name: "Credit Committee Meeting", date: new Date(2025, 2, 20), type: "meeting", confidence: 0.95 },
    { id: "ai-2", name: "Documentation Kickoff", date: new Date(2025, 3, 10), type: "milestone", confidence: 0.88 },
    { id: "ai-3", name: "Final Due Diligence Report", date: new Date(2025, 3, 25), type: "deadline", confidence: 0.92 },
    { id: "ai-4", name: "Regulatory Approval Deadline", date: new Date(2025, 4, 5), type: "deadline", confidence: 0.85 }
  ]);
  const [hasAISuggestions, setHasAISuggestions] = useState(true);
  const [editingEventName, setEditingEventName] = useState<number | null>(null);
  const [editingEventValue, setEditingEventValue] = useState("");

  // Define all possible stages
  const stageDefinitions = [
    { id: 1, name: "Initial Review", description: "First look at opportunity" },
    { id: 2, name: "Preliminary Analysis", description: "Basic financial review" },
    { id: 3, name: "Due Diligence", description: "Comprehensive analysis" },
    { id: 4, name: "Credit Committee", description: "Internal approval process" },
    { id: 5, name: "Term Sheet", description: "Proposal preparation" },
    { id: 6, name: "Documentation", description: "Legal documentation" },
    { id: 7, name: "Closing", description: "Final steps" },
    { id: 8, name: "Portfolio Management", description: "Ongoing monitoring" }
  ];

  const currentStageInfo = stageDefinitions.find(s => s.id === currentStage) || stageDefinitions[0];
  const isFirstStage = currentStage === 1;
  const isLastStage = currentStage === stageDefinitions.length;

  // Stage navigation functions
  const handleRegisterOpportunity = async () => {
    setIsStageTransitioning(true);
    setStageTransitionError(null);
    
    try {
      // Simulate API call to register opportunity
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSyncedToCRM(true);
      setCurrentStage(1); // Start at stage 1 after registration
    } catch (error) {
      setStageTransitionError("Failed to register opportunity. Please try again.");
    } finally {
      setIsStageTransitioning(false);
    }
  };

  const handleStageForward = async () => {
    if (isLastStage || isStageTransitioning) return;
    
    setIsStageTransitioning(true);
    setStageTransitionError(null);
    
    try {
      // Simulate API call to advance stage
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentStage(prev => Math.min(prev + 1, stageDefinitions.length));
    } catch (error) {
      setStageTransitionError("Failed to advance stage. Please try again.");
    } finally {
      setIsStageTransitioning(false);
    }
  };

  const handleStageBackward = async () => {
    if (isFirstStage || isStageTransitioning) return;
    
    setIsStageTransitioning(true);
    setStageTransitionError(null);
    
    try {
      // Simulate API call to move back stage
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentStage(prev => Math.max(prev - 1, 1));
    } catch (error) {
      setStageTransitionError("Failed to move back stage. Please try again.");
    } finally {
      setIsStageTransitioning(false);
    }
  };

  const filteredTemplates = DATE_TEMPLATES.filter(template =>
    template.toLowerCase().includes(newDateName.toLowerCase())
  );

  // Helper function to get upcoming dates for header display
  const getUpcomingDates = () => {
    const today = new Date();
    return keyDates
      .filter(date => date.date && date.date >= today)
      .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0))
      .slice(0, keyDatesDisplay);
  };

  const upcomingDatesForHeader = getUpcomingDates();

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    // Clear communication selection when file is selected
    setSelectedCommunicationId(null);
    setSelectedCommunicationData(null);
  };

  const handleCommunicationSelect = (communicationId: string, communicationData: CommunicationThread) => {
    setSelectedCommunicationId(communicationId);
    
    // Transform the simple CommunicationThread to the full format expected by DocumentViewer
    const fullCommunicationData = {
      id: communicationData.id,
      subject: communicationData.subject,
      participants: [communicationData.lastSender, "john.smith@company.com", "sarah.wilson@legal.com"],
      created: new Date(2024, 8, 15, 10, 30),
      updated: new Date(2024, 8, 16, 14, 20),
      messages: [
        {
          id: `msg-${communicationData.id}-001`,
          author: {
            name: communicationData.lastSender,
            email: `${communicationData.lastSender.toLowerCase().replace(' ', '.')}@company.com`,
            avatar: "",
            role: communicationData.type === "email" ? "Deal Manager" : "Team Member"
          },
          content: `This is the main thread for ${communicationData.subject}. We need to coordinate on the key deliverables and timeline.`,
          timestamp: new Date(2024, 8, 15, 10, 30),
          attachments: communicationData.type === "email" ? [
            { id: "att-001", name: "Financial_Analysis.pdf", size: "2.4 MB", type: "application/pdf" },
            { id: "att-002", name: "Market_Research.xlsx", size: "856 KB", type: "application/vnd.ms-excel" }
          ] : undefined,
          reactions: [
            { type: "like", count: 2, users: ["sarah.wilson", "mike.chen"] }
          ],
          replies: [
            {
              id: `msg-${communicationData.id}-002`,
              author: {
                name: "Sarah Wilson",
                email: "sarah.wilson@legal.com",
                avatar: "",
                role: "Legal Counsel"
              },
              content: "I've reviewed the documentation and found a few items that need clarification. The entity structure needs to be updated to reflect the current ownership.",
              timestamp: new Date(2024, 8, 15, 14, 15),
              reactions: [
                { type: "like", count: 1, users: ["john.smith"] }
              ],
              replies: [
                {
                  id: `msg-${communicationData.id}-003`,
                  author: {
                    name: "Mike Chen",
                    email: "mike.chen@accounting.com",
                    avatar: "",
                    role: "Senior Accountant"
                  },
                  content: "Good catch, Sarah. I'll update the financial models to reflect the corrected entity structure. This might affect our projections by 3-5%.",
                  timestamp: new Date(2024, 8, 15, 16, 45),
                  reactions: [
                    { type: "like", count: 2, users: ["sarah.wilson", "john.smith"] }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: `msg-${communicationData.id}-004`,
          author: {
            name: "Robert Johnson",
            email: "robert.johnson@bank.com",
            avatar: "",
            role: "Senior Underwriter"
          },
          content: "Following up on our discussion. We need to finalize the terms by end of week to meet the committee deadline.",
          timestamp: new Date(2024, 8, 16, 11, 30),
          isPrivate: true,
          reactions: [
            { type: "like", count: 1, users: ["john.smith"] }
          ]
        }
      ]
    };
    
    setSelectedCommunicationData(fullCommunicationData);
    // Clear file selection when communication is selected
    setSelectedFileId(null);
  };

  // Handlers for panel collapse functionality
  const handleLeftPanelCollapse = () => {
    setLeftCollapsed(true);
  };

  const handleRightPanelCollapse = () => {
    setRightCollapsed(true);
  };

  const handleLeftPanelExpand = () => {
    setLeftCollapsed(false);
  };

  const handleRightPanelExpand = () => {
    setRightCollapsed(false);
  };

  const handleDateEdit = (id: number) => {
    setEditingDate(id);
  };

  const handleDateSave = (id: number, newDate: Date | null) => {
    setKeyDates(prev => prev.map(date => 
      date.id === id ? { ...date, date: newDate, isEditing: false } : date
    ));
    setEditingDate(null);
  };

  const handleAddNewDate = (templateName: string) => {
    const newDate: KeyDate = {
      id: keyDates.length + 1,
      name: templateName,
      date: null,
      type: "deadline" as const
    };
    setKeyDates(prev => [...prev, newDate]);
    setNewDateName("");
    setShowNewDatePicker(true);
  };

  const handleDeleteDate = (id: number) => {
    setKeyDates(prev => prev.filter(date => date.id !== id));
  };

  const setShowNewDatePicker = (show: boolean) => {
    // This function is not used in the provided code, but it's included for completeness
    // to handle the state of the new date picker
  };

  const handleAddSuggestedDate = (suggestedDate: AISuggestedDate) => {
    const newDate: KeyDate = {
      id: keyDates.length + 1,
      name: suggestedDate.name,
      date: suggestedDate.date,
      type: suggestedDate.type
    };
    setKeyDates(prev => [...prev, newDate]);
    
    // Remove the suggestion from AI suggestions
    setAiSuggestedDates(prev => prev.filter(ai => ai.id !== suggestedDate.id));
    
    // Check if we still have suggestions
    if (aiSuggestedDates.length <= 1) {
      setHasAISuggestions(false);
    }
  };

  const handleRemoveSuggestion = (suggestionId: string) => {
    setAiSuggestedDates(prev => prev.filter(ai => ai.id !== suggestionId));
    
    // Check if we still have suggestions
    if (aiSuggestedDates.length <= 1) {
      setHasAISuggestions(false);
    }
  };

  const handleEventNameEdit = (id: number, currentName: string) => {
    setEditingEventName(id);
    setEditingEventValue(currentName);
  };

  const handleEventNameSave = (id: number) => {
    if (editingEventValue.trim()) {
      setKeyDates(prev => prev.map(date => 
        date.id === id ? { ...date, name: editingEventValue.trim() } : date
      ));
    }
    setEditingEventName(null);
    setEditingEventValue("");
  };

  const handleEventNameCancel = () => {
    setEditingEventName(null);
    setEditingEventValue("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Interactive Stage & Date Manager Header */}
      <div className="relative">
            <div className="flex items-center justify-between w-full px-6 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                
                {/* Stage Navigation Control */}
                {!isSyncedToCRM ? (
                  /* Unregistered Opportunity - Blue Register Button */
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleRegisterOpportunity}
                    disabled={isStageTransitioning}
                  >
                    {isStageTransitioning ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    <span>{isStageTransitioning ? "Registering..." : "Register"}</span>
                  </Button>
                ) : (
                  /* Integrated Three-Button Stage Navigation */
                  <div className="flex items-center border border-border rounded-lg overflow-hidden bg-card">
                    {/* Red Left Arrow Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-none border-0 bg-red-600 hover:bg-red-700 text-white disabled:bg-red-600/30 disabled:text-white/50"
                      onClick={handleStageBackward}
                      disabled={isFirstStage || isStageTransitioning}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Center Stage Display Button */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors px-4 h-9 rounded-none border-0 border-l border-r border-border min-w-0"
                          disabled={isStageTransitioning}
                        >
                          <span>•</span>
                          <span className="truncate">
                            {isStageTransitioning 
                              ? "Updating..." 
                              : `Stage ${currentStage}/${stageDefinitions.length}: ${currentStageInfo.name}`
                            }
                          </span>
                          <ChevronDown className="h-3 w-3 flex-shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-4 space-y-4 bg-[rgba(0,0,0,0)]">
                          <div className="text-center">
                            <div className="text-sm font-medium">Current Stage</div>
                            <div className="text-lg font-medium text-primary">
                              Stage {currentStage} of {stageDefinitions.length}: {currentStageInfo.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {currentStageInfo.description}
                            </div>
                          </div>
                          
                          {/* Stage Progress Visualization */}
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">Progress</div>
                            <div className="flex items-center gap-1">
                              {stageDefinitions.map((stage) => (
                                <div
                                  key={stage.id}
                                  className={`h-2 flex-1 rounded-full transition-colors ${
                                    stage.id <= currentStage
                                      ? "bg-primary"
                                      : "bg-muted"
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground text-center">
                              {Math.round((currentStage / stageDefinitions.length) * 100)}% Complete
                            </div>
                          </div>
                          
                          {/* Error Display */}
                          {stageTransitionError && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                              <p className="text-sm text-destructive">{stageTransitionError}</p>
                            </div>
                          )}
                          
                          {/* Navigation Buttons */}
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 border-red-600/20 text-red-600 hover:bg-red-600/10"
                              disabled={isFirstStage || isStageTransitioning}
                              onClick={handleStageBackward}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 border-green-600/20 text-green-600 hover:bg-green-600/10"
                              disabled={isLastStage || isStageTransitioning}
                              onClick={handleStageForward}
                            >
                              {isStageTransitioning ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <>
                                  Next
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Green Right Arrow Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-none border-0 bg-green-600 hover:bg-green-700 text-white disabled:bg-green-600/30 disabled:text-white/50"
                      onClick={handleStageForward}
                      disabled={isLastStage || isStageTransitioning}
                    >
                      {isStageTransitioning ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Key Dates Button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ${
                        hasAISuggestions 
                          ? "animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)] border border-yellow-400/40 bg-yellow-400/5" 
                          : ""
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      <span>Key Dates</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0" align="end">
                    <div className="bg-gray-800 h-full flex flex-col">
                      {/* Key Dates Section */}
                      <div className="flex-1 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-700/50 bg-[rgba(83,83,83,1)]">
                          <div className="text-sm font-medium text-gray-100">Key Dates</div>
                        </div>
                        
                        {/* Scrollable content with custom scrollbar */}
                        <div className="flex-1 overflow-y-auto px-1.5 py-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-thumb-rounded-full bg-white">
                          {/* Key Dates List */}
                          <div className="space-y-0">
                            {keyDates.map((keyDate, index) => (
                              <div key={keyDate.id}>
                                <div className="flex items-center justify-between py-1 px-1.5 group hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {editingEventName === keyDate.id ? (
                                      <Input
                                        value={editingEventValue}
                                        onChange={(e) => setEditingEventValue(e.target.value)}
                                        onBlur={() => handleEventNameSave(keyDate.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleEventNameSave(keyDate.id);
                                          if (e.key === 'Escape') handleEventNameCancel();
                                        }}
                                        className="h-5 text-[10px] bg-white border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 px-1.5"
                                        autoFocus
                                      />
                                    ) : (
                                      <span 
                                        className="text-[10px] text-gray-700 truncate cursor-pointer hover:text-blue-500 flex items-center gap-1 transition-colors font-bold"
                                        onClick={() => handleEventNameEdit(keyDate.id, keyDate.name)}
                                      >
                                        {keyDate.name}
                                        <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-40 transition-opacity text-gray-400" />
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-0.5">
                                    {keyDate.id === editingDate ? (
                                      <Popover open onOpenChange={(open) => !open && handleDateSave(keyDate.id, keyDate.date)}>
                                        <PopoverTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] hover:bg-gray-100 text-gray-600 hover:text-gray-900 font-mono">
                                            <Calendar className="h-2.5 w-2.5 mr-1" />
                                            {keyDate.date ? keyDate.date.toLocaleDateString('en-US', { 
                                              month: 'short', 
                                              day: 'numeric',
                                              year: 'numeric'
                                            }) : "Select"}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
                                          <CalendarPicker
                                            mode="single"
                                            selected={keyDate.date || undefined}
                                            onSelect={(date) => handleDateSave(keyDate.id, date || null)}
                                            initialFocus
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-5 px-1.5 text-[12px] hover:bg-gray-100 text-[rgba(53,58,65,1)] hover:text-gray-900 font-mono transition-colors font-bold"
                                        onClick={() => handleDateEdit(keyDate.id)}
                                      >
                                        {keyDate.date ? keyDate.date.toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: 'numeric'
                                        }) : "Not set"}
                                      </Button>
                                    )}
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
                                      onClick={() => handleDeleteDate(keyDate.id)}
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                </div>
                                {index < keyDates.length - 1 && (
                                  <div className="h-px bg-gray-100"></div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Add New Date Combobox */}
                          <div className="mt-2 mb-1">
                            <Command className="border border-gray-200 bg-gray-50/50 rounded">
                              <CommandInput 
                                placeholder="+ Add Key Date..."
                                value={newDateName}
                                onValueChange={setNewDateName}
                                className="h-6 bg-transparent placeholder:text-gray-400 border-0 text-[10px] px-2"
                              />
                              {newDateName && (
                                <CommandList className="border-t border-gray-200 bg-white max-h-32">
                                  <CommandEmpty className="text-gray-400 py-2 text-[9px]">No templates found.</CommandEmpty>
                                  <CommandGroup>
                                    {filteredTemplates.map((template) => (
                                      <CommandItem 
                                        key={template}
                                        onSelect={() => handleAddNewDate(template)}
                                        className="cursor-pointer hover:bg-gray-50 px-2 py-1 transition-colors text-[10px]"
                                      >
                                        <Plus className="h-2.5 w-2.5 mr-1.5 text-blue-500" />
                                        {template}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              )}
                            </Command>
                          </div>

                          {/* AI Suggestions Section */}
                          {hasAISuggestions && aiSuggestedDates.length > 0 && (
                            <div className="mt-2 space-y-0.5 p-1.5 rounded border border-amber-200 bg-amber-50/30">
                              <div className="flex items-center gap-1.5 pb-0.5 px-0.5">
                                <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></div>
                                <div className="text-[8px] uppercase tracking-wider text-amber-600">AI Suggested</div>
                              </div>
                              
                              <div className="space-y-0">
                                {aiSuggestedDates.map((suggestion, index) => (
                                  <div key={suggestion.id}>
                                    <div className="flex items-center justify-between py-1 px-1 group hover:bg-amber-100/50 transition-colors">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[10px] text-gray-700 truncate font-bold">{suggestion.name}</div>
                                      </div>
                                      <div className="text-[12px] text-[rgba(53,58,65,1)] mx-2 whitespace-nowrap font-mono font-bold">
                                        {suggestion.date.toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </div>
                                      <div className="flex items-center gap-0.5">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-4 w-4 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 transition-all font-bold"
                                          onClick={() => handleAddSuggestedDate(suggestion)}
                                        >
                                          <Check className="h-2.5 w-2.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
                                          onClick={() => handleRemoveSuggestion(suggestion.id)}
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </Button>
                                      </div>
                                    </div>
                                    {index < aiSuggestedDates.length - 1 && (
                                      <div className="h-px bg-amber-100"></div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="border-t border-gray-700/50 space-y-2 bg-[rgb(255,255,255)] px-[9px] py-[3px] rounded-[2px]">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-[rgb(9,11,11)] hover:text-gray-100 hover:bg-gray-700/40 h-8 text-[rgb(0,0,0)]">
                          <RefreshCw className="h-3.5 w-3.5 mr-2" />
                          Sync Dates to CRM
                        </Button>
                        
                        {/* Settings Button */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-start text-[rgb(0,0,0)] hover:text-gray-200 hover:bg-gray-700/40 h-7">
                              <Settings className="h-3 w-3 mr-2" />
                              Settings
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0 bg-gray-800 border-gray-600/50" align="start">
                            <div className="p-3 border-b border-gray-700/50">
                              <h4 className="text-sm font-medium text-gray-100">Display Settings</h4>
                            </div>
                            <div className="p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Dates in header:</span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-gray-600/40 text-gray-400 hover:text-gray-100"
                                    onClick={() => setKeyDatesDisplay(prev => Math.max(0, prev - 1))}
                                    disabled={keyDatesDisplay <= 0}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <div className="w-6 text-center text-sm text-gray-100 font-mono">
                                    {keyDatesDisplay}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-gray-600/40 text-gray-400 hover:text-gray-100"
                                    onClick={() => setKeyDatesDisplay(prev => Math.min(3, prev + 1))}
                                    disabled={keyDatesDisplay >= 3}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Right Side - Key Date Pills */}
              <div className="flex items-center gap-2">
                {keyDatesDisplay > 0 && upcomingDatesForHeader.map((date) => (
                  <div
                    key={date.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-xs text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="whitespace-nowrap">
                      {date.date?.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}:
                    </span>
                    <span className="truncate max-w-24 font-medium">{date.name}</span>
                  </div>
                ))}
                
                {/* Show message when no upcoming dates */}
                {keyDatesDisplay > 0 && upcomingDatesForHeader.length === 0 && (
                  <div className="text-xs text-muted-foreground italic">
                    No upcoming dates
                  </div>
                )}
              </div>
            </div>
      </div>

      {/* Three-Pane Layout with FlexibleWorkspace */}
      <div className="flex-1 overflow-hidden">
        <FlexibleWorkspace
          leftPane={<FileExplorer dealName={dealName} onFileSelect={handleFileSelect} onCommunicationSelect={handleCommunicationSelect} onCollapse={handleLeftPanelCollapse} />}
          centerPane={<DocumentViewer 
            selectedFileId={selectedFileId} 
            communicationData={selectedCommunicationData}
            viewMode={selectedCommunicationId ? 'communication' : 'document'}
          />}
          rightPane={
            <AnalysisPanel 
              dealName={dealName} 
              onCollapse={handleRightPanelCollapse}
              chatMessages={chatMessages}
              isAITyping={isAITyping}
              onSendMessage={onSendMessage}
            />
          }
          defaultLeftWidth={20}
          defaultRightWidth={25}
          minLeftWidth={15}
          minRightWidth={20}
          isLeftCollapsed={leftCollapsed}
          isRightCollapsed={rightCollapsed}
          onLeftExpand={handleLeftPanelExpand}
          onRightExpand={handleRightPanelExpand}
        />
      </div>
    </div>
  );
}