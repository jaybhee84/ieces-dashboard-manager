export default function UserManagementPage({ users, refreshUsers, addToast }) {
  const handleResetPassword = async (email) => {
    try {
      const { error } = await window.supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      addToast(`Password reset email sent to ${email}.`, "success");
    } catch (e) {
      addToast(e.message || "Could not send password reset email.", "error");
    }
  };

  return (
    <section className="panel-card">
      <header>
        <div><p className="eyebrow">Management</p><h2>User Management</h2><p>Manage access and account recovery for IECES users.</p></div>
        <button onClick={refreshUsers}>Refresh users</button>
      </header>
      {users.length === 0 ? (
        <p>No users available to manage.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.full_name || "—"}</td>
                  <td>{user.role || "user"}</td>
                  <td>{user.status || "active"}</td>
                  <td>
                    <button onClick={() => handleResetPassword(user.email)}>
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
