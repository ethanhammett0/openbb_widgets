import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  Shield, 
  Key, 
  UserCircle, 
  Fingerprint,
  Lock,
  Cloud,
  CheckCircle2,
  Loader2
} from "lucide-react";

export type DatasourceType = 
  | 'onedrive' 
  | 'sharepoint' 
  | 'google-drive' 
  | 'gmail' 
  | 'dropbox' 
  | 'box' 
  | 'local';

export type AuthMethod = 
  | 'entra-id'
  | 'sso'
  | 'google-passkey'
  | 'oauth'
  | 'username-password';

interface DatasourceAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasourceType: DatasourceType | null;
  datasourceName: string;
  onAuthComplete: (authMethod: AuthMethod, credentials?: { email: string; password?: string }) => void;
}

interface AuthOption {
  method: AuthMethod;
  label: string;
  description: string;
  icon: React.ElementType;
  primary?: boolean;
  requiresCredentials?: boolean;
}

// Auth options per datasource type
const AUTH_OPTIONS_MAP: Record<DatasourceType, AuthOption[]> = {
  'onedrive': [
    { 
      method: 'entra-id', 
      label: 'Microsoft Entra ID', 
      description: 'Secure enterprise authentication with SSO', 
      icon: Shield,
      primary: true
    },
    { 
      method: 'oauth', 
      label: 'OAuth 2.0', 
      description: 'Standard Microsoft authentication', 
      icon: Key
    },
    { 
      method: 'username-password', 
      label: 'Username & Password', 
      description: 'Direct credentials login', 
      icon: UserCircle,
      requiresCredentials: true
    },
  ],
  'sharepoint': [
    { 
      method: 'entra-id', 
      label: 'Microsoft Entra ID', 
      description: 'Secure enterprise authentication with SSO', 
      icon: Shield,
      primary: true
    },
    { 
      method: 'sso', 
      label: 'Single Sign-On', 
      description: 'Organization SSO provider', 
      icon: Lock
    },
    { 
      method: 'username-password', 
      label: 'Username & Password', 
      description: 'Direct credentials login', 
      icon: UserCircle,
      requiresCredentials: true
    },
  ],
  'google-drive': [
    { 
      method: 'google-passkey', 
      label: 'Google Passkey', 
      description: 'Passwordless authentication with biometrics', 
      icon: Fingerprint,
      primary: true
    },
    { 
      method: 'oauth', 
      label: 'Google OAuth', 
      description: 'Standard Google authentication', 
      icon: Cloud
    },
    { 
      method: 'username-password', 
      label: 'Username & Password', 
      description: 'Direct credentials login', 
      icon: UserCircle,
      requiresCredentials: true
    },
  ],
  'gmail': [
    { 
      method: 'google-passkey', 
      label: 'Google Passkey', 
      description: 'Passwordless authentication with biometrics', 
      icon: Fingerprint,
      primary: true
    },
    { 
      method: 'oauth', 
      label: 'Google OAuth', 
      description: 'Standard Google authentication', 
      icon: Cloud
    },
    { 
      method: 'username-password', 
      label: 'Username & Password', 
      description: 'Direct credentials login', 
      icon: UserCircle,
      requiresCredentials: true
    },
  ],
  'dropbox': [
    { 
      method: 'oauth', 
      label: 'Dropbox OAuth', 
      description: 'Secure Dropbox authentication', 
      icon: Cloud,
      primary: true
    },
    { 
      method: 'username-password', 
      label: 'Username & Password', 
      description: 'Direct credentials login', 
      icon: UserCircle,
      requiresCredentials: true
    },
  ],
  'box': [
    { 
      method: 'oauth', 
      label: 'Box OAuth', 
      description: 'Secure Box authentication', 
      icon: Cloud,
      primary: true
    },
    { 
      method: 'sso', 
      label: 'Enterprise SSO', 
      description: 'Organization SSO provider', 
      icon: Lock
    },
    { 
      method: 'username-password', 
      label: 'Username & Password', 
      description: 'Direct credentials login', 
      icon: UserCircle,
      requiresCredentials: true
    },
  ],
  'local': [],
};

export function DatasourceAuthModal({ 
  isOpen, 
  onClose, 
  datasourceType,
  datasourceName,
  onAuthComplete 
}: DatasourceAuthModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showCredentialForm, setShowCredentialForm] = useState(false);

  const authOptions = datasourceType ? AUTH_OPTIONS_MAP[datasourceType] : [];

  const handleMethodSelect = (option: AuthOption) => {
    setSelectedMethod(option.method);
    
    if (option.requiresCredentials) {
      setShowCredentialForm(true);
    } else {
      setShowCredentialForm(false);
    }
  };

  const handleAuthenticate = async () => {
    if (!selectedMethod) return;

    const currentOption = authOptions.find(opt => opt.method === selectedMethod);
    
    // Validate credentials if required
    if (currentOption?.requiresCredentials && (!email || !password)) {
      return;
    }

    setIsAuthenticating(true);

    // Simulate authentication flow
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Call the completion handler
    onAuthComplete(
      selectedMethod, 
      currentOption?.requiresCredentials ? { email, password } : undefined
    );

    // Reset state
    setIsAuthenticating(false);
    setSelectedMethod(null);
    setShowCredentialForm(false);
    setEmail("");
    setPassword("");
  };

  const handleCancel = () => {
    setSelectedMethod(null);
    setShowCredentialForm(false);
    setEmail("");
    setPassword("");
    setIsAuthenticating(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border p-0 gap-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <DialogTitle className="text-base mb-2">Authenticate {datasourceName}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Choose your preferred authentication method to securely connect to {datasourceName}.
          </DialogDescription>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Authentication Method Selection */}
          {!showCredentialForm && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-foreground">Authentication Method</label>
              
              {authOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedMethod === option.method;
                
                return (
                  <button
                    key={option.method}
                    onClick={() => handleMethodSelect(option)}
                    disabled={isAuthenticating}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-border/50 hover:border-blue-500/30 hover:bg-blue-500/5'
                    } ${option.primary ? 'ring-1 ring-blue-500/20' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        option.primary 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                          : 'bg-muted'
                      }`}>
                        <Icon className={`w-5 h-5 ${option.primary ? 'text-white' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">{option.label}</span>
                          {option.primary && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Credential Form */}
          {showCredentialForm && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <button
                  onClick={() => {
                    setShowCredentialForm(false);
                    setSelectedMethod(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  ← Back to methods
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email" className="text-xs font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-9 text-xs"
                    disabled={isAuthenticating}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="auth-password" className="text-xs font-medium">
                    Password
                  </Label>
                  <Input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-9 text-xs"
                    disabled={isAuthenticating}
                  />
                </div>

                <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 mt-3">
                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-200 leading-relaxed">
                      Your credentials are encrypted and never stored. We use them only to establish a secure connection.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Notice */}
          {!showCredentialForm && (
            <div className="bg-blue-950/20 border border-blue-800/30 rounded-lg p-3 bg-[rgba(22,36,86,0)]">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[rgba(14,14,141,1)] leading-relaxed">
                  All authentication methods use industry-standard encryption and security protocols to protect your data.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20">
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isAuthenticating}
              className="h-8 px-4 text-xs border-border/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAuthenticate}
              disabled={!selectedMethod || isAuthenticating || (showCredentialForm && (!email || !password))}
              className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 mr-1.5" />
                  Authenticate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
