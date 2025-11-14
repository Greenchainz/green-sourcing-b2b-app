import React, { useState } from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { supabase } from '../lib/supabase';
import './SearchBar.css';

const SearchBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
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
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

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

  return (
    <div className="search-container">
      <div className="search-bar">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for products..."
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {!loading && !error && results.length === 0 && searchTerm && (
        <p>No results found.</p>
      )}
      <div className="search-results">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default SearchBar;
