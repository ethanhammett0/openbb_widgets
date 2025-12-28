import { useState } from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

interface NewsItem {
  id: string;
  timestamp: string;
  source: string;
  headline: string;
  tags: string[];
  priority: "high" | "medium" | "low";
  category: "market" | "deal" | "entity" | "regulatory" | "custom";
}

interface FilterState {
  businessUnits: string[];
  deals: string[];
  entities: string[];
  topics: string[];
  custom: string[];
}

export function NewsFeed() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    businessUnits: true,
    deals: true,
    entities: true,
    topics: true,
    custom: true,
  });
  const [filters, setFilters] = useState<FilterState>({
    businessUnits: [],
    deals: [],
    entities: [],
    topics: [],
    custom: [],
  });

  const newsItems: NewsItem[] = [
    {
      id: "1",
      timestamp: "01:18",
      source: "BBN",
      headline: "Healthcare Properties Trust prices $500M Senior Secured Note offering at 6.25% yield",
      tags: ["HPT"],
      priority: "high",
      category: "market"
    },
    {
      id: "2",
      timestamp: "00:45",
      source: "DWIRE",
      headline: "Midwest Manufacturing Corp misses Q3 earnings estimates by 12%",
      tags: ["MMC"],
      priority: "medium",
      category: "entity"
    },
    {
      id: "3",
      timestamp: "00:23",
      source: "REUTERS",
      headline: "Federal Reserve maintains hawkish stance on inflation outlook",
      tags: ["FED", "MACRO"],
      priority: "high",
      category: "regulatory"
    },
    {
      id: "4",
      timestamp: "23:58",
      source: "WSJ",
      headline: "Regional bank exposure to commercial real estate under scrutiny",
      tags: ["BANKS", "CRE"],
      priority: "high",
      category: "market"
    },
    {
      id: "5",
      timestamp: "23:34",
      source: "FT",
      headline: "Private credit markets see record quarterly inflows of $47B",
      tags: ["CREDIT", "FLOWS"],
      priority: "medium",
      category: "market"
    },
    {
      id: "6",
      timestamp: "22:15",
      source: "BLOOMBERG",
      headline: "Metro Office Tower refinancing delayed due to valuation concerns",
      tags: ["METRO", "REFI"],
      priority: "medium",
      category: "deal"
    },
    {
      id: "7",
      timestamp: "21:47",
      source: "MARKET WATCH",
      headline: "REIT sector sees largest weekly outflows since March banking crisis",
      tags: ["REITS", "FLOWS"],
      priority: "high",
      category: "market"
    },
    {
      id: "8",
      timestamp: "21:23",
      source: "CNBC",
      headline: "Starwood Capital raises $2.1B for opportunistic real estate fund",
      tags: ["STARWOOD", "FUND"],
      priority: "medium",
      category: "entity"
    }
  ];

  const filterOptions = {
    businessUnits: ["Real Estate Capital Markets", "Healthcare Finance", "Technology Lending", "Infrastructure Finance", "Energy & Utilities"],
    deals: ["Metro Office Tower", "Downtown Retail Complex", "Riverside Apartments", "Tech Campus Development", "Healthcare REIT Portfolio"],
    entities: ["BlackRock", "Starwood Capital", "Healthcare Properties Trust", "Midwest Manufacturing Corp", "Regional Banking Corp"],
    topics: ["Federal Reserve", "Commercial Real Estate", "Private Credit", "REIT Sector", "Banking Regulation", "Interest Rates"],
    custom: ["High Priority Only", "My Watchlist", "Deal Pipeline", "Market Alerts", "Regulatory Updates"]
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      businessUnits: [],
      deals: [],
      entities: [],
      topics: [],
      custom: [],
    });
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  return (
    <div className="h-full flex bg-background">
      {/* Left Filter Panel */}
      <div className="w-64 bg-card border-r border-border/50 flex flex-col">
        {/* Filter Header */}
        <div className="px-3 py-2 border-b border-border/30">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-medium text-foreground tracking-wider">FILTERS</h3>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground h-5 px-2 py-1"
              >
                Clear
              </Button>
            )}
          </div>
          
          {/* Active Filter Count */}
          {hasActiveFilters && (
            <div className="text-xs text-orange-400 font-mono">
              {Object.values(filters).flat().length} active
            </div>
          )}
        </div>

        {/* Filter Sections */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {Object.entries(filterOptions).map(([category, options]) => (
              <div key={category}>
                <Collapsible 
                  open={expandedSections[category]} 
                  onOpenChange={() => toggleSection(category)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-xs font-medium text-foreground hover:bg-accent/50 rounded-none border-b border-border/20 hover:border-border transition-all">
                    <span className="capitalize tracking-wide">
                      {category === "businessUnits" ? "Business Units" : category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {filters[category as keyof FilterState].length > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-4 rounded-sm bg-orange-500/20 text-orange-400 border-orange-500/30">
                          {filters[category as keyof FilterState].length}
                        </Badge>
                      )}
                      <ChevronDown className={`h-2.5 w-2.5 transition-transform ${expandedSections[category] ? 'rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1">
                    <div className="space-y-0.5 pl-3 border-l border-border/20 ml-1">
                      {options.map((option) => (
                        <div key={option} className="flex items-center space-x-1.5 py-0.5 hover:bg-accent/30 rounded-sm px-1 -ml-1">
                          <Checkbox
                            id={`${category}-${option}`}
                            checked={filters[category as keyof FilterState].includes(option)}
                            onCheckedChange={() => toggleFilter(category as keyof FilterState, option)}
                            className="h-2.5 w-2.5 border border-border data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                          />
                          <label
                            htmlFor={`${category}-${option}`}
                            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors leading-tight"
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                {category !== "custom" && <div className="h-px bg-border/20 my-1" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right News Feed */}
      <div className="flex-1 flex flex-col">
        {/* Search and Filter Bar */}
        <div className="px-3 py-2 border-b border-border/30 bg-card">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search headlines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm bg-muted/50 border-border/50 focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="h-8 px-3 text-sm border-border/50"
            >
              <Filter className="h-3 w-3 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* News Items */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border/10">
            {newsItems
              .filter(item => 
                searchQuery === "" || 
                item.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center px-3 py-1.5 hover:bg-accent/30 transition-colors cursor-pointer group border-b border-border/10 last:border-b-0"
                >
                  {/* Priority Indicator */}
                  <div className={`w-0.5 h-4 rounded-full mr-2 ${getPriorityColor(item.priority)}`} />
                  
                  {/* Timestamp */}
                  <div className="w-10 text-xs text-yellow-400 font-mono mr-2 flex-shrink-0 leading-none">
                    {item.timestamp}
                  </div>
                  
                  {/* Source */}
                  <div className="w-20 text-xs text-foreground font-medium mr-2 flex-shrink-0 leading-none truncate">
                    {item.source}
                  </div>
                  
                  {/* Headline */}
                  <div className="flex-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors mr-2 leading-tight line-clamp-1">
                    {item.headline}
                  </div>
                  
                  {/* Tags */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    {item.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs px-1 py-0 h-4 leading-none bg-blue-900/50 text-blue-300 border-blue-700/50 rounded-sm"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}