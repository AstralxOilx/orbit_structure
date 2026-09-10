# Shared UI and theme

## Theme ownership

`app/layout.tsx` installs one `ThemeProvider` from `shared/theme/theme-provider.tsx`. It uses the installed `next-themes` provider and writes `data-theme` on `<html>` before first paint. The existing `orbit.theme` storage key is preserved. Dark is the default when no preference is saved; Light, Dark and System are supported. Preferences propagate across pages and browser tabs. Workspace's Zustand store now owns navigation preferences only.

Theme controls wait for hydration before enabling interaction. Server and initial client markup match, and the placeholder occupies the same space as the resolved icon. The Tailwind `dark:` variant follows `data-theme`, rather than a separate OS-only media query.

```tsx
"use client";

import { ThemeToggle, ThemeSelect, useTheme } from "@/shared/theme";

export function AppearanceSettings() {
  const { resolvedTheme, ready } = useTheme();
  return (
    <section>
      <ThemeToggle />
      <ThemeSelect label="Appearance" />
      {ready && <p>Current appearance: {resolvedTheme}</p>}
    </section>
  );
}
```

Do not create another provider inside a page or write to `document.documentElement.dataset.theme` from a feature. Use the shared hook for custom controls. The shared toggle is used by both the workspace sidebar and the Login / Sign Up header. Workspace settings use the shared selector, including the System option.

Global palette tokens live in `shared/theme/tokens.css`. Auth palette tokens live in `shared/theme/auth-tokens.css`; the auth layout maps those to the same semantic foreground/surface/accent names. Auth no longer forces dark mode locally. `app/globals.css` imports both palettes, the common UI stylesheet, workspace styling and the Tailwind token bridge once.

## UI components

`shared/ui.tsx` has been replaced with a directory. `shared/ui/index.ts` preserves the convenient `@/shared/ui` import for generic UI; direct imports are also available.

| File | Responsibility |
| --- | --- |
| `button.tsx` | Button variants, loading state and forwarded native props |
| `input.tsx` | Label, validation, optional icon and keyboard-accessible password visibility |
| `date-input.tsx` | Controlled ISO date field, themed calendar popover, min/max, keyboard navigation and validation text |

Date inputs store calendar dates as `YYYY-MM-DD` strings. `DateInput` keeps
native typing and form semantics while adding the shared calendar popover; use
`density="compact"` for inline task properties and provide `min`/`max` when
dates define an interval.
| `checkbox.tsx` | Native checkbox, label and associated validation error |
| `icon-button.tsx` | Named icon action with tooltip and accessible label |
| `dialog.tsx` | Native modal, Escape/backdrop dismissal and focus restoration |
| `avatar.tsx` | Presentational avatar from name, initials, color and size |
| `tag.tsx` | Presentational tag from name and color |
| `orbit-mark.tsx` | Shared brand symbol |
| `empty-state.tsx` | Empty-state message and optional action |
| `view-skeleton.tsx` | View loading placeholder |
| `styles.css` | Generic component styling, using shared theme tokens |

```tsx
import { Avatar, Button, Input, Tag } from "@/shared/ui";

// In a Client Component when using form handlers:
<Input label="Display name" autoComplete="name" />
<Button type="submit">Save changes</Button>
<Avatar name="Jamie Lee" initials="JL" color="purple" size="sm" />
<Tag name="Draft" color="blue" />
```

Generic components do not import feature data. `MemberAvatar` in `features/workspace/ui/member-avatar.tsx` resolves workspace member IDs. `TaskTag`, `StatusIcon` and `PriorityBadge` in `features/tasks/ui` own task-specific mappings. Date formatting lives in `shared/lib/format-date.ts`, separate from UI rendering.

The old `components/ui/Button`, `Input` and `Checkbox` paths remain thin compatibility re-exports. New pages should import from `shared/ui`. Existing feature callers have been migrated to the generic components and feature adapters.

## Validation

Run `npx playwright test tests/e2e/auth.spec.ts tests/e2e/theme.spec.ts` with the app running. Tests cover theme persistence, auth-to-workspace navigation, cross-tab synchronization, System preference changes, form values surviving a theme toggle, keyboard/mobile behavior and automated accessibility checks in both auth themes.
