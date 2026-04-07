# OpenBB Parameter Optimization Reference

This reference is an authoritative guide on how to configure and continuously optimize parameters within the OpenBB Workspace. 

**Core Directive**: The selection, configuration, and constraints of parameters MUST strictly respect the actual underlying ontology of the data backend. Do not invent arbitrary classification schemes or random groupings. If an unstructured dataset requires categorization for user navigability but lacks an existing ontology, you must prompt the user with data-derived options to create one, recommending the most mathematically or structurally sound approach for approval before implementation.

---

## Core Parameter Types

### 1. `text` (Standard Text Input)
- **Use Case Strategy**: Best used for inherently unstructured or infinitely vast input domains (e.g., wildcard search queries, company descriptions, or deeply nested JSON text blobs). 
- **Optimization Strategy**: Do not use `text` as a lazy shortcut. If the target data has a functionally finite ontology (e.g., 50 specific sectors, 12 exchanges, or 5 strict statuses), extract that true ontology from the data source and use an `endpoint` or `options` array instead. **Extensibility**: If the API natively supports fuzzy logic or partial string matching, keep parameters as `text` to leverage the API’s own search optimization algorithms, effectively shifting the filtering load to the server.
- **Configuration Implementation**: Set `"type": "text"`. Your configuration must precisely constrain user expectation by utilizing the `"description"` field. On the backend, your FastAPI endpoint must anticipate raw user strings: gracefully handle leading/trailing whitespaces, implement `.split(",")` for multi-inputs, and strip out invalid regex characters before making backend API requests.
- **Security Constraint (API Keys)**: **NEVER** use `text` parameters to accept API keys from users. OpenBB Workspace supports secure custom header injection (e.g., `X-FRED-API-KEY`). Instruct the user to add the backend with the API key in the Workspace UI data connector settings instead.

### 2. `number` (Numeric Input)
- **Use Case Strategy**: Used strictly for limits, thresholds, lookback windows, and pagination offsets.
- **Optimization Strategy**: Always audit the underlying data schema for hard API limits, minimums, maximums, and standard reporting constraints. If an API structurally caps responses at 500 records, never expose an unbounded number parameter. **Extensibility**: For continuous integer arrays (like price filtering), combine two number parameters (`min_price` and `max_price`) to unlock advanced bounding box architectures.
- **Configuration Implementation**: Set `"type": "number"`. 
  - *Frontend Bounding*: You MUST implement `"min"`, `"max"`, and `"step"` directly inside `widgets.json` (e.g., `"min": 1, "max": 500, "step": 10`). This physically restrains the React UI, preventing invalid API calls from ever firing.
  - *Backend Validation*: Python backends must mirror these constraints using strict typing (`paramName: int = Query(default=10, ge=1, le=500)`).

### 3. `boolean` (Toggle Switch)
- **Use Case Strategy**: Perfect for binary configuration states (e.g., "Include Extended Hours", "Raw Data", "Logarithmic Scale").
- **Optimization Strategy**: Map directly to binary flags explicitly supported by the underlying API or data schema (e.g., `adjusted=true`). Do not violently force or hallucinate boolean filters (like "Filter Positive News") unless you are actively computing a validated sentiment score predictably in the backend. **Extensibility**: Booleans are incredible for triggering heavy secondary calculations only when requested (e.g., `calculate_z_scores=False`), keeping the default widget load times blazing fast.
- **Configuration Implementation**: Set `"type": "boolean"`. Always configure `"value": false` or `"value": true` strictly based on the least destructive, fastest-loading, or most visually standard UI state. 

### 4. `date` (Date Picker)
- **Use Case Strategy**: Used to bound time-series queries.
- **Optimization Strategy**: Align the date parameter strictly to the temporality of the data. If the data is reported quarterly, snap the backend logic to quarter-ends. **Extensibility**: For live APIs, static dates create sterile, deteriorating dashboards. You must exclusively leverage dynamic variables so that the widget auto-rolls forward over time.
- **Configuration Implementation**: Set `"type": "date"`. Always default to dynamic relative strings (e.g., `"value": "$currentDate-1y"` for start, `$currentDate` for end). Ensure the default timeframe reflects a period where the dataset legitimately has density.

### 5. `endpoint` (Dynamic Dropdown)
- **Use Case Strategy**: Handles massive, frequently changing universes (like localized stock screeners or massive active blockchain protocols).
- **Optimization Strategy**: This is the absolute gold standard for respecting data ontology. The search endpoint should query the primary keys of the underlying database directly. **Extensibility**: If no master list endpoint exists natively on the target API, you must architect a backend caching function that selectively maps the distinct available universe from the raw datasets. 
- **Configuration Implementation**: Set `"type": "endpoint"`. Provide `"optionsEndpoint": "/my_options_route"`. The Python route MUST render a list of dictionaries exactly mapped as `[{"label": "Human Readable", "value": "SYSTEM_KEY"}]`. 

### 6. `tabs` (Category Tabs)
- **Use Case Strategy**: Renders as visual tabs across the top of the widget, structurally changing the visual schema without consuming vertical space.
- **Optimization Strategy**: Tabs should reflect top-level, mutually exclusive dimensions of the exact same underlying entity (e.g., Entity AAPL -> [Income Statement, Balance Sheet, Cash Flow]). Do not use tabs to arbitrarily fracture data unless a strict categorical column exists natively in the dataset. **Extensibility**: Excellent for swapping entirely different AgGrid column definitions on the fly.
- **Configuration Implementation**: Set `"type": "tabs"`. Provide an `"options"` array. The Python backend should inspect the incoming `tab_value` and literally restructure the return array into the specific schema requested by that tab, filtering out irrelevant keys to minimize JSON payload size.

### 7. `form` & `button` (Input State Manager)
- **Use Case Strategy**: Essential for complex data entry workflows or heavy multi-variate queries.
- **Optimization Strategy**: Deploy forms exclusively when the widget performs heavy computation or database writes. Optimize the nested `inputParams` exactly according to the required schema of the target.
- **Configuration Implementation**: Requires a dual-endpoint architecture constraint. 
  1. Define the parameters cleanly under `"inputParams": [...]`. Include a final parameter `"type": "button"`.
  2. Map the form `"endpoint": "/form_submit"`. This `POST` endpoint MUST return a `200 OK` status to trigger a Workspace refresh.
  3. Map the widget's root `"endpoint"` to a standard `GET` endpoint.

---

## Modifiers & Advanced Native Integrations

### `options` (Static Dropdown)
- **Optimization Strategy**: Hardcode these ONLY when the ontology is absolutely fixed by the core API spec (e.g., Timeframes: `"1min"`, `"1H"`, `"1D"`). Do not use this to lock in a dynamic universe. 
- **Configuration Implementation**: Provide an array of `{"label": "...", "value": "..."}`. The backend should utilize Enum validation (`class Timeframes(str, Enum):`).

### `optionsParams` (Dependent Cascading Dropdowns)
- **Optimization Strategy**: Use this to seamlessly guide the user through a hierarchical data ontology (e.g., `Asset Class` -> `Exchange` -> `Sector` -> `Ticker`). The parent parameter MUST accurately represent a real architectural parent dimension in the dataset. 
- **Configuration Implementation**: Add `"optionsParams": {"target_backend_arg": "$source_paramName"}`. 

### `extraInfo` (Rich Advanced Tooltips)
- **Optimization Strategy**: Always enrich dropdowns when the raw `value` (e.g., a LEI code or UUID) is unreadable to humans. Extract plain-English descriptors directly from the data source to populate `"description"` and `"rightOfDescription"`.
- **Configuration Implementation**: In the backend endpoint generating the options, append `"extraInfo": {"description": "Company Name", "rightOfDescription": "Exchange"}`. You MUST configure `"style": {"popupWidth": 450}` in `widgets.json` to physically widen the UI component.

### Server-Side Rendered Mode (SSRM)
- **Optimization Strategy**: Never build massive pagination into standard widget parameters if the user needs to scroll through 10,000+ rows (e.g. tick data or huge options chains). The standard Workspace widget memory space handles up to ~5,000 rows comfortably. For larger infinite-scroll data layers, parameter behavior must completely fundamentally shift to SSRM.
- **Configuration Implementation**: SSRM disables standard `endpoint` dropdowns and instead turns the widget into a streaming grid. You must implement specific OpenBB UDF routes (`/udf/config`, `/udf/search`, `/udf/symbols`, `/udf/history`) instead of standard parameterized queries.

### `roles: ["fileSelector"]` (Workspace Upload Integration)
- **Optimization Strategy**: Instead of building custom text inputs for URLs or raw base64 data blobs when analyzing custom documents, integrate natively with the Workspace file management UI.
- **Configuration Implementation**: Add `"roles": ["fileSelector"]` and `"type": "endpoint"`. Set `"optionsEndpoint"` to an options route that fetches the files from the OpenBB internal document mount.

### `optional` and `show`
- **Use Case Strategy**: `optional: true` permits the backend payload to fire without requiring a user entry, while `"show": false` completely hides the parameter from the frontend UI.
- **Optimization Strategy**: Use `optional` rigidly to allow widgets to load immediately with broad defaults (e.g. `limit` is optional). Use `show: false` to securely map architectural join keys (like `portfolio_id`) across Dashboard Parameter Groups without cluttering the UI. Do not use hidden parameters to pass static python configurations; leave those in `main.py`.

---

## Workspace Interaction Architectures

### Parameter Positioning Layout
By default, OpenBB Workspace places all parameters on a single row. Control the visual layout by using nested arrays in your `params` definition:
1. **Single Row**: `params: [{param1}, {param2}]`
2. **Multiple Rows**: `params: [ [{param1}, {param2}], [{param3}] ]` puts params 1 & 2 on row one, and param 3 on row two.
3. **Empty Rows**: `params: [ [], [{param1}, {param2}] ]` pushes elements precisely to the second row.

### Interactive Grouping Patterns
- **Parameter Grouping (Dashboard Level)**: Connects a global dropdown exactly matching a core primary key (like a stock ticker `symbol`) to multiple heterogeneous widgets simultaneously via `apps.json`.
- **Cell Click Grouping (Watchlist Pattern)**: Transforms any tabular list into an interactive algorithmic watchlist.
  - Set `"renderFn": "cellOnClick"` and `"renderFnParams": {"actionType": "groupBy", "groupByParamName": "shared_param"}` on the table column.
  - **Crucial Limitation**: Target charts must be standard `chart` (Plotly) type, as `advanced_charting` (TradingView) objectively does not support parameter grouping callbacks.
