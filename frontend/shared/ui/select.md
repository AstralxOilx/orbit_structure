# Select

Import `Select` from `@/shared/ui`. It accepts native select props and a ref to
the select element, including `value`, `defaultValue`, `onChange`, `name`,
`required`, `disabled`, and ARIA attributes.

```tsx
import { Select } from "@/shared/ui";

<label>
  Priority
  <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
    <option value="normal">Medium</option>
    <option value="high">High</option>
  </Select>
</label>
```

Use `density="compact"` in toolbars and tables, and `variant="subtle"` for inline
controls. Regular density is the default for forms. Always provide a label,
either with a wrapping label, `htmlFor`, or `aria-label`. Connect validation
messages using `aria-invalid` and `aria-describedby`.

Styles are loaded by the root stylesheet and use the shared light/dark theme
tokens. Inside `.auth-shell`, controls inherit the authentication palette.
Browsers supporting `appearance: base-select` receive a themed popup; other
browsers retain their native picker with a styled closed control. Native
keyboard navigation, form submission and validation remain available.
