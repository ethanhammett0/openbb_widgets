import { useState, useRef, useEffect } from "react";
import { X, Users, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";

interface Person {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: "online" | "offline" | "away";
}

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateConversation: (participants: Person[], conversationName?: string) => void;
  availablePeople: Person[];
}

export function NewConversationModal({
  open,
  onOpenChange,
  onCreateConversation,
  availablePeople
}: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
  const [groupName, setGroupName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isGroupChat = selectedPeople.length > 1;

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Reset state when modal closes
      setSearchQuery("");
      setSelectedPeople([]);
      setGroupName("");
    }
  }, [open]);

  // Filter people based on search query
  const filteredPeople = availablePeople.filter(person => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      person.name.toLowerCase().includes(query) ||
      person.role.toLowerCase().includes(query)
    );
  }).filter(person => !selectedPeople.some(p => p.id === person.id)); // Exclude already selected

  const handlePersonClick = (person: Person) => {
    setSelectedPeople(prev => [...prev, person]);
    setSearchQuery("");
  };

  const handleRemovePerson = (personId: string) => {
    setSelectedPeople(prev => prev.filter(p => p.id !== personId));
  };

  const handleCreate = () => {
    if (selectedPeople.length === 0) return;
    
    onCreateConversation(
      selectedPeople,
      isGroupChat && groupName.trim() ? groupName : undefined
    );
    
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (filteredPeople.length === 1 && searchQuery) {
        handlePersonClick(filteredPeople[0]);
      } else if (selectedPeople.length > 0 && !searchQuery) {
        handleCreate();
      }
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-border/50 p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-blue-400" />
            </div>
            New Conversation
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create a new conversation by selecting people from your contacts
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-3 space-y-3">
          {/* Search Input with Pills */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Add People</label>
            <div className="min-h-[80px] max-h-32 overflow-y-auto p-2 bg-muted/30 border border-border/50 rounded-md">
              {/* Selected People Pills */}
              {selectedPeople.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedPeople.map((person) => (
                    <Badge
                      key={person.id}
                      variant="secondary"
                      className="pl-0.5 pr-1.5 py-0.5 gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                    >
                      <Avatar className="w-4 h-4">
                        <AvatarFallback className="text-[8px] bg-blue-500/20">
                          {person.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px]">{person.name}</span>
                      <button
                        onClick={() => handleRemovePerson(person.id)}
                        className="ml-0.5 hover:text-foreground transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search Input */}
              <Input
                ref={inputRef}
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-7 bg-background/50 border-0 text-xs focus-visible:ring-1 focus-visible:ring-blue-500/30 px-2"
              />
            </div>
          </div>

          {/* Group Name (for 2+ participants) */}
          {isGroupChat && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Group Name (optional)</label>
              <Input
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="h-8 bg-muted/30 border-border/50 text-xs"
              />
            </div>
          )}

          {/* People Suggestions */}
          {searchQuery && filteredPeople.length > 0 && (
            <ScrollArea className="max-h-48 border border-border/30 rounded-md">
              <div className="p-1 space-y-0.5">
                {filteredPeople.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handlePersonClick(person)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors text-xs"
                  >
                    <div className="relative">
                      <Avatar className="w-6 h-6">
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
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {searchQuery && filteredPeople.length === 0 && (
            <div className="py-8 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No people found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/50 bg-gradient-to-t from-muted/10 to-transparent flex items-center justify-between gap-2">
          <div className="text-[10px] text-muted-foreground truncate">
            {selectedPeople.length === 0 ? (
              "Select people to start"
            ) : selectedPeople.length === 1 ? (
              `DM with ${selectedPeople[0].name}`
            ) : (
              `Group with ${selectedPeople.length} people`
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={selectedPeople.length === 0}
              className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-3 h-3 mr-1" />
              Start
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
