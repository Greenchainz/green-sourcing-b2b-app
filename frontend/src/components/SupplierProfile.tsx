// FILE: frontend/src/components/SupplierProfile.tsx
// PURPOSE: Updated to call the new /api/me/passport endpoint

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api'; // Import our secure API client
import SupplierProductList from './SupplierProductList';

// Interface for the full passport data
interface Certification {
    supplierCertificationId: number;
    name: string;
    certifyingBody: string;
    status: string | null;
    expiryDate: string | null;
}

interface PassportData {
    supplierId: number;
    companyName: string;
    companyAddress: string;
    profileDescription: string;
    profileEsgSummary: string;
    certifications: Certification[];
}

export default function SupplierProfile() {
    const { user } = useAuth(); // Get the logged-in user (for greeting)
    const [passport, setPassport] = useState<PassportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // This component now fetches the full passport
        const fetchPassport = async () => {
            if (!user) return; // Wait for user to be loaded

            try {
                setLoading(true);
                setError(null);
                // Call our new secure endpoint
                const response = await api.get('/me/passport');
                setPassport(response.data);
            } catch (err) {
                console.error("Failed to fetch passport:", err);
                const error = err as { response?: { status?: number } };
                if (error.response?.status === 403) {
                    setError("Access denied. This view is for Supplier accounts.");
                } else if (error.response?.status === 404) {
                    setError("Supplier profile not found. Please complete onboarding.");
                } else {
                    setError("An error occurred while loading the passport.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPassport();
    }, [user]); // Re-run when the user is loaded

    if (loading || !user) {
        return <div className="text-center text-green-primary">Loading My Profile...</div>;
    }

    // Handle errors
    if (error) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="card text-center bg-red-50 border-red-300">
                    <h1 className="text-2xl font-bold text-red-700 mb-2">Access Denied</h1>
                    <p className="text-neutral-dark">{error}</p>
                    <p className="text-neutral-medium mt-2">Logged in as: {user.email} (Role: {user.role})</p>
                </div>
            </div>
        );
    }

    // Handle non-supplier roles
    if (user.role !== 'Supplier') {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="card text-center">
                    <h1 className="text-2xl font-bold text-green-primary mb-2">
                        Welcome, {user.user_metadata.firstName}
                    </h1>
                    <p className="text-neutral-dark">Your role is: **{user.user_metadata.role}**. Supplier dashboards are restricted to Supplier accounts.</p>
                </div>
            </div>
        );
    }

    // Handle supplier role (passport is loading or failed)
    if (!passport) {
        return <div className="text-center text-red-500">Could not load Supplier Passport.</div>;
    }

    // --- Main Supplier View ---
    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="card">
                <div className="border-l-4 border-green-primary pl-4">
                    <h1 className="text-3xl font-bold text-green-primary mb-2">
                        {passport.companyName}
                    </h1>
                    <p className="text-neutral-medium text-sm">
                        Welcome, {user.user_metadata.firstName} {user.user_metadata.lastName} ({user.email})
                    </p>
                    {passport.companyAddress && (
                        <p className="text-neutral-dark mt-2">
                            <span className="font-semibold">Address:</span> {passport.companyAddress}
                        </p>
                    )}
                </div>
            </div>

            <div className="card">
                <h2 className="text-2xl font-semibold text-green-secondary mb-4 border-b-2 border-green-light pb-2">
                    My Sustainability Passport
                </h2>

                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-neutral-dark mb-2">Description</h3>
                    <p className="text-neutral-dark leading-relaxed">
                        {passport.profileDescription || <span className="italic text-neutral-medium">(No description provided.)</span>}
                    </p>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-neutral-dark mb-2">ESG Summary</h3>
                    <p className="text-neutral-dark leading-relaxed">
                        {passport.profileEsgSummary || <span className="italic text-neutral-medium">(No ESG summary provided.)</span>}
                    </p>
                </div>

            </div>

            <div className="card">
                <h2 className="text-2xl font-semibold text-green-secondary mb-4 border-b-2 border-green-light pb-2">
                    My Certifications
                </h2>
                {passport.certifications.length === 0 ? (
                    <p className="text-neutral-medium italic">No certifications on record.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-light">
                            <thead className="bg-green-light/10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-dark">Certification Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-dark">Certifying Body</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-dark">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-dark">Expiry Date</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-light">
                                {passport.certifications.map((cert) => (
                                    <tr key={cert.supplierCertificationId} className="hover:bg-green-light/5">
                                        <td className="px-4 py-3 text-sm text-neutral-dark font-medium">{cert.name}</td>
                                        <td className="px-4 py-3 text-sm text-neutral-dark">{cert.certifyingBody}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cert.status === 'Active' ? 'bg-green-accent/20 text-green-primary' : 'bg-neutral-light text-neutral-medium'}`}>
                                                {cert.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-dark">
                                            {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Product Catalog */}
            <SupplierProductList supplierId={passport.supplierId} />
        </div>
    );
}
