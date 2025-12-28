import { useState, useMemo, useRef, useEffect } from "react";
import { X, Search, Users, User, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

interface Person {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: "online" | "offline" | "away";
  avatar?: string;
}

interface ConversationCreationPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateConversation: (participants: Person[], conversationName?: string) => void;
  availablePeople: Person[];
  triggerButton: React.ReactNode;
}

export function ConversationCreationPopover({
  open,
  onOpenChange,
  onCreateConversation,
  availablePeople,
  triggerButton
}: ConversationCreationPopoverProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
  const [conversationName, setConversationName] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isGroupChat = selectedPeople.length > 1;

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return availablePeople;
    
    const query = searchQuery.toLowerCase();
    return availablePeople.filter(
      person =>
        person.name.toLowerCase().includes(query) ||
        person.role.toLowerCase().includes(query)
    );
  }, [searchQuery, availablePeople]);

  const togglePersonSelection = (person: Person) => {
    setSelectedPeople(prev => {
      const isSelected = prev.some(p => p.id === person.id);
      if (isSelected) {
        return prev.filter(p => p.id !== person.id);
      } else {
        return [...prev, person];
      }
    });
  };

  const handleCreate = () => {
    if (selectedPeople.length === 0) return;
    
    onCreateConversation(
      selectedPeople,
      isGroupChat && conversationName.trim() ? conversationName : undefined
    );
    
    // Reset state
    setSelectedPeople([]);
    setConversationName("");
    setSearchQuery("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedPeople([]);
    setConversationName("");
    setSearchQuery("");
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "offline":
        return "bg-muted-foreground/30";
      default:
        return "bg-muted-foreground/30";
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-[#1a1a1a] border-border/50" 
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Prevent closing when clicking on the trigger button
          const target = e.target as HTMLElement;
          if (target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col max-h-[500px]" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border/50 bg-gradient-to-b from-muted/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <Users className="w-3 h-3 text-blue-400" />
              </div>
              <span className="text-xs font-medium">New Conversation</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-5 w-5 p-0 hover:bg-muted/50"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="px-3 py-2 border-b border-border/30 bg-card/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 bg-muted/30 border-border/50 text-xs"
              />
            </div>
          </div>

          {/* Selected People Pills */}
          {selectedPeople.length > 0 && (
            <div className="px-3 py-2 border-b border-border/30 bg-muted/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  SELECTED ({selectedPeople.length})
                </span>
                <button
                  onClick={() => setSelectedPeople([])}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedPeople.map((person) => (
                  <Badge
                    key={person.id}
                    variant="secondary"
                    className="pl-0.5 pr-1.5 py-0.5 gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                  >
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={person.avatar} />
                      <AvatarFallback className="text-[8px] bg-blue-500/20">
                        {person.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px]">{person.name}</span>
                    <button
                      onClick={() => togglePersonSelection(person)}
                      className="ml-0.5 hover:text-foreground transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>

              {/* Group Name Input (only for 2+ participants) */}
              {isGroupChat && (
                <Input
                  placeholder="Group name (optional)"
                  value={conversationName}
                  onChange={(e) => setConversationName(e.target.value)}
                  className="h-7 bg-muted/30 border-border/50 text-xs"
                />
              )}
            </div>
          )}

          {/* People List */}
          <ScrollArea className="flex-1 max-h-72">
            <div className="px-2 py-2 space-y-0.5">
              {filteredPeople.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">No people found</p>
                </div>
              ) : (
                filteredPeople.map((person) => {
                  const isSelected = selectedPeople.some(p => p.id === person.id);
                  
                  return (
                    <button
                      key={person.id}
                      onClick={() => togglePersonSelection(person)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-all text-xs ${
                        isSelected
                          ? "bg-blue-500/10 border border-blue-500/30"
                          : "hover:bg-muted/30 border border-transparent"
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={person.avatar} />
                          <AvatarFallback className="text-[9px] bg-muted">
                            {person.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background ${getStatusColor(person.status)}`} />
                      </div>
                      
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-xs truncate">{person.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {person.role}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/50 bg-gradient-to-t from-muted/10 to-transparent flex items-center justify-between gap-2">
            <div className="text-[10px] text-muted-foreground truncate">
              {selectedPeople.length === 0 ? (
                "Select people"
              ) : selectedPeople.length === 1 ? (
                `DM ${selectedPeople[0].name}`
              ) : (
                `Group (${selectedPeople.length})`
              )}
            </div>
            
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={selectedPeople.length === 0}
              className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isGroupChat ? (
                <>
                  <Users className="w-3 h-3 mr-1" />
                  Create
                </>
              ) : (
                <>
                  <User className="w-3 h-3 mr-1" />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
