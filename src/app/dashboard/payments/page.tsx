'use client';
import { useState, useEffect } from 'react';

export default function PaymentsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  // Cash Payment States
  const [showCashForm, setShowCashForm] = useState(false);
  const [cashData, setCashData] = useState({ amount: '', remarks: '' });
  const [recordingCash, setRecordingCash] = useState(false);

  // Reset UI states when user changes to prevent stale data
  useEffect(() => {
    setPaymentUrl('');
    setAmount('');
    setCashData({ amount: '', remarks: '' });
  }, [selectedUser]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/get-users');
        const data = await res.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  const generatePaymentLink = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      return alert("Please select a user and enter a valid amount");
    }
    
    setLoading(true);
    setPaymentUrl('');
    
    try {
      const res = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          userName: selectedUser.name,
          userEmail: selectedUser.email,
          userMobile: selectedUser.mobile,
          referenceId: selectedUser.id
        }),
      });
      
      const data = await res.json();
      if (data.url) {
        setPaymentUrl(data.url);
      } else {
        throw new Error(data.error || "Failed to generate link");
      }
    } catch (err) {
      alert("Failed to generate link: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const recordCashPayment = async () => {
    if (!selectedUser || !cashData.amount || parseFloat(cashData.amount) <= 0) {
      return alert("Please select a user and enter a valid cash amount");
    }
    
    setRecordingCash(true);
    try {
      const res = await fetch('/api/payments/record-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          userName: selectedUser.name,
          amount: cashData.amount,
          remarks: cashData.remarks
        }),
      });
      
      if (res.ok) {
        alert("Cash payment recorded successfully!");
        setShowCashForm(false);
        setCashData({ amount: '', remarks: '' });
      } else {
        throw new Error("Server error");
      }
    } catch (err) {
      alert("Failed to record cash payment");
    } finally {
      setRecordingCash(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Payments & Subscriptions</h1>
      
      {/* User Selection */}
      <div className="bg-white p-6 rounded shadow border max-w-xl space-y-4">
        <label className="block text-sm font-medium text-slate-700">Select User</label>
        <select 
          className="w-full border p-2 rounded" 
          value={selectedUser?.id || ''}
          onChange={(e) => setSelectedUser(users.find(u => u.id === e.target.value))}
        >
          <option value="">Select a user...</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.mobile || 'No Phone'}
            </option>
          ))}
        </select>
        
        {selectedUser && (
          <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
            <p><strong>Name:</strong> {selectedUser.name}</p>
            <p><strong>Phone:</strong> {selectedUser.mobile || 'Not provided'}</p>
          </div>
        )}
      </div>

      {/* Razorpay Section */}
      <div className="bg-white p-6 rounded shadow border max-w-xl space-y-4">
        <h2 className="font-semibold">Razorpay Link</h2>
        <input 
          type="number" 
          placeholder="Amount (INR)" 
          className="w-full border p-2 rounded" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)} 
        />
        <button 
          onClick={generatePaymentLink} 
          disabled={loading}
          className="w-full bg-slate-900 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Razorpay URL'}
        </button>
        
        {paymentUrl && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
            <p className="font-bold text-green-800">Share this link:</p>
            <a 
              href={paymentUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="text-blue-600 underline break-all"
            >
              {paymentUrl}
            </a>
          </div>
        )}
      </div>

      {/* Cash Payment Section */}
      <div className="bg-white p-6 rounded shadow border max-w-xl space-y-4">
        <h2 className="font-semibold">Record Manual Cash Payment</h2>
        <button 
          onClick={() => setShowCashForm(!showCashForm)} 
          className="w-full bg-emerald-600 text-white py-2 rounded"
        >
          {showCashForm ? "Hide Cash Entry Form" : "Open Cash Entry Form"}
        </button>
        
        {showCashForm && (
          <div className="space-y-3 pt-4 border-t">
            <input 
              type="number" 
              placeholder="Amount" 
              className="w-full border p-2 rounded" 
              value={cashData.amount}
              onChange={(e) => setCashData({...cashData, amount: e.target.value})} 
            />
            <input 
              type="text" 
              placeholder="Remarks" 
              className="w-full border p-2 rounded" 
              value={cashData.remarks}
              onChange={(e) => setCashData({...cashData, remarks: e.target.value})} 
            />
            <button 
              onClick={recordCashPayment} 
              disabled={recordingCash}
              className="w-full bg-emerald-700 text-white py-2 rounded disabled:opacity-50"
            >
              {recordingCash ? 'Saving...' : 'Save Cash Entry'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}