import { useBrand } from '@/contexts/BrandContext';
import { KeylessDomainDetail } from '@/components/domain/KeylessDomainDetail';
import { AgencyDomainDetail } from '@/components/domain/AgencyDomainDetail';
import { WizardDomainDetail } from '@/components/domain/WizardDomainDetail';

export function DomainDetailPage(props: any) {
  const { brand } = useBrand();

  if (brand.brandId === 'keylessssl.dev') return <KeylessDomainDetail {...props} />;
  if (brand.brandId === 'delegatedssl.com') return <AgencyDomainDetail {...props} />;
  
  // Default to AutoCertify
  return <WizardDomainDetail {...props} />;
}