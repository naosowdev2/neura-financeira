import React, { useState } from 'react';
import { getInstitutionById, getInstitutionInitials } from '@/constants/financial-institutions';
import { cn } from '@/lib/utils';

interface InstitutionLogoProps {
  institutionId?: string | null;
  institutionName?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  customLogoUrl?: string | null;
}

const sizeMap = {
  sm: 24,
  md: 40,
  lg: 56,
};

export function InstitutionLogo({
  institutionId,
  institutionName,
  color,
  size = 'md',
  className,
  customLogoUrl,
}: InstitutionLogoProps) {
  const [imageError, setImageError] = useState(false);
  const pixelSize = sizeMap[size];
  
  // Check if institutionId contains a custom logo URL (format: "custom:URL")
  const isCustomLogo = institutionId?.startsWith('custom:');
  const extractedCustomUrl = isCustomLogo ? institutionId.slice(7) : null;
  
  const institution = institutionId && !isCustomLogo ? getInstitutionById(institutionId) : null;
  const displayName = institution?.name || institutionName || '?';
  const displayColor = institution?.color || color || '#6366f1';
  
  // Priority: customLogoUrl prop > extracted from institutionId > institution logoUrl
  const logoUrl = customLogoUrl || extractedCustomUrl || institution?.logoUrl;
  
  // Fallback initials
  const initials = getInstitutionInitials(displayName);
  const fontSizeMap = {
    sm: 'text-[8px]',
    md: 'text-xs',
    lg: 'text-sm',
  };
  
  // Fallback component (colored circle with initials)
  const FallbackInitials = () => (
    <div
      className={cn(
        "flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold shadow-sm",
        fontSizeMap[size]
      )}
      style={{
        width: pixelSize,
        height: pixelSize,
        backgroundColor: displayColor,
      }}
    >
      {initials}
    </div>
  );
  
  // If we have a logo URL and no error, render image
  if (logoUrl && !imageError) {
    return (
      <div 
        className={cn("flex-shrink-0 relative", className)}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <img
          src={logoUrl}
          alt={displayName}
          className="rounded-full object-cover bg-white w-full h-full"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }
  
  // Fallback: colored circle with initials
  return (
    <div className={cn("flex-shrink-0", className)}>
      <FallbackInitials />
    </div>
  );
}
