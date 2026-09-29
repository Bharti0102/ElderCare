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
  Users,
  Stethoscope,
  Ambulance,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
} from '../services/contact.service';
import { EmergencyContact, CreateContactDTO, ContactCategory } from '../types';

const CATEGORY_OPTIONS: { value: ContactCategory; label: string; icon: any; color: string; bg: string }[] = [
  { value: 'FAMILY', label: 'Family & Loved Ones', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  { value: 'CAREGIVER', label: 'Caregivers & Nurses', icon: Users, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
  { value: 'DOCTOR', label: 'Doctors & Clinics', icon: Stethoscope, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  { value: 'EMERGENCY', label: 'Emergency SOS', icon: Ambulance, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
];

const RELATIONSHIPS_BY_CATEGORY: Record<ContactCategory, string[]> = {
  FAMILY: ['Daughter', 'Son', 'Spouse', 'Grandchild', 'Sister', 'Brother', 'Mother', 'Father', 'Relative', 'Other Family'],
  CAREGIVER: ['Primary Caregiver', 'Home Nurse', 'Physiotherapist', 'Care Assistant', 'Home Attendant'],
  DOCTOR: ['Primary Physician', 'Cardiologist', 'General Physician', 'Specialist Doctor', 'Clinic Desk'],
  EMERGENCY: ['Emergency Contact', 'Neighbor', 'Building Security', 'Local Ambulance (108)', 'Police (100)'],
};

export const Profile: React.FC = () => {
  const { user, logout, loading: authLoading } = useAuth();

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'ALL' | ContactCategory>('ALL');
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ContactCategory>('FAMILY');
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
      setError(err.message || 'Failed to load phonebook contacts.');
    } finally {
      setLoadingContacts(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user, fetchContacts]);

  const openAddModal = (presetCategory?: ContactCategory) => {
    const defaultCat = presetCategory || (selectedCategoryTab !== 'ALL' ? selectedCategoryTab : 'FAMILY');
    setEditingContact(null);
    setName('');
    setCategory(defaultCat);
    setRelationship(RELATIONSHIPS_BY_CATEGORY[defaultCat][0] || 'Daughter');
    setPhone('');
    setIsPrimary(contacts.length === 0);
    setIsModalOpen(true);
    setError(null);
  };

  const openEditModal = (contact: EmergencyContact) => {
    const cat = contact.category || 'FAMILY';
    setEditingContact(contact);
    setName(contact.name);
    setCategory(cat);
    setRelationship(contact.relationship);
    setPhone(contact.phone);
    setIsPrimary(contact.isPrimary);
    setIsModalOpen(true);
    setError(null);
  };

  const handleCategoryChange = (newCat: ContactCategory) => {
    setCategory(newCat);
    // Reset relationship to first default in category if current isn't in it
    const options = RELATIONSHIPS_BY_CATEGORY[newCat];
    if (!options.includes(relationship)) {
      setRelationship(options[0] || 'Contact');
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Please provide both contact name and phone number.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload: CreateContactDTO = {
        name: name.trim(),
        relationship,
        category,
        phone: phone.trim(),
        isPrimary,
      };

      if (editingContact) {
        await updateContact(editingContact._id, payload);
        setSuccessMsg(`Updated contact "${name}".`);
      } else {
        await createContact(payload);
        setSuccessMsg(`Added "${name}" to your ${category.toLowerCase()} phonebook.`);
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
    if (!window.confirm(`Are you sure you want to remove ${contact.name} from your phonebook?`)) {
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
      setSuccessMsg('Primary caregiver updated.');
      await fetchContacts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update primary contact.');
    }
  };

  // Filter contacts by category tab
  const filteredContacts = contacts.filter((c) => {
    if (selectedCategoryTab === 'ALL') return true;
    return (c.category || 'FAMILY') === selectedCategoryTab;
  });

  const getCategoryMeta = (cat?: ContactCategory) => {
    const match = CATEGORY_OPTIONS.find((opt) => opt.value === (cat || 'FAMILY'));
    return match || CATEGORY_OPTIONS[0];
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
          <h1 className="text-3xl font-extrabold text-slate-900">Sign In to Manage Phonebook</h1>
          <p className="text-slate-600 max-w-md mx-auto">
            Create or sign in to your ElderCare account to add family members, caregivers, doctors, and emergency contacts.
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Profile Card */}
      <div className="elder-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-white via-slate-50/50 to-white border border-slate-200/90 shadow-sm">
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

      {/* Family & Caregiver Phonebook Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-800 text-xs font-bold border border-brand-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Multi-Contact Phonebook Directory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Family & Caregiver Phonebook
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Add multiple loved ones, home nurses, doctors, and emergency SOS lines for instant video and voice reach.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => openAddModal()} className="elder-btn-primary gap-2">
              <Plus className="w-5 h-5" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setSelectedCategoryTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              selectedCategoryTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Contacts ({contacts.length})
          </button>

          {CATEGORY_OPTIONS.map((opt) => {
            const count = contacts.filter((c) => (c.category || 'FAMILY') === opt.value).length;
            const Icon = opt.icon;
            const isActive = selectedCategoryTab === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedCategoryTab(opt.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : opt.color}`} />
                <span>{opt.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Contacts Grid */}
        {loadingContacts ? (
          <div className="py-12 flex justify-center text-brand-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="elder-card p-10 text-center space-y-4 border-dashed border-2 border-slate-300">
            <Shield className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {selectedCategoryTab === 'ALL'
                  ? 'No contacts in phonebook yet'
                  : `No ${selectedCategoryTab.toLowerCase()} contacts added yet`}
              </h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">
                Add multiple family members, personal caregivers, or doctors so you can connect in 1 tap anytime.
              </p>
            </div>
            <button
              onClick={() => openAddModal(selectedCategoryTab === 'ALL' ? 'FAMILY' : selectedCategoryTab)}
              className="elder-btn-primary"
            >
              <Plus className="w-5 h-5 mr-1.5" />
              <span>Add First Contact</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map((contact) => {
              const meta = getCategoryMeta(contact.category);
              const CategoryIcon = meta.icon;

              return (
                <div
                  key={contact._id}
                  className={`elder-card p-6 flex flex-col justify-between transition-all hover:shadow-md ${
                    contact.isPrimary
                      ? 'ring-2 ring-emerald-500 border-emerald-200 bg-emerald-50/10'
                      : 'bg-white border border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${meta.bg} ${meta.color}`}
                          >
                            <CategoryIcon className="w-3 h-3" />
                            {contact.category || 'FAMILY'}
                          </span>

                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {contact.relationship}
                          </span>
                        </div>

                        <h3 className="text-xl font-extrabold text-slate-900 mt-1">{contact.name}</h3>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          onClick={() => openEditModal(contact)}
                          className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Contact"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact)}
                          className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white text-brand-600 rounded-lg shadow-xs">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono text-sm font-bold text-slate-800">
                          {contact.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {contact.isPrimary ? (
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                        Primary Contact
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMakePrimary(contact._id)}
                        className="font-semibold text-brand-600 hover:text-brand-800 hover:underline flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5" />
                        Set as Primary
                      </button>
                    )}

                    <Link
                      to="/calls"
                      className="font-bold text-slate-600 hover:text-brand-600 flex items-center gap-1"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Now</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              {/* Category Selector Pills */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Contact Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = category === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleCategoryChange(opt.value)}
                        className={`p-3 rounded-2xl border text-left text-xs font-bold flex items-center gap-2.5 transition-all ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-600' : opt.color}`} />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    category === 'DOCTOR'
                      ? 'e.g. Dr. Rajesh Sharma'
                      : category === 'FAMILY'
                      ? 'e.g. Sarah Miller'
                      : 'e.g. Sister Priya (Nurse)'
                  }
                  className="elder-input text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Role / Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="elder-input text-base bg-white"
                >
                  {RELATIONSHIPS_BY_CATEGORY[category].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210 or +1 (555) 019-2834"
                  className="elder-input text-base font-mono"
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
                  className="text-xs font-bold text-slate-800 cursor-pointer"
                >
                  Set as Primary Contact for Instant Voice Prompts
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
