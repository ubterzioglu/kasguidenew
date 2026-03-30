# Kas Run Report

Bu dosya grid sweep session'larinin append-only kaydidir.

Kurallar:
- Her session sonunda yeni bir blok eklenir.
- Eski bloklar silinmez.
- Bir session sadece 1 grid isler.
- Bir sonraki session son bloktaki `next_candidates` listesinden devam eder.

## Session Template

```md
## Session YYYY-MM-DD HH:mm
- processed_cell: kas-google-grid-x1-y1
- grid_key: X1Y1
- grid_x: 1
- grid_y: 1
- status: completed
- api_calls: 46
- raw_rows_written: 249
- next_candidates:
  - X2Y1
  - X0Y1
  - X1Y2
  - X1Y0
- note: tek grid islendi, run sonlandirildi
```

## Session 2026-03-29 14:30
- processed_cell: kas-google-grid-x1-y1
- grid_key: X1Y1
- grid_x: 1
- grid_y: 1
- status: completed
- api_calls: 46
- raw_rows_written: 249
- next_candidates:
  - X2Y1
  - X0Y1
  - X1Y2
  - X1Y0
- note: tek grid islendi, run sonlandirildi

## Session 2026-03-29 14:36
- processed_cell: kas-google-grid-x2-y1
- grid_key: X2Y1
- grid_x: 2
- grid_y: 1
- status: completed
- api_calls: 46
- raw_rows_written: 27
- next_candidates:
  - X3Y1
  - X1Y1
  - X2Y2
  - X2Y0
- note: tek grid islendi, run sonlandirildi
