// Helper functions to interact with localStorage for templates

const TEMPLATES_KEY = 'whatsapp_dashboard_templates';

export const getTemplates = () => {
    try {
        const templates = localStorage.getItem(TEMPLATES_KEY);
        return templates ? JSON.parse(templates) : [];
    } catch (error) {
        console.error("Error getting templates from localStorage:", error);
        return [];
    }
};

export const saveTemplates = (templates) => {
    try {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    } catch (error) {
        console.error("Error saving templates to localStorage:", error);
    }
};

export const addTemplate = (template) => {
    const templates = getTemplates();
    templates.push(template);
    saveTemplates(templates);
};

export const updateTemplate = (updatedTemplate) => {
    let templates = getTemplates();
    templates = templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
    saveTemplates(templates);
};

export const deleteTemplate = (templateId) => {
    let templates = getTemplates();
    templates = templates.filter(t => t.id !== templateId);
    saveTemplates(templates);
};
