// This hook is deprecated - logos are now fetched from Clearbit CDN directly
// Kept for backwards compatibility but no longer makes API calls

import { getInstitutionByName } from '@/constants/financial-institutions';

export function useInstitutionLogo(institutionName: string | undefined) {
  const institution = institutionName ? getInstitutionByName(institutionName) : null;
  
  return { 
    logoUrl: institution?.logoUrl || null, 
    isLoading: false, 
    error: null 
  };
}

export function useBatchInstitutionLogos(institutionNames: string[]) {
  const logos: Record<string, string | null> = {};
  
  for (const name of institutionNames) {
    const institution = getInstitutionByName(name);
    logos[name] = institution?.logoUrl || null;
  }
  
  return { logos, isLoading: false };
}

export function clearLogoCache() {
  // No-op - cache is no longer used
  localStorage.removeItem('institution_logos_cache');
}
