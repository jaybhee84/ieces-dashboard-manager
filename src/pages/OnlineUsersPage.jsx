export default function OnlineUsersPage({ onlineUsers }) {
  return (
    <section className="panel-card">
      <h2>Online Users</h2>
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
