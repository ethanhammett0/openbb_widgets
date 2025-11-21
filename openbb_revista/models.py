from pydantic import BaseModel, Field
from typing import Optional, Literal

class KPIModel(BaseModel):
    """Standardized Metric Widget Output"""
    label: str
    value: str | float
    delta: Optional[float] = Field(default=None, description="Decimal percent change (0.15 = 15%)")
    delta_text: Optional[str] = Field(default=None, description="Text description of the delta (e.g., 'YoY')")

class MapPoint(BaseModel):
    """Geospatial Data Point"""
    lat: float
    lon: float
    name: str
    value: float
    category: str

class PropertyRecord(BaseModel):
    """Tabular Data Record"""
    property_id: str
    property_name: str
    address: str
    city: str
    # Relaxed to str to handle API variations like "In Progress"
    construction_status: str
    completion_date: str
