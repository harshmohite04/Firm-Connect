import React, { useState } from 'react';
import toast from 'react-hot-toast';
import igrService from '../../services/igrService';
import type { IGRRecord, IGRSearchResponse } from '../../services/igrService';

// Icons
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// Maharashtra districts list
const MAHARASHTRA_DISTRICTS = [
  "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara",
  "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli",
  "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban",
  "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmananad", "Palghar",
  "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara",
  "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
];

interface IGRLookupModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  prefilledDistrict?: string;
  prefilledTaluka?: string;
}

const IGRLookupModal: React.FC<IGRLookupModalProps> = ({
  caseId,
  isOpen,
  onClose,
  onImportSuccess,
  prefilledDistrict = '',
  prefilledTaluka = '',
}) => {
  // Search form state
  const [district, setDistrict] = useState(prefilledDistrict);
  const [taluka, setTaluka] = useState(prefilledTaluka);
  const [yearFrom, setYearFrom] = useState(2020);
  const [yearTo, setYearTo] = useState(new Date().getFullYear());
  const [partyName, setPartyName] = useState('');
  const [surveyNumber, setSurveyNumber] = useState('');
  const [searchMethod, setSearchMethod] = useState<'party' | 'survey'>('party');

  // Results state
  const [results, setResults] = useState<IGRRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!district || !taluka) {
      toast.error('Please select District and Taluka');
      return;
    }

    setSearching(true);
    try {
      const response = await igrService.search({
        caseId,
        district,
        taluka,
        yearFrom,
        yearTo,
        partyName: searchMethod === 'party' ? partyName : '',
        surveyNumber: searchMethod === 'survey' ? surveyNumber : '',
      });

      if (response.results && response.results.length > 0) {
        setResults(response.results);
        setSelectedRecords(new Set()); // Reset selection
        toast.success(`Found ${response.count} document(s)`);
      } else {
        setResults([]);
        toast.info('No documents found for the given criteria');
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.error(error.response?.data?.detail || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectRecord = (index: number) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRecords.size === results.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(results.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    if (selectedRecords.size === 0) {
      toast.error('Please select at least one document');
      return;
    }

    const selectedDocs = Array.from(selectedRecords).map(i => results[i]);

    setImporting(true);
    try {
      const response = await igrService.importRecords(caseId, selectedDocs);
      toast.success(`Imported ${response.imported.length} document(s)`);
      if (response.failed.length > 0) {
        toast.error(`Failed to import ${response.failed.length} document(s)`);
      }
      setResults([]);
      setSelectedRecords(new Set());
      onImportSuccess();
      onClose();
    } catch (error: any) {
      console.error('Import failed:', error);
      toast.error(error.response?.data?.detail || 'Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Lookup IGR Documents</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            {/* District & Taluka */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  District <span className="text-red-500">*</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                >
                  <option value="">Select District</option>
                  {MAHARASHTRA_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Taluka/Tahsil <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={taluka}
                  onChange={(e) => setTaluka(e.target.value)}
                  placeholder="e.g., Haveli, City, Rural"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                  required
                />
              </div>
            </div>

            {/* Year Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  From Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(parseInt(e.target.value))}
                  min="1950"
                  max={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  To Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={yearTo}
                  onChange={(e) => setYearTo(parseInt(e.target.value))}
                  min="1950"
                  max={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

            {/* Party Name / Survey Number */}
            <div>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={searchMethod === 'party'}
                    onChange={() => setSearchMethod('party')}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-slate-700">Search by Party Name</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={searchMethod === 'survey'}
                    onChange={() => setSearchMethod('survey')}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-slate-700">Search by Survey Number</span>
                </label>
              </div>

              {searchMethod === 'party' ? (
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Party name (optional)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                />
              ) : (
                <input
                  type="text"
                  value={surveyNumber}
                  onChange={(e) => setSurveyNumber(e.target.value)}
                  placeholder="Survey number (optional)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                />
              )}
            </div>

            {/* Search Button */}
            <button
              type="submit"
              disabled={searching}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {searching && <SpinnerIcon />}
              {searching ? 'Searching...' : 'Search IGR'}
            </button>
          </form>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  Search Results ({results.length})
                </h3>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedRecords.size === results.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="w-12 px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedRecords.size === results.length && results.length > 0}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Doc No</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Type</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Parties</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Property</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Amount</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((record, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <td className="w-12 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedRecords.has(index)}
                            onChange={() => handleSelectRecord(index)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-slate-900 font-mono text-xs">
                          {record.doc_number}/{record.year}
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded">
                            {record.doc_type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-700 text-xs">
                          <div>{record.party_name_1}</div>
                          {record.party_name_2 && <div>vs {record.party_name_2}</div>}
                        </td>
                        <td className="px-4 py-2 text-slate-700 text-xs max-w-[150px] truncate">
                          {record.property_description}
                        </td>
                        <td className="px-4 py-2 text-slate-700 text-right">
                          {record.consideration_amount
                            ? `₹${record.consideration_amount.toLocaleString('en-IN')}`
                            : '-'}
                        </td>
                        <td className="px-4 py-2 text-slate-700 text-xs">
                          {record.registration_date || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!searching && results.length === 0 && (
            <div className="text-center py-12">
              <SearchIcon />
              <p className="text-slate-500 mt-2">
                {results.length === 0 && !searching
                  ? 'Enter search criteria and click "Search IGR" to find documents'
                  : 'No results found'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors font-medium"
          >
            Cancel
          </button>

          <button
            onClick={handleImport}
            disabled={selectedRecords.size === 0 || importing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-md transition-colors font-medium"
          >
            {importing && <SpinnerIcon />}
            {importing ? 'Importing...' : `Import Selected (${selectedRecords.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IGRLookupModal;
