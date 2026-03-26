"""Quick validation of widgets.json and apps.json"""
import json, sys

# Validate widgets.json
w = json.load(open("widgets.json", encoding="utf-8"))
assert isinstance(w, dict), "widgets.json must be a dict"
print(f"✅ widgets.json: {len(w)} widgets (dict format)")
for wid, cfg in w.items():
    assert "name" in cfg, f"Widget {wid} missing 'name'"
    assert "type" in cfg, f"Widget {wid} missing 'type'"
    assert "endpoint" in cfg, f"Widget {wid} missing 'endpoint'"
    fmt = cfg.get("columns", [])
    for col in fmt:
        ff = col.get("formatterFn", "")
        assert ff != "currency", f"Widget {wid} col {col.get('field')} uses invalid 'currency' formatterFn"
print("✅ All widgets have required fields, no invalid formatterFn")

# Validate apps.json
a = json.load(open("apps.json", encoding="utf-8"))
assert isinstance(a, list), "apps.json must be an array"
print(f"✅ apps.json: array with {len(a)} app(s)")
for app in a:
    for req in ["name", "description", "allowCustomization", "tabs", "groups", "prompts"]:
        assert req in app, f"App missing '{req}'"
    for tid, tab in app["tabs"].items():
        assert "id" in tab, f"Tab {tid} missing 'id'"
        assert "name" in tab, f"Tab {tid} missing 'name'"
        assert "layout" in tab, f"Tab {tid} missing 'layout'"
        for item in tab["layout"]:
            assert "i" in item, f"Layout item missing 'i'"
            assert item["i"] in w, f"Widget '{item['i']}' not found in widgets.json"
            assert all(k in item for k in ["x","y","w","h"]), f"Layout {item['i']} missing position"
    for g in app["groups"]:
        assert "name" in g, f"Group missing 'name'"
        assert g["name"].startswith("Group "), f"Group name '{g['name']}' must follow 'Group N' pattern"
print(f"✅ All tabs, layouts, groups valid. Tabs: {list(a[0]['tabs'].keys())}")
print(f"✅ Groups: {[g['name'] for g in a[0]['groups']]}")
print("\n🎉 All validations passed!")
