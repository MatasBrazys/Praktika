const API_URL = import.meta.env.VITE_API_URL;

console.log(API_URL);

export interface FormDefinition {
  id?: number;
  title: string;
  description?: string;
  surveyjs_json: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
export interface Submission {
  id: number;
  form_type: string;
  data: any;
  created_at: string;
}
export interface CRMLookupResult {
  found: boolean;
  crm_id: string;
  name: string;
  street: string;
  postcode: string;
  state: string;
}
export const formAPI = {
  // List all forms
  async list(): Promise<FormDefinition[]> {
    const response = await fetch(`${API_URL}/api/forms`);
    if (!response.ok) throw new Error('Failed to fetch forms');
    return response.json();
  },

  // Get single form
  async get(id: number): Promise<FormDefinition> {
    const response = await fetch(`${API_URL}/api/forms/${id}`);
    if (!response.ok) throw new Error('Form not found');
    return response.json();
  },

  // Create form
  async create(form: Omit<FormDefinition, 'id' | 'created_at' | 'updated_at'>): Promise<FormDefinition> {
    const response = await fetch(`${API_URL}/api/forms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!response.ok) throw new Error('Failed to create form');
    return response.json();
  },

  // Update form
  async update(id: number, form: Partial<FormDefinition>): Promise<FormDefinition> {
    const response = await fetch(`${API_URL}/api/forms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!response.ok) throw new Error('Failed to update form');
    return response.json();
  },

  // Delete form
  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/forms/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete form');
  },

  // Toggle active
  async toggleActive(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/forms/${id}/toggle`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to toggle form');
  },

  async getSubmissions(formId: number): Promise<Submission[]> {
    const response = await fetch(`${API_URL}/api/forms/${formId}/submissions`);
    if (!response.ok) throw new Error('Failed to fetch submissions');
    return response.json();
  },


  async submitForm(formId: number, formTitle: string, data: any): Promise<void> {
    const response = await fetch(`${API_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        form_id: formId,
        form_type: formTitle,
        data,
      }),
    });
    if (!response.ok) throw new Error('Submission failed');
  },
};

export const crmAPI = {
  async lookup(crmId: string): Promise<CRMLookupResult> {
    const response = await fetch(
      `${API_URL}/api/crm/lookup/${encodeURIComponent(crmId.trim().toUpperCase())}`
    );
    if (!response.ok) throw new Error('CRM lookup failed');
    return response.json();
  },
};