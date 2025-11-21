from pydantic import BaseModel, Field
from typing import Optional, Literal, List

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
    construction_status: str
    completion_date: str

class PropertyOverviewModel(BaseModel):
    """Detailed Property View"""
    property_id: int
    name: str
    address: str
    city: str
    year_built: Optional[int] = None
    tenancy: Optional[str] = None
    occupancy_rate: Optional[float] = None
    square_feet: int
    provider_count: int
    hospital_affiliation: Optional[str] = None

class TransactionModel(BaseModel):
    """Transaction History"""
    date: str
    price: Optional[float] = None
    price_per_sf: Optional[float] = None
    seller: Optional[str] = None
    buyer: Optional[str] = None
    type: Optional[str] = None

class OwnerModel(BaseModel):
    """Owner/Stakeholder Info"""
    owner_name: Optional[str] = None
    owner_type: Optional[str] = None
    stakeholders: List[str] = []
