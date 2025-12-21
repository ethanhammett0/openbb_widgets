import csv
import os
from typing import List, Dict, Any, Optional

def parse_construction_value(value: str) -> Optional[float]:
    """Parses construction value string (e.g., '108.04 M') to float."""
    if not value or value.strip() == '-' or value.strip() == '':
        return None
    
    clean_value = value.replace('$', '').replace(',', '').strip()
    if clean_value.endswith(' M'):
        try:
            return float(clean_value[:-2]) * 1_000_000
        except ValueError:
            return None
    try:
        return float(clean_value)
    except ValueError:
        return None

def parse_prelease_percent(value: str) -> Optional[int]:
    """Parses prelease percent string to integer."""
    if not value or value.strip() == '-' or value.strip() == '':
        return None
    try:
        return int(float(value.replace('%', '').strip()))
    except ValueError:
        return None

def load_data() -> List[Dict[str, Any]]:
    """Loads data from revista_data.csv and processes it."""
    csv_path = os.path.join(os.path.dirname(__file__), 'revista_data.csv')
    data = []
    
    with open(csv_path, mode='r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            # Process specific fields
            row['Construction Value Raw'] = row['Construction Value'] # Keep original for display
            row['Construction Value'] = parse_construction_value(row['Construction Value'])
            
            row['Prelease Percent Raw'] = row['Prelease Percent'] # Keep original
            row['Prelease Percent'] = parse_prelease_percent(row['Prelease Percent'])
            
            # Handle Expected Yield
            if not row['Expected Yield'] or row['Expected Yield'].strip() == '-':
                 row['Expected Yield'] = None
            
            data.append(row)
    return data

REVISTA_DATA = load_data()
