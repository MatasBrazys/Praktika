// frontend/src/components/admin/SubmissionList.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../styles/SubmissionList.css';

interface Submission {
  id: number;
  form_type: string;
  data: any;
  created_at: string;
}

export default function SubmissionList() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [formTitle, setFormTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, [id]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      
      // Get form title
      const formResponse = await fetch(`http://localhost:8000/api/forms/${id}`);
      const form = await formResponse.json();
      setFormTitle(form.title);
      
      // Get submissions
      const subsResponse = await fetch(`http://localhost:8000/api/forms/${id}/submissions`);
      const data = await subsResponse.json();
      setSubmissions(data);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (submissions.length === 0) return;

    // Get all unique field names
    const allFields = new Set<string>();
    submissions.forEach(sub => {
      Object.keys(sub.data).forEach(key => allFields.add(key));
    });

    const fields = Array.from(allFields);
    
    // Build CSV
    const headers = ['Submission ID', 'Date', ...fields];
    const rows = submissions.map(sub => [
      sub.id,
      new Date(sub.created_at).toLocaleString(),
      ...fields.map(field => sub.data[field] || '')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formTitle.replace(/\s+/g, '_')}_submissions.csv`;
    a.click();
  };

  if (loading) return <div className="page-loading">Loading submissions...</div>;

  return (
    <div className="page-container">
      <div className="submissions-wrapper">
        <div className="page-header">
          <div>
            <button className="btn-back" onClick={() => navigate('/admin/forms')}>
              ← Back to Forms
            </button>
            <h1>Submissions: {formTitle}</h1>
            <p className="subtitle">{submissions.length} total submissions</p>
          </div>
          <div className="header-actions">
            <button className="btn-export" onClick={exportToCSV} disabled={submissions.length === 0}>
              📥 Export CSV
            </button>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h2>No submissions yet</h2>
            <p>Share this form to start collecting responses</p>
            <code className="share-link">
              {window.location.origin}/forms/{id}
            </code>
          </div>
        ) : (
          <div className="submissions-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Submitted At</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td>#{sub.id}</td>
                    <td>{new Date(sub.created_at).toLocaleString()}</td>
                    <td>
                      <details>
                        <summary>View Details</summary>
                        <pre >{JSON.stringify(sub.data, null, 2)}</pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}