import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfileRequest } from '../api/users';
import { sendChatRequestApi, cancelRequestApi } from '../api/chatRequests';
import { blockUserRequest, unblockUserRequest } from '../api/blocks';
import { createReportRequest } from '../api/reports';
import { Avatar } from '../components/Avatar';
import { StatusDot } from '../components/StatusDot';
import { RelationshipAction } from '../components/RelationshipAction';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { TextArea } from '../components/FormField';
import { ChevronLeftIcon } from '../components/Icons';

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [user, setUser] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [id]);

  function loadProfile() {
    setLoading(true);
    setError('');
    return getUserProfileRequest(id)
      .then((data) => {
        setUser(data.user);
        setRelationship(data.relationship);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }

  async function handleSend() {
    setBusy(true);
    try {
      const { request, conversation } = await sendChatRequestApi(id);
      if (conversation) {
        navigate(`/chats/${conversation.id}`);
        return;
      }
      setRelationship({ status: 'pending_outgoing', requestId: request.id });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send chat request.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!relationship?.requestId) return;
    setBusy(true);
    try {
      await cancelRequestApi(relationship.requestId);
      setRelationship({ status: 'none' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel chat request.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleBlock() {
    const isBlockedByMe = relationship?.status === 'blocked_by_me';
    setBlockBusy(true);
    setError('');
    try {
      if (isBlockedByMe) {
        await unblockUserRequest(id);
      } else {
        await blockUserRequest(id);
      }
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update block status.');
    } finally {
      setBlockBusy(false);
    }
  }

  async function handleSubmitReport() {
    if (!reportReason.trim()) return;
    setReportBusy(true);
    setError('');
    try {
      await createReportRequest({ reportedUserId: id, reason: reportReason.trim() });
      setReportSent(true);
      setReportOpen(false);
      setReportReason('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report.');
    } finally {
      setReportBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8 text-sm text-[var(--color-ink-muted)]">Loading…</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8 text-sm text-danger-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink-soft)]"
        >
          <ChevronLeftIcon className="h-4 w-4" /> Back
        </button>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar name={user.name} profileImage={user.profile_image} size={64} />
              <span className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={user.status} />
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-ink">{user.name}</h1>
              <p className="text-sm text-[var(--color-ink-muted)]">{user.email}</p>
              <p className="text-sm text-[var(--color-ink-muted)]">{user.department_name || 'No department'}</p>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>
          )}

          {relationship?.status !== 'self' && (
            <div className="mt-6 flex items-center gap-3">
              <RelationshipAction
                status={relationship?.status || 'none'}
                conversationId={relationship?.conversationId}
                busy={busy}
                isAdmin={me?.role === 'admin'}
                onSend={handleSend}
                onCancel={handleCancel}
              />
              <Button variant="secondary" size="sm" onClick={handleToggleBlock} disabled={blockBusy}>
                {relationship?.status === 'blocked_by_me'
                  ? blockBusy
                    ? 'Unblocking…'
                    : 'Unblock'
                  : blockBusy
                  ? 'Blocking…'
                  : 'Block'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setReportOpen((v) => !v)}>
                Report
              </Button>
            </div>
          )}

          {reportSent && (
            <p className="mt-3 rounded-lg bg-success-tint px-3 py-2 text-sm text-success-600">
              Report submitted. Thank you.
            </p>
          )}

          {reportOpen && (
            <div className="mt-4 rounded-lg border border-line bg-field p-3">
              <TextArea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Why are you reporting this user?"
                rows={3}
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setReportOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleSubmitReport}
                  disabled={reportBusy || !reportReason.trim()}
                >
                  {reportBusy ? 'Submitting…' : 'Submit report'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
