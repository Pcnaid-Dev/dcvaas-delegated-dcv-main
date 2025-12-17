import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle } from '@phosphor-icons/react';

export interface Step {
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'pending';
}

interface StepperProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Stepper({ steps, orientation = 'vertical', className }: StepperProps) {
  return (
    <div
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row items-start' : 'flex-col',
        className
      )}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';
        const isPending = step.status === 'pending';

        return (
          <div
            key={index}
            className={cn(
              'flex',
              orientation === 'horizontal' ? 'flex-col items-center flex-1' : 'flex-row items-start',
              !isLast && orientation === 'vertical' && 'pb-8'
            )}
          >
            <div className={cn(
              'flex',
              orientation === 'horizontal' ? 'flex-col items-center w-full' : 'flex-row items-start'
            )}>
              {/* Step indicator */}
              <div className="flex items-center">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full border-2 transition-colors',
                    isCompleted && 'bg-green-100 border-green-600 dark:bg-green-950 dark:border-green-400',
                    isCurrent && 'bg-primary border-primary',
                    isPending && 'bg-muted border-border',
                    orientation === 'horizontal' ? 'w-10 h-10' : 'w-8 h-8'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle size={orientation === 'horizontal' ? 24 : 20} weight="fill" className="text-green-600 dark:text-green-400" />
                  ) : (
                    <span
                      className={cn(
                        'font-semibold',
                        isCurrent && 'text-primary-foreground',
                        isPending && 'text-muted-foreground'
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Connector line */}
                {!isLast && orientation === 'horizontal' && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      isCompleted ? 'bg-green-600 dark:bg-green-400' : 'bg-border'
                    )}
                  />
                )}
              </div>

              {/* Step content */}
              <div className={cn(
                orientation === 'horizontal' ? 'mt-4 text-center' : 'ml-4 flex-1'
              )}>
                <h4
                  className={cn(
                    'font-semibold',
                    isCompleted && 'text-green-700 dark:text-green-300',
                    isCurrent && 'text-foreground',
                    isPending && 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </h4>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Vertical connector line */}
              {!isLast && orientation === 'vertical' && (
                <div
                  className={cn(
                    'w-0.5 h-full ml-4 -mt-2 mb-2',
                    isCompleted ? 'bg-green-600 dark:bg-green-400' : 'bg-border'
                  )}
                  style={{ marginLeft: '15px', minHeight: '32px' }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
