import React, { useState, useRef } from "react";
import Video from "twilio-video";

export default function TelemedicineTest() {
  const [meetingId, setMeetingId] = useState("");
  const [userId, setUserId] = useState("user-p1");
  const [role, setRole] = useState("PATIENT");

  const [token, setToken] = useState("");
  const [roomName, setRoomName] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [room, setRoom] = useState(null);

  const localRef = useRef(null);
  const remoteRef = useRef(null);

  const joinMeeting = async () => {
    // NOTE: Replace YOUR_NGROK_URL with your actual backend URL
    const res = await fetch("https://arlette-uniconoclastic-juanita.ngrok-free.app/api/meet/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userId}|${role}`
      },
      body: JSON.stringify({ meetingId , userId ,userRole:role })
    });

    const data = await res.json();
    console.log("JOIN RESPONSE:", data);

    if (data.success) {
      setToken(data.token);
      setRoomName(data.roomName);
      setAppointmentId(data.appointmentId);
      alert("Token received. Now click Connect to Twilio");
    } else {
      alert(`Join failed: ${data.message || 'Unknown error'}`);
    }
  };

  const admitPatient = async () => {
    // NOTE: Replace YOUR_NGROK_URL with your actual backend URL
    const res = await fetch(`https://arlette-uniconoclastic-juanita.ngrok-free.app/api/appointment/${appointmentId}/admit`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userId}|${role}`
      }
    });

    const data = await res.json();
    console.log("ADMIT RESPONSE:", data);
    if (data.success) {
      alert("Patient admitted! Now Doctor can connect.");
    } else {
      alert(`Admit failed: ${data.message || 'Unknown error'}`);
    }
  };

  const connectToTwilio = async () => {
    try {
      console.log(token);
      console.log(roomName);
      
      
      const connectedRoom = await Video.connect(token, { name: roomName });
      setRoom(connectedRoom);

      console.log("Connected to Twilio Room:", connectedRoom.sid);

      // Attach local participant's tracks
      connectedRoom.localParticipant.tracks.forEach(pub => {
        // Ensure the previous track elements are cleared
        if (localRef.current) localRef.current.innerHTML = ''; 
        const el = pub.track.attach();
        // Add Tailwind classes to the video/audio elements for styling
        el.className = 'w-full h-full object-cover rounded-lg shadow-md'; 
        localRef.current.appendChild(el);
      });

      // Handle remote participant connection
      connectedRoom.on("participantConnected", (participant) => {
        console.log("Participant joined:", participant.identity);

        // Handle track subscription for the remote participant
        participant.on("trackSubscribed", (track) => {
          // Ensure the previous track elements are cleared
          if (remoteRef.current) remoteRef.current.innerHTML = '';
          const el = track.attach();
          // Add Tailwind classes to the video/audio elements for styling
          el.className = 'w-full h-full object-cover rounded-lg shadow-lg';
          remoteRef.current.appendChild(el);
        });
      });
      
      // Handle remote participant disconnection
      connectedRoom.on('participantDisconnected', (participant) => {
          console.log(`Participant disconnected: ${participant.identity}`);
          // Optional: Remove remote video/audio elements if needed
          if (remoteRef.current) remoteRef.current.innerHTML = '';
      });

      alert("Connected to Twilio. Check webhook → participant-connected event.");
    } catch (err) {
      console.error(err);
      alert("Twilio connect failed. Check if token is valid and room exists.");
    }
  };


//   const connectToTwilio =()=>{
//     Video.connect(token, { name:roomName }).then(room => {
//   console.log('Connected to Room "%s"', room.name);

//   room.participants.forEach(participantConnected);
//   room.on('participantConnected', participantConnected);

//   room.on('participantDisconnected', participantDisconnected);
//   room.once('disconnected', error => room.participants.forEach(participantDisconnected));
// });




//   }




  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">🩺 Telemedicine Minimal Test</h1>

      {/* --- Controls Section --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2 mb-4 text-gray-700">User & Meeting Setup</h2>

        {/* Role Selection & UserID Input */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-8">
          <div className="flex items-center space-x-2">
            <label className="text-gray-600 font-medium">User Role:</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PATIENT">PATIENT</option>
              <option value="FRONTOFFICE">FRONTOFFICE</option>
              <option value="DOCTOR">DOCTOR</option>
            </select>
          </div>
          <input
            placeholder="UserID (e.g., user-p1, user-d1)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg w-full sm:w-64 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Meeting ID Input */}
        <input
          placeholder="Meeting ID (e.g., meeting-123)"
          value={meetingId}
          onChange={(e) => setMeetingId(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg w-full sm:w-80 focus:ring-blue-500 focus:border-blue-500"
        />

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={joinMeeting}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-150 shadow-md"
          >
            1. Join Meeting (Get Token)
          </button>

          {role === "FRONTOFFICE" && appointmentId && (
            <button
              onClick={admitPatient}
              className="px-4 py-2 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition duration-150 shadow-md"
            >
              2. Admit Patient (FRONTOFFICE)
            </button>
          )}

          <button
            onClick={connectToTwilio}
            disabled={!token}
            className={`px-4 py-2 font-medium rounded-lg transition duration-150 shadow-md ${
              token
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
            }`}
          >
            3. Connect to Twilio Room
          </button>
        </div>
        
        {/* Status Info */}
        {(token || roomName) && (
            <div className="pt-4 text-sm text-gray-500">
                <p><strong>Token Status:</strong> {token ? 'Received' : 'Pending'}</p>
                <p><strong>Room Name:</strong> {roomName || 'N/A'}</p>
            </div>
        )}
      </div>

      {/* --- Video Feeds Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Local Video Card (Self-View) */}
        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-xl">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">👤 Local Video (Self)</h3>
          <div
            ref={localRef}
            className="relative w-full aspect-video bg-gray-200 border-2 border-blue-500 rounded-lg overflow-hidden"
          >
            {/* Twilio video track will be appended here */}
          </div>
        </div>

        {/* Remote Video Card (Other Participant) */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-xl">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">🌎 Remote Video (Participant)</h3>
          <div
            ref={remoteRef}
            className="relative w-full aspect-video bg-gray-200 border-2 border-green-500 rounded-lg overflow-hidden"
          >
            {/* Twilio video track will be appended here */}
            {!room && <p className="absolute inset-0 flex items-center justify-center text-gray-500">
                Connecting... or Waiting for remote participant.
            </p>}
          </div>
        </div>
      </div>
    </div>
  );
}
