<!-- 270e4f43-6969-4fdf-9210-313ecbe42959 49d9b070-ada7-4463-8747-cb7ae1f2c4ca -->
# Implement ULD Number Modal in Mobile

## Overview

Port the ULD number modal functionality from emirates-desktop to emirates-mobile. The modal should look identical, and both apps must share the same schema for database compatibility.

## Changes Made in Desktop (Reference)

### 1. New Files Created

- `components/uld-number-modal.tsx` - Modal component for entering ULD numbers
- `lib/uld-parser.ts` - Utility functions for parsing and formatting ULD sections

### 2. Modified Files

- `components/use-load-plan-state.ts` - Added `uldNumbers` state (Map<string, string[]>) and `updateULDNumbers` function
- `components/load-plan-detail-screen.tsx` - Added modal integration, click handlers, and display of ULD numbers + Final section

### 3. Key Features

- Click on ULD section (e.g., "XX 01PMC XX") opens modal
- Modal shows textboxes equal to parsed count (e.g., "XX 02PMC XX" = 2 textboxes)
- Each row has a native HTML `<select>` dropdown to choose ULD type (PMC, AKE, etc.) - configurable per row
- When + button is clicked, adds new row with dropdown 1, dropdown 2, etc.
- Inline delete buttons per row
- "Add ULD" button at bottom
- ULD numbers display to left of section
- "Final: XX 02PMC XX" displays to right of section based on saved count
- No focus ring highlight on inputs

## Implementation Plan for Mobile

### Phase 1: Create Shared Utilities

**File**: `emirates-mobile/lib/uld-parser.ts`

- Copy `uld-parser.ts` from desktop exactly
- Contains `parseULDSection()` and `formatULDSection()` functions
- Ensures consistent parsing logic across both apps

### Phase 2: Create ULD Number Modal Component

**File**: `emirates-mobile/components/uld-number-modal.tsx`

- Copy from desktop exactly (same component, same props interface)
- Modal should look identical to desktop version
- Same styling, same functionality
- Mobile-friendly but maintains desktop appearance

### Phase 3: Add State Management to Mobile Component

**File**: `emirates-mobile/components/mobile-load-plan-modal.tsx`

- Add state for ULD numbers: `const [uldNumbers, setUldNumbers] = useState<Map<string, string[]>>(new Map())`
- Add state for modal: `const [showULDModal, setShowULDModal] = useState(false)`
- Add state for selected section: `const [selectedULDSection, setSelectedULDSection] = useState<{sectorIndex: number, uldSectionIndex: number, uld: string} | null>(null)`
- Add `updateULDNumbers` function (same as desktop)

### Phase 4: Integrate Modal and Click Handlers

**File**: `emirates-mobile/components/mobile-load-plan-modal.tsx`

- Import `ULDNumberModal` and `parseULDSection`, `formatULDSection`
- Add click handler to ULD section rows (lines 283-289, 305-311, 565-568, 587-590)
- Make ULD sections clickable (add onClick handler)
- Render modal at bottom of component (before closing tags)
- Pass correct props to modal

### Phase 5: Display ULD Numbers and Final Section

**File**: `emirates-mobile/components/mobile-load-plan-modal.tsx`

- Update ULD section display to show:

  1. ULD numbers to the left (if saved)
  2. Original section text in center
  3. "Final: XX 02PMC XX" to the right (if ULD numbers exist)

- Use same layout pattern as desktop but adapted for mobile horizontal scroll
- Add tooltip on hover for ULD numbers (subtle, like desktop)

### Phase 6: Ensure Schema Compatibility

**Database Schema Considerations:**

- Both apps should store ULD numbers using same key format: `${sectorIndex}-${uldSectionIndex}`
- ULD numbers stored as `string[]` array
- When saving to database, ensure both apps use same field names and structure
- Consider creating shared type definitions if needed

## File Structure

```
emirates-mobile/
├── lib/
│   └── uld-parser.ts (NEW - copy from desktop)
├── components/
│   ├── uld-number-modal.tsx (NEW - copy from desktop)
│   └── mobile-load-plan-modal.tsx (MODIFY - add state, handlers, display)
```

## Key Implementation Details

### ULD Section Click Handler

```typescript
onClick={() => {
  setSelectedULDSection({
    sectorIndex,
    uldSectionIndex: actualUldSectionIndex,
    uld: uldSection.uld
  })
  setShowULDModal(true)
}}
```

### Display Pattern (Mobile)

```typescript
<div className="flex items-center gap-2">
  {hasULDNumbers && (
    <div className="text-xs text-gray-500 truncate max-w-[150px]">
      {displayNumbers}
    </div>
  )}
  <div className="flex-1 text-center">{uldSection.uld}</div>
  {finalSection && (
    <div className="text-xs text-gray-600">
      Final: {finalSection}
    </div>
  )}
</div>
```

### Modal Integration

```typescript
{selectedULDSection && (
  <ULDNumberModal
    isOpen={showULDModal}
    onClose={() => {
      setShowULDModal(false)
      setSelectedULDSection(null)
    }}
    uldSection={selectedULDSection.uld}
    sectorIndex={selectedULDSection.sectorIndex}
    uldSectionIndex={selectedULDSection.uldSectionIndex}
    initialNumbers={uldNumbers.get(`${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`) || []}
    onSave={(numbers) => {
      updateULDNumbers(selectedULDSection.sectorIndex, selectedULDSection.uldSectionIndex, numbers)
    }}
  />
)}
```

## Testing Checklist

- [ ] Modal opens when clicking ULD section
- [ ] Correct number of textboxes shown based on parsed count
- [ ] Can type in textboxes
- [ ] Can add/remove ULDs
- [ ] Can save ULD numbers
- [ ] ULD numbers display correctly to left of section
- [ ] Final section displays correctly to right
- [ ] Mobile layout doesn't break
- [ ] Schema matches desktop for database compatibility

## Additional Features (AWB Row Split Functionality)

### AWB Row Split Click Behavior

- **Left Section (SER through SHC)**: Clicking opens Quick Action Modal
  - "Mark ULD as Fully Loaded" - marks AWB as loaded
  - "Mark Remaining Pieces for Offload" - adds offload info to BCR
- **Right Section (MAN.DESC onward)**: Clicking opens AWB Assignment Modal (existing functionality)
- **Hover Behavior**: Entire left/right sections highlight together (not cell-by-cell)
  - Left section: Blue highlight (`bg-blue-50`) when hovering any cell in left section
  - Right section: Gray highlight (`bg-gray-50`) when hovering any cell in right section
  - Uses `useState` to track `hoveredSection` state ("left" | "right" | null)
  - All cells in the hovered section get the highlight class simultaneously

### Implementation Details for Split Hover

```typescript
const [hoveredSection, setHoveredSection] = useState<"left" | "right" | null>(null)

// Left section cells
{leftFields.map(({ key, className }) => (
  <td
    className={`px-2 py-1 ${hoveredSection === "left" && isReadOnly ? "bg-blue-50" : ""}`}
    onMouseEnter={() => isReadOnly && setHoveredSection("left")}
    onMouseLeave={() => setHoveredSection(null)}
  >
    {/* ... */}
  </td>
))}

// Right section cells
{rightFields.map(({ key, className }) => (
  <td
    className={`px-2 py-1 ${hoveredSection === "right" && isReadOnly ? "bg-gray-50" : ""}`}
    onMouseEnter={() => isReadOnly && setHoveredSection("right")}
    onMouseLeave={() => setHoveredSection(null)}
  >
    {/* ... */}
  </td>
))}
```

## Notes

- Mobile is read-only for load plans, but ULD number entry should still work (it's metadata, not editing the plan itself)
- Modal should be responsive but maintain desktop appearance
- Ensure horizontal scroll works properly with new layout
- Both apps must use identical key format for database compatibility
- **AWB Row Split**: Implement same split-row functionality in mobile with section-wide hover highlights

### To-dos

- [x] Update parser to extract counts from ULD sections (e.g., 02PMC -> 2)
- [x] Add +/- buttons to modal for adding/removing ULDs
- [x] Update modal to show correct number of textboxes based on parsed count
- [x] Add 'Final: XX 02PMC XX' display next to section text
- [x] Change focus ring color from red (#D71A21) to neutral blue/gray in text input
- [x] Add inline delete button (trash icon) to each ULD row
- [x] Remove global +/- buttons and add "Add ULD" button at bottom of list
- [x] Verify add/remove functionality works correctly with proper state updates
- [x] Implement AWB row split functionality (left section = quick actions, right section = assignment modal)
- [x] Implement section-wide hover highlights (entire left/right sections highlight together)