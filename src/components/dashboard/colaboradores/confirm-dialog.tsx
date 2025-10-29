"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ConfirmDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  // description can be string or a React node (list, buttons, etc.)
  description?: React.ReactNode
  confirmText: string
  cancelText?: string
  onConfirm: () => void
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText = "Cancelar",
  onConfirm,
  variant = "default"
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {typeof description === 'string' ? (
            <p className="text-gray-600">{description}</p>
          ) : (
            description
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          {confirmText.length > 0 && <Button variant={variant} onClick={handleConfirm}>
            {confirmText}
          </Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}