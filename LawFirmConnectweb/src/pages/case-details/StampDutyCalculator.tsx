import React, { useState, useMemo } from 'react';

interface StampDutyBreakdown {
  stampDuty: number;
  registrationFee: number;
  metroCess: number;
  total: number;
  details: string[];
}

const StampDutyCalculator: React.FC = () => {
  const [marketValue, setMarketValue] = useState(1000000); // ₹10 lakhs default
  const [rrRate, setRrRate] = useState(2); // RR rate as percentage
  const [propertyType, setPropertyType] = useState<'Agricultural' | 'Residential' | 'Commercial' | 'Industrial'>('Residential');
  const [buyerGender, setBuyerGender] = useState<'Male' | 'Female'>('Male');
  const [isFirstProperty, setIsFirstProperty] = useState(true);
  const [isMetroArea, setIsMetroArea] = useState(false);

  const breakdown: StampDutyBreakdown = useMemo(() => {
    const details: string[] = [];

    // Stamp duty calculation based on property type
    let stampDutyRate = 0;
    switch (propertyType) {
      case 'Agricultural':
        stampDutyRate = 3;
        break;
      case 'Residential':
        stampDutyRate = 5;
        break;
      case 'Commercial':
        stampDutyRate = 6;
        break;
      case 'Industrial':
        stampDutyRate = 4;
        break;
    }

    // Female buyer discount
    if (buyerGender === 'Female') {
      stampDutyRate = Math.max(stampDutyRate - 1, 0);
      details.push(`Female buyer discount applied (-1%)`);
    }

    // First-time buyer discount (Residential only)
    if (isFirstProperty && propertyType === 'Residential') {
      stampDutyRate = Math.max(stampDutyRate - 0.5, 0);
      details.push(`First-time buyer discount applied (-0.5%)`);
    }

    const stampDuty = (marketValue * stampDutyRate) / 100;
    details.push(`Stamp Duty @ ${stampDutyRate}% of ₹${marketValue.toLocaleString('en-IN')}: ₹${stampDuty.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);

    // Registration fee: 1% of market value, capped at ₹30,000
    const registrationFee = Math.min((marketValue * 1) / 100, 30000);
    details.push(`Registration Fee @ 1% (cap ₹30,000): ₹${registrationFee.toLocaleString('en-IN')}`);

    // Metro cess (Mumbai areas only): 1% additional on stamp duty
    let metroCess = 0;
    if (isMetroArea && propertyType === 'Residential') {
      metroCess = (stampDuty * 1) / 100;
      details.push(`Metro Cess @ 1% of stamp duty (Mumbai): ₹${metroCess.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
    }

    const total = stampDuty + registrationFee + metroCess;

    return {
      stampDuty,
      registrationFee,
      metroCess,
      total,
      details,
    };
  }, [marketValue, rrRate, propertyType, buyerGender, isFirstProperty, isMetroArea]);

  return (
    <div className="w-full space-y-6">
      {/* Inputs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-900">Stamp Duty Calculator</h3>
          <p className="text-xs text-slate-500 mt-1">Maharashtra property registration calculator</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Market Value */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Market Value (₹)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={marketValue}
                  onChange={(e) => setMarketValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {(marketValue / 100000).toFixed(2)} Lakhs
              </p>
            </div>

            {/* RR Rate */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                RR Rate (%)
              </label>
              <input
                type="number"
                value={rrRate}
                onChange={(e) => setRrRate(Math.max(0, parseFloat(e.target.value) || 0))}
                step="0.1"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">Reference Rate</p>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Agricultural">Agricultural</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>

            {/* Buyer Gender */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Primary Buyer Gender
              </label>
              <select
                value={buyerGender}
                onChange={(e) => setBuyerGender(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Female buyers get 1% discount</p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="border-t border-slate-100 pt-6 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 -m-2 p-2 rounded">
              <input
                type="checkbox"
                checked={isFirstProperty}
                onChange={(e) => setIsFirstProperty(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-slate-700">
                First-time residential property buyer (0.5% discount)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 -m-2 p-2 rounded">
              <input
                type="checkbox"
                checked={isMetroArea}
                onChange={(e) => setIsMetroArea(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-slate-700">
                Property in Metro area (Mumbai - adds 1% cess on stamp duty)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700">
          <h3 className="font-bold text-white">Calculation Breakdown</h3>
        </div>
        <div className="p-6 space-y-3">
          {breakdown.details.map((detail, idx) => (
            <p key={idx} className="text-sm text-slate-700">
              {detail}
            </p>
          ))}

          {/* Summary Table */}
          <div className="mt-6 pt-6 border-t border-emerald-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Stamp Duty:</span>
              <span className="text-sm font-bold text-slate-900">
                ₹{breakdown.stampDuty.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Registration Fee:</span>
              <span className="text-sm font-bold text-slate-900">
                ₹{breakdown.registrationFee.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            {breakdown.metroCess > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Metro Cess:</span>
                <span className="text-sm font-bold text-slate-900">
                  ₹{breakdown.metroCess.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t border-emerald-200">
              <span className="text-lg font-bold text-emerald-700">Total Registration Cost:</span>
              <span className="text-lg font-bold text-emerald-700">
                ₹{breakdown.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-slate-500 pt-2">
              Additional to consideration/purchase price
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-900 font-medium">ℹ️ Note:</p>
        <ul className="text-xs text-blue-800 mt-2 space-y-1 list-disc list-inside">
          <li>Rates are based on Maharashtra regulations and may vary</li>
          <li>This calculator is for reference only; consult a lawyer for exact figures</li>
          <li>Additional charges may apply for NOCs, municipal approvals, etc.</li>
          <li>Stamp duty varies if property value is below Reference Rate (RR)</li>
        </ul>
      </div>
    </div>
  );
};

export default StampDutyCalculator;
