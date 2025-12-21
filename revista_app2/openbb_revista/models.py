from typing import Optional, List, Union
from pydantic import BaseModel, Field
from datetime import datetime

class KPIModel(BaseModel):
    """
    Model for Key Performance Indicators or similar summary metrics.
    Inferred from Scorecard usage.
    """
    name: str
    value: Union[float, str]
    unit: Optional[str] = None
    trend: Optional[str] = None

class PropertyRecord(BaseModel):
    """
    Corresponds to 'Property' schema in RevistaMed API.
    """
    propertyID: int
    propertyName: Optional[str] = None
    propertyType: Optional[str] = None
    propertyStatus: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    stateProvince: Optional[str] = None
    zip5: Optional[str] = None
    lat: float
    lon: float
    tenancy: Optional[str] = None
    onCampus: Optional[str] = None
    owner: Optional[str] = None
    ownershipType: Optional[str] = None
    yearBuilt: Optional[int] = None
    squareFeet: Optional[int] = None

class PropertyOverviewModel(BaseModel):
    """
    Corresponds to 'PropertySummary' schema.
    """
    propertyID: int
    propertyName: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    stateProvince: Optional[str] = None
    zip5: Optional[str] = None
    lat: float
    lon: float
    propertyType: Optional[str] = None
    yearBuilt: Optional[int] = None
    squareFeet: Optional[int] = None
    providerCount: Optional[int] = None
    milesToNearestHospital: Optional[float] = None
    occupancy: Optional[str] = None # Often returned as string or float depending on endpoint
    ppsf: Optional[float] = None
    capRate_Avg_TTM: Optional[float] = None

class TransactionModel(BaseModel):
    """
    Corresponds to 'Transactions' schema.
    """
    transactionID: int
    propertyID: int
    propertyName: Optional[str] = None
    transactionDate: Optional[datetime] = None
    sellerName: Optional[str] = None
    buyerName: Optional[str] = None
    price_Property_Allocated: Optional[float] = None
    pricePerSF: Optional[float] = None
    capRate: Optional[float] = None

class OwnerModel(BaseModel):
    """
    Corresponds to 'Stakeholder' schema.
    """
    stakeholderID: int
    stakeholderName: Optional[str] = None
    stakeholderType: Optional[str] = None
    primaryOwner: Optional[bool] = None
    contactName: Optional[str] = None
    contactEmail: Optional[str] = None
    phone: Optional[str] = None
