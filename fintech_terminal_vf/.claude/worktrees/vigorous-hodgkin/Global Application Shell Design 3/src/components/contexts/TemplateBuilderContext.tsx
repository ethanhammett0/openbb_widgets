import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import {
  TemplateConfiguration,
  TemplateBuilderContextType,
  LibraryVariable,
  TemplateColumnVariable,
  ConfigurationTemplate,
  LibraryCategory,
  TemplateLibraryItem,
  createDefaultTemplateConfiguration,
} from "../types/TemplateBuilderTypes";

const TemplateBuilderContext = createContext<TemplateBuilderContextType | undefined>(undefined);

export function useTemplateBuilder() {
  const context = useContext(TemplateBuilderContext);
  if (!context) {
    throw new Error("useTemplateBuilder must be used within a TemplateBuilderProvider");
  }
  return context;
}

interface TemplateBuilderProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'idr-template-builder-templates';
const TEMPLATE_LIBRARY_STORAGE_KEY = 'idr-template-library';

export function TemplateBuilderProvider({ children }: TemplateBuilderProviderProps) {
  const [configuration, setConfiguration] = useState<TemplateConfiguration>(createDefaultTemplateConfiguration);
  const [templates, setTemplates] = useState<ConfigurationTemplate[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [templateLibrary, setTemplateLibrary] = useState<TemplateLibraryItem[]>([]);

  // Load templates from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const templatesWithDates = parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          lastModified: new Date(t.lastModified),
          configuration: {
            ...t.configuration,
            lastModified: new Date(t.configuration.lastModified),
            libraryVariables: t.configuration.libraryVariables.map((v: any) => ({
              ...v,
              createdAt: new Date(v.createdAt),
            })),
          }
        }));
        setTemplates(templatesWithDates);
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
  }, []);

  // Save templates to localStorage whenever they change
  useEffect(() => {
    if (templates.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }
  }, [templates]);

  // Load template library from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TEMPLATE_LIBRARY_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const libraryWithDates = parsed.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          lastModified: new Date(item.lastModified),
        }));
        setTemplateLibrary(libraryWithDates);
      } catch (e) {
        console.error('Failed to load template library:', e);
      }
    }
  }, []);

  // Save template library to localStorage whenever it changes
  useEffect(() => {
    if (templateLibrary.length > 0) {
      localStorage.setItem(TEMPLATE_LIBRARY_STORAGE_KEY, JSON.stringify(templateLibrary));
    }
  }, [templateLibrary]);

  const updateConfiguration = useCallback((updates: Partial<TemplateConfiguration>) => {
    setConfiguration(prev => {
      const newConfig = {
        ...prev,
        ...updates,
        lastModified: new Date()
      };
      
      // If we're currently editing a template, update it in the templates array
      if (currentTemplateId) {
        setTemplates(prevTemplates => prevTemplates.map(template =>
          template.id === currentTemplateId
            ? {
                ...template,
                configuration: newConfig,
                lastModified: new Date()
              }
            : template
        ));
      }
      
      return newConfig;
    });
  }, [currentTemplateId]);

  // Library Variable Management
  const addLibraryVariable = useCallback((variable: Omit<LibraryVariable, "id" | "createdAt">) => {
    const newVariable: LibraryVariable = {
      ...variable,
      id: `var-${Date.now()}`,
      createdAt: new Date(),
    };

    setConfiguration(prev => ({
      ...prev,
      libraryVariables: [...prev.libraryVariables, newVariable],
      lastModified: new Date(),
    }));
  }, []);

  const updateLibraryVariable = useCallback((id: string, updates: Partial<LibraryVariable>) => {
    setConfiguration(prev => ({
      ...prev,
      libraryVariables: prev.libraryVariables.map(v =>
        v.id === id ? { ...v, ...updates } : v
      ),
      lastModified: new Date(),
    }));
  }, []);

  const deleteLibraryVariable = useCallback((id: string) => {
    setConfiguration(prev => ({
      ...prev,
      libraryVariables: prev.libraryVariables.filter(v => v.id !== id),
      // Also remove all instances of this variable from tables
      tables: prev.tables.map(table => ({
        ...table,
        columns: table.columns.filter(col => col.variableId !== id),
      })),
      lastModified: new Date(),
    }));
  }, []);

  const getLibraryVariablesByCategory = useCallback((category: LibraryCategory): LibraryVariable[] => {
    return configuration.libraryVariables.filter(v => v.category === category);
  }, [configuration.libraryVariables]);

  // Template Table Management
  const addVariableToTable = useCallback((tableId: string, variableId: string) => {
    const variable = configuration.libraryVariables.find(v => v.id === variableId);
    if (!variable) return;

    setConfiguration(prev => {
      const table = prev.tables.find(t => t.id === tableId);
      if (!table) return prev;

      const newColumn: TemplateColumnVariable = {
        id: `col-${Date.now()}`,
        variableId: variable.id,
        displayName: variable.displayName,
        dataType: variable.dataType,
        systemConcept: variable.systemConcept,
        order: table.columns.length,
        exampleValue: getExampleValue(variable.dataType),
        // Initialize dropdown with default options
        dropdownOptions: variable.dataType === "Dropdown" ? ["Option 1", "Option 2", "Option 3"] : undefined,
        dropdownValue: undefined,
        // Initialize lookup with empty links
        lookupLinks: variable.dataType === "Lookup" ? [] : undefined,
      };

      return {
        ...prev,
        tables: prev.tables.map(t =>
          t.id === tableId
            ? { ...t, columns: [...t.columns, newColumn] }
            : t
        ),
        lastModified: new Date(),
      };
    });
  }, [configuration.libraryVariables]);

  const removeVariableFromTable = useCallback((tableId: string, columnId: string) => {
    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId
          ? { ...t, columns: t.columns.filter(col => col.id !== columnId) }
          : t
      ),
      lastModified: new Date(),
    }));
  }, []);

  const reorderTableColumns = useCallback((tableId: string, columns: TemplateColumnVariable[]) => {
    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId
          ? { ...t, columns: columns.map((col, idx) => ({ ...col, order: idx })) }
          : t
      ),
      lastModified: new Date(),
    }));
  }, []);

  const toggleTableExpansion = useCallback((tableId: string) => {
    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId
          ? { ...t, isExpanded: !t.isExpanded }
          : t
      ),
    }));
  }, []);

  const updateTablePrimaryKey = useCallback((tableId: string, primaryKey: string) => {
    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId
          ? { ...t, primaryKey }
          : t
      ),
      lastModified: new Date(),
    }));
  }, []);

  const updateTableName = useCallback((tableId: string, name: string) => {
    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId
          ? { ...t, name }
          : t
      ),
      lastModified: new Date(),
    }));
  }, []);

  const addVariableGroup = useCallback((name: string, primaryKey: string) => {
    const newTable: TemplateTable = {
      id: `table-${Date.now()}`,
      section: "entities_roles", // Default section, not really used anymore
      name,
      primaryKey,
      columns: [],
      isExpanded: true,
    };

    setConfiguration(prev => ({
      ...prev,
      tables: [...prev.tables, newTable],
      lastModified: new Date(),
    }));
  }, []);

  const deleteVariableGroup = useCallback((tableId: string) => {
    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.filter(t => t.id !== tableId),
      lastModified: new Date(),
    }));
  }, []);

  // Template Management
  const saveAsTemplate = useCallback((name: string, description?: string): string => {
    const newTemplate: ConfigurationTemplate = {
      id: `template-${Date.now()}`,
      name,
      description,
      configuration: {
        ...configuration,
        name,
        description,
        lastModified: new Date()
      },
      createdAt: new Date(),
      lastModified: new Date()
    };

    setTemplates(prev => [...prev, newTemplate]);
    setCurrentTemplateId(newTemplate.id);
    return newTemplate.id;
  }, [configuration]);

  const loadTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setConfiguration({
        ...template.configuration,
        lastModified: new Date()
      });
      setCurrentTemplateId(templateId);
    }
  }, [templates]);

  const updateTemplate = useCallback((templateId: string) => {
    setTemplates(prev => prev.map(template =>
      template.id === templateId
        ? {
            ...template,
            configuration: {
              ...configuration,
              lastModified: new Date()
            },
            lastModified: new Date()
          }
        : template
    ));
  }, [configuration]);

  const deleteTemplate = useCallback((templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    if (currentTemplateId === templateId) {
      setCurrentTemplateId(null);
    }
  }, [currentTemplateId]);

  const createNewConfiguration = useCallback(() => {
    setConfiguration(createDefaultTemplateConfiguration());
    setCurrentTemplateId(null);
  }, []);

  // Create a new blank template
  const createNewTemplate = useCallback((name?: string): string => {
    const newTemplate: ConfigurationTemplate = {
      id: `template-${Date.now()}`,
      name: name || `Untitled Template`,
      description: undefined,
      configuration: {
        id: `config-${Date.now()}`,
        name: name || `Untitled Template`,
        description: undefined,
        version: "1.0.0",
        lastModified: new Date(),
        libraryVariables: configuration.libraryVariables, // Share library variables
        tables: [
          // Create a default table for the new template
          {
            id: `table-${Date.now()}`,
            section: "entities_roles",
            name: "Main",
            primaryKey: "",
            columns: [],
            isExpanded: true,
          }
        ],
      },
      createdAt: new Date(),
      lastModified: new Date()
    };

    setTemplates(prev => [...prev, newTemplate]);
    setCurrentTemplateId(newTemplate.id);
    setConfiguration(newTemplate.configuration);
    return newTemplate.id;
  }, [configuration.libraryVariables]);

  // Switch to a different template
  const switchToTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setConfiguration(template.configuration);
      setCurrentTemplateId(templateId);
    }
  }, [templates]);

  // Update current template name
  const updateTemplateName = useCallback((templateId: string, name: string) => {
    setTemplates(prev => prev.map(template =>
      template.id === templateId
        ? {
            ...template,
            name,
            configuration: {
              ...template.configuration,
              name
            },
            lastModified: new Date()
          }
        : template
    ));
  }, []);

  // Reorder templates
  const reorderTemplates = useCallback((fromIndex: number, toIndex: number) => {
    setTemplates(prev => {
      const newTemplates = [...prev];
      const [movedTemplate] = newTemplates.splice(fromIndex, 1);
      newTemplates.splice(toIndex, 0, movedTemplate);
      return newTemplates;
    });
  }, []);

  // Import/Export
  const exportConfiguration = useCallback(() => {
    return JSON.stringify(configuration, null, 2);
  }, [configuration]);

  const importConfiguration = useCallback((configJson: string) => {
    try {
      const importedConfig = JSON.parse(configJson) as TemplateConfiguration;
      setConfiguration({
        ...importedConfig,
        lastModified: new Date()
      });
      setCurrentTemplateId(null);
    } catch (error) {
      console.error("Failed to import configuration:", error);
      throw new Error("Invalid configuration format");
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfiguration(createDefaultTemplateConfiguration());
    setCurrentTemplateId(null);
  }, []);

  // Lookup and Dropdown Management
  const updateColumnLookupLinks = useCallback((tableId: string, columnId: string, linkedVariableIds: string[]) => {
    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId
          ? {
              ...t,
              columns: t.columns.map(col =>
                col.id === columnId
                  ? { ...col, lookupLinks: linkedVariableIds }
                  : col
              )
            }
          : t
      ),
      lastModified: new Date(),
    }));
  }, []);

  const updateColumnDropdownOptions = useCallback((tableId: string, columnId: string, options: string[]) => {
    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId
          ? {
              ...t,
              columns: t.columns.map(col =>
                col.id === columnId
                  ? { ...col, dropdownOptions: options }
                  : col
              )
            }
          : t
      ),
      lastModified: new Date(),
    }));
  }, []);

  const updateColumnDropdownValue = useCallback((tableId: string, columnId: string, value: string) => {
    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId
          ? {
              ...t,
              columns: t.columns.map(col =>
                col.id === columnId
                  ? { ...col, dropdownValue: value }
                  : col
              )
            }
          : t
      ),
      lastModified: new Date(),
    }));
  }, []);

  const addDropdownOption = useCallback((tableId: string, columnId: string, option: string) => {
    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId
          ? {
              ...t,
              columns: t.columns.map(col =>
                col.id === columnId
                  ? { 
                      ...col, 
                      dropdownOptions: [...(col.dropdownOptions || []), option],
                      dropdownValue: option // Auto-select the new option
                    }
                  : col
              )
            }
          : t
      ),
      lastModified: new Date(),
    }));
  }, []);

  const getVariablesForLookupTable = useCallback((systemConceptTable: string): TemplateColumnVariable[] => {
    // Find all variables in tables that match the systemConcept table
    const matchingVariables: TemplateColumnVariable[] = [];
    
    configuration.tables.forEach(table => {
      table.columns.forEach(column => {
        if (column.systemConcept?.table === systemConceptTable) {
          matchingVariables.push(column);
        }
      });
    });
    
    return matchingVariables;
  }, [configuration]);

  // Template Library Management
  const addTemplateToLibrary = useCallback((name: string, description: string | undefined, category: LibraryCategory, tableId: string) => {
    const table = configuration.tables.find(t => t.id === tableId);
    if (!table) return;

    const newTemplateItem: TemplateLibraryItem = {
      id: `template-lib-${Date.now()}`,
      name,
      description,
      category,
      table: {
        ...table,
        id: `table-${Date.now()}`, // New ID for the copy
      },
      createdAt: new Date(),
      lastModified: new Date(),
    };

    setTemplateLibrary(prev => [...prev, newTemplateItem]);
  }, [configuration.tables]);

  const updateTemplateLibraryItem = useCallback((id: string, updates: Partial<Omit<TemplateLibraryItem, 'id' | 'createdAt'>>) => {
    setTemplateLibrary(prev => prev.map(item =>
      item.id === id
        ? { ...item, ...updates, lastModified: new Date() }
        : item
    ));
  }, []);

  const deleteTemplateLibraryItem = useCallback((id: string) => {
    setTemplateLibrary(prev => prev.filter(item => item.id !== id));
  }, []);

  const getTemplateLibraryItemsByCategory = useCallback((category: LibraryCategory): TemplateLibraryItem[] => {
    return templateLibrary.filter(item => item.category === category);
  }, [templateLibrary]);

  // Link a template from the library to a table (creates Array-type column)
  const linkTemplateToTable = useCallback((tableId: string, templateLibraryId: string) => {
    const templateItem = templateLibrary.find(item => item.id === templateLibraryId);
    if (!templateItem) return;

    // Create a new Array-type column that links to this template
    const newColumn: TemplateColumnVariable = {
      id: `col-${Date.now()}`,
      variableId: `template-link-${Date.now()}`, // Placeholder variable ID
      displayName: templateItem.name,
      dataType: "Array",
      order: 0,
      exampleValue: "View Details",
      linkedTemplateId: templateLibraryId,
      linkedTemplateName: templateItem.name,
    };

    setConfiguration(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId
          ? {
              ...t,
              columns: [...t.columns, newColumn]
            }
          : t
      ),
      lastModified: new Date(),
    }));
  }, [templateLibrary]);

  const contextValue: TemplateBuilderContextType = {
    configuration,
    updateConfiguration,
    addLibraryVariable,
    updateLibraryVariable,
    deleteLibraryVariable,
    getLibraryVariablesByCategory,
    addVariableToTable,
    removeVariableFromTable,
    reorderTableColumns,
    toggleTableExpansion,
    updateTablePrimaryKey,
    updateTableName,
    addVariableGroup,
    deleteVariableGroup,
    updateColumnLookupLinks,
    updateColumnDropdownOptions,
    updateColumnDropdownValue,
    addDropdownOption,
    getVariablesForLookupTable,
    templates,
    currentTemplateId,
    saveAsTemplate,
    loadTemplate,
    updateTemplate,
    deleteTemplate,
    createNewConfiguration,
    createNewTemplate,
    switchToTemplate,
    updateTemplateName,
    reorderTemplates,
    exportConfiguration,
    importConfiguration,
    resetToDefaults,
    templateLibrary,
    addTemplateToLibrary,
    updateTemplateLibraryItem,
    deleteTemplateLibraryItem,
    getTemplateLibraryItemsByCategory,
    linkTemplateToTable,
  };

  return (
    <TemplateBuilderContext.Provider value={contextValue}>
      {children}
    </TemplateBuilderContext.Provider>
  );
}

// Helper function to generate example values
function getExampleValue(dataType: string): string {
  switch (dataType) {
    case "Text":
      return "Sample Text";
    case "Date":
      return "2025-01-15";
    case "Currency":
      return "$1,250,000";
    case "Dropdown":
      return "Option 1";
    case "Lookup":
      return "Linked Value";
    case "Array":
      return "View Details";
    default:
      return "—";
  }
}