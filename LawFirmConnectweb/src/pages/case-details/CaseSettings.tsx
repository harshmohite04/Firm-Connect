import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import toast from 'react-hot-toast';
import caseService, { type Case } from "../../services/caseService";
import ConfirmationModal from "../../components/ConfirmationModal";

interface OutletContextType {
  caseData: Case;
  setCaseData: React.Dispatch<React.SetStateAction<Case | null>>;
}

const ROLE_LABELS: Record<string, string> = {
  LEAD_ATTORNEY: 'Lead Attorney',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
  ADMIN: 'Admin',
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
  LEAD_ATTORNEY: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-green-100 text-green-700',
  VIEWER: 'bg-slate-100 text-slate-600',
  ADMIN: 'bg-purple-100 text-purple-700',
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => (
  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE_CLASSES[role] || 'bg-slate-100 text-slate-600'}`}>
    {ROLE_LABELS[role] || role}
  </span>
);

const CaseSettings: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { caseData, setCaseData } = useOutletContext<OutletContextType>();

    const userCaseRole = caseData?.userCaseRole || 'MEMBER';
    const canWrite = userCaseRole !== 'VIEWER';
    const isLead = userCaseRole === 'LEAD_ATTORNEY';
    const isAdmin = userCaseRole === 'ADMIN';
    const canManageTeam = isLead || isAdmin;

    const [formState, setFormState] = useState({
        title: "",
        description: "",
        status: "",
    });

    const [notifications, setNotifications] = useState({
        email: true,
        sms: false
    });

    const [saving, setSaving] = useState(false);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    // Add Member Modal State
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberRole, setNewMemberRole] = useState("MEMBER");
    const [addingMember, setAddingMember] = useState(false);

    // Transfer Lead Modal State
    const [showTransferLead, setShowTransferLead] = useState(false);
    const [selectedNewLeadId, setSelectedNewLeadId] = useState("");
    const [transferring, setTransferring] = useState(false);

    // Plan limit info
    const [teamLimit, setTeamLimit] = useState<number | null>(null);

    // Confirmation Modal State
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText: string;
        isDanger?: boolean;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
        confirmText: "Confirm",
        isDanger: false
    });

    const closeConfirmation = () => setConfirmation(prev => ({ ...prev, isOpen: false }));

    useEffect(() => {
        if (caseData) {
            setFormState({
                title: caseData.title || "",
                description: caseData.description || "",
                status: caseData.status || "Open",
            });
            if (caseData.settings?.notifications) {
                setNotifications(caseData.settings.notifications);
            }

            // Map real team members
            if (caseData.teamMembers && caseData.teamMembers.length > 0) {
                 const mappedMembers = caseData.teamMembers.map((tm: any) => ({
                     id: tm.userId?._id || tm._id,
                     userId: tm.userId?._id,
                     name: tm.userId ? `${tm.userId.firstName} ${tm.userId.lastName}` : "Unknown User",
                     role: tm.role || "MEMBER",
                     email: tm.userId?.email,
                     img: "https://ui-avatars.com/api/?name=" + (tm.userId ? `${tm.userId.firstName}+${tm.userId.lastName}` : "User") + "&background=random"
                 }));
                 setTeamMembers(mappedMembers);
            } else {
                 setTeamMembers([]);
            }

            // Compute plan limit for non-firm users
            const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (!user.organizationId) {
                        const plan = user.subscriptionPlan;
                        setTeamLimit(plan === 'PROFESSIONAL' ? 5 : 2);
                    } else {
                        setTeamLimit(null);
                    }
                } catch { /* ignore */ }
            }

            // Load pending requests if lead attorney or admin
            if (id && canManageTeam) {
                caseService.getPendingTeamRequests(id)
                    .then((data: any) => setPendingRequests(data.requests || []))
                    .catch(() => setPendingRequests([]));
            }
        }
    }, [caseData, id]);

    const handleGeneralSave = async () => {
        if (!id) return;
        setSaving(true);
        try {
            const updatedCase = await caseService.updateCaseSettings(id, {
                title: formState.title,
                description: formState.description,
                status: formState.status
            });
            setCaseData(updatedCase);
            toast.success("Settings saved successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const toggleNotification = async (type: 'email' | 'sms') => {
        if (!id) return;
        const newNotifs = { ...notifications, [type]: !notifications[type] };
        setNotifications(newNotifs);

        try {
            const updatedCase = await caseService.updateCaseSettings(id, {
                notifications: newNotifs
            });
            setCaseData(updatedCase);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update notification settings");
            setNotifications(notifications);
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !newMemberEmail) return;
        setAddingMember(true);
        try {
            const result = await caseService.addTeamMember(id, newMemberEmail, newMemberRole);

            setNewMemberEmail("");
            setShowAddMember(false);

            if (result.action === 'pending_approval') {
                toast.success("Request sent to firm admin for approval");
                caseService.getPendingTeamRequests(id)
                    .then((data: any) => setPendingRequests(data.requests || []))
                    .catch(() => {});
            } else if (result.action === 'invitation_sent') {
                toast.success("Invitation sent! They'll need to accept before joining.");
            } else {
                const updatedCase = await caseService.getCaseById(id);
                setCaseData(updatedCase);
                toast.success("Team member added successfully!");
            }
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 404) {
                toast.error("User not found. Please ensure the email is registered on the portal.");
            } else if (error.response?.status === 400) {
                toast.error(error.response.data.message || "Cannot add this user.");
            } else {
                toast.error("Failed to add team member.");
            }
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMemberClick = (userId: string, memberRole: string) => {
        if (memberRole === 'LEAD_ATTORNEY') {
            toast.error("Cannot remove the lead attorney. Transfer leadership first.");
            return;
        }
        setConfirmation({
            isOpen: true,
            title: "Remove Team Member",
            message: "Are you sure you want to remove this team member?",
            confirmText: "Remove",
            onConfirm: () => confirmRemoveMember(userId),
            isDanger: true
        });
    };

    const confirmRemoveMember = async (userId: string) => {
        if (!id) return;
        try {
            await caseService.removeTeamMember(id, userId);
            const updatedCase = await caseService.getCaseById(id);
            setCaseData(updatedCase);
            toast.success("Team member removed.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove team member.");
        } finally {
            closeConfirmation();
        }
    };

    const handleTransferLead = async () => {
        if (!id || !selectedNewLeadId) return;
        setTransferring(true);
        try {
            await caseService.transferLead(id, selectedNewLeadId);
            const updatedCase = await caseService.getCaseById(id);
            setCaseData(updatedCase);
            toast.success("Leadership transferred successfully.");
            setShowTransferLead(false);
            setSelectedNewLeadId("");
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to transfer leadership.");
        } finally {
            setTransferring(false);
        }
    };

    const handleDeleteCaseClick = () => {
        setConfirmation({
            isOpen: true,
            title: "Delete Case",
            message: "Are you sure you want to delete this case? This action cannot be undone.",
            confirmText: "Delete Case",
            onConfirm: confirmDeleteCase,
            isDanger: true
        });
    };

    const confirmDeleteCase = async () => {
        if (!id) return;
        try {
            await caseService.deleteCase(id);
            toast.success("Case deleted successfully.");
            navigate('/portal/cases');
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete case.");
        } finally {
            closeConfirmation();
        }
    };

    // Members eligible to become lead (non-lead team members)
    const eligibleForLead = teamMembers.filter(m => m.role !== 'LEAD_ATTORNEY');

  return (
    <div className="flex-1 bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Viewer banner */}
        {!canWrite && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800 font-medium">
            You have <strong>Viewer</strong> access to this case. You can view all information but cannot make changes.
          </div>
        )}

        {/* General Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-900">General Settings</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Case Name</label>
              <input
                type="text"
                value={formState.title}
                onChange={(e) => setFormState({...formState, title: e.target.value})}
                disabled={!canWrite}
                className="block w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Case Description</label>
              <textarea
                value={formState.description}
                onChange={(e) => setFormState({...formState, description: e.target.value})}
                disabled={!canWrite}
                rows={3}
                className="block w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none disabled:bg-slate-50 disabled:text-slate-500"
              ></textarea>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-col">
                <label className="text-sm font-bold text-slate-700 mb-1">Status</label>
                <span className="text-xs text-slate-500">Current state of the legal matter</span>
              </div>
              <select
                value={formState.status}
                onChange={(e) => setFormState({...formState, status: e.target.value})}
                disabled={!canWrite}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none disabled:bg-slate-50"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            {canWrite && (
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={handleGeneralSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-colors text-sm disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-900">Notifications</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Email Updates</h4>
                <p className="text-xs text-slate-500">Receive emails about new documents and messages</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifications.email}
                  onChange={() => toggleNotification('email')}
                  disabled={!canWrite}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Team Management */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-slate-900">Team Management</h3>
              {teamLimit !== null && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  {teamMembers.length + 1}/{teamLimit} teammates
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLead && eligibleForLead.length > 0 && (
                <button
                  className="text-sm font-bold text-amber-600 hover:text-amber-800 transition-colors"
                  onClick={() => setShowTransferLead(!showTransferLead)}
                >
                  {showTransferLead ? "Cancel Transfer" : "Transfer Lead"}
                </button>
              )}
              {canManageTeam && (
                <button
                  className={`text-sm font-bold transition-colors ${
                    teamLimit !== null && teamMembers.length + 1 >= teamLimit && !showAddMember
                      ? "text-slate-400 cursor-not-allowed"
                      : "text-blue-600 hover:text-blue-800"
                  }`}
                  onClick={() => {
                    if (teamLimit !== null && teamMembers.length + 1 >= teamLimit && !showAddMember) {
                      toast.error(`Maximum ${teamLimit} teammates reached for your plan. Upgrade to add more.`);
                      return;
                    }
                    setShowAddMember(!showAddMember);
                  }}
                >
                  {showAddMember ? "Cancel" : "+ Add Member"}
                </button>
              )}
            </div>
          </div>

          {/* Transfer Lead Form */}
          {showTransferLead && isLead && (
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
              <p className="text-xs font-bold text-amber-800 mb-3">Select a team member to become the new Lead Attorney:</p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <select
                    value={selectedNewLeadId}
                    onChange={(e) => setSelectedNewLeadId(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:border-amber-500 outline-none bg-white"
                  >
                    <option value="">Select team member...</option>
                    {eligibleForLead.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name} ({ROLE_LABELS[m.role] || m.role})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleTransferLead}
                  disabled={!selectedNewLeadId || transferring}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50"
                >
                  {transferring ? "Transferring..." : "Transfer"}
                </button>
              </div>
            </div>
          )}

          {/* Add Member Form */}
          {showAddMember && canManageTeam && (
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
              <form onSubmit={handleAddMember} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="colleague@lawfirm.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50"
                >
                  {addingMember ? "Adding..." : "Add"}
                </button>
              </form>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {teamMembers.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No team members added yet.
              </div>
            ) : (
              teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="px-6 py-4 flex items-center justify-between group hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.img}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover bg-slate-200"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{member.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <RoleBadge role={member.role} />
                        <span className="text-xs text-slate-400">{member.email}</span>
                      </div>
                    </div>
                  </div>
                  {canManageTeam && member.role !== 'LEAD_ATTORNEY' && (
                    <button
                      className="text-slate-400 hover:text-red-600 text-sm font-medium transition-colors opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveMemberClick(member.userId, member.role)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Approval Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-100 bg-amber-50">
              <h3 className="font-bold text-amber-900">Pending Approval Requests</h3>
              <p className="text-xs text-amber-700 mt-1">These requests are awaiting your firm admin's approval</p>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingRequests.map((req: any) => (
                <div key={req._id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://ui-avatars.com/api/?name=${req.requestedUser?.firstName}+${req.requestedUser?.lastName}&background=random`}
                      alt={`${req.requestedUser?.firstName} ${req.requestedUser?.lastName}`}
                      className="w-10 h-10 rounded-full object-cover bg-slate-200"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {req.requestedUser?.firstName} {req.requestedUser?.lastName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <RoleBadge role={req.role} />
                        <span className="text-xs text-slate-400">{req.requestedUser?.email}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger Zone — only for lead/admin */}
        {canManageTeam && (
          <div className="bg-red-50 rounded-xl border border-red-100 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-red-700">Delete Case</h3>
              <p className="text-sm text-red-600/80 mt-1">
                This action cannot be undone. All documents and messages will be permanently removed.
              </p>
            </div>
            <button
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-colors text-sm whitespace-nowrap"
              onClick={handleDeleteCaseClick}
            >
              Delete Case
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        isDanger={confirmation.isDanger}
      />
    </div>
  );
};

export default CaseSettings;
