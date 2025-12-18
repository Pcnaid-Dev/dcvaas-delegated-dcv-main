import { ReactNode } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
  sticky?: boolean;
};

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  sticky = false,
}: PageHeaderProps) {
  const wrapperClasses = sticky
    ? 'sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border pb-6 mb-8'
    : 'mb-8';

  return (
    <div className={wrapperClasses}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={index}>
                {index < breadcrumbs.length - 1 ? (
                  <>
                    {crumb.onClick ? (
                      <BreadcrumbLink
                        onClick={crumb.onClick}
                        className="cursor-pointer hover:text-foreground"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <span className="text-muted-foreground">{crumb.label}</span>
                    )}
                    <BreadcrumbSeparator />
                  </>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
