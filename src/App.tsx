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
  const [availability, setAvailability] = useState<any[]>([]);

  const [client, setClient] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [suburb, setSuburb] = useState("");
  const [urgent, setUrgent] = useState(false);

  const [availDate, setAvailDate] = useState("");
  const [availStart, setAvailStart] = useState("");
  const [availEnd, setAvailEnd] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    fetchShifts();
    fetchAvailability();
  }, []);

  const fetchShifts = async () => {
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .order("id", { ascending: false });

    setShifts(data || []);
  };

  const fetchAvailability = async () => {
    const { data } = await supabase
      .from("availability")
      .select("*")
      .order("id", { ascending: false });

    setAvailability(data || []);
  };

  const login = async () => {
    setLoginError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error || !data.session) {
      setLoginError("Incorrect email or password");
      return;
    }

    setSession(data.session);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const addShift = async () => {
    await supabase.from("shifts").insert({
      client,
      date,
      time,
      endtime: endTime,
      suburb,
      urgent,
      claimedby: null,
    });

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

  const deleteShift = async (id: number) => {
    await supabase.from("shifts").delete().eq("id", id);

    fetchShifts();
  };

  const addAvailability = async () => {
    await supabase.from("availability").insert({
      email: session.user.email,
      date: availDate,
      starttime: availStart,
      endtime: availEnd,
    });

    setAvailDate("");
    setAvailStart("");
    setAvailEnd("");

    fetchAvailability();
  };

  const getMatchingCarers = (shift: any) => {
    return availability.filter((item) => {
      return (
        item.date === shift.date &&
        item.starttime <= shift.time &&
        item.endtime >= shift.endtime
      );
    });
  };

  const isAdmin = ADMINS.includes(session?.user?.email);

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

          {loginError && (
            <div className="error-text">{loginError}</div>
          )}

          <button onClick={login}>Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>Care Portal</h1>
          <p>
            Welcome {USER_NAMES[session.user.email] || session.user.email}
            {isAdmin ? " (Admin)" : " (Carer)"}
          </p>
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

      <div className="add-shift-card">
        <h2>My Availability</h2>

        <div className="form-grid">
          <input
            type="date"
            value={availDate}
            onChange={(e) => setAvailDate(e.target.value)}
          />

          <input
            type="time"
            value={availStart}
            onChange={(e) => setAvailStart(e.target.value)}
          />

          <input
            type="time"
            value={availEnd}
            onChange={(e) => setAvailEnd(e.target.value)}
          />
        </div>

        <button className="primary-btn" onClick={addAvailability}>
          Submit Availability
        </button>
      </div>

      <div className="shift-list">
        {shifts.map((shift) => {
          const isMine = shift.claimedby === session.user.email;

          const matches = getMatchingCarers(shift);

          return (
            <div className="shift-card" key={shift.id}>
              <div className="shift-header">
                <h2>{shift.client}</h2>

                {shift.urgent && (
                  <span className="urgent-badge">
                    URGENT
                  </span>
                )}
              </div>

              <p>{shift.date}</p>

              <p>
                {shift.time} - {shift.endtime}
              </p>

              <p>{shift.suburb}</p>

              {shift.claimedby ? (
                <p className="covered">
                  Covered by{" "}
                  {USER_NAMES[shift.claimedby] ||
                    shift.claimedby}
                </p>
              ) : (
                <p className="not-covered">
                  Not Covered
                </p>
              )}

              {matches.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <strong>Available carers:</strong>

                  {matches.map((match) => (
                    <p key={match.id}>
                      • {USER_NAMES[match.email] || match.email}
                    </p>
                  ))}
                </div>
              )}

              <div className="button-row">
                {!shift.claimedby && (
                  <button
                    onClick={() => claimShift(shift.id)}
                  >
                    Claim Shift
                  </button>
                )}

                {isMine && (
                  <button
                    onClick={() => unclaimShift(shift.id)}
                  >
                    Unclaim
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => deleteShift(shift.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="add-shift-card">
        <h2>Availability Submitted</h2>

        {availability.map((item) => (
          <div
            key={item.id}
            style={{
              borderBottom: "1px solid #ddd",
              padding: "10px 0",
            }}
          >
            <p>
              <strong>
                {USER_NAMES[item.email] || item.email}
              </strong>
            </p>

            <p>{item.date}</p>

            <p>
              {item.starttime} - {item.endtime}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}