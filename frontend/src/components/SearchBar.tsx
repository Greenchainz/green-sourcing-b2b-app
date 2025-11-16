// frontend/src/components/SearchBar.tsx
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { supabase } from '../lib/supabase';
import './SearchBar.css';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

      if (error) {
        throw error;
      }

      if (data) {
        setResults(data as Product[]);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const { data } = await supabase
        .from('products')
        .select('name')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (data) {
        setSuggestions(data.map((item) => item.name));
      }
    };

    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [query]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
    handleSearch();
  };

  return (
    <div className="search-container">
      <div className="search-bar">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search for products..."
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {!loading && !error && results.length === 0 && query && (
        <p>No results found.</p>
      )}
      <div className="search-results">
        {results.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            supplierName={product.supplier?.name || 'Unknown Supplier'}
            onRequestQuote={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

export default SearchBar;
