import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://uktftzmuzgoojrpwgcdi.supabase.co",
  "sb_publishable_W93k0VM907M8nkf6Xya2Uw_QFmrahv9"
);

const USER_NAMES: Record<string, string> = {
  "laura@test.com": "Laura",
  "amelia@test.com": "Amelia",
};

const ADMINS = ["laura@test.com"];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const [client, setClient] = useState("");
  const [date, setDate] = useState("");
  const [starttime, setStarttime] = useState("");
  const [endtime, setEndtime] = useState("");
  const [suburb, setSuburb] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    fetchShifts();
    fetchAvailability();
  }, []);

  const fetchShifts = async () => {
    const { data } = await supabase.from("shifts").select("*").order("id", { ascending: false });
    setShifts(data || []);
  };

  const fetchAvailability = async () => {
    const { data } = await supabase.from("availability").select("*");
    setAvailability(data || []);
  };

  const getName = (email: string) => USER_NAMES[email] || email || "";

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hour, minute] = time.split(":");
    let h = parseInt(hour);
    const ampm = h >= 12 ? "pm" : "am";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${minute}${ampm}`;
  };

  const addShift = async () => {
    if (!client || !date || !starttime || !endtime) return;

    await supabase.from("shifts").insert({
      client,
      date,
      time: starttime,
      endtime,
      suburb,
      urgent,
      requestedby: session.user.email,
      claimedby: null,
    });

    setClient("");
    setDate("");
    setStarttime("");
    setEndtime("");
    setSuburb("");
    setUrgent(false);

    fetchShifts();
  };

  const deleteShift = async (id: number) => {
    if (!confirm("Delete this shift?")) return;
    await supabase.from("shifts").delete().eq("id", id);
    fetchShifts();
  };

  const startEdit = (shift: any) => {
    setEditingId(shift.id);
    setEditData({ ...shift });
  };

  const saveEdit = async () => {
    await supabase
      .from("shifts")
      .update(editData)
      .eq("id", editingId);

    setEditingId(null);
    fetchShifts();
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const claimShift = async (id: number) => {
    await supabase.from("shifts").update({ claimedby: session.user.email }).eq("id", id);
    fetchShifts();
  };

  const unclaimShift = async (id: number) => {
    await supabase.from("shifts").update({ claimedby: null }).eq("id", id);
    fetchShifts();
  };

  const getMatches = (shift: any) => {
    return availability.filter(
      (a) =>
        a.date === shift.date &&
        a.starttime <= shift.time &&
        a.endtime >= shift.endtime
    );
  };

  if (!session) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <h2>Login</h2>
        <button
          onClick={async () => {
            const email = prompt("Email");
            const password = prompt("Password");
            await supabase.auth.signInWithPassword({ email: email!, password: password! });
          }}
        >
          Login
        </button>
      </div>
    );
  }

  const isAdmin = ADMINS.includes(session.user.email);

  return (
    <div style={{ padding: 20, maxWidth: 650, margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Care Portal</h2>

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        {getName(session.user.email)}
        <br />
        <button onClick={() => supabase.auth.signOut()}>Logout</button>
      </div>

      {isAdmin && (
        <>
          <h3>Add Shift</h3>
          <input placeholder="Client" value={client} onChange={(e) => setClient(e.target.value)} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="time" value={starttime} onChange={(e) => setStarttime(e.target.value)} />
          <input type="time" value={endtime} onChange={(e) => setEndtime(e.target.value)} />
          <input placeholder="Suburb" value={suburb} onChange={(e) => setSuburb(e.target.value)} />

          <label>
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            Urgent
          </label>

          <button onClick={addShift}>Add Shift</button>
        </>
      )}

      <hr />

      {shifts.map((shift) => {
        const matches = getMatches(shift);
        const isEditing = editingId === shift.id;

        return (
          <div key={shift.id} style={{ border: "1px solid #ddd", padding: 15, marginBottom: 15 }}>

            {isEditing ? (
              <>
                <input value={editData.client} onChange={(e) => setEditData({ ...editData, client: e.target.value })} />
                <input type="date" value={editData.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} />
                <input type="time" value={editData.time} onChange={(e) => setEditData({ ...editData, time: e.target.value })} />
                <input type="time" value={editData.endtime} onChange={(e) => setEditData({ ...editData, endtime: e.target.value })} />
                <input value={editData.suburb} onChange={(e) => setEditData({ ...editData, suburb: e.target.value })} />

                <button onClick={saveEdit}>Save</button>
                <button onClick={cancelEdit}>Cancel</button>
              </>
            ) : (
              <>
                <h3>{shift.client}</h3>
                <p>{shift.date}</p>
                <p>{formatTime(shift.time)} – {formatTime(shift.endtime)}</p>

                {!shift.claimedby ? (
                  <button onClick={() => claimShift(shift.id)}>Claim</button>
                ) : (
                  <p>Covered by {getName(shift.claimedby)}</p>
                )}

                {isAdmin && (
                  <>
                    <button onClick={() => startEdit(shift)}>Edit</button>
                    <button onClick={() => deleteShift(shift.id)}>Delete</button>
                  </>
                )}

                {matches.length > 0 && (
                  <div>
                    Available:
                    {matches.map((m) => (
                      <div key={m.id}>{getName(m.email)}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}