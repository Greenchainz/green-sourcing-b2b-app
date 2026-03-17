import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Bot, TrendingUp, MessageSquare, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SupplierAgentConfig() {
  const { user } = useAuth();
  const [handoffMode, setHandoffMode] = useState<"always_agent" | "hybrid" | "immediate_human">("hybrid");
  const [maxMessages, setMaxMessages] = useState(5);
  const [customPrompt, setCustomPrompt] = useState("");
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [businessDays, setBusinessDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [businessHoursStart, setBusinessHoursStart] = useState("09:00");
  const [businessHoursEnd, setBusinessHoursEnd] = useState("17:00");
  const [isSaving, setIsSaving] = useState(false);

  const { data: config, isLoading, refetch } = trpc.agentConfig.getConfig.useQuery();
  const { data: analytics } = trpc.agentConfig.getAnalytics.useQuery();
  const updateConfig = trpc.agentConfig.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Agent configuration saved successfully");
      refetch();
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  // Load config when available
  useEffect(() => {
    if (config) {
      setHandoffMode(config.handoffMode);
      setMaxMessages(config.maxAgentMessages);
      setCustomPrompt(config.customAgentPrompt || "");
      setBusinessHoursEnabled(config.businessHoursEnabled === 1);
      if (config.businessDays) {
        setBusinessDays(config.businessDays.split(","));
      }
      if (config.businessHoursStart) {
        setBusinessHoursStart(config.businessHoursStart);
      }
      if (config.businessHoursEnd) {
        setBusinessHoursEnd(config.businessHoursEnd);
      }
    }
  }, [config]);

  const handleSave = () => {
    setIsSaving(true);
    updateConfig.mutate({
      handoffMode,
      maxAgentMessages: maxMessages,
      customAgentPrompt: customPrompt || undefined,
      businessHoursEnabled: businessHoursEnabled ? 1 : 0,
      businessDays: businessDays.join(","),
      businessHoursStart,
      businessHoursEnd,
    });
  };

  const toggleBusinessDay = (day: string) => {
    setBusinessDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">AI Agent Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure how your AI agent interacts with buyers before handing off to a human representative.
          </p>
          <Badge variant="secondary" className="mt-2">
            <Bot className="w-3 h-3 mr-1" />
            Premium Feature
          </Badge>
        </div>

        {/* Agent Analytics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span className="text-2xl font-bold">{analytics.totalConversations}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Agent Resolution Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-2xl font-bold">{analytics.agentResolutionRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Handoff Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span className="text-2xl font-bold">{analytics.humanHandoffRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span className="text-2xl font-bold">{(analytics.avgResponseTime / 1000).toFixed(1)}s</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Handoff Mode Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Handoff Mode</CardTitle>
            <CardDescription>
              Choose how your AI agent handles buyer conversations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="handoff-mode">Mode</Label>
              <Select value={handoffMode} onValueChange={(value: any) => setHandoffMode(value)}>
                <SelectTrigger id="handoff-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always_agent">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Always Agent</span>
                      <span className="text-xs text-muted-foreground">AI handles all conversations, no human handoff</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="hybrid">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Hybrid (Recommended)</span>
                      <span className="text-xs text-muted-foreground">AI handles initial messages, then offers human handoff</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="immediate_human">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Immediate Human</span>
                      <span className="text-xs text-muted-foreground">Skip AI, connect buyers directly to human</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {handoffMode === "hybrid" && (
              <div className="space-y-2">
                <Label htmlFor="max-messages">
                  Max Agent Messages Before Handoff: <span className="font-bold">{maxMessages}</span>
                </Label>
                <Slider
                  id="max-messages"
                  min={1}
                  max={20}
                  step={1}
                  value={[maxMessages]}
                  onValueChange={(value) => setMaxMessages(value[0])}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  After {maxMessages} messages, the agent will offer to connect the buyer with a human representative.
                </p>
              </div>
            )}

            {handoffMode === "always_agent" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Always Agent mode:</strong> The AI will handle all conversations without offering human handoff. 
                  Use this if you want to fully automate buyer interactions.
                </AlertDescription>
              </Alert>
            )}

            {handoffMode === "immediate_human" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Immediate Human mode:</strong> Buyers will be connected directly to a human representative. 
                  The AI agent will not participate in conversations.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Custom Agent Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Agent Prompt</CardTitle>
            <CardDescription>
              Customize your AI agent's personality and instructions (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-prompt">Agent Instructions</Label>
              <Textarea
                id="custom-prompt"
                placeholder="Example: You are a friendly sales representative for [Company Name]. Always mention our 24-hour lead times and free shipping for orders over $5,000. Use a professional but warm tone."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={6}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                {customPrompt.length}/2000 characters
              </p>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Tip:</strong> Include your company's unique selling points, typical lead times, pricing policies, 
                and any specific product knowledge you want the agent to emphasize.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Business Hours Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Business Hours Handoff</CardTitle>
            <CardDescription>
              Automatically hand off to human during business hours (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="business-hours-toggle">Enable Business Hours Handoff</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, buyers will be connected to a human during your business hours
                </p>
              </div>
              <Switch
                id="business-hours-toggle"
                checked={businessHoursEnabled}
                onCheckedChange={setBusinessHoursEnabled}
              />
            </div>

            {businessHoursEnabled && (
              <>
                <div className="space-y-2">
                  <Label>Business Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {allDays.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day}`}
                          checked={businessDays.includes(day)}
                          onCheckedChange={() => toggleBusinessDay(day)}
                        />
                        <Label
                          htmlFor={`day-${day}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {businessDays.length === 0 && (
                    <p className="text-sm text-destructive">Select at least one business day</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={businessHoursStart}
                      onChange={(e) => setBusinessHoursStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={businessHoursEnd}
                      onChange={(e) => setBusinessHoursEnd(e.target.value)}
                    />
                  </div>
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    During business hours on selected days ({businessDays.join(", ")}), buyers will be 
                    connected to a human representative immediately. Outside business hours, the AI agent 
                    will handle conversations according to your handoff mode settings.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>

        {/* Agent Behavior Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Behavior Preview</CardTitle>
            <CardDescription>
              How your agent will interact with buyers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <Bot className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Initial Response</p>
                  <p className="text-muted-foreground">
                    {handoffMode === "immediate_human"
                      ? "Buyer is immediately connected to a human representative."
                      : "AI agent responds to buyer's message with product information, pricing, and availability."}
                  </p>
                </div>
              </div>

              {handoffMode === "hybrid" && (
                <>
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-blue-500" />
                    <div>
                      <p className="font-medium">Conversation Flow</p>
                      <p className="text-muted-foreground">
                        AI handles up to {maxMessages} messages, answering questions about materials, certifications, and CCPS scores.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <TrendingUp className="w-4 h-4 mt-0.5 text-amber-500" />
                    <div>
                      <p className="font-medium">Handoff Trigger</p>
                      <p className="text-muted-foreground">
                        After {maxMessages} messages or if buyer requests human contact, agent offers to connect with your team.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {handoffMode === "always_agent" && (
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                  <div>
                    <p className="font-medium">Fully Automated</p>
                    <p className="text-muted-foreground">
                      AI handles all conversations end-to-end, including RFQ submissions and product recommendations.
                    </p>
                  </div>
                </div>
              )}

              {businessHoursEnabled && (
                <div className="flex items-start space-x-2">
                  <Clock className="w-4 h-4 mt-0.5 text-purple-500" />
                  <div>
                    <p className="font-medium">Business Hours Override</p>
                    <p className="text-muted-foreground">
                      During business hours ({businessDays.join(", ")} {businessHoursStart}-{businessHoursEnd}), 
                      buyers are immediately connected to a human. Outside these hours, normal handoff rules apply.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
