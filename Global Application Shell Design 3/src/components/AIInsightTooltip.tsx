import { useState } from "react";
import { Sparkles, BarChart3, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Progress } from "./ui/progress";

interface AIInsight {
  summary: string;
  confidence: number;
  keyFindings: string[];
  dataRichness: number;
  extractedFields: number;
  totalFields: number;
}

interface AIInsightTooltipProps {
  fileId: string;
  fileName: string;
  status?: "verified" | "needs-review" | "discrepancies";
}

export function AIInsightTooltip({ fileId, fileName, status }: AIInsightTooltipProps) {
  // Mock AI insights data - in a real app, this would come from your AI service
  const getAIInsight = (fileId: string): AIInsight => {
    const insights: Record<string, AIInsight> = {
      "financial-statements": {
        summary: "Q3 2024 financial statements showing 12% revenue growth with strong margin expansion",
        confidence: 92,
        keyFindings: ["Revenue: $45.2M (+12% YoY)", "EBITDA Margin: 23.4%", "Cash Position: Strong"],
        dataRichness: 85,
        extractedFields: 34,
        totalFields: 40
      },
      "cash-flow": {
        summary: "5-year cash flow projections with conservative growth assumptions and seasonal adjustments",
        confidence: 78,
        keyFindings: ["Base Case NPV: $127M", "IRR: 18.5%", "Payback: 4.2 years"],
        dataRichness: 65,
        extractedFields: 26,
        totalFields: 40
      },
      "rent-roll": {
        summary: "Current rent roll showing 94% occupancy with several lease expirations in 2025",
        confidence: 85,
        keyFindings: ["Occupancy: 94%", "Avg Rent: $28.50/sqft", "2025 Expirations: 23%"],
        dataRichness: 90,
        extractedFields: 36,
        totalFields: 40
      },
      "purchase-agreement": {
        summary: "Standard purchase agreement with typical representations and warranties",
        confidence: 95,
        keyFindings: ["Purchase Price: $180M", "Closing: 45 days", "Earnest Money: $5M"],
        dataRichness: 75,
        extractedFields: 30,
        totalFields: 40
      },
      "title-report": {
        summary: "Clean title with no material exceptions or encumbrances identified",
        confidence: 88,
        keyFindings: ["Title: Clear", "Exceptions: None material", "Survey: Current"],
        dataRichness: 70,
        extractedFields: 28,
        totalFields: 40
      }
    };

    return insights[fileId] || {
      summary: "AI analysis in progress - extracting key data points and financial metrics",
      confidence: 45,
      keyFindings: ["Analysis pending..."],
      dataRichness: 25,
      extractedFields: 10,
      totalFields: 40
    };
  };

  const insight = getAIInsight(fileId);

  const getStatusColor = () => {
    switch (status) {
      case "verified": return "text-green-400";
      case "needs-review": return "text-yellow-400";
      case "discrepancies": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "verified": return <CheckCircle className="w-3 h-3" />;
      case "needs-review": return <Clock className="w-3 h-3" />;
      case "discrepancies": return <AlertTriangle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        {/* AI Insight Icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              <Sparkles className="w-3 h-3 text-blue-400 hover:text-blue-300 transition-colors" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm p-4 bg-popover border-border">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium text-foreground">{fileName}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  {insight.confidence}%
                </div>
              </div>

              {/* AI Summary */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {insight.summary}
              </p>

              {/* Key Findings */}
              {insight.keyFindings.length > 0 && insight.keyFindings[0] !== "Analysis pending..." && (
                <div className="space-y-1">
                  <h5 className="text-xs font-medium text-foreground">Key Findings:</h5>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {insight.keyFindings.slice(0, 3).map((finding, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Data Richness Indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              <BarChart3 className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs p-3 bg-popover border-border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Data Richness</span>
                <span className="text-xs text-muted-foreground">{insight.dataRichness}%</span>
              </div>
              <Progress value={insight.dataRichness} className="h-1.5" />
              <div className="text-xs text-muted-foreground">
                {insight.extractedFields} of {insight.totalFields} fields extracted
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Status Indicator */}
        <div className={`${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
      </div>
    </TooltipProvider>
  );
}