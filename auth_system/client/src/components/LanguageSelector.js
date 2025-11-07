import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('preferredLanguage', lng);
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' }
  ];

  return (
    <div className="language-selector">
      <div className="dropdown">
        <button 
          className="btn btn-sm btn-outline-secondary dropdown-toggle" 
          type="button" 
          id="languageDropdown" 
          data-bs-toggle="dropdown" 
          aria-expanded="false"
        >
          <i className="fas fa-globe"></i> {languages.find(lang => lang.code === i18n.language)?.name || 'Language'}
        </button>
        <ul className="dropdown-menu" aria-labelledby="languageDropdown">
          {languages.map((lang) => (
            <li key={lang.code}>
              <button 
                className={`dropdown-item ${i18n.language === lang.code ? 'active' : ''}`} 
                onClick={() => changeLanguage(lang.code)}
              >
                {lang.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LanguageSelector;