// frontend/src/components/admin/FormPreview.tsx
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import "survey-core/survey-core.min.css";
import '../../styles/FormPreview.css';

interface Props {
  surveyJson: any;
}

export default function FormPreview({ surveyJson }: Props) {
  if (!surveyJson.elements || surveyJson.elements.length === 0) {
    return (
      <div className="preview-empty">
        <div className="empty-icon">📝</div>
        <p>Add fields to see live preview</p>
      </div>
    );
  }

  const survey = new Model(surveyJson);
  survey.mode = 'display'; // Read-only preview
  
  return (
    <div className="preview-container">
      <Survey model={survey} />
    </div>
  );
}