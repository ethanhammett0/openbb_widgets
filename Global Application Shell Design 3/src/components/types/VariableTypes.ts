export interface VariableField {
  id: string;
  name: string;
  dataType: "Text" | "Number" | "Date" | "Boolean" | "Dropdown" | "Multi-select" | "Currency" | "Percentage";
  semanticType: "String" | "Integer" | "Float" | "DateTime" | "Boolean" | "Enum" | "Array" | "Object";
  systemApiKey: string;
  definition: string;
  analyticalConsiderations: string;
  isEnabled: boolean;
  isRequired?: boolean;
  options?: string[]; // For dropdown/multi-select types
  defaultValue?: any;
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
    required?: boolean;
  };
  order: number;
}

export interface VariableSection {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  isExpanded: boolean;
  fields: VariableField[];
  order: number;
}

export interface VariableConfiguration {
  id: string;
  name: string;
  description?: string;
  version: string;
  lastModified: Date;
  sections: VariableSection[];
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description?: string;
  configuration: VariableConfiguration;
  createdAt: Date;
  lastModified: Date;
}

export interface VariableConfigurationContextType {
  configuration: VariableConfiguration;
  updateConfiguration: (config: Partial<VariableConfiguration>) => void;
  addSection: (section: Omit<VariableSection, "id" | "order">) => void;
  updateSection: (sectionId: string, updates: Partial<VariableSection>) => void;
  deleteSection: (sectionId: string) => void;
  addField: (sectionId: string, field: Omit<VariableField, "id" | "order">) => void;
  updateField: (sectionId: string, fieldId: string, updates: Partial<VariableField>) => void;
  deleteField: (sectionId: string, fieldId: string) => void;
  reorderSections: (sections: VariableSection[]) => void;
  reorderFields: (sectionId: string, fields: VariableField[]) => void;
  exportConfiguration: () => string;
  importConfiguration: (configJson: string) => void;
  resetToDefaults: () => void;
  // Template management
  templates: ConfigurationTemplate[];
  currentTemplateId: string | null;
  saveAsTemplate: (name: string, description?: string) => string;
  loadTemplate: (templateId: string) => void;
  updateTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;
  createNewConfiguration: () => void;
}

// Default configuration templates
export const DEFAULT_DEAL_CLASSIFICATION_FIELDS: Omit<VariableField, "id" | "order">[] = [
  {
    name: "Deal Type",
    dataType: "Dropdown",
    semanticType: "Enum",
    systemApiKey: "deal_type",
    definition: "Primary classification of the real estate transaction type",
    analyticalConsiderations: "Drives risk assessment models and comparable selection criteria",
    isEnabled: true,
    isRequired: true,
    options: ["Acquisition", "Refinancing", "Development", "Bridge", "Construction"]
  },
  {
    name: "Property Type",
    dataType: "Dropdown",
    semanticType: "Enum",
    systemApiKey: "property_type",
    definition: "Primary use classification of the underlying real estate asset",
    analyticalConsiderations: "Affects underwriting standards, market analysis, and risk profiling",
    isEnabled: true,
    isRequired: true,
    options: ["Office", "Retail", "Industrial", "Multifamily", "Hotel", "Mixed-Use", "Land"]
  },
  {
    name: "Transaction Size",
    dataType: "Currency",
    semanticType: "Float",
    systemApiKey: "transaction_size",
    definition: "Total value of the real estate transaction",
    analyticalConsiderations: "Key metric for portfolio allocation and risk concentration analysis",
    isEnabled: true,
    isRequired: true
  },
  {
    name: "Loan Amount",
    dataType: "Currency",
    semanticType: "Float",
    systemApiKey: "loan_amount",
    definition: "Principal amount of the debt financing",
    analyticalConsiderations: "Critical for LTV calculations and debt service coverage analysis",
    isEnabled: true,
    isRequired: true
  }
];

export const DEFAULT_VERTICAL_SPECIFIC_FIELDS: Omit<VariableField, "id" | "order">[] = [
  {
    name: "Cap Rate",
    dataType: "Percentage",
    semanticType: "Float",
    systemApiKey: "cap_rate",
    definition: "Capitalization rate representing the ratio of NOI to property value",
    analyticalConsiderations: "Key valuation metric for income-producing properties, varies by market and property type",
    isEnabled: true,
    isRequired: false
  },
  {
    name: "Occupancy Rate",
    dataType: "Percentage",
    semanticType: "Float",
    systemApiKey: "occupancy_rate",
    definition: "Percentage of rentable space currently occupied by tenants",
    analyticalConsiderations: "Direct impact on income stability and cash flow projections",
    isEnabled: true,
    isRequired: false
  },
  {
    name: "Average Rent PSF",
    dataType: "Currency",
    semanticType: "Float",
    systemApiKey: "avg_rent_psf",
    definition: "Average rental rate per square foot across all lease agreements",
    analyticalConsiderations: "Market positioning indicator and revenue optimization potential",
    isEnabled: true,
    isRequired: false
  },
  {
    name: "WALT (Years)",
    dataType: "Number",
    semanticType: "Float",
    systemApiKey: "walt_years",
    definition: "Weighted Average Lease Term remaining across all tenants",
    analyticalConsiderations: "Income stability metric and leasing risk assessment factor",
    isEnabled: true,
    isRequired: false
  }
];

export const createDefaultConfiguration = (): VariableConfiguration => ({
  id: "default-config",
  name: "Default Deal Variables",
  description: "Standard variable configuration for real estate deal analysis",
  version: "1.0.0",
  lastModified: new Date(),
  sections: [
    {
      id: "deal-classification",
      name: "Deal Classification",
      description: "Core deal identification and categorization variables",
      isEnabled: true,
      isExpanded: true,
      order: 0,
      fields: DEFAULT_DEAL_CLASSIFICATION_FIELDS.map((field, index) => ({
        ...field,
        id: `dc-${index}`,
        order: index
      }))
    },
    {
      id: "vertical-specific",
      name: "Vertical Specific Variables",
      description: "Industry and property type specific metrics and KPIs",
      isEnabled: true,
      isExpanded: true,
      order: 1,
      fields: DEFAULT_VERTICAL_SPECIFIC_FIELDS.map((field, index) => ({
        ...field,
        id: `vs-${index}`,
        order: index
      }))
    }
  ]
});