// frontend/src/components/admin/FormPreview.tsx
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import "survey-core/survey-core.min.css";
import '../../styles/FormPreview.css';

interface Props {
  surveyJson: any;
  activePageIndex?: number; // ← NAUJAS prop
}

export default function FormPreview({ surveyJson, activePageIndex = 0 }: Props) {
  // Single page arba multi-page
  const pages = surveyJson.pages || [{ elements: surveyJson.elements || [] }];
  const activePage = pages[activePageIndex];

  if (!activePage?.elements || activePage.elements.length === 0) {
    return (
      <div className="preview-empty">
        <div className="empty-icon">📝</div>
        <p>Add fields to see live preview</p>
      </div>
    );
  }

  // Rodyti TIK active page
  const previewJson = {
    elements: activePage.elements
  };

  const survey = new Model(previewJson);
  survey.mode = 'display';
  
  return (
    <div className="preview-container">
      <Survey model={survey} />
    </div>
  );
}