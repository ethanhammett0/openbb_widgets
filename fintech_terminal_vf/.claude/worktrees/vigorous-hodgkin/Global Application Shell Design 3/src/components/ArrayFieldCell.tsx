import { useState } from "react";
import { Table2, Plus, X, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "./ui/dialog";
import { Button } from "./ui/button";
import { TemplateColumnVariable } from "./types/TemplateBuilderTypes";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface ArrayFieldCellProps {
  column: TemplateColumnVariable;
  tableId: string;
}

interface FinancialRecord {
  id: string;
  statement_date: string;
  filing_period: string;
  metrics: string[];
}

const FILING_PERIOD_OPTIONS = [
  "Q1 2024",
  "Q2 2024", 
  "Q3 2024",
  "Q4 2024",
  "Annual 2024",
  "Q1 2025",
  "Q2 2025",
];

const SAMPLE_METRICS = [
  "Revenue",
  "Net Income",
  "EBITDA",
  "Total Assets",
  "Total Liabilities",
  "Cash Flow",
];

export function ArrayFieldCell({ column, tableId }: ArrayFieldCellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [records, setRecords] = useState<FinancialRecord[]>([
    {
      id: "rec-1",
      statement_date: "2024-12-31",
      filing_period: "Q4 2024",
      metrics: ["Revenue", "Net Income", "EBITDA"],
    },
    {
      id: "rec-2",
      statement_date: "2024-09-30",
      filing_period: "Q3 2024",
      metrics: ["Revenue", "Total Assets"],
    },
  ]);

  const [newRecord, setNewRecord] = useState<Partial<FinancialRecord>>({
    statement_date: "",
    filing_period: "",
    metrics: [],
  });
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleAddRecord = () => {
    if (newRecord.statement_date && newRecord.filing_period) {
      setRecords([
        ...records,
        {
          id: `rec-${Date.now()}`,
          statement_date: newRecord.statement_date,
          filing_period: newRecord.filing_period,
          metrics: newRecord.metrics || [],
        },
      ]);
      setNewRecord({ statement_date: "", filing_period: "", metrics: [] });
      setIsAddingNew(false);
    }
  };

  const handleRemoveRecord = (id: string) => {
    setRecords(records.filter((r) => r.id !== id));
  };

  const handleToggleMetric = (recordId: string, metric: string) => {
    setRecords(
      records.map((r) => {
        if (r.id === recordId) {
          const hasMetric = r.metrics.includes(metric);
          return {
            ...r,
            metrics: hasMetric
              ? r.metrics.filter((m) => m !== metric)
              : [...r.metrics, metric],
          };
        }
        return r;
      })
    );
  };

  const handleToggleNewMetric = (metric: string) => {
    const currentMetrics = newRecord.metrics || [];
    const hasMetric = currentMetrics.includes(metric);
    setNewRecord({
      ...newRecord,
      metrics: hasMetric
        ? currentMetrics.filter((m) => m !== metric)
        : [...currentMetrics, metric],
    });
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full h-full px-3 py-2 text-left hover:bg-muted/30 transition-colors group min-h-[32px] flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Table2 className="h-3 w-3 text-purple-400" />
          <span className="text-xs">
            {records.length} {records.length === 1 ? "record" : "records"}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-400 border-purple-500/30">
          View
        </Badge>
      </button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Financials Data</DialogTitle>
            <DialogDescription>
              Manage financial statements and metrics for this entity
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Records Table */}
            <div className="border border-border rounded">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-3 py-2 text-left font-medium min-w-[120px]">
                      Statement Date
                    </th>
                    <th className="px-3 py-2 text-left font-medium min-w-[120px]">
                      Filing Period
                    </th>
                    <th className="px-3 py-2 text-left font-medium flex-1">
                      Metrics
                    </th>
                    <th className="px-3 py-2 text-right font-medium w-[60px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-border/50 hover:bg-muted/10">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{record.statement_date}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <FilingPeriodDropdown
                          value={record.filing_period}
                          onChange={(value) => {
                            setRecords(
                              records.map((r) =>
                                r.id === record.id ? { ...r, filing_period: value } : r
                              )
                            );
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <MetricsSelector
                          selectedMetrics={record.metrics}
                          onToggleMetric={(metric) =>
                            handleToggleMetric(record.id, metric)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          onClick={() => handleRemoveRecord(record.id)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {/* Add New Record Row */}
                  {isAddingNew ? (
                    <tr className="border-b border-border/50 bg-blue-500/5">
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          value={newRecord.statement_date}
                          onChange={(e) =>
                            setNewRecord({ ...newRecord, statement_date: e.target.value })
                          }
                          className="h-7 text-xs"
                          placeholder="YYYY-MM-DD"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <FilingPeriodDropdown
                          value={newRecord.filing_period || ""}
                          onChange={(value) =>
                            setNewRecord({ ...newRecord, filing_period: value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <MetricsSelector
                          selectedMetrics={newRecord.metrics || []}
                          onToggleMetric={handleToggleNewMetric}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={handleAddRecord}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => {
                              setIsAddingNew(false);
                              setNewRecord({ statement_date: "", filing_period: "", metrics: [] });
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-2">
                        <Button
                          onClick={() => setIsAddingNew(true)}
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs border-dashed hover:bg-blue-500/10 hover:border-blue-500/50"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Financial Record
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Filing Period Dropdown Component
function FilingPeriodDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setCustomValue("");
      setIsCreatingNew(false);
      setIsOpen(false);
    }
  };

  if (isCreatingNew) {
    return (
      <Input
        value={customValue}
        onChange={(e) => setCustomValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreateNew();
          if (e.key === "Escape") {
            setIsCreatingNew(false);
            setCustomValue("");
          }
        }}
        onBlur={() => {
          if (customValue.trim()) {
            handleCreateNew();
          } else {
            setIsCreatingNew(false);
          }
        }}
        autoFocus
        placeholder="e.g., Q1 2025"
        className="h-7 text-xs"
      />
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="text-xs hover:text-foreground transition-colors text-left w-full">
          {value || "Select period..."}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search periods..." className="h-8 text-xs" />
          <CommandList className="max-h-[200px]">
            <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
              No periods found.
            </CommandEmpty>
            <CommandGroup>
              {FILING_PERIOD_OPTIONS.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                  className="text-xs cursor-pointer"
                >
                  {option}
                </CommandItem>
              ))}
              <CommandItem
                onSelect={() => {
                  setIsCreatingNew(true);
                  setIsOpen(false);
                }}
                className="text-xs cursor-pointer border-t border-border mt-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                <Plus className="h-3 w-3 mr-2" />
                Create New Period
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Metrics Selector Component
function MetricsSelector({
  selectedMetrics,
  onToggleMetric,
}: {
  selectedMetrics: string[];
  onToggleMetric: (metric: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="text-left w-full hover:bg-muted/20 rounded px-2 py-1 transition-colors">
          {selectedMetrics.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedMetrics.map((metric) => (
                <Badge
                  key={metric}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 bg-green-500/20 text-green-400 border border-green-500/30"
                >
                  {metric}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">Select metrics...</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search metrics..." className="h-8 text-xs" />
          <CommandList className="max-h-[240px]">
            <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
              No metrics found.
            </CommandEmpty>
            <CommandGroup>
              {SAMPLE_METRICS.map((metric) => {
                const isSelected = selectedMetrics.includes(metric);
                return (
                  <CommandItem
                    key={metric}
                    value={metric}
                    onSelect={() => onToggleMetric(metric)}
                    className="text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center ${
                          isSelected
                            ? "bg-green-500 border-green-500"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span>{metric}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}