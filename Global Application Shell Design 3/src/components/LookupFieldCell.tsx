import { useState } from "react";
import { Link2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "./ui/dialog";
import { Button } from "./ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Badge } from "./ui/badge";
import { TemplateColumnVariable } from "./types/TemplateBuilderTypes";
import { useTemplateBuilder } from "./contexts/TemplateBuilderContext";

interface LookupFieldCellProps {
  column: TemplateColumnVariable;
  tableId: string;
}

export function LookupFieldCell({ column, tableId }: LookupFieldCellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { getVariablesForLookupTable, updateColumnLookupLinks } = useTemplateBuilder();

  // Get the target table from the system concept
  const targetTable = column.systemConcept?.table;
  
  // Get available variables to link to
  const availableVariables = targetTable ? getVariablesForLookupTable(targetTable) : [];
  
  // Get currently linked variables
  const linkedVariableIds = column.lookupLinks || [];
  const linkedVariables = availableVariables.filter(v => linkedVariableIds.includes(v.id));

  const handleToggleLink = (variableId: string) => {
    const isLinked = linkedVariableIds.includes(variableId);
    const newLinks = isLinked
      ? linkedVariableIds.filter(id => id !== variableId)
      : [...linkedVariableIds, variableId];
    
    updateColumnLookupLinks(tableId, column.id, newLinks);
  };

  const handleRemoveLink = (variableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newLinks = linkedVariableIds.filter(id => id !== variableId);
    updateColumnLookupLinks(tableId, column.id, newLinks);
  };

  const filteredVariables = availableVariables.filter(v =>
    v.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full h-full px-3 py-2 text-left hover:bg-muted/30 transition-colors group min-h-[32px] flex items-center"
      >
        {linkedVariables.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {linkedVariables.map(linkedVar => (
              <Badge
                key={linkedVar.id}
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5 h-5 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/50"
              >
                <Link2 className="h-2.5 w-2.5 mr-1" />
                {linkedVar.displayName}
                <button
                  onClick={(e) => handleRemoveLink(linkedVar.id, e)}
                  className="ml-1 hover:text-blue-300 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-blue-400 transition-colors">
            <Link2 className="h-3 w-3" />
            <span className="text-xs italic">Link to {targetTable || "variable"}...</span>
          </div>
        )}
      </button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link to {targetTable} Variables</DialogTitle>
            <DialogDescription>
              Select variables from the {targetTable} table to link to this field
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Current Links */}
            {linkedVariables.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Linked Variables:</div>
                <div className="flex flex-wrap gap-1.5">
                  {linkedVariables.map(linkedVar => (
                    <Badge
                      key={linkedVar.id}
                      variant="secondary"
                      className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 border-blue-500/30"
                    >
                      <Link2 className="h-3 w-3 mr-1" />
                      {linkedVar.displayName}
                      <button
                        onClick={(e) => handleRemoveLink(linkedVar.id, e)}
                        className="ml-1.5 hover:text-blue-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Variable Selector */}
            <div className="border border-border rounded">
              <Command>
                <CommandInput 
                  placeholder={`Search ${targetTable} variables...`}
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="h-9 text-xs"
                />
                <CommandList className="max-h-[240px]">
                  <CommandEmpty className="text-xs py-6 text-center text-muted-foreground">
                    No variables found in {targetTable} table.
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredVariables.map(variable => {
                      const isLinked = linkedVariableIds.includes(variable.id);
                      return (
                        <CommandItem
                          key={variable.id}
                          value={variable.displayName}
                          onSelect={() => handleToggleLink(variable.id)}
                          className="text-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className={`h-4 w-4 rounded border flex items-center justify-center ${
                                isLinked
                                  ? "bg-blue-500 border-blue-500"
                                  : "border-muted-foreground/30"
                              }`}
                            >
                              {isLinked && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div>{variable.displayName}</div>
                              {variable.systemConcept && (
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {variable.systemConcept.path}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {variable.dataType}
                            </Badge>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            {availableVariables.length === 0 && (
              <div className="text-xs text-center text-muted-foreground py-4 border border-dashed border-border rounded">
                No variables available in {targetTable} table yet.
                <br />
                Add variables to that table to create links.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}