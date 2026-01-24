import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
    Activity, ArrowLeft, Settings, Wifi, Play,
} from "lucide-react";
import "./SingleFeedDashboard.css";

const SingleFeedDashboard = () => {
    const { streamId } = useParams();
    const [imageSrc, setImageSrc] = useState(null);
    const [currentCount, setCurrentCount] = useState(0);
    const [zoneCounts, setZoneCounts] = useState({});
    const [status, setStatus] = useState("connecting");
    const [fps, setFps] = useState(0);
    const [historicalData, setHistoricalData] = useState([]);
    const ws = useRef(null);
    const frameTimestamps = useRef([]);

    // Data generation for charts based on real detections
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

            setHistoricalData(prev => {
                const newData = [...prev, {
                    time: timeStr,
                    count: currentCount
                }];
                if (newData.length > 20) return newData.slice(1);
                return newData;
            });
        }, 10000);
        return () => clearInterval(interval);
    }, [currentCount]);

    useEffect(() => {
        ws.current = new WebSocket("ws://localhost:8081");

        ws.current.onopen = () => setStatus("live");

        ws.current.onmessage = (event) => {
            try {
                console.log("🟢 Frame received, len:", event.data.length);
                const data = JSON.parse(event.data);

                if (data.streamId === streamId) {
                    if (!data.image) {
                        console.warn("Frame has no image data");
                        return;
                    }

                    console.log("Image type:", typeof data.image);
                    if (typeof data.image === 'string') {
                        console.log("Image start:", data.image.substring(0, 20));
                        if (data.image.trim().startsWith('{')) {
                            console.error("CRITICAL ERROR: data.image contains JSON!", data.image.substring(0, 100));
                            return;
                        }
                    } else {
                        console.error("data.image is NOT a string:", data.image);
                        return;
                    }

                    const imageUrl = `data:image/jpeg;base64,${data.image}`;
                    setImageSrc(imageUrl);
                    setCurrentCount(data.count || 0);
                    if (data.zone_counts) {
                        setZoneCounts(data.zone_counts);
                    }

                    // FPS Calc
                    const now = Date.now();
                    frameTimestamps.current.push(now);
                    frameTimestamps.current = frameTimestamps.current.filter(t => now - t < 1000);
                    setFps(frameTimestamps.current.length);
                }
            } catch (err) {
                console.error("WS Parse Error", err);
            }
        };

        ws.current.onclose = () => setStatus("disconnected");

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [streamId]);

    const handleStopStream = async () => {
        try {
            await fetch("http://localhost:5000/streams/stop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ streamId }),
            });
            setStatus("stopped");
            if (ws.current) ws.current.close();
        } catch (err) {
            console.error("Failed to stop stream", err);
        }
    };

    return (
        <div className="single-feed-dashboard page-container">
            {/* Main Grid */}
            <div className="dashboard-layout">
                {/* Left Column - Video & Charts */}
                <div className="main-column">
                    {/* Live Feed Card */}
                    <section className="feed-section card animate-scaleIn">
                        <div className="feed-header">
                            <div className="feed-title">
                                <Link to="/dashboard" className="back-link">
                                    <ArrowLeft size={18} />
                                </Link>
                                <span>Live Feed - {streamId.slice(0, 8)}</span>
                                <span className={`badge ${status === 'live' ? 'badge-live' : 'badge-offline'}`}>
                                    {status.toUpperCase()}
                                </span>
                            </div>
                            <div className="feed-actions">
                                <button
                                    className="icon-btn-sm"
                                    onClick={handleStopStream}
                                    title="Stop Stream"
                                    style={{ color: '#ef4444' }}
                                >
                                    <div style={{ width: '12px', height: '12px', background: 'currentColor', borderRadius: '2px' }}></div>
                                </button>
                                <button className="icon-btn-sm">
                                    <Play size={16} />
                                </button>
                                <button className="icon-btn-sm">
                                    <Settings size={16} />
                                </button>
                                <Link to={`/zone-editor?cameraId=${streamId}`} style={{ marginLeft: 8 }}>
                                    <button className="icon-btn-sm" title="Edit Zones">
                                        Edit Zones
                                    </button>
                                </Link>
                            </div>
                        </div>

                        <div className="video-container">
                            {imageSrc ? (
                                <img src={imageSrc} alt="Live Stream" className="video-feed" />
                            ) : (
                                <div className="video-placeholder">
                                    <div className="spinner"></div>
                                    <span>Establishing Secure Connection...</span>
                                </div>
                            )}

                            {/* Baggage Count Overlay */}
                            <div className="count-overlay">
                                <div className="count-label">CURRENT COUNT</div>
                                <div className="count-value">{currentCount}</div>
                            </div>
                        </div>
                    </section>

                    {/* Historical Trends Chart */}
                    <section className="chart-section card animate-fadeIn">
                        <div className="card-header">
                            <h3 className="card-title">Historical Trends - Today</h3>
                            <div className="chart-tabs">
                                <button className="tab-btn active">Timeline View</button>
                            </div>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={historicalData}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorCount)"
                                        name="Baggage Count"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                            <div className="chart-legend">
                                <div className="legend-item">
                                    <span className="legend-dot" style={{ background: '#6366f1' }}></span>
                                    Baggage Count
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column - Status & Performance */}
                <div className="side-column">
                    {/* Current Status Section */}
                    <section className="status-section">
                        <h3 className="section-header">CURRENT STATUS</h3>

                        {/* Current Baggage Card */}
                        <div className="metric-card animate-slideIn">
                            <div className="metric-header">
                                <span className="metric-label">Current Baggage</span>
                                <span className="badge badge-normal">Live</span>
                            </div>
                            <div className="metric-value">{currentCount}</div>
                            <div className="metric-subtext">Items visible</div>
                        </div>

                        {/* Zone Counts */}
                        {Object.entries(zoneCounts).map(([zoneName, count]) => (
                            <div key={zoneName} className="metric-card animate-slideIn">
                                <div className="metric-header">
                                    <span className="metric-label">Zone: {zoneName}</span>
                                    <span className="badge badge-live">Count</span>
                                </div>
                                <div className="metric-value">{count}</div>
                                <div className="metric-subtext">Total Entered</div>
                            </div>
                        ))}

                        {/* Stream Status Card */}
                        <div className="metric-card animate-slideIn" style={{ animationDelay: '0.1s' }}>
                            <div className="metric-header">
                                <span className="metric-label">Stream Status</span>
                                <span className={`badge ${status === 'live' ? 'badge-normal' : 'badge-warning'}`}>
                                    {status === 'live' ? 'Connected' : 'Waiting'}
                                </span>
                            </div>
                            <div className="metric-value" style={{ fontSize: '24px' }}>{streamId.slice(0, 8)}</div>
                            <div className="metric-subtext">Stream ID</div>
                        </div>
                    </section>

                    {/* System Performance Section */}
                    <section className="performance-section card animate-slideIn" style={{ animationDelay: '0.2s' }}>
                        <h3 className="section-header" style={{ padding: '20px 20px 0' }}>SYSTEM PERFORMANCE</h3>
                        <div className="performance-content">
                            {/* Detection FPS */}
                            <div className="perf-item">
                                <div className="perf-header">
                                    <div className="perf-label">
                                        <Activity size={14} />
                                        <span>Detection FPS</span>
                                    </div>
                                    <span className="perf-badge">{fps > 20 ? 'GOOD' : fps > 10 ? 'FAIR' : 'LOW'}</span>
                                </div>
                                <div className="perf-row">
                                    <div className="perf-value">
                                        <span className="number">{fps}</span>
                                        <span className="unit">fps</span>
                                    </div>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill success" style={{ width: `${Math.min(fps / 30 * 100, 100)}%` }}></div>
                                </div>
                            </div>

                            {/* Network Status */}
                            <div className="perf-item">
                                <div className="perf-header">
                                    <div className="perf-label">
                                        <Wifi size={14} />
                                        <span>Connection</span>
                                    </div>
                                    <span className="perf-badge">{status === 'live' ? 'ACTIVE' : 'WAITING'}</span>
                                </div>
                                <div className="perf-row">
                                    <div className="perf-value">
                                        <span className="number">{status === 'live' ? 'Connected' : 'Connecting'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* System Info Footer */}
                        <div className="system-info">
                            <div className="info-row">
                                <span>Model:</span>
                                <span className="link">YOLOv11</span>
                            </div>
                            <div className="info-row">
                                <span>WebSocket:</span>
                                <span>ws://localhost:8081</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SingleFeedDashboard;
