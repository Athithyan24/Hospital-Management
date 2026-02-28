import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export default function TriageStation() {
  const [queue, setQueue] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vitals, setVitals] = useState({
    blood_pressure: "",
    temperature: "",
    weight: "",
    oxygen_level: "",
  });

  // Fetch the pending patients when the component loads
  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await axios.get(`${API_URL}/triage/queue`);
      setQueue(res.data);
    } catch (error) {
      console.error("Failed to fetch triage queue", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Parse the string values into correct types for the Backend
      const payload = {
        blood_pressure: vitals.blood_pressure,
        temperature: parseFloat(vitals.temperature),
        weight: parseFloat(vitals.weight),
        oxygen_level: parseInt(vitals.oxygen_level, 10),
      };

      // 2. POST to the vitals endpoint
      await axios.post(
        `${API_URL}/triage/vitals/${selectedPatient.appointment_id}`,
        payload
      );

      alert("Vitals saved successfully! Patient forwarded to doctor.");
      
      // Reset State
      setSelectedPatient(null);
      setVitals({
        blood_pressure: "",
        temperature: "",
        weight: "",
        oxygen_level: "",
      });
      
      fetchQueue(); // Refresh the table list
    } catch (error) {
      console.error("Error saving vitals", error);
      alert("Failed to save vitals. Please check the backend connection.");
    }
  };

  return (
    <div className="p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Nurse Triage Station</h2>
          <p className="text-gray-500 italic">Capture patient vitals before doctor consultation</p>
        </div>
        <button
          onClick={fetchQueue}
          className="flex items-center gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold py-2 px-6 rounded-lg transition-all active:scale-95"
        >
          🔄 Refresh Queue
        </button>
      </div>

      {/* QUEUE TABLE */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="py-4 px-6 font-semibold text-sm">Token #</th>
              <th className="py-4 px-6 font-semibold text-sm">Patient Name</th>
              <th className="py-4 px-6 font-semibold text-sm">Current Vitals</th>
              <th className="py-4 px-6 font-semibold text-sm">Status</th>
              <th className="py-4 px-6 font-semibold text-sm text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {queue.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-gray-500 font-medium">
                  No patients waiting for triage at this time.
                </td>
              </tr>
            ) : (
              queue.map((p) => (
                <tr key={p.appointment_id} className="hover:bg-blue-50/30 transition">
                  <td className="py-4 px-6 font-bold text-gray-700">#{p.appointment_id}</td>
                  <td className="py-4 px-6 font-semibold text-gray-800">{p.patient_name}</td>
                  <td className="py-4 px-6">
                    {p.blood_pressure ? (
                      <div className="text-xs space-y-1">
                        <p><span className="text-gray-400">BP:</span> {p.blood_pressure}</p>
                        <p><span className="text-gray-400">SpO2:</span> {p.oxygen_level}%</p>
                      </div>
                    ) : (
                      <span className="text-gray-300 italic text-sm">Not recorded</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        p.vitals_taken
                          ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                          : "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300"
                      }`}
                    >
                      {p.vitals_taken ? "Completed" : "Pending Vitals"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      className={`${
                        p.vitals_taken 
                        ? "bg-gray-400 cursor-not-allowed" 
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                      } text-white py-2 px-5 rounded-lg shadow-lg transition active:scale-95 text-sm font-bold`}
                      onClick={() => setSelectedPatient(p)}
                      disabled={p.vitals_taken}
                    >
                      {p.vitals_taken ? "View Vitals" : "Capture Vitals"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* VITALS MODAL */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h5 className="text-xl font-bold">Capture Vitals</h5>
                <p className="text-slate-400 text-xs">{selectedPatient.patient_name} | Token #{selectedPatient.appointment_id}</p>
              </div>
              <button
                className="text-gray-400 hover:text-white text-3xl font-light transition"
                onClick={() => setSelectedPatient(null)}
              >
                &times;
              </button>
            </div>
            
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Blood Pressure (mmHg)</label>
                    <input
                      type="text"
                      placeholder="e.g., 120/80"
                      required
                      className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-blue-500 transition font-mono"
                      value={vitals.blood_pressure}
                      onChange={(e) => setVitals({ ...vitals, blood_pressure: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temp (°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="98.6"
                      required
                      className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-blue-500 transition"
                      value={vitals.temperature}
                      onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SpO2 (%)</label>
                    <input
                      type="number"
                      placeholder="98"
                      required
                      className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-blue-500 transition"
                      value={vitals.oxygen_level}
                      onChange={(e) => setVitals({ ...vitals, oxygen_level: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="70.5"
                      required
                      className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-blue-500 transition"
                      value={vitals.weight}
                      onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-black text-white font-bold py-4 rounded-xl transition shadow-xl active:scale-95"
                  >
                    🚀 Save & Forward to Doctor
                  </button>
                  <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-tighter">
                    Forwarding will move this patient to the doctor's active console
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}