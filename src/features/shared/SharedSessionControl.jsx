import { useState } from 'react';
import { useSharedSession } from '../../providers/SharedSessionProvider';

const SharedSessionControl = () => {
  const { roomId, isHost, participantCount, connectionStatus, expiresAt, createRoom, leaveRoom, shareUrl, participants, messages, roomLocked, isReady, sendMessage, sendReaction, toggleReady, toggleRoomLock, kickParticipant } = useSharedSession();
  const [copied, setCopied] = useState(false);
  const [chatText, setChatText] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

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
      <button onClick={toggleReady}>{isReady ? 'Ready ✓' : 'Mark ready'}</button>
      {isHost && <button onClick={toggleRoomLock}>{roomLocked ? 'Unlock room' : 'Lock room'}</button>}
      <button className="shared-session-details" onClick={() => setIsPanelOpen(open => !open)} aria-expanded={isPanelOpen} aria-controls="shared-session-panel">{isPanelOpen ? 'Close chat' : 'People & chat'}</button>
      {isPanelOpen && <div id="shared-session-panel" className="shared-session-panel" role="dialog" aria-label="People and chat">
        <div className="shared-panel-heading"><strong>People</strong><button onClick={() => setIsPanelOpen(false)} aria-label="Close people and chat">×</button></div>
        <div className="participant-list">{participants.map(participant => <div key={`${participant.id}-${participant.phx_ref || participant.joinedAt}`}><span>{participant.avatar || '🙂'} {participant.name || 'Focus friend'} {participant.ready ? '✓' : ''}</span>{isHost && participant.role !== 'host' && <button onClick={() => kickParticipant(participant.id)}>Remove</button>}</div>)}</div>
        <div className="shared-reactions"><button onClick={() => sendReaction('👏')}>👏</button><button onClick={() => sendReaction('💪')}>💪</button><button onClick={() => sendReaction('☕')}>☕</button></div>
        <div className="shared-messages" aria-live="polite">{messages.length === 0 ? <p className="shared-empty-history">No messages yet. Your room history stays here while the invite is active.</p> : messages.map(message => <p key={message.id}><span>{message.senderAvatar} {message.senderName}</span> {message.text}</p>)}</div>
        <form onSubmit={(event) => { event.preventDefault(); sendMessage(chatText); setChatText(''); }}><input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Quiet message" maxLength="280" aria-label="Shared session message" /><button type="submit">Send</button></form>
      </div>}
    </div>
  );
};

export default SharedSessionControl;
