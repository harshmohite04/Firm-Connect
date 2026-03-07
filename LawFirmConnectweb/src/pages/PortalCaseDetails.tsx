import React, { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";

import AIIconLogo from "../assets/ai-logo.svg";
import PortalLayout from "../components/PortalLayout";
import type { Case } from "../services/caseService";
import caseService from "../services/caseService";

const PortalCaseDetails: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCaseDetails = async () => {
      if (!id) return;
      try {
        const data = await caseService.getCaseById(id);
        setCaseData(data);
      } catch (error) {
        console.error("Failed to fetch case details", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseDetails();
  }, [id]);

  // Redirect to default tab (activity) if at root case path
  useEffect(() => {
    if (
      (!loading && caseData && location.pathname === `/portal/cases/${id}`) ||
      location.pathname === `/portal/cases/${id}/`
    ) {
      navigate("activity", { replace: true });
    }
  }, [loading, caseData, id, location.pathname, navigate]);

  if (loading)
    return (
      <PortalLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
                 style={{ border: '4px solid var(--color-surface-border)', borderTopColor: 'var(--color-accent)' }}></div>
            <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('caseDetails.loading')}</p>
          </div>
        </div>
      </PortalLayout>
    );
  if (!caseData)
    return (
      <PortalLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('caseDetails.notFound')}</p>
          </div>
        </div>
      </PortalLayout>
    );

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `pb-3 text-sm font-medium transition-colors ${isActive ? "font-bold" : "hover:opacity-80"}`;

  const getNavLinkStyle = (isActive: boolean) => ({
    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
  });

  return (
    <PortalLayout>
      <div
        className={`card-surface overflow-hidden flex flex-col ${location.pathname.includes("/chat") || location.pathname.includes("/draft") ? "h-[calc(100vh-96px)]" : "min-h-[calc(100vh-140px)]"}`}
      >
        {/* Custom Page Header */}
        <div className="px-6 pt-6 pb-0" style={{ borderBottom: '1px solid var(--color-surface-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                <span>{t('caseDetails.cases')}</span>
                <span>/</span>
                <span>{caseData.title}</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('caseDetails.casePrefix')}{caseData.title}
              </h1>
            </div>
          </div>

          <div className="flex gap-8">
            <NavLink to="activity" className={getNavLinkClass} style={({ isActive }) => getNavLinkStyle(isActive)}>
              {t('caseDetails.activity')}
            </NavLink>
            <NavLink to="documents" className={getNavLinkClass} style={({ isActive }) => getNavLinkStyle(isActive)}>
              {t('caseDetails.documents')}
            </NavLink>
            <NavLink
              to="chat"
              className={({ isActive }) =>
                `pb-3 text-sm font-medium transition-colors flex items-center gap-2 ${isActive ? "font-bold" : "hover:opacity-80"}`
              }
              style={({ isActive }) => getNavLinkStyle(isActive)}
            >
              {({ isActive }) => (
                <>
                  <img
                    src={AIIconLogo}
                    alt="AI"
                    className={`w-5 h-5 ${isActive ? "" : "grayscale opacity-50"}`}
                  />
                  {t('caseDetails.askAI')}
                </>
              )}
            </NavLink>
            <NavLink to="draft" className={getNavLinkClass} style={({ isActive }) => getNavLinkStyle(isActive)}>
              {t('caseDetails.drafting')}
            </NavLink>
            <NavLink
                to="investigator"
                className={({ isActive }) =>
                    `pb-3 text-sm font-medium transition-colors flex items-center gap-2 ${isActive ? "font-bold" : "hover:opacity-80"}`
                }
                style={({ isActive }) => ({
                  color: isActive ? '#7C3AED' : 'var(--color-text-secondary)',
                  borderBottom: isActive ? '2px solid #7C3AED' : '2px solid transparent',
                })}
            >
               {t('caseDetails.investigatorAgent')}
            </NavLink>
            <NavLink to="precedents" className={getNavLinkClass} style={({ isActive }) => getNavLinkStyle(isActive)}>
              {t('caseDetails.precedents')}
            </NavLink>
            <NavLink to="settings" className={getNavLinkClass} style={({ isActive }) => getNavLinkStyle(isActive)}>
              {t('caseDetails.settings')}
            </NavLink>
          </div>
        </div>

        {/* CONTENT AREA */}
        <Outlet context={{ caseData, setCaseData }} />
      </div>
    </PortalLayout>
  );
};

export default PortalCaseDetails;
