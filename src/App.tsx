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

function normaliseDate(dateValue: string) {
  if (!dateValue) return "";

  if (dateValue.includes("-")) return dateValue;

  const parts = dateValue.split("/");

  if (parts.length === 3) {
    const [day, month, year] = parts;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(
      2,
      "0"
    )}`;
  }

  return dateValue;
}

function formatTime(timeValue: string) {
  if (!timeValue) return "";

  const [hourText, minuteText] = timeValue.split(":");

  let hour = Number(hourText);

  const minute = minuteText || "00";

  const ampm = hour >= 12 ? "pm" : "am";

  if (hour === 0) hour = 12;
  if (hour > 12) hour -= 12;

  return `${hour}:${minute}${ampm}`;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("shifts");
  const [calendarView, setCalendarView] = useState("week");
  const [calendarStartOffset, setCalendarStartOffset] = useState(0);
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

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    fetchShifts();
    fetchAvailability();
  }, []);

  const fetchShifts = async () => {
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .order("date", { ascending: true });

    setShifts(data || []);
  };

  const fetchAvailability = async () => {
    const { data } = await supabase
      .from("availability")
      .select("*")
      .order("date", { ascending: true });

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
    if (!client || !date || !time || !endTime || !suburb) {
      alert("Please fill in all shift details.");
      return;
    }

    await supabase.from("shifts").insert({
      client,
      date: normaliseDate(date),
      time,
      endtime: endTime,
      suburb,
      urgent,
      claimedby: null,
      requestedby: session.user.email,
    });

    setClient("");
    setDate("");
    setTime("");
    setEndTime("");
    setSuburb("");
    setUrgent(false);

    fetchShifts();
  };

  const addAvailability = async () => {
    if (!availDate || !availStart || !availEnd) {
      alert("Please complete availability fields.");
      return;
    }

    const { error } = await supabase.from("availability").insert({
      email: session.user.email,
      date: normaliseDate(availDate),
      starttime: availStart,
      endtime: availEnd,
    });

    if (error) {
      alert("Availability could not be saved.");
      return;
    }

    setAvailDate("");
    setAvailStart("");
    setAvailEnd("");

    fetchAvailability();

    alert("Availability submitted.");
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
    if (!confirm("Delete this shift?")) return;

    await supabase.from("shifts").delete().eq("id", id);

    fetchShifts();
  };

  const getMatchingCarers = (shift: any) => {
    return availability.filter((item) => {
      return normaliseDate(item.date) === normaliseDate(shift.date);
    });
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

          {loginError && (
            <div className="error-text">{loginError}</div>
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

          <p className="subtitle">
            Welcome{" "}
            {USER_NAMES[session.user.email] ||
              session.user.email}
            {isAdmin ? " (Admin)" : " (Carer)"}
          </p>
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="tabs">
        <button
          className={
            activeTab === "shifts"
              ? "tab active-tab"
              : "tab"
          }
          onClick={() => setActiveTab("shifts")}
        >
          Shifts
        </button>

        <button
          className={
            activeTab === "availability"
              ? "tab active-tab"
              : "tab"
          }
          onClick={() => setActiveTab("availability")}
        >
          Availability
        </button>

        <button
          className={
            activeTab === "calendar"
              ? "tab active-tab"
              : "tab"
          }
          onClick={() => setActiveTab("calendar")}
        >
          Calendar
        </button>
        <button
  className={
    activeTab === "myshifts"
      ? "tab active-tab"
      : "tab"
  }
  onClick={() => setActiveTab("myshifts")}
>
  My Shifts
</button>

        {isAdmin && (
          <button
            className={
              activeTab === "admin"
                ? "tab active-tab"
                : "tab"
            }
            onClick={() => setActiveTab("admin")}
          >
            Admin
          </button>
        )}
      </div>

      {activeTab === "admin" && isAdmin && (
        <div className="card">
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
                onChange={(e) =>
                  setUrgent(e.target.checked)
                }
              />
              Urgent
            </label>
          </div>

          <button onClick={addShift}>Add Shift</button>
        </div>
      )}

      {activeTab === "availability" && (
        <>
          <div className="card">
            <h2>My Availability</h2>

            <div className="form-grid">
              <input
                type="date"
                value={availDate}
                onChange={(e) =>
                  setAvailDate(e.target.value)
                }
              />

              <input
                type="time"
                value={availStart}
                onChange={(e) =>
                  setAvailStart(e.target.value)
                }
              />

              <input
                type="time"
                value={availEnd}
                onChange={(e) =>
                  setAvailEnd(e.target.value)
                }
              />
            </div>

            <button onClick={addAvailability}>
              Submit Availability
            </button>
          </div>

          <div className="availability-card">
            <h2>Availability Submitted</h2>

            {availability.length === 0 && (
              <p>No availability submitted yet.</p>
            )}

            {availability.map((item) => (
              <div key={item.id}>
                <p>
                  <strong>
                    {USER_NAMES[item.email] ||
                      item.email}
                  </strong>
                </p>

                <p>{normaliseDate(item.date)}</p>

                <p>
                  {formatTime(item.starttime)} –{" "}
                  {formatTime(item.endtime)}
                </p>

                <hr />
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "calendar" && (
  <div className="calendar-page">
<div className="calendar-controls">
  <button
    className={calendarView === "week" ? "active-calendar-btn" : ""}
    onClick={() => setCalendarView("week")}
  >
    Week
  </button>

  <button
    className={calendarView === "2weeks" ? "active-calendar-btn" : ""}
    onClick={() => setCalendarView("2weeks")}
  >
    2 Weeks
  </button>

  <button
    className={calendarView === "month" ? "active-calendar-btn" : ""}
    onClick={() => setCalendarView("month")}
  >
    Month
  </button>
</div>
<div className="calendar-nav">
  <button
    onClick={() =>
      setCalendarStartOffset(
        calendarStartOffset -
          (calendarView === "week" ? 7 : calendarView === "2weeks" ? 14 : 30)
      )
    }
  >
    Previous
  </button>

  <button onClick={() => setCalendarStartOffset(0)}>Today</button>

  <button
    onClick={() =>
      setCalendarStartOffset(
        calendarStartOffset +
          (calendarView === "week" ? 7 : calendarView === "2weeks" ? 14 : 30)
      )
    }
  >
    Next
  </button>
</div>
<p className="calendar-view-label">
  Showing{" "}
  {calendarView === "week"
    ? "7 days"
    : calendarView === "2weeks"
    ? "14 days"
    : "30 days"}
</p>
    <div className="calendar-grid">
    {Array.from({
  length:
    calendarView === "week"
      ? 7
      : calendarView === "2weeks"
      ? 14
      : 30,
}).map((_, index) => {
  const today = new Date();

  const dayDate = new Date();
  dayDate.setDate(today.getDate() + calendarStartOffset + index);

        const formattedDate = dayDate
          .toISOString()
          .split("T")[0];

        const dayShifts = shifts.filter(
          (shift) =>
            normaliseDate(shift.date) ===
            formattedDate
        );

        return (
          <div
            className="calendar-day"
            key={formattedDate}
          >
            <h3>
              {dayDate.toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </h3>

            {dayShifts.length === 0 && (
              <p className="no-shifts">
                No shifts
              </p>
            )}

            {dayShifts.map((shift) => (
              <div
                className="calendar-shift"
                key={shift.id}
              >
                <strong>{shift.client}</strong>

                <p>
                  {formatTime(shift.time)} –{" "}
                  {formatTime(shift.endtime)}
                </p>

                <p>{shift.suburb}</p>

                {shift.claimedby ? (
                  <p className="covered">
                    Covered
                  </p>
                ) : (
                  <p className="not-covered">
                    Not Covered
                  </p>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  </div>
)}
{activeTab === "myshifts" && (
  <div className="shift-list">
    {shifts
      .filter(
        (shift) =>
          shift.claimedby === session.user.email
      )
      .map((shift) => (
        <div
          className="shift-card"
          key={shift.id}
        >
          <h2>{shift.client}</h2>

          <p>{normaliseDate(shift.date)}</p>

          <p>
            {formatTime(shift.time)} –{" "}
            {formatTime(shift.endtime)}
          </p>

          <p>{shift.suburb}</p>

          <p className="covered">
            Claimed by You
          </p>

          <button
            onClick={() =>
              unclaimShift(shift.id)
            }
          >
            Unclaim Shift
          </button>
        </div>
      ))}

    {shifts.filter(
      (shift) =>
        shift.claimedby === session.user.email
    ).length === 0 && (
      <div className="card">
        <h2>No claimed shifts</h2>

        <p>
          Any shifts you claim will appear
          here.
        </p>
      </div>
    )}
  </div>
)}
      {activeTab === "shifts" && (
        <div className="shift-list">
          {shifts.map((shift) => {
            const isMine =
              shift.claimedby === session.user.email;

            const matches =
              getMatchingCarers(shift);

            return (
              <div
                className="shift-card"
                key={shift.id}
              >
                <div className="shift-header">
                  <h2>{shift.client}</h2>

                  {shift.urgent && (
                    <span className="urgent-badge">
                      URGENT
                    </span>
                  )}
                </div>

                <p>{normaliseDate(shift.date)}</p>

                <p>
                  {formatTime(shift.time)} –{" "}
                  {formatTime(shift.endtime)}
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
                  <div className="available-box">
                    <strong>
                      Available carers:
                    </strong>

                    {matches.map((match) => (
                      <p key={match.id}>
                        •{" "}
                        {USER_NAMES[match.email] ||
                          match.email}
                      </p>
                    ))}
                  </div>
                )}

                <div className="claim-buttons">
                  {!shift.claimedby && (
                    <button
                      onClick={() =>
                        claimShift(shift.id)
                      }
                    >
                      Claim Shift
                    </button>
                  )}

                  {isMine && (
                    <button
                      onClick={() =>
                        unclaimShift(shift.id)
                      }
                    >
                      Unclaim
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() =>
                        deleteShift(shift.id)
                      }
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}