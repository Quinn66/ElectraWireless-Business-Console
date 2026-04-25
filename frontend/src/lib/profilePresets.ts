// Profile presets seed the onboarding sliders when the user selects a profile.
// growthRate and cogsPercent are stored as decimals (e.g. 0.015 = 1.5%).
// churnRate is stored as a plain percentage number matching the store convention (e.g. 2 = 2%).

export interface ProfilePreset {
  revenue: number;
  growthRate: number;
  months: number;
  churnRate: number;
  useCOGS: boolean;
  cogsPercent: number;
  useMarketing: boolean;
  marketingSpend: number;
  usePayroll: boolean;
  payroll: number;
}

// Used for any profile that does not yet have a specific preset defined.
export const DEFAULT_PRESET: ProfilePreset = {
  revenue:        40100,
  growthRate:     0.05,
  months:         12,
  churnRate:      3,
  useCOGS:        true,
  cogsPercent:    0.22,
  useMarketing:   true,
  marketingSpend: 4000,
  usePayroll:     true,
  payroll:        22000,
};

export const PROFILE_PRESETS: Record<string, ProfilePreset> = {
  "defense-spending": {
    revenue:        650000,
    growthRate:     0.02,
    months:         60,
    churnRate:      0.2,
    useCOGS:        true,
    cogsPercent:    0.72,
    useMarketing:   true,
    marketingSpend: 1000,
    usePayroll:     true,
    payroll:        280000,
  },
  "policy-research": {
    revenue:        90000,
    growthRate:     0.03,
    months:         24,
    churnRate:      1,
    useCOGS:        true,
    cogsPercent:    0.22,
    useMarketing:   true,
    marketingSpend: 1500,
    usePayroll:     true,
    payroll:        55000,
  },
  "public-infrastructure": {
    revenue:        400000,
    growthRate:     0.025,
    months:         60,
    churnRate:      0.3,
    useCOGS:        true,
    cogsPercent:    0.68,
    useMarketing:   true,
    marketingSpend: 2000,
    usePayroll:     true,
    payroll:        120000,
  },
  "municipal-budget": {
    revenue:        150000,
    growthRate:     0.015,
    months:         48,
    churnRate:      0.5,
    useCOGS:        true,
    cogsPercent:    0.40,
    useMarketing:   true,
    marketingSpend: 500,
    usePayroll:     true,
    payroll:        90000,
  },
  "manufacturing": {
    revenue:        100000,
    growthRate:     0.03,
    months:         24,
    churnRate:      2.5,
    useCOGS:        true,
    cogsPercent:    0.64,
    useMarketing:   true,
    marketingSpend: 2500,
    usePayroll:     true,
    payroll:        20000,
  },
  "enterprise-analytics": {
    revenue:        120000,
    growthRate:     0.06,
    months:         24,
    churnRate:      2,
    useCOGS:        true,
    cogsPercent:    0.18,
    useMarketing:   true,
    marketingSpend: 4000,
    usePayroll:     true,
    payroll:        55000,
  },
  "retail-operations": {
    revenue:        60000,
    growthRate:     0.04,
    months:         18,
    churnRate:      3,
    useCOGS:        true,
    cogsPercent:    0.52,
    useMarketing:   true,
    marketingSpend: 3500,
    usePayroll:     true,
    payroll:        18000,
  },
  "supply-chain": {
    revenue:        80000,
    growthRate:     0.035,
    months:         24,
    churnRate:      2.5,
    useCOGS:        true,
    cogsPercent:    0.58,
    useMarketing:   true,
    marketingSpend: 2000,
    usePayroll:     true,
    payroll:        22000,
  },
  "small-business": {
    revenue:        20000,
    growthRate:     0.04,
    months:         18,
    churnRate:      3,
    useCOGS:        true,
    cogsPercent:    0.35,
    useMarketing:   true,
    marketingSpend: 1000,
    usePayroll:     true,
    payroll:        8000,
  },
  "startup-founder": {
    revenue:        0,
    growthRate:     0,
    months:         12,
    churnRate:      0,
    useCOGS:        false,
    cogsPercent:    0,
    useMarketing:   false,
    marketingSpend: 0,
    usePayroll:     false,
    payroll:        0,
  },
  "freelancer": {
    revenue:        3500,
    growthRate:     0.05,
    months:         12,
    churnRate:      4,
    useCOGS:        true,
    cogsPercent:    0.15,
    useMarketing:   true,
    marketingSpend: 300,
    usePayroll:     false,
    payroll:        0,
  },
  "personal-finance": {
    revenue:       6000,
    growthRate:    0.015,
    months:        12,
    churnRate:     0,
    useCOGS:       false,
    cogsPercent:   0,
    useMarketing:  false,
    marketingSpend: 0,
    usePayroll:    false,
    payroll:       0,
  },
};
