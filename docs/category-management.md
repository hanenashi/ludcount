# Category Management

Ludcount combines a code-defined built-in catalog with household-scoped custom
categories. Built-in category IDs remain stable and their labels are translated
for Czech, English, and Japanese. Only custom categories are stored in
Firestore.

## Behavior

- Every household member can read and use active custom categories.
- Only the household owner can create, rename, archive, or restore them.
- Custom names are literal household data and are not translated.
- A category has one immutable transaction type: `income` or `expense`.
- Archived categories are excluded from new and duplicated transactions.
- Existing transactions keep displaying an archived category and may be edited
  without changing it. They cannot switch type while retaining that category.
- Categories are never physically deleted. This preserves historical
  references and avoids orphaned transaction labels.
- Transactions retain `categoryLabelSnapshot` as a fallback if a historical
  category can no longer be resolved.
- Demo-mode custom categories use a separate in-memory repository and disappear
  on reset or reload. They never reach Firebase.

## Firestore schema

```text
households/{householdId}/categories/{categoryId}
  name: string (1..60 characters)
  type: "income" | "expense"
  sortOrder: integer (0..100000)
  archived: boolean
  createdBy: userId
  createdAt: timestamp
  updatedAt: timestamp
```

Built-ins are deliberately not materialized as documents. The client merges
the code-defined catalog with the custom-category subscription and sorts the
result deterministically. Custom ordering starts after built-ins; drag-and-drop
reordering is not currently exposed.

The repository subscribes to the whole household category collection and sorts
locally, so this feature requires no new composite Firestore index.

## Security boundaries

Production rules enforce exact fields and types. They allow member reads and
owner-only writes, make `type`, `createdBy`, and `createdAt` immutable, require
server timestamps, reject creation in an archived state, and deny physical
deletion.

Transaction writes accept only a built-in category valid for the transaction
type or an active custom category in the same household. An archived custom
category can remain only on an existing transaction whose category and type are
unchanged. Rules tests cover member/non-member reads, owner/non-owner writes,
malformed category documents, escalation attempts, archived use, cross-type
use, immutable fields, and historical edits.
