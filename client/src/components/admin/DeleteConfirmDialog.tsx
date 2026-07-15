import { useState, useEffect, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /**
   * When set, the admin must type this exact string (e.g. the user's email or
   * the record name) to enable the confirm button — a deliberate friction step
   * for destructive actions.
   */
  confirmWord?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
}

/**
 * Reusable confirmation dialog for admin destructive actions.
 * - Single-confirm mode (no `confirmWord`) for soft-deletes and restores.
 * - Type-to-confirm mode (`confirmWord` set) for user deletes and all purges.
 * The dialog stays open on confirm (parent closes it on mutation success).
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord,
  confirmLabel = "Delete",
  onConfirm,
  isPending = false,
}: DeleteConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  // Clear the typed confirmation whenever the dialog is closed/reopened.
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const needsWord = Boolean(confirmWord);
  const wordMatches = !needsWord || typed.trim() === confirmWord;
  const canConfirm = wordMatches && !isPending;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-gray-800 bg-gray-900 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {needsWord && (
          <div className="space-y-2">
            <label htmlFor="confirm-word" className="block text-sm text-gray-300">
              Type{" "}
              <span className="font-mono font-semibold text-white">{confirmWord}</span>{" "}
              to confirm
            </label>
            <Input
              id="confirm-word"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="border-gray-700 bg-gray-800 text-white"
              placeholder={confirmWord}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm}
            onClick={(e) => {
              e.preventDefault();
              if (canConfirm) onConfirm();
            }}
            className="bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
