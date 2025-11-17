import React from 'react';

const materialTypes = [
  "Insulation", "Flooring", "Roofing", "Lumber", "Concrete",
  "Paint & Coatings", "Countertops", "Adhesives & Sealants"
];

const certifications = ["LEED", "BREEAM", "FSC", "C2C"];

const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

interface FilterPanelProps {
  materialTypes: string[];
  setMaterialTypes: (values: string[]) => void;
  application: string[];
  setApplication: (values: string[]) => void;
  certifications: string[];
  setCertifications: (values: string[]) => void;
  location: string;
  setLocation: (value: string) => void;
  recycledContent: number;
  setRecycledContent: (value: number) => void;
  carbonFootprint: number;
  setCarbonFootprint: (value: number) => void;
  vocLevel: number;
  setVocLevel: (value: number) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  materialTypes: selectedMaterialTypes, setMaterialTypes,
  application, setApplication,
  certifications: selectedCertifications, setCertifications,
  location, setLocation,
  recycledContent, setRecycledContent,
  carbonFootprint, setCarbonFootprint,
  vocLevel, setVocLevel
}) => {

  const handleCheckboxChange = (setter: (values: string[]) => void, selected: string[], value: string) => {
    if (selected.includes(value)) {
      setter(selected.filter(item => item !== value));
    } else {
      setter([...selected, value]);
    }
  };

  const handleMaterialTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions, option => option.value);
    setMaterialTypes(values);
  };

  return (
    <div className="w-full max-w-sm p-4 bg-white border border-gray-200 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Filters</h2>

      {/* Material Type */}
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Material Type</label>
        <select multiple value={selectedMaterialTypes} onChange={handleMaterialTypeChange} className="w-full p-2 border border-gray-300 rounded-md">
          {materialTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      {/* Application */}
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Application</label>
        <div>
          <label className="inline-flex items-center">
            <input type="checkbox" checked={application.includes('Residential')} onChange={() => handleCheckboxChange(setApplication, application, 'Residential')} className="form-checkbox" />
            <span className="ml-2">Residential</span>
          </label>
        </div>
        <div>
          <label className="inline-flex items-center">
            <input type="checkbox" checked={application.includes('Commercial')} onChange={() => handleCheckboxChange(setApplication, application, 'Commercial')} className="form-checkbox" />
            <span className="ml-2">Commercial</span>
          </label>
        </div>
      </div>

      {/* Certifications */}
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Certifications</label>
        {certifications.map(cert => (
          <div key={cert}>
            <label className="inline-flex items-center">
              <input type="checkbox" checked={selectedCertifications.includes(cert)} onChange={() => handleCheckboxChange(setCertifications, selectedCertifications, cert)} className="form-checkbox" />
              <span className="ml-2">{cert}</span>
            </label>
          </div>
        ))}
      </div>

      {/* Supplier Location */}
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Supplier Location</label>
        <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
          <option value="">All Locations</option>
          {usStates.map(state => <option key={state} value={state}>{state}</option>)}
        </select>
      </div>

      {/* Sustainability Metrics */}
      <div>
        <label className="block text-gray-700 font-semibold mb-2">Sustainability Metrics</label>
        <div className="mb-4">
          <label>Recycled Content: {recycledContent}%</label>
          <input
            type="range" min="0" max="100" value={recycledContent}
            onChange={(e) => setRecycledContent(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label>Carbon Footprint: {carbonFootprint} kg CO₂e</label>
          <input
            type="range" min="0" max="50" value={carbonFootprint}
            onChange={(e) => setCarbonFootprint(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label>VOC Level: {vocLevel} g/L</label>
          <input
            type="range" min="0" max="500" value={vocLevel}
            onChange={(e) => setVocLevel(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
