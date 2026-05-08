import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

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
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [shifts, setShifts] = useState<any[]>([]);
  const [client, setClient] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [suburb, setSuburb] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("id", { ascending: false });

    if (!error) setShifts(data || []);
  };

  const getName = (email: string) => USER_NAMES[email] || email || "";

  const login = async () => {
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError("Incorrect email or password.");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const addShift = async () => {
    setFormError("");

    if (!client || !date || !time || !endTime || !suburb) {
      setFormError("Please fill in client, date, start time, end time and suburb.");
      return;
    }

    const { error } = await supabase.from("shifts").insert({
      client,
      date,
      time,
      endtime: endTime,
      suburb,
      urgent,
      claimedby: null,
      requestedby: session.user.email,
    });

    if (error) {
      setFormError("Shift could not be added. Please try again.");
      return;
    }

    setClient("");
    setDate("");
    setTime("");
    setEndTime("");
    setSuburb("");
    setUrgent(false);

    fetchShifts();
  };

  const claimShift = async (id: number) => {
    await supabase
      .from("shifts")
      .update({ claimedby: session.user.email })
      .eq("id", id);

    fetchShifts();
  };

  const unclaimShift = async (id: number) => {
    await supabase
      .from("shifts")
      .update({ claimedby: null })
      .eq("id", id);

    fetchShifts();
  };

  const deleteShift = async (id: number) => {
    if (!confirm("Delete this shift?")) return;

    await supabase.from("shifts").delete().eq("id", id);
    fetchShifts();
  };

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Care Portal</h1>

          <input
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />

          {loginError && <p style={{ color: "red" }}>{loginError}</p>}

          <button onClick={login}>Login</button>
        </div>
      </div>
    );
  }

  const isAdmin = ADMINS.includes(session.user.email);

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>Care Portal</h1>
          <p>Welcome {getName(session.user.email)}</p>
        </div>

        <button onClick={logout}>Logout</button>
      </div>

      {isAdmin && (
        <div className="add-shift-card">
          <h2>Add Shift</h2>

          <div className="form-grid">
            <input placeholder="Client" value={client} onChange={(e) => setClient(e.target.value)} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <input placeholder="Suburb" value={suburb} onChange={(e) => setSuburb(e.target.value)} />

            <label className="urgent-box">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
              Urgent
            </label>
          </div>

          {formError && <p style={{ color: "red" }}>{formError}</p>}

          <button className="primary-btn" onClick={addShift}>
            Add Shift
          </button>
        </div>
      )}

      <div className="shift-list">
        {shifts.map((shift) => {
          const covered = !!shift.claimedby;

          return (
            <div className="shift-card" key={shift.id}>
              <div className="shift-header">
                <h2>{shift.client}</h2>
                {shift.urgent && <span className="urgent-badge">URGENT</span>}
              </div>

              <p>{shift.date}</p>
              <p>{shift.time} {shift.endtime ? `- ${shift.endtime}` : ""}</p>
              <p>{shift.suburb}</p>

              {covered ? (
                <p className="covered">Covered by {getName(shift.claimedby)}</p>
              ) : (
                <p className="not-covered">Not Covered</p>
              )}

              <div className="button-row">
                {!covered && <button onClick={() => claimShift(shift.id)}>Claim Shift</button>}

                {shift.claimedby === session.user.email && (
                  <button onClick={() => unclaimShift(shift.id)}>Unclaim</button>
                )}

                {isAdmin && <button onClick={() => deleteShift(shift.id)}>Delete</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}