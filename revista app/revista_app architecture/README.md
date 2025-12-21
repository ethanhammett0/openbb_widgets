# OpenBB Revista Property Intelligence App

This repository hosts the **Revista Property Intelligence App**, an OpenBB Workspace extension designed for Private Credit and Healthcare Real Estate investors. It integrates real-time healthcare real estate data from the **RevistaMed API** and geospatial visualization from **Google Maps** into the OpenBB ecosystem.

## 🏗 Architecture Overview

The application is built as a compliant **OpenBB Core Extension** using an asynchronous **FastAPI** backend. It is structured as a Python package (`openbb_revista`) that exposes widgets via an OpenBB Router.

### Data Flow
1.  **User/Frontend** requests a widget (e.g., Scorecard, Map) via OpenBB Workspace or API Endpoint.
2.  **FastAPI Server (`main.py`)** receives the request and routes it through the **OpenBB Router**.
3.  **Router (`router.py`)** dispatches the command to the specific widget module (e.g., `scorecard.py`).
4.  **Widget Module** retrieves API keys internally from Environment Variables (`.env`) and executes asynchronous HTTP requests (`aiohttp`) to:
    *   **RevistaMed API** (Property Data, Demographics, Market Trends)
    *   **Nominatim/OpenStreetMap** (Geocoding)
    *   **Google Maps API** (Satellite Visualization)
5.  **Data Processing** occurs using `pandas` and `pydantic` models to clean and structure the response.
6.  **Response** is returned as JSON (DataFrames) or HTML/Markdown strings to the frontend.

## 📂 Directory Structure

```
.
├── openbb_revista/             # Main Python Package
│   ├── __init__.py
│   ├── router.py               # OpenBB Router (Entry Point)
│   ├── models.py               # Pydantic Data Models (KPIs, Records)
│   ├── constants.py            # API Base URLs & User Agents
│   ├── search.py               # Widget: Fuzzy Address Search
│   ├── scorecard.py            # Widget: Property KPI Scorecard
│   ├── interactive_earth.py    # Widget: Google Maps 3D View
│   ├── market_trends.py        # Widget: Plotly Market Charts
│   ├── market_balance.py       # Widget: Supply/Demand Gauge
│   ├── activity_proxy.py       # Widget: Foot Traffic Analysis
│   ├── benchmarker.py          # Widget: Peer Comparison
│   └── stakeholders.py         # Widget: Owner/Developer Table
├── workspace_config/
│   └── widgets.json            # OpenBB Workspace Widget Configuration
├── tests/
│   └── test_live_api.py        # Async Integration Tests
├── main.py                     # FastAPI Entry Point & Startup Verification
├── .env.example                # Template for API Keys
├── pyproject.toml              # Package & Dependency Metadata
├── requirements.txt            # Python Dependencies
└── README.md                   # System Documentation
```

## 🔑 Key Components

### 1. The Package (`openbb_revista`)
The core logic resides here. Each widget is isolated in its own module for maintainability.
*   **`models.py`**: Defines strict schemas (`PropertyRecord`, `KPIModel`) to ensure data consistency.
*   **`router.py`**: The interface between OpenBB Core and the extension. It registers commands (e.g., `/revista/scorecard`) and handles type conversion (DataFrame -> Dict).
*   **Async Logic**: All network I/O uses `aiohttp` for non-blocking performance.

### 2. Configuration & Secrets
*   **`.env`**: Stores sensitive credentials (`REVISTA_API_KEY`, `GOOGLE_MAPS_API_KEY`). **Never commit this file.**
*   **`widgets.json`**: Defines the metadata (name, params, endpoint) that OpenBB Workspace reads to render the UI.

### 3. Entry Point (`main.py`)
A standalone FastAPI wrapper that:
*   Mounts the OpenBB Router.
*   Enables CORS for Workspace integration.
*   Serves `widgets.json`.
*   **Startup Smoke Test**: Automatically attempts a live search on boot to verify connectivity and keys.

## 🚀 Installation & Usage

### Prerequisites
*   Python 3.9+
*   RevistaMed API Key
*   Google Maps API Key

### Setup
1.  **Clone the repository**.
2.  **Install Dependencies**:
    ```bash
    pip install -e .
    ```
3.  **Configure Environment**:
    Copy `.env.example` to `.env` and populate your keys:
    ```bash
    cp .env.example .env
    # Edit .env with your actual keys
    ```

### Running the App
Start the server using `main.py` (which wraps `uvicorn`):
```bash
python main.py
```
*   The app will print a **Startup Self-Test** report to the console.
*   **Health Check**: http://localhost:8000/health (Check this if you have connection issues)
*   API Documentation (Swagger UI): http://localhost:8000/docs
*   Widgets Config: http://localhost:8000/widgets.json

### OpenBB Workspace Configuration
1.  Open **OpenBB Workspace**.
2.  Go to **Settings** -> **Data**.
3.  Click **Add Custom Backend**.
4.  Enter the URL: `http://localhost:8000/widgets.json`
5.  Click **Save**. The Revista widgets should now appear in your widget library.

### Testing
Run the asynchronous integration test suite to verify all widgets against live APIs:
```bash
python -m unittest tests/test_live_api.py
```
*(Note: Tests will skip automatically if API keys are missing.)*

## 📦 Dependencies
*   `openbb-core` (Extension framework)
*   `fastapi`, `uvicorn` (Server)
*   `aiohttp` (Async HTTP)
*   `pandas` (Data Manipulation)
*   `plotly` (Charting)
*   `pydantic` (Data Validation)
*   `python-dotenv` (Configuration)
