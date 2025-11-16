// frontend/src/pages/Unauthorized.tsx

import { Link } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-4xl font-bold mb-4">403 - Not Authorized</h1>
      <p className="mb-8">Sorry, you do not have permission to access this page.</p>
      <Link to="/" className="text-blue-500 hover:underline">
        Go back to the homepage
      </Link>
    </div>
  );
};

export default Unauthorized;
