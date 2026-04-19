'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A reusable component for grouping related form fields together with optional title and description.
 * Provides consistent spacing and visual separation between field groups.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {(title || description) && (
        <div className="flex flex-col gap-1">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
