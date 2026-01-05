# PoC Scope Document - Emirates SkyCargo

## Objective

The objective of this Proof of Concept (PoC) is to validate Belli AI's capability to digitize the cargo build-up process by enabling real-time visibility, workflow automation, and accurate data exchange between various teams within our operations.

The PoC aims to demonstrate how the system can streamline communication, reduce manual interventions, and provide management with an integrated view of operational workloads.

---

## Process Overview

In the Phase-1 PoC scope, the process begins with the planner uploading the completed load plan into the Belli AI system.

Using this information, the system will automatically generate several operational lists and dashboards for different user groups across the operation.

---

## System-Generated Outputs

Upon load plan upload, the system shall produce the following outputs, each serving a distinct operational purpose:

| List/Output            | Purpose                                                                                                | End User                  | Notes/Input Source                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------ |
| **VUN List**           | Identify Valuable/Unusual (VUN) shipments requiring escort                                             | Group Security            | Derived from load plan                                 |
| **Special Cargo List** | List of AXA, AOG, VIP and other special handling shipments                                             | Build-Up / Handling Teams | EKSC to provide specific Special Handling Codes (SHCs) |
| **QRT List**           | Display key connection and handling information such as bay numbers, ULD numbers, and connection times | Ramp / Ops Staff          | Business rules defined by EKSC                         |

**Note:** All the information/outputs from above should be configurable on a flight, date & time and a shift level.

---

## Workload Visibility for Supervisors and Management

Once the load plans are generated and accessible to build-up staff, the system should present real-time workload visibility to management and shift in-charges in the following format:

- **Total Workload by category** (GCR, PIL, PER) & work area (module level)
- **Total ULDs processed vs. remaining** based on load plan data
- **Workload segmentation by screening / non-screening flights** at the ULD/shipment level (AWB) level (e.g., PMC, AKE, ALF) – business rules to be provided by EKSC

This visibility will help supervisors plan manpower allocation and monitor shift progress dynamically.

---

## Build-Up Process & Data Capture

At the operational level, build-up staff will work per flight (e.g., EK001) with visibility of ULD assignments drawn from the load plan.

### During build-up:

- **Flight completion milestones** – user driven flag
- **Capability to include information on half build/incomplete ULD** and pass information to subsequent shift
- **Each entry must include:**
  - Staff Name and ID
  - Remarks / Reason (for incomplete build-up or special conditions)

---

## Post-Build-Up Reporting

Upon completion, the user will generate a **Build-Up Completion Report (BCR)** at flight level, containing:

- Digitized Build-up completion report with information of relocated/not-loaded AWBs, if any
- Staff details and timestamps
- Shift Summary Report consolidating all flights processed during the shift and pending for the next shift

### This shift-level data will serve as the basis for:

- End-of-shift handovers
- Staff performance tracking – KPI measured at ULD & shift level
- Operational workload analysis
- Count & type of ULD loaded on a flight
- Details of overflow (additional ULDs used due to space constraints)

---

## Situational Awareness Dashboard

All data generated through this process will feed into a real-time **Situational Awareness Dashboard** for management.

### The dashboard will provide an at-a-glance overview of:

- Current workload by category/work areas, date-time range and shift
- Flights in progress and completion rates against the planned ULDs – At a ULD level by flight
- Anticipated incoming workload (based on upcoming flights)
- Digital buildup completion report at shipment level (pending)

This enables proactive decision-making and efficient resource planning across teams.

---

## Data Inputs & Responsibilities

| Data Source                                      | Provided By    | Purpose                                              |
| ------------------------------------------------ | -------------- | ---------------------------------------------------- |
| **Load Plan**                                    | Planner        | Primary input for all downstream activities          |
| **Flight Schedule**                              | Planning Team  | Feed information into the dashboard                  |
| **ULD, flight completion & BCR**                 | Build up Staff |                                                      |
| **Bay Numbers**                                  | Ramp Staff     |                                                      |
| **Business Rules** (e.g., SHCs, screening logic) | EKSC Team      | To configure logic and categorizations in the system |

---

## Expected Outcomes/Success Criteria

The PoC will validate the following:

- Enhanced information flow from warehouse to back office and vice-versa
- Improved accuracy and timeliness of load data
- Management-level visibility through automated dashboards and reports
- Capability to generate custom reports on various data elements
- System & dashboards to be compatible with different screen sizes – personal phones, desktop, PDA etc.
- Seamless user access & authentication

---

## Additional Requirements

### 1. Display & Highlighting

- ULD allocation to be distinctly highlighted (colour and font differentiation)
- Revisions in load plans to be clearly indicated using revision numbers
- Any version changes or additions (e.g., additional ULDs) to be visibly flagged and relevant information to flow backwards

### 2. Filters & Navigation

- Each page within the tool should include relevant filters such as destination region, module, ULD type, and time/shift range

### 3. Data Structure & Flow

- Information to remain at the ULD level rather than AWB level
- This ULD-level data should feed into situational awareness dashboards, shift handovers, and other related reporting

### 4. Views for Supervisors & Management

- A "ULD Completed vs ULD Pending" view to be available for supervisors and management
- GCR, PIL, and PER to be displayed separately where applicable - Staff visibility control
- A shift-level "at-a-glance" view using green/amber/red status for flights, with drill-down capability for progress details
- Staff names and contact numbers to be captured against their assigned flights
- Post-allocation workload visibility by staff, along with real-time completion percentages
- Staff efficiency metrics (e.g., ULDs completed per hour) to be visible both post-shift and historically

### 5. Operational Inputs

- BCR to be completed using checkboxes for unloaded/relocated shipments

---

## Glossary

- **ULD**: Unit Load Device
- **VUN**: Valuable/Unusual
- **QRT**: Quick Reference Tool
- **BCR**: Build-Up Completion Report
- **SHC**: Special Handling Code
- **AWB**: Air Waybill
- **GCR**: Ground Cargo Release
- **PIL**: Priority Item List
- **PER**: Perishable cargo
- **EKSC**: Emirates SkyCargo
- **AXA**: Aircraft on Ground (express)
- **AOG**: Aircraft on Ground
- **VIP**: Very Important Person (cargo)
- **PMC, AKE, ALF**: ULD type codes
