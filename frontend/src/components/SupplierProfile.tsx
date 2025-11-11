import { useEffect, useState } from 'react';
import axios from 'axios';

interface Certification {
    supplierCertificationId: number;
    certificationId: number;
    name: string;
    certifyingBody: string;
    certificateNumber: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    status: string | null;
}

interface Company {
    companyId: number;
    name: string;
    address: string | null;
}

interface Profile {
    profileId: number;
    description: string | null;
    esgSummary: string | null;
}

interface SupplierData {
    supplierId: number;
    company: Company;
    profile: Profile | null;
    certifications: Certification[];
}

interface SupplierProfileProps {
    supplierId: number;
}

export default function SupplierProfile({ supplierId }: SupplierProfileProps) {
    const [data, setData] = useState<SupplierData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSupplierProfile = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get<SupplierData>(
                    `http://localhost:3001/api/v1/suppliers/${supplierId}/profile`
                );
                setData(response.data);
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    setError(err.response?.data?.error || 'Failed to fetch supplier profile');
                } else {
                    setError('An unexpected error occurred');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchSupplierProfile();
    }, [supplierId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-green-primary text-xl">Loading supplier data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="card bg-red-50 border-red-300">
                    <p className="text-red-700 font-semibold">Error: {error}</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="card">
                <div className="border-l-4 border-green-primary pl-4">
                    <h1 className="text-3xl font-bold text-green-primary mb-2">
                        {data.company.name}
                    </h1>
                    <p className="text-neutral-medium text-sm">
                        Supplier ID: {data.supplierId} | Company ID: {data.company.companyId}
                    </p>
                    {data.company.address && (
                        <p className="text-neutral-dark mt-2">
                            <span className="font-semibold">Address:</span> {data.company.address}
                        </p>
                    )}
                </div>
            </div>

            {/* Profile Information */}
            {data.profile && (
                <div className="card">
                    <h2 className="text-2xl font-semibold text-green-secondary mb-4 border-b-2 border-green-light pb-2">
                        Sustainability Passport
                    </h2>

                    {data.profile.description && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-neutral-dark mb-2">Description</h3>
                            <p className="text-neutral-dark leading-relaxed">{data.profile.description}</p>
                        </div>
                    )}

                    {data.profile.esgSummary && (
                        <div>
                            <h3 className="text-lg font-semibold text-neutral-dark mb-2">ESG Summary</h3>
                            <p className="text-neutral-dark leading-relaxed">{data.profile.esgSummary}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Certifications Table */}
            <div className="card">
                <h2 className="text-2xl font-semibold text-green-secondary mb-4 border-b-2 border-green-light pb-2">
                    Certifications
                </h2>

                {data.certifications.length === 0 ? (
                    <p className="text-neutral-medium italic">No certifications on record.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-light">
                            <thead className="bg-green-light/10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-dark">
                                        Certification Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-dark">
                                        Certifying Body
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-dark">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-dark">
                                        Expiry Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-light">
                                {data.certifications.map((cert) => (
                                    <tr key={cert.supplierCertificationId} className="hover:bg-green-light/5">
                                        <td className="px-4 py-3 text-sm text-neutral-dark font-medium">
                                            {cert.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-dark">
                                            {cert.certifyingBody}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cert.status === 'Active'
                                                    ? 'bg-green-accent/20 text-green-primary'
                                                    : 'bg-neutral-light text-neutral-medium'
                                                }`}>
                                                {cert.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-dark">
                                            {cert.expiryDate
                                                ? new Date(cert.expiryDate).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })
                                                : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
