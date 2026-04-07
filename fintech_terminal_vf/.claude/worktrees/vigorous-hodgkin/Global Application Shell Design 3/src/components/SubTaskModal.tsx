import { useState, useEffect, useRef } from "react";
import { X, Upload, FileText, Plus, GripVertical, File, FileSpreadsheet, FileImage, Video, Music, Archive, Code, Pencil } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  taskType: "Action Item" | "Consideration";
  systemPrompt: string;
  files: string[];
}

interface SubTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  editingTask?: Task | null;
}

interface PromptTab {
  id: number;
  name: string;
  content: string;
  files: string[];
}

// File type detection with colors and icons
const getFileTypeInfo = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const typeMap: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    // Documents
    'pdf': { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15', icon: FileText, label: 'PDF' },
    'doc': { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15', icon: FileText, label: 'Word' },
    'docx': { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15', icon: FileText, label: 'Word' },
    'txt': { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30 hover:bg-gray-500/15', icon: FileText, label: 'Text' },
    
    // Spreadsheets
    'xls': { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15', icon: FileSpreadsheet, label: 'Excel' },
    'xlsx': { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15', icon: FileSpreadsheet, label: 'Excel' },
    'csv': { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15', icon: FileSpreadsheet, label: 'CSV' },
    
    // Presentations
    'ppt': { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15', icon: FileText, label: 'PowerPoint' },
    'pptx': { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15', icon: FileText, label: 'PowerPoint' },
    
    // Images
    'jpg': { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15', icon: FileImage, label: 'Image' },
    'jpeg': { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15', icon: FileImage, label: 'Image' },
    'png': { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15', icon: FileImage, label: 'Image' },
    'gif': { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15', icon: FileImage, label: 'Image' },
    'svg': { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15', icon: FileImage, label: 'SVG' },
    
    // Video
    'mp4': { color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/15', icon: Video, label: 'Video' },
    'mov': { color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/15', icon: Video, label: 'Video' },
    'avi': { color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/15', icon: Video, label: 'Video' },
    
    // Audio
    'mp3': { color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/15', icon: Music, label: 'Audio' },
    'wav': { color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/15', icon: Music, label: 'Audio' },
    
    // Archives
    'zip': { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/15', icon: Archive, label: 'Archive' },
    'rar': { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/15', icon: Archive, label: 'Archive' },
    
    // Code
    'js': { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15', icon: Code, label: 'JavaScript' },
    'ts': { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15', icon: Code, label: 'TypeScript' },
    'py': { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/15', icon: Code, label: 'Python' },
    'json': { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15', icon: Code, label: 'JSON' },
  };
  
  return typeMap[ext] || { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30 hover:bg-slate-500/15', icon: File, label: 'File' };
};

// Draggable Tab Component
interface DraggableTabProps {
  tab: PromptTab;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
  onRename: (newName: string) => void;
  moveTab: (dragIndex: number, hoverIndex: number) => void;
}

function DraggableTab({ tab, index, isActive, onClick, onRemove, onRename, moveTab }: DraggableTabProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tab.name);
  
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'PROMPT_TAB',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [{ isOver }, drop] = useDrop({
    accept: 'PROMPT_TAB',
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      if (dragIndex === hoverIndex) return;
      
      moveTab(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  preview(drop(ref));
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };
  
  const handleSaveName = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    } else {
      setEditName(tab.name);
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditName(tab.name);
      setIsEditing(false);
    }
  };
  
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`group relative flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-all flex-shrink-0 ${
        isActive
          ? "bg-background border-t border-l border-r border-border/40 rounded-t-lg z-10 shadow-sm"
          : "bg-muted/30 hover:bg-muted/50 rounded-t-lg border border-transparent"
      } ${isDragging ? 'opacity-50' : ''} ${isOver ? 'bg-blue-500/10' : ''}`}
      style={{
        minWidth: "120px",
        maxWidth: "200px",
      }}
    >
      <div
        ref={drag}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={handleKeyDown}
          className="flex-1 text-[11px] bg-background border border-border/40 rounded px-1 py-0.5 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <span className="text-[11px] text-foreground/90 truncate flex-1 font-medium">
            {tab.name}
            {tab.files.length > 0 && (
              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-normal">
                {tab.files.length}
              </span>
            )}
          </span>
          
          <button
            onClick={handleEditClick}
            className="h-4 w-4 flex items-center justify-center opacity-0 group-hover:opacity-70 hover:opacity-100 hover:bg-blue-500/20 hover:text-blue-400 rounded transition-all flex-shrink-0"
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
        </>
      )}
      
      <button
        onClick={onRemove}
        className="h-4 w-4 flex items-center justify-center opacity-0 group-hover:opacity-70 hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 rounded transition-all flex-shrink-0"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function SubTaskModal({ isOpen, onClose, editingTask, onSave }: SubTaskModalProps) {
  const [title, setTitle] = useState(editingTask?.title || "");
  const [taskType, setTaskType] = useState<"Action Item" | "Consideration">(editingTask?.taskType || "Action Item");
  const [isDragging, setIsDragging] = useState(false);
  
  // Multi-tab state for prompts with files per tab
  const [promptTabs, setPromptTabs] = useState<PromptTab[]>([{ id: 1, name: "Prompt 1", content: "", files: [] }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);

  // Get current active tab
  const activeTab = promptTabs.find(tab => tab.id === activeTabId);

  // Update active tab content
  const handlePromptChange = (newContent: string) => {
    setPromptTabs(tabs => 
      tabs.map(tab => 
        tab.id === activeTabId ? { ...tab, content: newContent } : tab
      )
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    // Combine all prompts into one
    const combinedPrompt = promptTabs.map((tab) => 
      tab.content.trim() ? `[${tab.name}]\n${tab.content.trim()}` : ""
    ).filter(Boolean).join("\n\n");

    // Combine all files from all tabs
    const allFiles = promptTabs.flatMap(tab => tab.files);

    const task: Task = {
      id: editingTask?.id || `task-${Date.now()}`,
      title: title.trim(),
      taskType,
      systemPrompt: combinedPrompt || promptTabs.find(tab => tab.id === activeTabId)?.content || "",
      files: allFiles,
    };

    onSave(task);
    handleClose();
  };

  const handleClose = () => {
    setTitle("");
    setTaskType("Action Item");
    setIsDragging(false);
    setPromptTabs([{ id: 1, name: "Prompt 1", content: "", files: [] }]);
    setActiveTabId(1);
    setNextTabId(2);
    onClose();
  };

  const addPromptTab = () => {
    const newTab: PromptTab = { id: nextTabId, name: `Prompt ${nextTabId}`, content: "", files: [] };
    setPromptTabs([...promptTabs, newTab]);
    setActiveTabId(nextTabId);
    setNextTabId(nextTabId + 1);
  };

  const removePromptTab = (tabId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (promptTabs.length === 1) {
      toast.error("You must have at least one prompt");
      return;
    }
    
    const newTabs = promptTabs.filter(tab => tab.id !== tabId);
    setPromptTabs(newTabs);
    
    // If removing active tab, switch to first available tab
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const renameTab = (tabId: number, newName: string) => {
    setPromptTabs(tabs =>
      tabs.map(tab =>
        tab.id === tabId ? { ...tab, name: newName } : tab
      )
    );
  };

  const moveTab = (dragIndex: number, hoverIndex: number) => {
    const dragTab = promptTabs[dragIndex];
    const newTabs = [...promptTabs];
    newTabs.splice(dragIndex, 1);
    newTabs.splice(hoverIndex, 0, dragTab);
    setPromptTabs(newTabs);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (uploadedFiles && uploadedFiles.length > 0) {
      const fileNames = Array.from(uploadedFiles).map(f => f.name);
      
      // Add files to the active tab
      setPromptTabs(tabs =>
        tabs.map(tab =>
          tab.id === activeTabId
            ? { ...tab, files: [...tab.files, ...fileNames] }
            : tab
        )
      );
      
      toast.success(`${uploadedFiles.length} file(s) added`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set to false if leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const fileNames = Array.from(droppedFiles).map(f => f.name);
      
      // Add files to the active tab
      setPromptTabs(tabs =>
        tabs.map(tab =>
          tab.id === activeTabId
            ? { ...tab, files: [...tab.files, ...fileNames] }
            : tab
        )
      );
      
      toast.success(`${droppedFiles.length} file(s) added`);
    }
  };

  const removeFile = (index: number) => {
    setPromptTabs(tabs =>
      tabs.map(tab =>
        tab.id === activeTabId
          ? { ...tab, files: tab.files.filter((_, idx) => idx !== index) }
          : tab
      )
    );
    toast.success("File removed");
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[85vw] !max-w-[85vw] p-0 gap-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-muted/10">
            <div>
              <DialogTitle className="text-sm">
                {editingTask ? "Edit Sub-Task" : "Create New Sub-Task"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {editingTask ? "Update task details and configuration" : "Define a new task for this stage"}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-7 w-7 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-xs text-foreground/90 font-medium">Task Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs"
                placeholder="e.g., Review Financial Statements"
                autoFocus
              />
            </div>

            {/* Task Type */}
            <div className="space-y-2">
              <Label className="text-xs text-foreground/90 font-medium">Task Type</Label>
              <Select value={taskType} onValueChange={(value: "Action Item" | "Consideration") => setTaskType(value)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Action Item" className="text-xs">Action Item</SelectItem>
                  <SelectItem value="Consideration" className="text-xs">Consideration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* System Prompt with Attached Files */}
            <div className="space-y-2">
              <Label className="text-xs text-foreground/90 font-medium">Task Prompt & Knowledge Files</Label>
              
              {/* Chrome-style Tabs */}
              <div className="flex items-end gap-0.5 border-b border-border/40 -mb-[1px] relative max-w-full bg-muted/20 rounded-t-lg px-2 pt-2 overflow-hidden">
                <div className="flex items-end gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent flex-1 min-w-0 pb-1">
                  {promptTabs.map((tab, index) => (
                    <DraggableTab
                      key={tab.id}
                      tab={tab}
                      index={index}
                      isActive={activeTabId === tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      onRemove={(e) => removePromptTab(tab.id, e)}
                      onRename={(newName) => renameTab(tab.id, newName)}
                      moveTab={moveTab}
                    />
                  ))}
                </div>
                <button
                  onClick={addPromptTab}
                  className="flex items-center justify-center h-7 w-7 mb-1 hover:bg-muted/70 rounded transition-all flex-shrink-0 text-muted-foreground hover:text-foreground"
                  title="Add new prompt"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Textarea with attached file drop zone */}
              <div className="relative">
                <Textarea
                  value={activeTab?.content || ""}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  className="min-h-[120px] text-xs resize-none border-t-0 rounded-t-none rounded-b-none border-b-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Describe what should be done for this task..."
                />
                
                {/* Attached File Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed border-t-0 rounded-b-lg transition-all duration-200 ${
                    isDragging
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border/40 bg-muted/10 hover:bg-muted/20"
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  
                  {/* Drop Zone Content */}
                  <div className="px-4 py-3 pointer-events-none">
                    {activeTab && activeTab.files.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
                          <Upload className="h-3 w-3" />
                          <span>Knowledge files ({activeTab.files.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activeTab.files.map((file, idx) => {
                            const fileInfo = getFileTypeInfo(file);
                            const Icon = fileInfo.icon;
                            return (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`h-7 pl-2 pr-1.5 text-[10px] ${fileInfo.bg} ${fileInfo.color} border transition-all pointer-events-auto group/badge cursor-default`}
                              >
                                <Icon className="h-3 w-3 mr-1.5" />
                                <span className="max-w-[200px] truncate">{file}</span>
                                <button
                                  onClick={() => removeFile(idx)}
                                  className="ml-2 hover:text-red-400 transition-colors opacity-60 group-hover/badge:opacity-100"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <Upload className="h-4 w-4 text-muted-foreground/50" />
                        <div className="text-center">
                          <p className="text-xs text-foreground/70">
                            Drop files here or click to browse
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            Add knowledge files for this prompt
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-gradient-to-r from-muted/10 to-muted/30">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 text-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {editingTask ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
}
