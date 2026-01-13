import { useState } from "react";
import { loadState, saveState, supabasePull, supabasePush } from "../lib/storage";
import { Btn, Field, Input } from "../ui/Controls";
import { Card } from "../ui/List";

export default function Storage() {
  const [state, setState] = useState(() => loadState());
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");

  const push = async () => {
    setMsg("");
    try {
      if (!key.trim()) throw new Error("Key required");
      await supabasePush(state, key.trim());
      setMsg("Pushed to Supabase");
    } catch (e: any) {
      setMsg(String(e?.message || e));
    }
  };

  const pull = async () => {
    setMsg("");
    try {
      if (!key.trim()) throw new Error("Key required");
      const remote = await supabasePull(key.trim());
      setState(remote);
      saveState(remote);
      setMsg("Pulled from Supabase");
    } catch (e: any) {
      setMsg(String(e?.message || e));
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <div className="text-lg font-semibold">Optional Supabase Sync</div>
        <div className="text-sm opacity-80 mt-2 leading-relaxed">
          Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.
          Create table apex_live with columns: key (text primary key), payload (jsonb).
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <Field label="Sync key">
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. raam-main" />
          </Field>
          <div className="flex gap-2">
            <Btn tone="primary" onClick={push}>
              Push
            </Btn>
            <Btn onClick={pull}>Pull</Btn>
          </div>
          {msg ? <div className="text-sm opacity-85">{msg}</div> : null}
        </div>
      </Card>
    </div>
  );
}
