import { useState, useRef, useCallback, useEffect } from "react";
import { X, Plus, Trash2, GripVertical, ChevronDown, Check, FolderOpen, Save, Search, Filter, Tag, Clock, FileText, Upload, FileUp, Users, MoreVertical } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { SubTaskModal } from "./SubTaskModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export interface Task {
  id: string;
  title: string;
  taskType: "Action Item" | "Consideration";
  systemPrompt: string;
  files: string[];
}

export interface Stage {
  id: string;
  name: string;
  order: number;
  parties: string[];
  description: string;
  tasks: Task[];
}

export interface BusinessProcess {
  id: string;
  name: string;
  description?: string;
  stages: Stage[];
  createdAt: Date;
  lastModified: Date;
}

interface BusinessProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProcess?: (process: BusinessProcess) => void;
  selectedProcessId?: string;
}

const DND_TYPES = {
  STAGE: "STAGE",
};

// Draggable Stage Component
interface DraggableStageProps {
  stage: Stage;
  index: number;
  allStages: Stage[];
  onDelete: (id: string) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (id: string, name: string) => void;
  onUpdateMetadata: (id: string, field: string, value: any) => void;
  onAddTask: (stageId: string, task: Task) => void;
  onUpdateTask: (stageId: string, taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (stageId: string, taskId: string) => void;
}

function DraggableStage({ stage, index, allStages, onDelete, onMove, onEdit, onUpdateMetadata, onAddTask, onUpdateTask, onDeleteTask }: DraggableStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(stage.name);
  const [isSubTaskModalOpen, setIsSubTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskSearchOpen, setIsTaskSearchOpen] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");

  const [{ isDragging }, drag] = useDrag({
    type: DND_TYPES.STAGE,
    item: () => ({ index, stageId: stage.id }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: DND_TYPES.STAGE,
    hover(item: { index: number; stageId: string }, monitor) {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  const handleSave = () => {
    if (editValue.trim()) {
      onEdit(stage.id, editValue.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(stage.name);
      setIsEditing(false);
    }
  };

  const handleSaveTask = (task: Task) => {
    if (editingTask) {
      // Update existing task
      onUpdateTask(stage.id, task.id, task);
      toast.success("Task updated");
    } else {
      // Add new task
      onAddTask(stage.id, task);
      toast.success("Task added");
    }
    setEditingTask(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsSubTaskModalOpen(true);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsSubTaskModalOpen(true);
  };

  return (
    <div
      ref={ref}
      className={`group transition-all duration-200 ${
        isDragging ? "opacity-30 scale-[0.98]" : "opacity-100"
      } ${isOver ? "bg-orange-500/5" : ""}`}
    >
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="stage" className="border-none">
          <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative ${
            isOver ? "bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20" : "bg-muted/30 hover:bg-muted/50 border border-transparent"
          }`}>
            <div 
              className="cursor-grab active:cursor-grabbing transition-transform hover:scale-110"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            
            <AccordionTrigger className="flex items-center gap-3 flex-1 py-0 hover:no-underline">
              <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-6 text-xs max-w-[200px]"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="text-xs transition-colors duration-200 truncate" onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
                    {stage.name}
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-1 rounded-full bg-blue-400/60"></div>
                    <span>{stage.tasks.length} tasks</span>
                  </div>
                  {stage.parties.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="h-1 w-1 rounded-full bg-purple-400/60"></div>
                      <span>{stage.parties.length} parties</span>
                    </div>
                  )}
                  {stage.description && (
                    <div className="flex items-center gap-1">
                      <div className="h-1 w-1 rounded-full bg-green-400/60"></div>
                      <span>described</span>
                    </div>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            
            <div
              onClick={(e) => { e.stopPropagation(); onDelete(stage.id); }}
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 rounded-md flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </div>
          </div>

          <AccordionContent className="pb-2 pt-2 px-3">
            <div className="space-y-2.5 px-3 py-3 max-w-full overflow-hidden">
              {/* Parties Section */}
              <div className="space-y-1.5 max-w-full">
                <Label className="text-[10px] flex items-center gap-1.5 text-purple-400/90">
                  <Users className="h-3 w-3" />
                  Parties Involved
                </Label>
                <Input
                  value={stage.parties.join(", ")}
                  onChange={(e) => onUpdateMetadata(stage.id, "parties", e.target.value.split(",").map(p => p.trim()).filter(Boolean))}
                  className="h-8 text-xs bg-background/60 border-border/50 focus:border-purple-500/30 focus:ring-purple-500/20 w-full max-w-full"
                  placeholder="e.g., Borrower, Lender, Legal Counsel"
                />
              </div>

              {/* Description Section */}
              <div className="space-y-1.5 max-w-full">
                <Label className="text-[10px] text-green-400/90">Description</Label>
                <Textarea
                  value={stage.description}
                  onChange={(e) => onUpdateMetadata(stage.id, "description", e.target.value)}
                  className="min-h-[60px] text-xs resize-none bg-background/60 border-border/50 focus:border-green-500/30 focus:ring-green-500/20 w-full max-w-full"
                  placeholder="Describe the purpose and goals of this stage..."
                />
              </div>

              {/* Tasks Section */}
              <div className="space-y-1.5 max-w-full">
                <Label className="text-[10px] text-blue-400/90">Individual Tasks</Label>

                {/* Search Bar with Attached Tab */}
                <div className="flex items-center gap-0 max-w-full min-w-0">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                    <Input
                      placeholder="Search tasks..."
                      value={taskSearchQuery}
                      onChange={(e) => setTaskSearchQuery(e.target.value)}
                      className="h-8 pl-9 pr-3 text-xs bg-muted/30 border-border/40 focus:border-blue-500/40 focus:bg-background/50 rounded-r-none border-r-0 w-full"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateTask}
                    className="h-8 px-2.5 text-[10px] border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40 text-blue-400 rounded-l-none border-l-border/40 flex-shrink-0"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    New Task
                  </Button>
                </div>

                {/* Selected Tasks Display */}
                {stage.tasks.length > 0 ? (
                  <ScrollArea className="w-full max-w-full">
                    <div className="flex gap-1.5 pb-2">
                      {stage.tasks
                        .filter((task) =>
                          task.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
                          task.systemPrompt.toLowerCase().includes(taskSearchQuery.toLowerCase())
                        )
                        .map((task) => (
                          <div
                            key={task.id}
                            className="group/task relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-muted/30 hover:bg-muted/50 border border-border/40 hover:border-border/60 transition-all duration-200 whitespace-nowrap flex-shrink-0 bg-[rgba(167,167,254,0.3)]"
                          >
                            <span className="text-[10px] text-foreground/90">{task.title}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 flex items-center justify-center hover:bg-muted/60 rounded transition-all"
                                >
                                  <MoreVertical className="h-2.5 w-2.5 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  onClick={() => handleEditTask(task)}
                                  className="text-xs cursor-pointer"
                                >
                                  <FileText className="h-3 w-3 mr-2" />
                                  Edit Task
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDeleteTask(stage.id, task.id)}
                                  className="text-xs cursor-pointer text-red-400 focus:text-red-400"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-6 text-[10px] text-muted-foreground/60 border border-dashed border-border/40 rounded-lg bg-muted/10">
                    No tasks added yet. Create a new task above.
                  </div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <SubTaskModal
        isOpen={isSubTaskModalOpen}
        onClose={() => {
          setIsSubTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
      />
    </div>
  );
}

export function BusinessProcessModal({ isOpen, onClose, onSelectProcess, selectedProcessId }: BusinessProcessModalProps) {
  // Mock data for initial business processes
  const [businessProcesses, setBusinessProcesses] = useState<BusinessProcess[]>([
    {
      id: "default",
      name: "Default Deal Process",
      description: "Standard deal flow process",
      stages: [
        { id: "s1", name: "New Opportunity", order: 0, parties: ["Deal Originator"], description: "Initial opportunity identification and intake", tasks: [] },
        { id: "s2", name: "Preliminary Screening", order: 1, parties: ["Analyst", "Deal Originator"], description: "Quick assessment of deal viability", tasks: [{ id: "t1", title: "Market Research", taskType: "Action Item", systemPrompt: "Research the market and competitive landscape", files: [] }] },
        { id: "s3", name: "Opportunity Memo", order: 2, parties: ["Analyst", "Associate"], description: "Prepare detailed opportunity analysis", tasks: [] },
        { id: "s4", name: "Term Sheet", order: 3, parties: ["Principal", "Legal Counsel", "Borrower"], description: "Negotiate and finalize term sheet", tasks: [] },
        { id: "s5", name: "Underwrite", order: 4, parties: ["Underwriter", "Financial Analyst"], description: "Comprehensive financial and risk analysis", tasks: [] },
        { id: "s6", name: "Credit Committee", order: 5, parties: ["Investment Committee", "Risk Management"], description: "Final investment approval", tasks: [] },
        { id: "s7", name: "Documentation", order: 6, parties: ["Legal Counsel", "Compliance"], description: "Legal documentation and compliance review", tasks: [] },
        { id: "s8", name: "Loan Closing", order: 7, parties: ["Operations", "Borrower", "Escrow Agent"], description: "Final closing and fund disbursement", tasks: [] },
      ],
      createdAt: new Date("2025-01-15"),
      lastModified: new Date("2025-10-20"),
    },
    {
      id: "corporate-lending",
      name: "Corporate Lending Process",
      description: "For corporate loan origination",
      stages: [
        { id: "s1", name: "Initial Contact", order: 0, parties: ["Relationship Manager"], description: "Establish relationship with corporate client", tasks: [] },
        { id: "s2", name: "Business Review", order: 1, parties: ["Relationship Manager", "Credit Analyst"], description: "Review business operations and strategy", tasks: [] },
        { id: "s3", name: "Financial Analysis", order: 2, parties: ["Credit Analyst", "Risk Team"], description: "Detailed financial statement analysis", tasks: [] },
        { id: "s4", name: "Proposal", order: 3, parties: ["Relationship Manager", "Product Specialist"], description: "Develop and present loan proposal", tasks: [] },
        { id: "s5", name: "Credit Approval", order: 4, parties: ["Credit Committee"], description: "Internal credit approval process", tasks: [] },
        { id: "s6", name: "Legal Documentation", order: 5, parties: ["Legal Team", "Borrower Counsel"], description: "Draft and negotiate loan agreements", tasks: [] },
        { id: "s7", name: "Funding", order: 6, parties: ["Operations", "Treasury"], description: "Loan disbursement and account setup", tasks: [] },
      ],
      createdAt: new Date("2025-02-10"),
      lastModified: new Date("2025-10-18"),
    },
    {
      id: "real-estate",
      name: "Real Estate Acquisition",
      description: "Commercial real estate deals",
      stages: [
        { id: "s1", name: "Deal Sourcing", order: 0, parties: ["Acquisitions Team"], description: "Identify and source potential properties", tasks: [] },
        { id: "s2", name: "Initial Screening", order: 1, parties: ["Asset Manager", "Analyst"], description: "Preliminary property evaluation", tasks: [] },
        { id: "s3", name: "LOI Submission", order: 2, parties: ["Principal", "Seller"], description: "Submit letter of intent", tasks: [] },
        { id: "s4", name: "Due Diligence", order: 3, parties: ["Due Diligence Team", "Legal", "Engineering"], description: "Comprehensive property inspection", tasks: [] },
        { id: "s5", name: "Investment Committee", order: 4, parties: ["Investment Committee"], description: "Investment approval decision", tasks: [] },
        { id: "s6", name: "Purchase Agreement", order: 5, parties: ["Legal Team", "Seller Counsel"], description: "Negotiate and execute purchase agreement", tasks: [] },
        { id: "s7", name: "Closing", order: 6, parties: ["Title Company", "Lender", "Seller"], description: "Final closing and transfer of ownership", tasks: [] },
      ],
      createdAt: new Date("2025-03-05"),
      lastModified: new Date("2025-10-15"),
    },
    {
      id: "venture-capital",
      name: "Venture Capital Investment",
      description: "Early stage startup investments",
      stages: [
        { id: "s1", name: "Deal Flow Review", order: 0, parties: ["Associate"], description: "Initial review of startup applications", tasks: [] },
        { id: "s2", name: "Pitch Meeting", order: 1, parties: ["Partner", "Founders"], description: "Startup pitch presentation", tasks: [] },
        { id: "s3", name: "Preliminary Diligence", order: 2, parties: ["Associate", "Analyst"], description: "Initial market and team assessment", tasks: [] },
        { id: "s4", name: "Term Sheet", order: 3, parties: ["Partner", "Founders"], description: "Negotiate investment terms", tasks: [] },
        { id: "s5", name: "Deep Due Diligence", order: 4, parties: ["Full Team", "External Advisors"], description: "Comprehensive company analysis", tasks: [] },
        { id: "s6", name: "Partner Vote", order: 5, parties: ["All Partners"], description: "Partnership investment decision", tasks: [] },
        { id: "s7", name: "Legal Documentation", order: 6, parties: ["Legal Counsel", "Founders"], description: "Investment agreement preparation", tasks: [] },
        { id: "s8", name: "Wire Transfer", order: 7, parties: ["Operations", "Founders"], description: "Fund transfer and board setup", tasks: [] },
      ],
      createdAt: new Date("2025-04-20"),
      lastModified: new Date("2025-10-12"),
    },
    {
      id: "mezzanine-debt",
      name: "Mezzanine Debt Process",
      description: "Subordinated debt transactions",
      stages: [
        { id: "s1", name: "Opportunity Review", order: 0, parties: ["Deal Team"], description: "Initial mezzanine opportunity assessment", tasks: [] },
        { id: "s2", name: "Preliminary Modeling", order: 1, parties: ["Financial Analyst"], description: "Build initial financial model", tasks: [] },
        { id: "s3", name: "Term Sheet Negotiation", order: 2, parties: ["Principal", "Sponsor"], description: "Negotiate mezzanine loan terms", tasks: [] },
        { id: "s4", name: "Underwriting", order: 3, parties: ["Underwriting Team"], description: "Detailed risk and return analysis", tasks: [] },
        { id: "s5", name: "Investment Committee", order: 4, parties: ["Investment Committee"], description: "Final investment approval", tasks: [] },
        { id: "s6", name: "Documentation", order: 5, parties: ["Legal Counsel"], description: "Subordinated debt documentation", tasks: [] },
        { id: "s7", name: "Funding", order: 6, parties: ["Operations"], description: "Fund disbursement", tasks: [] },
      ],
      createdAt: new Date("2025-05-15"),
      lastModified: new Date("2025-10-10"),
    },
  ]);

  const [currentProcessId, setCurrentProcessId] = useState<string>("default");
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<"all" | "recent" | "custom">("all");

  const currentProcess = businessProcesses.find((p) => p.id === currentProcessId);

  // Filter business processes based on search and filter
  const filteredProcesses = businessProcesses.filter((process) => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        process.name.toLowerCase().includes(query) ||
        (process.description || "").toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // View filter
    if (viewFilter === "recent") {
      // Show processes modified in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return process.lastModified >= thirtyDaysAgo;
    } else if (viewFilter === "custom") {
      // Show only non-default processes
      return process.id !== "default";
    }

    return true;
  });

  // Add new stage
  const handleAddStage = () => {
    if (!currentProcess) return;

    const newStage: Stage = {
      id: `s${Date.now()}`,
      name: "New Stage",
      order: currentProcess.stages.length,
      parties: [],
      description: "",
      tasks: [],
    };

    setBusinessProcesses((prev) =>
      prev.map((p) =>
        p.id === currentProcessId
          ? {
              ...p,
              stages: [...p.stages, newStage],
              lastModified: new Date(),
            }
          : p
      )
    );

    toast.success("Stage added");
  };

  // Delete stage
  const handleDeleteStage = (stageId: string) => {
    if (!currentProcess) return;

    setBusinessProcesses((prev) =>
      prev.map((p) =>
        p.id === currentProcessId
          ? {
              ...p,
              stages: p.stages
                .filter((s) => s.id !== stageId)
                .map((s, idx) => ({ ...s, order: idx })),
              lastModified: new Date(),
            }
          : p
      )
    );

    toast.success("Stage removed");
  };

  // Move stage
  const handleMoveStage = (dragIndex: number, hoverIndex: number) => {
    if (!currentProcess) return;

    setBusinessProcesses((prev) =>
      prev.map((p) => {
        if (p.id !== currentProcessId) return p;

        const stages = [...p.stages];
        const draggedStage = stages[dragIndex];
        stages.splice(dragIndex, 1);
        stages.splice(hoverIndex, 0, draggedStage);

        return {
          ...p,
          stages: stages.map((s, idx) => ({ ...s, order: idx })),
          lastModified: new Date(),
        };
      })
    );
  };

  // Edit stage name
  const handleEditStage = (stageId: string, name: string) => {
    if (!currentProcess) return;

    setBusinessProcesses((prev) =>
      prev.map((p) =>
        p.id === currentProcessId
          ? {
              ...p,
              stages: p.stages.map((s) =>
                s.id === stageId ? { ...s, name } : s
              ),
              lastModified: new Date(),
            }
          : p
      )
    );
  };

  // Update stage metadata
  const handleUpdateStageMetadata = (stageId: string, field: string, value: any) => {
    if (!currentProcess) return;

    setBusinessProcesses((prev) =>
      prev.map((p) =>
        p.id === currentProcessId
          ? {
              ...p,
              stages: p.stages.map((s) =>
                s.id === stageId ? { ...s, [field]: value } : s
              ),
              lastModified: new Date(),
            }
          : p
      )
    );
  };

  // Add task to stage
  const handleAddTask = (stageId: string, task: Task) => {
    if (!currentProcess) return;

    setBusinessProcesses((prev) =>
      prev.map((p) =>
        p.id === currentProcessId
          ? {
              ...p,
              stages: p.stages.map((s) =>
                s.id === stageId ? { ...s, tasks: [...s.tasks, task] } : s
              ),
              lastModified: new Date(),
            }
          : p
      )
    );
  };

  // Update task
  const handleUpdateTask = (stageId: string, taskId: string, updates: Partial<Task>) => {
    if (!currentProcess) return;

    setBusinessProcesses((prev) =>
      prev.map((p) =>
        p.id === currentProcessId
          ? {
              ...p,
              stages: p.stages.map((s) =>
                s.id === stageId
                  ? {
                      ...s,
                      tasks: s.tasks.map((t) =>
                        t.id === taskId ? { ...t, ...updates } : t
                      ),
                    }
                  : s
              ),
              lastModified: new Date(),
            }
          : p
      )
    );
  };

  // Delete task
  const handleDeleteTask = (stageId: string, taskId: string) => {
    if (!currentProcess) return;

    setBusinessProcesses((prev) =>
      prev.map((p) =>
        p.id === currentProcessId
          ? {
              ...p,
              stages: p.stages.map((s) =>
                s.id === stageId
                  ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }
                  : s
              ),
              lastModified: new Date(),
            }
          : p
      )
    );

    toast.success("Task deleted");
  };

  // Create new process
  const handleNewProcess = () => {
    const newProcess: BusinessProcess = {
      id: `bp${Date.now()}`,
      name: "New Business Process",
      description: "",
      stages: [
        { id: `s${Date.now()}`, name: "Stage 1", order: 0, parties: [], description: "", tasks: [] },
      ],
      createdAt: new Date(),
      lastModified: new Date(),
    };

    setBusinessProcesses((prev) => [...prev, newProcess]);
    setCurrentProcessId(newProcess.id);
    toast.success("New business process created");
  };

  // Edit process name
  const handleEditProcessName = (name: string) => {
    setBusinessProcesses((prev) =>
      prev.map((p) =>
        p.id === currentProcessId
          ? { ...p, name, lastModified: new Date() }
          : p
      )
    );
  };

  // Edit process description
  const handleEditProcessDescription = (description: string) => {
    setBusinessProcesses((prev) =>
      prev.map((p) =>
        p.id === currentProcessId
          ? { ...p, description, lastModified: new Date() }
          : p
      )
    );
  };

  // Handle resize
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;

      if (newWidth >= 240 && newWidth <= 400) {
        setLeftPanelWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Sync currentProcessId when selectedProcessId prop changes
  useEffect(() => {
    if (selectedProcessId) {
      setCurrentProcessId(selectedProcessId);
    }
  }, [selectedProcessId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[85vw] !max-w-[85vw] h-[85vh] p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Business Process Manager</DialogTitle>
        <DialogDescription className="sr-only">
          Create and manage business processes with custom stage sequences for deal workflows
        </DialogDescription>
        <DndProvider backend={HTML5Backend}>
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-border bg-muted/10">
              {/* Title Row */}
              <div className="flex items-center justify-between px-6 pt-3 pb-2">
                <h1 className="font-medium">Business Process Manager</h1>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>


            </div>

            {/* Two-Panel Layout with Resizable Divider */}
            <div className="flex-1 flex overflow-hidden" ref={containerRef}>
              {/* Left Panel - Process Library */}
              <div className="flex-shrink-0 border-r border-border" style={{ width: `${leftPanelWidth}px` }}>
                <div className="h-full flex flex-col bg-muted/5">
                  {/* Library Header with Search and Filters */}
                  <div className="flex-shrink-0 border-b border-border bg-muted/20">
                    <div className="px-3 py-2.5 space-y-2">
                      {/* Search bar */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="text"
                          placeholder="Search processes..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-8 pl-8 pr-8 text-[11px] bg-background"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Filter Pills */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewFilter("all")}
                          className={`h-6 px-2.5 text-[10px] rounded-md transition-all duration-200 border ${
                            viewFilter === "all"
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                              : "bg-background text-muted-foreground border-border hover:bg-muted/50"
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setViewFilter("recent")}
                          className={`h-6 px-2.5 text-[10px] rounded-md transition-all duration-200 border ${
                            viewFilter === "recent"
                              ? "bg-green-500/15 text-green-400 border-green-500/30"
                              : "bg-background text-muted-foreground border-border hover:bg-muted/50"
                          }`}
                        >
                          Recent
                        </button>
                        <button
                          onClick={() => setViewFilter("custom")}
                          className={`h-6 px-2.5 text-[10px] rounded-md transition-all duration-200 border ${
                            viewFilter === "custom"
                              ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                              : "bg-background text-muted-foreground border-border hover:bg-muted/50"
                          }`}
                        >
                          Custom
                        </button>
                        <div className="flex-1" />
                        <Button
                          onClick={handleNewProcess}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          New
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Process List */}
                  <ScrollArea className="flex-1">
                    <div className="p-1">
                      {filteredProcesses.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-xs">
                          {searchQuery ? "No processes found" : "No processes available"}
                        </div>
                      ) : (
                        filteredProcesses.map((process) => {
                          const isActive = currentProcessId === process.id;
                          const isDefault = process.id === "default";
                          
                          return (
                            <div
                              key={process.id}
                              onClick={() => {
                                setCurrentProcessId(process.id);
                                onSelectProcess?.(process);
                              }}
                              className={`group relative px-2 py-1 cursor-pointer transition-all border-l-2 ${
                                isActive
                                  ? "bg-orange-500/10 border-l-orange-500"
                                  : "border-l-transparent hover:bg-muted/50 hover:border-l-border"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <div className={`text-xs truncate flex-1 ${isActive ? "text-orange-500" : "text-foreground"}`}>
                                  {process.name}
                                </div>
                                {isDefault && (
                                  <Badge variant="outline" className="h-3.5 px-1 text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>{process.stages.length} stages</span>
                                <span>•</span>
                                <span className="truncate flex-1">{process.description || "No description"}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>

                  {/* Library Footer Stats */}
                  <div className="flex-shrink-0 border-t border-border bg-muted/10 px-3 py-2">
                    <div className="text-[10px] text-muted-foreground">
                      {filteredProcesses.length} of {businessProcesses.length} processes
                      {searchQuery && " (filtered)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resizable Divider */}
              <div
                className="w-1 flex-shrink-0 bg-border hover:bg-orange-500/50 cursor-col-resize transition-colors relative group"
                onMouseDown={handleMouseDown}
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </div>

              {/* Right Panel - Stage Configuration */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm">Stage Sequence</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddStage}
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Stage
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Drag to reorder stages. Click to expand and configure parties, description, and tasks.
                  </p>
                </div>

                <ScrollArea className="flex-1">
                  <ScrollArea className="h-[calc(100vh-280px)] pr-4">
                    <div className="p-4 pl-0 space-y-1.5">
                      {currentProcess?.stages.map((stage, index) => (
                        <DraggableStage
                          key={stage.id}
                          stage={stage}
                          index={index}
                          allStages={currentProcess?.stages || []}
                          onDelete={handleDeleteStage}
                          onMove={handleMoveStage}
                          onEdit={handleEditStage}
                          onUpdateMetadata={handleUpdateStageMetadata}
                          onAddTask={handleAddTask}
                          onUpdateTask={handleUpdateTask}
                          onDeleteTask={handleDeleteTask}
                        />
                      ))}
                      {(!currentProcess?.stages || currentProcess.stages.length === 0) && (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                          No stages defined. Click "Add Stage" to get started.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </ScrollArea>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20">
              <div className="text-xs text-muted-foreground">
                {currentProcess ? (
                  <>
                    Business Process: {currentProcess.name} • {currentProcess.stages.length} stage
                    {currentProcess.stages.length !== 1 ? "s" : ""}
                  </>
                ) : (
                  <>No process selected</>
                )}
              </div>
            </div>
          </div>
        </DndProvider>
      </DialogContent>
    </Dialog>
  );
}
