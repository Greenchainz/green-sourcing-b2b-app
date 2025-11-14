import React from 'react';
import SearchBar from '../components/SearchBar';

const Demo = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-lg p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800">Search Bar Demo</h1>
        <SearchBar />
      </div>
    </div>
  );
};

export default Demo;
