import React from "react";

interface ServiceCardProps {
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  imageUrl?: string;
  icon?: string;
  price?: string;
  onRequest?: () => void;
}

export function ServiceCard({ nameAr, nameEn, descriptionAr, imageUrl, icon, price, onRequest }: ServiceCardProps) {
  return (
    <div
      className="group relative rounded-2xl overflow-hidden border border-primary/20 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-[0_8px_32px_rgba(139,92,246,0.2)]"
      style={{ transform: "perspective(1000px)" }}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={nameAr}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
            <span className="text-5xl">{icon || nameAr.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {price && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary/90 text-white text-xs font-bold backdrop-blur-sm">
            {price}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3" dir="rtl">
        <div>
          <h3 className="font-bold text-base text-foreground leading-tight">{nameAr}</h3>
          {nameEn && <p className="text-xs text-muted-foreground mt-0.5">{nameEn}</p>}
        </div>
        {descriptionAr && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{descriptionAr}</p>
        )}
        <button
          onClick={onRequest}
          className="w-full py-2.5 rounded-xl bg-gradient-to-l from-primary/80 to-primary/60 hover:from-primary hover:to-primary/80 text-white text-sm font-bold transition-all duration-200 border border-primary/40 hover:shadow-[0_0_16px_rgba(139,92,246,0.4)]"
        >
          اطلب الخدمة
        </button>
      </div>
    </div>
  );
}
