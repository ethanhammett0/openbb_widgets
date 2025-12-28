import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface SearchFilters {
  status: string[];
  hasComments: boolean;
  isFavorite: boolean;
  fileType: string[];
  dataRichness: string[];
}

interface FileSearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  resultCount?: number;
}

export function FileSearchAndFilter({ 
  searchQuery, 
  onSearchChange, 
  resultCount 
}: FileSearchAndFilterProps) {
  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search files, content, and metadata..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10 bg-background/50 border-border/50 focus:border-border focus:bg-background"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            onClick={() => onSearchChange("")}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Results Count */}
      {searchQuery && resultCount !== undefined && (
        <div className="flex justify-end">
          <div className="text-xs text-muted-foreground">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}