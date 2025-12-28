// Drag-and-Drop Template Builder Types

export type VariableDataType = "Text" | "Date" | "Currency" | "Number" | "Percentage" | "Dropdown" | "Lookup" | "Array";

export type LibraryCategory = "entity" | "asset" | "contract" | "loan" | "quantitative";

export type TemplateSection = "entities_roles" | "asset_group" | "contracts" | "loans" | "quantitative_data";

// Dropped Item in Tree Node Tray
export interface DroppedItem {
  id: string;
  type: "variable" | "template";
  variableId?: string; // For variable type
  templateId?: string; // For template type
  displayName: string;
  dataType?: VariableDataType; // For variable type
  order: number;
}

// Tree Node Structure for Relational Database Design
export interface TreeNode {
  id: string;
  variableId: string; // Reference to library variable
  displayName: string;
  dataType: VariableDataType;
  systemConcept?: DataModelField;
  parentId: string | null; // null for root nodes
  children: string[]; // IDs of child nodes
  isExpanded: boolean;
  isPrimaryKey: boolean;
  foreignKeyRef?: ForeignKeyRelationship; // If this node references another table
  order: number; // Order among siblings
  exampleValue?: string;
  dropdownOptions?: string[];
  dropdownValue?: string;
  droppedItems?: DroppedItem[]; // Templates and variables dropped into the tray
}

// Foreign Key Relationship Definition
export interface ForeignKeyRelationship {
  targetNodeId: string; // The node this FK references
  targetTableName: string; // Human-readable table name
  relationshipType: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
}

// Data Model field for System Concept linking
export interface DataModelField {
  id: string;
  path: string; // e.g., "Entity.entity_name"
  table: string; // e.g., "Entity"
  field: string; // e.g., "entity_name"
  description: string;
  dataType: string;
}

// Variable definition in the library
export interface LibraryVariable {
  id: string;
  displayName: string;
  dataType: VariableDataType;
  systemConcept?: DataModelField; // Link to data model
  category: LibraryCategory;
  createdAt: Date;
  // Validation and configuration
  isRequired?: boolean;
  minValue?: number;
  maxValue?: number;
  decimalPlaces?: number;
  dropdownOptions?: string[]; // For dropdown data type
  definition?: string;
  sourceOfTruth?: string[];
  sourceDetail?: string;
  tags?: string[];
  systemTags?: string[];
}

// Variable instance in a template table (when dropped)
export interface TemplateColumnVariable {
  id: string; // Unique instance ID
  variableId: string; // Reference to library variable
  displayName: string;
  dataType: VariableDataType;
  systemConcept?: DataModelField;
  order: number;
  exampleValue?: string; // Placeholder/example data
  // Lookup-specific data
  lookupLinks?: string[]; // IDs of linked variables from other tables
  // Dropdown-specific data
  dropdownOptions?: string[]; // Available options for this dropdown instance
  dropdownValue?: string; // Selected value
  // Nested template data (for Array type)
  linkedTemplateId?: string; // Reference to a TemplateLibraryItem for nested structures
  linkedTemplateName?: string; // Display name of the linked template
}

// Template table structure
export interface TemplateTable {
  id: string;
  section: TemplateSection;
  name: string;
  primaryKey: string; // e.g., "Entity Name"
  columns: TemplateColumnVariable[];
  isExpanded: boolean;
}

// Complete template configuration
export interface TemplateConfiguration {
  id: string;
  name: string;
  description?: string;
  version: string;
  lastModified: Date;
  libraryVariables: LibraryVariable[];
  tables: TemplateTable[];
}

// Template for saving/loading
export interface ConfigurationTemplate {
  id: string;
  name: string;
  description?: string;
  configuration: TemplateConfiguration;
  createdAt: Date;
  lastModified: Date;
}

// Template Library Item - Reusable template snippets
export interface TemplateLibraryItem {
  id: string;
  name: string;
  description?: string;
  category: LibraryCategory;
  table: TemplateTable; // The table structure that can be linked/inserted
  createdAt: Date;
  lastModified: Date;
  tags?: string[];
}

// Context type
export interface TemplateBuilderContextType {
  configuration: TemplateConfiguration;
  updateConfiguration: (updates: Partial<TemplateConfiguration>) => void;
  
  // Library variable management
  addLibraryVariable: (variable: Omit<LibraryVariable, "id" | "createdAt">) => void;
  updateLibraryVariable: (id: string, updates: Partial<LibraryVariable>) => void;
  deleteLibraryVariable: (id: string) => void;
  getLibraryVariablesByCategory: (category: LibraryCategory) => LibraryVariable[];
  
  // Template table management
  addVariableToTable: (tableId: string, variableId: string) => void;
  removeVariableFromTable: (tableId: string, columnId: string) => void;
  reorderTableColumns: (tableId: string, columns: TemplateColumnVariable[]) => void;
  toggleTableExpansion: (tableId: string) => void;
  updateTablePrimaryKey: (tableId: string, primaryKey: string) => void;
  updateTableName: (tableId: string, name: string) => void;
  addVariableGroup: (name: string, primaryKey: string) => void;
  deleteVariableGroup: (tableId: string) => void;
  
  // Lookup and Dropdown management
  updateColumnLookupLinks: (tableId: string, columnId: string, linkedVariableIds: string[]) => void;
  updateColumnDropdownOptions: (tableId: string, columnId: string, options: string[]) => void;
  updateColumnDropdownValue: (tableId: string, columnId: string, value: string) => void;
  addDropdownOption: (tableId: string, columnId: string, option: string) => void;
  getVariablesForLookupTable: (systemConceptTable: string) => TemplateColumnVariable[];
  
  // Template management
  templates: ConfigurationTemplate[];
  currentTemplateId: string | null;
  saveAsTemplate: (name: string, description?: string) => string;
  loadTemplate: (templateId: string) => void;
  updateTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;
  createNewConfiguration: () => void;
  createNewTemplate: (name?: string) => string;
  switchToTemplate: (templateId: string) => void;
  updateTemplateName: (templateId: string, name: string) => void;
  reorderTemplates: (fromIndex: number, toIndex: number) => void;
  
  // Template Library management
  templateLibrary: TemplateLibraryItem[];
  addTemplateToLibrary: (name: string, description: string | undefined, category: LibraryCategory, tableId: string) => void;
  updateTemplateLibraryItem: (id: string, updates: Partial<Omit<TemplateLibraryItem, 'id' | 'createdAt'>>) => void;
  deleteTemplateLibraryItem: (id: string) => void;
  getTemplateLibraryItemsByCategory: (category: LibraryCategory) => TemplateLibraryItem[];
  linkTemplateToTable: (tableId: string, templateLibraryId: string) => void;
  
  // Import/Export
  exportConfiguration: () => string;
  importConfiguration: (configJson: string) => void;
  resetToDefaults: () => void;
}

// Data Model Architecture v1 - Sample fields for System Concept linking
export const DATA_MODEL_FIELDS: DataModelField[] = [
  // Entity fields
  { id: "entity_name", path: "Entity.entity_name", table: "Entity", field: "entity_name", description: "Legal name of the entity", dataType: "String" },
  { id: "entity_type", path: "Entity.entity_type", table: "Entity", field: "entity_type", description: "Type of entity (Borrower, Sponsor, Guarantor)", dataType: "Enum" },
  { id: "entity_tax_id", path: "Entity.tax_id", table: "Entity", field: "tax_id", description: "Federal tax identification number", dataType: "String" },
  { id: "entity_jurisdiction", path: "Entity.jurisdiction", table: "Entity", field: "jurisdiction", description: "State or country of formation", dataType: "String" },
  { id: "entity_ownership_pct", path: "Entity.ownership_percentage", table: "Entity", field: "ownership_percentage", description: "Ownership percentage in structure", dataType: "Float" },
  
  // RealEstateAsset fields (Corporate Lending Schema)
  { id: "asset_id", path: "Assets.asset_id", table: "Assets", field: "asset_id", description: "Primary Key. Unique identifier for each property", dataType: "Integer" },
  { id: "asset_deal_id", path: "Assets.deal_id", table: "Assets", field: "deal_id", description: "Foreign Key referencing Deals.deal_id", dataType: "Integer" },
  { id: "asset_property_name", path: "Assets.property_name", table: "Assets", field: "property_name", description: "Common name of the property", dataType: "String" },
  { id: "asset_address", path: "Assets.address", table: "Assets", field: "address", description: "Full physical address of the property", dataType: "String" },
  { id: "asset_property_type", path: "Assets.property_type", table: "Assets", field: "property_type", description: "Asset class (Multifamily, Office, Industrial, Hospitality)", dataType: "Enum" },
  { id: "asset_profile", path: "Assets.asset_profile", table: "Assets", field: "asset_profile", description: "Stabilized or Transitional", dataType: "Enum" },
  { id: "asset_appraised_value_as_is", path: "Assets.appraised_value_as_is", table: "Assets", field: "appraised_value_as_is", description: "The appraised value in current state", dataType: "Currency" },
  { id: "asset_appraised_value_stabilized", path: "Assets.appraised_value_stabilized", table: "Assets", field: "appraised_value_stabilized", description: "Projected value after renovations/lease-up", dataType: "Currency" },
  { id: "asset_appraisal_date", path: "Assets.appraisal_date", table: "Assets", field: "appraisal_date", description: "The effective date of the appraisal", dataType: "DateTime" },
  
  // Contract fields
  { id: "contract_type", path: "Contract.contract_type", table: "Contract", field: "contract_type", description: "Type of contract", dataType: "Enum" },
  { id: "contract_effective_date", path: "Contract.effective_date", table: "Contract", field: "effective_date", description: "Contract effective date", dataType: "DateTime" },
  { id: "contract_expiration_date", path: "Contract.expiration_date", table: "Contract", field: "expiration_date", description: "Contract expiration date", dataType: "DateTime" },
  { id: "contract_value", path: "Contract.contract_value", table: "Contract", field: "contract_value", description: "Total contract value", dataType: "Currency" },
  { id: "contract_counterparty", path: "Contract.counterparty", table: "Contract", field: "counterparty", description: "Counterparty name", dataType: "String" },
  
  // Loan fields
  { id: "loan_amount", path: "Loan.principal_amount", table: "Loan", field: "principal_amount", description: "Original loan principal", dataType: "Currency" },
  { id: "loan_interest_rate", path: "Loan.interest_rate", table: "Loan", field: "interest_rate", description: "Annual interest rate", dataType: "Float" },
  { id: "loan_origination_date", path: "Loan.origination_date", table: "Loan", field: "origination_date", description: "Loan origination date", dataType: "DateTime" },
  { id: "loan_maturity_date", path: "Loan.maturity_date", table: "Loan", field: "maturity_date", description: "Loan maturity date", dataType: "DateTime" },
  { id: "loan_type", path: "Loan.loan_type", table: "Loan", field: "loan_type", description: "Type of loan product", dataType: "Enum" },
  { id: "loan_lender", path: "Loan.lender_name", table: "Loan", field: "lender_name", description: "Name of lending institution", dataType: "String" },
  { id: "loan_ltv", path: "Loan.loan_to_value", table: "Loan", field: "loan_to_value", description: "Loan-to-value ratio", dataType: "Float" },
  
  // Quantitative fields
  { id: "quant_noi", path: "FinancialMetrics.net_operating_income", table: "FinancialMetrics", field: "net_operating_income", description: "Net Operating Income", dataType: "Currency" },
  { id: "quant_dscr", path: "FinancialMetrics.debt_service_coverage_ratio", table: "FinancialMetrics", field: "debt_service_coverage_ratio", description: "Debt Service Coverage Ratio", dataType: "Float" },
  { id: "quant_cap_rate", path: "FinancialMetrics.cap_rate", table: "FinancialMetrics", field: "cap_rate", description: "Capitalization Rate", dataType: "Float" },
  { id: "quant_occupancy", path: "FinancialMetrics.occupancy_rate", table: "FinancialMetrics", field: "occupancy_rate", description: "Property occupancy rate", dataType: "Float" },
  { id: "quant_irr", path: "FinancialMetrics.internal_rate_of_return", table: "FinancialMetrics", field: "internal_rate_of_return", description: "Internal Rate of Return", dataType: "Float" },
];

// Entity Profile Schema - Pre-populated fields for Entities & Roles table
const createEntityProfileVariables = (): LibraryVariable[] => {
  const baseTimestamp = Date.now();
  return [
    {
      id: `var-${baseTimestamp}-1`,
      displayName: "Entity ID",
      dataType: "Text",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "entity_name"),
      category: "entity",
      createdAt: new Date(),
    },
    {
      id: `var-${baseTimestamp}-2`,
      displayName: "Entity Legal Name",
      dataType: "Text",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "entity_name"),
      category: "entity",
      createdAt: new Date(),
    },
    {
      id: `var-${baseTimestamp}-3`,
      displayName: "Entity Short Name",
      dataType: "Text",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "entity_name"),
      category: "entity",
      createdAt: new Date(),
    },
    {
      id: `var-${baseTimestamp}-4`,
      displayName: "Entity Type",
      dataType: "Dropdown",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "entity_type"),
      category: "entity",
      createdAt: new Date(),
    },
    {
      id: `var-${baseTimestamp}-5`,
      displayName: "Entity Industry",
      dataType: "Dropdown",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "entity_type"),
      category: "entity",
      createdAt: new Date(),
    },
    {
      id: `var-${baseTimestamp}-6`,
      displayName: "Domicile Country",
      dataType: "Dropdown",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "entity_jurisdiction"),
      category: "entity",
      createdAt: new Date(),
    },
    {
      id: `var-${baseTimestamp}-7`,
      displayName: "Credit Rating (S&P)",
      dataType: "Text",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "entity_name"),
      category: "entity",
      createdAt: new Date(),
    },
    {
      id: `var-${baseTimestamp}-8`,
      displayName: "Financials",
      dataType: "Array",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "entity_name"),
      category: "entity",
      createdAt: new Date(),
    },
  ];
};

const createEntityProfileColumns = (variables: LibraryVariable[]): TemplateColumnVariable[] => {
  return variables.map((variable, index) => ({
    id: `col-entity-${index}`,
    variableId: variable.id,
    displayName: variable.displayName,
    dataType: variable.dataType,
    systemConcept: variable.systemConcept,
    order: index,
    exampleValue: getEntityExampleValue(variable.displayName, variable.dataType),
    // Initialize dropdown options
    dropdownOptions: variable.dataType === "Dropdown" 
      ? getEntityDropdownOptions(variable.displayName)
      : undefined,
    dropdownValue: variable.dataType === "Dropdown"
      ? getEntityExampleValue(variable.displayName, variable.dataType)
      : undefined,
    lookupLinks: variable.dataType === "Lookup" ? [] : undefined,
  }));
};

// Helper to get example values for Entity Profile fields
function getEntityExampleValue(fieldName: string, dataType: VariableDataType): string {
  switch (fieldName) {
    case "Entity ID":
      return "ENT-00123";
    case "Entity Legal Name":
      return "ACME Inc.";
    case "Entity Short Name":
      return "ACME";
    case "Entity Type":
      return "Corporate";
    case "Entity Industry":
      return "Technology";
    case "Domicile Country":
      return "USA";
    case "Credit Rating (S&P)":
      return "AA+";
    case "Financials":
      return "View Details";
    default:
      if (dataType === "Date") return "2025-01-15";
      if (dataType === "Currency") return "$1,250,000";
      if (dataType === "Dropdown") return "Option 1";
      if (dataType === "Array") return "View Details";
      return "Sample Text";
  }
}

// Helper to get dropdown options for Entity Profile fields
function getEntityDropdownOptions(fieldName: string): string[] {
  switch (fieldName) {
    case "Entity Type":
      return ["Corporate", "Partnership", "LLC", "Trust", "Individual", "Government"];
    case "Entity Industry":
      return ["Technology", "Real Estate", "Finance", "Healthcare", "Manufacturing", "Retail", "Energy"];
    case "Domicile Country":
      return ["USA", "Canada", "United Kingdom", "Germany", "France", "Japan", "China", "Australia"];
    default:
      return ["Option 1", "Option 2", "Option 3"];
  }
}

// Asset Group Schema - Pre-populated fields for Asset Group table (Corporate Lending)
const createAssetGroupVariables = (): LibraryVariable[] => {
  const baseTimestamp = Date.now();
  return [
    {
      id: `var-asset-${baseTimestamp}-1`,
      displayName: "Asset ID",
      dataType: "Text",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "asset_id"),
      category: "asset",
      createdAt: new Date(),
    },
    {
      id: `var-asset-${baseTimestamp}-2`,
      displayName: "Deal ID",
      dataType: "Lookup",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "asset_deal_id"),
      category: "asset",
      createdAt: new Date(),
    },
    {
      id: `var-asset-${baseTimestamp}-3`,
      displayName: "Property Name",
      dataType: "Text",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "asset_property_name"),
      category: "asset",
      createdAt: new Date(),
    },
    {
      id: `var-asset-${baseTimestamp}-4`,
      displayName: "Address",
      dataType: "Text",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "asset_address"),
      category: "asset",
      createdAt: new Date(),
    },
    {
      id: `var-asset-${baseTimestamp}-5`,
      displayName: "Property Type",
      dataType: "Dropdown",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "asset_property_type"),
      category: "asset",
      createdAt: new Date(),
    },
    {
      id: `var-asset-${baseTimestamp}-6`,
      displayName: "Asset Profile",
      dataType: "Dropdown",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "asset_profile"),
      category: "asset",
      createdAt: new Date(),
    },
    {
      id: `var-asset-${baseTimestamp}-7`,
      displayName: "Appraised Value (As-Is)",
      dataType: "Currency",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "asset_appraised_value_as_is"),
      category: "asset",
      createdAt: new Date(),
    },
    {
      id: `var-asset-${baseTimestamp}-8`,
      displayName: "Appraised Value (Stabilized)",
      dataType: "Currency",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "asset_appraised_value_stabilized"),
      category: "asset",
      createdAt: new Date(),
    },
    {
      id: `var-asset-${baseTimestamp}-9`,
      displayName: "Appraisal Date",
      dataType: "Date",
      systemConcept: DATA_MODEL_FIELDS.find(f => f.id === "asset_appraisal_date"),
      category: "asset",
      createdAt: new Date(),
    },
  ];
};

const createAssetGroupColumns = (variables: LibraryVariable[]): TemplateColumnVariable[] => {
  return variables.map((variable, index) => ({
    id: `col-asset-${index}`,
    variableId: variable.id,
    displayName: variable.displayName,
    dataType: variable.dataType,
    systemConcept: variable.systemConcept,
    order: index,
    exampleValue: getAssetExampleValue(variable.displayName, variable.dataType),
    // Initialize dropdown options
    dropdownOptions: variable.dataType === "Dropdown" 
      ? getAssetDropdownOptions(variable.displayName)
      : undefined,
    dropdownValue: variable.dataType === "Dropdown"
      ? getAssetExampleValue(variable.displayName, variable.dataType)
      : undefined,
    lookupLinks: variable.dataType === "Lookup" ? [] : undefined,
  }));
};

// Helper to get example values for Asset Group fields
function getAssetExampleValue(fieldName: string, dataType: VariableDataType): string {
  switch (fieldName) {
    case "Asset ID":
      return "AST-00456";
    case "Deal ID":
      return "DEAL-00123";
    case "Property Name":
      return "The Grand Office Tower";
    case "Address":
      return "123 Market Street, San Francisco, CA 94105";
    case "Property Type":
      return "Office";
    case "Asset Profile":
      return "Stabilized";
    case "Appraised Value (As-Is)":
      return "$42,500,000";
    case "Appraised Value (Stabilized)":
      return "$48,000,000";
    case "Appraisal Date":
      return "2025-01-15";
    default:
      if (dataType === "Date") return "2025-01-15";
      if (dataType === "Currency") return "$1,250,000";
      if (dataType === "Dropdown") return "Option 1";
      if (dataType === "Lookup") return "Linked Value";
      if (dataType === "Array") return "View Details";
      return "Sample Text";
  }
}

// Helper to get dropdown options for Asset Group fields
function getAssetDropdownOptions(fieldName: string): string[] {
  switch (fieldName) {
    case "Property Type":
      return ["Multifamily", "Office", "Industrial", "Hospitality", "Retail", "Mixed-Use"];
    case "Asset Profile":
      return ["Stabilized", "Transitional"];
    default:
      return ["Option 1", "Option 2", "Option 3"];
  }
}

// Default empty template configuration
export const createDefaultTemplateConfiguration = (): TemplateConfiguration => {
  const entityVariables = createEntityProfileVariables();
  const assetVariables = createAssetGroupVariables();
  const entityColumns = createEntityProfileColumns(entityVariables);
  const assetColumns = createAssetGroupColumns(assetVariables);
  
  // Combine all library variables
  const allLibraryVariables = [
    ...entityVariables,
    ...assetVariables,
  ];
  
  return {
    id: `config-${Date.now()}`,
    name: "Corporate Lending Configuration",
    description: "Pre-configured with Entity Profile and Asset Group schemas for corporate lending",
    version: "1.0.0",
    lastModified: new Date(),
    libraryVariables: allLibraryVariables,
    tables: [
      {
        id: "table-entities",
        section: "entities_roles",
        name: "Entities & Roles",
        primaryKey: "Entity Legal Name",
        columns: entityColumns,
        isExpanded: true,
      },
      {
        id: "table-assets",
        section: "asset_group",
        name: "Asset Group",
        primaryKey: "Property Name",
        columns: assetColumns,
        isExpanded: true,
      },
      {
        id: "table-contracts",
        section: "contracts",
        name: "Contracts",
        primaryKey: "Contract Type",
        columns: [],
        isExpanded: true,
      },
      {
        id: "table-loans",
        section: "loans",
        name: "Loans",
        primaryKey: "Lender Name",
        columns: [],
        isExpanded: true,
      },
      {
        id: "table-quantitative",
        section: "quantitative_data",
        name: "Quantitative Data Points",
        primaryKey: "Metric Name",
        columns: [],
        isExpanded: true,
      },
    ],
  };
};

// Category metadata
export const LIBRARY_CATEGORIES = [
  { id: "entity" as LibraryCategory, name: "Entity Fields", icon: "Users" },
  { id: "asset" as LibraryCategory, name: "Asset Fields", icon: "Building2" },
  { id: "contract" as LibraryCategory, name: "Contract Fields", icon: "FileText" },
  { id: "loan" as LibraryCategory, name: "Loans", icon: "DollarSign" },
  { id: "quantitative" as LibraryCategory, name: "Quantitative Fields", icon: "BarChart3" },
];