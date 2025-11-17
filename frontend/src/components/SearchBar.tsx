// frontend/src/components/SearchBar.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types'; // Assuming Product type has necessary fields
import './SearchBar.css';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery }) => {
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, company, image_url, certification') // Fetch all required fields
        .ilike('name', `%${searchQuery}%`)
        .limit(5);

      if (data) {
        setSuggestions(data as Product[]);
        setIsDropdownVisible(data.length > 0);
      }
    };

    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSuggestionClick = (suggestionName: string) => {
    setSearchQuery(suggestionName);
    setSuggestions([]);
    setIsDropdownVisible(false);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <input
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={() => setIsDropdownVisible(suggestions.length > 0)}
        onBlur={() => setTimeout(() => setIsDropdownVisible(false), 200)}
        placeholder="Search for sustainable materials..."
        className="w-full px-4 py-2 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:border-green-500"
      />
      {isDropdownVisible && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {suggestions.map((product) => (
            <li
              key={product.id}
              className="flex items-center p-2 border-b hover:bg-gray-100 cursor-pointer"
              onMouseDown={() => handleSuggestionClick(product.name)} // Use onMouseDown to prevent blur event firing first
            >
              <img src={product.image_url || '/placeholder.svg'} alt={product.name} className="w-12 h-12 mr-4 object-cover rounded" />
              <div className="flex-grow">
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-gray-600">{product.company}</p>
              </div>
              <span className="px-2 py-1 text-xs font-bold text-white bg-green-600 rounded-full">{product.certification}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
