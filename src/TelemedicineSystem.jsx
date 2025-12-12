// import React, { useState, useRef } from "react";
// import Video from "twilio-video";

// export default function TelemedicineTest() {
//   const [meetingId, setMeetingId] = useState("");
//   const [userId, setUserId] = useState("user-p1");
//   const [role, setRole] = useState("PATIENT");

//   const [token, setToken] = useState("");
//   const [roomName, setRoomName] = useState("");
//   const [appointmentId, setAppointmentId] = useState("");
//   const [room, setRoom] = useState(null);

//   const localRef = useRef(null);
//   const remoteRef = useRef(null);

//   const BACKEND_URL = "https://arlette-uniconoclastic-juanita.ngrok-free.app";

//   // -------------------------------
//   // 1) JOIN MEETING: Get Token
//   // -------------------------------
//   const joinMeeting = async () => {
//     const res = await fetch(`${BACKEND_URL}/api/meet/join`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${userId}|${role}`
//       },
//       body: JSON.stringify({ meetingId , userId , role })
//     });

//     const data = await res.json();
//     console.log("JOIN RESPONSE:", data);

//     if (data.success) {
//       setToken(data.token);
//       setRoomName(data.roomName);
//       setAppointmentId(data.appointmentId);
//       alert("Token received. Click 'Connect to Twilio Room'");
//     } else {
//       alert(`Join failed: ${data.message || "Unknown error"}`);
//     }
//   };

//   // -------------------------------
//   // 2) CONNECT TO TWILIO ROOM
//   // -------------------------------
//   const connectToTwilio = async () => {
//     try {
//       console.log("TOKEN USED:", token);
//       console.log("ROOM:", roomName);

//       const connectedRoom = await Video.connect(token, {
//         name: roomName,
//         audio: true,
//         video: { width: 640 }
//       });

//       setRoom(connectedRoom);
//       console.log("Connected to Room:", connectedRoom.name);

//       // Clear previous local video
//       if (localRef.current) localRef.current.innerHTML = "";

//       // Attach local tracks
//       connectedRoom.localParticipant.tracks.forEach(pub => {
//         if (pub.track) {
//           const el = pub.track.attach();
//           el.className = "w-full h-full object-cover rounded-lg shadow-md";
//           localRef.current.appendChild(el);
//         }
//       });

//       // Attach already-connected remote participants (doctor or patient)
//       connectedRoom.participants.forEach((participant) => {
//         console.log("Already present:", participant.identity);
//         handleParticipantConnected(participant);
//       });

//       // When a participant joins
//       connectedRoom.on("participantConnected", handleParticipantConnected);

//       // When a participant leaves
//       connectedRoom.on("participantDisconnected", handleParticipantDisconnected);

//       alert("Connected to Twilio Successfully.");
//     } catch (err) {
//       console.error("Twilio Connect Error:", err);
//       alert("Twilio connect failed. Check token, roomName, and signature.");
//     }
//   };

//   // -------------------------------
//   // Remote Participant Handler
//   // -------------------------------
//   const handleParticipantConnected = (participant) => {
//     console.log("Participant Connected:", participant.identity);

//     participant.tracks.forEach(publication => {
//       if (publication.isSubscribed) {
//         attachRemoteTrack(publication.track);
//       }
//     });

//     participant.on("trackSubscribed", attachRemoteTrack);
//     participant.on("trackUnsubscribed", detachRemoteTrack);
//   };

//   const handleParticipantDisconnected = (participant) => {
//     console.log("Participant Disconnected:", participant.identity);
//     if (remoteRef.current) remoteRef.current.innerHTML = "";
//   };

//   const attachRemoteTrack = (track) => {
//     if (remoteRef.current) {
//       const el = track.attach();
//       el.className = "w-full h-full object-cover rounded-lg shadow-lg";
//       remoteRef.current.appendChild(el);
//     }
//   };

//   const detachRemoteTrack = (track) => {
//     track.detach().forEach(element => element.remove());
//   };

//   // -------------------------------
//   // DISCONNECT ROOM OPTIONAL
//   // -------------------------------
//   const disconnectRoom = () => {
//     if (room) {
//       room.disconnect();
//       setRoom(null);
//       if (remoteRef.current) remoteRef.current.innerHTML = "";
//       if (localRef.current) localRef.current.innerHTML = "";
//       alert("Disconnected from room.");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
//       <h1 className="text-3xl font-bold mb-6 text-gray-800">🩺 Telemedicine Test (Doctor + Patient Only)</h1>

//       {/* Controls */}
//       <div className="bg-white p-6 rounded-xl shadow-lg mb-8 space-y-4">
//         <h2 className="text-xl font-semibold border-b pb-2 mb-4 text-gray-700">Setup</h2>

//         <div className="flex flex-col sm:flex-row gap-4">
//           <select
//             value={role}
//             onChange={e => setRole(e.target.value)}
//             className="p-2 border rounded-lg"
//           >
//             <option value="PATIENT">PATIENT</option>
//             <option value="DOCTOR">DOCTOR</option>
//           </select>

//           <input
//             placeholder="user-p1 OR user-d1"
//             value={userId}
//             onChange={e => setUserId(e.target.value)}
//             className="p-2 border rounded-lg w-full"
//           />

//           <input
//             placeholder="Meeting ID"
//             value={meetingId}
//             onChange={e => setMeetingId(e.target.value)}
//             className="p-2 border rounded-lg w-full"
//           />
//         </div>

//         {/* Buttons */}
//         <div className="flex flex-wrap gap-3">
//           <button onClick={joinMeeting} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
//             1. Join Meeting (Get Token)
//           </button>

//           <button
//             onClick={connectToTwilio}
//             disabled={!token}
//             className={`px-4 py-2 rounded-lg ${
//               token ? "bg-green-600 text-white" : "bg-gray-400 text-gray-700"
//             }`}
//           >
//             2. Connect to Twilio Room
//           </button>

//           {room && (
//             <button onClick={disconnectRoom} className="px-4 py-2 bg-red-500 text-white rounded-lg">
//               Disconnect
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Video Section */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         <div className="bg-white p-4 rounded-xl shadow-xl">
//           <h3 className="text-lg font-semibold mb-2">Local Video</h3>
//           <div ref={localRef} className="relative w-full aspect-video bg-gray-200 rounded-lg"></div>
//         </div>

//         <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-xl">
//           <h3 className="text-lg font-semibold mb-2">Remote Video</h3>
//           <div ref={remoteRef} className="relative w-full aspect-video bg-gray-200 rounded-lg"></div>
//         </div>
//       </div>
//     </div>
//   );
// }



import React, { useState, useRef } from "react";
import { Video, Mic, MicOff, VideoOff, PhoneOff, MoreVertical, Users } from "lucide-react";

import TwilioVideo from "twilio-video"
export default function TelemedicineApp() {
  const [meetingId, setMeetingId] = useState("");
  const [userId, setUserId] = useState("user-p1");
  const [role, setRole] = useState("PATIENT");
  const [token, setToken] = useState("");
  const [roomName, setRoomName] = useState("");
  const [room, setRoom] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showPreJoin, setShowPreJoin] = useState(true);

  const localRef = useRef(null);
  const remoteRef = useRef(null);

  const BACKEND_URL = "https://arlette-uniconoclastic-juanita.ngrok-free.app";

  const joinMeeting = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/meet/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}|${role}`
        },
        body: JSON.stringify({ meetingId, userId, role })
      });

      const data = await res.json();
      console.log("JOIN RESPONSE:", data);

      if (data.success) {
        setToken(data.token);
        setRoomName(data.roomName);
        setShowPreJoin(false);
        await connectToTwilio(data.token, data.roomName);
      } else {
        alert(`Join failed: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Join error:", err);
      alert("Failed to join meeting");
    }
  };

  const connectToTwilio = async (twilioToken, twilioRoomName) => {
    try {
      // const TwilioVideo = window.Video;
      if (!TwilioVideo) {
        alert("Twilio Video SDK not loaded");
        return;
      }

      const connectedRoom = await TwilioVideo.connect(twilioToken || token, {
        name: twilioRoomName || roomName,
        audio: isAudioEnabled,
        video: isVideoEnabled ? { width: 640 } : false
      });

      setRoom(connectedRoom);
      console.log("Connected to Room:", connectedRoom.name);

      if (localRef.current) localRef.current.innerHTML = "";

      connectedRoom.localParticipant.tracks.forEach(pub => {
        if (pub.track) {
          const el = pub.track.attach();
          el.className = "w-full h-full object-cover";
          localRef.current.appendChild(el);
        }
      });

      connectedRoom.participants.forEach(handleParticipantConnected);
      connectedRoom.on("participantConnected", handleParticipantConnected);
      connectedRoom.on("participantDisconnected", handleParticipantDisconnected);
    } catch (err) {
      console.error("Twilio Connect Error:", err);
      alert("Failed to connect to video room");
    }
  };

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
      el.className = "w-full h-full object-cover";
      remoteRef.current.appendChild(el);
    }
  };

  const detachRemoteTrack = (track) => {
    track.detach().forEach(element => element.remove());
  };

  const toggleAudio = () => {
    if (room) {
      room.localParticipant.audioTracks.forEach(publication => {
        if (isAudioEnabled) {
          publication.track.disable();
        } else {
          publication.track.enable();
        }
      });
    }
    setIsAudioEnabled(!isAudioEnabled);
  };

  const toggleVideo = () => {
    if (room) {
      room.localParticipant.videoTracks.forEach(publication => {
        if (isVideoEnabled) {
          publication.track.disable();
        } else {
          publication.track.enable();
        }
      });
    }
    setIsVideoEnabled(!isVideoEnabled);
  };

  const leaveCall = () => {
    if (room) {
      room.disconnect();
      setRoom(null);
      if (remoteRef.current) remoteRef.current.innerHTML = "";
      if (localRef.current) localRef.current.innerHTML = "";
    }
    setShowPreJoin(true);
    setToken("");
    setRoomName("");
  };

  if (showPreJoin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Preview Section */}
            <div className="bg-gray-900 p-8 flex items-center justify-center">
              <div className="relative w-full aspect-video bg-gray-800 rounded-xl overflow-hidden">
                <div ref={localRef} className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Video size={64} className="mx-auto mb-2 opacity-50" />
                    <p>Camera Preview</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Join Form */}
            <div className="p-8 flex flex-col justify-center">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Ready to join?</h1>
                <p className="text-gray-600">Enter your meeting details below</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="PATIENT">Patient</option>
                    <option value="DOCTOR">Doctor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <input
                    placeholder="e.g., user-p1 or user-d1"
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meeting ID</label>
                  <input
                    placeholder="Enter meeting code"
                    value={meetingId}
                    onChange={e => setMeetingId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={joinMeeting}
                  disabled={!meetingId || !userId}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  Join Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Video Grid */}
      <div className="flex-1 relative p-4">
        {/* Remote Video (Main) */}
        <div className="absolute inset-4">
          <div ref={remoteRef} className="w-full h-full bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Users size={80} className="mx-auto mb-4 opacity-30" />
              <p className="text-xl">Waiting for others to join...</p>
            </div>
          </div>
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-8 right-8 w-64 aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 z-10">
          <div ref={localRef} className="w-full h-full flex items-center justify-center bg-gray-800">
            {!isVideoEnabled && (
              <div className="text-center text-gray-400">
                <VideoOff size={32} className="mx-auto" />
              </div>
            )}
          </div>
          <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-80 px-2 py-1 rounded text-xs text-white">
            You
          </div>
        </div>

        {/* Meeting Info */}
        <div className="absolute top-8 left-8 bg-gray-900 bg-opacity-80 px-4 py-2 rounded-lg text-white z-10">
          <div className="text-sm font-medium">{roomName || "Telemedicine Session"}</div>
          <div className="text-xs text-gray-400">{role === "DOCTOR" ? "Doctor" : "Patient"}</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Left Side - Meeting Info */}
          <div className="flex items-center space-x-2 text-white text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>

          {/* Center - Main Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-colors ${
                isAudioEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
              title={isAudioEnabled ? "Mute" : "Unmute"}
            >
              {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </button>

            <button
              onClick={leaveCall}
              className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
              title="Leave call"
            >
              <PhoneOff size={20} />
            </button>
          </div>

          {/* Right Side - Additional Controls */}
          <div className="flex items-center space-x-2">
            <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors" title="More options">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


