import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी (Hindi)' },
    { code: 'mr', label: 'मराठी (Marathi)' },
];

const ProfileNotifications: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [notifications, setNotifications] = useState({
        email: true,
        sms: false
    });

    const handleLanguageChange = (code: string) => {
        i18n.changeLanguage(code);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Language Preferences */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-1">{t('profile.languageTitle')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('profile.languageSubtitle')}</p>
                <div className="space-y-2">
                    {languages.map((lang) => (
                        <label
                            key={lang.code}
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                i18n.language === lang.code
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-slate-100 hover:border-blue-100'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name="language"
                                    value={lang.code}
                                    checked={i18n.language === lang.code}
                                    onChange={() => handleLanguageChange(lang.code)}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={`text-sm font-medium ${
                                    i18n.language === lang.code ? 'text-blue-700' : 'text-slate-700'
                                }`}>
                                    {lang.label}
                                </span>
                            </div>
                            {i18n.language === lang.code && (
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </label>
                    ))}
                </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">{t('profile.notifications')}</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-blue-100 transition-colors">
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">{t('profile.emailNotifications')}</h4>
                            <p className="text-xs text-slate-500">{t('profile.emailNotificationsDesc')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.email}
                                onChange={() => setNotifications({ ...notifications, email: !notifications.email })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-blue-100 transition-colors">
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">{t('profile.smsNotifications')}</h4>
                            <p className="text-xs text-slate-500">{t('profile.smsNotificationsDesc')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.sms}
                                onChange={() => setNotifications({ ...notifications, sms: !notifications.sms })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileNotifications;
