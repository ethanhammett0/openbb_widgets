import { useState, useRef } from "react";
import { Send, FileText, FileSpreadsheet, GripHorizontal } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  document?: {
    title: string;
    type: "pdf" | "xlsx" | "docx";
    icon: React.ReactNode;
  };
}

interface AIDocumentExplorerProps {
  dealName: string;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="w-4 h-4 text-red-500" />;
    case "xlsx":
      return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    case "docx":
      return <FileText className="w-4 h-4 text-blue-500" />;
    default:
      return <FileText className="w-4 h-4 text-muted-foreground" />;
  }
};

export function AIDocumentExplorer({ dealName }: AIDocumentExplorerProps) {
  const [message, setMessage] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<ChatMessage["document"] | null>(null);
  const [panelHeight, setPanelHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "user",
      content: "Find the latest Term Sheet"
    },
    {
      id: "2", 
      type: "ai",
      content: "I found the most recent term sheet for this deal:",
      document: {
        title: `${dealName} - Term Sheet v4_Final.docx`,
        type: "docx",
        icon: getFileIcon("docx")
      }
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: message
    };

    // Simulate AI response with document
    const aiResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "ai", 
      content: "Here's what I found:",
      document: {
        title: `${dealName} - Q3 2025 Quality of Earnings Report.pdf`,
        type: "pdf",
        icon: getFileIcon("pdf")
      }
    };

    setMessages(prev => [...prev, newUserMessage, aiResponse]);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleViewDocument = (document: ChatMessage["document"]) => {
    setSelectedDocument(document);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startY.current = e.clientY;
    startHeight.current = panelHeight;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const deltaY = startY.current - e.clientY;
    const newHeight = Math.min(Math.max(startHeight.current + deltaY, 200), 800);
    setPanelHeight(newHeight);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={panelRef}
      className="bg-muted/30 border-t border-border/50 relative"
      style={{ height: `${panelHeight}px` }}
    >
      {/* Two-Column Layout */}
      <div className="flex h-full">
        {/* Left Pane: AI Chat Panel (50%) */}
        <div className="flex-1 flex flex-col p-4 bg-[rgb(0,0,0)]">
          {/* Header */}
          <h4 className="text-sm font-medium text-foreground mb-3">AI Document Explorer</h4>
          
          {/* Chat History */}
          <div className="flex-1 bg-background/50 rounded-lg p-3 overflow-y-auto space-y-3 mb-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${msg.type === "user" ? "text-right" : "text-left"}`}>
                  <div className={`inline-block px-3 py-2 rounded-lg text-xs ${
                    msg.type === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {msg.content}
                  </div>
                  
                  {/* Document Result Card */}
                  {msg.document && (
                    <div className="mt-2 p-3 bg-card border border-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {msg.document.icon}
                          <span className="text-xs font-medium truncate">
                            {msg.document.title}
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 text-xs px-2"
                          onClick={() => handleViewDocument(msg.document)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ask for a document or clause..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 h-8 text-xs"
            />
            <Button
              onClick={handleSendMessage}
              size="sm"
              className="h-8 w-8 p-0"
              disabled={!message.trim()}
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-px bg-border"></div>

        {/* Right Pane: Document Preview Panel (50%) */}
        <div className="flex-1 flex flex-col p-4 bg-[rgb(0,0,0)]">
          <h4 className="text-sm font-medium text-foreground mb-3">Document Preview</h4>
          
          <div className="flex-1 bg-background/50 rounded-lg border border-border/50">
            {selectedDocument ? (
              <div className="h-full p-4">
                {/* Document Header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                  {selectedDocument.icon}
                  <span className="text-sm font-medium">{selectedDocument.title}</span>
                </div>
                
                {/* Document Content Preview */}
                <div className="space-y-4 text-xs">
                  {selectedDocument.type === "docx" && (
                    <div className="space-y-3">
                      <div className="text-center text-lg font-medium mb-4">TERM SHEET</div>
                      <div className="space-y-2">
                        <div><strong>Deal Name:</strong> {dealName}</div>
                        <div><strong>Security Type:</strong> Series A Preferred Stock</div>
                        <div><strong>Amount:</strong> $15,000,000</div>
                        <div><strong>Valuation:</strong> $60,000,000 pre-money</div>
                        <div><strong>Lead Investor:</strong> KKR Growth</div>
                        <div><strong>Liquidation Preference:</strong> 1x non-participating</div>
                        <div><strong>Dividend:</strong> 8% cumulative</div>
                        <div><strong>Anti-dilution:</strong> Weighted average broad-based</div>
                      </div>
                    </div>
                  )}
                  
                  {selectedDocument.type === "pdf" && (
                    <div className="space-y-3">
                      <div className="text-center text-lg font-medium mb-4">QUALITY OF EARNINGS REPORT</div>
                      <div className="space-y-2">
                        <div><strong>Company:</strong> {dealName}</div>
                        <div><strong>Period:</strong> Q3 2025</div>
                        <div><strong>Revenue:</strong> $24.5M (normalized)</div>
                        <div><strong>EBITDA:</strong> $8.2M (adjusted)</div>
                        <div><strong>Key Adjustments:</strong></div>
                        <div className="ml-4 space-y-1">
                          <div>• One-time consulting fees: +$450K</div>
                          <div>• Stock compensation: +$320K</div>
                          <div>• Related party transactions: +$180K</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a document from the chat to preview it here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-2 flex items-center justify-center cursor-ns-resize hover:bg-accent/50 transition-colors group"
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
      </div>
    </div>
  );
}