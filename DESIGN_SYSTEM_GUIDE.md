# Design System Guide - Modern Windows Panel Style

## Quick Start for Developers

### Form Dialog Template

Use this template for all new form dialogs to maintain consistency:

```jsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MyFormDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Form Title</DialogTitle>
          <DialogDescription>Brief description of what this form does</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-4">
          {/* First Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="field1" className="text-xs font-semibold">
                Field Label
              </Label>
              <Input
                id="field1"
                placeholder="Placeholder text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          {/* Subsequent Sections with Dividers */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-border/30">
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="field2" className="text-xs font-semibold">
                Another Field
              </Label>
              <Input
                id="field2"
                placeholder="Placeholder text"
                value={value2}
                onChange={(e) => setValue2(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2 border-t border-border/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Core Styling Tokens

### Spacing
- **Form gaps**: `gap-2.5` (between fields), `gap-5` (between sections)
- **Padding**: `px-3 py-2` (inputs), `p-3` (cards), `p-6` (dialogs)
- **Section padding**: `pt-2` (after border)

### Borders & Dividers
- **Input borders**: `border border-border`
- **Section dividers**: `border-t border-border/30` (with `pt-2`)
- **Card borders**: `border border-border`
- **Dialog header divider**: `pb-2 border-b border-border/50`

### Typography
- **Form labels**: `text-xs font-semibold`
- **Dialog titles**: `text-xl`
- **Help text**: `text-xs text-muted-foreground`

### Component Sizing
- **Input heights**: `h-10` (default), `h-8` (sm)
- **Textarea min-height**: `min-h-24`
- **Avatar sizes**: `h-16 w-16` (profile), `h-10 w-10` (small)

### Colors
- **Primary**: Green (maintained)
- **Borders**: `border-border` (css variable)
- **Backgrounds**: `bg-background`, `bg-card`, `bg-muted/30`
- **Text**: `text-foreground`, `text-muted-foreground`

## Component Guidelines

### Inputs
```jsx
<Input
  id="unique-id"
  placeholder="Placeholder text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```
- Always wrap in label
- Always use placeholder for guidance
- Always use unique ID for accessibility
- Height: h-10 (auto)
- Borders: border-border

### Labels
```jsx
<Label htmlFor="input-id" className="text-xs font-semibold">
  Label Text
</Label>
```
- Always associate with input using htmlFor
- Apply className: `text-xs font-semibold`
- Place above or beside input

### Select Dropdowns
```jsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger id="select-id">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```
- Match input styling automatically
- Use SelectValue for placeholder support
- Always provide ID

### Textareas
```jsx
<Textarea
  id="textarea-id"
  placeholder="Multiple lines of text..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```
- Min-height: min-h-24
- Use for longer text input
- Placeholder guidance recommended

### Buttons
```jsx
{/* Primary */}
<Button onClick={handleAction}>
  Action Label
</Button>

{/* Secondary/Outline */}
<Button variant="outline" onClick={handleAction}>
  Cancel
</Button>

{/* With Icon */}
<Button className="gap-2">
  <Icon className="h-4 w-4" />
  Button Text
</Button>
```
- Primary for main actions
- Outline for cancel/secondary
- Use gap-2 when including icons
- Height: h-10 (auto)

## Form Section Patterns

### Two-Column Layout
```jsx
<div className="grid gap-2.5 sm:grid-cols-2 w-full">
  <div className="flex flex-col gap-2.5">
    <Label htmlFor="field1">Field 1</Label>
    <Input id="field1" />
  </div>
  <div className="flex flex-col gap-2.5">
    <Label htmlFor="field2">Field 2</Label>
    <Input id="field2" />
  </div>
</div>
```

### Three-Column Layout
```jsx
<div className="grid gap-2.5 sm:grid-cols-3 w-full">
  {/* 3 fields */}
</div>
```

### Section with Divider
```jsx
<div className="flex flex-col gap-2.5 pt-2 border-t border-border/30">
  {/* Section content */}
</div>
```

## Common Patterns

### Card with Border
```jsx
<div className="rounded-md border border-border/50 bg-muted/30 p-3">
  Content here
</div>
```

### Info Box with Icon
```jsx
<div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
  <strong>Warning:</strong> Message text
</div>
```

### Avatar + Info
```jsx
<div className="flex items-center gap-3 p-3 rounded-md border border-border/50 bg-muted/30">
  <Avatar>
    <AvatarImage src={url} />
    <AvatarFallback>Initials</AvatarFallback>
  </Avatar>
  <div>
    <p className="font-medium text-sm">Name</p>
    <p className="text-xs text-muted-foreground">Subtitle</p>
  </div>
</div>
```

## Accessibility Best Practices

### Labels & IDs
- Every input needs a unique ID
- Every label needs htmlFor matching the ID
- Use descriptive label text

### Focus Management
- All inputs show focus ring: `focus-visible:ring-1 focus-visible:ring-primary/50`
- Dialog should trap focus
- Keyboard navigation should work smoothly

### Color Contrast
- Text on backgrounds meets WCAG AA standards
- Use semantic colors (don't rely on color alone)
- Provide alternative indicators (icons, text)

### Semantic HTML
- Use proper HTML elements (button, input, label)
- Use <dialog> component for modals
- Maintain proper heading hierarchy

## Dark Mode Support

All components automatically support dark mode via:
- CSS custom properties
- `dark:` prefixes for dark-specific styles
- Automatic contrast adjustments

No special handling needed in components.

## Responsive Design

Forms follow mobile-first approach:
- Single column on mobile
- Multi-column on larger screens: `sm:grid-cols-2`, `sm:grid-cols-3`
- Touch-friendly button sizes: min h-10

## Performance Tips

1. Use controlled components for form state
2. Avoid re-renders of entire dialogs
3. Lazy-load dialog content if needed
4. Use React Hook Form for complex forms
5. Memoize dialog components if rendering frequently

## Common Issues & Solutions

### Input not showing border
✓ Ensure `className="border border-border"` is applied
✓ Check that Input component is imported from `@/components/ui/input`

### Label not aligned
✓ Apply `className="text-xs font-semibold"` to Label
✓ Use flex-col with gap-2.5 parent

### Dialog too wide/narrow
✓ Adjust max-w-* class: `max-w-sm`, `max-w-md`, `max-w-lg`, `max-w-2xl`
✓ Default: `max-w-lg`

### Sections not separating
✓ Use `pt-2 border-t border-border/30` on section div
✓ Apply before the content, not after

---

For more details, see `DESIGN_UPDATES.md`
