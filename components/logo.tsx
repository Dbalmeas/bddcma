"use client"

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export const Logo = (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Utiliser des valeurs par défaut pour éviter l'hydratation mismatch
  const currentTheme = mounted ? (theme === "system" ? systemTheme : theme) : "dark";
  const isDark = currentTheme === "dark";
  
  // Utiliser le logo blanc en mode sombre, le logo coloré en mode clair
  const logoSrc = isDark ? "/cma-logo-white.png" : "/cma-logo.png";
  
  // Taille fixe - logo encore un peu plus grand en mode sombre
  const logoWidth = isDark ? 340 : 220;
  const logoHeight = isDark ? 113 : 73; // Maintient le ratio 3:1 approximatif

  // Éviter l'affichage avant le montage pour prévenir l'hydratation mismatch
  if (!mounted) {
    return (
      <div 
        className="relative inline-block shrink-0 transition-all duration-500 ease-in-out cma-logo-container" 
        style={{ 
          width: `${logoWidth}px`, 
          height: `${logoHeight}px`,
          minWidth: `${logoWidth}px`,
          maxWidth: `${logoWidth}px`,
          minHeight: `${logoHeight}px`,
          maxHeight: `${logoHeight}px`,
          backgroundColor: 'transparent',
          display: 'inline-block',
        }}
      >
        {/* Placeholder pendant le chargement */}
      </div>
    );
  }

  return (
    <div 
      className="relative inline-block shrink-0 transition-all duration-500 ease-in-out cma-logo-container" 
      style={{ 
        width: `${logoWidth}px`, 
        height: `${logoHeight}px`,
        minWidth: `${logoWidth}px`,
        maxWidth: `${logoWidth}px`,
        minHeight: `${logoHeight}px`,
        maxHeight: `${logoHeight}px`,
        backgroundColor: 'transparent',
        display: 'inline-block',
      }}
      suppressHydrationWarning
    >
      <Image
        key={logoSrc}
        src={logoSrc}
        alt="CMA CGM"
        width={logoWidth}
        height={logoHeight}
        priority
        style={{
          width: `${logoWidth}px`,
          height: `${logoHeight}px`,
          minWidth: `${logoWidth}px`,
          maxWidth: `${logoWidth}px`,
          minHeight: `${logoHeight}px`,
          maxHeight: `${logoHeight}px`,
          backgroundColor: 'transparent',
          objectFit: 'contain',
          objectPosition: 'center',
          display: 'block',
          transition: 'opacity 0.3s ease-in-out',
        }}
        className="cma-logo-image transition-opacity duration-300"
        unoptimized
        {...props}
      />
    </div>
  );
};
