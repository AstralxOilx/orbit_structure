# DateInput

```tsx
import { DateInput } from "@/shared/ui";

<DateInput
  label="Due date"
  value={dueOn}
  onValueChange={setDueOn}
  min={startOn || undefined}
  name="dueOn"
/>
```

`value` is an ISO calendar date (`YYYY-MM-DD`) or an empty string. The component
is controlled: use `onValueChange`, not a synthetic change event. It forwards its
ref to the native date input and accepts native form props such as `name`,
`required`, `disabled`, `readOnly`, `min`, `max`, `onBlur`, and ARIA attributes.
Use `label` or an accessible name (`aria-label` / `aria-labelledby`). Do not nest
it inside a label: it contains an input, trigger, and interactive calendar.

`density="compact"` fits task properties. `error` and `hint` connect descriptive
text to the field. `className` styles the outer field. Shared tokens style the
field and calendar in light/dark themes; the auth shell uses auth palette tokens.

The calendar uses the browser popover top layer to avoid dialog/scroller clipping.
The trigger falls back to the native picker when popovers are unsupported.
Native date typing remains available. Alt + Down opens the calendar; arrows move
by day/week, Home/End by weekday, Page Up/Down by month, Shift + Page Up/Down by
year. Escape closes the calendar. Today, Clear and Done actions are provided;
Clear is disabled for required fields, and dates outside min/max are disabled.

Date calculations use calendar-day arithmetic, with Today taken from the user's
local date. No conversion of stored dates to local timestamps is performed.
