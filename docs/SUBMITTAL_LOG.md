# Submittal Log

GreenChainz now includes a lightweight Submittal Log for construction administration tracking.

## What it tracks

- Project + spec references (`projectId`, `specSection`, `masterformatCode`)
- Submittal identifiers (`submittalNumber`, `title`, `description`)
- Status (`draft`, `submitted`, `approved_as_noted`, `revise_and_resubmit`, `rejected`, `closed`)
- Ball in court (`buyer`, `architect`, `supplier`)
- Key dates (`submittedAt`, `dueAt`, `requiredOnSiteAt`, `returnedAt`)
- Related links (`relatedRfqId`, `relatedSwapValidationId`)
- Related materials/suppliers via submittal items

## API (tRPC)

Router: `submittals`

- `submittals.create`
- `submittals.listMine`
- `submittals.getById`
- `submittals.updateStatus`
- `submittals.attachReferences`
- `submittals.listByReference`

## UI

- Buyer view: `/buyer/submittals`
- Architect view: `/architect/submittals`

The page provides:
- Status filter
- Table list
- Click-through detail panel with related RFQ/swap references and item count
