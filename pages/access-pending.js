/**
 * pages/access-pending.js
 * 
 * WHAT: Page shown to users whose access request is pending admin approval
 * WHY: Informs users their request is being reviewed and provides support contact
 * HOW: Displays status, request time, and next steps
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function AccessPending() {
  const router = useRouter();
  const { status, requested } = router.query;
  const [requestedDate, setRequestedDate] = useState(null);

  useEffect(() => {
    if (requested) {
      try {
        setRequestedDate(new Date(requested));
      } catch (e) {
        console.error('Invalid requested date:', e);
      }
    }
  }, [requested]);

  // WHAT: Format the date for display
  // WHY: User-friendly date format
  const formatDate = (date) => {
    if (!date) return 'Just now';
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: '#0b1021',
      color: '#e6e8f2',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#12172b',
        border: '1px solid #22284a',
        borderRadius: '12px',
        padding: '2rem',
      }}>
        {/* Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 1.5rem',
          background: '#1e2746',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
        }}>
          🔒
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 0.5rem',
          fontSize: '1.75rem',
          fontWeight: '600',
          textAlign: 'center',
        }}>
          Access Pending
        </h1>

        {/* Status */}
        <p style={{
          margin: '0 0 2rem',
          textAlign: 'center',
          opacity: 0.8,
          fontSize: '0.95rem',
        }}>
          Your request to access Launchmass is being reviewed
        </p>

        {/* Info Box */}
        <div style={{
          padding: '1.25rem',
          background: '#0e1733',
          border: '1px solid #24306b',
          borderRadius: '8px',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{
            margin: '0 0 1rem',
            fontSize: '1rem',
            fontWeight: '500',
          }}>
            What happens next?
          </h2>
          <ol style={{
            margin: 0,
            paddingLeft: '1.25rem',
            fontSize: '0.9rem',
            lineHeight: '1.6',
            opacity: 0.9,
          }}>
            <li style={{ marginBottom: '0.5rem' }}>
              An administrator will review your request
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              You'll receive an email once access is granted
            </li>
            <li>
              You can then log in and start using Launchmass
            </li>
          </ol>
        </div>

        {/* Request Details */}
        <div style={{
          padding: '1rem',
          background: '#0b1021',
          border: '1px solid #22284a',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
        }}>
          <div style={{ marginBottom: '0.5rem', opacity: 0.7 }}>
            <strong>Status:</strong>{' '}
            <span style={{
              display: 'inline-block',
              padding: '0.15rem 0.5rem',
              background: status === 'pending' ? '#4a5520' : '#3a3a3a',
              borderRadius: '4px',
              marginLeft: '0.5rem',
            }}>
              {status === 'pending' ? 'Pending Review' : status || 'Unknown'}
            </span>
          </div>
          <div style={{ opacity: 0.7 }}>
            <strong>Requested on:</strong> {formatDate(requestedDate)}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}>
          <button
            onClick={() => router.push('/')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#24306b',
              color: 'white',
              border: 0,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            Return to Home
          </button>
          <button
            onClick={() => {
              // WHAT: Clear SSO session cookie and redirect to home
              // WHY: User may want to try different account
              document.cookie = 'sso_session=; Max-Age=0; Path=/; Domain=.doneisbetter.com';
              router.push('/');
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              color: '#8b9dc3',
              border: '1px solid #4054d6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            Logout
          </button>
        </div>

        {/* Support */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.85rem',
          opacity: 0.7,
        }}>
          Need help?{' '}
          <a
            href="mailto:support@doneisbetter.com"
            style={{
              color: '#4054d6',
              textDecoration: 'none',
            }}
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
