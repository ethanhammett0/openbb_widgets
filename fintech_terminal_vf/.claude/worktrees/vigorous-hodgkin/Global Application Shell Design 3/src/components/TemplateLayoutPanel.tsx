import { useState, useRef, useCallback, useEffect } from "react";
import { useDrop, useDrag } from "react-dnd";
import { GripVertical, X, Plus, Check, Pencil, Trash2, Save, FolderOpen, ChevronDown, SaveAll, Network, Layers, ChevronRight, Key, Link, Database, Info } from "lucide-react";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { useTemplateBuilder } from "./contexts/TemplateBuilderContext";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TemplateColumnVariable, LibraryCategory, TreeNode, ForeignKeyRelationship, TemplateLibraryItem, DroppedItem } from "./types/TemplateBuilderTypes";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

// Drag-and-drop types
const DND_TYPES = {
  TEMPLATE_TAB: "TEMPLATE_TAB",
};

// Draggable Template Tab Component
interface DraggableTabProps {
  template: { id: string; name: string };
  index: number;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  showDelete: boolean;
}

function DraggableTab({ template, index, onDelete, onMove, showDelete }: DraggableTabProps) {
  const ref = useRef<HTMLDivElement>(null);

  // useDrag hook for dragging
  const [{ isDragging }, drag] = useDrag({
    type: DND_TYPES.TEMPLATE_TAB,
    item: () => ({ index, templateId: template.id }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // useDrop hook for dropping
  const [{ isOver }, drop] = useDrop({
    accept: DND_TYPES.TEMPLATE_TAB,
    hover(item: { index: number; templateId: string }, monitor) {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      
      // Get horizontal middle
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      
      // Get pixels to the left
      const hoverClientX = clientOffset!.x - hoverBoundingRect.left;

      // Only perform the move when the mouse has crossed half of the items width
      // When dragging left, only move when the cursor is left of 50%
      // When dragging right, only move when the cursor is right of 50%
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

      // Time to actually perform the action
      onMove(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Combine drag and drop refs
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`relative group flex-shrink-0 transition-all ${
        isDragging ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
      } ${isOver ? 'scale-105' : ''}`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Drag Handle - appears on hover */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      
      <TabsTrigger
        value={template.id}
        className={`relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-[10px] font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border hover:bg-muted/80 border border-transparent ${
          isOver ? 'ring-2 ring-blue-500/50' : ''
        }`}
      >
        {template.name}
        {showDelete && (
          <span className="ml-1.5 w-2.5" />
        )}
      </TabsTrigger>
      {showDelete && (
        <div
          onClick={(e) => onDelete(template.id, e)}
          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 cursor-pointer z-10"
        >
          <X className="h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );
}

// Tree Node Component for Hierarchical Display
interface TreeNodeComponentProps {
  node: TreeNode;
  depth: number;
  isLast: boolean;
  onToggleExpansion: (nodeId: string) => void;
  onAddChild: (parentId: string) => void;
  onRemove: (nodeId: string) => void;
  onSetPrimaryKey: (nodeId: string) => void;
  onSetForeignKey: (nodeId: string) => void;
  getChildren: (nodeId: string) => TreeNode[];
  treeNodes: TreeNode[];
  onDropItem: (nodeId: string, item: any) => void;
  onRemoveDroppedItem: (nodeId: string, droppedItemId: string) => void;
}

function TreeNodeComponent({
  node,
  depth,
  isLast,
  onToggleExpansion,
  onAddChild,
  onRemove,
  onSetPrimaryKey,
  onSetForeignKey,
  getChildren,
  treeNodes,
  onDropItem,
  onRemoveDroppedItem,
}: TreeNodeComponentProps) {
  const children = getChildren(node.id);
  const hasChildren = children.length > 0;
  const indentWidth = depth * 24;

  // Get the target node name for FK display
  const getFKTargetName = () => {
    if (!node.foreignKeyRef) return null;
    const targetNode = treeNodes.find(n => n.id === node.foreignKeyRef!.targetNodeId);
    return targetNode?.displayName || "Unknown";
  };

  // Drop zone for accepting variables and templates
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ["VARIABLE", "TEMPLATE"],
    drop: (item: any) => {
      onDropItem(node.id, item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [node.id, onDropItem]);

  return (
    <div className="relative">
      {/* Node Row */}
      <div
        className="group relative flex items-stretch gap-0 rounded-md border border-border bg-muted/20 hover:bg-muted/30 transition-colors overflow-hidden"
        style={{ marginLeft: `${indentWidth}px` }}
      >
        {/* Tree Lines */}
        {depth > 0 && (
          <>
            {/* Vertical line connecting to parent */}
            <div
              className="absolute top-0 bottom-1/2 w-px bg-border"
              style={{ left: `${-12}px` }}
            />
            {/* Horizontal line to node */}
            <div
              className="absolute top-1/2 w-3 h-px bg-border"
              style={{ left: `${-12}px` }}
            />
            {/* Vertical line continuing down if not last */}
            {!isLast && (
              <div
                className="absolute top-1/2 bottom-0 w-px bg-border"
                style={{ left: `${-12}px` }}
              />
            )}
          </>
        )}

        {/* Expand/Collapse Button */}
        <div className="flex items-center px-2 py-2 bg-muted/40">
          <button
            onClick={() => hasChildren && onToggleExpansion(node.id)}
            className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors ${
              hasChildren ? 'hover:bg-muted cursor-pointer' : 'invisible'
            }`}
          >
            {hasChildren && (
              node.isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )
            )}
          </button>
        </div>

        {/* Primary Key Block - Orange themed, compact */}
        <div className="flex items-center px-2 py-1.5 bg-orange-500/10 border-r border-orange-500/30 w-[80px] flex-shrink-0">
          <div className="flex flex-col items-center justify-center gap-0.5 w-full">
            <Key className="h-3 w-3 text-orange-400 flex-shrink-0" />
            <code className="text-[9px] font-mono text-orange-300 truncate max-w-full text-center">
              {node.displayName}
            </code>
            {node.isPrimaryKey && (
              <span className="text-[8px] text-orange-400">PK</span>
            )}
          </div>
        </div>

        {/* Blocks Tray Section */}
        <div
          ref={drop}
          className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 min-w-0 transition-colors ${
            isOver && canDrop ? 'bg-green-500/10 border-l-2 border-l-green-500/50' : ''
          }`}
        >
          {/* Dropped Items as Blocks */}
          {node.droppedItems && node.droppedItems.length > 0 ? (
            node.droppedItems.map((droppedItem) => (
              <div
                key={droppedItem.id}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded border w-[80px] flex-shrink-0 group/block relative ${
                  droppedItem.type === "variable"
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-purple-500/10 border-purple-500/30"
                }`}
              >
                <button
                  onClick={() => onRemoveDroppedItem(node.id, droppedItem.id)}
                  className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <X className="h-2 w-2 text-white" />
                </button>
                <span className={`text-[9px] truncate max-w-full text-center ${
                  droppedItem.type === "variable" ? "text-blue-300" : "text-purple-300"
                }`}>
                  {droppedItem.displayName}
                </span>
                {droppedItem.dataType && (
                  <span className="text-[8px] text-muted-foreground">
                    {droppedItem.dataType}
                  </span>
                )}
              </div>
            ))
          ) : (
            <span className="text-[9px] text-muted-foreground/50 italic">Drop here...</span>
          )}
          
          {/* Foreign Key Indicator */}
          {node.foreignKeyRef && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 flex-shrink-0 ml-auto">
              <Link className="h-2.5 w-2.5 text-purple-400" />
              <span className="text-[9px] text-purple-400">
                FK → {getFKTargetName()}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons (visible on hover) */}
        <div className="flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity bg-muted/40 border-l border-border">
          {/* Add Child */}
          <button
            onClick={() => onAddChild(node.id)}
            className="p-1 rounded hover:bg-green-500/10 hover:text-green-400 transition-colors"
            title="Add child field"
          >
            <Plus className="h-3 w-3" />
          </button>

          {/* Set as Primary Key */}
          <button
            onClick={() => onSetPrimaryKey(node.id)}
            className={`p-1 rounded transition-colors ${
              node.isPrimaryKey
                ? 'text-orange-400 bg-orange-500/10'
                : 'hover:bg-orange-500/10 hover:text-orange-400'
            }`}
            title="Set as primary key"
          >
            <Key className="h-3 w-3" />
          </button>

          {/* Set Foreign Key */}
          <button
            onClick={() => onSetForeignKey(node.id)}
            className={`p-1 rounded transition-colors ${
              node.foreignKeyRef
                ? 'text-purple-400 bg-purple-500/10'
                : 'hover:bg-purple-500/10 hover:text-purple-400'
            }`}
            title="Define foreign key relationship"
          >
            <Link className="h-3 w-3" />
          </button>

          {/* Remove */}
          <button
            onClick={() => {
              if (confirm(`Remove ${node.displayName} and all its children?`)) {
                onRemove(node.id);
              }
            }}
            className="p-1 rounded hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title="Remove field"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Render Children */}
      {node.isExpanded && hasChildren && (
        <div className="relative">
          {children.map((child, index) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={index === children.length - 1}
              onToggleExpansion={onToggleExpansion}
              onAddChild={onAddChild}
              onRemove={onRemove}
              onSetPrimaryKey={onSetPrimaryKey}
              onSetForeignKey={onSetForeignKey}
              getChildren={getChildren}
              treeNodes={treeNodes}
              onDropItem={onDropItem}
              onRemoveDroppedItem={onRemoveDroppedItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TemplateLayoutPanel() {
  const {
    configuration,
    templates,
    currentTemplateId,
    switchToTemplate,
    deleteTemplate,
    updateTemplateName,
    createNewTemplate,
    addVariableToTable,
    removeVariableFromTable,
    reorderTableColumns,
    updateTablePrimaryKey,
    reorderTemplates,
    addTemplateToLibrary,
    linkTemplateToTable,
    templateLibrary,
  } = useTemplateBuilder();

  // Find the current template
  const currentTemplate = templates.find(t => t.id === currentTemplateId);

  // Get all columns across all tables in the current configuration
  const allColumns = configuration.tables.flatMap(table => table.columns);

  // Dragging state
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Rename template modal
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Save Template to Library modal
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [saveTemplateMode, setSaveTemplateMode] = useState<"new" | "update">("new");
  const [templateLibraryName, setTemplateLibraryName] = useState("");
  const [templateLibraryDescription, setTemplateLibraryDescription] = useState("");
  const [templateLibraryCategory, setTemplateLibraryCategory] = useState<LibraryCategory>("entity");

  // Workflow state
  interface Workflow {
    id: string;
    name: string;
    templateIds: string[];
  }

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [isSaveWorkflowModalOpen, setIsSaveWorkflowModalOpen] = useState(false);
  const [workflowNameInput, setWorkflowNameInput] = useState("");
  const [isWorkflowDropdownOpen, setIsWorkflowDropdownOpen] = useState(false);
  
  // Editor mode - three states: variable, workflow, or template
  const [viewMode, setViewMode] = useState<"variable-editor" | "workflow-editor" | "template-editor">("template-editor");

  // Tree Structure State for Relational Database Design
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [selectedNodeForFK, setSelectedNodeForFK] = useState<string | null>(null);
  const [isFKModalOpen, setIsFKModalOpen] = useState(false);
  const [fkTargetNodeId, setFkTargetNodeId] = useState<string>("");
  const [fkRelationshipType, setFkRelationshipType] = useState<"one-to-one" | "one-to-many" | "many-to-one" | "many-to-many">("many-to-one");

  // Accordion-based Relational Database Designer State
  interface AccordionSection {
    id: string;
    name: string;
    primaryKeyVariableId: string | null;
    templateBlocks: Array<{
      id: string;
      templateLibraryId: string;
      foreignKeyVariableId: string | null;
    }>;
  }

  const [accordionSections, setAccordionSections] = useState<AccordionSection[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState<string>("");

  // Load tree from localStorage on mount
  useEffect(() => {
    const savedTree = localStorage.getItem(`template-tree-${currentTemplateId}`);
    if (savedTree && currentTemplateId) {
      try {
        const parsed = JSON.parse(savedTree);
        setTreeNodes(parsed);
      } catch (e) {
        console.error("Failed to load tree", e);
      }
    }
  }, [currentTemplateId]);

  // Save tree to localStorage whenever it changes
  useEffect(() => {
    if (treeNodes.length > 0 && currentTemplateId) {
      localStorage.setItem(`template-tree-${currentTemplateId}`, JSON.stringify(treeNodes));
    }
  }, [treeNodes, currentTemplateId]);

  // Load accordion sections from localStorage on mount
  useEffect(() => {
    const savedSections = localStorage.getItem(`accordion-sections-${currentTemplateId}`);
    if (savedSections && currentTemplateId) {
      try {
        const parsed = JSON.parse(savedSections);
        setAccordionSections(parsed);
      } catch (e) {
        console.error("Failed to load accordion sections", e);
      }
    } else if (currentTemplateId) {
      // Initialize empty if no saved data
      setAccordionSections([]);
    }
  }, [currentTemplateId]);

  // Save accordion sections to localStorage whenever they change
  useEffect(() => {
    if (currentTemplateId) {
      localStorage.setItem(`accordion-sections-${currentTemplateId}`, JSON.stringify(accordionSections));
    }
  }, [accordionSections, currentTemplateId]);

  // Tree helper functions
  const addNodeToTree = useCallback((variableId: string, parentId: string | null = null) => {
    const variable = configuration.libraryVariables.find(v => v.id === variableId);
    if (!variable) return;

    const newNode: TreeNode = {
      id: `node-${Date.now()}-${Math.random()}`,
      variableId,
      displayName: variable.displayName,
      dataType: variable.dataType,
      systemConcept: variable.systemConcept,
      parentId,
      children: [],
      isExpanded: true,
      isPrimaryKey: false,
      order: 0,
      exampleValue: "",
      dropdownOptions: variable.dropdownOptions,
    };

    setTreeNodes(prev => {
      const updated = [...prev, newNode];
      
      // Update parent's children array
      if (parentId) {
        return updated.map(node => 
          node.id === parentId 
            ? { ...node, children: [...node.children, newNode.id] }
            : node
        );
      }
      
      return updated;
    });

    toast.success(`Added ${variable.displayName} to tree`);
  }, [configuration.libraryVariables]);

  const removeNodeFromTree = useCallback((nodeId: string) => {
    setTreeNodes(prev => {
      const node = prev.find(n => n.id === nodeId);
      if (!node) return prev;

      // Recursively collect all descendant IDs
      const getDescendants = (id: string): string[] => {
        const n = prev.find(x => x.id === id);
        if (!n) return [];
        return [id, ...n.children.flatMap(getDescendants)];
      };

      const idsToRemove = getDescendants(nodeId);
      
      // Remove from parent's children array
      const updated = prev
        .filter(n => !idsToRemove.includes(n.id))
        .map(n => ({
          ...n,
          children: n.children.filter(childId => !idsToRemove.includes(childId))
        }));

      return updated;
    });
  }, []);

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setTreeNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, isExpanded: !node.isExpanded } : node
    ));
  }, []);

  const setPrimaryKey = useCallback((nodeId: string) => {
    setTreeNodes(prev => prev.map(node => ({
      ...node,
      isPrimaryKey: node.id === nodeId
    })));
  }, []);

  const setForeignKey = useCallback((nodeId: string, fkRef: ForeignKeyRelationship | undefined) => {
    setTreeNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, foreignKeyRef: fkRef } : node
    ));
  }, []);

  const getNodeDepth = useCallback((nodeId: string): number => {
    const node = treeNodes.find(n => n.id === nodeId);
    if (!node || !node.parentId) return 0;
    return 1 + getNodeDepth(node.parentId);
  }, [treeNodes]);

  const getRootNodes = useCallback(() => {
    return treeNodes.filter(n => n.parentId === null).sort((a, b) => a.order - b.order);
  }, [treeNodes]);

  const getChildren = useCallback((nodeId: string) => {
    const node = treeNodes.find(n => n.id === nodeId);
    if (!node) return [];
    return node.children
      .map(childId => treeNodes.find(n => n.id === childId))
      .filter((n): n is TreeNode => n !== undefined)
      .sort((a, b) => a.order - b.order);
  }, [treeNodes]);

  // Handle dropping items (variables or templates) into a tree node tray
  const handleDropItem = useCallback((nodeId: string, item: any) => {
    setTreeNodes(prev => prev.map(node => {
      if (node.id !== nodeId) return node;

      const droppedItems = node.droppedItems || [];
      const nextOrder = droppedItems.length;

      let newDroppedItem;
      if (item.variableId) {
        // It's a variable
        newDroppedItem = {
          id: `dropped-${Date.now()}-${Math.random()}`,
          type: "variable" as const,
          variableId: item.variableId,
          displayName: item.variable.displayName,
          dataType: item.variable.dataType,
          order: nextOrder,
        };
      } else if (item.id) {
        // It's a template
        const template = templateLibrary.find(t => t.id === item.id);
        if (!template) return node;
        newDroppedItem = {
          id: `dropped-${Date.now()}-${Math.random()}`,
          type: "template" as const,
          templateId: item.id,
          displayName: template.name,
          order: nextOrder,
        };
      } else {
        return node;
      }

      return {
        ...node,
        droppedItems: [...droppedItems, newDroppedItem],
      };
    }));
    
    toast.success("Item added to tray");
  }, [templateLibrary]);

  // Handle removing a dropped item from a tree node tray
  const handleRemoveDroppedItem = useCallback((nodeId: string, droppedItemId: string) => {
    setTreeNodes(prev => prev.map(node => {
      if (node.id !== nodeId) return node;
      
      const droppedItems = node.droppedItems || [];
      return {
        ...node,
        droppedItems: droppedItems.filter(item => item.id !== droppedItemId),
      };
    }));
  }, []);

  // Load workflows from localStorage on mount
  useEffect(() => {
    const savedWorkflows = localStorage.getItem("template-workflows");
    if (savedWorkflows) {
      try {
        const parsed = JSON.parse(savedWorkflows);
        setWorkflows(parsed);
      } catch (e) {
        console.error("Failed to load workflows", e);
      }
    }
  }, []);

  // Save workflows to localStorage whenever they change
  useEffect(() => {
    if (workflows.length > 0) {
      localStorage.setItem("template-workflows", JSON.stringify(workflows));
    }
  }, [workflows]);

  // Save current templates as a workflow
  const handleSaveWorkflow = () => {
    if (!workflowNameInput.trim() || templates.length === 0) return;

    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: workflowNameInput.trim(),
      templateIds: templates.map(t => t.id),
    };

    setWorkflows(prev => [...prev, newWorkflow]);
    setCurrentWorkflowId(newWorkflow.id);
    setIsSaveWorkflowModalOpen(false);
    setWorkflowNameInput("");
  };

  // Load a workflow (restore all its templates)
  const handleLoadWorkflow = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    setCurrentWorkflowId(workflowId);
    setIsWorkflowDropdownOpen(false);
    
    // Switch to the first template in the workflow
    if (workflow.templateIds.length > 0) {
      const firstTemplateId = workflow.templateIds[0];
      const templateExists = templates.find(t => t.id === firstTemplateId);
      if (templateExists) {
        switchToTemplate(firstTemplateId);
      }
    }
  };

  // Delete a workflow
  const handleDeleteWorkflow = (workflowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow && confirm(`Delete workflow "${workflow.name}"?`)) {
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      if (currentWorkflowId === workflowId) {
        setCurrentWorkflowId(null);
      }
    }
  };

  // Get current workflow name
  const currentWorkflow = workflows.find(w => w.id === currentWorkflowId);

  // Drop zone for variables and templates from VariableLibraryPanel
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ["VARIABLE", "TEMPLATE"],
    drop: (item: { variable?: any; id?: string; type?: string }) => {
      if (!currentTemplate) return;
      
      // If in workflow editor mode, add to tree as root node
      if (viewMode === "workflow-editor") {
        if (item.variable) {
          addNodeToTree(item.variable.id, null);
        }
        return;
      }
      
      // Otherwise use the original behavior for template editor
      if (!configuration.tables[0]) return;
      
      // Check if it's a variable or template
      if (item.variable) {
        // Add variable to the first table of the current template
        addVariableToTable(configuration.tables[0].id, item.variable.id);
      } else if (item.id) {
        // Link template to the first table
        linkTemplateToTable(configuration.tables[0].id, item.id);
        toast.success("Nested template linked successfully!");
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [currentTemplate, configuration.tables, addVariableToTable, linkTemplateToTable, viewMode, addNodeToTree]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, columnId: string, index: number) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedColumnId) return;

    const draggedIndex = allColumns.findIndex(col => col.id === draggedColumnId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedColumnId(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder columns
    const newColumns = [...allColumns];
    const [draggedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(dropIndex, 0, draggedColumn);

    // Since we have a flat list but columns are stored in tables, we need to update all tables
    // For now, we'll consolidate all columns into the first table
    if (configuration.tables.length > 0) {
      reorderTableColumns(configuration.tables[0].id, newColumns);
    }

    setDraggedColumnId(null);
    setDragOverIndex(null);
  };

  // Handle primary key toggle
  const handlePrimaryKeyToggle = (columnId: string) => {
    // Find which table this column belongs to and update its primary key
    const table = configuration.tables.find(t => 
      t.columns.some(col => col.id === columnId)
    );
    
    if (table) {
      const column = table.columns.find(col => col.id === columnId);
      if (column) {
        // Toggle: if this column is already the primary key, clear it; otherwise set it
        const newPrimaryKey = table.primaryKey === column.displayName ? "" : column.displayName;
        updateTablePrimaryKey(table.id, newPrimaryKey);
      }
    }
  };

  // Check if a column is the primary key
  const isPrimaryKey = (columnId: string): boolean => {
    const table = configuration.tables.find(t => 
      t.columns.some(col => col.id === columnId)
    );
    if (!table) return false;
    
    const column = table.columns.find(col => col.id === columnId);
    return column ? table.primaryKey === column.displayName : false;
  };

  // Remove column
  const handleRemoveColumn = (columnId: string) => {
    const table = configuration.tables.find(t => 
      t.columns.some(col => col.id === columnId)
    );
    
    if (table) {
      removeVariableFromTable(table.id, columnId);
    }
  };

  // Update display name
  const handleUpdateDisplayName = (columnId: string, newName: string) => {
    // This would require a new method in the context to update column display name
    // For now, we'll skip this functionality
    console.log("Update display name:", columnId, newName);
  };

  // Handle tab change
  const handleTabChange = (templateId: string) => {
    if (templateId === "new") {
      createNewTemplate();
    } else {
      switchToTemplate(templateId);
    }
  };

  // Handle rename template
  const handleRenameTemplate = () => {
    if (currentTemplateId && renameValue.trim()) {
      updateTemplateName(currentTemplateId, renameValue.trim());
      setIsRenameModalOpen(false);
      setRenameValue("");
    }
  };

  // Handle delete template
  const handleDeleteTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const template = templates.find(t => t.id === templateId);
    if (template && confirm(`Delete template "${template.name}"?`)) {
      deleteTemplate(templateId);
    }
  };

  // Reorder templates
  const handleReorderTemplates = (dragIndex: number, hoverIndex: number) => {
    reorderTemplates(dragIndex, hoverIndex);
  };

  // Handle save template to library
  const handleSaveTemplateToLibrary = () => {
    if (!currentTemplate || !configuration.tables[0] || !templateLibraryName.trim()) return;
    
    addTemplateToLibrary(
      templateLibraryName.trim(),
      templateLibraryDescription.trim() || undefined,
      templateLibraryCategory,
      configuration.tables[0].id
    );
    
    toast.success(`Template "${templateLibraryName.trim()}" saved to library!`);
    
    // Reset modal state
    setIsSaveTemplateModalOpen(false);
    setTemplateLibraryName("");
    setTemplateLibraryDescription("");
    setTemplateLibraryCategory("entity");
  };

  return (
    <>
      <div className="flex flex-col h-full template-layout-panel bg-background">
        {/* Tabs Header */}
        <div className="flex-shrink-0 border-b border-border bg-muted/20 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                {/* Editor Mode Toggle */}
                <div className="flex items-center gap-1.5">
                  {/* Three-State Toggle Button Group */}
                  <Select
                    value={viewMode}
                    onValueChange={(value: "variable-editor" | "workflow-editor" | "template-editor") => setViewMode(value)}
                  >
                    <SelectTrigger className="h-6 w-[160px] text-[10px] bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 text-orange-400 focus:ring-orange-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="variable-editor" className="text-[10px]">
                        Variable Editor
                      </SelectItem>
                      <SelectItem value="workflow-editor" className="text-[10px]">
                        Workflow Editor
                      </SelectItem>
                      <SelectItem value="template-editor" className="text-[10px]">
                        Template Editor
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Workflow Selector - Only visible in Workflow Editor mode */}
                  {viewMode === "workflow-editor" && (
                    <div className="relative">
                      <Button
                        onClick={() => setIsWorkflowDropdownOpen(!isWorkflowDropdownOpen)}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1.5 bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10"
                      >
                        <FolderOpen className="h-3 w-3 text-purple-400" />
                        {currentWorkflow ? currentWorkflow.name : "No Workflow"}
                        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                      </Button>
                    
                    {isWorkflowDropdownOpen && (
                      <div className="absolute left-0 top-8 w-[220px] bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden animate-fadeIn">
                        {/* Save Current Workflow */}
                        <div className="p-2 border-b border-border bg-muted/20">
                          <Button
                            onClick={() => {
                              setIsWorkflowDropdownOpen(false);
                              setIsSaveWorkflowModalOpen(true);
                            }}
                            size="sm"
                            className="w-full h-7 px-2 text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 justify-start gap-1.5"
                            disabled={templates.length === 0}
                          >
                            <Save className="h-3 w-3" />
                            Save Current as Workflow
                          </Button>
                        </div>
                        
                        {/* Workflow List */}
                        <div className="max-h-[240px] overflow-y-auto">
                          {workflows.length === 0 ? (
                            <div className="p-3 text-center">
                              <p className="text-[10px] text-muted-foreground">No saved workflows</p>
                            </div>
                          ) : (
                            workflows.map(workflow => (
                              <div
                                key={workflow.id}
                                className="flex items-center justify-between px-2 py-1.5 hover:bg-muted/30 transition-colors group border-b border-border/50 last:border-0"
                              >
                                <button
                                  onClick={() => handleLoadWorkflow(workflow.id)}
                                  className="flex-1 flex items-center gap-1.5 text-left"
                                >
                                  <FolderOpen className={`h-3 w-3 flex-shrink-0 ${currentWorkflowId === workflow.id ? 'text-purple-400' : 'text-muted-foreground'}`} />
                                  <span className={`text-[10px] font-medium truncate ${currentWorkflowId === workflow.id ? 'text-purple-400' : 'text-foreground'}`}>
                                    {workflow.name}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground">
                                    ({workflow.templateIds.length})
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => handleDeleteWorkflow(workflow.id, e)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded p-1"
                                >
                                  <X className="h-2.5 w-2.5 text-red-400" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                  
                  {/* Action Buttons - Context Aware */}
                  <div className="flex items-center gap-1">
                    {viewMode === "workflow-editor" ? (
                      <>
                        <Button
                          onClick={() => {
                            if (!currentWorkflow) return;
                            const updatedWorkflow = {
                              ...currentWorkflow,
                              templateIds: templates.map(t => t.id),
                            };
                            setWorkflows(prev => prev.map(w => w.id === currentWorkflow.id ? updatedWorkflow : w));
                            toast.success("Workflow updated");
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10 text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Update workflow"
                          disabled={!currentWorkflow}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setIsWorkflowDropdownOpen(false);
                            setIsSaveWorkflowModalOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10 text-purple-400 disabled:opacity-50"
                          title="Save as new workflow"
                          disabled={templates.length === 0}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save as New
                        </Button>
                        <Button
                          onClick={() => createNewTemplate()}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 text-blue-400"
                          title="Create new template"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create New
                        </Button>
                      </>
                    ) : viewMode === "variable-editor" ? (
                      <>
                        <Button
                          onClick={() => {
                            // TODO: Implement variable save logic
                            toast.info("Variable save functionality coming soon");
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 text-blue-400"
                          title="Save variable"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            // TODO: Implement variable save as new logic
                            toast.info("Variable save as new functionality coming soon");
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 text-blue-400"
                          title="Save as new variable"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save as New
                        </Button>
                        <Button
                          onClick={() => {
                            // TODO: Implement create new variable logic
                            toast.info("Create new variable functionality coming soon");
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-green-500/5 border-green-500/20 hover:bg-green-500/10 text-green-400"
                          title="Create new variable"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create New
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            setSaveTemplateMode("update");
                            setTemplateLibraryName(currentTemplate?.name || "");
                            setIsSaveTemplateModalOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-green-500/5 border-green-500/20 hover:bg-green-500/10 text-green-400 disabled:opacity-50"
                          title="Save template"
                          disabled={!currentTemplate}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setSaveTemplateMode("new");
                            setTemplateLibraryName("");
                            setTemplateLibraryDescription("");
                            setTemplateLibraryCategory("entity");
                            setIsSaveTemplateModalOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-green-500/5 border-green-500/20 hover:bg-green-500/10 text-green-400 disabled:opacity-50"
                          title="Save as new template"
                          disabled={!currentTemplate}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save as New
                        </Button>
                        <Button
                          onClick={() => createNewTemplate()}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 text-blue-400"
                          title="Create new template"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create New
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-[10px] text-muted-foreground">
                {viewMode === "variable-editor" 
                  ? "Create and manage variables for your templates"
                  : viewMode === "workflow-editor"
                  ? "Design relational database schemas with hierarchical structures"
                  : "Configure column layout for your template"
                }
              </p>
            </div>
            
            {currentTemplate && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setRenameValue(currentTemplate.name);
                    setIsRenameModalOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[10px]"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Rename
                </Button>
              </div>
            )}
          </div>

          {/* Template Tabs */}
          <Tabs 
            value={currentTemplateId || "none"} 
            onValueChange={handleTabChange}
            className="w-full"
          >
            <div className="flex items-center gap-2">
              {/* Add New Template Button */}
              <Button
                onClick={() => createNewTemplate()}
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>

              {/* Scrollable Tabs List */}
              <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                <TabsList className="inline-flex h-8 items-center justify-start rounded-md bg-muted/50 p-1 text-muted-foreground w-auto min-w-full">
                  {templates.map((template, index) => (
                    <DraggableTab
                      key={template.id}
                      template={template}
                      index={index}
                      onDelete={handleDeleteTemplate}
                      onMove={handleReorderTemplates}
                      showDelete={templates.length > 1}
                    />
                  ))}
                  <TabsTrigger
                    value="new"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-[10px] font-medium text-blue-400 hover:bg-blue-500/10 transition-all border border-transparent flex-shrink-0"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    New
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </Tabs>
        </div>

        {/* Main Content Area */}
        <div 
          ref={drop}
          className={`flex-1 overflow-hidden transition-all ${
            isOver && canDrop ? 'bg-blue-500/5 ring-2 ring-blue-500/30 ring-inset' : ''
          }`}
        >
          {viewMode === "variable-editor" ? (
            // Variable Editor - Blank for now
            <div className="h-full flex items-center justify-center bg-background">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                  <Database className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-medium text-sm">Variable Editor</h3>
                <p className="text-[10px] text-muted-foreground max-w-[280px]">
                  Variable configuration interface will be available here
                </p>
              </div>
            </div>
          ) : viewMode === "workflow-editor" ? (
            // Relational Database Tree View
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Instructions */}
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Database className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Relational Database Schema Designer</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Build a hierarchical data structure with parent-child relationships. Drag variables from the left panel to add root tables, 
                        then use the + buttons to add child fields and define foreign key relationships.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tree Structure */}
                {getRootNodes().length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-4">
                      <Database className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="font-medium text-sm mb-1">No tables defined yet</h3>
                    <p className="text-[10px] text-muted-foreground text-center max-w-[280px]">
                      Drag variables from the left panel to create root tables in your schema
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {getRootNodes().map((node, index) => (
                      <TreeNodeComponent
                        key={node.id}
                        node={node}
                        depth={0}
                        isLast={index === getRootNodes().length - 1}
                        onToggleExpansion={toggleNodeExpansion}
                        onAddChild={(parentId) => {
                          // Show a simple prompt to select a variable
                          const variableId = prompt("Enter variable ID to add as child (or drag from left panel):");
                          if (variableId) {
                            addNodeToTree(variableId, parentId);
                          }
                        }}
                        onRemove={removeNodeFromTree}
                        onSetPrimaryKey={setPrimaryKey}
                        onSetForeignKey={(nodeId) => {
                          setSelectedNodeForFK(nodeId);
                          setIsFKModalOpen(true);
                        }}
                        getChildren={getChildren}
                        treeNodes={treeNodes}
                        onDropItem={handleDropItem}
                        onRemoveDroppedItem={handleRemoveDroppedItem}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : viewMode === "template-editor" && (!currentTemplate || allColumns.length === 0) ? (
            <div className="h-full flex flex-col bg-background">
              {/* Accordion Database Designer */}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {accordionSections.length === 0 ? (
                    /* Empty State */
                    <div className={`flex flex-col items-center justify-center min-h-[400px] px-4 py-16 animate-fadeIn ${
                      isOver && canDrop ? 'scale-[0.98]' : ''
                    } transition-transform`}>
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-4 ${
                        isOver && canDrop ? 'scale-110 bg-gradient-to-br from-blue-500/30 to-purple-500/30' : ''
                      } transition-all`}>
                        <Database className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <h3 className="font-medium text-sm mb-1">
                        {isOver && canDrop ? 'Drop to create section' : 'Build your relational database'}
                      </h3>
                      <p className="text-[10px] text-muted-foreground text-center max-w-[280px]">
                        {isOver && canDrop 
                          ? 'Release to create a new database section' 
                          : 'Click "Add Section" below to start building your relational database schema'
                        }
                      </p>
                    </div>
                  ) : (
                    /* Accordion Sections */
                    accordionSections.map((section, sectionIndex) => {
                      const primaryKeyVariable = section.primaryKeyVariableId 
                        ? configuration.libraryVariables.find(v => v.id === section.primaryKeyVariableId)
                        : null;

                      // Create a drop zone for each section using react-dnd
                      const AccordionBarWithDrop = () => {
                        const [{ isOverSection, canDropSection }, dropRef] = useDrop(() => ({
                          accept: "TEMPLATE",
                          drop: (item: { id: string }) => {
                            const template = templateLibrary?.find((t: TemplateLibraryItem) => t.id === item.id);
                            if (!template) return;

                            // Validate FK match if primary key is set
                            if (section.primaryKeyVariableId) {
                              // Check if template has a variable with FK to this section's PK
                              const hasMatchingFK = template.table.columns.some(col => 
                                col.dataType === 'Lookup' || col.variableId === section.primaryKeyVariableId
                              );
                              
                              if (!hasMatchingFK) {
                                toast.error('Template must have a foreign key matching this section\'s primary key');
                                return;
                              }
                            }

                            // Add template block to section
                            setAccordionSections(prev => prev.map(s => 
                              s.id === section.id 
                                ? {
                                    ...s,
                                    templateBlocks: [
                                      ...s.templateBlocks,
                                      {
                                        id: `block-${Date.now()}-${Math.random()}`,
                                        templateLibraryId: item.id,
                                        foreignKeyVariableId: section.primaryKeyVariableId,
                                      }
                                    ]
                                  }
                                : s
                            ));
                            toast.success('Template added to section');
                          },
                          collect: (monitor) => ({
                            isOverSection: !!monitor.isOver(),
                            canDropSection: !!monitor.canDrop(),
                          }),
                        }), [section.id, section.primaryKeyVariableId, templateLibrary]);

                        return (
                          <div
                            ref={dropRef}
                            className={`flex items-center gap-1 px-2 py-1 bg-muted/30 border border-border rounded hover:bg-muted/50 transition-colors ${
                              isOverSection && canDropSection ? 'bg-blue-500/10 border-blue-500/50' : ''
                            }`}
                          >
                            {/* Section Name */}
                            <div className="flex items-center gap-1 min-w-0">
                              {editingSectionId === section.id ? (
                                <Input
                                  value={editingSectionName}
                                  onChange={(e) => setEditingSectionName(e.target.value)}
                                  onBlur={() => {
                                    if (editingSectionName.trim()) {
                                      setAccordionSections(prev => prev.map(s =>
                                        s.id === section.id ? { ...s, name: editingSectionName.trim() } : s
                                      ));
                                    }
                                    setEditingSectionId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="h-5 px-1 text-[10px] border-blue-500/50"
                                  autoFocus
                                />
                              ) : (
                                <span className="text-[10px] font-medium truncate">{section.name}</span>
                              )}
                              <button
                                onClick={() => {
                                  setEditingSectionId(section.id);
                                  setEditingSectionName(section.name);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Pencil className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                              </button>
                            </div>

                            {/* Primary Key Selector */}
                            <div className="flex items-center gap-1 ml-2">
                              <Key className="h-2.5 w-2.5 text-yellow-400" />
                              <Select
                                value={section.primaryKeyVariableId || ""}
                                onValueChange={(value) => {
                                  setAccordionSections(prev => prev.map(s =>
                                    s.id === section.id ? { ...s, primaryKeyVariableId: value || null } : s
                                  ));
                                }}
                              >
                                <SelectTrigger className="h-5 w-[120px] text-[9px] border-yellow-500/20 bg-yellow-500/5">
                                  <SelectValue placeholder="Set PK..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {configuration.libraryVariables.map(v => (
                                    <SelectItem key={v.id} value={v.id} className="text-[9px]">
                                      {v.displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Template Blocks - Horizontal Stack */}
                            <div className="flex-1 min-w-0">
                              <ScrollArea className="w-full" orientation="horizontal">
                                <div className="flex items-center gap-1 px-2">
                                  {section.templateBlocks.map((block) => {
                                    const template = templateLibrary?.find((t: TemplateLibraryItem) => t.id === block.templateLibraryId);
                                    if (!template) return null;

                                    return (
                                      <Tooltip key={block.id}>
                                        <TooltipTrigger asChild>
                                          <div className="relative group/block flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded hover:bg-blue-500/20 transition-colors flex-shrink-0">
                                            <span className="text-[9px] text-blue-400">{template.name}</span>
                                            <Info className="h-2.5 w-2.5 text-blue-400/60" />
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setAccordionSections(prev => prev.map(s =>
                                                  s.id === section.id
                                                    ? {
                                                        ...s,
                                                        templateBlocks: s.templateBlocks.filter(b => b.id !== block.id)
                                                      }
                                                    : s
                                                ));
                                              }}
                                              className="opacity-0 group-hover/block:opacity-100 transition-opacity"
                                            >
                                              <X className="h-2 w-2 text-blue-400 hover:text-red-400" />
                                            </button>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[250px]">
                                          <div className="space-y-1">
                                            <div className="text-[10px]">{template.name}</div>
                                            {template.description && (
                                              <div className="text-[9px] text-muted-foreground">{template.description}</div>
                                            )}
                                            <div className="text-[9px] text-muted-foreground">
                                              {template.table.columns.length} fields
                                            </div>
                                            <div className="text-[9px] text-yellow-400">
                                              PK: {template.table.primaryKey || 'Not set'}
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                  
                                  {/* Drop Zone Indicator */}
                                  {section.templateBlocks.length === 0 && (
                                    <div className="text-[9px] text-muted-foreground/50 italic px-2">
                                      Drop templates here...
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                            </div>

                            {/* Delete Section */}
                            <button
                              onClick={() => {
                                if (confirm(`Delete section "${section.name}"?`)) {
                                  setAccordionSections(prev => prev.filter(s => s.id !== section.id));
                                  toast.success('Section deleted');
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                            >
                              <X className="h-3 w-3 text-muted-foreground hover:text-red-400" />
                            </button>
                          </div>
                        );
                      };

                      return (
                        <div key={section.id} className="group">
                          <AccordionBarWithDrop />
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Add Section Button - Fixed at Bottom */}
              <div className="flex-shrink-0 border-t border-border bg-muted/20 p-2">
                <Button
                  onClick={() => {
                    const newSection: AccordionSection = {
                      id: `section-${Date.now()}`,
                      name: `Section ${accordionSections.length + 1}`,
                      primaryKeyVariableId: null,
                      templateBlocks: [],
                    };
                    setAccordionSections(prev => [...prev, newSection]);
                    toast.success('Section added');
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-[10px] bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Section
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4">
                {/* Save to Library Buttons */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      Save this template to the library for reuse
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setSaveTemplateMode("update");
                        setTemplateLibraryName(currentTemplate?.name || "");
                        setIsSaveTemplateModalOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[10px] bg-green-500/5 border-green-500/20 hover:bg-green-500/10 text-green-400"
                      disabled={allColumns.length === 0}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setSaveTemplateMode("new");
                        setTemplateLibraryName("");
                        setTemplateLibraryDescription("");
                        setTemplateLibraryCategory("entity");
                        setIsSaveTemplateModalOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[10px] bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 text-blue-400"
                      disabled={allColumns.length === 0}
                    >
                      <SaveAll className="h-3 w-3 mr-1" />
                      Save as New
                    </Button>
                  </div>
                </div>

                {/* Column Configuration List */}
                <div className="rounded-md border border-border bg-muted/5 overflow-hidden">
                  {/* Header Row */}
                  <div className="grid grid-cols-[40px_1fr_1fr_120px_40px] gap-3 px-3 py-2.5 bg-muted/30 border-b border-border">
                    <div className="text-[10px] font-medium text-muted-foreground"></div>
                    <div className="text-[10px] font-medium text-muted-foreground">Field</div>
                    <div className="text-[10px] font-medium text-muted-foreground">Display Name</div>
                    <div className="text-[10px] font-medium text-muted-foreground text-center">Primary Key</div>
                    <div className="text-[10px] font-medium text-muted-foreground"></div>
                  </div>

                  {/* Column Rows */}
                  <div className="divide-y divide-border/50">
                    {allColumns.map((column, index) => (
                      <div
                        key={column.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, column.id, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={() => {
                          setDraggedColumnId(null);
                          setDragOverIndex(null);
                        }}
                        className={`grid grid-cols-[40px_1fr_1fr_120px_40px] gap-3 px-3 py-2.5 hover:bg-muted/20 transition-colors group ${
                          draggedColumnId === column.id ? 'opacity-50' : ''
                        } ${dragOverIndex === index ? 'border-t-2 border-blue-500' : ''}`}
                      >
                        {/* Drag Handle */}
                        <div className="flex items-center justify-center cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        </div>

                        {/* Field Name */}
                        <div className="flex items-center">
                          <code className="text-[11px] font-mono text-foreground bg-muted/50 px-2 py-1 rounded">
                            {configuration.libraryVariables.find(v => v.id === column.variableId)?.displayName || column.displayName}
                          </code>
                        </div>

                        {/* Display Name Input */}
                        <div className="flex items-center">
                          <Input
                            value={column.displayName}
                            onChange={(e) => handleUpdateDisplayName(column.id, e.target.value)}
                            className="h-7 text-[11px] bg-background"
                            placeholder="Enter display name"
                          />
                        </div>

                        {/* Primary Key Toggle */}
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={isPrimaryKey(column.id)}
                            onCheckedChange={() => handlePrimaryKeyToggle(column.id)}
                            className="data-[state=checked]:bg-blue-500"
                          />
                        </div>

                        {/* Remove Button */}
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleRemoveColumn(column.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded p-1"
                          >
                            <X className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="mt-4 p-3 rounded-md bg-blue-500/5 border border-blue-500/20">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <span className="text-blue-400 font-medium">Tip:</span> Drag rows to reorder columns. 
                    Only one field can be designated as the Primary Key at a time.
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Rename Template Modal */}
      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Rename Template</DialogTitle>
            <DialogDescription>
              Enter a new name for this template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <label className="text-xs font-medium">Template Name</label>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter template name"
              className="h-9 text-[11px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameValue.trim()) {
                  handleRenameTemplate();
                }
              }}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRenameModalOpen(false);
                setRenameValue("");
              }}
              className="h-8 text-[11px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRenameTemplate}
              disabled={!renameValue.trim()}
              className="h-8 text-[11px] bg-blue-500 hover:bg-blue-600"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Workflow Modal */}
      <Dialog open={isSaveWorkflowModalOpen} onOpenChange={setIsSaveWorkflowModalOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Save Workflow</DialogTitle>
            <DialogDescription>
              Enter a name for this workflow
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <label className="text-xs font-medium">Workflow Name</label>
            <Input
              value={workflowNameInput}
              onChange={(e) => setWorkflowNameInput(e.target.value)}
              placeholder="Enter workflow name"
              className="h-9 text-[11px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && workflowNameInput.trim()) {
                  handleSaveWorkflow();
                }
              }}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSaveWorkflowModalOpen(false);
                setWorkflowNameInput("");
              }}
              className="h-8 text-[11px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveWorkflow}
              disabled={!workflowNameInput.trim()}
              className="h-8 text-[11px] bg-blue-500 hover:bg-blue-600"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template to Library Modal */}
      <Dialog open={isSaveTemplateModalOpen} onOpenChange={setIsSaveTemplateModalOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {saveTemplateMode === "new" ? "Save Template to Library" : "Save Template"}
            </DialogTitle>
            <DialogDescription>
              {saveTemplateMode === "new" 
                ? "Save this template configuration to your library for reuse across projects"
                : "Update the template in your library"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Name */}
            <div className="space-y-2">
              <label className="text-xs font-medium">Template Name</label>
              <Input
                value={templateLibraryName}
                onChange={(e) => setTemplateLibraryName(e.target.value)}
                placeholder="e.g., Corporate Entity Structure"
                className="h-9 text-[11px]"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={templateLibraryDescription}
                onChange={(e) => setTemplateLibraryDescription(e.target.value)}
                placeholder="Brief description of this template"
                className="h-9 text-[11px]"
              />
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "entity" as LibraryCategory, label: "Entity", color: "blue" },
                  { value: "asset" as LibraryCategory, label: "Asset", color: "emerald" },
                  { value: "contract" as LibraryCategory, label: "Contract", color: "purple" },
                  { value: "loan" as LibraryCategory, label: "Loan", color: "amber" },
                  { value: "quantitative" as LibraryCategory, label: "Quantitative", color: "cyan" },
                ].map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setTemplateLibraryCategory(cat.value)}
                    className={`px-3 py-2 rounded-md text-[11px] font-medium transition-all border ${
                      templateLibraryCategory === cat.value
                        ? `bg-${cat.color}-500/15 text-${cat.color}-400 border-${cat.color}-500/30`
                        : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields Preview */}
            <div className="space-y-2">
              <label className="text-xs font-medium">
                Fields ({allColumns.length})
              </label>
              <div className="p-2 rounded-md bg-muted/30 border border-border max-h-24 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {allColumns.map((column) => (
                    <span
                      key={column.id}
                      className="px-1.5 py-0.5 rounded text-[9px] bg-background border border-border"
                    >
                      {configuration.libraryVariables.find(v => v.id === column.variableId)?.displayName || column.displayName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSaveTemplateModalOpen(false);
                setTemplateLibraryName("");
                setTemplateLibraryDescription("");
                setTemplateLibraryCategory("entity");
              }}
              className="h-8 text-[11px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTemplateToLibrary}
              disabled={!templateLibraryName.trim()}
              className="h-8 text-[11px] bg-blue-500 hover:bg-blue-600"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              {saveTemplateMode === "new" ? "Save to Library" : "Update Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Foreign Key Relationship Modal */}
      <Dialog open={isFKModalOpen} onOpenChange={setIsFKModalOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Define Foreign Key Relationship</DialogTitle>
            <DialogDescription>
              Configure how this field references another table in your schema
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedNodeForFK && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium">
                    {treeNodes.find(n => n.id === selectedNodeForFK)?.displayName}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium">References Table/Field</label>
              <Select value={fkTargetNodeId} onValueChange={setFkTargetNodeId}>
                <SelectTrigger className="h-9 text-[11px]">
                  <SelectValue placeholder="Select target field..." />
                </SelectTrigger>
                <SelectContent>
                  {treeNodes
                    .filter(n => n.id !== selectedNodeForFK && n.isPrimaryKey)
                    .map(node => (
                      <SelectItem key={node.id} value={node.id} className="text-[11px]">
                        <div className="flex items-center gap-2">
                          <Key className="h-3 w-3 text-yellow-400" />
                          <span>{node.displayName}</span>
                          <span className="text-muted-foreground text-[10px]">
                            ({node.dataType})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  {treeNodes.filter(n => n.isPrimaryKey).length === 0 && (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                      No primary keys defined. Set a field as PK first.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Relationship Type</label>
              <Select 
                value={fkRelationshipType} 
                onValueChange={(value: any) => setFkRelationshipType(value)}
              >
                <SelectTrigger className="h-9 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-to-one" className="text-[11px]">
                    One-to-One (1:1)
                  </SelectItem>
                  <SelectItem value="one-to-many" className="text-[11px]">
                    One-to-Many (1:N)
                  </SelectItem>
                  <SelectItem value="many-to-one" className="text-[11px]">
                    Many-to-One (N:1)
                  </SelectItem>
                  <SelectItem value="many-to-many" className="text-[11px]">
                    Many-to-Many (N:N)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="text-blue-400 font-medium">Info:</span> Foreign keys create 
                relationships between tables. The target field should typically be a Primary Key 
                in another table.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Remove FK
                if (selectedNodeForFK) {
                  setForeignKey(selectedNodeForFK, undefined);
                }
                setIsFKModalOpen(false);
                setFkTargetNodeId("");
              }}
              className="h-8 text-[11px] text-red-400 hover:text-red-400 hover:bg-red-500/10"
            >
              Remove FK
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsFKModalOpen(false);
                setFkTargetNodeId("");
              }}
              className="h-8 text-[11px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (selectedNodeForFK && fkTargetNodeId) {
                  const targetNode = treeNodes.find(n => n.id === fkTargetNodeId);
                  if (targetNode) {
                    setForeignKey(selectedNodeForFK, {
                      targetNodeId: fkTargetNodeId,
                      targetTableName: targetNode.displayName,
                      relationshipType: fkRelationshipType,
                    });
                    toast.success("Foreign key relationship created");
                  }
                }
                setIsFKModalOpen(false);
                setFkTargetNodeId("");
              }}
              disabled={!fkTargetNodeId}
              className="h-8 text-[11px] bg-purple-500 hover:bg-purple-600"
            >
              <Link className="h-3.5 w-3.5 mr-1" />
              Create Relationship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}