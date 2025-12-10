
import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, Phone, User, Copy, Check } from 'lucide-react';

export default function TelemedicineMeeting() {
  const [view, setView] = useState('home'); // home, create, join, waiting, call
  const [meetingId, setMeetingId] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('PATIENT');
  const [token, setToken] = useState('');
  const [room, setRoom] = useState('');
  const [inCall, setInCall] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Appointment form
  const [appointmentForm, setAppointmentForm] = useState({
    patientUserId: '',
    doctorUserId: '',
    clinicId: '',
    startTime: '',
    endTime: '',
    appointmentByType: 'CHECK_UP',
    bookedByUserId: 'ADMIN-001',
    bookedByRole: 'ADMIN'
  });
  const [createdMeeting, setCreatedMeeting] = useState(null);
  
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const joinEndpoint = 'https://arlette-uniconoclastic-juanita.ngrok-free.app/api/meet/join';
  const createEndpoint = 'https://arlette-uniconoclastic-juanita.ngrok-free.app/api/appointment/create';

  // Auto-extract meeting ID from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mtgId = params.get('meetingId') || params.get('m');
    if (mtgId) {
      setMeetingId(mtgId);
      setView('join');
    }
  }, []);

  useEffect(() => {
    if (inCall) initVideo();
    return () => stopVideo();
  }, [inCall]);

  const initVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localRef.current) localRef.current.srcObject = stream;
    } catch (e) {
      setError('Failed to access camera/microphone');
    }
  };

  const stopVideo = () => {
    if (localRef.current?.srcObject) {
      localRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  const handleCreateAppointment = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(createEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentForm),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create appointment');
      }

      const data = await res.json();
      setCreatedMeeting({
        appointmentId: data.appointmentId,
        meetingId: data.meetingId,
        meetingUrl: data.meetingUrl
      });
      setSuccess('Appointment created successfully!');
      
      // Reset form
      setAppointmentForm({
        patientUserId: '',
        doctorUserId: '',
        clinicId: '',
        startTime: '',
        endTime: '',
        appointmentByType: 'CHECK_UP',
        bookedByUserId: 'ADMIN-001',
        bookedByRole: 'ADMIN'
      });
    } catch (e) {
      setError(e.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!meetingId || !userId) {
      setError('Please enter Meeting ID and User ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(joinEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meetingId.trim(),
          userId: userId.trim(),
          userRole: userRole
        }),
      });

      console.log(res);
      

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to join meeting');
      }

      
      

      const data = await res.json();
      console.log(data);
      setToken(data.token.token || '');
      setRoom(data.roomName || '');
      setView('waiting');
    } catch (e) {
      setError(e.message || 'Failed to join meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCall = () => {
    setInCall(true);
    setView('call');
  };

  const toggleVideo = () => {
    const track = localRef.current?.srcObject?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
    }
  };

  const toggleAudio = () => {
    const track = localRef.current?.srcObject?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
    }
  };

  const handleEndCall = () => {
    stopVideo();
    setInCall(false);
    setToken('');
    setRoom('');
    setView('home');
  };

  const generateMeetingLink = (mtgId) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?meetingId=${mtgId || meetingId}`;
  };

  const copyMeetingLink = (mtgId) => {
    const link = generateMeetingLink(mtgId);
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        
        {view === 'home' && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white bg-opacity-20 p-4 rounded-full">
                  <Video size={48} />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-center">Telemedicine Platform</h1>
              <p className="text-center text-indigo-100 mt-2">Create appointments or join meetings</p>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => setView('create')}
                  className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-8 hover:shadow-lg transition-all text-left group"
                >
                  <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="text-white" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Appointment</h3>
                  <p className="text-gray-600">Schedule a new telemedicine consultation</p>
                </button>

                <button
                  onClick={() => setView('join')}
                  className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 hover:shadow-lg transition-all text-left group"
                >
                  <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Video className="text-white" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Join Meeting</h3>
                  <p className="text-gray-600">Enter an existing consultation</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'create' && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Create Appointment</h2>
                <p className="text-indigo-100 mt-1">Schedule a new consultation</p>
              </div>
              <button
                onClick={() => setView('home')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition"
              >
                ← Back
              </button>
            </div>

            <div className="p-8">
              {!createdMeeting ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Patient User ID</label>
                      <input
                        type="text"
                        value={appointmentForm.patientUserId}
                        onChange={(e) => setAppointmentForm({...appointmentForm, patientUserId: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="USER-P1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor User ID</label>
                      <input
                        type="text"
                        value={appointmentForm.doctorUserId}
                        onChange={(e) => setAppointmentForm({...appointmentForm, doctorUserId: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="USER-D1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Clinic ID</label>
                      <input
                        type="text"
                        value={appointmentForm.clinicId}
                        onChange={(e) => setAppointmentForm({...appointmentForm, clinicId: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="CLINIC-01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Appointment Type</label>
                      <select
                        value={appointmentForm.appointmentByType}
                        onChange={(e) => setAppointmentForm({...appointmentForm, appointmentByType: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="CHECK_UP">Check Up</option>
                        <option value="CONSULTATION">Consultation</option>
                        <option value="FOLLOW_UP">Follow Up</option>
                        <option value="EMERGENCY">Emergency</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
                      <input
                        type="datetime-local"
                        value={appointmentForm.startTime}
                        onChange={(e) => setAppointmentForm({...appointmentForm, startTime: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
                      <input
                        type="datetime-local"
                        value={appointmentForm.endTime}
                        onChange={(e) => setAppointmentForm({...appointmentForm, endTime: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Booked By User ID</label>
                      <input
                        type="text"
                        value={appointmentForm.bookedByUserId}
                        onChange={(e) => setAppointmentForm({...appointmentForm, bookedByUserId: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="ADMIN-001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Booked By Role</label>
                      <select
                        value={appointmentForm.bookedByRole}
                        onChange={(e) => setAppointmentForm({...appointmentForm, bookedByRole: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="DOCTOR">Doctor</option>
                        <option value="FRONT_OFFICE">Front Office</option>
                      </select>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleCreateAppointment}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    {loading ? 'Creating Appointment...' : 'Create Appointment'}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="text-green-600" size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Appointment Created!</h3>
                  <p className="text-gray-600 mb-6">Share the meeting link with participants</p>

                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 space-y-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-600 mb-2 font-medium">Appointment ID</div>
                      <div className="bg-white border-2 border-gray-300 rounded-lg px-4 py-3 font-mono">
                        {createdMeeting.appointmentId}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-2 font-medium">Meeting ID</div>
                      <div className="bg-white border-2 border-gray-300 rounded-lg px-4 py-3 font-mono text-lg">
                        {createdMeeting.meetingId}
                      </div>
                    </div>

                    {createdMeeting.meetingUrl && (
                      <div>
                        <div className="text-sm text-gray-600 mb-2 font-medium">Meeting URL</div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={createdMeeting.meetingUrl}
                            readOnly
                            className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-sm"
                          />
                          <button
                            onClick={() => copyMeetingLink(createdMeeting.meetingId)}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-2 font-medium"
                          >
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setCreatedMeeting(null);
                        setSuccess('');
                      }}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                    >
                      Create Another
                    </button>
                    <button
                      onClick={() => setView('home')}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'join' && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white bg-opacity-20 p-4 rounded-full">
                    <Video size={48} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Join Meeting</h1>
                    <p className="text-indigo-100 mt-1">Enter your consultation</p>
                  </div>
                </div>
                <button
                  onClick={() => setView('home')}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition"
                >
                  ← Back
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Meeting ID
                  </label>
                  <input
                    type="text"
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                    placeholder="Enter meeting ID (e.g., 4531ba68ac3945)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your User ID
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                    placeholder="Enter your user ID (e.g., user-p1)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Join As
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setUserRole('PATIENT')}
                      className={`py-3 px-4 rounded-lg font-medium transition-all ${
                        userRole === 'PATIENT'
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Patient
                    </button>
                    <button
                      onClick={() => setUserRole('DOCTOR')}
                      className={`py-3 px-4 rounded-lg font-medium transition-all ${
                        userRole === 'DOCTOR'
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Doctor
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleJoinMeeting}
                  disabled={loading || !meetingId || !userId}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Joining...
                    </span>
                  ) : (
                    'Join Meeting'
                  )}
                </button>

                {meetingId && (
                  <div className="pt-6 border-t">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Share this meeting:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generateMeetingLink(meetingId)}
                        readOnly
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => copyMeetingLink(meetingId)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-2"
                      >
                        {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'waiting' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="text-green-600" size={48} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Ready to Join</h2>
              <p className="text-gray-600 mb-8">You're all set! Click below to enter the meeting.</p>

              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 mb-8 space-y-4">
                <div className="flex items-center justify-center gap-3 text-gray-700">
                  <User size={24} />
                  <span className="font-semibold text-lg">{userId}</span>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    {userRole}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-600 mb-2 font-medium">Meeting ID</div>
                  <div className="bg-white border-2 border-gray-300 rounded-lg px-4 py-3 font-mono text-lg">
                    {meetingId}
                  </div>
                </div>

                {room && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2 font-medium">Room Name</div>
                    <div className="bg-white border-2 border-gray-300 rounded-lg px-4 py-3 font-mono">
                      {room}
                    </div>
                  </div>
                )}

                {token && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2 font-medium">Access Token</div>
                    <div className="bg-white border-2 border-gray-300 rounded-lg px-4 py-3 font-mono text-xs break-all">
                      {token}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleStartCall}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-12 py-4 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
              >
                Enter Meeting Room
              </button>
            </div>
          </div>
        )}

        {view === 'call' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Remote Video */}
                <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video shadow-lg">
                  <video
                    ref={remoteRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium">
                    {userRole === 'DOCTOR' ? 'Patient' : 'Doctor'}
                  </div>
                  {!remoteRef.current?.srcObject && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="text-center text-white">
                        <div className="bg-white bg-opacity-10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                          <User size={48} className="opacity-50" />
                        </div>
                        <p className="text-lg opacity-75">Waiting for others to join...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Local Video */}
                <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video shadow-lg">
                  <video
                    ref={localRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium">
                    You ({userId})
                  </div>
                  {!videoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="bg-white bg-opacity-10 w-20 h-20 rounded-full flex items-center justify-center">
                        <User size={40} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={toggleVideo}
                  className={`p-5 rounded-full transition-all shadow-lg ${
                    videoEnabled
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {videoEnabled ? <Video size={28} /> : <VideoOff size={28} />}
                </button>

                <button
                  onClick={toggleAudio}
                  className={`p-5 rounded-full transition-all shadow-lg ${
                    audioEnabled
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {audioEnabled ? <Mic size={28} /> : <MicOff size={28} />}
                </button>

                <button
                  onClick={handleEndCall}
                  className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg hover:shadow-xl"
                >
                  <Phone size={28} />
                </button>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">Meeting ID: <span className="font-mono font-semibold">{meetingId}</span></p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}