// src/components/shared/BackButton.tsx

import { useNavigate } from 'react-router-dom';

interface Props {
  to?: string;       // konkretus kelias, jei nenurodyta — grįžta atgal
  label?: string;    // mygtuko tekstas, default "Back"
}

export default function BackButton({ to, label = 'Back' }: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) navigate(to);
    else navigate(-1);
  };

  return (
    <button className="btn-back" onClick={handleClick} type="button">
      ← {label}
    </button>
  );
}