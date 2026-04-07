import { useState, useEffect } from "react";
import { Copy, FileText, FileSpreadsheet, File, CheckCircle, Brain, Lightbulb, Tag, Mail, Paperclip } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

interface IngestionZoneProps {
  dealName: string;
  isProcessing?: boolean;
}

interface UploadFile {
  id: string;
  name: string;
  type: string;
  progress: number;
  status: "uploading" | "completed" | "processing";
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  icon: React.ReactNode;
  color: string;
}

export function IngestionZone({ dealName, isProcessing = true }: IngestionZoneProps) {
  const dealEmail = `${dealName.toLowerCase().replace(/\s+/g, '.')}.ingestion@idr.ai`;
  
  // Demo state for active processing
  const [uploadedFiles] = useState<UploadFile[]>([
    { id: "1", name: "CIM_v3_Final.pdf", type: "pdf", progress: 100, status: "completed" },
    { id: "2", name: "Financial_Model.xlsx", type: "xlsx", progress: 85, status: "uploading" },
    { id: "3", name: "Term_Sheet_v4.docx", type: "docx", progress: 100, status: "processing" },
    { id: "4", name: "Market_Analysis.pdf", type: "pdf", progress: 42, status: "uploading" }
  ]);

  const [logEntries, setLogEntries] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: "01:48:55 AM",
      message: "Received 20 files.",
      icon: <CheckCircle className="w-3 h-3" />,
      color: "text-green-400"
    },
    {
      id: "2", 
      timestamp: "01:48:56 AM",
      message: "Processing: 'CIM_v3_Final.pdf'...",
      icon: <Brain className="w-3 h-3" />,
      color: "text-blue-400"
    },
    {
      id: "3",
      timestamp: "01:48:58 AM", 
      message: "Identified as 'Company Overview'. Confidence: 96%.",
      icon: <Lightbulb className="w-3 h-3" />,
      color: "text-yellow-400"
    },
    {
      id: "4",
      timestamp: "01:48:59 AM",
      message: "Extracted Tags: #EBITDA, #Projections, #Q4-2025",
      icon: <Tag className="w-3 h-3" />,
      color: "text-muted-foreground"
    },
    {
      id: "5",
      timestamp: "01:49:01 AM",
      message: "Received email: \"Re: Updated Term Sheet\"",
      icon: <Mail className="w-3 h-3" />,
      color: "text-green-400"
    },
    {
      id: "6",
      timestamp: "01:49:02 AM",
      message: "Found Attachment in email: 'Term_Sheet_v4.docx'. Moving to Review queue.",
      icon: <Paperclip className="w-3 h-3" />,
      color: "text-muted-foreground"
    }
  ]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(dealEmail);
    // TODO: Add toast notification
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-4 h-4 text-red-400" />;
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="w-4 h-4 text-green-400" />;
      case "docx":
      case "doc":
        return <FileText className="w-4 h-4 text-blue-400" />;
      default:
        return <File className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Auto-scroll log entries simulation
  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      const newEntry: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour12: true, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
        message: "Processing next document in queue...",
        icon: <Brain className="w-3 h-3" />,
        color: "text-blue-400"
      };
      
      setLogEntries(prev => [...prev, newEntry]);
    }, 5000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  return (
    <div className="flex h-full flex-col">
      {/* Contextual Header */}
      <div className="flex items-center px-6 py-3 border-b border-border">
        <h1 className="text-lg">Ingestion Zone: {dealName}</h1>
      </div>

      {/* Main Body Layout (Two-Column) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column (Primary Workspace) */}
        <div className="flex-1 flex items-center justify-center p-6">
          {/* Central Drop Zone */}
          <div className="flex-1 max-w-2xl">
            <div className={`border-2 border-dashed rounded-lg p-12 text-center relative overflow-hidden ${
              isProcessing 
                ? 'border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5' 
                : 'border-border'
            }`}>
              {/* Animated background for processing state */}
              {isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 animate-pulse opacity-50" />
              )}
              
              <div className="space-y-4 relative z-10">
                <div className={`text-6xl ${isProcessing ? 'text-blue-400' : 'text-muted-foreground'}`}>
                  {isProcessing ? '⚡' : '📄'}
                </div>
                <div>
                  <h3 className={`text-lg mb-2 ${isProcessing ? 'text-blue-400' : 'text-muted-foreground'}`}>
                    {isProcessing ? 'Processing Files...' : 'Drag & Drop Files Here'}
                  </h3>
                  <p className="text-sm text-muted-foreground/70">
                    {isProcessing ? 'AI is analyzing your documents' : 'Or click to browse and select files'}
                  </p>
                </div>
              </div>

              {/* File Upload Queue */}
              {isProcessing && (
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Upload Queue</span>
                      <Badge variant="secondary" className="text-xs">
                        {uploadedFiles.filter(f => f.status === "completed").length}/{uploadedFiles.length} completed
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                          {getFileIcon(file.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {file.status === "completed" ? "✓" : `${file.progress}%`}
                              </span>
                            </div>
                            <Progress 
                              value={file.progress} 
                              className="h-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="w-80 border-l border-border flex flex-col bg-card">
          {/* Deal Email Section */}
          <div className="p-4 border-b border-border">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Deal Email</h4>
              <div className="flex items-center gap-2 p-2 bg-muted rounded border">
                <span className="text-xs font-mono flex-1 truncate">{dealEmail}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={handleCopyEmail}
                  title="Copy email address"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Forward documents to this email to add them to the deal room.
              </p>
            </div>
          </div>

          {/* Real-Time Feedback Log */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border">
              <h4 className="text-sm font-medium">Processing Log</h4>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {isProcessing ? (
                <div className="h-full overflow-y-auto p-4 space-y-2">
                  {logEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground font-mono shrink-0">
                        [{entry.timestamp}]
                      </span>
                      <span className={entry.color}>{entry.icon}</span>
                      <span className="font-mono leading-relaxed">{entry.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-4">
                  <div className="text-center text-muted-foreground">
                    <div className="text-2xl mb-2">⏳</div>
                    <p className="text-sm">Awaiting file upload...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}