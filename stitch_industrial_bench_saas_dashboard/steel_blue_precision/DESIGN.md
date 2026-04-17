# Design System Specification: Architectural Precision

## 1. Overview & Creative North Star
**Creative North Star: The Industrial Blueprint**
This design system moves away from the "software-as-a-service" template and moves toward the aesthetic of high-end architectural blueprints and precision instrumentation. In an industrial context, data density is a requirement, but visual noise is the enemy. This system achieves clarity not through rigid borders, but through **Tonal Layering** and **Intentional Asymmetry**. 

The goal is to create a digital command center that feels like a physical piece of premium hardware. We use a high-contrast typography scale to create an editorial feel, ensuring that even in a high-density environment, the most critical "Industrial Truths" (status, alerts, and metrics) are immediately legible.

---

## 2. Colors & Surface Logic
The palette is rooted in deep, atmospheric blues and technical cyans. We treat color as a functional tool for hierarchy rather than decoration.

### The "No-Line" Rule
Standard dashboards rely on 1px borders to separate content. This design system **prohibits 1px solid borders** for sectioning. Boundaries must be defined solely through:
1.  **Background Color Shifts:** Placing a `surface_container_low` element against a `surface` background.
2.  **Tonal Transitions:** Using subtle shifts between `surface_container` tiers to denote change in context.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following hierarchy to create "nested" depth:
*   **Base Layer:** `surface` (#0b1326) – The primary canvas.
*   **Structural Sections:** `surface_container_low` (#131b2e) – Large layout blocks like sidebars.
*   **Primary Interaction Cards:** `surface_container` (#171f33) – The default state for data cards.
*   **Elevated Details:** `surface_container_high` (#222a3d) – Used for hover states or active "drilled-down" content.

### The "Glass & Gradient" Rule
To elevate the industrial aesthetic, use **Glassmorphism** for floating elements (modals, language toggles, or tooltips). 
*   **Implementation:** Use `surface_variant` with a 60% opacity and a 12px `backdrop-blur`.
*   **Signature Textures:** For primary Action Buttons or high-level KPIs, apply a subtle linear gradient from `primary` (#adc6ff) to `on_primary_container` (#357df1) at a 135-degree angle. This provides a "machined" metallic sheen that flat colors lack.

---

## 3. Typography: The Editorial Edge
We use a dual-font strategy to balance technical precision with high-end editorial authority.

*   **Display & Headlines (Manrope):** Chosen for its geometric, modern structure. Use `display-lg` and `headline-md` for high-level facility names or primary metrics. These should always utilize the `primary` (#adc6ff) or `on_surface` (#dae2fd) tokens to ensure they act as visual anchors.
*   **Body & Technical Data (Inter):** Chosen for its exceptional legibility at high densities. Use `body-sm` and `label-md` for the bulk of the dashboard data. 
*   **The Blue Hierarchy:** Never use pure black or neutral grey for text. All typography must utilize the blue-shifted tokens (e.g., `on_surface_variant` for secondary labels) to maintain the signature atmospheric feel.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Stack `surface_container_lowest` cards on top of a `surface_container_low` sidebar to create a soft, natural lift.
*   **Ambient Shadows:** For floating elements (like the Language Toggle), use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(6, 14, 32, 0.5)`. The shadow color must be derived from `surface_container_lowest` to feel like a natural light obstruction.
*   **The "Ghost Border" Fallback:** If a border is required for high-density data tables, use the `outline_variant` (#45464d) at **15% opacity**. This creates a "suggestion" of a line without cluttering the visual field.

---

## 5. Components

### Sidebar Navigation
*   **Visuals:** Use `surface_container_low`. Do not use a vertical line to separate it from the main content; use the color contrast against the `surface` background.
*   **Active State:** Use a `primary_container` background with a `primary` "glow" (a 2px wide vertical bar on the left edge).

### Industrial Status Indicators
*   **OK/Aprovado:** Use `tertiary` (#89ceff) or a custom emerald tint. The indicator should be a small "Status Chip" with a soft outer glow of the same color (4px blur).
*   **NK/Reprovado:** Use `error` (#ffb4ab). For high-priority failures, use `error_container` as a background for the entire card to demand immediate attention.

### Language Toggle (PT-BR/EN)
*   **Visuals:** A "pill" shaped container using `surface_container_highest` and a `full` roundedness. 
*   **Interaction:** Use a sliding "glass" indicator that moves behind the active flag/text, using the Glassmorphism rules (backdrop-blur).

### Data Cards
*   **Constraint:** **Forbid all divider lines.**
*   **Hierarchy:** Use vertical white space (referencing the `md` or `lg` spacing scale) to separate the Title from the Data Points.
*   **Density:** Use `body-sm` for labels and `title-lg` for the primary metric to create a clear "Scan-Path."

### Buttons
*   **Primary:** Gradient fill (Primary to On-Primary-Container), `md` roundedness, and `label-md` uppercase text for a technical, "button-press" feel.
*   **Secondary:** Ghost style. No fill, `outline_variant` (20% opacity) border, and `primary` text.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts for the dashboard header to create a custom, high-end feel.
*   **Do** prioritize "Breathing Room." Even in high-density displays, ensure at least `0.75rem` (xl) of padding inside containers.
*   **Do** use `on_surface_variant` for units of measurement (e.g., "kg", "psi", "temp") to keep them subordinate to the numerical data.

### Don't
*   **Don't** use pure white (#FFFFFF). It breaks the atmospheric depth of the blue-scale industrial theme.
*   **Don't** use default Material Design shadows. They are too "dirty." Use the Ambient Shadow rule defined in section 4.
*   **Don't** use standard 1px dividers to separate list items. Use a `surface_container_low` background on zebra-striped rows or simply use increased vertical padding.