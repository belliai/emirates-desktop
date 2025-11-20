# Lists Feature Architecture

\`\`\`mermaid
graph TB
    %% Entry Points
    AppPage[app/page.tsx<br/>Main App Router]
    SideNav[components/side-navigation.tsx<br/>Navigation Menu]
    
    %% Main Component
    ListsScreen[components/lists-screen.tsx<br/>Main Lists Component]
    
    %% UI Components
    Button[components/ui/button.tsx<br/>Button Component]
    Card[components/ui/card.tsx<br/>Card Component]
    Dropdown[components/ui/dropdown-menu.tsx<br/>Dropdown Menu]
    Alert[components/ui/alert.tsx<br/>Alert Component]
    Progress[components/ui/progress.tsx<br/>Progress Bar]
    
    %% Utilities
    Utils[lib/utils.ts<br/>Utility Functions]
    
    %% Data Flow
    LoadPlan[Load Plan File<br/>.md/.docx/.pdf]
    
    %% Processing Functions
    ParseHeader[parseHeader<br/>Extract Flight Info]
    ParseShipments[parseShipments<br/>Extract Shipment Data]
    IsSpecialCargo[isSpecialCargo<br/>Check Special Cargo Codes]
    IsWeaponsCargo[isWeaponsCargo<br/>Check Weapons Codes]
    IsVUNCargo[isVUNCargo<br/>Check VUN Criteria]
    GenSpecialCargo[generateSpecialCargoReport<br/>Generate Report]
    GenVUNList[generateVUNList<br/>Generate VUN List]
    
    %% Export Functions
    ExportCSVSpecial[exportSpecialCargoReportToCSV<br/>CSV Export]
    ExportXLSXSpecial[exportSpecialCargoReportToXLSX<br/>XLSX Export]
    ExportCSVVUN[exportVUNListToCSV<br/>CSV Export]
    ExportXLSXVUN[exportVUNListToXLSX<br/>XLSX Export]
    
    %% Constants
    SpecialCodes[SPECIAL_CARGO_CODES<br/>42 Special Cargo Codes]
    WeaponsCodes[WEAPONS_CODES<br/>5 Weapons Codes]
    VUNIndicators[VUN_INDICATOR_CODES<br/>9 VUN Indicator Codes]
    VUNPcodes[VUN_PCODE_VALUES<br/>5 VUN Product Codes]
    
    %% Outputs
    SpecialCargoReport[Special Cargo Report<br/>Regular + Weapons]
    VUNList[VUN List<br/>33 Fields]
    
    %% Relationships - Entry
    AppPage -->|renders| ListsScreen
    SideNav -->|navigates to| ListsScreen
    
    %% Relationships - UI Components
    ListsScreen -->|uses| Button
    ListsScreen -->|uses| Card
    ListsScreen -->|uses| Dropdown
    ListsScreen -->|uses| Alert
    ListsScreen -->|uses| Progress
    
    %% Relationships - Utilities
    Button -->|uses| Utils
    Card -->|uses| Utils
    Dropdown -->|uses| Utils
    Alert -->|uses| Utils
    Progress -->|uses| Utils
    
    %% Data Flow - File Upload
    LoadPlan -->|uploaded to| ListsScreen
    
    %% Processing Flow
    ListsScreen -->|calls| ParseHeader
    ListsScreen -->|calls| ParseShipments
    ParseHeader -->|extracts| LoadPlanHeader[LoadPlanHeader<br/>Flight Info]
    ParseShipments -->|creates| Shipments[Shipment[]<br/>Array of Shipments]
    
    %% Classification Flow
    Shipments -->|checked by| IsSpecialCargo
    Shipments -->|checked by| IsWeaponsCargo
    Shipments -->|checked by| IsVUNCargo
    
    %% Code Constants
    IsSpecialCargo -->|uses| SpecialCodes
    IsSpecialCargo -->|uses| WeaponsCodes
    IsWeaponsCargo -->|uses| WeaponsCodes
    IsVUNCargo -->|uses| VUNIndicators
    IsVUNCargo -->|uses| VUNPcodes
    
    %% Report Generation
    IsSpecialCargo -->|filters| GenSpecialCargo
    IsWeaponsCargo -->|filters| GenSpecialCargo
    IsVUNCargo -->|filters| GenVUNList
    
    LoadPlanHeader -->|input to| GenSpecialCargo
    Shipments -->|input to| GenSpecialCargo
    LoadPlanHeader -->|input to| GenVUNList
    Shipments -->|input to| GenVUNList
    
    GenSpecialCargo -->|generates| SpecialCargoReport
    GenVUNList -->|generates| VUNList
    
    %% Export Flow
    SpecialCargoReport -->|exported via| ExportCSVSpecial
    SpecialCargoReport -->|exported via| ExportXLSXSpecial
    VUNList -->|exported via| ExportCSVVUN
    VUNList -->|exported via| ExportXLSXVUN
    
    %% Styling
    classDef mainComponent fill:#D71A21,stroke:#B01419,stroke-width:3px,color:#fff
    classDef uiComponent fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    classDef utility fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef process fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    classDef data fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    classDef output fill:#ec4899,stroke:#db2777,stroke-width:2px,color:#fff
    
    class ListsScreen mainComponent
    class Button,Card,Dropdown,Alert,Progress uiComponent
    class Utils utility
    class ParseHeader,ParseShipments,IsSpecialCargo,IsWeaponsCargo,IsVUNCargo,GenSpecialCargo,GenVUNList process
    class LoadPlan,LoadPlanHeader,Shipments,SpecialCodes,WeaponsCodes,VUNIndicators,VUNPcodes data
    class SpecialCargoReport,VUNList,ExportCSVSpecial,ExportXLSXSpecial,ExportCSVVUN,ExportXLSXVUN output
\`\`\`

## File Structure

\`\`\`mermaid
graph LR
    subgraph "Entry Points"
        A[app/page.tsx]
        B[components/side-navigation.tsx]
    end
    
    subgraph "Main Component"
        C[components/lists-screen.tsx<br/>1134 lines]
    end
    
    subgraph "UI Components"
        D[components/ui/button.tsx]
        E[components/ui/card.tsx]
        F[components/ui/dropdown-menu.tsx]
        G[components/ui/alert.tsx]
        H[components/ui/progress.tsx]
    end
    
    subgraph "Utilities"
        I[lib/utils.ts]
    end
    
    A --> C
    B --> C
    C --> D
    C --> E
    C --> F
    C --> G
    C --> H
    D --> I
    E --> I
    F --> I
    G --> I
    H --> I
    
    style C fill:#D71A21,stroke:#B01419,stroke-width:3px,color:#fff
    style D fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style E fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style F fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style G fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style H fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style I fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
\`\`\`

## Data Processing Flow

\`\`\`mermaid
flowchart TD
    Start([User Uploads Load Plan]) --> Upload[File Upload Handler]
    Upload --> Parse[Parse File Content]
    
    Parse --> PH[Parse Header<br/>Extract Flight Info]
    Parse --> PS[Parse Shipments<br/>Extract Shipment Data]
    
    PH --> Header[LoadPlanHeader Object]
    PS --> Shipments[Shipment Array]
    
    Shipments --> CheckSC{Check Special Cargo}
    Shipments --> CheckVUN{Check VUN}
    
    CheckSC -->|Uses| SCodes[SPECIAL_CARGO_CODES<br/>42 codes]
    CheckSC -->|Uses| WCodes[WEAPONS_CODES<br/>5 codes]
    
    CheckVUN -->|Uses| VUNInd[VUN_INDICATOR_CODES<br/>9 codes]
    CheckVUN -->|Uses| VUNPc[VUN_PCODE_VALUES<br/>5 codes]
    CheckVUN -->|Weight Check| Weight{Weight > 500kg}
    CheckVUN -->|Value Keywords| Value{SILVER/GOLD/DIAMOND/etc}
    
    CheckSC -->|Yes| GenSC[Generate Special Cargo Report]
    CheckSC -->|Weapons| GenWeapons[Separate Weapons List]
    
    CheckVUN -->|Yes| GenVUN[Generate VUN List]
    
    Header --> GenSC
    Shipments --> GenSC
    Header --> GenVUN
    Shipments --> GenVUN
    
    GenSC --> SCR[Special Cargo Report<br/>Regular + Weapons]
    GenWeapons --> SCR
    GenVUN --> VL[VUN List<br/>33 Fields]
    
    SCR --> DisplaySC[Display Special Cargo Table]
    VL --> DisplayVUN[Display VUN List Table]
    
    DisplaySC --> ExportSC{Export Special Cargo?}
    DisplayVUN --> ExportVUN{Export VUN List?}
    
    ExportSC -->|CSV| CSVSC[exportSpecialCargoReportToCSV]
    ExportSC -->|XLSX| XLSXSC[exportSpecialCargoReportToXLSX]
    
    ExportVUN -->|CSV| CSVVL[exportVUNListToCSV]
    ExportVUN -->|XLSX| XLSXVL[exportVUNListToXLSX]
    
    CSVSC --> Download[Download File]
    XLSXSC --> Download
    CSVVL --> Download
    XLSXVL --> Download
    
    style Start fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    style SCR fill:#ec4899,stroke:#db2777,stroke-width:2px,color:#fff
    style VL fill:#ec4899,stroke:#db2777,stroke-width:2px,color:#fff
    style Download fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
\`\`\`
