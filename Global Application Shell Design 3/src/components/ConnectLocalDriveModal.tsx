import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { AlertTriangle, FolderOpen } from "lucide-react";

interface ConnectLocalDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectLocalDriveModal({ isOpen, onClose }: ConnectLocalDriveModalProps) {
  const [folderPath, setFolderPath] = useState("");
  const [isValidPath, setIsValidPath] = useState(false);

  const handlePathChange = (value: string) => {
    setFolderPath(value);
    // Basic validation - check if path looks like a valid folder path
    const isValid = value.trim().length > 0 && 
      (value.includes("\\") || value.includes("/")) &&
      value.length > 3;
    setIsValidPath(isValid);
  };

  const handleBrowse = () => {
    // In a real implementation, this would trigger the native file explorer
    // For now, we'll simulate a selected path
    const mockPath = "C:\\Users\\JohnDoe\\ProjectRail\\Deals";
    setFolderPath(mockPath);
    setIsValidPath(true);
  };

  const handleConfirm = () => {
    if (isValidPath) {
      // Handle the installation and connection logic here
      console.log("Connecting to local drive:", folderPath);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <DialogTitle className="text-lg font-semibold text-foreground mb-2">Connect Local Drive</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            To enable seamless read/write access and metadata enrichment, a small Rail Sync Client will be installed on your desktop. 
            Select the local folder you wish to map.
          </DialogDescription>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Folder Path Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Local Folder Path</label>
            <div className="flex gap-2">
              <Input
                value={folderPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="e.g., C:\Users\JohnDoe\ProjectRail\Deals"
                className={`flex-1 h-9 text-sm bg-muted/50 ${
                  isValidPath 
                    ? "border-blue-500 ring-1 ring-blue-500/20" 
                    : "border-border/50"
                }`}
              />
              <Button
                variant="outline"
                onClick={handleBrowse}
                className="h-9 px-4 text-sm border-border/50 hover:bg-accent/50"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Browse...
              </Button>
            </div>
          </div>

          {/* Warning Component */}
          <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-200 leading-relaxed">
                If the selected folder contains existing files, they will be synced to the cloud. 
                Cloud-based deal files will be downloaded to this location.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20">
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-sm border-border/50 hover:bg-accent/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValidPath}
              className="h-9 px-4 text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm & Install
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}