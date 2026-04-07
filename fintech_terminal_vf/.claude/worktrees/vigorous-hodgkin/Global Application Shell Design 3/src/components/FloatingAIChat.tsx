import { useState, useRef, useEffect } from "react";
import { Sparkles, Settings, X, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback } from "./ui/avatar";

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  capabilities?: string[];
  data?: {
    currentLTV: string;
    marketAverage: string;
    assessment: string;
  };
}

interface FloatingAIChatProps {
  dealName: string;
  messages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (message: string) => void;
}

// Mock realistic AI responses for different deal analysis scenarios
const generateAIResponse = (userMessage: string, dealName: string): ChatMessage => {
  const lowercaseMessage = userMessage.toLowerCase();
  
  if (lowercaseMessage.includes("ltv") || lowercaseMessage.includes("loan to value")) {
    return {
      id: `ai-${Date.now()}`,
      type: "ai",
      content: `Based on the current deal parameters for ${dealName}:`,
      timestamp: new Date(),
      data: {
        currentLTV: "68.5%",
        marketAverage: "65-75%",
        assessment: "Within Range"
      }
    };
  }
  
  if (lowercaseMessage.includes("debt yield")) {
    return {
      id: `ai-${Date.now()}`,
      type: "ai",
      content: `The debt yield of 8.2% for ${dealName} is above the typical market threshold of 7.5% for similar commercial real estate deals. This indicates strong cash flow coverage and reduced lender risk. The property's current NOI supports this metric well, though I'd recommend monitoring tenant lease expirations over the next 24 months.`,
      timestamp: new Date()
    };
  }
  
  if (lowercaseMessage.includes("risk") || lowercaseMessage.includes("assessment")) {
    return {
      id: `ai-${Date.now()}`,
      type: "ai",
      content: `Key risk factors for ${dealName} include: 1) Market concentration risk with 3 anchor tenants representing 67% of NOI, 2) Environmental compliance costs estimated at $125K for HVAC upgrades, 3) Interest rate sensitivity given floating rate structure. Mitigation strategies include tenant diversification and rate hedging consideration.`,
      timestamp: new Date()
    };
  }
  
  if (lowercaseMessage.includes("market") || lowercaseMessage.includes("comp")) {
    return {
      id: `ai-${Date.now()}`,
      type: "ai",
      content: `Market analysis for ${dealName} shows strong fundamentals: Recent comparable sales in the submarket averaged $285/SF vs. our basis of $267/SF. Cap rates have compressed 15 bps over the past 6 months. The submarket vacancy rate of 4.2% is below the metro average of 6.8%, indicating strong demand dynamics.`,
      timestamp: new Date()
    };
  }
  
  if (lowercaseMessage.includes("cash flow") || lowercaseMessage.includes("noi")) {
    return {
      id: `ai-${Date.now()}`,
      type: "ai",
      content: `Cash flow analysis for ${dealName}: Current NOI of $3.7M represents a 6.8% growth over prior year. Key drivers include 3.2% rent escalations and expense management. Forward 12-month NOI projection of $3.9M assumes 94% stabilized occupancy and minimal CapEx beyond routine maintenance.`,
      timestamp: new Date()
    };
  }
  
  // Default response
  return {
    id: `ai-${Date.now()}`,
    type: "ai",
    content: `I can help you analyze various aspects of ${dealName}. I can provide insights on financial metrics, risk assessment, market comparisons, cash flow analysis, and more. What specific area would you like me to focus on?`,
    timestamp: new Date(),
    capabilities: [
      "Financial metrics analysis (LTV, DSCR, Debt Yield)",
      "Risk assessment and mitigation strategies", 
      "Market comparisons and valuations",
      "Cash flow projections and sensitivities"
    ]
  };
};

export function FloatingAIChat({ dealName, messages, isTyping, onSendMessage }: FloatingAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">

      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col">
      {/* Chat Window */}
      <div className={`bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-4 ${
        isExpanded ? "w-96 h-[600px]" : "w-80 h-96"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-100">AI Assistant</div>
              <div className="text-xs text-gray-400">{dealName}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 bg-gray-800 border-gray-600/50" align="end">
                <div className="p-3 border-b border-gray-700/50">
                  <h4 className="text-sm font-medium text-gray-100">Chat Settings</h4>
                </div>
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">Real-time Analysis</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">Document Context</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">Market Data</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-gray-700/50 text-gray-400 hover:text-red-400"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600/30 hover:scrollbar-thumb-gray-500/50 scrollbar-thumb-rounded-full">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-100">AI Analysis Ready</h3>
                <p className="text-xs text-gray-400 max-w-xs">
                  Ask questions about this deal, request analysis, or get insights.
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-3 opacity-0 animate-in slide-in-from-bottom-2 duration-300 ease-out ${
                message.type === "user" ? "justify-end" : ""
              }`}
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
            >
              {message.type === "ai" && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
              
              <div className={`flex-1 max-w-[85%] ${message.type === "user" ? "flex justify-end" : ""}`}>
                <div
                  className={`inline-block rounded-lg px-3 py-2 transition-all duration-200 ${
                    message.type === "ai"
                      ? "bg-gray-800/90 border border-gray-700/50 text-gray-100"
                      : "bg-blue-600 text-white ml-auto"
                  }`}
                >
                  {message.type === "ai" && message.capabilities ? (
                    <div className="space-y-2">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className="space-y-1">
                        {message.capabilities.map((capability, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs bg-gray-700/40 rounded px-2 py-1"
                          >
                            <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                            <span className="text-gray-200">{capability}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : message.type === "ai" && message.data ? (
                    <div className="space-y-2">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className="bg-gray-900/50 border border-gray-600/30 rounded p-2 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Current LTV:</span>
                          <span className="font-semibold text-orange-400">{message.data.currentLTV}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Market Average:</span>
                          <span className="font-medium text-gray-200">{message.data.marketAverage}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Assessment:</span>
                          <Badge className="text-xs h-4 px-1.5 bg-green-500/20 text-green-300 border-green-500/30">
                            {message.data.assessment}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                </div>
                <div className={`text-xs text-gray-500 mt-1 px-1 ${message.type === "user" ? "text-right" : ""}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {message.type === "user" && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">U</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 opacity-0 animate-in slide-in-from-bottom-2 duration-300 ease-out fill-mode-forwards">
              <div className="flex-shrink-0 mt-1">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white animate-pulse" />
                </div>
              </div>
              <div className="flex-1">
                <div className="inline-block bg-gray-800/90 border border-gray-700/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-300">Analyzing...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>


      </div>
    </div>
  );
}