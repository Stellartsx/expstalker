import Glass from "../ui/Glass";

export default function Home() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Glass className="p-5">
        <div className="text-lg font-semibold">Welcome</div>
        <div className="text-sm opacity-80 mt-2 leading-relaxed">
          Apex Live supports STB (Stalker/MAG portals), remote M3U playlists, and XMLTV EPG including .xml.gz.
          It includes an inbuilt server-side proxy to eliminate browser CORS failures during fetch and playback.
        </div>
      </Glass>

      <Glass className="p-5">
        <div className="text-lg font-semibold">Quick workflow</div>
        <div className="text-sm opacity-80 mt-2 leading-relaxed">
          1) Add Sources (Portal/M3U/EPG) → 2) Refresh/Sync channels → 3) Open Live and play.
          Optional: enable Supabase in Storage for cross-device sync.
        </div>
      </Glass>
    </div>
  );
}
