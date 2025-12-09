import type { ListsResults } from "./types"
import { parseHeader, parseShipments } from "./parser"
import { generateSpecialCargoReport, generateVUNList, generateQRTList } from "./report-generators"

/**
 * Generate default lists results by processing both EK0544 and EK0205 load plans
 * This runs the parsing logic programmatically without keeping permanent files
 */
function getDefaultListsResults(): ListsResults {
  // EK0205 load plan content
  const ek0205Content = `EMIRATES LOAD PLAN
EK0205  / 12Oct  ACFT TYPE: 388R    ACFT REG: A6-EOW      HEADER VERSION: 1
Route: DXB/MXP                       STD: 09:35               PREPARED BY: S294162
TTL PLN ULD: 05PMC/10AKE           ULD VERSION: 05PMC/26 PREPARED ON: 15-Oct-25 11:29:32

SECTOR: DXBMXP
SER.  AWB NO     ORG/DES  PCS   WGT     VOL  LVOL     SHC      MAN.DESC     PCODE PC THC  BS PI FLTIN ARRDT.TIME QNN/AQNN    WHS SI
_________________________________________________________________________________________________________________________________________
SI: - A/C type, A380- OPS.
    - PLEASE ENSURE " NO WING OR OHG " PLTS. MENTION THE SAME IN CHECK SHEET
    - PLEASE DO NOT USE THICK BASE AKE'S - AKE14082EK TO AKE15797EK
001 176-20257333 DXBMXP     6    36.3   0.1   0.1 VAL         CONSOLIDATION   VAL P2 NORM SS N                                   N
002 176-16505274 BOMJFK     3  1450.0   9.1   9.1 HEA-CRT-EMD CONSOLIDATED AS AXD P2      SS Y EK0509 12Oct0024 13:29/           N
xx 01PMC xx
003 176-13820240 DXBJFK     1   242.0   0.8   0.8 HEA-SVC-CRT CATERING GOOD   SVC P2 NORM SS N                                   N
XX  01AKE  XX
004 176-12968620 DACJFK    13   296.4   1.7   1.7             CONSOLIDATION   GCR P2      SS Y EK0585 11Oct0439 29:28/           N
005 176-15033524 HKGMXP   105  2030.0  12.0  12.0 SPX-SBU     WOMEN S COTTON  GCR P2      SS N EK9789 11Oct1055 17:11/23:11      N
XX 01PMC 01AKE XX
006 176-10603445 BNEMXP     2    19.4   0.2   0.2 MAL         INTL. MAIL      MAW         SS N EK0435 11Oct0533 28:34/           N
[Must be load in Fire containment equipment]
007 176-10603456 BNEMXP     3    29.9   0.3   0.5 MAL         INTL. MAIL      MAW P2      SS N EK0435 11Oct0533 28:34/           N
[Must be load in Fire containment equipment]
008 176-10609454 MELMXP     1     3.0   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0407 11Oct0514 28:53/           N
[Must be load in Fire containment equipment]
009 176-10609465 MELMXP    10    90.9   0.8   1.0 MAL         INTL. MAIL      MAW P2      SS N EK0407 11Oct0514 28:53/           N
[Must be load in Fire containment equipment]
010 176-10609476 MELMXP     5    49.1   0.4   0.7 MAL         INTL. MAIL      MAW P2      SS N EK0407 11Oct0514 28:53/           N
[Must be load in Fire containment equipment]
011 176-07700206 PERMXP     1     0.4   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0421 11Oct0504 29:03/           N
[Must be load in Fire containment equipment]
012 176-07700210 PERMXP     1     1.8   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0421 11Oct0504 29:03/           N
[Must be load in Fire containment equipment]
013 176-07700221 PERMXP     3     5.2   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0421 11Oct0504 29:03/           N
[Must be load in Fire containment equipment]
014 176-07700232 PERMXP     1    12.0   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0421 11Oct0504 29:03/           N
[Must be load in Fire containment equipment]
015 176-07700243 PERMXP     1     0.2   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0421 11Oct0504 29:03/           N
[Must be load in Fire containment equipment]
016 176-16255713 IKAMXP     3    20.8   0.2   0.2 MAL         INTL. MAIL      MAW         SS N EK0972 11Oct1327 20:39/           N
[Must be load in Fire containment equipment]
[Shipment to undergo ACC3 screening at DXB/DWC]
017 176-18596454 SYDMXP     5    42.3   0.4   0.7 MAL         INTL. MAIL      MAW P2 QWT  SS N EK0415 11Oct1306 21:00/           N
[Must be load in Fire containment equipment]
018 176-18596465 SYDMXP     1    14.0   0.1   0.1 MAL         INTL. MAIL      MAW P2 QWT  SS N EK0415 11Oct1306 21:00/           N
[Must be load in Fire containment equipment]
019 176-18596476 SYDMXP     1    14.2   0.1   0.1 MAL         INTL. MAIL      MAW P2 QWT  SS N EK0415 11Oct1306 21:00/           N
[Must be load in Fire containment equipment]
XX 01AKE XX

TOTALS : 166     4,357.90     26.17     27.28

SECTOR: DXBJFK
SER.  AWB NO     ORG/DES  PCS   WGT     VOL  LVOL     SHC      MAN.DESC     PCODE PC THC  BS PI FLTIN ARRDT.TIME QNN/AQNN    WHS SI
_________________________________________________________________________________________________________________________________________
001 176-13926511 CMBJFK     1    14.0   0.1   0.1 CGO         CONSOLIDATION   GCR P1      SS N EK0651 11Oct1311 20:56/           N
XX   BULK XX
002 176-98261704 DXBJFK     5  2941.0   7.7   7.7 HEA-RMD-EAW CONSOLIDATION   GCR P2 NORM SS Y                                   N
003 176-19890323 DWCJFK     2    16.5   0.1   0.1 SEA-ECC     CONSOLIDATION A SEA P2      SS N EK7524 09Oct2251 59:16/           N
004 176-12620576 CMBJFK    10   146.5   0.6   0.6 ECC         CONSOLIDATION   GC R P2      SS N EK0651 10Oct1259 45:08/           N
005 176-10878556 TUNJFK     4   487.0   3.2   3.2 HEA-ECC     CONSOLIDATION   GCR P2      SS N EK0748 10Oct2243 35:23/           N
006 176-15838513 SINJFK     4   544.0   4.1   4.1             CONSOLIDATION   GCR P1      SS N EK0353 11Oct0359 30:08/           N
007 176-16890241 HYDPHL     1   148.0   1.0   1.0 ECC-TSE     CONSOLIDATION   GCR P1      SS N EK0527 11Oct1212 21:55/           N
008 176-19897102 KTIJFK    60 140.979   1.3   1.3             CONSOLIDATION   GCR P2      SS Y EK0349 11Oct0500 29:07/           N
XX  02PMC 02AKE XX
009 176-04616581 LHEJFK    45  1320.0   7.9   7.9 COU-XPS-FCE COURIER ON AWB  COU P2 QWT  SS N EK0623 12Oct0605 04:02/           N
XX 01PMC XX

MXP   13AKE
JFK   02AKE

TOTALS : 132     5,757.98     25.90     25.90`

  // EK0544 load plan content
  const ek0544Content = `EMIRATES LOAD PLAN
EK0544  / 01Mar  ACFT TYPE: 77WER   ACFT REG: A6-ENT      HEADER VERSION: 1
Route: DXB/MAA/0/23/251              STD: 02:50                   PREPARED BY: PRINCE
TTL PLN ULD: 06PMC/07AKE           ULD VERSION: 06/26    PREPARED ON: 29-Feb-24 12:44:05

SECTOR: DXBMAA
SER.  AWB NO     ORG/DES  PCS   WGT     VOL  LVOL     SHC      MAN.DESC     PCODE PC THC  BS PI FLTIN ARRDT.TIME QNN/AQNN    WHS SI
_________________________________________________________________________________________________________________________________________
                               XX NO PART SHIPMENT XX
                  "Station requirement". Do not use ALF or PLA instead of AKE allocation.
001 176-92065120 FRAMAA    31  1640.2  18.9  20.0 PIL-CRT-EAP CONSOLIDATION A AXD P2      SS N EK9903 29Feb0418 13:40/22:31      N
XX 02PMC XX
002 176-98208961 DXBMAA     1    10.0   0.1   0.1 VAL         GOLD JEWELLERY. VAL P2 NORM NN N                                   N
XX BULK XX
003 176-93627586 MNLMAA    13  2690.0  18.5  18.5 HEA-CGO     CONSOLIDATION   GCR P1      SS N EK0333 27Feb2334 51:16/           N
XX 02PMC XX
004 176-99699530 PEKMAA     9   643.0   1.3   1.3 VUN         CONSOLIDATION   GCR P2      SS N EK9307 29Feb0216 19:20/24:33      N
005 176-95418503 MXPMAA     3   356.0   2.8   2.8 SPX         CONSOLIDATION   GCR P2      SS N EK9918 29Feb0315 19:20/23:35      N
006 176-92921581 MXPMAA     1   227.0   0.3   0.3 HEA-SPX     CONSOLIDATION   GCR P2      SS N EK9918 29Feb0315 19:20/23:35      N
007 176-92082874 FRAMAA    15   242.5   1.9   1.9 EAP-SPX     CONSOLIDATION A GCR P1      SS N EK9903 29Feb0418 13:30/22:31      N
008 176-93270542 FRAMAA    11   145.5   0.9   0.9 EAP         CONSOLIDATION A GCR P1      SS N EK9903 29Feb0418 13:30/22:31      N
XX 06AKE XX

***** RAMP TRANSFER *****
009 176-92388321 MIAMAA    57  1499.0   8.6   8.6 PES-CRT     SHRIMP          PXS P2 QRT  SS N EK0214 29Feb1915 07:25/           N
010 176-92388332 MIAMAA    57  1499.0   8.6   8.6 PES-CRT     LIVE SHRIMP     PXS    QRT  SS N EK0214 29Feb1915 07:25/           N
XX 02PMC XX
011 176-91628773 DARMAA     1    20.0   0.1   0.1 VAL         GOLD            VAL P2 QRT  SS N EK0726 29Feb2145 05:05/           N
012 176-91629020 DARMAA     1    20.0   0.1   0.1 VAL         GOLD            VAL P2 QRT  SS N EK0726 29Feb2145 05:05/           N
XX BULK XX
013 176-91073931 KRKMAA     1   363.0   0.6   4.0 SPX-EAP-HEA CONSOLIDATION A AXA P1 QRT  SS N EK0180 29Feb2220 04:30/           N
XX 01AKE XX

BAGG 10AKE
COU BULK DHL 300KGS

TOTALS : 201     9,355.20     62.69     67.23`

  // Parse both load plans
  const ek0205Header = parseHeader(ek0205Content)
  const ek0205Shipments = parseShipments(ek0205Content, ek0205Header)

  const ek0544Header = parseHeader(ek0544Content)
  const ek0544Shipments = parseShipments(ek0544Content, ek0544Header)

  // Combine shipments from both flights
  const allShipments = [...ek0205Shipments, ...ek0544Shipments]

  // Debug: Check for VUN items
  const vunItems = allShipments.filter((s) => s.shc && s.shc.toUpperCase().includes("VUN"))
  console.log("[v0] VUN items found:", vunItems.length, vunItems.map((s) => ({ awb: s.awbNo, shc: s.shc })))

  // Use EK0205 header as the primary header (or combine as needed)
  const combinedHeader = ek0205Header

  // Generate reports from combined data
  const specialCargo = generateSpecialCargoReport(combinedHeader, allShipments)
  const vunList = generateVUNList(combinedHeader, allShipments)
  const qrtList = generateQRTList(combinedHeader, allShipments)

  // Debug: Verify VUN list was generated
  console.log("[v0] VUN list generated:", vunList.length, vunList.map((v) => ({ awb: v.docNo, cargoType: v.cargoType })))

  return {
    header: combinedHeader,
    specialCargo,
    vunList,
    qrtList,
    shipments: allShipments,
  }
}

export { getDefaultListsResults }

