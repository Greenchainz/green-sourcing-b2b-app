import { useContext } from 'react';
import { AuthContext } from '../context/authContextDefinition';

export const useAuth = () => {
    return useContext(AuthContext);
};
