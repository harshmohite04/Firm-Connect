import React from 'react';
import { BrowserRouter, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Home from './pages/Home';
import PortalBilling from './pages/PortalBilling';
import PortalCalendar from './pages/PortalCalendar';
import PortalCaseDetails from './pages/PortalCaseDetails';
import PortalCases from './pages/PortalCases';
import PortalMessages from './pages/PortalMessages';
import PracticeAreas from './pages/PracticeAreas';
import PracticeAreaDetail from './pages/PracticeAreaDetail';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import StartCase from './pages/StartCase';
import UserPortal from './pages/UserPortal';
import PortalProfile from './pages/PortalProfile';
import ProfileInfo from './pages/profile/ProfileInfo';
import ProfileSecurity from './pages/profile/ProfileSecurity';
import ProfileNotifications from './pages/profile/ProfileNotifications';
import CaseActivity from './pages/case-details/CaseActivity';
import CaseDocuments from './pages/case-details/CaseDocuments';
import CaseChat from './pages/case-details/CaseChat';
import CaseBilling from './pages/case-details/CaseBilling';
import CaseSettings from './pages/case-details/CaseSettings';
import InvestigatorAgent from './pages/case-details/InvestigatorAgent';
import CaseDraft from './pages/case-details/CaseDraft';
import NotFound from './pages/NotFound';

// Payment & Subscription Imports
import Pricing from './pages/Pricing';
import SubscriptionGuard from './components/SubscriptionGuard';

// Firm Management Imports
import FirmConnect from './pages/FirmConnect';
import OrganizationPage from './pages/Organization';
import InviteAccept from './pages/InviteAccept';

// ScrollToTop component to handle scroll position on route change
const ScrollToTop = () => {
    const { pathname } = useLocation();
    
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    
    return null;
}

const App: React.FC = () => {
  const { pathname } = useLocation();
  // Hide Navbar and Footer on Sign In, Portal pages, and Pricing page
  const isAuthPage = pathname === '/signin' || pathname === '/signup' || pathname.startsWith('/portal') || pathname === '/pricing' || pathname.startsWith('/invite');

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 leading-normal selection:bg-blue-100 selection:text-blue-900 flex flex-col">
       {!isAuthPage && <Navbar />}
       <main className="flex-grow">
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice-areas" element={<PracticeAreas />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/practice-areas/:id" element={<PracticeAreaDetail />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/pricing" element={<Pricing />} />
            
            {/* Protected Portal Routes */}
            <Route path="/portal" element={
                <SubscriptionGuard>
                    <UserPortal />
                </SubscriptionGuard>
            } />
            <Route path="/portal/cases" element={
                <SubscriptionGuard>
                    <PortalCases />
                </SubscriptionGuard>
            } />
            <Route path="/portal/start-case" element={
                <SubscriptionGuard>
                    <StartCase />
                </SubscriptionGuard>
            } />
            <Route path="/portal/cases/:id" element={
                <SubscriptionGuard>
                    <PortalCaseDetails />
                </SubscriptionGuard>
            }>
                <Route index element={<Navigate to="activity" replace />} />
                <Route path="activity" element={<CaseActivity />} />
                <Route path="documents" element={<CaseDocuments />} />
                <Route path="chat" element={<CaseChat />} />
                <Route path="investigator" element={<InvestigatorAgent />} />
                <Route path="draft" element={<CaseDraft />} />
                <Route path="billing" element={<CaseBilling />} />
                <Route path="settings" element={<CaseSettings />} />
            </Route>

            <Route path="/portal/billing" element={
                <SubscriptionGuard>
                    <PortalBilling />
                </SubscriptionGuard>
            } />
            <Route path="/portal/calendar" element={
                <SubscriptionGuard>
                    <PortalCalendar />
                </SubscriptionGuard>
            } />
            <Route path="/portal/messages" element={
                <SubscriptionGuard>
                    <PortalMessages />
                </SubscriptionGuard>
            } />
            <Route path="/portal/profile" element={
                <SubscriptionGuard>
                    <PortalProfile />
                </SubscriptionGuard>
            }>
                <Route index element={<Navigate to="info" replace />} />
                <Route path="info" element={<ProfileInfo />} />
                <Route path="security" element={<ProfileSecurity />} />
                <Route path="notifications" element={<ProfileNotifications />} />
            </Route>

            {/* Firm Management Routes */}
            <Route path="/portal/firm-connect" element={
                <SubscriptionGuard>
                    <FirmConnect />
                </SubscriptionGuard>
            } />
            <Route path="/portal/organization" element={
                <SubscriptionGuard>
                    <OrganizationPage />
                </SubscriptionGuard>
            } />

            {/* Invitation Routes (semi-public) */}
            <Route path="/invite/:token/accept" element={<InviteAccept />} />
            <Route path="/invite/:token/reject" element={<InviteAccept />} />

        <Route path="*" element={<NotFound />} />
        </Routes>
       </main>
       {!isAuthPage && <Footer />}
    </div>
  );
};

const AppWrapper: React.FC = () => {
   return (
    <BrowserRouter>
        <ScrollToTop />
        <Toaster position="top-right" />
        <App />
    </BrowserRouter>
   )
}

export default AppWrapper;
