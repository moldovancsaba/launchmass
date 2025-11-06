/**
 * pages/admin/users.js
 * 
 * WHAT: Admin page to manage user access and roles
 * WHY: Superadmins need to approve/deny access requests and manage user roles
 * HOW: Lists users with pending requests, allows role changes, shows access history
 */

import { useState, useEffect } from 'react';
import { validateSsoSession } from '../../lib/auth-oauth';

export default function AdminUsers({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'all' | 'pending' | 'active'
  const [message, setMessage] = useState({ type: '', text: '' });

  // WHAT: Load users from local database
  // WHY: Show all users who have attempted to access launchmass
  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?filter=${filter}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load users');
      }

      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filter]);

  // WHAT: Grant access to a user with specified role
  // WHY: Admin approval workflow
  const handleGrantAccess = async (ssoUserId, role) => {
    try {
      const res = await fetch(`/api/admin/users/${ssoUserId}/grant-access`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to grant access');
      }

      setMessage({ type: 'success', text: `Access granted with ${role} role` });
      loadUsers(); // Refresh list
    } catch (error) {
      console.error('Error granting access:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  // WHAT: Revoke user's access
  // WHY: Remove access from users who should no longer have it
  const handleRevokeAccess = async (ssoUserId) => {
    if (!confirm('Are you sure you want to revoke this user\'s access?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${ssoUserId}/revoke-access`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to revoke access');
      }

      setMessage({ type: 'success', text: 'Access revoked' });
      loadUsers();
    } catch (error) {
      console.error('Error revoking access:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  // WHAT: Change user's role
  // WHY: Upgrade/downgrade user permissions
  const handleChangeRole = async (ssoUserId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${ssoUserId}/change-role`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to change role');
      }

      setMessage({ type: 'success', text: `Role changed to ${newRole}` });
      loadUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  // WHAT: Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // WHAT: Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#1e895a';
      case 'pending': return '#8a6d3b';
      case 'revoked': return '#8b3a3a';
      default: return '#666';
    }
  };

  // WHAT: Get role badge color
  const getRoleColor = (role) => {
    switch (role) {
      case 'superadmin': return '#4054d6';
      case 'admin': return '#5a6d8a';
      case 'user': return '#3a5a3a';
      default: return '#666';
    }
  };

  const pendingCount = users.filter(u => u.appStatus === 'pending').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1021', color: '#e6e8f2', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Current User Display */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#12172b', border: '1px solid #22284a', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Logged in as:</span>
            <span style={{ fontWeight: '600' }}>{currentUser?.name || currentUser?.email || 'Unknown User'}</span>
            {currentUser?.email && currentUser?.name && (
              <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>({currentUser.email})</span>
            )}
            {currentUser?.appRole && (
              <span style={{
                padding: '0.25rem 0.75rem',
                background: getRoleColor(currentUser.appRole),
                borderRadius: '12px',
                fontSize: '0.8rem',
                textTransform: 'capitalize',
              }}>
                {currentUser.appRole}
              </span>
            )}
          </div>
        </div>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', fontWeight: '600' }}>
            User Management
          </h1>
          <p style={{ margin: 0, opacity: 0.7 }}>
            Approve access requests and manage user roles
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            background: message.type === 'error' ? '#3a1a1a' : '#1a3a1a',
            border: `1px solid ${message.type === 'error' ? '#8b3a3a' : '#3a8b3a'}`,
            borderRadius: '8px',
          }}>
            {message.text}
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                color: '#e6e8f2',
                cursor: 'pointer',
                fontSize: '1.2rem',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {['all', 'pending', 'active'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.5rem 1rem',
                background: filter === f ? '#4054d6' : '#24306b',
                color: 'white',
                border: 0,
                borderRadius: '6px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f}
              {f === 'pending' && pendingCount > 0 && (
                <span style={{
                  marginLeft: '0.5rem',
                  padding: '0.15rem 0.5rem',
                  background: '#8a6d3b',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Users Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: '#12172b',
            border: '1px solid #22284a',
            borderRadius: '8px',
          }}>
            <p style={{ margin: 0, opacity: 0.7 }}>
              No users found
            </p>
          </div>
        ) : (
          <div style={{
            background: '#12172b',
            border: '1px solid #22284a',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0e1733', borderBottom: '1px solid #22284a' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500' }}>User</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500' }}>Role</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500' }}>Requested</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500' }}>Last Login</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '500' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr
                    key={user.ssoUserId}
                    style={{
                      borderBottom: index < users.length - 1 ? '1px solid #22284a' : 'none',
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '500' }}>{user.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{user.email}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: getStatusColor(user.appStatus),
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        textTransform: 'capitalize',
                      }}>
                        {user.appStatus || 'unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: getRoleColor(user.appRole),
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        textTransform: 'capitalize',
                      }}>
                        {user.appRole || 'none'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {user.appStatus === 'pending' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <select
                            onChange={(e) => handleGrantAccess(user.ssoUserId, e.target.value)}
                            defaultValue=""
                            style={{
                              padding: '0.4rem 0.75rem',
                              background: '#1e895a',
                              color: 'white',
                              border: 0,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            <option value="" disabled>Grant as...</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Superadmin</option>
                          </select>
                        </div>
                      ) : user.appStatus === 'active' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <select
                            value={user.appRole}
                            onChange={(e) => handleChangeRole(user.ssoUserId, e.target.value)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              background: '#24306b',
                              color: 'white',
                              border: 0,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Superadmin</option>
                          </select>
                          <button
                            onClick={() => handleRevokeAccess(user.ssoUserId)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              background: '#8b3a3a',
                              color: 'white',
                              border: 0,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            Revoke
                          </button>
                        </div>
                      ) : (
                        <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Back Link */}
        <div style={{ marginTop: '2rem' }}>
          <a
            href="/admin"
            style={{
              color: '#4054d6',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            ← Back to Admin
          </a>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ req }) {
  // WHAT: Check if user has admin access
  // WHY: Only admins can manage users
  const { isValid, user } = await validateSsoSession(req);

  if (!isValid) {
    return {
      redirect: {
        destination: '/?error=unauthorized',
        permanent: false,
      },
    };
  }

  // WHAT: Pass current user info to component
  // WHY: Display who is logged in and their role
  return {
    props: {
      currentUser: {
        name: user?.name || '',
        email: user?.email || '',
        ssoUserId: user?.id || user?.ssoUserId || '',
        appRole: user?.appRole || 'user',
      },
    },
  };
}
