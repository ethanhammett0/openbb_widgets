import { useState } from "react";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { DealsDashboard } from "./components/DealsDashboard";
import { AnalysisZone } from "./components/AnalysisZone";
import { FloatingAIChat } from "./components/FloatingAIChat";
import { FloatingChatWindow } from "./components/FloatingChatWindow";
import { Toaster } from "./components/ui/sonner";


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

export default function App() {
  const [activeView, setActiveView] = useState<"dashboard" | "deals" | "deal-detail">("deals");
  const [selectedDeal, setSelectedDeal] = useState<{ id: string; name: string } | null>(null);
  const [isChatWindowOpen, setIsChatWindowOpen] = useState(false);
  const [dealRoomSection, setDealRoomSection] = useState<"deal-room" | "people" | "topics">("deal-room");
  
  // Global AI chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);

  // AI response generation
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
        content: `The debt yield of 8.2% for ${dealName} is above the typical market threshold of 7.5% for similar commercial real estate deals. This indicates strong cash flow coverage and reduced lender risk.`,
        timestamp: new Date()
      };
    }
    
    if (lowercaseMessage.includes("risk") || lowercaseMessage.includes("assessment")) {
      return {
        id: `ai-${Date.now()}`,
        type: "ai",
        content: `Key risk factors for ${dealName} include: Market concentration risk with 3 anchor tenants, environmental compliance costs, and interest rate sensitivity. Mitigation strategies include tenant diversification and rate hedging.`,
        timestamp: new Date()
      };
    }
    
    // Default response
    return {
      id: `ai-${Date.now()}`,
      type: "ai",
      content: `I can help you analyze various aspects of ${dealName}. I can provide insights on financial metrics, risk assessment, market comparisons, and more. What would you like to focus on?`,
      timestamp: new Date(),
      capabilities: [
        "Financial metrics analysis (LTV, DSCR, Debt Yield)",
        "Risk assessment and mitigation strategies", 
        "Market comparisons and valuations",
        "Cash flow projections and sensitivities"
      ]
    };
  };

  // Handle message sending from floating input
  const handleSendMessage = async (messageContent: string) => {
    if (!selectedDeal) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: messageContent,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsAITyping(true);

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    const aiResponse = generateAIResponse(messageContent, selectedDeal.name);
    setChatMessages(prev => [...prev, aiResponse]);
    setIsAITyping(false);
  };

  const handleDealSelect = (deal: { id: string; name: string }) => {
    setSelectedDeal(deal);
    setActiveView("deal-detail");
    // Clear chat messages when switching to a new deal
    setChatMessages([]);
    setIsAITyping(false);
  };

  const handleBackToDeals = () => {
    setSelectedDeal(null);
    setActiveView("deals");
    // Clear chat messages when leaving deal view
    setChatMessages([]);
    setIsAITyping(false);
  };

  const handleNavigateToDealRoom = () => {
    setDealRoomSection("deal-room");
    // Future: scroll to or focus deal room section
  };

  const handleNavigateToPeople = () => {
    setDealRoomSection("people");
    // Future: scroll to or focus people section
  };

  const handleNavigateToTopics = () => {
    setDealRoomSection("topics");
    // Future: scroll to or focus topics section
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "deals":
        return <DealsDashboard hasDeals={true} onDealSelect={handleDealSelect} />;
      case "deal-detail":
        return selectedDeal ? (
          <AnalysisZone 
            dealName={selectedDeal.name} 
            chatMessages={chatMessages}
            isAITyping={isAITyping}
            onSendMessage={handleSendMessage}
            onBackToDeals={handleBackToDeals}
          />
        ) : <DealsDashboard hasDeals={true} onDealSelect={handleDealSelect} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header 
        activeView={activeView} 
        onViewChange={setActiveView}
        selectedDeal={selectedDeal}
        onBackToDeals={handleBackToDeals}
        onChatToggle={() => setIsChatWindowOpen(!isChatWindowOpen)}
        isChatOpen={isChatWindowOpen}
      />
      
      {/* Main content viewport */}
      <main className="flex flex-col bg-background h-[calc(100vh-52px)]">
        {renderContent()}
      </main>

      {/* Floating Chat Window */}
      {isChatWindowOpen && (
        <FloatingChatWindow 
          onClose={() => setIsChatWindowOpen(false)}
          onNavigateToDealRoom={handleNavigateToDealRoom}
          onNavigateToPeople={handleNavigateToPeople}
          onNavigateToTopics={handleNavigateToTopics}
        />
      )}

      {/* Floating AI Chat - Only show when viewing a deal and chat window is closed */}
      {selectedDeal && activeView === "deal-detail" && !isChatWindowOpen && (
        <FloatingAIChat 
          dealName={selectedDeal.name} 
          messages={chatMessages}
          isTyping={isAITyping}
          onSendMessage={handleSendMessage}
        />
      )}

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}