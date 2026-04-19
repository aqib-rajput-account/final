'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DialogFormWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCancel?: () => void;
  submitButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
  isOpen?: boolean;
  showFooter?: boolean;
  className?: string;
}

/**
 * A reusable wrapper for modal forms with consistent styling following the Windows panel design system.
 * Provides standardized dialog structure, spacing, and form actions.
 */
export function DialogFormWrapper({
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitButtonText = 'Save',
  cancelButtonText = 'Cancel',
  isLoading = false,
  showFooter = true,
  className,
}: DialogFormWrapperProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <DialogContent className={cn('max-w-md sm:max-w-lg', className)}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {children}

        {showFooter && (
          <DialogFooter className="gap-2 pt-4 border-t border-border/50">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                {cancelButtonText}
              </Button>
            )}
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {submitButtonText}
            </Button>
          </DialogFooter>
        )}
      </form>
    </DialogContent>
  );
}
