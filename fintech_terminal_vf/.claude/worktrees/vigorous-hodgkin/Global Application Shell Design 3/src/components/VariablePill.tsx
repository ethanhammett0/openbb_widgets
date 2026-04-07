import { useDrag } from "react-dnd";
import { Type, Calendar, DollarSign, List, Link, X, Table, Pencil, Link2 } from "lucide-react";
import { LibraryVariable, VariableDataType } from "./types/TemplateBuilderTypes";
import { Button } from "./ui/button";

interface VariablePillProps {
  variable: LibraryVariable;
  onEdit?: (id: string) => void;
  onLink?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const dataTypeIcons: Record<VariableDataType, typeof Type> = {
  Text: Type,
  Date: Calendar,
  Currency: DollarSign,
  Dropdown: List,
  Lookup: Link,
  Array: Table,
};

const dataTypeColors: Record<VariableDataType, string> = {
  Text: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  Date: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  Currency: "bg-green-500/10 border-green-500/30 text-green-400",
  Dropdown: "bg-orange-500/10 border-orange-500/30 text-orange-400",
  Lookup: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
  Array: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
};

export function VariablePill({ variable, onEdit, onLink, onDelete }: VariablePillProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "VARIABLE",
    item: { variableId: variable.id, variable },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [variable]);

  const Icon = dataTypeIcons[variable.dataType];
  const colorClass = dataTypeColors[variable.dataType];

  return (
    <div
      ref={drag}
      className={`
        group relative flex items-center gap-2 px-2 py-1.5 rounded border
        ${colorClass}
        ${isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab hover:scale-105"}
        transition-all duration-200
      `}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className="text-xs truncate flex-1">{variable.displayName}</span>
      
      {variable.systemConcept && (
        <div className="flex-shrink-0">
          <Link className="h-2.5 w-2.5 opacity-50" />
        </div>
      )}
      
      {/* Action Icons - Right Side */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {onEdit && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(variable.id);
            }}
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-blue-500/20"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        
        {onLink && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onLink(variable.id);
            }}
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-cyan-500/20"
          >
            <Link2 className="h-3 w-3" />
          </Button>
        )}
        
        {onDelete && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(variable.id);
            }}
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-red-500/20"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}