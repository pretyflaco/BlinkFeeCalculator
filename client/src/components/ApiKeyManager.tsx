import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  saveApiKey, 
  getApiKey, 
  hasApiKey,
  removeApiKey
} from "@/lib/apiKeyStorage";
import { KeyRound, ChevronDown, ChevronUp, Trash2, Eye, EyeOff } from "lucide-react";

interface ApiKeyFormProps {
  title: string;
  keyName: string;
  description: string;
  placeholder?: string;
  initialValue?: string;
  onSave?: (value: string) => void;
}

export default function ApiKeyManager() {
  const [isExpanded, setIsExpanded] = useState(false);

  const apiKeysConfig = [
    {
      title: "Mempool.space API Key",
      keyName: "mempool_api_key",
      description: "Used to access mempool.space data with higher rate limits",
      placeholder: "Enter your mempool.space API key"
    },
    {
      title: "Bitcoin Price API Key",
      keyName: "btc_price_api_key",
      description: "Used for fetching real-time Bitcoin price data",
      placeholder: "Enter your Bitcoin price API key"
    }
  ];

  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-3">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center">
              <KeyRound className="h-5 w-5 mr-2 text-orange-500" />
              API Key Management
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription className="text-sm text-muted-foreground pt-1">
            Securely store your API keys for Blink services
          </CardDescription>
          
          <CollapsibleContent className="mt-4 space-y-4">
            {apiKeysConfig.map((config) => (
              <ApiKeyForm 
                key={config.keyName}
                title={config.title}
                keyName={config.keyName}
                description={config.description}
                placeholder={config.placeholder}
              />
            ))}

            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md mt-4">
              <p>🔒 API keys are stored securely in your browser's local storage and never sent to our servers.</p>
              <p>They are used to access external APIs with higher rate limits or additional features.</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}

function ApiKeyForm({ title, keyName, description, placeholder }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const { toast } = useToast();

  // Check if the API key already exists on mount
  useEffect(() => {
    const storedKey = getApiKey(keyName);
    if (storedKey) {
      setApiKey(storedKey);
      setIsSaved(true);
    }
  }, [keyName]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive"
      });
      return;
    }

    saveApiKey(keyName, apiKey);
    setIsSaved(true);
    toast({
      title: "Success",
      description: "API key saved successfully",
    });
  };

  const handleRemove = () => {
    removeApiKey(keyName);
    setApiKey('');
    setIsSaved(false);
    toast({
      title: "Removed",
      description: "API key has been removed",
    });
  };

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  return (
    <div className="space-y-2 border rounded-md p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        {isSaved && (
          <div className="inline-flex bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
            Saved
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 relative">
        <Input
          type={showApiKey ? "text" : "password"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={placeholder || "Enter API key"}
          className="flex-1 pr-10"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-12"
          onClick={toggleShowApiKey}
        >
          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        
        {isSaved ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleRemove}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
          >
            Save
          </Button>
        )}
      </div>
    </div>
  );
}