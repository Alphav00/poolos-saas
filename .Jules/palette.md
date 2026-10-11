## 2025-05-18 - Multi-input Component Form Labeling
**Learning:** A single `<label>` wrapping or preceding multi-input composite controls (like two-box DistanceInput) triggers Svelte compiler A11y warnings if unassociated. Using `<div class="label">` for header grouping combined with explicit per-input `aria-label`s provides clean screen reader context without HTML spec violations.
**Action:** When component layouts bundle multiple inputs under one visual label header, use container styling for the visual text and assign clear, descriptive `aria-label`s to each individual input control.
