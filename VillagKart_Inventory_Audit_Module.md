# VillagKart Inventory Audit Module

For VillagKart, the simplest solution is to build one centralized Audit
Module that works at two levels:

1.  **Section-wise audit** --- audit each inventory section
    independently, such as Raw Inventory, Repacking, Ready Inventory,
    Vehicle Inventory, POS, and Online.
2.  **Consolidated Hub Audit** --- audit the entire hub across all
    inventory sections, including stock transfers, reserved stock,
    damaged stock, and discrepancies.

The module should connect directly to the existing inventory system, so
staff do not need to maintain separate audit registers or duplicate
inventory entries.

## 1. Recommended audit structure

### VillagKart Hub Audit

One dashboard for the entire hub.

-   **Section Audit**
    -   Raw, Repacking, Ready, Vehicle, POS and Online
-   **Consolidated Audit**
    -   All sections, locations and hub-wide stock
-   **Common Audit Process**
    1.  System stock
    2.  Physical count
    3.  Variance calculation
    4.  Review and approval
    5.  Audit Report & Reconciliation

Discrepancies · Stock value · Transfers · Adjustments · Audit history

## 2. Simple user interface

The Audit Module should have just three main screens.

### Screen 1 --- Audit Dashboard

**Role:** Admin / Manager

Illustrative dashboard metrics:

-   Audits scheduled: **12**
-   Pending review: **3**
-   Items with variance: **8**
-   Audits completed: **9**

#### Inventory Sections

-   **Raw Inventory** --- Purchase stock and raw goods
-   **Repacking** --- Stock issued, consumed and produced
-   **Ready Inventory** --- Packed goods ready for dispatch
-   **Vehicle Inventory** --- Stock assigned to individual vehicles
-   **POS & Online** --- Channel stock and reservations

*Design this screen.*

### Screen 2 --- Conduct Audit

Example of a simple stock-counting interface.

-   **Audit scope:** Vehicle Inventory
-   **Counting method:**
    -   Blind count --- hide expected stock
    -   System-assisted --- show expected stock
-   **Product:** Rice --- 5 kg pack
-   **SKU:** `VK-RIC-001` · Illustrative example
-   **Expected quantity:** 50 packs
-   **Physical quantity counted:** To be entered
-   **Remarks:** Optional

*Continue audit design.*

### Screen 3 --- Variance & Approval

Illustrative example: system stock 50 packs, physical count 45 packs.

-   **System quantity:** 50
-   **Physical quantity:** 45
-   **Stock variance:** −5 packs
-   **Variance percentage:** −10%
-   **Reason for variance:** Examples include unrecorded transfer,
    damage, picking error, or unexplained shortage.
-   **Approval required:** An authorized manager reviews evidence before
    any stock adjustment is posted.

> These are illustrative UI concepts, not live VillagKart inventory
> data.

## 3. How the audit should work

  -----------------------------------------------------------------------
  Step                                System behaviour
  ----------------------------------- -----------------------------------
  1\. Start audit                     Select a section, vehicle, channel
                                      or entire hub.

  2\. Freeze the reference            Capture a timestamped system-stock
                                      snapshot and account for
                                      transactions during counting.

  3\. Count stock                     Scan barcodes or search products
                                      and enter quantities.

  4\. Calculate variance              Compare physical stock against the
                                      correct book stock at the audit
                                      cutoff.

  5\. Investigate                     Record shortages, excesses, damage,
                                      missing transfers and supporting
                                      evidence.

  6\. Approve                         Route discrepancies to an
                                      authorized reviewer.

  7\. Reconcile                       Post approved adjustments to the
                                      inventory ledger with a complete
                                      audit trail.

  8\. Close audit                     Generate a signed-off report and
                                      retain the audit history.
  -----------------------------------------------------------------------

## 4. Essential rule for consolidated hub audits

VillagKart's inventory moves through procurement, raw stock, repacking,
ready stock, vehicles and sales channels. Therefore, the consolidated
audit must not count the same stock twice.

-   Stock transferred from Ready Inventory to a vehicle must be counted
    under the vehicle's location, not both locations.
-   Stock in transit must be tracked separately until receipt is
    confirmed.
-   Reservations for POS, online and vehicle orders must be
    distinguished from physical stock. A reservation is not a second
    quantity of inventory.
-   Repacking must reconcile raw material consumed, finished goods
    produced and process loss.
-   Transfers between sales channels must create linked outgoing and
    incoming ledger entries.
-   Damaged, expired, quarantined and saleable stock must be shown
    separately.

For each product, the consolidated report should show:

-   Total physical stock across the hub and its assigned vehicles.
-   Total book stock at the audit cutoff.
-   Reserved, damaged and in-transit quantities.
-   Variance quantity and value.
-   Unresolved transfer and adjustment exceptions.

## 5. Keep the module easy to operate

The recommendation is to make the audit module part of the existing
inventory screens rather than creating a separate, complicated workflow.

-   **Scheduled audits:** Configure daily, weekly, monthly or risk-based
    counts by inventory section.
-   **Barcode-first counting:** Scan, enter quantity, save. Support
    manual entry where barcodes are unavailable.
-   **Exception-based review:** Automatically identify mismatches and
    focus staff on products requiring investigation.
-   **Separation of duties:** The counter records stock; an authorized
    reviewer approves adjustments. Preserve the original count and all
    changes.

## 6. Final recommendation

Build a single Inventory Audit module with two modes:

-   **Section Audit:** Quick, focused audits of any inventory section or
    individual vehicle.
-   **Hub Audit:** One consolidated audit across all inventory
    locations, with automatic reconciliation and exception reporting.

Both modes should use the same counting engine, product master,
inventory ledger, approval process and audit history. This avoids
duplicate development and keeps the solution easy for hub staff.

One important design decision: should a hub audit require the entire hub
to stop stock movements temporarily, or should it support counting while
regular operations continue?

**Recommendation:** Support live operations using timestamped stock
snapshots and transaction reconciliation, with an optional controlled
stock freeze for high-risk audits.

------------------------------------------------------------------------

# VillagKart --- Functional Specification: Inventory Audit Counting

**Module:** Inventory Management\
**Feature:** Audit Counting & Reconciliation\
**Version:** 1.0

## 1. Objective

Build a simple, reliable audit-counting workflow within VillagKart that
allows staff to count physical inventory, compare it with the actual
inventory ledger, identify discrepancies, investigate the cause, and
obtain approval before any stock adjustment is posted.

The feature must work for every inventory section and for a consolidated
audit of the entire hub.

**Core control:** An audit records what was physically counted. It must
never change inventory automatically just because the physical count
differs from the system quantity.

## 2. Example audit entry

### Vehicle Inventory Audit

*Illustrative example*

-   **Audit scope:** Vehicle Inventory
-   **Counting method:** System-assisted
-   **Product:** Rice 5 kg pack
-   **SKU:** `VK-RIC-001`
-   **Physical quantity:** 45 packs
-   **Remarks:** None

The expected quantity, variance, and status must be retrieved or
calculated from the actual ledger and audit workflow. They are not
assumed by this example.

## 3. User workflow

1.  **Select audit scope:** Section, specific vehicle, or entire hub.
2.  **Capture ledger snapshot:** Resolve product, location, stock status
    and cutoff time.
3.  **Enter physical count:** Scan SKU, count packs, save and validate.
4.  **Calculate and investigate variance:** Compare like-for-like stock
    at the same cutoff.
5.  **Review and approve:** Independent authorization for discrepancies.
6.  **Reconcile and close:** Post an approved adjustment only when
    justified; retain full audit history.

## 4. How to validate against the real inventory ledger

When the user selects System-assisted count, VillagKart must retrieve
the expected quantity from its inventory ledger. It must not use a
cached dashboard number or a manually entered expected quantity.

For the example SKU `VK-RIC-001`, the backend should:

1.  Verify that the SKU exists, is active, and uses packs as its
    stock-counting unit.
2.  Verify that the selected vehicle is a registered inventory location
    and the user has permission to audit it.
3.  Read the inventory ledger for that specific vehicle, SKU, stock
    status, and audit cutoff time.
4.  Account for confirmed receipts, dispatches, sales, returns, and
    other posted movements up to the cutoff.
5.  Identify transfers that are pending dispatch or receipt, and avoid
    counting stock twice.
6.  Save the expected quantity and its ledger snapshot reference with
    the audit record.
7.  Accept the physical count of 45 packs and calculate the discrepancy.

If the ledger cannot be retrieved, the system must show an error and
prevent the audit from being finalized with an unverified expected
quantity.

### Stock reconciliation formula

**Expected stock at the audit cutoff**

\[ E = `\text{Opening stock}`{=tex} + `\text{Posted inflows}`{=tex} -
`\text{Posted outflows}`{=tex} \]

**Quantity variance**

\[ V = P - E \]

Where (P) is the verified physical count and (E) is expected book stock.

**Variance percentage**

\[ V% = `\frac{P-E}{E}`{=tex}`\times100`{=tex} \]

If expected stock is zero, display the percentage as **N/A** and
investigate any physical stock found.

### Illustrative calculation only

Assume the actual ledger snapshot, once retrieved, reports 50 packs.

-   **Expected stock:** 50 packs
-   **Physical count:** 45 packs
-   **Variance:** −5 packs
-   **Variance percentage:** −10%

This indicates a shortage of five packs in the hypothetical example. It
is not a verified VillagKart discrepancy and does not authorize an
adjustment.

### Handling movements during counting

If vehicle sales or transfers continue while the count is in progress,
VillagKart must reconcile movements against the chosen cutoff time.

For example, if a vehicle starts with 50 packs and sells 3 packs during
counting, the application must distinguish stock at the audit cutoff
from stock after those sales. It must not flag the expected 47 packs as
a shortage merely because the original snapshot was 50.

**Preferred approach:**

-   Capture a timestamped, immutable ledger snapshot when the count
    starts.
-   Record the physical count's effective time.
-   Reconcile all relevant transactions to a common cutoff.
-   If timing cannot be reconciled reliably, mark the count **Needs
    Reconciliation** and require recount or supervisor review.

## 5. Functional requirements

  -----------------------------------------------------------------------
  ID                      Requirement             Expected behaviour
  ----------------------- ----------------------- -----------------------
  AUD-01                  Scope selection         Support every inventory
                                                  section, individual
                                                  vehicles and
                                                  consolidated hub
                                                  audits.

  AUD-02                  System-assisted count   Retrieve expected
                                                  quantity from the
                                                  authoritative inventory
                                                  ledger.

  AUD-03                  Blind count             Hide expected
                                                  quantities from the
                                                  counter until the count
                                                  is submitted, where
                                                  configured.

  AUD-04                  Product validation      Validate SKU, unit of
                                                  measure, location,
                                                  batch/lot and expiry
                                                  where applicable.

  AUD-05                  Count entry             Support barcode
                                                  scanning, manual
                                                  search, quantity entry
                                                  and draft saving.

  AUD-06                  Variance calculation    Calculate quantity and
                                                  percentage variance
                                                  automatically.

  AUD-07                  Evidence                Capture reason codes,
                                                  comments, photos and
                                                  supporting references
                                                  when needed.

  AUD-08                  Movement reconciliation Account for sales,
                                                  receipts, transfers,
                                                  returns and other
                                                  posted movements.

  AUD-09                  Approval                Route discrepancies to
                                                  an authorized reviewer;
                                                  prevent self-approval
                                                  where segregation of
                                                  duties is required.

  AUD-10                  Adjustment posting      Post only an approved,
                                                  justified adjustment to
                                                  the existing inventory
                                                  ledger.

  AUD-11                  Audit trail             Preserve original
                                                  counts, recounts,
                                                  approvals, rejections
                                                  and ledger adjustment
                                                  references.

  AUD-12                  Reports                 Provide section-wise,
                                                  vehicle-wise and
                                                  consolidated hub audit
                                                  reports.
  -----------------------------------------------------------------------

## 6. Validation rules for the example entry

  -----------------------------------------------------------------------
  Validation                          Rule
  ----------------------------------- -----------------------------------
  SKU                                 `VK-RIC-001` must resolve to the
                                      correct Rice 5 kg product.

  Unit                                Quantity 45 must mean 45 packs, not
                                      45 kg.

  Quantity                            Must be numeric, non-negative and
                                      consistent with the SKU's unit
                                      precision.

  Scope                               Vehicle Inventory must include a
                                      specific vehicle or registered
                                      vehicle location.

  Expected quantity                   Must be derived from the correct
                                      ledger snapshot.

  Duplicate entry                     Prevent accidental duplicate
                                      counting of the same SKU, location,
                                      batch and stock status within an
                                      audit line.

  Concurrent audit                    Warn or block if another active
                                      audit covers the same stock scope,
                                      according to configured rules.

  Ledger changes                      Detect unposted or late-arriving
                                      movements and require
                                      reconciliation when they affect the
                                      cutoff.

  Finalization                        Require all mandatory count lines
                                      and validations to be completed.

  Adjustment                          Never post automatically from the
                                      physical count submission.
  -----------------------------------------------------------------------

A product with multiple batches or expiry dates should be countable by
batch where required, while the system also provides a product-level
total.

## 7. Audit status and review workflow

### Draft

Count started; entries may be edited by the assigned counter.

### Count Submitted

Count is locked for review; expected stock and variance are recorded.

### Needs Reconciliation

Transactions, transfers or cutoff issues need to be resolved.

### Pending Review

Variance and supporting evidence are ready for an authorized reviewer.

### Approved / Rejected

Reviewer records the decision and reason. Rejected counts return for
investigation or recount.

### Adjustment Posted / Closed

An approved adjustment is posted once, or the audit closes with no
adjustment required.

**Important:** An audit can be closed without an adjustment if a
discrepancy is explained by a legitimate timing issue or corrected
transaction. Closing an audit must not imply that missing stock has been
recovered.

## 8. Permissions and accountability

  -----------------------------------------------------------------------
  Action            Counter / Staff   Authorized        Admin
                                      Auditor / Hub     
                                      Manager           
  ----------------- ----------------- ----------------- -----------------
  View permitted    Yes               Yes               Yes
  audit scopes                                          

  Start and count   If assigned       Yes               Yes
  stock                                                 

  View expected     Per configuration Yes               Yes
  stock                                                 

  Submit count      Yes               Yes               Yes

  Investigate       Assigned cases    Yes               Yes
  discrepancy                                           

  Approve own count No                Only if policy    Only if policy
                                      permits and       permits and
                                      segregation rules segregation rules
                                      allow             allow

  Approve stock     No                If authorized     If authorized
  adjustment                                            

  View complete     Limited           Yes               Yes
  audit trail                                           

  Change audit      No                If delegated      Admin only
  permissions                                           
  -----------------------------------------------------------------------

Permissions must be enforced by the backend, not just by hiding
interface buttons. Approval limits should be configurable by quantity,
monetary value, stock type and risk.

## 9. Data model required for development

The audit record should contain:

-   **Audit header:** Audit ID, hub ID, scope, vehicle/location ID,
    audit type, counting method, status, assigned counter and
    timestamps.
-   **Ledger snapshot:** Snapshot ID, cutoff timestamp, SKU, batch where
    applicable, stock status, expected quantity and ledger
    version/reference.
-   **Count line:** Physical quantity, unit of measure, counter, count
    timestamp, recount details and remarks.
-   **Variance record:** Expected quantity, physical quantity,
    difference, variance percentage, valuation basis and calculated
    variance value.
-   **Review record:** Reviewer, decision, reason, evidence references
    and approval timestamp.
-   **Adjustment reference:** Adjustment transaction ID, ledger posting
    timestamp, quantity change, authorization and idempotency key to
    prevent duplicate posting.

These records should link to the existing VillagKart inventory ledger
rather than create a second source of truth for stock.

## 10. Acceptance criteria for the developer

The feature is ready for release when all the following tests pass.

### QA verification checklist

-   [ ] **Correct ledger quantity:** A count of 45 against a verified
    book quantity of 50 shows −5 packs and −10%.
-   [ ] **No automatic adjustment:** Submitting the count does not
    change on-hand inventory.
-   [ ] **Permission enforcement:** An unauthorized user cannot access a
    restricted vehicle or approve an adjustment.
-   [ ] **Movement during count:** Sales and transfers are reconciled to
    the audit cutoff without double-counting.
-   [ ] **Recount handling:** A recount preserves the original count,
    reason and new count.
-   [ ] **Approval integrity:** Rejected adjustments are not posted;
    approved adjustments post exactly once.
-   [ ] **Consolidated hub accuracy:** Stock is counted once across
    locations, with reservations and in-transit quantities handled
    separately.
-   [ ] **Audit history:** Every submission, edit, approval and posting
    is traceable to its user and timestamp.

## Final implementation recommendation

Develop the counting feature once and reuse it across Raw Inventory,
Repacking, Ready Inventory, Vehicle Inventory, POS, Online and the
consolidated hub. Make the inventory ledger the authoritative source,
preserve a consistent audit cutoff, and require an independent approval
before any discrepancy can change stock.

This specification defines the expected system behaviour. The sample SKU
and count remain illustrative until the live ledger is queried; no stock
adjustment is authorized by this example.
