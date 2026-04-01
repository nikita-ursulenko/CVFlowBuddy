import React from 'react';
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  name: string;
  targetEmail?: string;
}

export interface GeneralSettings {
  smtp: SmtpConfig;
  emailMode: 'auto' | 'manual';
  headless: boolean;
  autoHide: boolean;
  maxJobs: number;
  minMatchScore: number;
}
