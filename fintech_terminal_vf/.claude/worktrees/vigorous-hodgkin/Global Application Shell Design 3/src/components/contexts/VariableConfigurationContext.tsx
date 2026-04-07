import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { 
  VariableConfiguration, 
  VariableConfigurationContextType, 
  VariableSection, 
  VariableField,
  ConfigurationTemplate,
  createDefaultConfiguration 
} from "../types/VariableTypes";

const VariableConfigurationContext = createContext<VariableConfigurationContextType | undefined>(undefined);

export function useVariableConfiguration() {
  const context = useContext(VariableConfigurationContext);
  if (!context) {
    throw new Error("useVariableConfiguration must be used within a VariableConfigurationProvider");
  }
  return context;
}

interface VariableConfigurationProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'idr-variable-templates';

export function VariableConfigurationProvider({ children }: VariableConfigurationProviderProps) {
  const [configuration, setConfiguration] = useState<VariableConfiguration>(createDefaultConfiguration);
  const [templates, setTemplates] = useState<ConfigurationTemplate[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

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
            lastModified: new Date(t.configuration.lastModified)
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

  const updateConfiguration = useCallback((updates: Partial<VariableConfiguration>) => {
    setConfiguration(prev => ({
      ...prev,
      ...updates,
      lastModified: new Date()
    }));
  }, []);

  const addSection = useCallback((sectionData: Omit<VariableSection, "id" | "order">) => {
    setConfiguration(prev => {
      const newSection: VariableSection = {
        ...sectionData,
        id: `section-${Date.now()}`,
        order: prev.sections.length
      };
      
      return {
        ...prev,
        sections: [...prev.sections, newSection],
        lastModified: new Date()
      };
    });
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<VariableSection>) => {
    setConfiguration(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId 
          ? { ...section, ...updates }
          : section
      ),
      lastModified: new Date()
    }));
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setConfiguration(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId),
      lastModified: new Date()
    }));
  }, []);

  const addField = useCallback((sectionId: string, fieldData: Omit<VariableField, "id" | "order">) => {
    setConfiguration(prev => {
      const sectionIndex = prev.sections.findIndex(s => s.id === sectionId);
      if (sectionIndex === -1) return prev;

      const section = prev.sections[sectionIndex];
      const newField: VariableField = {
        ...fieldData,
        id: `field-${Date.now()}`,
        order: section.fields.length
      };

      const updatedSections = [...prev.sections];
      updatedSections[sectionIndex] = {
        ...section,
        fields: [...section.fields, newField]
      };

      return {
        ...prev,
        sections: updatedSections,
        lastModified: new Date()
      };
    });
  }, []);

  const updateField = useCallback((sectionId: string, fieldId: string, updates: Partial<VariableField>) => {
    setConfiguration(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map(field =>
                field.id === fieldId
                  ? { ...field, ...updates }
                  : field
              )
            }
          : section
      ),
      lastModified: new Date()
    }));
  }, []);

  const deleteField = useCallback((sectionId: string, fieldId: string) => {
    setConfiguration(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.filter(field => field.id !== fieldId)
            }
          : section
      ),
      lastModified: new Date()
    }));
  }, []);

  const reorderSections = useCallback((sections: VariableSection[]) => {
    setConfiguration(prev => ({
      ...prev,
      sections: sections.map((section, index) => ({ ...section, order: index })),
      lastModified: new Date()
    }));
  }, []);

  const reorderFields = useCallback((sectionId: string, fields: VariableField[]) => {
    setConfiguration(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId
          ? {
              ...section,
              fields: fields.map((field, index) => ({ ...field, order: index }))
            }
          : section
      ),
      lastModified: new Date()
    }));
  }, []);

  const exportConfiguration = useCallback(() => {
    return JSON.stringify(configuration, null, 2);
  }, [configuration]);

  const importConfiguration = useCallback((configJson: string) => {
    try {
      const importedConfig = JSON.parse(configJson) as VariableConfiguration;
      setConfiguration({
        ...importedConfig,
        lastModified: new Date()
      });
    } catch (error) {
      console.error("Failed to import configuration:", error);
      throw new Error("Invalid configuration format");
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfiguration(createDefaultConfiguration());
  }, []);

  // Template Management Functions
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
    setConfiguration(createDefaultConfiguration());
    setCurrentTemplateId(null);
  }, []);

  const contextValue: VariableConfigurationContextType = {
    configuration,
    updateConfiguration,
    addSection,
    updateSection,
    deleteSection,
    addField,
    updateField,
    deleteField,
    reorderSections,
    reorderFields,
    exportConfiguration,
    importConfiguration,
    resetToDefaults,
    templates,
    currentTemplateId,
    saveAsTemplate,
    loadTemplate,
    updateTemplate,
    deleteTemplate,
    createNewConfiguration
  };

  return (
    <VariableConfigurationContext.Provider value={contextValue}>
      {children}
    </VariableConfigurationContext.Provider>
  );
}