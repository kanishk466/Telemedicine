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

  const BACKEND_URL = "https://arlette-uniconoclastic-juanita.ngrok-free.app";

  // -------------------------------
  // 1) JOIN MEETING: Get Token
  // -------------------------------
  const joinMeeting = async () => {
    const res = await fetch(`${BACKEND_URL}/api/meet/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userId}|${role}`
      },
      body: JSON.stringify({ meetingId })
    });

    const data = await res.json();
    console.log("JOIN RESPONSE:", data);

    if (data.success) {
      setToken(data.token);
      setRoomName(data.roomName);
      setAppointmentId(data.appointmentId);
      alert("Token received. Click 'Connect to Twilio Room'");
    } else {
      alert(`Join failed: ${data.message || "Unknown error"}`);
    }
  };

  // -------------------------------
  // 2) CONNECT TO TWILIO ROOM
  // -------------------------------
  const connectToTwilio = async () => {
    try {
      console.log("TOKEN USED:", token);
      console.log("ROOM:", roomName);

      const connectedRoom = await Video.connect(token, {
        name: roomName,
        audio: true,
        video: { width: 640 }
      });

      setRoom(connectedRoom);
      console.log("Connected to Room:", connectedRoom.name);

      // Clear previous local video
      if (localRef.current) localRef.current.innerHTML = "";

      // Attach local tracks
      connectedRoom.localParticipant.tracks.forEach(pub => {
        if (pub.track) {
          const el = pub.track.attach();
          el.className = "w-full h-full object-cover rounded-lg shadow-md";
          localRef.current.appendChild(el);
        }
      });

      // Attach already-connected remote participants (doctor or patient)
      connectedRoom.participants.forEach((participant) => {
        console.log("Already present:", participant.identity);
        handleParticipantConnected(participant);
      });

      // When a participant joins
      connectedRoom.on("participantConnected", handleParticipantConnected);

      // When a participant leaves
      connectedRoom.on("participantDisconnected", handleParticipantDisconnected);

      alert("Connected to Twilio Successfully.");
    } catch (err) {
      console.error("Twilio Connect Error:", err);
      alert("Twilio connect failed. Check token, roomName, and signature.");
    }
  };

  // -------------------------------
  // Remote Participant Handler
  // -------------------------------
  const handleParticipantConnected = (participant) => {
    console.log("Participant Connected:", participant.identity);

    participant.tracks.forEach(publication => {
      if (publication.isSubscribed) {
        attachRemoteTrack(publication.track);
      }
    });

    participant.on("trackSubscribed", attachRemoteTrack);
    participant.on("trackUnsubscribed", detachRemoteTrack);
  };

  const handleParticipantDisconnected = (participant) => {
    console.log("Participant Disconnected:", participant.identity);
    if (remoteRef.current) remoteRef.current.innerHTML = "";
  };

  const attachRemoteTrack = (track) => {
    if (remoteRef.current) {
      const el = track.attach();
      el.className = "w-full h-full object-cover rounded-lg shadow-lg";
      remoteRef.current.appendChild(el);
    }
  };

  const detachRemoteTrack = (track) => {
    track.detach().forEach(element => element.remove());
  };

  // -------------------------------
  // DISCONNECT ROOM OPTIONAL
  // -------------------------------
  const disconnectRoom = () => {
    if (room) {
      room.disconnect();
      setRoom(null);
      if (remoteRef.current) remoteRef.current.innerHTML = "";
      if (localRef.current) localRef.current.innerHTML = "";
      alert("Disconnected from room.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">🩺 Telemedicine Test (Doctor + Patient Only)</h1>

      {/* Controls */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2 mb-4 text-gray-700">Setup</h2>

        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="p-2 border rounded-lg"
          >
            <option value="PATIENT">PATIENT</option>
            <option value="DOCTOR">DOCTOR</option>
          </select>

          <input
            placeholder="user-p1 OR user-d1"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="p-2 border rounded-lg w-full"
          />

          <input
            placeholder="Meeting ID"
            value={meetingId}
            onChange={e => setMeetingId(e.target.value)}
            className="p-2 border rounded-lg w-full"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          <button onClick={joinMeeting} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            1. Join Meeting (Get Token)
          </button>

          <button
            onClick={connectToTwilio}
            disabled={!token}
            className={`px-4 py-2 rounded-lg ${
              token ? "bg-green-600 text-white" : "bg-gray-400 text-gray-700"
            }`}
          >
            2. Connect to Twilio Room
          </button>

          {room && (
            <button onClick={disconnectRoom} className="px-4 py-2 bg-red-500 text-white rounded-lg">
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Video Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-4 rounded-xl shadow-xl">
          <h3 className="text-lg font-semibold mb-2">Local Video</h3>
          <div ref={localRef} className="relative w-full aspect-video bg-gray-200 rounded-lg"></div>
        </div>

        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-xl">
          <h3 className="text-lg font-semibold mb-2">Remote Video</h3>
          <div ref={remoteRef} className="relative w-full aspect-video bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}
