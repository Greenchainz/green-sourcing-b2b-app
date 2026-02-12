import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, Send, ArrowLeft, LogIn } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { PaywallGate } from "@/components/paywall/PaywallGate";

interface RfqItem { materialId: number; name: string; manufacturerName?: string; quantity: number; quantityUnit: string; }

export default function RfqCart() {
  const { user } = useAuth();
  const [items, setItems] = useState<RfqItem[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [projectType, setProjectType] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem("rfq-items") || "[]")); } catch { setItems([]); } }, []);

  const updateStorage = (newItems: RfqItem[]) => { setItems(newItems); localStorage.setItem("rfq-items", JSON.stringify(newItems)); };
  const removeItem = (materialId: number) => { updateStorage(items.filter((i) => i.materialId !== materialId)); toast.success("Removed from RFQ cart"); };
  const updateQuantity = (materialId: number, quantity: number) => { updateStorage(items.map((i) => i.materialId === materialId ? { ...i, quantity } : i)); };

  const createRfq = trpc.rfq.create.useMutation({
    onSuccess: (data) => { toast.success(`RFQ #${data.id} created successfully!`); localStorage.removeItem("rfq-items"); setItems([]); setProjectName(""); setProjectLocation(""); setNotes(""); },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!projectName.trim()) { toast.error("Project name is required"); return; }
    if (items.length === 0) { toast.error("Add at least one material"); return; }
    createRfq.mutate({ projectName, projectLocation: projectLocation || undefined, projectType: projectType || undefined, notes: notes || undefined, items: items.map((i) => ({ materialId: i.materialId, quantity: i.quantity, quantityUnit: i.quantityUnit })) });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4"><Link href="/materials" className="hover:text-foreground">Materials</Link><span>/</span><span className="text-foreground">RFQ Cart</span></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between"><h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="w-6 h-6" />RFQ Cart</h1><Badge variant="secondary">{items.length} items</Badge></div>
            {items.length === 0 ? (
              <Card><CardContent className="py-16 text-center"><ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">Your RFQ cart is empty</h3><p className="text-sm text-muted-foreground mb-4">Browse the materials catalog to add items for your quote request.</p><Link href="/materials"><Button><ArrowLeft className="w-4 h-4 mr-2" />Browse Materials</Button></Link></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <Card key={item.materialId}><CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1"><Link href={`/materials/${item.materialId}`}><p className="text-sm font-semibold hover:text-primary cursor-pointer">{item.name}</p></Link>{item.manufacturerName && <p className="text-xs text-muted-foreground">{item.manufacturerName}</p>}</div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1"><Input type="number" min={1} value={item.quantity} onChange={(e) => updateQuantity(item.materialId, Number(e.target.value) || 1)} className="w-20 h-8 text-xs" /><span className="text-xs text-muted-foreground">{item.quantityUnit}</span></div>
                      <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-700" onClick={() => removeItem(item.materialId)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <Card><CardHeader><CardTitle className="text-sm">Project Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Project Name *</Label><Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g., Downtown Office Tower" className="mt-1" /></div>
                <div><Label className="text-xs">Location</Label><Input value={projectLocation} onChange={(e) => setProjectLocation(e.target.value)} placeholder="e.g., Austin, TX" className="mt-1" /></div>
                <div><Label className="text-xs">Project Type</Label><Input value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="e.g., Commercial, Residential" className="mt-1" /></div>
                <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special requirements, timeline, etc." className="mt-1" rows={3} /></div>
              </CardContent>
            </Card>
            <Card><CardContent className="p-4">
              {user ? (
                <PaywallGate dimension="rfq_submissions" mode="soft">
                  <Button className="w-full" onClick={handleSubmit} disabled={createRfq.isPending || items.length === 0}><Send className="w-4 h-4 mr-2" />{createRfq.isPending ? "Submitting..." : "Submit RFQ"}</Button>
                </PaywallGate>
              ) : (
                <div className="text-center space-y-2"><p className="text-xs text-muted-foreground">Sign in to submit your RFQ</p><a href={getLoginUrl()}><Button className="w-full"><LogIn className="w-4 h-4 mr-2" />Sign In</Button></a></div>
              )}
            </CardContent></Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
