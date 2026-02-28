import React, { useState, useEffect } from "react";
import axios from "axios";

export default function DoctorDashboard() {
  const [queue, setQueue] = useState([]);
  // For testing, we'll hardcode Doctor ID 1 (Dr. Heart). 
  // In a real app, you'd get this from the logged-in user's context.
  const doctorId = 1; 

  useEffect(() => {
    fetchDoctorQueue();
  }, []);

  const fetchDoctorQueue = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/doctor/${doctorId}/queue`);
      setQueue(res.data.smart_queue);
    } catch (error) {
      console.error("Failed to fetch doctor queue", error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Doctor's Dashboard</h2>
        <button onClick={fetchDoctorQueue} className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold py-2 px-4 rounded-lg transition">
          🔄 Refresh Queue
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="py-4 px-6 font-semibold text-sm">Token #</th>
              <th className="py-4 px-6 font-semibold text-sm">Patient Name</th>
              <th className="py-4 px-6 font-semibold text-sm text-center">Vitals (BP | Temp | Wt | SpO2)</th>
              <th className="py-4 px-6 font-semibold text-sm">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {queue.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-gray-500">No patients waiting. Time for a coffee break! ☕</td>
              </tr>
            ) : (
              queue.map((p) => (
                <tr key={p.appointment_id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-bold">#{p.appointment_id}</td>
                  <td className="py-4 px-6">{p.patient_name}</td>
                  <td className="py-4 px-6 text-center text-sm">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded mx-1">{p.blood_pressure}</span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded mx-1">{p.temperature}°F</span>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded mx-1">{p.weight}kg</span>
                    <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded mx-1">{p.oxygen_level}%</span>
                  </td>
                  <td className="py-4 px-6">
                    <button className="bg-green-500 hover:bg-green-600 text-white py-1 px-4 rounded-md shadow-sm transition">
                      Attend Patient
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}