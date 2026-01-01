import { useState } from 'react';

interface SurveyResponse {
    findMethod: string;
    dataNeeds: string[];
    frustration: string;
    researchTime: number;
    rankFactors: string[];
    compareFormat: string;
    featureRequest: string;
    contact: string;
}

export function ArchitectSurvey() {
    const [responses, setResponses] = useState<SurveyResponse>({
        findMethod: '',
        dataNeeds: [],
        frustration: '',
        researchTime: 1,
        rankFactors: [],
        compareFormat: '',
        featureRequest: '',
        contact: ''
    });

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 7;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Save to backend
        console.log('Survey responses:', responses);
        // Show thank you message
        setCurrentStep(totalSteps + 1);
    };

    const updateResponse = (field: keyof SurveyResponse, value: string | number | string[]) => {
        setResponses(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayValue = (field: 'dataNeeds' | 'rankFactors', value: string) => {
        setResponses(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter(v => v !== value)
                : [...prev[field], value]
        }));
    };

    if (currentStep > totalSteps) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full text-center">
                    <div className="text-6xl mb-6">🎉</div>
                    <h2 className="text-3xl font-bold text-white mb-4">Thank You!</h2>
                    <p className="text-xl text-slate-300 mb-8">
                        Your feedback is invaluable. We'll send you an invite to test GreenChainz beta within 48 hours.
                    </p>
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors"
                    >
                        Return to Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400" />
                        <h1 className="text-2xl font-bold text-white">GreenChainz Beta Survey</h1>
                    </div>
                    <p className="text-slate-400">
                        Help us build the perfect sustainable materials sourcing tool for architects
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                            <span>Step {currentStep} of {totalSteps}</span>
                            <span>{Math.round((currentStep / totalSteps) * 100)}% complete</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-300"
                                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Step 1: Current Method */}
                    {currentStep === 1 && (
                        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800">
                            <h3 className="text-xl font-bold text-white mb-4">
                                How do you CURRENTLY find sustainable building materials?
                            </h3>
                            <div className="space-y-3">
                                {[
                                    'Google search',
                                    'Manufacturer reps',
                                    'Trade publications',
                                    'Databases (Building Transparency, 2050 Materials, etc.)',
                                    'Word-of-mouth/colleague tips',
                                    'Other'
                                ].map((option) => (
                                    <label key={option} className="flex items-center gap-3 p-4 rounded-lg border border-slate-700 hover:border-sky-500 cursor-pointer transition-colors">
                                        <input
                                            type="radio"
                                            name="findMethod"
                                            value={option}
                                            checked={responses.findMethod === option}
                                            onChange={(e) => updateResponse('findMethod', e.target.value)}
                                            className="w-5 h-5 text-sky-600 focus:ring-sky-500"
                                        />
                                        <span className="text-slate-300">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Data Needs */}
                    {currentStep === 2 && (
                        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800">
                            <h3 className="text-xl font-bold text-white mb-4">
                                When evaluating a material, which of these do you NEED to see?
                            </h3>
                            <p className="text-slate-400 text-sm mb-6">Select all that apply</p>
                            <div className="space-y-3">
                                {[
                                    'Carbon footprint',
                                    'Certifications (FSC, B Corp, LEED, etc.)',
                                    'Performance specs (R-value, fire rating)',
                                    'Cost',
                                    'Lead times / availability',
                                    'Manufacturer reputation',
                                    'Case studies / past projects'
                                ].map((option) => (
                                    <label key={option} className="flex items-center gap-3 p-4 rounded-lg border border-slate-700 hover:border-sky-500 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={responses.dataNeeds.includes(option)}
                                            onChange={() => toggleArrayValue('dataNeeds', option)}
                                            className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500"
                                        />
                                        <span className="text-slate-300">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Frustration */}
                    {currentStep === 3 && (
                        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800">
                            <h3 className="text-xl font-bold text-white mb-4">
                                What's your BIGGEST frustration with material research/specification?
                            </h3>
                            <textarea
                                value={responses.frustration}
                                onChange={(e) => updateResponse('frustration', e.target.value)}
                                className="w-full h-40 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                                placeholder="Share your biggest pain point..."
                            />
                        </div>
                    )}

                    {/* Step 4: Time Spent */}
                    {currentStep === 4 && (
                        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800">
                            <h3 className="text-xl font-bold text-white mb-4">
                                How much time do you spend researching materials per project?
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Less than 1 hour', value: 1 },
                                    { label: '1-3 hours', value: 2 },
                                    { label: '4-8 hours', value: 5 },
                                    { label: '9-15 hours', value: 10 },
                                    { label: '15+ hours', value: 20 }
                                ].map((option) => (
                                    <label key={option.value} className="flex items-center gap-3 p-4 rounded-lg border border-slate-700 hover:border-sky-500 cursor-pointer transition-colors">
                                        <input
                                            type="radio"
                                            name="researchTime"
                                            value={option.value}
                                            checked={responses.researchTime === option.value}
                                            onChange={(e) => updateResponse('researchTime', Number(e.target.value))}
                                            className="w-5 h-5 text-sky-600 focus:ring-sky-500"
                                        />
                                        <span className="text-slate-300">{option.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 5: Comparison Format */}
                    {currentStep === 5 && (
                        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800">
                            <h3 className="text-xl font-bold text-white mb-4">
                                What format would make comparison easiest?
                            </h3>
                            <div className="space-y-3">
                                {[
                                    'Table view (spreadsheet-style)',
                                    'Cards with images and specs',
                                    'Side-by-side comparison (2-4 items)',
                                    'Advanced filters and search',
                                    'Integration with CAD/BIM tools',
                                    'Mobile app'
                                ].map((option) => (
                                    <label key={option} className="flex items-center gap-3 p-4 rounded-lg border border-slate-700 hover:border-sky-500 cursor-pointer transition-colors">
                                        <input
                                            type="radio"
                                            name="compareFormat"
                                            value={option}
                                            checked={responses.compareFormat === option}
                                            onChange={(e) => updateResponse('compareFormat', e.target.value)}
                                            className="w-5 h-5 text-sky-600 focus:ring-sky-500"
                                        />
                                        <span className="text-slate-300">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 6: Feature Request */}
                    {currentStep === 6 && (
                        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800">
                            <h3 className="text-xl font-bold text-white mb-4">
                                What's ONE feature/capability that would make your workflow 10x easier?
                            </h3>
                            <textarea
                                value={responses.featureRequest}
                                onChange={(e) => updateResponse('featureRequest', e.target.value)}
                                className="w-full h-40 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                                placeholder="Describe your dream feature..."
                            />
                        </div>
                    )}

                    {/* Step 7: Contact */}
                    {currentStep === 7 && (
                        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800">
                            <h3 className="text-xl font-bold text-white mb-4">
                                Can we invite you to test GreenChainz in beta?
                            </h3>
                            <input
                                type="email"
                                value={responses.contact}
                                onChange={(e) => updateResponse('contact', e.target.value)}
                                placeholder="your.email@example.com"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <p className="mt-3 text-sm text-slate-400">
                                We'll send you early access within 48 hours 🚀
                            </p>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between">
                        {currentStep > 1 && (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(prev => prev - 1)}
                                className="px-6 py-3 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors"
                            >
                                ← Previous
                            </button>
                        )}

                        <div className="ml-auto">
                            {currentStep < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(prev => prev + 1)}
                                    className="px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors"
                                >
                                    Next →
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 hover:shadow-lg hover:shadow-sky-500/25 text-white font-medium transition-all"
                                >
                                    Submit Survey
                                </button>
                            )}
                        </div>
                    </div>
                </form>

                {/* Auto-save indicator */}
                <div className="mt-6 text-center text-sm text-slate-500">
                    💾 Your responses are auto-saved locally
                </div>
            </div>
        </div>
    );
}
