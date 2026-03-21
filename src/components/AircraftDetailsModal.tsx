import { useState, useEffect } from "react";
import { X, Plane, Calendar, MapPin, Clock, User, ExternalLink, AlertTriangle, ChevronLeft, ChevronRight, Info, Navigation, Radio, Building2 } from "lucide-react";
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AircraftDetailsModalProps {
  aircraft: any;
  onClose: () => void;
  cachedData?: any;
  isHullWar?: boolean;
  isUAS?: boolean;
}

export function AircraftDetailsModal({ aircraft, onClose, cachedData, isHullWar = false, isUAS = false }: AircraftDetailsModalProps) {
  const [jetApiData, setJetApiData] = useState<any>(cachedData || null);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Fetch JetAPI data when modal opens (includes both photos and flight data)
  useEffect(() => {
    const fetchAircraftData = async () => {
      if (!aircraft.registration) {
        setError("No registration available");
        setLoading(false);
        return;
      }

      try {
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-afd91142/aircraft/lookup/${encodeURIComponent(aircraft.registration)}`;
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`,
          },
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const detail = errorBody?.message || errorBody?.error || `Server returned status ${response.status}`;
          console.error(`[Aircraft Modal] Lookup failed (${response.status}):`, detail);
          throw new Error(detail);
        }

        const data = await response.json();
        console.log("[Aircraft Modal] Full JetAPI response:", data);
        
        setJetApiData(data.aircraft);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching aircraft data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    };

    if (!cachedData) {
      fetchAircraftData();
    }
  }, [aircraft.registration, cachedData]);

  // Extract photos and flights from JetAPI response
  const photos = jetApiData?.JetPhotos?.Images?.slice(0, 8) || [];
  const flightRadar = jetApiData?.FlightRadar || null;
  const flights = flightRadar?.Flights || [];

  // Derive "last seen" from the most recent flight
  const lastSeenFlight = flights.length > 0 ? flights[0] : null;
  const lastSeenDate = lastSeenFlight?.Date || null;
  // Extract ICAO from JetPhotos Location if available (format: "Airport Name - ICAO")
  const lastSeenIcao = (() => {
    // Try to get ICAO from the most recent photo's Location field (e.g. "Banjarmasin Syamsudin Noor - WAOO")
    if (photos.length > 0 && photos[0]?.Location) {
      const match = photos[0].Location.match(/- ([A-Z]{4})$/);
      if (match) return match[1];
    }
    return null;
  })();

  const nextPhoto = () => setSelectedPhotoIndex((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => setSelectedPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* ── Green Header Hero ── */}
        <div className="relative bg-gradient-to-br from-[#004225] via-[#00522e] to-[#006837] px-6 pt-5 pb-5">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X className="size-4 text-white/80" />
          </button>

          {/* Registration badge */}
          <div className="mb-2">
            <span className="inline-flex items-center bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold text-white/70 uppercase tracking-[0.15em]">
              Registration
            </span>
          </div>
          
          {/* Registration Number */}
          <h2 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-1.5">
            {aircraft.registration ? aircraft.registration.toUpperCase() : 'N/A'}
          </h2>
          
          {/* Aircraft Make/Model + Type badge */}
          <div className="flex items-center gap-2 mb-5">
            <p className="text-white/85 text-sm font-medium">{aircraft.make} {aircraft.model}</p>
            {aircraft.aircraftType && (
              <span className="bg-white/90 px-1.5 py-px rounded text-[#004225] text-[10px] font-bold">
                {aircraft.aircraftType}
              </span>
            )}
          </div>

          {/* Stats Strip */}
          <div className={`grid ${isHullWar ? 'grid-cols-1' : 'grid-cols-4'} gap-2`}>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3.5 py-3 border border-white/15">
              <div className="text-white/50 text-[9px] font-bold uppercase tracking-[0.15em] mb-1">Agreed Value</div>
              <div className="text-white text-base font-bold leading-none">
                {aircraft.aircraftAgreedValueCurrency} {aircraft.aircraftAgreedValue?.toLocaleString()}
              </div>
            </div>
            {!isHullWar && (
              <>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3.5 py-3 border border-white/15">
                  <div className="text-white/50 text-[9px] font-bold uppercase tracking-[0.15em] mb-1">Deductible</div>
                  <div className="text-white text-base font-bold leading-none">
                    {aircraft.aircraftType?.toLowerCase() === 'rotary-wing' 
                      ? `${aircraft.hullDeductible || '0'}%`
                      : `${aircraft.hullDeductibleCurrency} ${aircraft.hullDeductible?.toLocaleString() || '0'}`
                    }
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3.5 py-3 border border-white/15">
                  <div className="text-white/50 text-[9px] font-bold uppercase tracking-[0.15em] mb-1">Liability</div>
                  <div className="text-white text-base font-bold leading-none">
                    {aircraft.liabilityLimitCurrency} {aircraft.liabilityLimit?.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3.5 py-3 border border-white/15">
                  <div className="text-white/50 text-[9px] font-bold uppercase tracking-[0.15em] mb-1">Crew / Pax</div>
                  <div className="text-white text-base font-bold leading-none">
                    {aircraft.crewSeats || '0'} / {aircraft.paxSeats || '0'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Content Area ── */}
        <div className="overflow-y-auto flex-1 bg-gray-50/50">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="size-8 border-2 border-[#004225] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-xs font-medium">Loading aircraft data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
                <AlertTriangle className="size-5 text-red-500 mx-auto mb-2" />
                <p className="text-red-800 font-bold text-sm mb-0.5">Unable to load data</p>
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">

              {/* ── FlightRadar Aircraft Info Strip ── */}
              {flightRadar && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                    <div className="w-0.5 h-4 rounded-full bg-[#004225] shrink-0" />
                    <Radio className="size-3.5 text-gray-400" />
                    <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">FlightRadar Intelligence</h3>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2.5">
                    {flightRadar.Aircraft && (
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Aircraft</div>
                        <div className="text-xs font-bold text-gray-800">{flightRadar.Aircraft}</div>
                      </div>
                    )}
                    {flightRadar.TypeCode && (
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">ICAO Type</div>
                        <div className="text-xs font-bold text-gray-800">{flightRadar.TypeCode}</div>
                      </div>
                    )}
                    {(flightRadar.Airline || flightRadar.Operator) && (
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Operator</div>
                        <div className="text-xs font-bold text-gray-800">{flightRadar.Operator || flightRadar.Airline}</div>
                      </div>
                    )}
                    {flightRadar.AirlineCode && (
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">ICAO Code</div>
                        <div className="text-xs font-bold text-gray-800">{flightRadar.AirlineCode}</div>
                      </div>
                    )}
                    {flightRadar.ModeS && (
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Mode S</div>
                        <div className="text-xs font-bold text-gray-800 font-mono">{flightRadar.ModeS}</div>
                      </div>
                    )}
                    {/* Serial from JetPhotos if available */}
                    {photos.length > 0 && photos[0]?.Serial && (
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Serial</div>
                        <div className="text-xs font-bold text-gray-800 font-mono">{photos[0].Serial}</div>
                      </div>
                    )}
                    {/* Last Seen - derived from most recent flight */}
                    {lastSeenDate && (
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Last Seen</div>
                        <div className="text-xs font-bold text-gray-800">
                          {lastSeenDate}{lastSeenIcao ? ` · ${lastSeenIcao}` : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* ── Aircraft Photos Section ── */}
              {photos.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Section Header */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                    <div className="w-0.5 h-4 rounded-full bg-[#004225] shrink-0" />
                    <Plane className="size-3.5 text-gray-400" />
                    <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Aircraft Photos</h3>
                    <span className="text-[10px] text-gray-400 ml-auto">{photos.length} image{photos.length !== 1 ? 's' : ''} available</span>
                  </div>
                  
                  {/* Featured Photo */}
                  <div className="relative group">
                    <div className="relative overflow-hidden bg-gray-100 aspect-[16/9]">
                      <img
                        src={photos[selectedPhotoIndex]?.Image}
                        alt={`${aircraft.registration} photo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/svg%3E';
                        }}
                      />
                      
                      {/* Photo navigation arrows */}
                      {photos.length > 1 && (
                        <>
                          <button
                            onClick={prevPhoto}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <ChevronLeft className="size-4 text-white" />
                          </button>
                          <button
                            onClick={nextPhoto}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <ChevronRight className="size-4 text-white" />
                          </button>
                        </>
                      )}

                      {/* Bottom bar: photographer + counter */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
                        <div className="flex items-end justify-between">
                          <div>
                            {photos[selectedPhotoIndex]?.Photographer && (
                              <div className="flex items-center gap-1.5">
                                <User className="size-3 text-white/70" />
                                <span className="text-white/90 text-[11px] font-medium">© {photos[selectedPhotoIndex].Photographer}</span>
                              </div>
                            )}
                          </div>
                          {photos.length > 1 && (
                            <span className="text-white/60 text-[10px] font-bold tabular-nums">
                              {selectedPhotoIndex + 1} / {photos.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* External link */}
                      {photos[selectedPhotoIndex]?.Link && (
                        <a
                          href={photos[selectedPhotoIndex].Link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-3 right-3 bg-white/90 hover:bg-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow"
                        >
                          <ExternalLink className="size-3.5 text-gray-600" />
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Thumbnail Strip */}
                  {photos.length > 1 && (
                    <div className="flex gap-1.5 p-2.5 bg-gray-50/80 overflow-x-auto">
                      {photos.map((photo: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedPhotoIndex(index)}
                          className={`relative flex-shrink-0 overflow-hidden rounded transition-all duration-150 ${
                            selectedPhotoIndex === index 
                              ? 'ring-2 ring-[#004225] ring-offset-1 opacity-100' 
                              : 'opacity-50 hover:opacity-80'
                          }`}
                          style={{ width: '72px', height: '48px' }}
                        >
                          <img
                            src={photo.Thumbnail || photo.Image}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/svg%3E';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Flight History Section (from FlightRadar via JetAPI) ── */}
              {flights.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Section Header */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                    <div className="w-0.5 h-4 rounded-full bg-[#004225] shrink-0" />
                    <Navigation className="size-3.5 text-gray-400" />
                    <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Recent Flight Activity</h3>
                    <span className="text-[10px] text-gray-400 ml-auto">{flights.length} flight{flights.length !== 1 ? 's' : ''} tracked</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/30">
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Flight</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">From</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">To</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">STD</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">ATD</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">STA</th>
                          <th className="px-3 py-2 text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">Flight Time</th>
                          <th className="px-3 py-2 text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {flights.map((flight: any, index: number) => {
                          // Determine status styling
                          const statusLower = (flight.Status || '').toLowerCase();
                          const isLanded = statusLower.includes('landed');
                          const isUnknown = statusLower.includes('unknown');
                          const isScheduled = statusLower.includes('scheduled');
                          const isDelayed = statusLower.includes('delayed');
                          const isCancelled = statusLower.includes('cancelled');
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-3 py-2.5 text-[11px] text-gray-700 font-medium whitespace-nowrap">
                                {flight.Date || '—'}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-[11px] font-bold text-[#004225]">
                                  {flight.Flight || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-[11px] font-bold text-gray-800">
                                {flight.From || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-[11px] font-bold text-gray-800">
                                {flight.To || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-gray-600 font-medium tabular-nums">
                                {flight.STD || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-gray-600 font-medium tabular-nums">
                                {flight.ATD || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-gray-600 font-medium tabular-nums">
                                {flight.STA || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="text-[11px] text-gray-500 font-medium tabular-nums">
                                  {flight.FlightTime || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                                  isLanded 
                                    ? 'bg-gray-100 text-gray-600' 
                                    : isScheduled
                                    ? 'bg-blue-50 text-blue-600'
                                    : isDelayed
                                    ? 'bg-orange-50 text-orange-600'
                                    : isCancelled
                                    ? 'bg-red-50 text-red-600'
                                    : isUnknown
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-gray-50 text-gray-500'
                                }`}>
                                  {flight.Status || 'Unknown'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* No Flight Data */}
              {(photos.length > 0 || flightRadar) && flights.length === 0 && !loading && !error && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                    <div className="w-0.5 h-4 rounded-full bg-[#004225] shrink-0" />
                    <Navigation className="size-3.5 text-gray-400" />
                    <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Flight Activity</h3>
                  </div>
                  <div className="px-4 py-8 text-center">
                    <Info className="size-5 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-500 mb-0.5">No Flight Tracking Data</p>
                    <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                      This aircraft may not be actively tracked or operates in private/general aviation
                    </p>
                  </div>
                </div>
              )}

              {/* No Data At All */}
              {photos.length === 0 && !flightRadar && flights.length === 0 && !loading && !error && (
                <div className="border border-dashed border-gray-200 rounded-lg py-12 text-center">
                  <Plane className="size-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-500 mb-0.5">No Data Available</p>
                  <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                    Photos and flight tracking data for this aircraft are not available in the JetAPI database
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}