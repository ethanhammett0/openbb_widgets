import { useState, useRef, useCallback, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { X, Download, Upload, RotateCcw, ChevronDown, Check, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { VariableLibraryPanel } from "./VariableLibraryPanel";
import { TemplateLayoutPanel } from "./TemplateLayoutPanel";
import { useTemplateBuilder } from "./contexts/TemplateBuilderContext";

interface VariableConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VariableConfigurationModal({ isOpen, onClose }: VariableConfigurationModalProps) {
  const {
    configuration,
    templates,
    currentTemplateId,
    saveAsTemplate,
    loadTemplate,
    updateTemplate,
    createNewConfiguration,
    exportConfiguration,
    importConfiguration,
    resetToDefaults,
  } = useTemplateBuilder();

  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [saveAsNewDialogOpen, setSaveAsNewDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  
  // Resizable divider state
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTemplate = currentTemplateId
    ? templates.find((t) => t.id === currentTemplateId)
    : null;

  const handleSaveAsNew = () => {
    if (newTemplateName.trim()) {
      saveAsTemplate(newTemplateName.trim(), newTemplateDescription.trim() || undefined);
      setNewTemplateName("");
      setNewTemplateDescription("");
      setSaveAsNewDialogOpen(false);
    }
  };

  const handleSaveConfiguration = () => {
    if (currentTemplateId) {
      updateTemplate(currentTemplateId);
    } else {
      setSaveAsNewDialogOpen(true);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    loadTemplate(templateId);
    setTemplateSelectorOpen(false);
  };

  const handleNewConfiguration = () => {
    createNewConfiguration();
    setTemplateSelectorOpen(false);
  };

  const handleExport = () => {
    const configJson = exportConfiguration();
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${configuration.name.replace(/\s+/g, "_")}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const configJson = e.target?.result as string;
            importConfiguration(configJson);
          } catch (error) {
            console.error("Failed to import configuration:", error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
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

      // Constrain width between 240px and 480px
      if (newWidth >= 240 && newWidth <= 480) {
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[85vw] !max-w-[85vw] h-[85vh] p-0 gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Template Builder</DialogTitle>
          <DialogDescription className="sr-only">
            Drag-and-drop variable configuration system for creating and managing deal variable templates
          </DialogDescription>
          <DndProvider backend={HTML5Backend}>
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 border-b border-border bg-muted/10">
                {/* Title Row */}
                <div className="flex items-center justify-between px-6 pt-3 pb-2">
                  <h1 className="font-medium">Template Builder</h1>
                  <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between px-6 pb-3">
                  <div className="flex items-center gap-2">
                    {/* Template Selector */}
                    <Popover open={templateSelectorOpen} onOpenChange={setTemplateSelectorOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={templateSelectorOpen}
                          className="w-[280px] justify-between h-7 text-xs text-[14px]"
                        >
                          {currentTemplate ? currentTemplate.name : "Unsaved Configuration"}
                          <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search templates..." className="h-8 text-xs" />
                          <CommandList>
                            <CommandEmpty>No templates found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem onSelect={handleNewConfiguration} className="text-xs">
                                <FileText className="mr-2 h-3 w-3" />
                                New Configuration
                              </CommandItem>
                              {templates.map((template) => (
                                <CommandItem
                                  key={template.id}
                                  value={template.name}
                                  onSelect={() => handleTemplateSelect(template.id)}
                                  className="text-xs"
                                >
                                  <Check
                                    className={`mr-2 h-3 w-3 ${
                                      currentTemplateId === template.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex-1 truncate">
                                    <div>{template.name}</div>
                                    {template.description && (
                                      <div className="text-[10px] text-muted-foreground truncate">
                                        {template.description}
                                      </div>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleImport} className="h-7 text-xs">
                      <Upload className="h-3 w-3 mr-1" />
                      Import
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport} className="h-7 text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetToDefaults} className="h-7 text-xs">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>

              {/* Two-Panel Layout with Resizable Divider */}
              <div className="flex-1 flex overflow-hidden" ref={containerRef}>
                {/* Left Panel - Variable Library */}
                <div className="flex-shrink-0" style={{ width: `${leftPanelWidth}px` }}>
                  <VariableLibraryPanel />
                </div>

                {/* Resizable Divider */}
                <div
                  className="w-1 flex-shrink-0 bg-border hover:bg-orange-500/50 cursor-col-resize transition-colors relative group"
                  onMouseDown={handleMouseDown}
                >
                  <div className="absolute inset-y-0 -left-1 -right-1" />
                </div>

                {/* Right Panel - Template Layout */}
                <div className="flex-1 min-w-0">
                  <TemplateLayoutPanel />
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
                <div className="text-xs text-muted-foreground">
                  {currentTemplate ? (
                    <>
                      Template: {currentTemplate.name} • Last modified:{" "}
                      {configuration.lastModified.toLocaleString()}
                    </>
                  ) : (
                    <>Unsaved Configuration • Last modified: {configuration.lastModified.toLocaleString()}</>
                  )}
                </div>
              </div>
            </div>
          </DndProvider>
        </DialogContent>
      </Dialog>

      {/* Save as New Template Dialog */}
      <AlertDialog open={saveAsNewDialogOpen} onOpenChange={setSaveAsNewDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save as New Template</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new template from the current configuration. This template can be reused across multiple deals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label className="text-xs">Template Name *</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Multifamily Deal Variables"
                className="h-8"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (Optional)</Label>
              <Textarea
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="Brief description of this template's purpose..."
                className="min-h-[60px] text-xs resize-none"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setNewTemplateName("");
                setNewTemplateDescription("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveAsNew}
              disabled={!newTemplateName.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Save Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}