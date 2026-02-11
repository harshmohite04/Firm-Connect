import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-3xl opacity-30 animate-pulse delay-700"></div>
      </div>

      <div className="text-center max-w-2xl mx-auto backdrop-blur-sm bg-white/50 p-12 rounded-3xl border border-white/60 shadow-xl">
        <div className="mb-8 relative inline-block">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            404
          </h1>
          <div className="absolute -bottom-2 w-full h-2 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full blur-sm"></div>
        </div>

        <h2 className="text-3xl font-bold text-slate-800 mb-4">
          Page Not Found
        </h2>
        
        <p className="text-slate-600 mb-8 text-lg max-w-md mx-auto">
          Oops! The page you are looking for might have been removed, had its name changed, or depends on a specific case ID.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={() => navigate(-1)}
            className="group px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 flex items-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>

          <Link 
            to="/" 
            className="group px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 flex items-center gap-2 shadow-md"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
