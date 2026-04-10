# SaaS Bancadas - Industrial Monitoring System

This project is a web-based monitoring system for 5 industrial test benches. It consists of a local **Sync Bridge** (Python) and a **Web Dashboard** (Next.js).

## 🚀 How it Works

1.  **Sync Bridge**: Reads local Access databases (`.accdb`) and pushes data to Supabase (Cloud).
2.  **Web Dashboard**: Displays the synchronized data on a premium, real-time web interface hosted on Vercel.

## 🛠️ Local Setup (Sync Bridge)

### Prerequisites
- **Python 3.10+**
- **Microsoft Access Database Engine** (Necessary for `pyodbc` to read `.accdb` files).

### Installation
1.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
2.  Configure Environment:
    - Copy `.env.example` to `.env`.
    - Fill in your `SUPABASE_URL` and `SUPABASE_KEY`.
    - Verify the paths for your 5 Access databases.

### Running the Sync
```bash
python sync_bridge.py
```
The script will check for updates every 5 minutes and push them to the cloud.

## 🌐 Web Setup (Dashboard)

The frontend is located in the `web/` folder.

### Local Development
```bash
cd web
npm install
npm run dev
```

### Deployment (Vercel)
1.  Push this repository to GitHub.
2.  Connect your repository to Vercel.
3.  Add environment variables in Vercel:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📊 Database Schema (Supabase)

You need to create two tables in Supabase with the following names:
1.  `data`
2.  `full_data`

Make sure to include a column named `ID Mark` (or adjust the sync script) to handle unique records and the `bancada_id` (integer) for filtering.

---
**Note**: The system is designed for **READ-ONLY** access to your local databases. No source files will be modified.
