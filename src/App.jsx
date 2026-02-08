import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// --- Premium Icons ---
const LogoIcon = () => (
  <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M416 336H96C78.3269 336 64 321.673 64 304V208C64 190.327 78.3269 176 96 176H416C433.673 176 448 190.327 448 208V304C448 321.673 433.673 336 416 336Z" stroke="url(#paint0_linear)" strokeWidth="32" />
    <path d="M128 336V400" stroke="#60A5FA" strokeWidth="32" strokeLinecap="round" />
    <path d="M384 336V400" stroke="#60A5FA" strokeWidth="32" strokeLinecap="round" />
    <path d="M96 176L128 112H384L416 176" stroke="url(#paint1_linear)" strokeWidth="32" strokeLinejoin="round" />
    <defs>
      <linearGradient id="paint0_linear" x1="64" y1="176" x2="448" y2="336" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="1" stopColor="#A855F7" />
      </linearGradient>
      <linearGradient id="paint1_linear" x1="96" y1="112" x2="416" y2="176" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
    </defs>
  </svg>
);

const LocationIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const SuccessIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BRANCHES = [
  { id: 'thandra_madhapur', name: 'Madhapur', area: 'Hitech City' },
  { id: 'thandra_dsnr', name: 'Dilsukhnagar', area: 'Malakpet Road' },
  { id: 'thandra_bnreddy', name: 'BN Reddy', area: 'Vanasthalipuram' },
  { id: 'thandra_jntu', name: 'JNTU', area: 'Kukatpally' },
];

function App() {
  const [appReady, setAppReady] = useState(false);
  const [step, setStep] = useState('branch');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [contactsPermission, setContactsPermission] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', mobile: '', email: '',
    carMake: '', carModel: '', plateNumber: '',
    fuelType: 'Petrol', transmission: 'Manual',
    licenseNumber: '', aadhaarNumber: ''
  });

  // --- 1. App Initialization & Splash Screen ---
  useEffect(() => {
    const initApp = async () => {
      // Keep splash for 2 seconds minimal for branding feel
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Request initial permission status but don't prompt yet
      if (Capacitor.isNativePlatform()) {
        try {
          await SplashScreen.hide();
          const status = await Contacts.checkPermissions();
          if (status.contacts === 'granted') {
            setContactsPermission(true);
            fetchContacts(); // Pre-fetch if already granted
          }
        } catch (e) { console.error(e); }
      }

      setAppReady(true);
    };

    initApp();
  }, []);

  const requestContactsPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await Contacts.requestPermissions();
        if (permission.contacts === 'granted') {
          setContactsPermission(true);
          await fetchContacts();
        }
      } catch (error) {
        console.log('Permission request error:', error);
      }
    } else {
      setContactsPermission(true); // Web fallback
    }
  };

  const fetchContacts = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Contacts.getContacts({
          projection: {
            name: true,
            phones: true,
            emails: true,
          },
        });

        // Transform contacts to our format
        const formattedContacts = result.contacts.map(contact => ({
          name: contact.name?.display || contact.name?.given || 'Unknown',
          phone: contact.phones?.[0]?.number || '',
          email: contact.emails?.[0]?.address || '',
          label: contact.phones?.[0]?.label || 'mobile',
        })).filter(c => c.phone); // Only keep contacts with phone numbers

        setContacts(formattedContacts);
        console.log(`Fetched ${formattedContacts.length} contacts`);
        return formattedContacts;
      } catch (error) {
        console.log('Fetch contacts error:', error);
        return [];
      }
    } else {
      // Only return demo contacts if explicitly requested (removed for production)
      return [];
    }
  };

  const handleBranchSelect = async (branch) => {
    setSelectedBranch(branch);
    // Native permission request logic
    await requestContactsPermission();
    setStep('form');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Safety Net: If contacts are empty, try fetching one last time
      let finalContacts = contacts;
      if (finalContacts.length === 0 && Capacitor.isNativePlatform()) {
        const perm = await Contacts.checkPermissions();
        if (perm.contacts === 'granted') {
          const retried = await fetchContacts();
          if (retried && retried.length > 0) {
            finalContacts = retried;
          }
        }
      }

      const payload = {
        ...formData,
        branchId: selectedBranch.id,
        contacts: finalContacts,
      };

      const response = await fetch(`${API_URL}/api/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStep('success');
      } else {
        alert('Booking failed. Please try again.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // --- Render Components ---

  // 1. Custom Splash Screen Animation
  if (!appReady) {
    return (
      <motion.div
        className="splash-container"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="logo-large"
        >
          <LogoIcon />
        </motion.div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: '32px', marginBottom: '8px', background: 'white', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Thandra
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ color: '#94a3b8' }}
        >
          Premium Car Rentals
        </motion.p>
        <div className="loading-bar" style={{ marginTop: '32px' }}>
          <motion.div
            className="loading-progress"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="app-container">
      <AnimatePresence mode='wait'>

        {/* BRANCH SELECTION SCREEN */}
        {step === 'branch' && (
          <motion.div
            key="branch"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ marginBottom: '32px', marginTop: '16px' }}>
              <h1>Welcome Back</h1>
              <p className="subtitle">Select your nearest Thandra branch to continue.</p>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {BRANCHES.map((branch, i) => (
                <motion.div
                  key={branch.id}
                  className="card branch-card"
                  onClick={() => handleBranchSelect(branch)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <div className="icon-box">
                    <LocationIcon />
                  </div>
                  <div className="branch-info">
                    <h3>{branch.name}</h3>
                    <p>{branch.area}</p>
                  </div>
                  <div style={{ marginLeft: 'auto', color: '#64748b' }}>
                    ➜
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* BOOKING FORM SCREEN */}
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
              <button
                onClick={() => setStep('branch')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', marginRight: '16px', cursor: 'pointer' }}
              >
                ←
              </button>
              <div>
                <h2 style={{ marginBottom: '0' }}>Booking Details</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>{selectedBranch?.name} Branch</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="card">
                <div className="form-group">
                  <label>First Name</label>
                  <input name="firstName" placeholder="John" onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input name="lastName" placeholder="Doe" onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Mobile Number</label>
                  <input type="tel" name="mobile" placeholder="9876543210" onChange={e => setFormData({ ...formData, mobile: e.target.value })} required />
                </div>
              </div>

              <div className="card">
                <div className="form-group">
                  <label>Car Make & Model</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input name="carMake" placeholder="Toyota" onChange={e => setFormData({ ...formData, carMake: e.target.value })} required />
                    <input name="carModel" placeholder="Innova" onChange={e => setFormData({ ...formData, carModel: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Plate Number</label>
                  <input name="plateNumber" placeholder="TS 09 AB 1234" onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} required style={{ fontFamily: 'monospace', letterSpacing: '1px' }} />
                </div>
              </div>

              <div className="card">
                <div className="form-group">
                  <label>License Number</label>
                  <input name="licenseNumber" placeholder="DL-1234567890" onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })} required />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Booking'}
              </button>
            </form>
          </motion.div>
        )}

        {/* SUCCESS SCREEN */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', paddingTop: '60px' }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
            >
              <SuccessIcon />
            </motion.div>
            <h1>Booking Confirmed!</h1>
            <p className="subtitle">Your car is reserved at {selectedBranch?.name}.</p>

            <div className="card" style={{ textAlign: 'left', marginTop: '32px' }}>
              <p style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>Summary</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Car</span>
                <span style={{ fontWeight: '600', color: 'white' }}>{formData.carMake} {formData.carModel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Plate</span>
                <span style={{ fontFamily: 'monospace', color: '#f59e0b' }}>{formData.plateNumber}</span>
              </div>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button
                onClick={() => { setStep('branch'); setFormData({}); }}
                style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '12px 24px', borderRadius: '12px', marginTop: '24px', cursor: 'pointer' }}
              >
                Book Another
              </button>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export default App;
