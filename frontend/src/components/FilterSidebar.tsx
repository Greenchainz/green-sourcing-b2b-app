import React, { useState } from 'react';
import './FilterSidebar.css';

export interface FilterState {
  materialType: string[];
  application: string[];
  certifications: string[];
  recycledContent: number;
  carbonFootprint: string;
  supplierLocation: string;
}

interface FilterSidebarProps {
  onFilterChange: (filterState: FilterState) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<FilterState>({
    materialType: [],
    application: [],
    certifications: [],
    recycledContent: 0,
    carbonFootprint: '',
    supplierLocation: '',
  });

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleCheckboxChange = (category: keyof FilterState, value: string) => {
    const currentValues = filters[category] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    handleFilterChange({ [category]: newValues });
  };

  return (
    <div className="filter-sidebar">
      <h3>Filters</h3>

      <div>
        <h4>Material Type</h4>
        {['Insulation', 'Flooring', 'Roofing'].map((type) => (
          <div key={type}>
            <input
              type="checkbox"
              id={type}
              value={type}
              onChange={() => handleCheckboxChange('materialType', type)}
            />
            <label htmlFor={type}>{type}</label>
          </div>
        ))}
      </div>

      <div>
        <h4>Application</h4>
        {['Commercial', 'Residential'].map((app) => (
          <div key={app}>
            <input
              type="checkbox"
              id={app}
              value={app}
              onChange={() => handleCheckboxChange('application', app)}
            />
            <label htmlFor={app}>{app}</label>
          </div>
        ))}
      </div>

      <div>
        <h4>Certifications</h4>
        {['LEED', 'FSC', 'BREEAM', 'C2C'].map((cert) => (
          <div key={cert}>
            <input
              type="checkbox"
              id={cert}
              value={cert}
              onChange={() => handleCheckboxChange('certifications', cert)}
            />
            <label htmlFor={cert}>{cert}</label>
          </div>
        ))}
      </div>

      <div>
        <h4>Recycled Content</h4>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.recycledContent}
          onChange={(e) => handleFilterChange({ recycledContent: parseInt(e.target.value, 10) })}
        />
        <span>{filters.recycledContent}%</span>
      </div>

      <div>
        <h4>Carbon Footprint (GWP)</h4>
        <input
          type="text"
          placeholder="e.g., < 5 kg CO2e"
          value={filters.carbonFootprint}
          onChange={(e) => handleFilterChange({ carbonFootprint: e.target.value })}
        />
      </div>

      <div>
        <h4>Supplier Location</h4>
        <input
          type="text"
          placeholder="ZIP or City"
          value={filters.supplierLocation}
          onChange={(e) => handleFilterChange({ supplierLocation: e.target.value })}
        />
      </div>
    </div>
  );
};

export default FilterSidebar;
