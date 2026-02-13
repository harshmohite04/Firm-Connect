import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import Logo from '../assets/logo.svg';



const EyeIcon = () => (
    <svg className="w-5 h-5 text-slate-400 cursor-pointer hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
)

const LockIcon = () => (
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
)

const ShieldIcon = () => (
    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
)

const BuildingIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
)

const SignUp: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        accountType: 'FIRM' as 'FIRM' | 'ATTORNEY', // Locked to FIRM
        organizationId: ''
    });
    
    // Removed Org List State and useEffect for Attorney restriction

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const getPasswordErrors = (password: string): string[] => {
        const errors: string[] = [];
        if (password.length < 8) errors.push('At least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('One number');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character (!@#$%^&*...)');
        return errors;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Removed handleAccountTypeChange

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const passwordErrors = getPasswordErrors(formData.password);
        if (passwordErrors.length > 0) {
            setError(`Password requirements: ${passwordErrors.join(', ')}`);
            return;
        }

        setIsLoading(true);
        try {
            await authService.register(formData);
            toast.success('Account created successfully! Please log in.');
            navigate('/signin');
        } catch (err: any) {
             setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-14">
            <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden grid lg:grid-cols-2 min-h-[600px]">
                
                {/* Left Side: Form */}
                <div className="flex flex-col p-8 sm:p-12 lg:p-16 overflow-y-auto">
                    {/* Branding */}
                    <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="rounded-lg">
                           {/* <LogoIcon /> */}
                           <img src={Logo} alt="" style={{ width: '6rem', height: '6rem' }}/>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-900">LawfirmAI</span>
                    </div>

                    <div className="flex-grow flex flex-col justify-center w-full mx-auto">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                            Create Client Account
                        </h1>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                             Join our secure portal to manage your legal cases and communications seamlessly.
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleRegister}>
                            
                            {/* Account Type Selection - HIDDEN/REMOVED for Attorney Restriction */}
                            {/* Inherently creating a FIRM (Admin) account now */}
                            
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <div className="text-blue-600 mt-1">
                                        <BuildingIcon />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-blue-900">Creating a New Firm</h3>
                                        <p className="text-xs text-blue-700 mt-1">
                                            You are registering as a Firm Owner/Admin. You can invite your team members after creating your account.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-xs font-bold text-slate-900 mb-1.5">First Name</label>
                                    <input 
                                        id="firstName" name="firstName" type="text" required 
                                        value={formData.firstName} onChange={handleInputChange}
                                        className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-xs font-bold text-slate-900 mb-1.5">Last Name</label>
                                    <input 
                                        id="lastName" name="lastName" type="text" required 
                                        value={formData.lastName} onChange={handleInputChange}
                                        className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-xs font-bold text-slate-900 mb-1.5">Email Address</label>
                                <input 
                                    id="email" name="email" type="email" required 
                                    value={formData.email} onChange={handleInputChange}
                                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-xs font-bold text-slate-900 mb-1.5">Phone Number</label>
                                <input 
                                    id="phone" name="phone" type="tel" required 
                                    value={formData.phone} onChange={handleInputChange}
                                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-xs font-bold text-slate-900 mb-1.5">Password</label>
                                <div className="relative">
                                    <input 
                                        id="password" name="password" 
                                        type={showPassword ? "text" : "password"} 
                                        required 
                                        value={formData.password} onChange={handleInputChange}
                                        className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none pr-12"
                                        placeholder="Create a strong password"
                                    />
                                    <div 
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <EyeIcon />
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (!@#$%^&*)</p>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Processing...' : (
                                    <>
                                        <LockIcon /> Create Account
                                    </>
                                )}
                            </button>
                            
                            <div className="text-center mt-6">
                                <p className="text-sm text-slate-500">
                                    Already have an account? <a href="/signin" className="font-bold text-blue-600 hover:text-blue-700">Log in</a>
                                </p>
                            </div>
                        </form>

                        <hr className="my-8 border-slate-100" />
                        
                        <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 tracking-wider">
                                <ShieldIcon />
                                 256-BIT SSL SECURE CONNECTION
                             </div>
                        </div>

                    </div>
                </div>

                {/* Right Side: Image/Branding */}
                <div className="hidden lg:relative lg:block bg-slate-900 overflow-hidden">
                     <div className="absolute inset-0">
                        <img 
                            src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=2070" 
                            alt="Legal Documents" 
                            className="w-full h-full object-cover opacity-40"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    </div>
                    
                    <div className="relative h-full flex flex-col justify-end p-16">
                        <div className="mb-8">
                             <h2 className="text-2xl font-bold text-white leading-tight mb-4 tracking-tight">
                                "The first step towards justice is creating a secure connection with your counsel."
                            </h2>
                             <div className="w-12 h-1 bg-blue-600 rounded-full mb-6"></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SignUp;
