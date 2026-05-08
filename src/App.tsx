import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const supabase = createClient(
  "https://uktftzmuzgoojrpwgcdi.supabase.co",
  "sb_publishable_W93k0VM9O7M8nkf6Xya2Uw_QFmrahv9"
);

const USER_NAMES: Record<string, string> = {
  "laura@test.com": "Laura",
  "amelia@test.com": "Amelia",
};

const ADMINS = ["laura@test.com"];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [shifts, setShifts] = useState<any[]>([]);

  const [client, setClient] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [suburb, setSuburb] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .order("id", { ascending: false });

    if (data) {
      setShifts(data);
    }
  };

  const login = () => {
    if (password !== "123456") {
      setLoginError("Incorrect password");
      return;
    }

    setLoginError("");

    setSession({
      user: {
        email,
      },
    });
  };

  const logout = () => {
    setSession(null);
  };

  const addShift = async () => {
    if (!client || !date || !time || !suburb) return;

    await supabase.from("shifts").insert([
      {
        client,
        date,
        time,
        endtime: endTime,
        suburb,
        urgent,
        claimedby: null,
      },
    ]);

    setClient("");
    setDate("");
    setTime("");
    setEndTime("");
    setSuburb("");
    setUrgent(false);

    fetchShifts();
  };

  const deleteShift = async (id: number) => {
    await supabase.from("shifts").delete().eq("id", id);
    fetchShifts();
  };

  const claimShift = async (id: number) => {
    await supabase
      .from("shifts")
      .update({
        claimedby: session.user.email,
      })
      .eq("id", id);

    fetchShifts();
  };

  const unclaimShift = async (id: number) => {
    await supabase
      .from("shifts")
      .update({
        claimedby: null,
      })
      .eq("id", id);

    fetchShifts();
  };

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Care Portal</h1>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {loginError && (
            <p style={{ color: "red", marginTop: 10 }}>{loginError}</p>
          )}

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
          <p>Welcome {USER_NAMES[session.user.email]}</p>
        </div>

        <button onClick={logout}>Logout</button>
      </div>

      {isAdmin && (
        <div className="add-shift-card">
          <h2>Add Shift</h2>

          <div className="form-grid">
            <input
              placeholder="Client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />

            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />

            <input
              placeholder="Suburb"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
            />

            <label className="urgent-box">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
              />
              Urgent
            </label>
          </div>

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

                {shift.urgent && (
                  <span className="urgent-badge">URGENT</span>
                )}
              </div>

              <p>{shift.date}</p>

              <p>
                {shift.time}
                {shift.endtime ? ` - ${shift.endtime}` : ""}
              </p>

              <p>{shift.suburb}</p>

              <div className="status-row">
                {covered ? (
                  <span className="covered">
                    Covered by {USER_NAMES[shift.claimedby]}
                  </span>
                ) : (
                  <span className="not-covered">Not Covered</span>
                )}
              </div>

              <div className="button-row">
                {!covered && (
                  <button onClick={() => claimShift(shift.id)}>
                    Claim Shift
                  </button>
                )}

                {shift.claimedby === session.user.email && (
                  <button onClick={() => unclaimShift(shift.id)}>
                    Unclaim
                  </button>
                )}

                {isAdmin && (
                  <button onClick={() => deleteShift(shift.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}