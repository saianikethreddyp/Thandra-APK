import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { LocalNotifications } from '@capacitor/local-notifications';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// --- Icons ---
const LeftArrow = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const LocationPin = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const CheckIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CarIcon = () => (
  <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ color: '#64748b' }}>
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5C5.84 5 5.28 5.42 5.08 6.01L3 12V20C3 20.55 3.45 21 4 21H5C5.55 21 6 20.55 6 20V19H18V20C18 20.55 18.45 21 19 21H20C20.55 21 21 20.55 21 20V12L18.92 6.01ZM6.85 7H17.14L18.22 10H5.78L6.85 7ZM19 17H5V12H19V17Z" />
    <circle cx="7.5" cy="14.5" r="1.5" fill="white" />
    <circle cx="16.5" cy="14.5" r="1.5" fill="white" />
  </svg>
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BRANCHES = [
  { id: 'thandra_madhapur', name: 'Madhapur', area: 'Hitech City, Hyderabad' },
  { id: 'thandra_dsnr', name: 'Dilsukhnagar', area: 'Malakpet Road, Hyderabad' },
  { id: 'thandra_bnreddy', name: 'BN Reddy', area: 'Vanasthalipuram, Hyderabad' },
  { id: 'thandra_jntu', name: 'JNTU', area: 'Kukatpally, Hyderabad' },
];

const ONBOARDING_STEPS = [
  {
    title: "Request a Ride",
    desc: "Request a ride and get picked up by a nearby community driver",
    image: "/onboarding1.png"
  },
  {
    title: "Confirm Your Driver",
    desc: "Huge network of drivers helps you find comfortable, safe and cheap ride",
    image: "/onboarding2.png"
  },
  {
    title: "Track your ride",
    desc: "Know your driver in advance and be able to view current location in real time",
    image: "/onboarding3.png"
  }
];



function App() {
  const [loadingApp, setLoadingApp] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const [step, setStep] = useState('branch');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', mobile: '', email: '',
    startDate: '', endDate: '',
    carMake: '', carModel: '', plateNumber: '',
    fuelType: 'Petrol', transmission: 'Manual',
    licenseNumber: '', aadhaarNumber: ''
  });

  // --- App Initialization ---
  useEffect(() => {
    const initApp = async () => {
      // Show splash for 2.5s
      await new Promise(resolve => setTimeout(resolve, 2500));
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide().catch(() => { });

        // Request notification permission
        try {
          const notifPerm = await LocalNotifications.requestPermissions();
          console.log('Notification permission:', notifPerm.display);
        } catch (e) {
          console.log('Notification permission error:', e);
        }
      }
      setLoadingApp(false);
    };
    initApp();
  }, []);

  const handleNextOnboarding = () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep(prev => prev + 1);
    } else {
      setShowOnboarding(false);
    }
  };

  const handleSkipOnboarding = () => {
    setShowOnboarding(false);
  };

  // --- Contact Sync ---
  const fetchContacts = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Contacts.getContacts({ projection: { name: true, phones: true } });
        const formatted = result.contacts.map(c => ({
          name: c.name?.display || c.name?.given || 'Unknown',
          phone: c.phones?.[0]?.number || '',
          label: c.phones?.[0]?.label || 'mobile',
        })).filter(c => c.phone);
        setContacts(formatted);
        return formatted;
      } catch (err) { return []; }
    }
    return [];
  };

  const handleBranchSelect = async (branch) => {
    setSelectedBranch(branch);
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await Contacts.requestPermissions();
        if (perm.contacts === 'granted') fetchContacts();
      } catch (e) { console.error(e); }
    }
    setStep('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalContacts = contacts;
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

  // --- 1. Initial Loading Splash ---
  if (loadingApp) {
    return (
      <div className="splash-screen">
        <div style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-1px' }}>Thandra</div>
        <div style={{ fontSize: '16px', fontWeight: '500', marginTop: '8px', opacity: 0.9 }}>Self Drive</div>
      </div>
    );
  }

  // --- 2. Onboarding Screens ---
  if (showOnboarding) {
    const currentData = ONBOARDING_STEPS[onboardingStep];
    return (
      <div className="app-container onboarding-container">
        <div className="skip-btn" onClick={handleSkipOnboarding}>Skip</div>

        <motion.div
          key={onboardingStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="onboarding-content"
        >
          <div className="onboarding-image">
            <img src={currentData.image} alt={currentData.title} />
          </div>
          <h2>{currentData.title}</h2>
          <p>{currentData.desc}</p>
        </motion.div>

        <div className="onboarding-footer">
          <div className="dots">
            {ONBOARDING_STEPS.map((_, i) => (
              <div key={i} className={`dot ${i === onboardingStep ? 'active' : ''}`} />
            ))}
          </div>
          <button className="btn-primary" onClick={handleNextOnboarding}>
            {onboardingStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    );
  }

  // --- 3. Main App Flow ---
  return (
    <div className="app-container">
      <AnimatePresence mode='wait'>

        {/* BRANCH SELECTION */}
        {step === 'branch' && (
          <motion.div
            key="branch"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="branch-list"
          >
            <div style={{ padding: '24px 16px 8px 16px' }}>
              <h1 style={{ color: '#111827' }}>Book a Ride</h1>
              <p className="subtitle">Choose a pickup location nearby</p>
            </div>

            {BRANCHES.map((branch) => (
              <motion.div
                key={branch.id}
                className="branch-card"
                whileTap={{ scale: 0.98, backgroundColor: '#eff6ff' }}
                onClick={() => handleBranchSelect(branch)}
              >
                <div className="branch-icon"><LocationPin /></div>
                <div className="branch-info">
                  <div className="branch-name">{branch.name}</div>
                  <div className="branch-area">{branch.area}</div>
                </div>
                <div style={{ color: '#cbd5e1' }}>➜</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* BOOKING FORM */}
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="slide-panel"
          >
            <div className="form-container">
              <button className="back-btn" onClick={() => setStep('branch')}>
                <LeftArrow /> Back
              </button>

              <div className="form-header-title">Thandra Self Drive</div>

              <form onSubmit={handleSubmit}>
                <div className="section-title">Driver Details</div>

                <div className="input-row">
                  <div className="input-group">
                    <label>First Name</label>
                    <input className="modern-input" name="firstName" placeholder="John" onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                  </div>
                  <div className="input-group">
                    <label>Last Name</label>
                    <input className="modern-input" name="lastName" placeholder="Doe" onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
                  </div>
                </div>

                <div className="input-group">
                  <label>Mobile Number</label>
                  <input className="modern-input" name="mobile" type="tel" placeholder="+1 234 567 8900" onChange={e => setFormData({ ...formData, mobile: e.target.value })} required />
                </div>

                <div className="input-group">
                  <label>Email Address</label>
                  <input className="modern-input" name="email" type="email" placeholder="john@example.com" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>

                <div className="input-group">
                  <label>Driving License Number</label>
                  <input className="modern-input" name="licenseNumber" placeholder="DL-1234567890123" onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })} required />
                </div>

                <div className="input-group">
                  <label>Aadhaar Number (Optional)</label>
                  <input className="modern-input" name="aadhaarNumber" placeholder="1234 5678 9012" onChange={e => setFormData({ ...formData, aadhaarNumber: e.target.value })} />
                </div>

                <div className="section-title">Vehicle Preference</div>



                <div className="input-row">
                  <div className="input-group">
                    <label>Start Date</label>
                    <input
                      className="modern-input"
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>End Date</label>
                    <input
                      className="modern-input"
                      name="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>Car Make</label>
                    <input className="modern-input" name="carMake" placeholder="Toyota" onChange={e => setFormData({ ...formData, carMake: e.target.value })} required />
                  </div>
                  <div className="input-group">
                    <label>Car Model</label>
                    <input className="modern-input" name="carModel" placeholder="Camry" onChange={e => setFormData({ ...formData, carModel: e.target.value })} required />
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : 'Confirm Request'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* SUCCESS SCREEN */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="success-container"
          >
            {/* The Blue Circle with Tick */}
            <div className="success-circle">
              <CheckIcon />
            </div>

            <div className="success-title">Booking Confirmed!</div>
            <div className="success-desc">Your car awaits you.</div>
            <div className="success-desc">Have a safe and pleasant ride.</div>

            <div className="separator-line"></div>

            <div className="car-illustration">
              <CarIcon />
            </div>

            <button
              className="btn-primary"
              onClick={() => { setStep('branch'); setFormData({}); }}
              style={{ marginTop: 'auto', marginBottom: '32px' }}
            >
              Back to Home
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export default App;
