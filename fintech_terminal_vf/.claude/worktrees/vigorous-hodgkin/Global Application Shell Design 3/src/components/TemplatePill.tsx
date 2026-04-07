import { useState } from "react";
import { useDrag } from "react-dnd";
import { Table, Edit3, Trash2, Link, MoreVertical, FileText } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { TemplateLibraryItem } from "./types/TemplateBuilderTypes";

interface TemplatePillProps {
  template: TemplateLibraryItem;
  onEdit: (id: string) => void;
  onLink: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TemplatePill({ template, onEdit, onLink, onDelete }: TemplatePillProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getCategoryColor = () => {
    switch (template.category) {
      case "entity":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "asset":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "contract":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "loan":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "quantitative":
        return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-muted/30 text-muted-foreground border-border";
    }
  };

  const getCategoryName = () => {
    switch (template.category) {
      case "entity":
        return "Entity";
      case "asset":
        return "Asset";
      case "contract":
        return "Contract";
      case "loan":
        return "Loan";
      case "quantitative":
        return "Quantitative";
      default:
        return "Unknown";
    }
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "TEMPLATE",
    item: { id: template.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      className="group relative flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card hover:bg-accent/50 hover:border-purple-500/30 transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={drag}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <div className="h-7 w-7 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Table className="h-3.5 w-3.5 text-purple-400" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-medium truncate">{template.name}</span>
          <Badge variant="outline" className={`h-4 px-1.5 text-[9px] ${getCategoryColor()}`}>
            {getCategoryName()}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground">
            {template.table.columns.length} field{template.table.columns.length !== 1 ? 's' : ''}
          </span>
          {template.description && (
            <>
              <span className="text-[9px] text-muted-foreground">•</span>
              <span className="text-[9px] text-muted-foreground truncate max-w-[150px]">
                {template.description}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={`flex-shrink-0 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-purple-500/10"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuItem onClick={() => onLink(template.id)} className="text-[11px]">
              <Link className="h-3.5 w-3.5 mr-2" />
              Link to Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(template.id)} className="text-[11px]">
              <Edit3 className="h-3.5 w-3.5 mr-2" />
              Edit Template
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(template.id)}
              className="text-[11px] text-red-400 focus:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}