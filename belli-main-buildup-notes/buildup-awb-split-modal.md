# Belli Build Up & AWB Split Modal – Code Map

This document lists the key files involved in the Build Up flow and the Split AWB modal, and explains what each one does and how they connect.

## 1. Build Up Page Shell

- `belli-main/app/operations/build-up/page.tsx`
  - Entry point for the Operations → Build Up page.
  - Lets the user select a station (location) and a flight, then renders the ULD assignment section.
  - Key pieces:
    - Uses `useGlobalLocation` to pull station options and manage the selected station.
    - Renders `SectionFlightSelect` to pick a `Flight` to build up.
    - Renders `SectionUldAssignment` with the currently selected flight.
  - This file is the top-level container; it doesn’t implement AWB splitting itself, but it is the root of the buildup experience.

## 2. Core Build Up Assignment Logic

- `belli-main/app/operations/build-up/components/section-uld-assignment.tsx`
  - Main stateful component that drives the actual buildup workflow for a selected flight.
  - Responsibilities:
    - Fetch build-up data for the selected flight via `useBuildUpData({ flight_id })`.
    - Compute `acceptedOrders` from `buildUpData.accepted_orders` using `transformOrderShipment`.
    - Maintain and sync `BuildUpDataState` (available orders, ULDs, bulk load orders, offloaded orders) using `useBuildUpPersistence` and a React Hook Form instance (`BuildUpFormValues`).
    - Handle search, filters, and finalized / reopening state.
    - Wire up all major actions:
      - Assigning orders to ULDs.
      - Moving orders to Bulk Load.
      - Offloading orders to Lying List.
      - Opening dialogs (cargo manifest, offload, bulk offload, shipment details).
      - Opening the Split AWB dialog and applying the split.
      - Finalizing or reopening buildup via `useFinalizeBuildUp`.
  - Split AWB–specific pieces:
    - Imports `SplitAwbDialog` and passes down `buildUpState`, the selected `OrderShipmentData`, and a callback to confirm the split.
    - Maintains local state for which AWB is being split (e.g. something like `selectedOrderForSplit` and `isSplitDialogOpen`).
    - Implements `onConfirmSplit` to:
      - Replace the original order with the returned split groups in the relevant collections (`ulds`, `bulkLoadOrders`, `availableOrders`, `offloadedOrders`).
      - Ensure totals and partial flags (`is_split`, `is_partial`) are consistent.
      - Persist the updated `BuildUpDataState` via the form and background sync.

## 3. Split AWB Modal (UI Shell)

- `belli-main/app/operations/build-up/components/dialog-split-awb-v2.tsx`
  - Implements the actual Split AWB modal (dialog) UI.
  - Props:
    - `open`: controls visibility.
    - `onOpenChange(open: boolean)`: called when dialog opens/closes.
    - `order: OrderShipmentData | null`: the original AWB shipment being split.
    - `onConfirmSplit(data: OrderShipmentData[], orderId: string)`: callback fired when user confirms the split; `data` is the list of split groups (as `OrderShipmentData` objects) for that AWB.
    - `initialSplitGroups?: OrderShipmentData[]`: pre-populated split groups if the AWB was already split.
    - `buildUpState?: BuildUpDataState`: current buildup state, used to infer existing assignments of split groups.
  - UI behavior:
    - Wraps content in `Dialog` / `DialogContent` and displays:
      - Header with `Split AWB` title and the current AWB number (`order?.awb`).
      - Tabbed interface (currently only the “Simple Split” tab is active; the advanced tab is commented out).
      - `OriginalOrderInfoCard` showing original AWB pieces and weight.
    - Renders `SimpleSplitTab` inside `TabsContent` when `open` is true, passing `order`, `buildUpState`, and callbacks.
  - `OriginalOrderInfoCard`:
    - Shows the original AWB, total pieces and total weight as a small summary card.
    - Advanced/parcel-level breakdown logic (HAWB / piece details) is present but commented out.

## 4. Simple Split Logic (inside the Modal)

- `belli-main/app/operations/build-up/components/section-simple-awb-split.tsx`
  - Implements the “Simple Split” tab within the split dialog—this is where the actual splitting and (optional) assignment to ULD/Bulk/Offloaded happens.
  - Key types:
    - `SimpleSplitGroup`:
      - `id: string` – local group ID.
      - `weight_kg: number` – weight for this split group.
      - `pieces: number` – piece count for this split group.
      - `assignment?` – optional assignment metadata:
        - `type: "uld" | "bulk" | "offloaded"`.
        - `id: string` (ULD ID, or sentinel IDs for bulk/offloaded).
        - `name: string` (e.g. ULD number, “Bulk Load”, “Offloaded”).
    - `SimpleSplitFormValues` with `simple_split_groups: SimpleSplitGroup[]`.
  - Initialisation:
    - `getInitialValues()` creates a default form with one empty split group.
    - `getInitialFormValues(initialSplitGroups, buildUpState)`:
      - If there are at least 2 `initialSplitGroups`, maps them into `simple_split_groups` and determines each group’s `assignment` by checking:
        - Whether the group shipment is present in any ULD’s `orders` → `type: "uld"`.
        - Whether it is in `bulkLoadOrders` → `type: "bulk"`.
        - Whether it is in `offloadedOrders` → `type: "offloaded"`.
      - Otherwise falls back to `getInitialValues()`.
  - Form behavior:
    - Uses `react-hook-form` and `useFieldArray` to manage the array of split groups.
    - Watches `simple_split_groups` and the original `order` to calculate:
      - Remaining pieces / weight.
      - Whether totals exceed the original order.
      - Whether auto-fill helpers should be enabled.
    - Provides utility handlers:
      - `onAutoFillRemaining` – fill the last group with whatever pieces/weight remain.
      - `onRemoveSplitGroup` – remove a group, recalculating and keeping at least one group.
      - Piece/weight change handlers that ensure numbers stay non-negative and within valid bounds.
    - Validation:
      - Ensures the sum of all groups’ pieces and weight does not exceed original totals.
      - Provides user feedback strings like:
        - "Totals of split group exceeds original total weight and pieces."
        - "Remaining weight and pieces will be automatically allocated as a separate split group."
    - Submission (`onSubmit`):
      - Builds a list of `OrderShipmentData` split groups from the form values, preserving the AWB and base order metadata.
      - Each split group becomes its own shipment instance with appropriate `pieces`, `weight_kg`, `total_pieces`, `total_weight_kg`, and `is_split` / `is_partial` flags.
      - Calls `onConfirmSplit(splitGroups, order.id)` (prop from the dialog), then closes the dialog via `onOpenChange(false)`.
  - UI:
    - Renders a card per split group, with:
      - Group title (Group 1, Group 2, …).
      - Optional `Badge` showing assignment (ULD number, `Bulk Load`, or `Offloaded`) with appropriate icon.
      - `InputSwitch` controls for pieces and weight, one row each.
      - "Add Group" button to append new split groups.
    - Dialog footer:
      - `Cancel` – closes dialog without applying.
      - `Reset` – resets to initial form values.
      - `Confirm Split` – submits if validation passes.

## 5. AWB Card (Triggers the Split Modal)

- `belli-main/app/operations/build-up/components/card-awb.tsx`
  - Card component used to display each AWB/Shipment within the buildup interface.
  - Props include handlers wired from `SectionUldAssignment`:
    - `onSplit(order: OrderShipmentData)` – open the split dialog for this AWB.
    - `onUnsplit(order: OrderShipmentData)` – revert split.
    - `onOffload(order: OrderShipmentData)` – move to lying list.
    - `onViewDetails(order: OrderShipmentData)` – open shipment details dialog.
  - Split-related behavior:
    - `isSplit` is computed as `order.pieces < order.total_pieces`.
    - `AWB_ACTIONS` menu entries:
      - "Split AWB" → calls `onSplit(order)`.
      - If already split, shows "Unsplit AWB" and "Adjust Split" instead.
    - Inline button:
      - If not finalized, shows a `Split AWB` / `Adjust Split` pill button next to badges.
      - Clicking it calls `onSplit(order)` and opens `SplitAwbDialog` from the parent.
  - Assignment behavior (broader than splitting):
    - Card is draggable when buildup is not finalized, so it can be dragged into a ULD or Bulk container.
    - Shows badges for `Replanned` and `Split` states.

## 6. Types and Payloads for Build Up & Split

- `belli-main/app/operations/build-up/types/build-up.ts`
  - Defines all types used around buildup and splitting.
  - Relevant types for AWB split:
    - `SplitParcelData` and `SplitGroup` – data structures for advanced parcel-level split (used by older/advanced flow, mostly in commented-out code).
    - `OrderShipmentData` – central shipment shape used across buildup:
      - Includes `awb`, `order_id`, `pieces`, `weight_kg`, totals, commodity, SHCs, location, and state flags like `is_partial`, `is_split`, `is_replanned`.
    - `OrderShipmentPayloadData` – payload representation used when sending final buildup data to the API.
    - `BuildUpDataState` – structure used by the buildup UI:
      - `availableOrders` – pool of unassigned shipments.
      - `ulds` – array of ULDs with their assigned `orders`.
      - `bulkLoadOrders` – shipments in bulk.
      - `offloadedOrders` – shipments offloaded to lying list with `remarks`.
    - `FinalizeBuildUpPayload` – payload sent when finalizing buildup:
      - `build_up_data.ulds` / `bulk_load_orders` / `offloaded_orders` all composed of `OrderShipmentPayloadData`.

## 7. API Hooks for Build Up Data

- `belli-main/app/operations/build-up/hooks/build-up.ts`
  - Encapsulates network access for buildup.
  - `useBuildUpData({ flight_id })`:
    - GET `/build-up/{flight_id}`.
    - Returns `BuildUpData` containing:
      - `accepted_orders: OrderShipmentData[]` (the starting pool of shipments).
      - `build_up_data: FinalizedBuildUpData | null` (existing saved/finalized configuration if any).
  - `useFinalizeBuildUp()`:
    - POST to `/build-up/{flight_id}` with `FinalizeBuildUpPayload`.
    - On success, invalidates queries keyed by `route` (`"/build-up"`) so the UI refetches.
  - `useBuildUpList()`:
    - Fetches paginated list of buildup records (used by listing pages, not directly by AWB split modal).

## 8. Older / Advanced Split (Reference Only)

- `belli-main/app/operations/build-up/components/section-awb-list.tsx`
  - Contains an older, more advanced AWB split implementation (`AdvancedSplitTab`) that works at the parcel/HAWB level.
  - Currently commented out, but shows how `SplitGroup` and `SplitParcelData` were intended to work.
  - Useful reference if you need parcel-level splitting in future, but not part of the current simple split modal in use.

---

## How it Fits Together (High Level Flow)

1. `page.tsx` (BuildUpPage) selects station and flight, then renders `SectionUldAssignment`.
2. `SectionUldAssignment` uses `useBuildUpData` to fetch `accepted_orders` and initializes `BuildUpDataState`.
3. Each AWB/Shipment is rendered as an `AwbCard`, which exposes `onSplit` and other handlers.
4. When the user triggers a split on an AWB:
   - `SectionUldAssignment` sets the selected `OrderShipmentData` and opens `SplitAwbDialog`.
5. `SplitAwbDialog` shows AWB info and renders `SimpleSplitTab`.
6. Inside `SimpleSplitTab`:
   - User creates/edit split groups with pieces/weight (and optionally sees existing assignments if the AWB was already split).
   - On `Confirm Split`, it builds new `OrderShipmentData` groups and calls `onConfirmSplit`.
7. `SectionUldAssignment` receives the new split groups and updates `BuildUpDataState`:
   - The original shipment is replaced by its split group shipments in ULD/Bulk/Offloaded/Available collections as appropriate.
8. When the user finalizes buildup, `SectionUldAssignment` converts `BuildUpDataState` into `FinalizeBuildUpPayload` and calls `useFinalizeBuildUp` to POST to the API.

This set of files is what you want to mirror/consult when implementing buildup and AWB splitting/assignment logic elsewhere.
