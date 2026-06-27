'use client';
import { useState, useEffect } from 'react';
// Added Firebase imports for the real-time payment history table
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Ensure this points to your firebase config file

export default function PaymentsPage() {
  // ==========================================
  // STATE MANAGEMENT: USERS & RAZORPAY LINKS
  // ==========================================
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  // ==========================================
  // STATE MANAGEMENT: CASH PAYMENTS
  // ==========================================
  const [showCashForm, setShowCashForm] = useState(false);
  const [cashData, setCashData] = useState({ amount: '', remarks: '' });
  const [recordingCash, setRecordingCash] = useState(false);

  // ==========================================
  // STATE MANAGEMENT: PAYMENT HISTORY TABLE
  // ==========================================
  const [payments, setPayments] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Adjust this number to show more/less rows per page

  // ==========================================
  // EFFECT: RESET UI ON USER CHANGE
  // ==========================================
  // Reset UI states when user changes to prevent stale data
  useEffect(() => {
    setPaymentUrl('');
    setAmount('');
    setCashData({ amount: '', remarks: '' });
  }, [selectedUser]);

  // ==========================================
  // EFFECT: FETCH USERS & PAYMENT HISTORY
  // ==========================================
  useEffect(() => {
    // 1. Fetch users list for the dropdown
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

    // 2. Set up real-time listener for the Firestore payments collection
    const q = query(collection(db, 'payments'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPayments(paymentsData);
    });

    // Cleanup the listener when the component unmounts
    return () => unsub();
  }, []);

  // ==========================================
  // CALCULATIONS: PAGINATION LOGIC
  // ==========================================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = payments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(payments.length / itemsPerPage);

  // ==========================================
  // HANDLER: GENERATE RAZORPAY LINK
  // ==========================================
  const generatePaymentLink = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      return alert("Please select a user and enter a valid amount");
    }
    
    setLoading(true);
    setPaymentUrl('');
    
    // Create a unique ID using Phone + Timestamp to prevent "already exists" errors
    const uniqueReferenceId = `${selectedUser.mobile || 'no-phone'}_${Date.now()}`;
    
    try {
      const res = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          userName: selectedUser.name,
          userEmail: selectedUser.email,
          userMobile: selectedUser.mobile,
          referenceId: uniqueReferenceId 
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

  // ==========================================
  // HANDLER: RECORD MANUAL CASH PAYMENT
  // ==========================================
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

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Payments & Subscriptions</h1>
      
      {/* ----------------------------- */}
      {/* User Selection Block          */}
      {/* ----------------------------- */}
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

      {/* ----------------------------- */}
      {/* Razorpay Link Generator Block */}
      {/* ----------------------------- */}
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

      {/* ----------------------------- */}
      {/* Manual Cash Payment Block     */}
      {/* ----------------------------- */}
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

      {/* ----------------------------- */}
      {/* Paginated Payment History     */}
      {/* ----------------------------- */}
      <div className="bg-white p-6 rounded shadow border max-w-4xl space-y-4">
        <h2 className="font-semibold">Payment History</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="p-3 font-medium text-slate-600">User / Phone</th>
                <th className="p-3 font-medium text-slate-600">Amount</th>
                <th className="p-3 font-medium text-slate-600">Status</th>
                <th className="p-3 font-medium text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-3 truncate max-w-[150px] font-mono text-xs">{p.id}</td>
                    <td className="p-3 font-medium text-slate-800">
                      ₹{p.amount ? Number(p.amount).toFixed(2) : '0.00'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        p.status === 'captured' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status || 'unknown'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {payments.length > itemsPerPage && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-slate-600">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, payments.length)} of {payments.length} entries
            </span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1 border rounded text-sm hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              <button 
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1 border rounded text-sm hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}