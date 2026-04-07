import { useState } from "react";
import { GripVertical, X, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { VariableField } from "./types/VariableTypes";

interface VariableFieldConfigurationProps {
  field: VariableField;
  onUpdate: (updates: Partial<VariableField>) => void;
  onDelete: () => void;
  isDragging?: boolean;
}

export function VariableFieldConfiguration({
  field,
  onUpdate,
  onDelete,
  isDragging = false
}: VariableFieldConfigurationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const dataTypeOptions = [
    "Text", "Number", "Date", "Boolean", "Dropdown", "Multi-select", "Currency", "Percentage"
  ];

  const semanticTypeOptions = [
    "String", "Integer", "Float", "DateTime", "Boolean", "Enum", "Array", "Object"
  ];

  const handleOptionsChange = (optionsText: string) => {
    const options = optionsText
      .split(',')
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    onUpdate({ options });
  };

  return (
    <div className={`
      bg-card border border-border rounded-lg transition-all duration-200
      ${isDragging ? 'shadow-lg ring-2 ring-orange-500/20' : 'hover:bg-card/80'}
    `}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-3 p-3">
          {/* Drag Handle */}
          <div className="cursor-grab hover:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Toggle Switch */}
          <Switch
            checked={field.isEnabled}
            onCheckedChange={(checked) => onUpdate({ isEnabled: checked })}
            className="shrink-0"
          />

          {/* Field Summary */}
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 flex-1 cursor-pointer group">
              <div className="text-foreground group-hover:text-orange-500 transition-colors">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground truncate">
                    {field.name || "Unnamed Field"}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {field.dataType}
                  </span>
                  {field.isRequired && (
                    <span className="text-xs text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {field.systemApiKey || "No API key"}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-4 border-t border-border/50 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Field Name */}
              <div className="space-y-2">
                <Label>Field Name</Label>
                <Input
                  value={field.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="Enter field name"
                />
              </div>

              {/* System/API Key */}
              <div className="space-y-2">
                <Label>System/API Key</Label>
                <Input
                  value={field.systemApiKey}
                  onChange={(e) => onUpdate({ systemApiKey: e.target.value })}
                  placeholder="field_key"
                  className="font-mono text-xs"
                />
              </div>

              {/* Data Type */}
              <div className="space-y-2">
                <Label>Data Type</Label>
                <Select
                  value={field.dataType}
                  onValueChange={(value) => onUpdate({ dataType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataTypeOptions.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Semantic Type */}
              <div className="space-y-2">
                <Label>Semantic Type</Label>
                <Select
                  value={field.semanticType}
                  onValueChange={(value) => onUpdate({ semanticType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {semanticTypeOptions.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Options for Dropdown/Multi-select */}
            {(field.dataType === "Dropdown" || field.dataType === "Multi-select") && (
              <div className="space-y-2">
                <Label>Options (comma separated)</Label>
                <Input
                  value={field.options?.join(', ') || ''}
                  onChange={(e) => handleOptionsChange(e.target.value)}
                  placeholder="Option 1, Option 2, Option 3"
                />
              </div>
            )}

            {/* Definition */}
            <div className="space-y-2">
              <Label>Definition</Label>
              <Textarea
                value={field.definition}
                onChange={(e) => onUpdate({ definition: e.target.value })}
                placeholder="Clear definition of what this field represents"
                className="min-h-[60px] resize-none"
              />
            </div>

            {/* Analytical Considerations */}
            <div className="space-y-2">
              <Label>Analytical Considerations</Label>
              <Textarea
                value={field.analyticalConsiderations}
                onChange={(e) => onUpdate({ analyticalConsiderations: e.target.value })}
                placeholder="How this field impacts analysis, calculations, or decision-making"
                className="min-h-[60px] resize-none"
              />
            </div>

            {/* Additional Options */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={field.isRequired || false}
                  onCheckedChange={(checked) => onUpdate({ isRequired: checked })}
                />
                <Label className="text-sm">Required Field</Label>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}