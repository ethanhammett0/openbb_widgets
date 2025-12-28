import { useState } from "react";
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger 
} from "./ui/context-menu";
import { 
  Edit3, 
  Trash2, 
  Download, 
  FolderOpen, 
  History, 
  GitCompare, 
  Sparkles, 
  Copy, 
  Share,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Star,
  Archive
} from "lucide-react";

interface FileNode {
  id: string;
  name: string;
  type: "folder" | "file";
  status?: "verified" | "needs-review" | "discrepancies";
  isLocked?: boolean;
  isHidden?: boolean;
  isFavorite?: boolean;
}

interface FileContextMenuProps {
  children: React.ReactNode;
  file: FileNode;
  onAction: (action: string, fileId: string, data?: any) => void;
}

export function FileContextMenu({ children, file, onAction }: FileContextMenuProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAction = (action: string, data?: any) => {
    onAction(action, file.id, data);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-popover border-border">
        {/* Standard Actions */}
        <ContextMenuItem onClick={() => handleAction('rename')} className="flex items-center gap-2">
          <Edit3 className="w-4 h-4" />
          Rename
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => handleAction('duplicate')} className="flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Duplicate
        </ContextMenuItem>

        {file.type === "file" && (
          <ContextMenuItem onClick={() => handleAction('download')} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download
          </ContextMenuItem>
        )}

        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Move to...
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onClick={() => handleAction('move', 'financial-docs')}>
              Financial Documents
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('move', 'legal-docs')}>
              Legal Documents
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('move', 'due-diligence')}>
              Due Diligence
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleAction('move', 'new-folder')}>
              Create New Folder...
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onClick={() => handleAction('share')} className="flex items-center gap-2">
          <Share className="w-4 h-4" />
          Share
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Quick Actions */}
        <ContextMenuItem 
          onClick={() => handleAction('toggle-favorite')} 
          className="flex items-center gap-2"
        >
          <Star className={`w-4 h-4 ${file.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          {file.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </ContextMenuItem>

        <ContextMenuItem 
          onClick={() => handleAction('toggle-lock')} 
          className="flex items-center gap-2"
        >
          {file.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          {file.isLocked ? 'Unlock' : 'Lock'}
        </ContextMenuItem>

        <ContextMenuItem 
          onClick={() => handleAction('toggle-visibility')} 
          className="flex items-center gap-2"
        >
          {file.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {file.isHidden ? 'Show' : 'Hide'}
        </ContextMenuItem>

        {file.type === "file" && (
          <>
            <ContextMenuSeparator />
            
            {/* Advanced File Actions */}
            <ContextMenuItem onClick={() => handleAction('view-history')} className="flex items-center gap-2">
              <History className="w-4 h-4" />
              View Version History
            </ContextMenuItem>

            <ContextMenuItem onClick={() => handleAction('compare-versions')} className="flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Compare Versions...
            </ContextMenuItem>

            <ContextMenuItem onClick={() => handleAction('rerun-ai')} className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Re-run AI Analysis
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />

        {/* Destructive Actions */}
        <ContextMenuItem onClick={() => handleAction('archive')} className="flex items-center gap-2">
          <Archive className="w-4 h-4" />
          Archive
        </ContextMenuItem>

        <ContextMenuItem 
          onClick={() => handleAction('delete')} 
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}