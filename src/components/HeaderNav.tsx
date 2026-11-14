import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { AppSection } from '../types/curriculum';

interface HeaderNavProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onOpenMockInterview: () => void;
}

const NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: AppSection.Architecture, label: 'Architecture' },
  { id: AppSection.SpringBoot, label: 'Spring Boot' },
  { id: AppSection.InterviewBank, label: 'Interview Bank' },
  { id: AppSection.SyntaxStudio, label: 'Syntax Studio' },
  { id: AppSection.FullStackMap, label: 'Full-Stack Map' },
];

export function HeaderNav({
  activeSection,
  onSelectSection,
  onOpenMockInterview,
}: HeaderNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (section: AppSection) => {
    onSelectSection(section);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick(AppSection.Architecture);
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          StackAtlas
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 ${
                  isActive
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-sky-600 dark:bg-sky-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenMockInterview}
            className="inline-flex min-h-[40px] sm:min-h-[36px] items-center rounded-lg bg-slate-900 px-3.5 sm:px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap shrink-0 transition-colors"
          >
            Mock Interview
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full min-h-[44px] rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-950 font-semibold dark:bg-slate-800 dark:text-slate-50'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
