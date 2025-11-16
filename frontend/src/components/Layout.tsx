// frontend/src/components/Layout.tsx
import { Outlet } from 'react-router-dom';

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
