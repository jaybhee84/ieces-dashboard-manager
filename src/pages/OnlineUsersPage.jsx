export default function OnlineUsersPage({ onlineUsers }) {
  return (
    <section className="panel-card">
      <header><div><p className="eyebrow">Live activity</p><h2>Online Users</h2><p>Monitor active sessions across IECES applications.</p></div><span className="status-pill"><i/> {onlineUsers.length} online</span></header>
      {onlineUsers.length === 0 ? (
        <p>No users are currently online.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {onlineUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.status}</td>
                  <td>{new Date(user.last_seen).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
