import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Phone,
  Star,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Heart,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
} from '../services/contact.service';
import { EmergencyContact, CreateContactDTO } from '../types';

const RELATIONSHIP_OPTIONS = [
  'Daughter',
  'Son',
  'Spouse',
  'Doctor',
  'Caregiver',
  'Neighbor',
  'Other',
];

export const Profile: React.FC = () => {
  const { user, logout, loading: authLoading } = useAuth();

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [phone, setPhone] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoadingContacts(true);
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load emergency contacts.');
    } finally {
      setLoadingContacts(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user, fetchContacts]);

  const openAddModal = () => {
    setEditingContact(null);
    setName('');
    setRelationship('Daughter');
    setPhone('');
    setIsPrimary(contacts.length === 0);
    setIsModalOpen(true);
    setError(null);
  };

  const openEditModal = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setName(contact.name);
    setRelationship(contact.relationship);
    setPhone(contact.phone);
    setIsPrimary(contact.isPrimary);
    setIsModalOpen(true);
    setError(null);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setError('Please provide both contact name and phone number.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload: CreateContactDTO = {
        name,
        relationship,
        phone,
        isPrimary,
      };

      if (editingContact) {
        await updateContact(editingContact._id, payload);
        setSuccessMsg(`Updated contact "${name}".`);
      } else {
        await createContact(payload);
        setSuccessMsg(`Added "${name}" to emergency contacts.`);
      }

      setIsModalOpen(false);
      await fetchContacts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save contact.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (contact: EmergencyContact) => {
    if (!window.confirm(`Are you sure you want to remove ${contact.name} from emergency contacts?`)) {
      return;
    }

    try {
      await deleteContact(contact._id);
      setSuccessMsg(`Removed ${contact.name}.`);
      await fetchContacts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to remove contact.');
    }
  };

  const handleMakePrimary = async (contactId: string) => {
    try {
      await setPrimaryContact(contactId);
      setSuccessMsg('Primary emergency caregiver updated.');
      await fetchContacts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update primary contact.');
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  // Not Logged In View
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900">Sign In to Manage Caregivers</h1>
          <p className="text-slate-600 max-w-md mx-auto">
            Create or sign in to your ElderCare account to add emergency contacts, primary caregivers, and doctors.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link to="/login" className="elder-btn-primary">
            Sign In
          </Link>
          <Link to="/signup" className="elder-btn-secondary">
            Create New Account
          </Link>
        </div>
      </div>
    );
  }

  // Logged In View
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Profile Card */}
      <div className="elder-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{user.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Verified Account
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">{user.email}</p>
            {user.phone && <p className="text-slate-500 text-xs font-mono">{user.phone}</p>}
          </div>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Emergency Contacts Management Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
              Emergency Caregiver Contacts
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Designated family and doctors contacted during voice-first "Call my daughter" or emergency prompts.
            </p>
          </div>

          <button onClick={openAddModal} className="elder-btn-primary gap-2">
            <Plus className="w-5 h-5" />
            <span>Add Caregiver</span>
          </button>
        </div>

        {/* Contacts Grid */}
        {loadingContacts ? (
          <div className="py-12 flex justify-center text-brand-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="elder-card p-12 text-center space-y-4 border-dashed border-2 border-slate-300">
            <Shield className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-slate-800">No emergency contacts registered yet</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                Add your primary family caregiver (e.g., daughter or son) so ElderCare AI can coordinate calls.
              </p>
            </div>
            <button onClick={openAddModal} className="elder-btn-primary">
              <Plus className="w-5 h-5 mr-1.5" />
              Add First Contact
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contacts.map((contact) => (
              <div
                key={contact._id}
                className={`elder-card p-6 flex flex-col justify-between ${
                  contact.isPrimary
                    ? 'ring-2 ring-emerald-500 border-emerald-200 bg-white shadow-md'
                    : 'bg-white'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md">
                          {contact.relationship}
                        </span>
                        {contact.isPrimary && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                            <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                            Primary Caregiver
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mt-2">{contact.name}</h3>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        onClick={() => openEditModal(contact)}
                        className="p-2 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Contact"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(contact)}
                        className="p-2 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white text-brand-600 rounded-lg shadow-xs">
                        <Phone className="w-4 h-4" />
                      </div>
                      <span className="font-mono text-base font-semibold text-slate-900">
                        {contact.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {contact.isPrimary ? (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Voice Calling Target
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMakePrimary(contact._id)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5" />
                      Set as Primary Caregiver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Miller"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none text-base bg-white"
                >
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none text-base"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="primaryContactCheckbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-5 h-5 text-brand-600 rounded-md border-slate-300 focus:ring-brand-500 cursor-pointer"
                />
                <label
                  htmlFor="primaryContactCheckbox"
                  className="text-sm font-semibold text-slate-800 cursor-pointer"
                >
                  Set as Primary Emergency Caregiver
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="elder-btn-secondary py-2.5 px-4 text-sm"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="elder-btn-primary py-2.5 px-6 text-sm flex items-center gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Save Contact</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
