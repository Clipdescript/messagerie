'use client';

import React from 'react';

interface PlaceholderViewProps {
  icon: string;
}

export default function PlaceholderView({ icon }: PlaceholderViewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
      <div className="p-4 bg-gray-50 rounded-full mb-4">
        <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>
          {icon}
        </span>
      </div>
      <p className="text-sm">Cette section sera bientôt disponible !</p>
    </div>
  );
}
