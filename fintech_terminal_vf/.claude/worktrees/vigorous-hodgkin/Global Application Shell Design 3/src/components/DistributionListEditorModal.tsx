import { useState, useRef, useEffect } from "react";
import { X, Users, Mail, Plus, Check, Sparkles, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";

interface DistributionList {
  id: string;
  name: string;
  description: string;
  recipientCount: number;
  emails: string[];
}

interface DistributionListEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (list: DistributionList) => void;
  existingList?: DistributionList | null;
  allLists: DistributionList[];
}

export function DistributionListEditorModal({
  isOpen,
  onClose,
  onSave,
  existingList,
  allLists
}: DistributionListEditorModalProps) {
  const [name, setName] = useState(existingList?.name || "");
  const [description, setDescription] = useState(existingList?.description || "");
  
  // Pills for aggregated distribution lists
  const [selectedLists, setSelectedLists] = useState<string[]>(
    existingList?.id ? [] : [] // Don't pre-populate when editing
  );
  const [listInput, setListInput] = useState("");
  const [showListSuggestions, setShowListSuggestions] = useState(false);
  
  // Pills for individual email addresses
  const [emailPills, setEmailPills] = useState<string[]>(existingList?.emails || []);
  const [emailInput, setEmailInput] = useState("");
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  
  // Magnifying glass menu states
  const [showListBrowseMenu, setShowListBrowseMenu] = useState(false);
  const [showEmailBrowseMenu, setShowEmailBrowseMenu] = useState(false);
  
  const listInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Filter available lists (exclude self when editing)
  const availableLists = allLists.filter(list => 
    list.id !== existingList?.id && 
    !selectedLists.includes(list.id)
  );

  // Filter lists based on input
  const filteredLists = availableLists.filter(list =>
    list.name.toLowerCase().includes(listInput.toLowerCase()) ||
    list.description.toLowerCase().includes(listInput.toLowerCase())
  );

  // Mock email suggestions (in real app, these would come from contacts/previous emails)
  const emailSuggestions = [
    "john.doe@example.com",
    "jane.smith@acmecorp.com",
    "investor1@fundgroup.com",
    "contact@dealpartners.com"
  ].filter(email => 
    !emailPills.includes(email) && 
    email.toLowerCase().includes(emailInput.toLowerCase())
  );

  const handleAddList = (listId: string) => {
    if (!selectedLists.includes(listId)) {
      setSelectedLists([...selectedLists, listId]);
      setListInput("");
      setShowListSuggestions(false);
    }
  };

  const handleRemoveList = (listId: string) => {
    setSelectedLists(selectedLists.filter(id => id !== listId));
  };

  const handleAddEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !emailPills.includes(trimmedEmail)) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(trimmedEmail)) {
        setEmailPills([...emailPills, trimmedEmail]);
        setEmailInput("");
        setShowEmailSuggestions(false);
      }
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmailPills(emailPills.filter(e => e !== email));
  };

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddEmail(emailInput);
    } else if (e.key === "Backspace" && emailInput === "" && emailPills.length > 0) {
      // Remove last pill on backspace
      setEmailPills(emailPills.slice(0, -1));
    }
  };

  const handleListInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && listInput === "" && selectedLists.length > 0) {
      setSelectedLists(selectedLists.slice(0, -1));
    }
  };

  const calculateTotalRecipients = () => {
    const listRecipients = selectedLists.reduce((total, listId) => {
      const list = allLists.find(l => l.id === listId);
      return total + (list?.recipientCount || 0);
    }, 0);
    return listRecipients + emailPills.length;
  };

  const handleSave = () => {
    if (!name.trim()) return;

    // Aggregate all emails from selected lists and individual emails
    const aggregatedEmails = [...emailPills];
    selectedLists.forEach(listId => {
      const list = allLists.find(l => l.id === listId);
      if (list) {
        aggregatedEmails.push(...list.emails);
      }
    });

    // Remove duplicates
    const uniqueEmails = Array.from(new Set(aggregatedEmails));

    const newList: DistributionList = {
      id: existingList?.id || `list-${Date.now()}`,
      name,
      description,
      recipientCount: uniqueEmails.length,
      emails: uniqueEmails
    };

    onSave(newList);
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setSelectedLists([]);
    setEmailPills([]);
    setListInput("");
    setEmailInput("");
    onClose();
  };

  // Update state when existingList changes
  useEffect(() => {
    if (existingList) {
      setName(existingList.name);
      setDescription(existingList.description);
      setEmailPills(existingList.emails || []);
    }
  }, [existingList]);

  const getListGradient = (index: number) => {
    const gradients = [
      "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
      "from-purple-500/20 to-pink-500/20 border-purple-500/30",
      "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
      "from-orange-500/20 to-red-500/20 border-orange-500/30",
      "from-indigo-500/20 to-blue-500/20 border-indigo-500/30",
      "from-rose-500/20 to-pink-500/20 border-rose-500/30"
    ];
    return gradients[index % gradients.length];
  };

  // AI Populate handlers
  const handlePopulateLists = () => {
    // AI would suggest most relevant distribution lists based on context
    const suggestedLists = availableLists.slice(0, 2); // Take first 2 as suggestion
    suggestedLists.forEach(list => {
      if (!selectedLists.includes(list.id)) {
        setSelectedLists(prev => [...prev, list.id]);
      }
    });
  };

  const handlePopulateEmails = () => {
    // AI would suggest most likely email recipients based on context
    const suggestedEmails = emailSuggestions.slice(0, 3); // Take first 3 as suggestion
    suggestedEmails.forEach(email => {
      if (!emailPills.includes(email)) {
        setEmailPills(prev => [...prev, email]);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {existingList ? "Edit Distribution List" : "Create Distribution List"}
          </DialogTitle>
          <DialogDescription>
            {existingList 
              ? "Update the distribution list details and recipients."
              : "Aggregate existing lists and add individual email addresses."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* List Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">List Name</label>
            <Input
              placeholder="e.g., Series A Investors, Board Members..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* List Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Textarea
              placeholder="Brief description of this distribution list..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Aggregate Distribution Lists */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Aggregate Distribution Lists (Optional)
              </label>
              <Button
                type="button"
                size="sm"
                onClick={handlePopulateLists}
                disabled={availableLists.length === 0}
                className="h-7 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white border-0"
              >
                <Sparkles className="w-3 h-3 mr-1.5" />
                Populate
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Combine recipients from existing distribution lists
            </div>
            
            <div className="relative">
              <div className="min-h-[42px] max-h-[120px] overflow-y-auto border border-border rounded-lg p-2 pr-8 flex flex-wrap gap-1.5 items-start bg-background focus-within:ring-2 focus-within:ring-ring/20 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50">
                {/* Pills for selected lists */}
                {selectedLists.map((listId, index) => {
                  const list = allLists.find(l => l.id === listId);
                  if (!list) return null;
                  
                  return (
                    <Badge
                      key={listId}
                      variant="secondary"
                      className={`pl-2 pr-1 py-1 gap-1.5 bg-gradient-to-r ${getListGradient(index)} border flex-shrink-0`}
                    >
                      <Users className="w-3 h-3" />
                      <span className="text-[11px]">{list.name}</span>
                      <span className="text-[10px] opacity-60">({list.recipientCount})</span>
                      <button
                        onClick={() => handleRemoveList(listId)}
                        className="ml-0.5 hover:bg-background/20 rounded p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
                
                {/* Input field */}
                <input
                  ref={listInputRef}
                  type="text"
                  value={listInput}
                  onChange={(e) => {
                    setListInput(e.target.value);
                    setShowListSuggestions(true);
                  }}
                  onFocus={() => setShowListSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowListSuggestions(false), 200)}
                  onKeyDown={handleListInputKeyDown}
                  placeholder={selectedLists.length === 0 ? "Search for distribution lists..." : ""}
                  className="flex-1 min-w-[120px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
                />
                
                {/* Magnifying glass icon */}
                <button
                  type="button"
                  onClick={() => setShowListBrowseMenu(!showListBrowseMenu)}
                  onBlur={() => setTimeout(() => setShowListBrowseMenu(false), 200)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent/50 rounded transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Browse menu dropdown */}
              {showListBrowseMenu && availableLists.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover/95 backdrop-blur-xl border border-border rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50 animate-browse-menu-slide-in">
                  <div className="px-3 py-2 border-b border-border bg-muted/50 sticky top-0 backdrop-blur-sm z-10">
                    <span className="text-xs font-medium text-muted-foreground">All Distribution Lists ({availableLists.length})</span>
                  </div>
                  {availableLists.map((list, index) => (
                    <button
                      key={list.id}
                      onClick={() => {
                        handleAddList(list.id);
                        setShowListBrowseMenu(false);
                      }}
                      style={{ animationDelay: `${index * 20}ms` }}
                      className="w-full px-3 py-2 text-left hover:bg-accent/50 flex items-center justify-between gap-2 transition-all duration-200 hover:translate-x-1 animate-browse-menu-item-fade"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{list.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                        {list.recipientCount}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {/* Suggestions dropdown */}
              {showListSuggestions && listInput && filteredLists.length > 0 && !showListBrowseMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50">
                  {filteredLists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => handleAddList(list.id)}
                      className="w-full px-3 py-2 text-left hover:bg-accent/50 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{list.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                        {list.recipientCount}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Individual Email Addresses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Individual Email Addresses (Optional)
              </label>
              <Button
                type="button"
                size="sm"
                onClick={handlePopulateEmails}
                disabled={emailSuggestions.length === 0}
                className="h-7 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white border-0"
              >
                <Sparkles className="w-3 h-3 mr-1.5" />
                Populate
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Add individual recipients by email
            </div>
            
            <div className="relative">
              <div className="min-h-[42px] max-h-[120px] overflow-y-auto border border-border rounded-lg p-2 pr-8 flex flex-wrap gap-1.5 items-start bg-background focus-within:ring-2 focus-within:ring-ring/20 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50">
                {/* Pills for email addresses */}
                {emailPills.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 gap-1.5 bg-gradient-to-r from-slate-500/20 to-gray-500/20 border border-slate-500/30 flex-shrink-0"
                  >
                    <Mail className="w-3 h-3" />
                    <span className="text-[11px]">{email}</span>
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-0.5 hover:bg-background/20 rounded p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                
                {/* Input field */}
                <input
                  ref={emailInputRef}
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setShowEmailSuggestions(true);
                  }}
                  onFocus={() => setShowEmailSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                  onKeyDown={handleEmailInputKeyDown}
                  placeholder={emailPills.length === 0 ? "Type email and press Enter..." : ""}
                  className="flex-1 min-w-[160px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
                />
                
                {/* Magnifying glass icon */}
                <button
                  type="button"
                  onClick={() => setShowEmailBrowseMenu(!showEmailBrowseMenu)}
                  onBlur={() => setTimeout(() => setShowEmailBrowseMenu(false), 200)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent/50 rounded transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Browse menu dropdown - showing all email suggestions */}
              {showEmailBrowseMenu && emailSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover/95 backdrop-blur-xl border border-border rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50 animate-browse-menu-slide-in">
                  <div className="px-3 py-2 border-b border-border bg-muted/50 sticky top-0 backdrop-blur-sm z-10">
                    <span className="text-xs font-medium text-muted-foreground">Suggested Contacts ({emailSuggestions.length})</span>
                  </div>
                  {emailSuggestions.map((email, index) => (
                    <button
                      key={email}
                      onClick={() => {
                        handleAddEmail(email);
                        setShowEmailBrowseMenu(false);
                      }}
                      style={{ animationDelay: `${index * 15}ms` }}
                      className="w-full px-3 py-2 text-left hover:bg-accent/50 flex items-center gap-2 transition-all duration-200 hover:translate-x-1 animate-browse-menu-item-fade"
                    >
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{email}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Email suggestions dropdown */}
              {showEmailSuggestions && emailInput && emailSuggestions.length > 0 && !showEmailBrowseMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50">
                  {emailSuggestions.map((email) => (
                    <button
                      key={email}
                      onClick={() => handleAddEmail(email)}
                      className="w-full px-3 py-2 text-left hover:bg-accent/50 flex items-center gap-2 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Press Enter or comma to add multiple emails
            </div>
          </div>

          {/* Total Recipients Summary */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Total Recipients</span>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {calculateTotalRecipients()} {calculateTotalRecipients() === 1 ? 'recipient' : 'recipients'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={!name.trim() || (selectedLists.length === 0 && emailPills.length === 0)}
          >
            <Check className="w-4 h-4 mr-2" />
            {existingList ? "Update List" : "Create List"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
