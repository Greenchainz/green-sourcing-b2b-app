import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface EpdLookupModalProps {
  open: boolean;
  onClose: () => void;
  onSelectEpd: (epd: any) => void;
  materialCategory?: string;
}

export function EpdLookupModal({
  open,
  onClose,
  onSelectEpd,
  materialCategory,
}: EpdLookupModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEpds, setSelectedEpds] = useState<string[]>([]);

  // Search EPDs from Autodesk
  const { data: searchResults, isLoading, error } = trpc.autodesk.searchEpds.useQuery(
    {
      query: searchQuery,
      category: materialCategory,
      limit: 20,
    },
    {
      enabled: searchQuery.length > 2 && open,
    }
  );

  // Fetch EPD details (not used in this component, but available if needed)
  const isFetching = false;

  const handleSelectEpd = (epd: any) => {
    if (selectedEpds.includes(epd.id)) {
      setSelectedEpds(selectedEpds.filter(id => id !== epd.id));
    } else {
      setSelectedEpds([...selectedEpds, epd.id]);
    }
  };

  const handleAddSelected = () => {
    if (selectedEpds.length > 0 && searchResults?.success && searchResults.results) {
      selectedEpds.forEach(epdId => {
        const epd = searchResults.results.find((e: any) => e.id === epdId);
        if (epd) {
          onSelectEpd(epd);
        }
      });
      setSelectedEpds([]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Environmental Product Declarations (EPDs)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by material name, manufacturer, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive py-4">
                Error searching EPDs. Please try again.
              </div>
            )}

            {!isLoading && searchResults?.success && searchResults.results && searchResults.results.length === 0 && searchQuery.length > 2 && (
              <div className="text-sm text-muted-foreground py-4">
                No EPDs found. Try a different search term.
              </div>
            )}

            {!isLoading && searchResults?.success && searchResults.results && searchResults.results.map((epd: any) => (
              <Card
                key={epd.id}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedEpds.includes(epd.id)
                    ? 'bg-accent/10 border-accent'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleSelectEpd(epd)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{epd.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{epd.manufacturer}</p>
                    
                    {/* EPD Details */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {epd.category && (
                        <Badge variant="outline" className="text-xs">
                          {epd.category}
                        </Badge>
                      )}
                      {epd.certifications && epd.certifications.map((cert: string) => (
                        <Badge key={cert} variant="secondary" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>

                    {/* Environmental Impact */}
                    {epd.gwp && (
                      <div className="mt-3 text-xs space-y-1">
                        <div className="text-muted-foreground">
                          <span className="font-medium">GWP:</span> {epd.gwp} kg CO₂-eq
                        </div>
                        {epd.ap && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">AP:</span> {epd.ap} kg SO₂-eq
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedEpds.includes(epd.id)}
                    onChange={() => {}}
                    className="mt-1"
                  />
                </div>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelected}
              disabled={selectedEpds.length === 0 || isFetching}
              className="gap-2"
            >
              {isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add {selectedEpds.length > 0 ? `(${selectedEpds.length})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
