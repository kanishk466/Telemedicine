import React, { useState, useEffect, useRef } from "react";
import Video from "twilio-video";
import { Video as VideoIcon, Mic, MicOff, VideoOff, Phone, Settings, User, Calendar, Clock } from "lucide-react";

export default function TelemedicineApp() {
  const [step, setStep] = useState("booking"); // booking, waiting, consultation, completed
  const [apiEndpoint, setApiEndpoint] = useState("");          // token generation endpoint
  const [startCallEndpoint, setStartCallEndpoint] = useState(""); // doctor start endpoint
  const [endCallEndpoint, setEndCallEndpoint] = useState("");     // optional end endpoint
  const [token, setToken] = useState("");
  const [roomName, setRoomName] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("PATIENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Twilio room and local tracks
  const roomRef = useRef(null);
  const localTracksRef = useRef([]);

  useEffect(() => {
    // when entering consultation, connect to Twilio automatically if token & roomName are available
    if (step === "consultation" && token && roomName) {
      connectToRoom();
    }

    // cleanup on unmount
    return () => {
      cleanupRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, token, roomName]);

  // Helper - cleanup local tracks and disconnect room
  const cleanupRoom = async () => {
    try {
      // stop local tracks
      if (localTracksRef.current && localTracksRef.current.length) {
        localTracksRef.current.forEach((t) => {
          try { t.stop?.(); } catch (e) { /* ignore */ }
          try { t.detach?.().forEach(el => el.remove()); } catch (e) { /* ignore */ }
        });
        localTracksRef.current = [];
      }

      // disconnect room
      if (roomRef.current) {
        try {
          roomRef.current.localParticipant?.tracks.forEach((pub) => {
            try { pub.track.stop?.(); } catch (e) {}
            try { pub.unpublish?.(); } catch (e) {}
          });
        } catch (e) {}

        try {
          roomRef.current.disconnect();
        } catch (e) {}

        roomRef.current = null;
      }

      // clear video elements
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    } catch (err) {
      // ignore
    }
  };

  const initializeLocalMedia = async () => {
    // Create local tracks via Twilio helper
    try {
      const tracks = await Video.createLocalTracks({ audio: true, video: { width: 640 } });

      // store
      localTracksRef.current = tracks;

      // Attach the first video track to localVideoRef for preview
      const videoTrack = tracks.find((t) => t.kind === "video");
      if (videoTrack && localVideoRef.current) {
        const el = videoTrack.attach();
        // clear any old children
        localVideoRef.current.innerHTML = "";
        localVideoRef.current.appendChild(el);
      }

      // ensure audio enabled state is in sync
      const audioTrack = tracks.find((t) => t.kind === "audio");
      setAudioEnabled(!audioTrack?.isMuted); // Twilio track has isMuted sometimes
      setVideoEnabled(true);
      return tracks;
    } catch (err) {
      setError("Failed to access camera/microphone. Check permissions.");
      throw err;
    }
  };

  const connectToRoom = async () => {
    setError("");
    setLoading(true);

    try {
      // create local tracks if not created
      if (!localTracksRef.current || localTracksRef.current.length === 0) {
        await initializeLocalMedia();
      }

      // connect to Twilio room
      const tracks = localTracksRef.current.length ? localTracksRef.current : undefined;
      const room = await Video.connect(token, {
        name: roomName,
        tracks, // attach local tracks on connect
        dominantSpeaker: true,
      });

      roomRef.current = room;

      // When already connected participants exist, subscribe to them
      room.participants.forEach((participant) => {
        subscribeToParticipant(participant);
      });

      // Listen for newly connected participants
      room.on("participantConnected", (participant) => {
        subscribeToParticipant(participant);
      });

      room.on("participantDisconnected", (participant) => {
        // remove participant's tracks from UI
        participant.tracks.forEach((publication) => {
          if (publication.track) {
            const attached = publication.track.detach();
            attached.forEach((el) => el.remove());
          }
          // if remote left, clear remote element (simple UX)
          if (remoteVideoRef.current) remoteVideoRef.current.innerHTML = "";
        });
      });

      // Local track handling (if user toggles mic/cam, we will enable/disable tracks)
      room.on("disconnected", (roomObj, error) => {
        // cleanup on disconnect
        cleanupRoom();
        if (error) {
          console.error("Room disconnected with error", error);
        }
      });

      setStep("consultation");
    } catch (err) {
      console.error("connectToRoom error:", err);
      setError("Unable to join the room. " + (err.message || ""));
      // cleanup on error
      await cleanupRoom();
    } finally {
      setLoading(false);
    }
  };

  const subscribeToParticipant = (participant) => {
    // show remote identity on UI if needed (participant.identity)
    // listen for trackSubscribed events to attach tracks to DOM
    participant.on("trackSubscribed", (track) => {
      attachTrackToRemote(track);
    });

    participant.on("trackUnsubscribed", (track) => {
      detachTrackFromRemote(track);
    });

    // attach already-published tracks (in case they were published before we subscribed)
    participant.tracks.forEach((publication) => {
      if (publication.isSubscribed && publication.track) {
        attachTrackToRemote(publication.track);
      }
      // subscribe to future if not subscribed (twilio handles it via events)
    });
  };

  const attachTrackToRemote = (track) => {
    try {
      if (!remoteVideoRef.current) return;
      // clear previous
      // For a simple UI: we attach the first video we get
      const el = track.attach();
      // clear existing content
      remoteVideoRef.current.innerHTML = "";
      remoteVideoRef.current.appendChild(el);
    } catch (err) {
      console.warn("attachTrackToRemote error", err);
    }
  };

  const detachTrackFromRemote = (track) => {
    try {
      const els = track.detach();
      els.forEach((el) => el.remove());
    } catch (err) {}
  };

  const handleGenerateToken = async () => {
    if (!apiEndpoint) {
      setError("Please enter API endpoint");
      return;
    }
    if (!appointmentId || !userId) {
      setError("Appointment ID and User ID required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // call token endpoint — expects payload: { appointmentId, userId, role }
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, userId, role }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to generate token");
      }

      const data = await res.json();
      // support both shapes: { token, roomName } or { result: { token, roomName } }
      const payload = data.result ? data.result : data;
      if (!payload?.token || !payload?.roomName) {
        throw new Error("Invalid token response from API");
      }

      setToken(payload.token);
      setRoomName(payload.roomName);
      setStep("waiting");
    } catch (err) {
      setError(err.message || "Failed to generate token");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinConsultation = async () => {
    setError("");
    setLoading(true);

    try {
      // If doctor, optionally call startCallEndpoint to mark IN_CONSULTATION (or rely on webhook)
      if (role === "DOCTOR") {
        if (!startCallEndpoint) {
          setError("Please enter start call API endpoint");
          setLoading(false);
          return;
        }

        const res = await fetch(startCallEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId, doctorUserId: userId }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to start consultation (doctor)");
        }
      }

      // Patient or doctor now proceed to connect: step will trigger connectToRoom via useEffect
      setStep("consultation");
    } catch (err) {
      setError(err.message || "Failed to start/join consultation");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle video: enable/disable local video track
  const toggleVideo = () => {
    try {
      const vt = localTracksRef.current?.find((t) => t.kind === "video");
      if (!vt) return;
      vt.isEnabled = !vt.isEnabled;
      // Twilio track has .enable() / .disable() in some versions, but safe approach:
      if (typeof vt.enable === "function") vt.enable(!vt.isEnabled);
      else vt.mediaStreamTrack.enabled = !vt.mediaStreamTrack.enabled;
      setVideoEnabled(vt.mediaStreamTrack?.enabled ?? true);
    } catch (err) {
      console.warn("toggleVideo err", err);
    }
  };

  // Toggle audio: enable/disable local audio track
  const toggleAudio = () => {
    try {
      const at = localTracksRef.current?.find((t) => t.kind === "audio");
      if (!at) return;
      if (at.mediaStreamTrack) {
        at.mediaStreamTrack.enabled = !at.mediaStreamTrack.enabled;
        setAudioEnabled(at.mediaStreamTrack.enabled);
      }
    } catch (err) {
      console.warn("toggleAudio err", err);
    }
  };

  const handleEndCall = async () => {
    setLoading(true);
    setError("");

    try {
      // call end API to close Twilio room (optional)
      if (endCallEndpoint) {
        await fetch(endCallEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId, doctorUserId: userId }),
        });
      }

      await cleanupRoom();

      setStep("completed");
      setToken("");
      setRoomName("");
    } catch (err) {
      console.error("handleEndCall err", err);
      setError("Failed to end call");
    } finally {
      setLoading(false);
    }
  };

  // small helper to show trimmed token or roomName in UI
  const short = (s = "") => (s.length > 30 ? s.slice(0, 28) + "…" : s);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-3 rounded-lg">
                <VideoIcon className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Telemedicine Platform</h1>
                <p className="text-gray-600">Virtual Healthcare Consultation</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                step === 'booking' ? 'bg-blue-100 text-blue-800' :
                step === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                step === 'consultation' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {step.charAt(0).toUpperCase() + step.slice(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {step === "booking" && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Join / Prepare Consultation</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Appointment ID</label>
                <input
                  type="text"
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="APT-52e15646-702e-42b1-a7e5-764cfc97fb96"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="USER-P1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Token Generation API Endpoint</label>
                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://api.example.com/telemedicine/token"
                />
              </div>

              {role === "DOCTOR" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Call API Endpoint</label>
                  <input
                    type="text"
                    value={startCallEndpoint}
                    onChange={(e) => setStartCallEndpoint(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://api.example.com/telemedicine/start"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required for doctors to start the consultation</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Call API Endpoint (optional)</label>
                <input
                  type="text"
                  value={endCallEndpoint}
                  onChange={(e) => setEndCallEndpoint(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://api.example.com/telemedicine/end"
                />
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

              <button
                onClick={handleGenerateToken}
                disabled={loading || !appointmentId || !userId || !apiEndpoint}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? "Generating Token..." : "Generate Token & Prepare"}
              </button>
            </div>
          </div>
        )}

        {step === "waiting" && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className={`${role === "DOCTOR" ? "bg-blue-100" : "bg-yellow-100"} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4`}>
                {role === "DOCTOR" ? <User className="text-blue-600" size={40} /> : <Clock className="text-yellow-600" size={40} />}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{role === "DOCTOR" ? "Ready to Start Consultation" : "Appointment Confirmed"}</h2>
              <p className="text-gray-600 mb-6">{role === "DOCTOR" ? "Click the button below to start the call" : "Your consultation is scheduled"}</p>

              <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <User size={20} />
                  <span className="font-medium">{userId} ({role})</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <Calendar size={20} />
                  <span>Appointment ID: {appointmentId}</span>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="text-sm text-gray-600 mb-2">Room Name:</div>
                  <div className="bg-white border border-gray-300 rounded px-4 py-2 font-mono text-sm">{roomName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Access Token (partial):</div>
                  <div className="bg-white border border-gray-300 rounded px-4 py-2 font-mono text-xs break-all">{short(token)}</div>
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

              <button
                onClick={handleJoinConsultation}
                disabled={loading}
                className={`${role === "DOCTOR" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"} text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                {loading ? "Starting Call..." : (role === "DOCTOR" ? "Start Consultation" : "Join Consultation")}
              </button>
            </div>
          </div>
        )}

        {step === "consultation" && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Remote Video */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                  <div ref={remoteVideoRef} className="w-full h-full" />
                  <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">{role === "DOCTOR" ? "Patient" : "Doctor"}</div>
                </div>

                {/* Local Video */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                  <div ref={localVideoRef} className="w-full h-full" />
                  <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">You</div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-center gap-4">
                <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${videoEnabled ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
                  {videoEnabled ? <VideoIcon size={24} /> : <VideoOff size={24} />}
                </button>

                <button onClick={toggleAudio} className={`p-4 rounded-full transition-colors ${audioEnabled ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
                  {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                </button>

                <button onClick={handleEndCall} className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors">
                  <Phone size={24} />
                </button>

                <button className="p-4 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors">
                  <Settings size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "completed" && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="text-green-600" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Consultation Completed</h2>
              <p className="text-gray-600 mb-6">Thank you for using our telemedicine platform</p>

              <button
                onClick={() => {
                  setStep("booking");
                  setToken("");
                  setRoomName("");
                  setAppointmentId("");
                  setUserId("");
                  setRole("PATIENT");
                  setApiEndpoint("");
                  setStartCallEndpoint("");
                  setError("");
                }}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Book Another Consultation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
