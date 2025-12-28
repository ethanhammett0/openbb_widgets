import { Building2, File, Folder } from "lucide-react";

interface MessageWithPillsProps {
  content: string;
}

export function MessageWithPills({ content }: MessageWithPillsProps) {
  // Parse message for tags like [@Deal:Name], [+File:Name], [#Folder:Name]
  const parts: Array<{ type: 'text' | 'pill'; content: string; pillType?: 'deal' | 'file' | 'folder' }> = [];
  
  const tagRegex = /\[([@+#])(Deal|File|Folder):([^\]]+)\]/g;
  let lastIndex = 0;
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }
    
    // Add the pill
    const pillType = match[2].toLowerCase() as 'deal' | 'file' | 'folder';
    parts.push({
      type: 'pill',
      content: match[3],
      pillType
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }
  
  if (parts.length === 0) {
    return <span>{content}</span>;
  }
  
  return (
    <span className="inline">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }
        
        // Render pill
        const Icon = part.pillType === 'deal' ? Building2 : part.pillType === 'file' ? File : Folder;
        const bgColor = part.pillType === 'deal' ? 'bg-orange-600/20' : part.pillType === 'file' ? 'bg-orange-500/20' : 'bg-orange-700/20';
        const borderColor = part.pillType === 'deal' ? 'border-orange-600/40' : part.pillType === 'file' ? 'border-orange-500/40' : 'border-orange-700/40';
        const textColor = 'text-orange-300';
        
        return (
          <span
            key={index}
            className={`inline-flex items-center gap-0.5 px-1 py-0 rounded ${bgColor} ${borderColor} border ${textColor} text-[9px] mx-0.5`}
          >
            <Icon className="h-2 w-2" />
            <span className="max-w-[100px] truncate">{part.content}</span>
          </span>
        );
      })}
    </span>
  );
}
