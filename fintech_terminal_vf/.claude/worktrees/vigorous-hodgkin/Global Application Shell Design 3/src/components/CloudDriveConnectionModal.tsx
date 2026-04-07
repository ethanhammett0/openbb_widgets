import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { DatasourceAuthModal, type AuthMethod } from "./DatasourceAuthModal";
import { 
  Cloud, 
  Check, 
  FolderTree, 
  Search,
  X,
  Plus,
  Loader2,
  HardDrive,
  Folder,
  Mail,
  Package,
  MoreVertical,
  RefreshCw,
  Shield,
  Settings,
  LogOut
} from "lucide-react";

interface CloudDriveConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess: (connection: CloudConnection) => void;
  existingConnection?: CloudConnection | null;
  onDisconnect?: () => void;
}

export interface CloudConnection {
  provider: string;
  email: string;
  folderPath: string;
  folderName: string;
  connectedAt: Date;
}

// New interfaces for multi-datasource support
export type DatasourceType = 
  | 'onedrive' 
  | 'sharepoint' 
  | 'google-drive' 
  | 'gmail' 
  | 'dropbox' 
  | 'box' 
  | 'local';

export interface Datasource {
  id: string;
  type: DatasourceType;
  name: string;
  email?: string;
  connected: boolean;
  authenticating: boolean;
  folderPath?: string;
}

export interface FolderItem {
  path: string;
  name: string;
  datasourceId: string;
  datasourceType: DatasourceType;
  datasourceName: string;
}

// Available datasource platforms
const AVAILABLE_DATASOURCES = [
  { type: 'onedrive' as DatasourceType, name: 'OneDrive', icon: Cloud, color: 'bg-gradient-to-r from-blue-500 to-blue-600' },
  { type: 'sharepoint' as DatasourceType, name: 'SharePoint', icon: Cloud, color: 'bg-gradient-to-r from-indigo-500 to-indigo-600' },
  { type: 'google-drive' as DatasourceType, name: 'Google Drive', icon: Cloud, color: 'bg-gradient-to-r from-green-500 via-yellow-500 to-red-500' },
  { type: 'gmail' as DatasourceType, name: 'Gmail Attachments', icon: Mail, color: 'bg-gradient-to-r from-red-500 to-red-600' },
  { type: 'dropbox' as DatasourceType, name: 'Dropbox', icon: Package, color: 'bg-gradient-to-r from-blue-400 to-blue-500' },
  { type: 'box' as DatasourceType, name: 'Box', icon: Package, color: 'bg-gradient-to-r from-sky-400 to-blue-500' },
  { type: 'local' as DatasourceType, name: 'Local File Explorer', icon: HardDrive, color: 'bg-gradient-to-r from-gray-500 to-gray-600' },
];

// Mock folder data for each datasource type
const mockFoldersData: Record<DatasourceType, { path: string; name: string }[]> = {
  'onedrive': [
    { path: '/OneDrive/Deal Library', name: 'Deal Library' },
    { path: '/OneDrive/Documents/Deals', name: 'Deals' },
    { path: '/OneDrive/Workspace/Transactions', name: 'Transactions' },
  ],
  'sharepoint': [
    { path: '/SharePoint/Projects/Active Deals', name: 'Active Deals' },
    { path: '/SharePoint/Finance/Deal Room', name: 'Deal Room' },
    { path: '/SharePoint/Legal/Contracts', name: 'Contracts' },
  ],
  'google-drive': [
    { path: '/My Drive/Deal Library', name: 'Deal Library' },
    { path: '/My Drive/Documents/Deals', name: 'Deals' },
    { path: '/Shared drives/Finance/Deal Room', name: 'Deal Room' },
  ],
  'gmail': [
    { path: '/Gmail/Attachments/2024', name: '2024 Attachments' },
    { path: '/Gmail/Attachments/Deals', name: 'Deal Attachments' },
  ],
  'dropbox': [
    { path: '/Dropbox/Business/Deals', name: 'Deals' },
    { path: '/Dropbox/Shared/Projects', name: 'Projects' },
  ],
  'box': [
    { path: '/Box/Deals', name: 'Deals' },
    { path: '/Box/Documents', name: 'Documents' },
  ],
  'local': [
    { path: 'C:/Users/Documents/Deals', name: 'Deals' },
    { path: 'C:/Users/Desktop/Projects', name: 'Projects' },
  ],
};

export function CloudDriveConnectionModal({ 
  isOpen, 
  onClose,
  onConnectionSuccess,
  existingConnection = null,
  onDisconnect
}: CloudDriveConnectionModalProps) {
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedFolderItem, setSelectedFolderItem] = useState<FolderItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingDatasource, setIsAddingDatasource] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingDatasource, setPendingDatasource] = useState<{ type: DatasourceType; id: string; name: string } | null>(null);

  // Get all folders from all connected datasources
  const getAllFolders = (): FolderItem[] => {
    const folders: FolderItem[] = [];
    
    datasources.forEach(datasource => {
      if (datasource.connected) {
        const mockFolders = mockFoldersData[datasource.type] || [];
        mockFolders.forEach(folder => {
          folders.push({
            ...folder,
            datasourceId: datasource.id,
            datasourceType: datasource.type,
            datasourceName: datasource.name,
          });
        });
      }
    });
    
    return folders;
  };

  // Filter folders based on search query
  const filteredFolders = getAllFolders().filter(folder => {
    if (searchQuery.trim() === '') return true;
    const query = searchQuery.toLowerCase();
    return (
      folder.name.toLowerCase().includes(query) ||
      folder.path.toLowerCase().includes(query) ||
      folder.datasourceName.toLowerCase().includes(query)
    );
  });

  // Handle adding a new datasource
  const handleAddDatasource = (type: DatasourceType) => {
    setIsAddingDatasource(false);

    // Handle local file explorer
    if (type === 'local') {
      // Trigger file input click
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    // Create pending datasource and show auth modal
    const datasourceName = AVAILABLE_DATASOURCES.find(d => d.type === type)?.name || type;
    const datasourceId = `datasource-${Date.now()}`;
    
    setPendingDatasource({ type, id: datasourceId, name: datasourceName });
    setIsAuthModalOpen(true);
  };

  // Handle authentication completion
  const handleAuthComplete = async (authMethod: AuthMethod, credentials?: { email: string; password?: string }) => {
    if (!pendingDatasource) return;

    setIsAuthModalOpen(false);

    // Create new datasource in authenticating state
    const newDatasource: Datasource = {
      id: pendingDatasource.id,
      type: pendingDatasource.type,
      name: pendingDatasource.name,
      connected: false,
      authenticating: true,
    };

    setDatasources(prev => [...prev, newDatasource]);

    // Simulate authentication flow based on method
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock successful authentication
    const mockEmail = credentials?.email || 
      (pendingDatasource.type.includes('google') || pendingDatasource.type === 'gmail'
        ? 'john.smith@gmail.com'
        : pendingDatasource.type.includes('microsoft') || pendingDatasource.type === 'onedrive' || pendingDatasource.type === 'sharepoint'
        ? 'john.smith@company.com'
        : `john.smith@${pendingDatasource.type}.com`);

    // Update datasource to connected state
    setDatasources(prev => prev.map(ds => 
      ds.id === newDatasource.id
        ? { ...ds, email: mockEmail, connected: true, authenticating: false }
        : ds
    ));

    // Clear pending datasource
    setPendingDatasource(null);
  };

  // Handle re-authentication
  const handleReAuthenticate = (datasource: Datasource) => {
    setPendingDatasource({ type: datasource.type, id: datasource.id, name: datasource.name });
    setIsAuthModalOpen(true);
  };

  // Handle local file selection
  const handleLocalFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Get the directory path (in a real app, this would use the File System Access API)
      const folderPath = file.webkitRelativePath || file.name;
      
      const newDatasource: Datasource = {
        id: `datasource-${Date.now()}`,
        type: 'local',
        name: 'Local File Explorer',
        connected: true,
        authenticating: false,
        folderPath: folderPath,
      };

      setDatasources(prev => [...prev, newDatasource]);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle removing a datasource
  const handleRemoveDatasource = (datasourceId: string) => {
    setDatasources(prev => prev.filter(ds => ds.id !== datasourceId));
    
    // Clear selected folder if it belongs to removed datasource
    if (selectedFolderItem?.datasourceId === datasourceId) {
      setSelectedFolder("");
      setSelectedFolderItem(null);
    }
  };

  // Handle folder selection
  const handleFolderSelect = (folder: FolderItem) => {
    setSelectedFolder(folder.path);
    setSelectedFolderItem(folder);
  };

  // Handle connecting the selected folder
  const handleConnect = () => {
    if (!selectedFolderItem) return;

    const connection: CloudConnection = {
      provider: selectedFolderItem.datasourceType,
      email: datasources.find(ds => ds.id === selectedFolderItem.datasourceId)?.email || '',
      folderPath: selectedFolderItem.path,
      folderName: selectedFolderItem.name,
      connectedAt: new Date(),
    };

    onConnectionSuccess(connection);
    onClose();
  };

  // Get datasource display info
  const getDatasourceInfo = (type: DatasourceType) => {
    return AVAILABLE_DATASOURCES.find(d => d.type === type);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[720px] bg-card border-border p-0 gap-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <DialogTitle className="text-base mb-2">Map Data Sources</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Connect multiple cloud drives and local folders to aggregate your team's file paths in one unified library.
            </DialogDescription>
          </div>

          <div className="px-6 py-5">
            <div className="space-y-4">
              {/* Datasource Pills Selector */}
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">Connected Data Sources</label>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {datasources.map((datasource) => {
                    const info = getDatasourceInfo(datasource.type);
                    const Icon = info?.icon || Cloud;
                    
                    return (
                      <div
                        key={datasource.id}
                        className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all hover:scale-105 ${
                          datasource.authenticating 
                            ? 'bg-muted/50 border-border' 
                            : `${info?.color || 'bg-gray-600'} border-transparent shadow-lg hover:shadow-xl`
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${datasource.authenticating ? 'bg-muted' : 'bg-white/20'} flex items-center justify-center`}>
                          {datasource.authenticating ? (
                            <Loader2 className="w-2.5 h-2.5 text-muted-foreground animate-spin" />
                          ) : (
                            <Icon className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                        <span className={`text-xs font-medium ${datasource.authenticating ? 'text-muted-foreground' : 'text-white'}`}>
                          {datasource.name}
                        </span>
                        
                        {!datasource.authenticating && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/20 rounded-full"
                              >
                                <MoreVertical className="w-3 h-3 text-white" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem 
                                onClick={() => handleReAuthenticate(datasource)}
                                className="text-xs"
                              >
                                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                Re-authenticate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs cursor-default opacity-50">
                                <Shield className="w-3.5 h-3.5 mr-2" />
                                {datasource.email || 'Connected'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleRemoveDatasource(datasource.id)}
                                className="text-xs text-destructive focus:text-destructive"
                              >
                                <LogOut className="w-3.5 h-3.5 mr-2" />
                                Disconnect
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Add Datasource Button */}
                  <Popover open={isAddingDatasource} onOpenChange={setIsAddingDatasource}>
                    <PopoverTrigger asChild>
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-medium text-blue-400">Add Source</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search data sources..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No data sources found.</CommandEmpty>
                          <CommandGroup heading="Cloud Storage">
                            {AVAILABLE_DATASOURCES.filter(ds => 
                              ['onedrive', 'sharepoint', 'google-drive', 'dropbox', 'box'].includes(ds.type)
                            ).map((ds) => {
                              const Icon = ds.icon;
                              return (
                                <CommandItem
                                  key={ds.type}
                                  onSelect={() => handleAddDatasource(ds.type)}
                                  className="flex items-center gap-3 py-2.5"
                                >
                                  <div className={`w-8 h-8 rounded-lg ${ds.color} flex items-center justify-center`}>
                                    <Icon className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-xs font-medium">{ds.name}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                          <CommandGroup heading="Email & Local">
                            {AVAILABLE_DATASOURCES.filter(ds => 
                              ['gmail', 'local'].includes(ds.type)
                            ).map((ds) => {
                              const Icon = ds.icon;
                              return (
                                <CommandItem
                                  key={ds.type}
                                  onSelect={() => handleAddDatasource(ds.type)}
                                  className="flex items-center gap-3 py-2.5"
                                >
                                  <div className={`w-8 h-8 rounded-lg ${ds.color} flex items-center justify-center`}>
                                    <Icon className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-xs font-medium">{ds.name}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {datasources.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Click "Add Source" to connect your first data source
                  </p>
                )}
              </div>

              {/* Search Bar */}
              {datasources.some(ds => ds.connected) && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search folders, paths, and sources..."
                    className="h-8 pl-9 pr-8 text-xs bg-muted/50 border-border/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}

              {/* Aggregated Folders List */}
              {datasources.some(ds => ds.connected) ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-foreground">Available Folders</label>
                    <span className="text-[10px] text-muted-foreground">
                      {filteredFolders.length} folder{filteredFolders.length !== 1 ? 's' : ''} across {datasources.filter(ds => ds.connected).length} source{datasources.filter(ds => ds.connected).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <ScrollArea className="h-[320px] rounded-lg border border-border/50">
                    <div className="p-1.5">
                      {filteredFolders.length > 0 ? (
                        filteredFolders.map((folder, index) => {
                          const info = getDatasourceInfo(folder.datasourceType);
                          const Icon = info?.icon || Folder;
                          
                          return (
                            <button
                              key={`${folder.datasourceId}-${index}`}
                              onClick={() => handleFolderSelect(folder)}
                              className={`w-full px-2.5 py-1.5 rounded transition-all duration-200 flex items-center justify-between gap-2 mb-0.5 ${
                                selectedFolder === folder.path
                                  ? 'bg-blue-500/15 border border-blue-500/50'
                                  : 'hover:bg-muted/50 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${
                                  selectedFolder === folder.path ? 'text-blue-400' : 'text-muted-foreground'
                                }`} />
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-xs font-medium text-foreground truncate">
                                    {folder.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {folder.path}
                                  </span>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className="text-[9px] px-1.5 py-0 flex-shrink-0"
                                  style={{ 
                                    borderColor: selectedFolder === folder.path ? 'rgba(59, 130, 246, 0.5)' : undefined,
                                    backgroundColor: selectedFolder === folder.path ? 'rgba(59, 130, 246, 0.1)' : undefined 
                                  }}
                                >
                                  {folder.datasourceName}
                                </Badge>
                              </div>
                              {selectedFolder === folder.path && (
                                <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-12 text-center">
                          <FolderTree className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No folders found</p>
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery("")}
                              className="text-[10px] text-blue-400 hover:underline mt-1"
                            >
                              Clear search
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="py-16 text-center border border-dashed border-border rounded-lg">
                  <Cloud className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-foreground mb-1">No data sources connected</p>
                  <p className="text-xs text-muted-foreground">
                    Connect a cloud drive or local folder to get started
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-muted/20">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-8 px-4 text-xs border-border/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={!selectedFolder}
                className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Map Selected Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Authentication Modal */}
      <DatasourceAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingDatasource(null);
        }}
        datasourceType={pendingDatasource?.type || null}
        datasourceName={pendingDatasource?.name || ''}
        onAuthComplete={handleAuthComplete}
      />

      {/* Hidden file input for local file explorer */}
      <input
        ref={fileInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in the types but works in browsers
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleLocalFileSelect}
      />
    </>
  );
}