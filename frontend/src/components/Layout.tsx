// frontend/src/components/Layout.tsx
import { Outlet } from 'react-router-dom';
import React from 'react';

const Layout = () => {
  return (
    <div>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
