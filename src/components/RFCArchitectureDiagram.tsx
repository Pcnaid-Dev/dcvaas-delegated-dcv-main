import { ArrowRight } from '@phosphor-icons/react';

/**
 * RFC-style Architecture Diagram for KeylessSSL
 * Shows the flow: DNS Provider → CNAME delegation _acme-challenge → KeylessSSL edge → CA
 */
export function RFCArchitectureDiagram() {
  return (
    <div className="w-full max-w-5xl mx-auto p-8 bg-[#161b22] border border-gray-700 rounded-lg font-mono text-sm">
      {/* Title */}
      <div className="mb-6 pb-4 border-b border-gray-700">
        <h3 className="text-emerald-400 font-bold text-lg">RFC-Style Architecture: CNAME Delegation Flow</h3>
        <p className="text-gray-500 mt-1">Zero private key exposure • Automated ACME validation</p>
      </div>

      {/* Diagram */}
      <div className="space-y-6">
        {/* Step 1: DNS Provider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-[#0d1117] border border-gray-700 rounded p-4">
            <div className="text-blue-400 font-bold mb-2">1. DNS Provider</div>
            <div className="text-gray-300 text-xs space-y-1">
              <div>Type: CNAME</div>
              <div>Host: _acme-challenge.yourdomain.com</div>
              <div>Value: yourdomain.com.dcv.keylessssl.dev</div>
            </div>
          </div>
          <ArrowRight size={32} weight="bold" className="text-emerald-500 flex-shrink-0" />
          
          {/* Step 2: KeylessSSL Edge */}
          <div className="flex-1 bg-[#0d1117] border border-gray-700 rounded p-4">
            <div className="text-emerald-400 font-bold mb-2">2. KeylessSSL Edge</div>
            <div className="text-gray-300 text-xs space-y-1">
              <div>• Receives ACME challenge</div>
              <div>• Generates validation token</div>
              <div>• Serves DNS-01 response</div>
            </div>
          </div>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-8 bg-emerald-500"></div>
            <ArrowRight size={32} weight="bold" className="text-emerald-500 rotate-90" />
          </div>
        </div>

        {/* Step 3: Certificate Authority */}
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-[#0d1117] border border-gray-700 rounded p-4">
            <div className="text-purple-400 font-bold mb-2">3. Certificate Authority</div>
            <div className="text-gray-300 text-xs space-y-1">
              <div>• Queries _acme-challenge CNAME</div>
              <div>• Validates token response</div>
              <div>• Issues TLS certificate</div>
            </div>
          </div>
          <ArrowRight size={32} weight="bold" className="text-emerald-500 flex-shrink-0" />
          
          {/* Step 4: Result */}
          <div className="flex-1 bg-[#0d1117] border border-emerald-900/50 rounded p-4">
            <div className="text-emerald-400 font-bold mb-2">4. Certificate Issued ✓</div>
            <div className="text-gray-300 text-xs space-y-1">
              <div>• Private key never leaves your infra</div>
              <div>• Auto-renewal every 60 days</div>
              <div>• Zero manual intervention</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-start gap-3 bg-emerald-950/30 border border-emerald-800/30 rounded p-3">
          <div className="text-emerald-400 font-bold">🔒 Security:</div>
          <div className="text-gray-400 text-xs">
            Your DNS root keys never touch our infrastructure. We only handle ACME validation via CNAME delegation.
          </div>
        </div>
      </div>
    </div>
  );
}
