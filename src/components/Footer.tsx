import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface-container-high py-12 mt-16 border-t border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row-reverse justify-between items-center gap-6">
        <div className="text-xl font-semibold text-secondary">منصة تطبيقاتي</div>
        <div className="flex flex-wrap justify-center gap-6 flex-row-reverse">
          <a className="text-base text-on-surface-variant hover:text-primary transition-colors" href="#">اتصل بنا</a>
          <a className="text-base text-on-surface-variant hover:text-primary transition-colors" href="#">سياسة الخصوصية</a>
          <a className="text-base text-on-surface-variant hover:text-primary transition-colors" href="#">الشروط والأحكام</a>
        </div>
        <div className="text-xs text-on-surface-variant">
          جميع الحقوق محفوظة © ٢٠٢٤ منصة تطبيقاتي
        </div>
      </div>
    </footer>
  );
};
