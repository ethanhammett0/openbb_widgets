import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "./ui/button";
import { TaggingInput } from "./TaggingInput";

interface FloatingInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function FloatingInput({ onSendMessage, disabled = false }: FloatingInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    
    onSendMessage(input.trim());
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[25%] min-w-[280px] max-w-[400px]">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-3">
        <div className="relative">
          <TaggingInput
            placeholder="Ask about this deal... (+ for deals/files/folders, @ for people, # for topics, < for tasks)"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="pr-12 resize-none border-border/50 bg-muted/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-lg"
            minHeight={40}
            maxHeight={100}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            size="sm"
            className="absolute right-2 bottom-2 h-7 w-7 p-0 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed z-20"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}