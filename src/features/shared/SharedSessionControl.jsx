import { useState } from 'react';
import { useSharedSession } from '../../providers/SharedSessionProvider';

const SharedSessionControl = () => {
  const { roomId, isHost, participantCount, connectionStatus, expiresAt, createRoom, leaveRoom, shareUrl } = useSharedSession();
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('Copy this focus-room link:', shareUrl);
    }
  };

  if (!roomId) return <button className="shared-session-create" onClick={createRoom}>Share session</button>;

  return (
    <div className="shared-session" aria-label="Shared focus session">
      <span className={`shared-status ${connectionStatus}`}></span>
      <strong>{isHost ? 'Hosting' : 'Joined'}</strong>
      <span>{participantCount} {participantCount === 1 ? 'person' : 'people'}</span>
      {expiresAt && <span title="Invite links expire automatically after four hours">Temporary room</span>}
      <button onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
      <button onClick={leaveRoom}>Leave</button>
    </div>
  );
};

export default SharedSessionControl;
