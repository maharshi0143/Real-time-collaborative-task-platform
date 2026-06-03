import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
      <Link to="/dashboard" className="hover:text-primary transition-colors">
        <Home size={14} />
      </Link>
      {crumbs.map((crumb, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={14} className="text-muted-foreground/40" />
          {crumb.href ? (
            <Link to={crumb.href} className="hover:text-primary transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
