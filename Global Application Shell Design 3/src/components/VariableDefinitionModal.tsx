import { useState } from "react";
import { X, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { VariableDataType, DataModelField, LibraryCategory, DATA_MODEL_FIELDS } from "./types/TemplateBuilderTypes";

interface VariableDefinitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: LibraryCategory;
  onSave: (variable: {
    displayName: string;
    dataType: VariableDataType;
    systemConcept?: DataModelField;
    category: LibraryCategory;
  }) => void;
}

export function VariableDefinitionModal({
  isOpen,
  onClose,
  category,
  onSave,
}: VariableDefinitionModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [dataType, setDataType] = useState<VariableDataType>("Text");
  const [systemConcept, setSystemConcept] = useState<DataModelField | undefined>();
  const [conceptSearchOpen, setConceptSearchOpen] = useState(false);

  const handleSave = () => {
    if (!displayName.trim()) return;

    onSave({
      displayName: displayName.trim(),
      dataType,
      systemConcept,
      category,
    });

    // Reset form
    setDisplayName("");
    setDataType("Text");
    setSystemConcept(undefined);
    onClose();
  };

  const handleCancel = () => {
    setDisplayName("");
    setDataType("Text");
    setSystemConcept(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Define New Variable</DialogTitle>
          <DialogDescription>
            Create a new variable definition for the {category} category
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Display Name */}
          <div className="space-y-1">
            <Label className="text-xs">Display Name *</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Sponsor Legal Name, Property Address"
              className="h-8"
              autoFocus
            />
          </div>

          {/* Data Type */}
          <div className="space-y-1">
            <Label className="text-xs">Data Type *</Label>
            <Select value={dataType} onValueChange={(value) => setDataType(value as VariableDataType)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Text">Text</SelectItem>
                <SelectItem value="Date">Date</SelectItem>
                <SelectItem value="Currency">Currency</SelectItem>
                <SelectItem value="Dropdown">Dropdown</SelectItem>
                <SelectItem value="Lookup">Lookup</SelectItem>
                <SelectItem value="Array">Array (Nested Table)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* System Concept (Link) */}
          <div className="space-y-1">
            <Label className="text-xs">System Concept (Link)</Label>
            <Popover open={conceptSearchOpen} onOpenChange={setConceptSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between h-8 text-xs font-mono"
                >
                  <span className={systemConcept ? "text-foreground" : "text-muted-foreground"}>
                    {systemConcept ? systemConcept.path : "Search data model..."}
                  </span>
                  <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search data model fields..." className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty>No fields found.</CommandEmpty>
                    <CommandGroup heading="Entity Fields">
                      {DATA_MODEL_FIELDS.filter(f => f.table === "Entity").map((field) => (
                        <CommandItem
                          key={field.id}
                          value={field.path}
                          onSelect={() => {
                            setSystemConcept(field);
                            setConceptSearchOpen(false);
                          }}
                          className="text-xs"
                        >
                          <div className="flex-1">
                            <div className="font-mono">{field.path}</div>
                            <div className="text-[10px] text-muted-foreground">{field.description}</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground ml-2">{field.dataType}</div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Asset Fields">
                      {DATA_MODEL_FIELDS.filter(f => f.table === "RealEstateAsset").map((field) => (
                        <CommandItem
                          key={field.id}
                          value={field.path}
                          onSelect={() => {
                            setSystemConcept(field);
                            setConceptSearchOpen(false);
                          }}
                          className="text-xs"
                        >
                          <div className="flex-1">
                            <div className="font-mono">{field.path}</div>
                            <div className="text-[10px] text-muted-foreground">{field.description}</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground ml-2">{field.dataType}</div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Contract Fields">
                      {DATA_MODEL_FIELDS.filter(f => f.table === "Contract").map((field) => (
                        <CommandItem
                          key={field.id}
                          value={field.path}
                          onSelect={() => {
                            setSystemConcept(field);
                            setConceptSearchOpen(false);
                          }}
                          className="text-xs"
                        >
                          <div className="flex-1">
                            <div className="font-mono">{field.path}</div>
                            <div className="text-[10px] text-muted-foreground">{field.description}</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground ml-2">{field.dataType}</div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Loan Fields">
                      {DATA_MODEL_FIELDS.filter(f => f.table === "Loan").map((field) => (
                        <CommandItem
                          key={field.id}
                          value={field.path}
                          onSelect={() => {
                            setSystemConcept(field);
                            setConceptSearchOpen(false);
                          }}
                          className="text-xs"
                        >
                          <div className="flex-1">
                            <div className="font-mono">{field.path}</div>
                            <div className="text-[10px] text-muted-foreground">{field.description}</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground ml-2">{field.dataType}</div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Financial Metrics">
                      {DATA_MODEL_FIELDS.filter(f => f.table === "FinancialMetrics").map((field) => (
                        <CommandItem
                          key={field.id}
                          value={field.path}
                          onSelect={() => {
                            setSystemConcept(field);
                            setConceptSearchOpen(false);
                          }}
                          className="text-xs"
                        >
                          <div className="flex-1">
                            <div className="font-mono">{field.path}</div>
                            <div className="text-[10px] text-muted-foreground">{field.description}</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground ml-2">{field.dataType}</div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {systemConcept && (
              <div className="flex items-center justify-between mt-1 p-2 bg-muted/30 rounded border border-border">
                <div className="text-[10px]">
                  <div className="text-muted-foreground">Linked to:</div>
                  <div className="font-mono">{systemConcept.path}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setSystemConcept(undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!displayName.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Create Variable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}