import { useState, useEffect, useRef } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./ui/resizable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./ui/utils";

interface FlexibleWorkspaceProps {
  leftPane: React.ReactNode;
  centerPane: React.ReactNode;
  rightPane: React.ReactNode;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  className?: string;
  // External collapse control props
  isLeftCollapsed?: boolean;
  isRightCollapsed?: boolean;
  onLeftExpand?: () => void;
  onRightExpand?: () => void;
}

export function FlexibleWorkspace({
  leftPane,
  centerPane,
  rightPane,
  defaultLeftWidth = 25,
  defaultRightWidth = 25,
  minLeftWidth = 15,
  minRightWidth = 15,
  className,
  isLeftCollapsed = false,
  isRightCollapsed = false,
  onLeftExpand = () => {},
  onRightExpand = () => {},
}: FlexibleWorkspaceProps) {
  const [activeHandle, setActiveHandle] = useState<'left' | 'right' | null>('left'); // Default to showing left handle in hover state for demo
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<'left' | 'right' | null>(null);
  
  // Demo: Show left divider in hover state initially, then remove after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveHandle(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseEnter = (handle: 'left' | 'right') => {
    if (!isDragging) {
      setActiveHandle(handle);
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setActiveHandle(null);
    }
  };

  const handleMouseDown = (handle: 'left' | 'right') => {
    setIsDragging(true);
    setDragHandle(handle);
    setActiveHandle(handle);
    
    // Global drag state
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragHandle(null);
      setActiveHandle(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Calculate panel sizes based on external collapse state
  const getLeftSize = () => {
    if (isLeftCollapsed) return 0;
    if (isRightCollapsed) return defaultLeftWidth * 1.3; // Expand when right is collapsed
    return defaultLeftWidth;
  };

  const getRightSize = () => {
    if (isRightCollapsed) return 0;
    if (isLeftCollapsed) return defaultRightWidth * 1.3; // Expand when left is collapsed
    return defaultRightWidth;
  };

  const getCenterSize = () => {
    const leftSize = getLeftSize();
    const rightSize = getRightSize();
    return 100 - leftSize - rightSize;
  };

  return (
    <div className={cn("h-full w-full relative", className)}>
      {/* Left Expand Bar - visible when left panel is collapsed */}
      {isLeftCollapsed && (
        <div 
          className={cn(
            "absolute left-0 top-0 h-full w-8 bg-[#2a2a2e] border-r border-border z-50",
            "flex items-center justify-center group cursor-pointer",
            "transition-all duration-300 ease-in-out",
            "hover:w-12 hover:bg-accent/10"
          )}
          onClick={onLeftExpand}
        >
          <div className={cn(
            "p-2 rounded-md transition-all duration-200",
            "opacity-60 group-hover:opacity-100 group-hover:bg-accent/20"
          )}>
            <ChevronRight className="w-4 h-4 text-accent-foreground" />
          </div>
        </div>
      )}

      {/* Right Expand Bar - visible when right panel is collapsed */}
      {isRightCollapsed && (
        <div 
          className={cn(
            "absolute right-0 top-0 h-full w-8 bg-[#2a2a2e] border-l border-border z-50",
            "flex items-center justify-center group cursor-pointer",
            "transition-all duration-300 ease-in-out",
            "hover:w-12 hover:bg-accent/10"
          )}
          onClick={onRightExpand}
        >
          <div className={cn(
            "p-2 rounded-md transition-all duration-200",
            "opacity-60 group-hover:opacity-100 group-hover:bg-accent/20"
          )}>
            <ChevronLeft className="w-4 h-4 text-accent-foreground" />
          </div>
        </div>
      )}

      <ResizablePanelGroup 
        direction="horizontal" 
        className={cn(
          "h-full w-full transition-all duration-300 ease-in-out",
          isLeftCollapsed && "ml-8",
          isRightCollapsed && "mr-8"
        )}
        autoSaveId="workspace-layout"
      >
        {/* Left Panel */}
        {!isLeftCollapsed && (
          <>
            <ResizablePanel 
              defaultSize={getLeftSize()}
              minSize={minLeftWidth}
              maxSize={60}
              id="left-panel"
              order={1}
              className="bg-[#1a1a1e] flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
            >
              {leftPane}
            </ResizablePanel>

            {/* First Divider (Left-Center) */}
            <ResizableHandle 
              id="left-handle"
              className={cn(
                // Base styles - 1px divider
                "group relative bg-border transition-all duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                // Cursor
                "cursor-col-resize",
                // Hover state: 2px blue divider with glow  
                "hover:bg-blue-500 hover:w-0.5 hover:shadow-[0_0_12px_rgba(59,130,246,0.4)]",
                // Active/Demo state - showing hover effect
                activeHandle === 'left' && "bg-blue-500 w-0.5 shadow-[0_0_12px_rgba(59,130,246,0.4)]",
                // Drag state
                isDragging && dragHandle === 'left' && "bg-blue-500/70 w-0.5"
              )}
              onMouseEnter={() => handleMouseEnter('left')}
              onMouseLeave={handleMouseLeave}
              onMouseDown={() => handleMouseDown('left')}
            >
              {/* Enhanced hover zone for better UX - invisible but increases interactive area */}
              <div className="absolute inset-y-0 -left-2 -right-2 w-4 bg-transparent" />
              
              {/* Ghost divider effect during drag */}
              {isDragging && dragHandle === 'left' && (
                <div className="absolute inset-0 bg-blue-500/30 w-0.5 pointer-events-none shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
              
              {/* Visual feedback line for active state */}
              <div className={cn(
                "absolute inset-0 w-0.5 bg-blue-500 opacity-0 transition-opacity duration-200",
                (activeHandle === 'left' || (isDragging && dragHandle === 'left')) && "opacity-100"
              )} />
            </ResizableHandle>
          </>
        )}

        {/* Center Panel */}
        <ResizablePanel 
          defaultSize={getCenterSize()}
          minSize={20}
          id="center-panel"
          order={2}
          className="bg-[#141418] relative flex-1 transition-all duration-300 ease-in-out"
        >
          {/* Subtle inset shadow for depth */}
          <div className="absolute inset-0 shadow-[inset_2px_0_8px_rgba(0,0,0,0.1),inset_-2px_0_8px_rgba(0,0,0,0.1)]" />
          <div className="relative z-10 h-full">
            {centerPane}
          </div>
        </ResizablePanel>

        {/* Second Divider (Center-Right) */}
        {!isRightCollapsed && (
          <>
            <ResizableHandle 
              id="right-handle"
              className={cn(
                // Base styles - 1px divider
                "group relative bg-border transition-all duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                // Cursor
                "cursor-col-resize",
                // Hover state: 2px blue divider with glow
                "hover:bg-blue-500 hover:w-0.5 hover:shadow-[0_0_12px_rgba(59,130,246,0.4)]",
                // Active state
                activeHandle === 'right' && "bg-blue-500 w-0.5 shadow-[0_0_12px_rgba(59,130,246,0.4)]",
                // Drag state
                isDragging && dragHandle === 'right' && "bg-blue-500/70 w-0.5"
              )}
              onMouseEnter={() => handleMouseEnter('right')}
              onMouseLeave={handleMouseLeave}
              onMouseDown={() => handleMouseDown('right')}
            >
              {/* Enhanced hover zone for better UX */}
              <div className="absolute inset-y-0 -left-2 -right-2 w-4 bg-transparent" />
              
              {/* Ghost divider effect during drag */}
              {isDragging && dragHandle === 'right' && (
                <div className="absolute inset-0 bg-blue-500/30 w-0.5 pointer-events-none shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
              
              {/* Visual feedback line for active state */}
              <div className={cn(
                "absolute inset-0 w-0.5 bg-blue-500 opacity-0 transition-opacity duration-200",
                (activeHandle === 'right' || (isDragging && dragHandle === 'right')) && "opacity-100"
              )} />
            </ResizableHandle>

            {/* Right Panel */}
            <ResizablePanel 
              defaultSize={getRightSize()}
              minSize={minRightWidth}
              maxSize={60}
              id="right-panel"
              order={3}
              className="bg-[#1a1a1e] flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
            >
              {rightPane}
            </ResizablePanel>
          </>
        )} 
      </ResizablePanelGroup>
    </div>
  );
}