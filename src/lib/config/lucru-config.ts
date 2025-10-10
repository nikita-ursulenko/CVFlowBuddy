export interface LucruMdConfig {
  siteName: 'lucru.md';
  baseUrl: 'https://www.lucru.md';
  loginUrl: 'https://www.lucru.md/ru/login';
  jobsUrl: 'https://www.lucru.md/ro/posturi-vacante/categorie/it';
  email?: string;
  password?: string;
  credentials: {
    email: string;
    password: string;
  };
  cvFilePath: string;
  headless: boolean;
  timeout: number;
  settings: {
    maxCVDaily: number;
    intervalHours: number;
    headless: boolean;
  };
  selectors: {
    loginForm: {
      emailInput: string;
      passwordInput: string;
      submitButton: string;
    };
    jobCard: {
      container: string;
      title: string;
      company: string;
      location: string;
      applyButton: string;
      hideButton: string;
    };
    modal: {
      container: string;
      cvUpload: string;
      submitButton: string;
      closeButton: string;
    };
    success: {
      message: string;
      confirmation: string;
    };
  };
}

export const createLucruConfig = (overrides?: Partial<LucruMdConfig>): LucruMdConfig => {
  return {
    siteName: 'lucru.md',
    baseUrl: 'https://www.lucru.md',
    loginUrl: 'https://www.lucru.md/ru/login',
    jobsUrl: 'https://www.lucru.md/ro/posturi-vacante/categorie/it',
    credentials: {
      email: '',
      password: ''
    },
    cvFilePath: '',
    headless: true,
    timeout: 30000,
    settings: {
      maxCVDaily: 20,
      intervalHours: 4,
      headless: true
    },
    selectors: {
      loginForm: {
        emailInput: 'input[type="email"], input[name="email"], input[placeholder*="email"]',
        passwordInput: 'input[type="password"], input[name="password"], input[placeholder*="password"]',
        submitButton: 'button[type="submit"], input[type="submit"], button:has-text("Войти"), button:has-text("Login")'
      },
      jobCard: {
        container: 'li.vacancyRow.group, li.vacancyRow',
        title: 'a.vacancyShowPopup',
        company: '.company-name, .employer, .company',
        location: '.location, .city, .address',
        applyButton: 'a:has-text("CV"), button:has-text("CV"), a.cat_blue_btn, button[class*="yellow"], button[class*="golden"]',
        hideButton: 'button:has-text("Скрыть"), button:has-text("Hide"), [data-testid="hide-button"]'
      },
      modal: {
        container: '.modal, .popup, .dialog, [role="dialog"]',
        cvUpload: 'input[type="file"], input[accept*="pdf"], input[accept*="doc"]',
        submitButton: 'button:has-text("Trimite CV-ul"), button:has-text("Отправить"), button:has-text("Submit")',
        closeButton: 'button:has-text("Закрыть"), button:has-text("Close"), .close-button'
      },
      success: {
        message: '.success-message, .alert-success, [data-testid="success"]',
        confirmation: 'text="CV отправлен", text="Application sent", text="Success"'
      }
    },
    ...overrides
  };
};

export const defaultLucruConfig: LucruMdConfig = createLucruConfig();

export const validateLucruConfig = (config: Partial<LucruMdConfig>): string[] => {
  const errors: string[] = [];
  
  const email = config.credentials?.email || config.email || '';
  const password = config.credentials?.password || config.password || '';
  
  if (!email || !email.includes('@')) {
    errors.push('Email обязателен и должен быть валидным');
  }
  
  if (!password || password.length < 6) {
    errors.push('Пароль должен содержать минимум 6 символов');
  }
  
  if (!config.cvFilePath) {
    errors.push('Путь к CV файлу обязателен');
  }
  
  return errors;
};

