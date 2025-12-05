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
  
  // Taille fixe pour éviter les différences entre serveur et client
  const logoWidth = 180;
  const logoHeight = 60;

  return (
    <div 
      className="relative inline-block" 
      style={{ 
        backgroundColor: 'transparent',
      }}
    >
      <Image
        src={logoSrc}
        alt="CMA CGM"
        width={logoWidth}
        height={logoHeight}
        priority
        style={{
          backgroundColor: 'transparent',
          objectFit: 'contain',
        }}
        className="object-contain w-[180px] md:w-[200px]"
        {...props}
      />
    </div>
  );
};
