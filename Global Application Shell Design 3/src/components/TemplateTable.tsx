import { useDrop } from "react-dnd";
import { X, Link2, ChevronDown, Table2 } from "lucide-react";
import { TemplateTable as TemplateTableType, TemplateColumnVariable } from "./types/TemplateBuilderTypes";
import { Button } from "./ui/button";
import { LookupFieldCell } from "./LookupFieldCell";
import { DropdownFieldCell } from "./DropdownFieldCell";
import { ArrayFieldCell } from "./ArrayFieldCell";

interface TemplateTableProps {
  table: TemplateTableType;
  onDropVariable: (variableId: string) => void;
  onRemoveColumn: (columnId: string) => void;
}

export function TemplateTable({ table, onDropVariable, onRemoveColumn }: TemplateTableProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "VARIABLE",
    drop: (item: { variableId: string }) => {
      onDropVariable(item.variableId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [onDropVariable]);

  const hasColumns = table.columns.length > 0;
  const showDropHint = isOver && canDrop;

  // Render specialized cells based on data type
  const renderCell = (column: TemplateColumnVariable, tableId: string) => {
    switch (column.dataType) {
      case "Lookup":
        return <LookupFieldCell column={column} tableId={tableId} />;
      case "Dropdown":
        return <DropdownFieldCell column={column} tableId={tableId} />;
      case "Array":
        return <ArrayFieldCell column={column} tableId={tableId} />;
      default:
        return (
          <div className="px-2 py-1 text-[10px] text-muted-foreground min-h-[24px] flex items-center">
            {column.exampleValue || "—"}
          </div>
        );
    }
  };

  return (
    <div
      ref={drop}
      className={`
        min-h-[60px] border rounded transition-all duration-200 inline-block
        ${showDropHint ? "border-blue-500 bg-blue-500/5" : "border-border bg-background"}
      `}
      style={{ minWidth: '100%' }}
    >
      {/* Table Content */}
      <table className="text-[10px] border-collapse" style={{ width: 'auto', tableLayout: 'auto' }}>
          <thead>
            <tr className="border-b border-border">
              {/* ID Column - Always present */}
              <th className="px-2 py-1 text-left font-medium bg-muted/10 border-r border-border" style={{ minWidth: '80px', width: 'auto' }}>
                <div className="flex items-center gap-1" style={{ whiteSpace: 'nowrap' }}>
                  <span>ID</span>
                </div>
                <div className="text-[9px] text-muted-foreground font-normal mt-0.5">
                  Text
                </div>
              </th>
              {/* Primary Key Column */}
              <th className="px-2 py-1 text-left font-medium bg-muted/10 border-r border-border" style={{ minWidth: '120px', width: 'auto' }}>
                <div className="flex items-center gap-1" style={{ whiteSpace: 'nowrap' }}>
                  <span>{table.primaryKey}</span>
                </div>
                <div className="text-[9px] text-muted-foreground font-normal mt-0.5">
                  Text
                </div>
              </th>
              {/* User-defined columns */}
              {table.columns.map((column) => (
                <th
                  key={column.id}
                  className="px-2 py-1 text-left font-medium bg-muted/10 border-r border-border group relative"
                  style={{ minWidth: '150px', width: 'auto' }}
                >
                  <div className="flex items-center justify-between gap-2" style={{ whiteSpace: 'nowrap' }}>
                    <div className="flex items-center gap-1">
                      {column.dataType === "Lookup" && (
                        <Link2 className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                      )}
                      {column.dataType === "Dropdown" && (
                        <ChevronDown className="h-2.5 w-2.5 text-orange-400 flex-shrink-0" />
                      )}
                      {column.dataType === "Array" && (
                        <Table2 className="h-2.5 w-2.5 text-purple-400 flex-shrink-0" />
                      )}
                      <span>{column.displayName}</span>
                    </div>
                    <Button
                      onClick={() => onRemoveColumn(column.id)}
                      variant="ghost"
                      size="sm"
                      className="h-3.5 w-3.5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </div>
                  <div className="text-[9px] text-muted-foreground font-normal flex items-center gap-1 mt-0.5" style={{ whiteSpace: 'nowrap' }}>
                    {column.dataType}
                    {column.dataType === "Lookup" && column.systemConcept && (
                      <span className="text-blue-400">→ {column.systemConcept.table}</span>
                    )}
                  </div>
                  {column.systemConcept && (
                    <div className="text-[8px] text-blue-400 font-mono font-normal mt-0.5" style={{ whiteSpace: 'nowrap' }}>
                      → {column.systemConcept.path}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Example row 1 with interactive cells */}
            <tr className="border-b border-border/50 hover:bg-muted/5">
              <td className="px-2 py-1 border-r border-border text-[10px] font-mono text-muted-foreground" style={{ whiteSpace: 'nowrap' }}>
                {table.section === "entities_roles" ? "ENT-001" : "001"}
              </td>
              <td className="px-2 py-1 border-r border-border" style={{ whiteSpace: 'nowrap' }}>
                {table.section === "entities_roles" ? "ACME Inc." : "Example Entry"}
              </td>
              {table.columns.map((column) => (
                <td key={column.id} className="border-r border-border p-0" style={{ whiteSpace: 'nowrap' }}>
                  {renderCell(column, table.id)}
                </td>
              ))}
            </tr>
            {/* Example row 2 */}
            <tr className="hover:bg-muted/5">
              <td className="px-2 py-1 border-r border-border text-[10px] font-mono text-muted-foreground" style={{ whiteSpace: 'nowrap' }}>
                {table.section === "entities_roles" ? "ENT-002" : "002"}
              </td>
              <td className="px-2 py-1 border-r border-border text-muted-foreground" style={{ whiteSpace: 'nowrap' }}>
                {table.section === "entities_roles" ? "TechCorp LLC" : "Example Entry 2"}
              </td>
              {table.columns.map((column) => (
                <td key={column.id} className="border-r border-border p-0" style={{ whiteSpace: 'nowrap' }}>
                  {renderCell(column, table.id)}
                </td>
              ))}
            </tr>
            {/* Empty state row if no columns */}
            {!hasColumns && (
              <tr>
                <td colSpan={2} className="px-2 py-4">
                  <div className="text-center">
                    {showDropHint ? (
                      <div className="text-blue-400 text-[10px] animate-pulse">
                        Drop variable here
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-[10px]">
                        Drag variables here to add columns
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
    </div>
  );
}