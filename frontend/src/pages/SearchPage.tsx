import React, { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import ProductGrid from '../components/ProductGrid';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

const SearchPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [application, setApplication] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [recycledContent, setRecycledContent] = useState(0);
  const [carbonFootprint, setCarbonFootprint] = useState(50);
  const [vocLevel, setVocLevel] = useState(500);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase.from('products').select('*');

      if (isInitialLoad) {
        query = query.eq('featured', true);
        setIsInitialLoad(false);
      }

      if (searchQuery.length >= 2) {
        query = query.ilike('name', `%${searchQuery}%`);
      }
      if (materialTypes.length > 0) {
        query = query.in('materialType', materialTypes);
      }
      if (application.length > 0) {
        query = query.overlaps('application', application);
      }
      if (certifications.length > 0) {
        query = query.contains('certifications', certifications);
      }
      if (location) {
        query = query.eq('location', location);
      }
      query = query.gte('recycledContent', recycledContent);
      query = query.lte('carbonFootprint', carbonFootprint);
      query = query.lte('vocLevel', vocLevel);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
      } else if (data) {
        setProducts(data as Product[]);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [searchQuery, materialTypes, application, certifications, location, recycledContent, carbonFootprint, vocLevel, isInitialLoad]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center my-8">Product Search</h1>
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className="flex mt-8">
        <div className="w-1/4">
          <FilterPanel
            materialTypes={materialTypes}
            setMaterialTypes={setMaterialTypes}
            application={application}
            setApplication={setApplication}
            certifications={certifications}
            setCertifications={setCertifications}
            location={location}
            setLocation={setLocation}
            recycledContent={recycledContent}
            setRecycledContent={setRecycledContent}
            carbonFootprint={carbonFootprint}
            setCarbonFootprint={setCarbonFootprint}
            vocLevel={vocLevel}
            setVocLevel={setVocLevel}
          />
        </div>
        <div className="w-3/4 pl-8">
          {loading ? <p>Loading...</p> : <ProductGrid products={products} />}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
