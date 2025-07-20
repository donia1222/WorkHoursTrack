export interface Job {
  id: string;
  name: string;
  company?: string;
  address?: string;
  hourlyRate?: number;
  currency?: string;
  color: string;
  defaultHours: number;
  isActive: boolean;
  description?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  // New fields for advanced job management
  salary?: {
    type: 'hourly' | 'monthly' | 'annual';
    amount: number;
    currency: string;
  };
  schedule?: {
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    workDays: number[]; // 0=Sunday, 1=Monday, etc.
    breakTime?: number; // minutes
  };
  billing?: {
    enabled: boolean;
    invoicePrefix?: string;
    taxRate?: number;
    notes?: string;
  };
  location?: {
    address: string;
    latitude?: number;
    longitude?: number;
    radius?: number; // meters for geofencing
  };
}

export interface WorkDay {
  id: string;
  date: string;
  jobId?: string; // Optional for free days
  hours: number;
  notes?: string;
  overtime: boolean;
  type: 'work' | 'free' | 'vacation' | 'sick'; // Day type
  createdAt: string;
  updatedAt: string;
}

export interface WorkDayWithJob extends WorkDay {
  job: Job;
}

export const DEFAULT_COLORS = [
  '#007AFF', // Blue
  '#30D158', // Green
  '#FF9500', // Orange
  '#FF3B30', // Red
  '#AF52DE', // Purple
  '#FF2D92', // Pink
  '#32D74B', // Light Green
  '#007AFF', // System Blue
  '#5856D6', // Indigo
  '#FF6B6B', // Coral
];

export const DEFAULT_JOB: Job = {
  id: 'default',
  name: 'Trabajo Principal',
  company: 'Mi Empresa',
  address: '',
  hourlyRate: 0,
  currency: 'EUR',
  color: '#007AFF',
  defaultHours: 8,
  isActive: true,
  description: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  createdAt: new Date().toISOString(),
};

export const DAY_TYPES = {
  work: {
    label: 'Día trabajado',
    color: '#30D158',
    icon: 'clock.fill',
  },
  free: {
    label: 'Día libre',
    color: '#007AFF',
    icon: 'calendar',
  },
  vacation: {
    label: 'Vacaciones',
    color: '#FF9500',
    icon: 'sun.max.fill',
  },
  sick: {
    label: 'Día de enfermedad',
    color: '#FF3B30',
    icon: 'cross.fill',
  },
} as const;