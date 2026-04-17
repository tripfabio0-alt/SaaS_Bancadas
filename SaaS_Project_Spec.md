# SaaS Bancadas - Technical Specification & Dashboard Prompt

This document provides a complete overview of the **SaaS Bancadas** ecosystem. Use this information to feed into AI dashboard generation tools (like Google Stitch) or Business Intelligence tools (like Looker Studio).

---

## 1. System Architecture Overview

- **Source**: 5 Industrial Test Benches running a local Access Database (`Data.accdb` and `Full Data.accdb`) and producing batch CSV files (`Relatorio.csv`).
- **Sync Layer**: A Python Bridge (`sync_bridge.py`) running locally that performs:
    - **Canonical Mapping**: Normalizes heterogeneous headers (e.g., "Ponto de teste" vs "Test point") into unified keys.
    - **Extraction**: Explodes technical data from Access into JSON payloads.
    - **Upsert**: Synchronizes data to Supabase every 30 seconds.
- **Backend**: Supabase (PostgreSQL) hosting the structured data and the unified view.
- **Frontend**: Next.js dashboard for real-time visualization.

---

## 2. Data Dictionary (Supabase)

### Table: `public.data` (Main Metadata)
| Column | Type | Description |
| :--- | :--- | :--- |
| `composite_id` | TEXT | Primary identifier (`bench_id` + `id_mark`). |
| `ID Mark` | TEXT | Test identifier from the bench hardware. |
| `Meter Number` | TEXT | Serial number of the physical meter being tested. |
| `Error conclusion` | TEXT | Result status ("Aprovado", "Reprovado", etc.). |
| `Save time` | TEXT | Raw timestamp from the local Access DB. |
| `timestamp` | TIMESTAMPTZ | Normalized ISO 8601 timestamp. |
| `bancada_id` | INTEGER | ID of the bench (1 to 5). |

### Table: `public.full_data` (Technical Payload)
| Column | Type | Description |
| :--- | :--- | :--- |
| `raw_payload` | JSONB | Contains exploded technical parameters using **Canonical Keys**. |

### Table: `public.vinculo_lacre` (CSV Batch Data)
| Column | Type | Description |
| :--- | :--- | :--- |
| `lacre` | TEXT | Linked to `Meter Number` (Primary Join). |
| `lote_produto` | TEXT | Batch name/identifier. |
| `seq_lote` | TEXT | Batch sequence number. |
| `cod_inmetro` | TEXT | Inmetro regulatory code. |
| `lote_inmetro` | TEXT | Regulatory batch number. |

---

## 3. Unified View: `global_uniao`
This is the master dataset for all visualizations. It joins all three sources above.

**Key Extraction Logic (SQL):**
- `ponto_teste`: `raw_payload -> 'test_point'`
- `vazao_real`: `raw_payload -> 'flow_rate'`
- `erro_relativo`: `raw_payload -> 'error_relativo'`
- `temperatura_celcius`: `raw_payload -> 'temperature'`
- `pressao_pa`: `raw_payload -> 'pressure'`
- `status_tecnico`: `raw_payload -> 'status_tecnico'`

---

## 4. Dashboard Prompt (Optimized for Google Stitch / AI)

> **PROMPT:**
> "I need to design a high-fidelity industrial monitoring dashboard for an 'Industrial Bench SaaS'. 
> 
> **CONTEXT:**
> The system monitors 5 test benches. Data comes from a PostgreSQL view named `global_uniao`. 
> 
> **KEY DATA POINTS:**
> 1. **Bench Status**: Real-time status (Online/Idle/Offline) based on the `data_hora` column.
> 2. **Production KPIs**: Number of tests today, % of 'Aprovado' vs 'Reprovado' (from `status_resultado`).
> 3. **Batch Monitoring**: Grouping results by `lote_produto` and `seq_lote`.
> 4. **Technical Analysis**: Time-series charts for `vazao_real` (Flow Rate) and histograms for `erro_relativo`.
> 5. **Audit Trail**: A detailed table showing `meter_number`, `id_mark_bancada`, `ponto_teste`, and `data_hora`.
> 
> **DESIGN REQUIREMENTS:**
> - **Aesthetics**: Dark Mode, Glassmorphism, Premium 'Cyberpunk Industrial' feel.
> - **Layout**: Sidebar with bench selectors (1-5), Overview Hub with 4 big KPI cards, a Large 'Real-time Datastream' table, and a 'Technical Analytics' section with 2 line charts.
> - **Visual Cues**: Use Emerald green for success, Crimson red for failure, and Indigo blue for technical data.
> 
> Please generate a complete UI layout with interactive components for this specification."

---

## 5. Connection Details (Looker Studio)
If connecting Looker Studio directly:
- **Connector**: PostgreSQL.
- **Query**: `SELECT * FROM public.global_uniao;`
- **Joins**: Already handled in the View. No extra joins needed in Looker.
- **Aggregations**: 
    - Count on `meter_number` for production volume.
    - Average on `erro_relativo` for precision tracking.
