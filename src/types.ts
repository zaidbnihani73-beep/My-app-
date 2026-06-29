export type AppCategory = 'إنتاجية' | 'مالية' | 'أدوات' | 'ترفيه' | 'تعليم';

export interface AppEntry {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  date: string;
  iconUrl?: string;
  iconName?: string;
  downloadUrl?: string;
}

export type AuthView = 'login' | 'signup' | 'verification';
export type MainView = 'auth' | 'dashboard';
