// frontend/src/components/Layout.tsx
import { Outlet } from 'react-router-dom';
import React from 'react';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div>
      {/* This is a simplified layout. In a real app, it would include Header, Footer, etc. */}
      <main>
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default Layout;
