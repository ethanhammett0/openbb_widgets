
import json
import requests
import sys
import os

DOCS_URL = "https://api.revistamed.com/v1/docs.json"
OUTPUT_FILE = "revista_docs.json"

def fetch_swagger_docs(url):
    print(f"Fetching docs from {url}...")
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching docs: {e}")
        sys.exit(1)

def build_knowledge_graph(swagger_data):
    print("Building knowledge graph...")
    nodes = []
    edges = []
    
    # 1. Parse Paths (Endpoints)
    paths = swagger_data.get("paths", {})
    for path, methods in paths.items():
        for method, details in methods.items():
            endpoint_id = f"{method.upper()} {path}"
            
            # Create Node for Endpoint
            node = {
                "id": endpoint_id,
                "type": "endpoint",
                "label": endpoint_id,
                "data": {
                    "path": path,
                    "method": method.upper(),
                    "summary": details.get("summary", ""),
                    "description": details.get("description", ""),
                    "tags": details.get("tags", []),
                    "operationId": details.get("operationId", "")
                }
            }
            nodes.append(node)
            
            # 2. Parse Responses to link to Models
            responses = details.get("responses", {})
            for status, response_data in responses.items():
                content = response_data.get("content", {})
                json_schema = content.get("application/json", {}).get("schema", {})
                
                # Check for $ref
                ref = json_schema.get("$ref")
                if ref:
                    model_name = ref.split("/")[-1]
                    edges.append({
                        "source": endpoint_id,
                        "target": model_name,
                        "relationship": "returns",
                        "data": {"status": status}
                    })
                
                # Check for array of $ref
                if json_schema.get("type") == "array" and json_schema.get("items", {}).get("$ref"):
                    ref = json_schema.get("items", {}).get("$ref")
                    model_name = ref.split("/")[-1]
                    edges.append({
                        "source": endpoint_id,
                        "target": model_name,
                        "relationship": "returns",
                        "data": {"status": status, "is_list": True}
                    })

    # 3. Parse Components (Models)
    components = swagger_data.get("components", {}).get("schemas", {})
    for model_name, schema in components.items():
        # Create Node for Model
        node = {
            "id": model_name,
            "type": "model",
            "label": model_name,
            "data": {
                "description": schema.get("description", ""),
                "properties": list(schema.get("properties", {}).keys())
            }
        }
        nodes.append(node)
        
        # Link Model properties to other Models (Relationships)
        properties = schema.get("properties", {})
        for prop_name, prop_details in properties.items():
            ref = prop_details.get("$ref")
            if ref:
                target_model = ref.split("/")[-1]
                edges.append({
                    "source": model_name,
                    "target": target_model,
                    "relationship": "has_property",
                    "data": {"property": prop_name}
                })

    return {"nodes": nodes, "edges": edges}

def main():
    swagger_data = fetch_swagger_docs(DOCS_URL)
    graph = build_knowledge_graph(swagger_data)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2)
    
    print(f"Knowledge graph saved to {OUTPUT_FILE}")
    print(f"Nodes: {len(graph['nodes'])}, Edges: {len(graph['edges'])}")

if __name__ == "__main__":
    main()
