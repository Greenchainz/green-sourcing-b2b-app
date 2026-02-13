import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Award } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SupplierSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSupplier: (supplierId: number, supplierName: string) => void;
}

export function SupplierSearchModal({ isOpen, onClose, onSelectSupplier }: SupplierSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: suppliers, isLoading } = trpc.supplier.searchSuppliers.useQuery(
    { query: searchQuery },
    { enabled: isOpen }
  );

  const handleSelectSupplier = (supplierId: number, supplierName: string) => {
    onSelectSupplier(supplierId, supplierName);
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers by name, location, or materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Supplier List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading suppliers...</div>
            ) : suppliers && suppliers.length > 0 ? (
              <div className="space-y-3">
                {suppliers.map((supplier: any) => (
                  <button
                    key={supplier.id}
                    onClick={() => handleSelectSupplier(supplier.id, supplier.companyName)}
                    className="w-full p-4 border rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{supplier.companyName}</h3>
                        {supplier.city && supplier.state && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {supplier.city}, {supplier.state}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {supplier.isPremium === 1 && (
                          <Badge className="bg-yellow-500">
                            <Star className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                        {supplier.verified === 1 && (
                          <Badge variant="secondary">
                            <Award className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>

                    {supplier.certifications && supplier.certifications.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {supplier.certifications.slice(0, 3).map((cert: string) => (
                          <Badge key={cert} variant="outline" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                        {supplier.certifications.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{supplier.certifications.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No suppliers found" : "Start typing to search suppliers"}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
