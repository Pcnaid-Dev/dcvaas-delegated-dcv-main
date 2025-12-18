import { CheckCircle, Circle } from '@phosphor-icons/react';

type Step = {
  label: string;
  description?: string;
  status: 'complete' | 'current' | 'upcoming';
};

type StepperProps = {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
};

export function Stepper({ steps, orientation = 'horizontal' }: StepperProps) {
  if (orientation === 'vertical') {
    return (
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              {step.status === 'complete' ? (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <CheckCircle size={20} weight="fill" />
                </div>
              ) : step.status === 'current' ? (
                <div className="w-8 h-8 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-border bg-background flex items-center justify-center">
                  <Circle size={20} weight="regular" className="text-muted-foreground" />
                </div>
              )}
              {index < steps.length - 1 && (
                <div className={`w-0.5 h-12 mt-2 ${
                  step.status === 'complete' ? 'bg-primary' : 'bg-border'
                }`} />
              )}
            </div>
            <div className="flex-1 pb-8">
              <h4 className={`font-medium ${
                step.status === 'current' ? 'text-foreground' : 
                step.status === 'complete' ? 'text-foreground' : 
                'text-muted-foreground'
              }`}>
                {step.label}
              </h4>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              {step.status === 'complete' ? (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <CheckCircle size={24} weight="fill" />
                </div>
              ) : step.status === 'current' ? (
                <div className="w-10 h-10 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-primary" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-border bg-background flex items-center justify-center">
                  <Circle size={24} weight="regular" className="text-muted-foreground" />
                </div>
              )}
              <div className="mt-2 text-center">
                <p className={`text-sm font-medium ${
                  step.status === 'current' ? 'text-foreground' : 
                  step.status === 'complete' ? 'text-foreground' : 
                  'text-muted-foreground'
                }`}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                step.status === 'complete' ? 'bg-primary' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
